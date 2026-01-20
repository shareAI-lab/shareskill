// ShareSkill Translation Pipeline
// Translates skill metadata to Chinese (zh) and Japanese (ja)
// Designed for high concurrency and GitHub Actions compatibility

import { config } from './config.js';
import { callLLM, parseXmlTag } from './llm.js';

const supabaseUrl = config.supabaseUrl || process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = config.supabaseServiceKey || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Default high concurrency for translation (lightweight task)
const DEFAULT_CONCURRENCY = 50;

const TRANSLATE_PROMPT = `Translate the following skill metadata to Chinese (zh) and Japanese (ja).

Skill info:
- Name: {name}
- Tagline: {tagline}
- Description: {description}
- Key Features:
{key_features}

Output in XML format:
<result>
<zh>
<tagline>Chinese translation of tagline</tagline>
<description>Chinese translation of description (max 200 chars)</description>
<key_features>
<item>Chinese feature 1</item>
<item>Chinese feature 2</item>
</key_features>
</zh>
<ja>
<tagline>Japanese translation of tagline</tagline>
<description>Japanese translation of description (max 200 chars)</description>
<key_features>
<item>Japanese feature 1</item>
<item>Japanese feature 2</item>
</key_features>
</ja>
</result>

Rules:
- Keep translations natural and fluent
- Preserve technical terms commonly used in English (API, CLI, Git, Docker, etc.)
- Match the length and style of the original
- For Japanese, use appropriate mix of kanji, hiragana, and katakana`;

interface SkillToTranslate {
  id: number;
  name: string;
  tagline: string | null;
  description: string;
  key_features: string[];
}

interface TranslationResult {
  zh?: { tagline: string; description: string; key_features: string[] };
  ja?: { tagline: string; description: string; key_features: string[] };
}

export interface TranslationStats {
  total: number;
  translated: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export interface TranslationOptions {
  batchSize?: number;
  skipExisting?: boolean;
  translateAll?: boolean;
  concurrency?: number;
}

// Progress bar helper (matches main pipeline style)
function printProgress(completed: number, total: number, failed: number): void {
  const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;
  const barWidth = 30;
  const filled = Math.floor((percent / 100) * barWidth);
  const bar = '='.repeat(filled) + '-'.repeat(barWidth - filled);
  const status = failed > 0 ? ` (${failed} failed)` : '';
  process.stdout.write(`\r  [${bar}] ${percent}% (${completed}/${total})${status}`);
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
      } catch {
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

function parseTranslations(xml: string): TranslationResult {
  const result: TranslationResult = {};

  const zhBlock = parseXmlTag(xml, 'zh');
  if (zhBlock) {
    const tagline = parseXmlTag(zhBlock, 'tagline');
    const description = parseXmlTag(zhBlock, 'description');
    const featuresBlock = parseXmlTag(zhBlock, 'key_features');
    const features: string[] = [];
    if (featuresBlock) {
      const itemRegex = /<item>([^<]*)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(featuresBlock)) !== null) {
        const item = match[1].trim();
        if (item) features.push(item);
      }
    }
    if (tagline || description) {
      result.zh = { tagline: tagline || '', description: description || '', key_features: features };
    }
  }

  const jaBlock = parseXmlTag(xml, 'ja');
  if (jaBlock) {
    const tagline = parseXmlTag(jaBlock, 'tagline');
    const description = parseXmlTag(jaBlock, 'description');
    const featuresBlock = parseXmlTag(jaBlock, 'key_features');
    const features: string[] = [];
    if (featuresBlock) {
      const itemRegex = /<item>([^<]*)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(featuresBlock)) !== null) {
        const item = match[1].trim();
        if (item) features.push(item);
      }
    }
    if (tagline || description) {
      result.ja = { tagline: tagline || '', description: description || '', key_features: features };
    }
  }

  return result;
}

async function translateSkill(skill: SkillToTranslate): Promise<TranslationResult | null> {
  const featuresText = skill.key_features.map((f, i) => `${i + 1}. ${f}`).join('\n') || 'N/A';

  const prompt = TRANSLATE_PROMPT
    .replace('{name}', skill.name)
    .replace('{tagline}', skill.tagline || skill.description.slice(0, 100))
    .replace('{description}', skill.description.slice(0, 500))
    .replace('{key_features}', featuresText);

  try {
    const response = await callLLM(prompt);
    return parseTranslations(response.content);
  } catch {
    return null;
  }
}

