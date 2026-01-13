import { DEFAULT_CATEGORY } from "./constants";

export function parseArrayValue(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "number") {
    return [String(value)];
  }
  if (typeof value !== "string") {
    return [];
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to splitting.
  }
  const hasDelimiter = /[,;|]/.test(trimmed);
  const parts = hasDelimiter
    ? trimmed.split(/[,;|]/)
    : trimmed.split(/\s+/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function normalizeText(value) {
  if (!value) {
    return "";
  }
  return String(value).toLowerCase();
}

export function parseDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d+$/.test(trimmed)) {
      const date = new Date(Number(trimmed));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatRelativeDate(value, language = "zh") {
  const date = parseDate(value);
  if (!date) {
    return language === "en" ? "Unknown time" : "未知时间";
  }
  const now = Date.now();
  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);
  const locale = language === "en" ? "en" : "zh-CN";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (abs < 60) {
    return rtf.format(diffSeconds, "second");
  }
  if (abs < 3600) {
    return rtf.format(Math.round(diffSeconds / 60), "minute");
  }
  if (abs < 86400) {
    return rtf.format(Math.round(diffSeconds / 3600), "hour");
  }
  if (abs < 2592000) {
    return rtf.format(Math.round(diffSeconds / 86400), "day");
  }
  if (abs < 31536000) {
    return rtf.format(Math.round(diffSeconds / 2592000), "month");
  }
  return rtf.format(Math.round(diffSeconds / 31536000), "year");
}

export function formatNumber(value, language = "zh") {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }
  const locale = language === "en" ? "en-US" : "zh-CN";
  return new Intl.NumberFormat(locale).format(number);
}

export function pickCategory(value) {
  const categories = parseArrayValue(value);
  if (categories.length) {
    return categories[0];
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return DEFAULT_CATEGORY;
}

export function getSkillIdentifier(skill) {
  if (skill && skill.identifier) {
    return skill.identifier;
  }
  if (skill && skill.id !== undefined && skill.id !== null) {
    return String(skill.id);
  }
  if (skill && skill.skill_name) {
    return encodeURIComponent(skill.skill_name);
  }
  return "unknown";
}

export function getSkillDisplayName(skill) {
  if (skill && skill.skill_name) {
    const name = String(skill.skill_name);
    const parts = name.split(":");
    return parts[parts.length - 1].trim() || name;
  }
  if (skill && skill.id) {
    return String(skill.id);
  }
  return "未命名 skill";
}

export function splitTagline(value) {
  if (!value) {
    return [];
  }
  const text = String(value).trim();
  if (!text) {
    return [];
  }
  const hasDelimiter =
    /[\r\n]/.test(text) ||
    /\s+\|\s+/.test(text) ||
    /\s+\/\s+/.test(text) ||
    /｜/.test(text);
  if (!hasDelimiter) {
    return [text];
  }
  const parts = text
    .split(/(?:\r?\n|\s*\|\s*|\s*\/\s*|\s*｜\s*)/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}
