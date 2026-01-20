// ShareSkill Pipeline - Main Entry Point
// Design: Pipeline architecture for maximum throughput
// Each phase processes in parallel, then passes results to next phase

import * as fs from 'fs';
import { config } from './config.js';
import { discover, type DiscoveredSkill } from './discover.js';
import { fetchSkillContent, type SkillContent } from './fetch.js';
import { extractSingle, type ExtractedSkill } from './extract.js';
import { generateSingleEmbedding } from './embed.js';
import { loadSingleSkill, uploadResourcesToStorage } from './load.js';

const CHECKPOINT_FILE = '.pipeline-checkpoint.json';

interface Checkpoint {
  processedKeys: string[];
  phase: 'fetch' | 'extract' | 'embed' | 'load' | 'done';
  fetchedData?: string; // JSON stringified fetched results
  extractedData?: string; // JSON stringified extracted results
  startedAt: string;
  lastUpdatedAt: string;
}

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Ignore checkpoint errors
  }
  return null;
}

function saveCheckpoint(checkpoint: Partial<Checkpoint> & { processedKeys: string[]; startedAt: string }): void {
  const full: Checkpoint = {
    phase: 'fetch',
    ...checkpoint,
    lastUpdatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(full, null, 2));
}

function clearCheckpoint(): void {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
    }
  } catch {
    // Ignore
  }
}

interface PipelineStats {
  discovered: number;
  fetched: number;
  extracted: number;
  embedded: number;
  loaded: number;
  skipped: number;
  failed: number;
  totalDurationMs: number;
  errors: string[];
}

// Parallel execution with concurrency limit
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await fn(items[index], index);
      } catch (error) {
        results[index] = null as any;
      }
      completed++;
      onProgress?.(completed, items.length);
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

// Progress bar helper
function printProgress(phase: string, completed: number, total: number, extra?: string): void {
  const pct = ((completed / total) * 100).toFixed(0);
  const bar = '█'.repeat(Math.floor(completed / total * 20)) + '░'.repeat(20 - Math.floor(completed / total * 20));
  process.stdout.write(`\r  ${phase}: [${bar}] ${pct}% (${completed}/${total})${extra ? ' ' + extra : ''}    `);
}

