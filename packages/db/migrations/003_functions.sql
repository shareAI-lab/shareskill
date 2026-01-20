-- ShareSkill v2 Functions and Triggers
-- Migration: 003_functions.sql

-- Trigger function to update search_tsv
CREATE OR REPLACE FUNCTION skills_set_search_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_tsv =
    setweight(to_tsvector('english', unaccent(COALESCE(NEW.search_text_en, ''))), 'A') ||
    setweight(to_tsvector('simple',  COALESCE(NEW.search_text_zh, '')), 'B') ||
    setweight(to_tsvector('simple',  COALESCE(NEW.search_text, '')), 'C');
  RETURN NEW;
END $$;

-- Trigger to auto-update search_tsv
CREATE TRIGGER skills_set_search_tsv_trigger
BEFORE INSERT OR UPDATE OF search_text_en, search_text_zh, search_text
ON skills
FOR EACH ROW
EXECUTE FUNCTION skills_set_search_tsv();

-- Function to refresh skills_summary
CREATE OR REPLACE FUNCTION refresh_skills_summary(top_n INT DEFAULT 40)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  category_counts JSONB;
  tags_zh JSONB;
  tags_en JSONB;
  total INT;
BEGIN
  SELECT COUNT(*) INTO total FROM skills;

  SELECT COALESCE(jsonb_object_agg(category_key, cnt), '{}')
  INTO category_counts
  FROM (
    SELECT category_key, COUNT(*)::INT AS cnt
    FROM skills GROUP BY category_key
  ) t;

  SELECT COALESCE(jsonb_object_agg(tag, cnt), '{}')
  INTO tags_zh
  FROM (
    SELECT tag, COUNT(*)::INT AS cnt
    FROM skills s, UNNEST(s.tags_zh) AS tag
    WHERE tag IS NOT NULL AND BTRIM(tag) <> ''
    GROUP BY tag ORDER BY cnt DESC LIMIT top_n
  ) t;

  SELECT COALESCE(jsonb_object_agg(tag, cnt), '{}')
  INTO tags_en
  FROM (
    SELECT tag, COUNT(*)::INT AS cnt
    FROM skills s, UNNEST(s.tags_en) AS tag
    WHERE tag IS NOT NULL AND BTRIM(tag) <> ''
    GROUP BY tag ORDER BY cnt DESC LIMIT top_n
  ) t;

  INSERT INTO skills_summary (id, total_count, by_category, top_tags_zh, top_tags_en, computed_at)
  VALUES (1, total, category_counts, tags_zh, tags_en, NOW())
  ON CONFLICT (id) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    by_category = EXCLUDED.by_category,
    top_tags_zh = EXCLUDED.top_tags_zh,
    top_tags_en = EXCLUDED.top_tags_en,
    computed_at = EXCLUDED.computed_at;
END $$;

-- Function for hybrid search (semantic + full-text)
CREATE OR REPLACE FUNCTION search_skills_hybrid(
  query_embedding VECTOR(3072),
  query_text TEXT,
  category_filter TEXT DEFAULT NULL,
  result_limit INT DEFAULT 20,
  semantic_weight FLOAT DEFAULT 0.6
)
RETURNS TABLE (
  id BIGINT,
  skill_key TEXT,
  skill_slug TEXT,
  skill_title TEXT,
  tagline_en TEXT,
  tagline_zh TEXT,
  description_en TEXT,
  description_zh TEXT,
  tags_en TEXT[],
  tags_zh TEXT[],
  use_cases_en TEXT[],
  use_cases_zh TEXT[],
  category_key TEXT,
  repo_full_name TEXT,
  repo_stars INT,
  repo_pushed_at TIMESTAMPTZ,
  score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT s.id, 1 - (s.embedding <=> query_embedding) AS sem_score
    FROM skills s
    WHERE s.embedding IS NOT NULL
      AND (category_filter IS NULL OR s.category_key = category_filter)
    ORDER BY s.embedding <=> query_embedding
    LIMIT 50
  ),
  fulltext AS (
    SELECT s.id, ts_rank(s.search_tsv, websearch_to_tsquery('english', query_text)) AS fts_score
    FROM skills s
    WHERE s.search_tsv @@ websearch_to_tsquery('english', query_text)
      AND (category_filter IS NULL OR s.category_key = category_filter)
    ORDER BY fts_score DESC
    LIMIT 50
  ),
  combined AS (
    SELECT
      COALESCE(sem.id, fts.id) AS id,
      COALESCE(sem.sem_score, 0) * semantic_weight +
      COALESCE(fts.fts_score, 0) * (1 - semantic_weight) AS combined_score
    FROM semantic sem
    FULL OUTER JOIN fulltext fts ON sem.id = fts.id
  )
  SELECT
    s.id,
    s.skill_key,
    s.skill_slug,
    s.skill_title,
    s.tagline_en,
    s.tagline_zh,
    s.description_en,
    s.description_zh,
    s.tags_en,
    s.tags_zh,
    s.use_cases_en,
    s.use_cases_zh,
    s.category_key,
    s.repo_full_name,
    s.repo_stars,
    s.repo_pushed_at,
    c.combined_score AS score
  FROM combined c
  JOIN skills s ON s.id = c.id
  ORDER BY c.combined_score DESC
  LIMIT result_limit;
END $$;
