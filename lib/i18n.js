import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "skill-language";
const DEFAULT_LANGUAGE = "zh";

const STRINGS = {
  zh: {
    appName: "Skill 搜索",
    searchTitle: "搜索 Agent Skills",
    searchSubtitle: "按名称、描述或标签快速定位你需要的 skill。",
    searchPlaceholder: "搜索 skill 名称、描述或标签...",
    searchButton: "搜索",
    loadingSkills: "正在加载 skills...",
    loadingFailed: "加载失败",
    availableSkills: (count) => `${count} 个可用 skills`,
    categoryCount: (count) => `${count} 个`,
    categoriesTitle: "分类",
    resultsTitle: "搜索结果",
    resultsForQuery: (query) => `搜索: ${query}`,
    resultsCount: (count) => `${count} 个结果`,
    loading: "加载中",
    sortLabel: "排序:",
    sortLatest: "最新更新",
    sortOldest: "最早更新",
    sortStars: "GitHub Stars",
    noResults: "没有匹配的 skill",
    previousPage: "← 上一页",
    nextPage: "下一页 →",
    back: "← 返回",
    skillLoading: "正在加载 skill...",
    skillNotFound: "没有找到对应的 skill",
    noTagline: "暂无一句话描述",
    noTags: "未标注标签",
    categoryLabel: "分类",
    updatedLabel: "更新",
    updatedLabelDetail: "最近更新",
    descriptionTitle: "描述",
    useCaseTitle: "使用场景",
    installTitle: "安装与加载",
    linksTitle: "链接",
    docTitle: "Skill 文档",
    fileTreeTitle: "文件结构",
    noDescription: "暂无描述",
    noUseCase: "暂无使用场景",
    noFileTree: "暂无文件结构",
    noDocContent: "暂无文档内容",
    repoLink: "GitHub 仓库",
    downloadSkill: "下载 Skill",
    downloadOriginal: "原始下载",
    downloadPackaging: "正在打包...",
    downloadFailed: "下载失败",
    packagingFailed: "打包失败",
    pathLabel: "路径",
    docOrigin: "原文",
    docCurrent: "当前语言",
    languageZh: "中文",
    languageEn: "English",
    footer: "© 2024 Awesome Skills | 数据来源: GitHub",
    unknownTime: "未知时间",
    defaultInstall: `Claude Code:
1. git clone <repo-url> /tmp/temp-repo
2. cp -r /tmp/temp-repo/<skill-path> ~/.claude/skills/
   或 cp -r /tmp/temp-repo/<skill-path> .claude/skills/

Codex (OpenAI Agent CLI):
skill-installer https://github.com/<owner>/<repo>/<skill-path>`
  },
  en: {
    appName: "Skill Search",
    searchTitle: "Search Agent Skills",
    searchSubtitle: "Find the right skill by name, description, or tag.",
    searchPlaceholder: "Search skill names, descriptions, or tags...",
    searchButton: "Search",
    loadingSkills: "Loading skills...",
    loadingFailed: "Loading failed",
    availableSkills: (count) => `${count} skills available`,
    categoryCount: (count) => `${count} skills`,
    categoriesTitle: "Categories",
    resultsTitle: "Search Results",
    resultsForQuery: (query) => `Search: ${query}`,
    resultsCount: (count) => `${count} results`,
    loading: "Loading",
    sortLabel: "Sort:",
    sortLatest: "Latest",
    sortOldest: "Oldest",
    sortStars: "GitHub Stars",
    noResults: "No skills found",
    previousPage: "← Previous",
    nextPage: "Next →",
    back: "← Back",
    skillLoading: "Loading skill...",
    skillNotFound: "Skill not found",
    noTagline: "No tagline yet",
    noTags: "No tags",
    categoryLabel: "Category",
    updatedLabel: "Updated",
    updatedLabelDetail: "Last updated",
    descriptionTitle: "Description",
    useCaseTitle: "Use Cases",
    installTitle: "Install & Load",
    linksTitle: "Links",
    docTitle: "Skill Docs",
    fileTreeTitle: "File Structure",
    noDescription: "No description provided",
    noUseCase: "No use cases provided",
    noFileTree: "No file tree available",
    noDocContent: "No documentation available",
    repoLink: "GitHub Repo",
    downloadSkill: "Download Skill",
    downloadOriginal: "Direct Download",
    downloadPackaging: "Packaging...",
    downloadFailed: "Download failed",
    packagingFailed: "Packaging failed",
    pathLabel: "Path",
    docOrigin: "Original",
    docCurrent: "Current Language",
    languageZh: "中文",
    languageEn: "English",
    footer: "© 2024 Awesome Skills | Data source: GitHub",
    unknownTime: "Unknown time",
    defaultInstall: `Claude Code:
1. git clone <repo-url> /tmp/temp-repo
2. cp -r /tmp/temp-repo/<skill-path> ~/.claude/skills/
   or cp -r /tmp/temp-repo/<skill-path> .claude/skills/

Codex (OpenAI Agent CLI):
skill-installer https://github.com/<owner>/<repo>/<skill-path>`
  }
};

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {}
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "zh" || stored === "en") {
      setLanguage(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function getStrings(language) {
  return STRINGS[language] || STRINGS[DEFAULT_LANGUAGE];
}

export function isChineseText(value) {
  return /[\u4e00-\u9fff]/.test(String(value || ""));
}

export function splitBilingualText(value, options = {}) {
  const { allowNewline = true } = options;
  if (!value) {
    return { primary: "", secondary: "" };
  }
  const text = String(value).trim();
  if (!text) {
    return { primary: "", secondary: "" };
  }
  const delimiter = /(?:\s*\|\s*|\s*\/\s*|\s*｜\s*)/;
  if (delimiter.test(text)) {
    const parts = text
      .split(delimiter)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 2) {
      const firstIsZh = isChineseText(parts[0]);
      const secondIsZh = isChineseText(parts[1]);
      if (firstIsZh !== secondIsZh) {
        return { primary: parts[0], secondary: parts[1] };
      }
    }
  }

  if (allowNewline && /[\r\n]/.test(text)) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 2) {
      const firstIsZh = isChineseText(lines[0]);
      const secondIsZh = isChineseText(lines[1]);
      if (firstIsZh !== secondIsZh) {
        return { primary: lines[0], secondary: lines[1] };
      }
    }
  }

  return { primary: text, secondary: "" };
}

