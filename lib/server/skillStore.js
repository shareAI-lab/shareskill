import { createClient } from "@supabase/supabase-js";
import { parseArrayValue, pickCategory } from "../utils";

const TABLE_NAME = "skills";

let cachedClient = null;

function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase credentials");
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "public" }
  });
  return cachedClient;
}

function normalizeSkill(row, index) {
  const tags = parseArrayValue(row.tags);
  const tagsEn = parseArrayValue(row.tags_en || row.tagsEn);
  const categories = parseArrayValue(row.categories);
  const skillName = row.skill_name || row.skillName || row.name || "";
  const descriptionZh =
    row.description_zh || row.descriptionZh || row.description || "";
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
    fromRepo: row.fromRepo || row.from_repo || row.fromrepo || "",
    skillPath: row.skillPath || row.skill_path || row.skillpath || "",
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

function sanitizeSearch(value) {
  return String(value || "")
    .replace(/[(),]/g, " ")
    .trim();
}

function buildSearchFilter(query, options = {}) {
  const { includeTags = true } = options;
  const safe = sanitizeSearch(query);
  if (!safe) {
    return null;
  }
  const like = `*${safe}*`;
  const fields = [
    "skill_name",
    "tagline",
    "description_zh",
    "description_en",
    "use_case",
    "use_case_en"
  ];
  if (includeTags) {
    fields.push("tags", "tags_en");
  }
  return fields.map((field) => `${field}.ilike.${like}`).join(",");
}

function applySorting(query, sort) {
  if (sort === "stars") {
    return query.order("repostars", { ascending: false });
  }
  if (sort === "oldest") {
    return query.order("updated_at", { ascending: true });
  }
  return query.order("updated_at", { ascending: false });
}

export async function listSkills({
  q = "",
  category = "",
  page = 1,
  pageSize = 16,
  sort = "latest"
} = {}) {
  const client = getSupabaseClient();
  const offset = Math.max(0, (page - 1) * pageSize);

  let query = client
    .from(TABLE_NAME)
    .select(
      "id, skill_name, repostars, tagline, tags, tags_en, categories, updated_at",
      { count: "exact" }
    );

  if (category) {
    query = query.ilike("categories", `%${category}%`);
  }

  const orFilter = buildSearchFilter(q, { includeTags: true });
  if (orFilter) {
    query = query.or(orFilter);
  }

  query = applySorting(query, sort).range(offset, offset + pageSize - 1);

  let { data, error, count } = await query;
  if (error && orFilter) {
    const fallbackFilter = buildSearchFilter(q, { includeTags: false });
    let fallback = client
      .from(TABLE_NAME)
      .select(
        "id, skill_name, repostars, tagline, tags, tags_en, categories, updated_at",
        { count: "exact" }
      );
    if (category) {
      fallback = fallback.ilike("categories", `%${category}%`);
    }
    if (fallbackFilter) {
      fallback = fallback.or(fallbackFilter);
    }
    fallback = applySorting(fallback, sort).range(offset, offset + pageSize - 1);
    const res = await fallback;
    data = res.data;
    error = res.error;
    count = res.count;
  }
  if (error) {
    throw new Error(error.message);
  }

  const items = (data || []).map((row, index) => normalizeSkill(row, index));
  return {
    items,
    total: count || 0,
    page,
    pageSize
  };
}

export async function getSkillByIdentifier(identifier) {
  const client = getSupabaseClient();
  const decoded = decodeURIComponent(identifier || "");
  let query = client.from(TABLE_NAME).select("*").limit(1);

  if (/^\d+$/.test(decoded)) {
    query = query.eq("id", Number(decoded));
  } else {
    query = query.eq("skill_name", decoded);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  if (!data || !data.length) {
    return null;
  }
  return normalizeSkill(data[0], 0);
}

export async function getSkillSummary() {
  const client = getSupabaseClient();
  const counts = {};
  const pageSize = 1000;
  let offset = 0;
  let total = 0;

  while (true) {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select("categories")
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data || [];
    rows.forEach((row) => {
      const category = pickCategory(row.categories);
      counts[category] = (counts[category] || 0) + 1;
    });
    total += rows.length;

    if (!rows.length || rows.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return { total, counts };
}