async function saveTranslation(skillId: number, translations: TranslationResult): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/skills?id=eq.${skillId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey!,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ translations }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchSkillsToTranslate(limit: number, skipExisting: boolean): Promise<SkillToTranslate[]> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  // Build query with database-level filtering for untranslated skills
  let url = `${supabaseUrl}/rest/v1/skills?select=id,name,tagline,description,key_features&tagline=not.is.null&order=repo_stars.desc&limit=${limit}`;

  // Filter untranslated at database level (much more efficient)
  if (skipExisting) {
    url += '&or=(translations.is.null,translations.eq.{})';
  }

  const response = await fetch(url, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch skills: ${await response.text()}`);
  }

  const skills = await response.json();

  return skills.map((s: any) => ({
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    description: s.description,
    key_features: s.key_features || [],
  }));
}

async function getUntranslatedCount(): Promise<number> {
  if (!supabaseUrl || !supabaseKey) return 0;

  const url = `${supabaseUrl}/rest/v1/skills?select=id&tagline=not.is.null&or=(translations.is.null,translations.eq.{})`;
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'count=exact',
      'Range': '0-0',
    },
  });

  const contentRange = response.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

function printSummary(stats: TranslationStats): void {
  const duration = (stats.durationMs / 1000).toFixed(1);
  const speed = stats.durationMs > 0 ? (stats.translated / (stats.durationMs / 1000 / 60)).toFixed(1) : '0';

  console.log('\n');
  console.log('='.repeat(50));
  console.log('Translation Pipeline Summary');
  console.log('='.repeat(50));
  console.log(`  Total:       ${stats.total}`);
  console.log(`  Translated:  ${stats.translated}`);
  console.log(`  Failed:      ${stats.failed}`);
  console.log(`  Skipped:     ${stats.skipped}`);
  console.log(`  Duration:    ${duration}s`);
  console.log(`  Speed:       ${speed} skills/min`);
  console.log('='.repeat(50));
}

// Main exported function for programmatic use
export async function runTranslation(options: TranslationOptions = {}): Promise<TranslationStats> {
  const {
    batchSize = 500,
    skipExisting = true,
    translateAll = false,
    concurrency = parseInt(process.env.TRANSLATE_CONCURRENCY || String(DEFAULT_CONCURRENCY), 10),
  } = options;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  const stats: TranslationStats = { total: 0, translated: 0, failed: 0, skipped: 0, durationMs: 0 };
  const startTime = Date.now();

  console.log('='.repeat(50));
  console.log('ShareSkill Translation Pipeline');
  console.log('='.repeat(50));
  console.log(`  Batch Size:    ${batchSize}`);
  console.log(`  Concurrency:   ${concurrency}`);
  console.log(`  Skip Existing: ${skipExisting}`);
  console.log(`  Translate All: ${translateAll}`);
  console.log(`  LLM Model:     ${config.currentModel}`);

  const untranslatedCount = await getUntranslatedCount();
  console.log(`  Untranslated:  ${untranslatedCount} skills`);
  console.log('='.repeat(50));
  console.log();

  let batchNum = 0;
  do {
    batchNum++;
    const skills = await fetchSkillsToTranslate(batchSize, skipExisting);

    if (skills.length === 0) {
      if (batchNum === 1) {
        console.log('No skills to translate.');
      }
      break;
    }

    console.log(`Batch ${batchNum}: Translating ${skills.length} skills...`);
    stats.total += skills.length;

    let batchFailed = 0;
    const results = await parallelMap(
      skills,
      async (skill) => {
        const translations = await translateSkill(skill);
        if (translations && (translations.zh || translations.ja)) {
          const saved = await saveTranslation(skill.id, translations);
          return saved ? 'success' : 'failed';
        }
        return 'failed';
      },
      concurrency,
      (completed, total) => {
        printProgress(completed, total, batchFailed);
      }
    );

    // Count results
    for (const result of results) {
      if (result === 'success') {
        stats.translated++;
      } else {
        stats.failed++;
        batchFailed++;
      }
    }

    console.log(); // New line after progress bar
    console.log(`  Batch ${batchNum} complete: ${stats.translated} translated, ${batchFailed} failed`);
    console.log();

  } while (translateAll);

  stats.durationMs = Date.now() - startTime;
  printSummary(stats);

  return stats;
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const batchSize = parseInt(args.find(a => !a.startsWith('--')) || '500', 10);
  const skipExisting = args.includes('--skip-existing');
  const translateAll = args.includes('--all');
  const concurrency = parseInt(process.env.TRANSLATE_CONCURRENCY || String(DEFAULT_CONCURRENCY), 10);

  try {
    await runTranslation({ batchSize, skipExisting, translateAll, concurrency });
  } catch (error: any) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

// Only run main if this is the entry point
const isMainModule = process.argv[1]?.includes('translate');
if (isMainModule) {
  main();
}
