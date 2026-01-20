-- ShareSkill v2 Database Schema
-- Migration: 001_schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;

-- Skill categories table
CREATE TABLE skill_categories (
  key TEXT PRIMARY KEY,
  label_zh TEXT NOT NULL,
  label_en TEXT NOT NULL,
  hint_zh TEXT NOT NULL,
  hint_en TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 100
);

-- Skill repositories table (tracks indexed repos)
CREATE TABLE skill_repositories (
  repo_full_name TEXT PRIMARY KEY,
  repo_url TEXT NOT NULL,
  default_branch TEXT,
  stars INT NOT NULL DEFAULT 0,
  pushed_at TIMESTAMPTZ,
  last_indexed_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Main skills table
CREATE TABLE skills (
  id BIGSERIAL PRIMARY KEY,

  -- Repository info
  repo_full_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  repo_stars INT NOT NULL DEFAULT 0,
  repo_pushed_at TIMESTAMPTZ,

  -- Skill identification
  skill_path TEXT NOT NULL DEFAULT '',
  skill_slug TEXT,
  skill_title TEXT,
  skill_key TEXT GENERATED ALWAYS AS (
    repo_full_name || ':' || CASE WHEN skill_path = '' THEN '__root__' ELSE skill_path END
  ) STORED,

  -- Classification
  category_key TEXT NOT NULL DEFAULT 'other',

  -- Multilingual content
  tagline_zh TEXT NOT NULL DEFAULT '',
  tagline_en TEXT NOT NULL DEFAULT '',
  description_zh TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  tags_zh TEXT[] NOT NULL DEFAULT '{}',
  tags_en TEXT[] NOT NULL DEFAULT '{}',
  use_cases_zh TEXT[] NOT NULL DEFAULT '{}',
  use_cases_en TEXT[] NOT NULL DEFAULT '{}',

  -- Installation info
  how_to_install TEXT NOT NULL DEFAULT '',
  download_url TEXT NOT NULL DEFAULT '',

  -- Storage object keys (large files in Storage)
  skill_md_object_key TEXT,
  skill_md_translation_object_key TEXT,
  file_tree_object_key TEXT,

  -- Search fields
  search_text_zh TEXT NOT NULL DEFAULT '',
  search_text_en TEXT NOT NULL DEFAULT '',
  search_text TEXT NOT NULL DEFAULT '',
  search_tsv TSVECTOR,

  -- Semantic vector
  embedding VECTOR(3072),
  embedding_model TEXT,
  embedding_updated_at TIMESTAMPTZ,

  -- Incremental processing
  skill_md_sha TEXT,
  last_checked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT skills_repo_skillpath_uniq UNIQUE (repo_full_name, skill_path),
  CONSTRAINT skills_category_fk FOREIGN KEY (category_key) REFERENCES skill_categories(key)
);

-- Pre-computed summary table
CREATE TABLE skills_summary (
  id INT PRIMARY KEY DEFAULT 1,
  total_count INT NOT NULL DEFAULT 0,
  by_category JSONB NOT NULL DEFAULT '{}',
  top_tags_zh JSONB NOT NULL DEFAULT '{}',
  top_tags_en JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize summary row
INSERT INTO skills_summary (id) VALUES (1);
