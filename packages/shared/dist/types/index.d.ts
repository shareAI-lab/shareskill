export type SecurityWarningType = 'prompt_injection' | 'malicious_code' | 'data_exfiltration' | 'credential_exposure' | 'destructive_operation' | 'other';
export interface SecurityWarning {
    file: string;
    line: number;
    severity: 'high' | 'medium' | 'low';
    type?: SecurityWarningType;
    description: string;
    code_snippet?: string;
}
export interface Skill {
    id: number;
    skill_key: string;
    skill_slug: string | null;
    skill_path: string;
    repo_full_name: string;
    repo_url: string;
    repo_stars: number;
    repo_pushed_at: string | null;
    name: string;
    description: string;
    tagline: string;
    category: string;
    tags: string[];
    key_features: string[];
    tech_stack: string[];
    license: string | null;
    compatibility: string | null;
    allowed_tools: string[];
    file_tree: Array<{
        path: string;
        type: 'file' | 'dir';
        size?: number;
    }>;
    has_scripts: boolean;
    has_references: boolean;
    script_count: number;
    total_files: number;
    security_warnings: SecurityWarning[];
    download_url: string;
    skill_md_content: string | null;
    skill_updated_at: string | null;
    embedding: number[] | null;
    created_at: string;
    ingested_at: string;
}
export interface SkillTranslation {
    tagline?: string;
    description?: string;
    key_features?: string[];
}
export interface SkillTranslations {
    zh?: SkillTranslation;
    ja?: SkillTranslation;
}
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
    security_warnings_count?: number;
    translations?: SkillTranslations;
}
export interface SkillDetail extends SkillListItem {
    skill_path: string;
    license: string | null;
    compatibility: string | null;
    allowed_tools: string[];
    tech_stack: string[];
    file_tree: Array<{
        path: string;
        type: 'file' | 'dir';
        size?: number;
    }>;
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
export interface SkillCategory {
    key: string;
    label: string;
    hint: string;
    sort_order: number;
    count?: number;
}
export interface SkillsSummary {
    total_count: number;
    by_category: Record<string, number>;
    top_tags: Array<{
        tag: string;
        count: number;
    }>;
    computed_at: string;
}
export interface SearchParams {
    query: string;
    category?: string;
    sort?: 'relevance' | 'latest' | 'stars';
    semantic?: boolean;
    page?: number;
    limit?: number;
    lang?: 'en' | 'zh';
}
export interface SearchResult {
    items: SkillListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}
//# sourceMappingURL=index.d.ts.map