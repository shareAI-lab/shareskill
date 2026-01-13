import { parseArrayValue, pickCategory } from "./utils";

let cachedSkills = null;
let loadingPromise = null;
const DEFAULT_DB_URL = "/skill.db";
const CACHE_DB_NAME = "skill-cache";
const CACHE_STORE = "assets";
const CACHE_TTL = 24 * 60 * 60 * 1000;

function openCache() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const request = window.indexedDB.open(CACHE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function isFresh(entry) {
  if (!entry || !entry.storedAt) {
    return false;
  }
  return Date.now() - entry.storedAt < CACHE_TTL;
}

async function readCache(key) {
  const db = await openCache();
  if (!db) {
    return null;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(CACHE_STORE, "readonly");
    const store = tx.objectStore(CACHE_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function writeCache(entry) {
  const db = await openCache();
  if (!db) {
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch (error) {
      resolve();
    }
  });
}

async function buildSkillsFromBuffer(buffer) {
  const { default: initSqlJs } = await import("sql.js");
  const SQL = await initSqlJs({
    locateFile: (file) => `/${file}`
  });
  const db = new SQL.Database(new Uint8Array(buffer));
  const table = selectTableName(db);
  if (!table) {
    return [];
  }
  const rows = rowsFromResult(db.exec(`SELECT * FROM "${table}"`));
  return rows.map(normalizeSkill);
}

function selectTableName(db) {
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  const names = result[0]?.values?.map((row) => row[0]) || [];
  if (names.includes("skills")) {
    return "skills";
  }
  if (names.includes("skill")) {
    return "skill";
  }
  return names[0] || null;
}

function rowsFromResult(result) {
  if (!result || result.length === 0) {
    return [];
  }
  const { columns, values } = result[0];
  return values.map((row) => {
    const entry = {};
    columns.forEach((column, index) => {
      entry[column] = row[index];
    });
    return entry;
  });
}

function normalizeSkill(row, index) {
  const tags = parseArrayValue(row.tags);
  const tagsEn = parseArrayValue(row.tags_en || row.tagsEn);
  const categories = parseArrayValue(row.categories);
  const skillName = row.skill_name || row.skillName || row.name || "";
  const descriptionZh = row.description_zh || row.descriptionZh || "";
  const descriptionEn = row.description_en || row.descriptionEn || "";
  const useCaseEn = row.use_case_en || row.useCaseEn || "";
  const identifier = row.id !== undefined && row.id !== null
    ? String(row.id)
    : skillName
      ? encodeURIComponent(skillName)
      : String(index + 1);

  return {
    id: row.id ?? identifier,
    identifier,
    skill_name: skillName,
    fromRepo: row.fromRepo || row.from_repo || "",
    skillPath: row.skillPath || row.skill_path || "",
    repostars: row.repostars || row.repoStars || row.stars || 0,
    tagline: row.tagline || "",
    tags,
    tags_en: tagsEn,
    categories,
    category: categories[0] || pickCategory(row.categories),
    description: descriptionZh,
    description_zh: descriptionZh,
    description_en: descriptionEn,
    use_case: row.use_case || row.useCase || "",
    use_case_en: useCaseEn,
    download_url: row.download_url || row.downloadUrl || "",
    skill_md_content: row.skill_md_content || row.skillMdContent || "",
    skill_md_content_translation:
      row.skill_md_content_translation || row.skillMdContentTranslation || "",
    file_tree: row.file_tree || row.fileTree || "",
    how_to_install: row.how_to_install || row.howToInstall || "",
    created_at: row.created_at || row.createdAt || "",
    updated_at: row.updated_at || row.updatedAt || ""
  };
}

export async function loadSkills() {
  if (cachedSkills) {
    return cachedSkills;
  }
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const dbUrl = process.env.NEXT_PUBLIC_SKILL_DB_URL || DEFAULT_DB_URL;
      const cacheKey = `skill-db:${dbUrl}`;
      const cached = await readCache(cacheKey);
      if (cached?.buffer && isFresh(cached)) {
        cachedSkills = await buildSkillsFromBuffer(cached.buffer);
        return cachedSkills;
      }

      try {
        const response = await fetch(dbUrl);
        if (!response.ok) {
          throw new Error(
            "skill.db not found. Set NEXT_PUBLIC_SKILL_DB_URL or place it in public/skill.db"
          );
        }
        const buffer = await response.arrayBuffer();
        await writeCache({
          key: cacheKey,
          storedAt: Date.now(),
          buffer
        });
        cachedSkills = await buildSkillsFromBuffer(buffer);
        return cachedSkills;
      } catch (error) {
        if (cached?.buffer) {
          cachedSkills = await buildSkillsFromBuffer(cached.buffer);
          return cachedSkills;
        }
        throw error;
      }
    })().catch((error) => {
      loadingPromise = null;
      throw error;
    });
  }
  return loadingPromise;
}
