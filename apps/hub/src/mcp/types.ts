// API Types for MCP Server

export interface SkillListItem {
  id: number;
  skill_key: string;
  skill_slug: string | null;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  key_features: string[];
  repo_full_name: string;
  repo_stars: number;
  repo_pushed_at: string | null;
  similarity?: number;
}

export interface SecurityWarning {
  file: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
  code_snippet?: string;
}

export interface SkillDetail extends SkillListItem {
  skill_path: string;
  license: string | null;
  compatibility: string | null;
  allowed_tools: string[];
  tech_stack: string[];
  file_tree: Array<{ path: string; type: 'file' | 'dir'; size?: number }>;
  has_scripts: boolean;
  has_references: boolean;
  script_count: number;
  total_files: number;
  security_warnings: SecurityWarning[];
  repo_url: string;
  download_url: string;
  skill_md_content: string | null;
  skill_updated_at: string | null;
  related?: SkillListItem[];
  same_repo?: SkillListItem[];
}

export interface PackageFile {
  path: string;
  content: string;
}

export interface SkillPackage {
  skill_key: string;
  name: string;
  version: string;
  files: PackageFile[];
  warnings?: string[];
}

export interface SearchResponse {
  success: boolean;
  data?: {
    items: SkillListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
  error?: { code: string; message: string };
}

export interface SkillResponse {
  success: boolean;
  data?: SkillDetail;
  error?: { code: string; message: string };
}

export interface PackageResponse {
  success: boolean;
  data?: SkillPackage;
  error?: { code: string; message: string };
}