async function main(): Promise<PipelineStats> {
  console.log('='.repeat(60));
  console.log('ShareSkill Pipeline (Pipeline Architecture)');
  console.log('='.repeat(60));
  console.log();

  // Validate configuration
  if (!config.githubTokens.length) {
    throw new Error('GITHUB_TOKENS environment variable is required');
  }
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
  }
  if (!config.llmConfig.apiKey && config.currentModel !== 'ollama') {
    throw new Error(`API key required for LLM provider: ${config.currentModel}`);
  }

  // Concurrency settings for each phase
  const FETCH_CONCURRENT = 20;
  const EXTRACT_CONCURRENT = config.skillConcurrent; // LLM calls
  const EMBED_CONCURRENT = 20;
  const LOAD_CONCURRENT = 20;
  const BATCH_SIZE = 100; // Process in batches for checkpoint and memory

  console.log('Configuration:');
  console.log(`  GitHub Tokens: ${config.githubTokens.length}`);
  console.log(`  LLM: ${config.currentModel} (${config.llmConfig.id})`);
  console.log(`  Embedding: ${config.embeddingModelId} (${config.embeddingDimensions}d)`);
  console.log(`  Concurrency: Fetch=${FETCH_CONCURRENT}, Extract=${EXTRACT_CONCURRENT}, Embed=${EMBED_CONCURRENT}, Load=${LOAD_CONCURRENT}`);
  console.log(`  Batch Size: ${BATCH_SIZE}`);
  if (config.devRepoLimit) console.log(`  DEV_REPO_LIMIT: ${config.devRepoLimit}`);
  if (config.devSkillLimit) console.log(`  DEV_SKILL_LIMIT: ${config.devSkillLimit}`);
  console.log();

  const stats: PipelineStats = {
    discovered: 0,
    fetched: 0,
    extracted: 0,
    embedded: 0,
    loaded: 0,
    skipped: 0,
    failed: 0,
    totalDurationMs: 0,
    errors: [],
  };

  const startTime = Date.now();

  try {
    // Check for checkpoint (resume support)
    const checkpoint = loadCheckpoint();
    const processedKeys = new Set<string>(checkpoint?.processedKeys || []);
    const runStartedAt = checkpoint?.startedAt || new Date().toISOString();

    if (checkpoint) {
      console.log(`Resuming from checkpoint (${processedKeys.size} already processed)\n`);
    }

    // Phase 1: Discover
    console.log('Phase 1: Discover');
    console.log('-'.repeat(40));
    const discovered = await discover();
    stats.discovered = discovered.length;
    console.log(`  Found ${discovered.length} skills to process\n`);

    // Filter out already processed skills (for resume)
    const toProcess = discovered.filter(s => {
      const key = `${s.repoFullName}:${s.skillPath || '__root__'}`;
      return !processedKeys.has(key);
    });

    if (toProcess.length === 0) {
      console.log('No new/changed skills to process.');
      clearCheckpoint();
      stats.totalDurationMs = Date.now() - startTime;
      printSummary(stats);
      return stats;
    }

    if (toProcess.length < discovered.length) {
      console.log(`  Skipping ${discovered.length - toProcess.length} already processed, ${toProcess.length} remaining\n`);
    }

    // Process in batches
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, toProcess.length);
      const batch = toProcess.slice(batchStart, batchEnd);

      console.log(`\nBatch ${batchNum + 1}/${totalBatches} (skills ${batchStart + 1}-${batchEnd})`);
      console.log('-'.repeat(40));

      // Phase 2: Fetch (parallel)
      console.log('Phase 2: Fetch');
      const fetchStartTime = Date.now();
      const fetchResults = await parallelMap(
        batch,
        async (skill) => {
          try {
            return await fetchSkillContent(skill);
          } catch (error: any) {
            stats.errors.push(`Fetch ${skill.repoFullName}: ${error.message?.slice(0, 100)}`);
            return null;
          }
        },
        FETCH_CONCURRENT,
        (completed, total) => printProgress('Fetch', completed, total)
      );
      console.log(`\n  Completed in ${((Date.now() - fetchStartTime) / 1000).toFixed(1)}s`);

      const fetched = fetchResults.filter((r): r is SkillContent => r !== null);
      stats.fetched += fetched.length;
      const fetchFailed = batch.length - fetched.length;
      if (fetchFailed > 0) {
        console.log(`  Fetched: ${fetched.length}, Failed: ${fetchFailed}`);
        stats.failed += fetchFailed;
      }

      if (fetched.length === 0) {
        console.log('  No skills fetched in this batch, skipping remaining phases.');
        // Mark batch as processed
        for (const skill of batch) {
          processedKeys.add(`${skill.repoFullName}:${skill.skillPath || '__root__'}`);
        }
        saveCheckpoint({ processedKeys: [...processedKeys], startedAt: runStartedAt, phase: 'done' });
        continue;
      }

      // Phase 3: Extract (parallel LLM calls)
      console.log('Phase 3: Extract (LLM)');
      const extractStartTime = Date.now();
      const extractResults = await parallelMap(
        fetched,
        async (skill) => {
          try {
            return await extractSingle(skill);
          } catch (error: any) {
            stats.errors.push(`Extract ${skill.repoFullName}: ${error.message?.slice(0, 100)}`);
            return null;
          }
        },
        EXTRACT_CONCURRENT,
        (completed, total) => printProgress('Extract', completed, total)
      );
      console.log(`\n  Completed in ${((Date.now() - extractStartTime) / 1000).toFixed(1)}s`);

      const extracted = extractResults.filter((r): r is ExtractedSkill => r !== null);
      stats.extracted += extracted.length;
      const skippedCount = fetched.length - extracted.length;
      stats.skipped += skippedCount;
      if (skippedCount > 0) {
        console.log(`  Extracted: ${extracted.length}, Skipped (invalid): ${skippedCount}`);
      }

      if (extracted.length === 0) {
        console.log('  No valid skills extracted in this batch, skipping remaining phases.');
        for (const skill of batch) {
          processedKeys.add(`${skill.repoFullName}:${skill.skillPath || '__root__'}`);
        }
        saveCheckpoint({ processedKeys: [...processedKeys], startedAt: runStartedAt, phase: 'done' });
        continue;
      }

      // Phase 4: Embed (parallel)
      console.log('Phase 4: Embed');
      const embedStartTime = Date.now();
      const embedResults = await parallelMap(
        extracted,
        async (skill) => {
          try {
            const embedding = await generateSingleEmbedding(skill.embeddingText);
            return { skill, embedding };
          } catch (error: any) {
            stats.errors.push(`Embed ${skill.repoFullName}: ${error.message?.slice(0, 100)}`);
            return { skill, embedding: [] as number[] };
          }
        },
        EMBED_CONCURRENT,
        (completed, total) => printProgress('Embed', completed, total)
      );
      console.log(`\n  Completed in ${((Date.now() - embedStartTime) / 1000).toFixed(1)}s`);
      stats.embedded += embedResults.length;

      // Phase 5: Load to DB (parallel)
      console.log('Phase 5: Load');
      const loadStartTime = Date.now();
      const loadResults = await parallelMap(
        embedResults,
        async ({ skill, embedding }, idx) => {
          try {
            await loadSingleSkill(skill, embedding);

            // Also get the original fetched data for resource upload
            const originalFetched = fetched.find(f =>
              f.repoFullName === skill.repoFullName && f.skillPath === skill.skillPath
            );
            if (originalFetched && originalFetched.files.length > 0) {
              const skillKey = `${skill.repoFullName}:${skill.skillPath || ''}`;
              await uploadResourcesToStorage(skillKey, originalFetched.files);
            }
            return { success: true, key: `${skill.repoFullName}:${skill.skillPath || '__root__'}` };
          } catch (error: any) {
            stats.errors.push(`Load ${skill.repoFullName}: ${error.message?.slice(0, 100)}`);
            return { success: false, key: `${skill.repoFullName}:${skill.skillPath || '__root__'}` };
          }
        },
        LOAD_CONCURRENT,
        (completed, total) => printProgress('Load', completed, total)
      );
      console.log(`\n  Completed in ${((Date.now() - loadStartTime) / 1000).toFixed(1)}s`);

      const loadSucceeded = loadResults.filter(r => r.success).length;
      const loadFailed = loadResults.length - loadSucceeded;
      stats.loaded += loadSucceeded;
      stats.failed += loadFailed;

      if (loadFailed > 0) {
        console.log(`  Loaded: ${loadSucceeded}, Failed: ${loadFailed}`);
      }

      // Mark all batch skills as processed
      for (const skill of batch) {
        processedKeys.add(`${skill.repoFullName}:${skill.skillPath || '__root__'}`);
      }

      // Save checkpoint after each batch
      saveCheckpoint({ processedKeys: [...processedKeys], startedAt: runStartedAt, phase: 'done' });

      console.log(`  Batch ${batchNum + 1} complete: ${loadSucceeded} loaded, ${skippedCount} skipped, ${fetchFailed + loadFailed} failed`);
    }

    // Clear checkpoint on successful completion
    clearCheckpoint();

    console.log();

  } catch (error: any) {
    console.error('\nPipeline error:', error.message);
    stats.errors.push(`Pipeline: ${error.message}`);
  }

  stats.totalDurationMs = Date.now() - startTime;
  printSummary(stats);

  // Refresh summary if any succeeded
  if (stats.loaded > 0) {
    console.log('Refreshing skills summary...');
    try {
      const { createSupabaseServiceClient } = await import('@shareskill/db');
      const supabase = createSupabaseServiceClient(config.supabaseUrl, config.supabaseServiceKey);
      await supabase.rpc('refresh_skills_summary');
      console.log('  Done\n');
    } catch (e: any) {
      console.warn(`  Failed: ${e.message}\n`);
    }

    // Auto-trigger translation for new skills (run in background, don't block)
    if (!process.env.SKIP_TRANSLATE) {
      console.log('Triggering translation pipeline for new skills...');
      try {
        const { runTranslation } = await import('./translate.js');
        // Translate newly loaded skills with high concurrency
        const translateStats = await runTranslation({
          batchSize: Math.min(stats.loaded * 2, 500),
          skipExisting: true,
          concurrency: parseInt(process.env.TRANSLATE_CONCURRENCY || '30', 10),
        });
        console.log(`  Translated: ${translateStats.translated}, Failed: ${translateStats.failed}\n`);
      } catch (e: any) {
        console.warn(`  Translation failed: ${e.message}\n`);
      }
    }
  }

  return stats;
}

function printSummary(stats: PipelineStats): void {
  const duration = (stats.totalDurationMs / 1000).toFixed(1);
  const successRate = stats.loaded > 0
    ? ((stats.loaded / (stats.loaded + stats.failed)) * 100).toFixed(1)
    : '0';

  console.log('='.repeat(60));
  console.log('Pipeline Summary');
  console.log('='.repeat(60));
  console.log(`  Duration:     ${duration}s`);
  console.log(`  Discovered:   ${stats.discovered}`);
  console.log(`  Fetched:      ${stats.fetched}`);
  console.log(`  Extracted:    ${stats.extracted}`);
  console.log(`  Embedded:     ${stats.embedded}`);
  console.log(`  Loaded:       ${stats.loaded} (${successRate}%)`);
  console.log(`  Skipped:      ${stats.skipped} (invalid frontmatter)`);
  console.log(`  Failed:       ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\nErrors (first 10):');
    for (const err of stats.errors.slice(0, 10)) {
      console.log(`  - ${err.slice(0, 100)}`);
    }
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }

  console.log('='.repeat(60));
}

// Run
main()
  .then((stats) => {
    process.exit(stats.failed > 0 && stats.loaded === 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
