export const CATEGORIES = [
  {
    key: "info",
    label: "信息获取与检索",
    label_en: "Info Retrieval & Search",
    hint: "搜索、抓取、文档解析、知识库检索",
    hint_en: "Search, crawling, doc parsing, knowledge base"
  },
  {
    key: "planning",
    label: "规划与推理",
    label_en: "Planning & Reasoning",
    hint: "任务拆解、路线选择、风险预案",
    hint_en: "Task breakdown, path selection, risk planning"
  },
  {
    key: "system",
    label: "工具与系统操作",
    label_en: "Tools & System Ops",
    hint: "CLI/脚本、API 调用、环境搭建",
    hint_en: "CLI/scripts, API calls, env setup"
  },
  {
    key: "engineering",
    label: "代码与工程化",
    label_en: "Code & Engineering",
    hint: "重构、测试、构建与发布、CI/CD",
    hint_en: "Refactor, testing, build & release, CI/CD"
  },
  {
    key: "content",
    label: "内容与沟通",
    label_en: "Content & Communication",
    hint: "写作、总结、翻译、提案",
    hint_en: "Writing, summarizing, translation, proposals"
  },
  {
    key: "data",
    label: "数据处理与分析",
    label_en: "Data Processing & Analysis",
    hint: "清洗、统计、可视化、ETL",
    hint_en: "Cleaning, stats, visualization, ETL"
  },
  {
    key: "workflow",
    label: "业务流程与自动化",
    label_en: "Workflow & Automation",
    hint: "RPA、流程编排、跨系统协同",
    hint_en: "RPA, orchestration, cross-system flows"
  },
  {
    key: "ops",
    label: "监控与运维",
    label_en: "Monitoring & Ops",
    hint: "告警处理、故障排查、回滚恢复",
    hint_en: "Alerts, troubleshooting, rollback & recovery"
  },
  {
    key: "quality",
    label: "评估与质量",
    label_en: "Evaluation & Quality",
    hint: "校验、审查、合规检查",
    hint_en: "Validation, review, compliance checks"
  },
  {
    key: "media",
    label: "多模态/媒体处理",
    label_en: "Multimodal & Media",
    hint: "图片、音视频、OCR、TTS",
    hint_en: "Images, audio/video, OCR, TTS"
  },
  {
    key: "security",
    label: "安全与合规",
    label_en: "Security & Compliance",
    hint: "权限、脱敏、风控、审计",
    hint_en: "Permissions, redaction, risk control, audit"
  },
  {
    key: "integration",
    label: "集成与连接器",
    label_en: "Integrations & Connectors",
    hint: "第三方 SaaS、Webhook、SDK/插件",
    hint_en: "SaaS, webhooks, SDKs/plugins"
  },
  {
    key: "benchmark",
    label: "评测与基准",
    label_en: "Benchmarking",
    hint: "A/B、benchmark、回归测试",
    hint_en: "A/B, benchmarks, regression testing"
  },
  {
    key: "domain",
    label: "领域专用",
    label_en: "Domain Specific",
    hint: "法务/医疗/金融、教育、人力",
    hint_en: "Legal/medical/finance, education, HR"
  },
  {
    key: "other",
    label: "其他",
    label_en: "Other",
    hint: "未分类/探索中",
    hint_en: "Uncategorized/Exploratory"
  }
];

export const DEFAULT_CATEGORY = "其他";
export const DEFAULT_CATEGORY_EN = "Other";

export function getCategoryDisplay(label, language = "zh") {
  if (!label) {
    return language === "en" ? DEFAULT_CATEGORY_EN : DEFAULT_CATEGORY;
  }
  const match = CATEGORIES.find((category) => category.label === label);
  if (!match) {
    return label;
  }
  return language === "en" ? match.label_en : match.label;
}
