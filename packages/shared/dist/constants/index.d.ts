export declare const CATEGORIES: readonly [{
    readonly key: "coding";
    readonly label: "Coding";
    readonly hint: "Writing, reviewing, refactoring code";
    readonly sort_order: 10;
}, {
    readonly key: "devops";
    readonly label: "DevOps";
    readonly hint: "CI/CD, deployment, infrastructure";
    readonly sort_order: 20;
}, {
    readonly key: "testing";
    readonly label: "Testing";
    readonly hint: "QA, unit tests, validation";
    readonly sort_order: 30;
}, {
    readonly key: "security";
    readonly label: "Security";
    readonly hint: "Auth, auditing, vulnerability";
    readonly sort_order: 40;
}, {
    readonly key: "data";
    readonly label: "Data";
    readonly hint: "Analysis, visualization, ETL";
    readonly sort_order: 50;
}, {
    readonly key: "ai";
    readonly label: "AI & Agents";
    readonly hint: "LLM, prompts, automation agents";
    readonly sort_order: 60;
}, {
    readonly key: "design";
    readonly label: "Design";
    readonly hint: "UI/UX, graphics, visual assets";
    readonly sort_order: 70;
}, {
    readonly key: "writing";
    readonly label: "Writing";
    readonly hint: "Copywriting, editing, storytelling";
    readonly sort_order: 80;
}, {
    readonly key: "media";
    readonly label: "Media";
    readonly hint: "Video, audio, image processing";
    readonly sort_order: 90;
}, {
    readonly key: "business";
    readonly label: "Business";
    readonly hint: "Strategy, planning, analysis";
    readonly sort_order: 100;
}, {
    readonly key: "marketing";
    readonly label: "Marketing";
    readonly hint: "SEO, ads, social media, growth";
    readonly sort_order: 110;
}, {
    readonly key: "sales";
    readonly label: "Sales";
    readonly hint: "CRM, outreach, proposals";
    readonly sort_order: 120;
}, {
    readonly key: "finance";
    readonly label: "Finance";
    readonly hint: "Accounting, budgeting, invoicing";
    readonly sort_order: 130;
}, {
    readonly key: "productivity";
    readonly label: "Productivity";
    readonly hint: "Workflows, automation, efficiency";
    readonly sort_order: 140;
}, {
    readonly key: "communication";
    readonly label: "Communication";
    readonly hint: "Email, meetings, presentations";
    readonly sort_order: 150;
}, {
    readonly key: "research";
    readonly label: "Research";
    readonly hint: "Information gathering, synthesis";
    readonly sort_order: 160;
}, {
    readonly key: "education";
    readonly label: "Education";
    readonly hint: "Teaching, learning, tutoring";
    readonly sort_order: 170;
}, {
    readonly key: "other";
    readonly label: "Other";
    readonly hint: "Miscellaneous";
    readonly sort_order: 999;
}];
export declare const CATEGORY_KEYS: ("other" | "coding" | "devops" | "testing" | "security" | "data" | "ai" | "design" | "writing" | "media" | "business" | "marketing" | "sales" | "finance" | "productivity" | "communication" | "research" | "education")[];
export type CategoryKey = (typeof CATEGORY_KEYS)[number];
export declare const API_BASE_URL = "https://shareskill.run/api";
export declare const LOCAL_STORAGE_PATH = ".shareskill";
export declare const SKILLS_DIR = "skills";
export declare const CONFIG_FILE = "config.json";
export declare const MCP_SERVER_PORT = 3001;
export declare const EMBEDDING_MODEL = "text-embedding-3-large";
export declare const EMBEDDING_DIMENSIONS = 1536;
export declare const LLM_MODEL = "gemini-3-flash-preview";
export declare const AGENT_CONFIGS: {
    readonly claude_code: {
        readonly name: "Claude Code";
        readonly config_path: "~/.claude/settings.json";
        readonly skill_path: "~/.claude/skills/";
    };
    readonly cursor: {
        readonly name: "Cursor";
        readonly config_path: "~/.cursor/mcp.json";
        readonly skill_path: "~/.cursor/skills/";
    };
    readonly codex: {
        readonly name: "Codex";
        readonly config_path: "~/.codex/config.json";
        readonly skill_path: "~/.codex/skills/";
    };
    readonly opencode: {
        readonly name: "OpenCode";
        readonly config_path: "~/.config/opencode/config.json";
        readonly skill_path: "~/.config/opencode/skills/";
    };
    readonly antigravity: {
        readonly name: "Antigravity";
        readonly config_path: "~/.gemini/config.json";
        readonly skill_path: "~/.gemini/skills/";
    };
};
export type AgentType = keyof typeof AGENT_CONFIGS;
export declare const SEARCH_DEFAULTS: {
    limit: number;
    max_limit: number;
    semantic: boolean;
    sort: "relevance";
};
//# sourceMappingURL=index.d.ts.map