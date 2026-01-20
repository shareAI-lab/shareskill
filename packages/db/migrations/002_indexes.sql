-- ShareSkill v2 Indexes
-- Migration: 002_indexes.sql

-- Sorting indexes
CREATE INDEX skills_repo_stars_idx ON skills (repo_stars DESC);
CREATE INDEX skills_repo_pushed_at_idx ON skills (repo_pushed_at DESC NULLS LAST);
CREATE INDEX skills_ingested_at_idx ON skills (ingested_at DESC);

-- Filter indexes
CREATE INDEX skills_category_idx ON skills (category_key);
CREATE INDEX skills_skill_key_idx ON skills (skill_key);

-- Tags GIN indexes
CREATE INDEX skills_tags_zh_gin ON skills USING GIN (tags_zh);
CREATE INDEX skills_tags_en_gin ON skills USING GIN (tags_en);

-- Full-text search GIN index
CREATE INDEX skills_search_tsv_gin ON skills USING GIN (search_tsv);

-- Vector search HNSW index
CREATE INDEX skills_embedding_hnsw ON skills
  USING hnsw (embedding vector_cosine_ops);
