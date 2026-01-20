// Translate security warnings descriptions
// Run after main translation to add security warning translations
// Stores translated descriptions in translations.{lang}.security_warnings array

import { config } from './config.js';
import { callLLM, parseXmlTag } from './llm.js';

const supabaseUrl = config.supabaseUrl || process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = config.supabaseServiceKey || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_CONCURRENCY = 30;

const TRANSLATE_SECURITY_PROMPT = `Translate the following security warning descriptions to Chinese (zh) and Japanese (ja).

Security Warnings:
{warnings}

Output in XML format:
<result>
<zh>
<item>Chinese translation 1</item>
<item>Chinese translation 2</item>
</zh>
<ja>
<item>Japanese translation 1</item>
<item>Japanese translation 2</item>
</ja>
</result>

Rules:
- Translate each warning description in order
- Keep technical terms in English (file paths, code snippets)
- Be concise and accurate
- Preserve the warning's intent and severity`;

interface SkillWithWarnings {
  id: number;
  security_warnings: Array<{ description: string }>;
  translations: Record<string, any> | null;
}

async function fetchSkillsWithWarnings(limit: number, skipExisting: boolean): Promise<SkillWithWarnings[]> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  let url = `${supabaseUrl}/rest/v1/skills?select=id,security_warnings,translations&security_warnings=not.eq.[]&order=repo_stars.desc&limit=${limit}`;

  const response = await fetch(url, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch skills: ${await response.text()}`);
  }

  let skills = await response.json();

  if (skipExisting) {
    skills = skills.filter((s: any) => {
      const t = s.translations || {};
      return !t.zh?.security_warnings || !t.ja?.security_warnings;
    });
  }

  return skills;
}

async function translateWarnings(warnings: string[]): Promise<{ zh: string[]; ja: string[] } | null> {
  if (warnings.length === 0) return null;

  const warningsText = warnings.map((w, i) => `${i + 1}. ${w}`).join('\n');
  const prompt = TRANSLATE_SECURITY_PROMPT.replace('{warnings}', warningsText);

  try {
    const response = await callLLM(prompt);

    const zhBlock = parseXmlTag(response.content, 'zh');
    const jaBlock = parseXmlTag(response.content, 'ja');

    const parseItems = (block: string | null): string[] => {
      if (!block) return [];
      const items: string[] = [];
      const regex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = regex.exec(block)) !== null) {
        const text = match[1].trim();
        if (text) items.push(text);
      }
      return items;
    };

    const zh = parseItems(zhBlock);
    const ja = parseItems(jaBlock);

    // Accept if at least one language has translations
    if (zh.length > 0 || ja.length > 0) {
      return { zh, ja };
    }
    return null;
  } catch {
    return null;
  }
}

async function saveWarningTranslations(
  skillId: number,
  existingTranslations: Record<string, any> | null,
  warningTranslations: { zh: string[]; ja: string[] }
): Promise<boolean> {
  const translations = { ...existingTranslations };

  if (!translations.zh) translations.zh = {};
  if (!translations.ja) translations.ja = {};

  translations.zh.security_warnings = warningTranslations.zh;
  translations.ja.security_warnings = warningTranslations.ja;

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

async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await fn(items[index]);
      } catch {
        results[index] = null as any;
      }
      completed++;
      onProgress?.(completed);
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

async function main() {
  const batchSize = parseInt(process.argv[2] || '200', 10);
  const skipExisting = process.argv.includes('--skip-existing');
  const translateAll = process.argv.includes('--all');
  const concurrency = parseInt(process.env.TRANSLATE_CONCURRENCY || String(DEFAULT_CONCURRENCY), 10);

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('Security Warnings Translation Pipeline');
  console.log('='.repeat(50));
  console.log(`  Batch Size:    ${batchSize}`);
  console.log(`  Concurrency:   ${concurrency}`);
  console.log(`  Skip Existing: ${skipExisting}`);
  console.log(`  LLM Model:     ${config.currentModel}`);
  console.log('='.repeat(50));
  console.log();

  let totalTranslated = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  do {
    const skills = await fetchSkillsWithWarnings(batchSize, skipExisting);

    if (skills.length === 0) {
      console.log('No more skills with warnings to translate.');
      break;
    }

    console.log(`Translating warnings for ${skills.length} skills...`);

    const results = await parallelMap(
      skills,
      async (skill) => {
        const descriptions = skill.security_warnings.map(w => w.description);
        const translations = await translateWarnings(descriptions);

        if (translations && translations.zh.length > 0) {
          return await saveWarningTranslations(skill.id, skill.translations, translations);
        }
        return false;
      },
      concurrency,
      (completed) => {
        const pct = Math.floor((completed / skills.length) * 100);
        process.stdout.write(`\r  Progress: ${pct}% (${completed}/${skills.length})`);
      }
    );

    const succeeded = results.filter(r => r === true).length;
    const failed = results.length - succeeded;

    totalTranslated += succeeded;
    totalFailed += failed;

    console.log();
    console.log(`  Completed: ${succeeded} translated, ${failed} failed`);
    console.log();

  } while (translateAll);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('='.repeat(50));
  console.log('Summary');
  console.log('='.repeat(50));
  console.log(`  Translated: ${totalTranslated}`);
  console.log(`  Failed:     ${totalFailed}`);
  console.log(`  Duration:   ${duration}s`);
  console.log('='.repeat(50));
}

main().catch(console.error);