export function getLocalizedFromBilingual(value, language, options) {
  const { primary, secondary } = splitBilingualText(value, options);
  if (!secondary) {
    return primary;
  }
  const primaryIsZh = isChineseText(primary);
  const secondaryIsZh = isChineseText(secondary);
  if (primaryIsZh && !secondaryIsZh) {
    return language === "zh" ? primary : secondary;
  }
  if (secondaryIsZh && !primaryIsZh) {
    return language === "zh" ? secondary : primary;
  }
  return language === "zh" ? primary : secondary;
}

export function getLocalizedText({ zh, en, fallback }, language) {
  if (language === "zh") {
    return zh || fallback || en || "";
  }
  return en || fallback || zh || "";
}

export function getLocalizedInstallText(value, language, fallback) {
  if (!value) {
    return "";
  }
  const localized = getLocalizedFromBilingual(value, language);
  if (language === "zh") {
    return localized;
  }
  if (!localized) {
    return "";
  }
  if (!isChineseText(localized)) {
    return localized;
  }
  const translated = translateInstallText(localized);
  if (translated && translated !== localized) {
    return translated;
  }
  return fallback || localized;
}


function translateInstallText(text) {
  const lines = String(text).split(/\r?\n/);
  return lines
    .map((line) => {
      const match = line.match(/^(\s*)(.*)$/);
      const prefix = match ? match[1] : "";
      const content = match ? match[2] : line;
      if (!content.trim()) {
        return line;
      }
      const trimmed = content.trim();
      if (/^Claude Code:/i.test(trimmed)) {
        return `${prefix}Claude Code:`;
      }
      if (/^Codex CLI:/i.test(trimmed)) {
        return `${prefix}Codex CLI:`;
      }
      const stepMatch = trimmed.match(/^(\d+)\.\s*(.*)$/);
      if (!stepMatch) {
        return `${prefix}${translateInstallSentence(trimmed)}`;
      }
      const number = stepMatch[1];
      const rest = stepMatch[2];
      return `${prefix}${number}. ${translateInstallStep(rest)}`;
    })
    .join("\n");
}

function translateInstallSentence(sentence) {
  return sentence
    .replace(/或\s*Claude Code 配置的 skills 目录/g, "or the skills directory configured in Claude Code")
    .replace(/或\s*Codex CLI 配置的 skills 目录/g, "or the skills directory configured in Codex CLI")
    .replace(/后重启 CLI/g, "and restart the CLI");
}

function translateInstallStep(step) {
  const downloadMatch = step.match(/^下载并解压[:：]\s*(.+)$/);
  if (downloadMatch) {
    return `Download and unzip: ${downloadMatch[1]}`;
  }
  if (/^重新打开\s*Claude Code/.test(step)) {
    return "Reopen Claude Code to confirm the skill is active";
  }
  const runMatch = step.match(/^运行[:：]\s*(.+)$/);
  if (runMatch) {
    return `Run: ${runMatch[1]}`;
  }
  const moveMatch = step.match(/^将\s*skill\s*目录放入\s*(.+)$/i);
  if (moveMatch) {
    return `Move the skill folder to ${translateInstallSentence(moveMatch[1])}`;
  }
  const orCopyMatch = step.match(/^或将\s*skill\s*目录复制到\s*(.+)$/i);
  if (orCopyMatch) {
    return `Or copy the skill folder to ${translateInstallSentence(orCopyMatch[1])}`;
  }
  const copyMatch = step.match(/^将\s*skill\s*目录复制到\s*(.+)$/i);
  if (copyMatch) {
    return `Copy the skill folder to ${translateInstallSentence(copyMatch[1])}`;
  }
  return translateInstallSentence(step);
}
