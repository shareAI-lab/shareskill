// Translation utility for handling dynamic content translations
import { get } from 'svelte/store';
import { locale } from '$lib/i18n';
import type { SkillTranslations } from '@shareskill/shared';

export type TranslationData = Record<string, Record<string, string | string[]>>;

// Get translated value from translations object
export function getTranslation<T extends string | string[]>(
  translations: TranslationData | undefined | null,
  field: string,
  fallback: T
): T {
  if (!translations) return fallback;

  const currentLocale = get(locale)?.split('-')[0] || 'en';

  // English is the default, no translation needed
  if (currentLocale === 'en') return fallback;

  const langData = translations[currentLocale];
  if (!langData) return fallback;

  const value = langData[field];
  if (value === undefined || value === null) return fallback;

  return value as T;
}

// Reactive version for Svelte components
export function useTranslation(
  translations: TranslationData | undefined | null,
  field: string,
  fallback: string
): string {
  return getTranslation(translations, field, fallback);
}

// Get category label with translation support
export function getCategoryLabel(
  category: { label: string; translations?: TranslationData },
  currentLocale: string
): string {
  if (!category.translations || currentLocale === 'en') {
    return category.label;
  }

  const lang = currentLocale.split('-')[0];
  return category.translations[lang]?.label || category.label;
}

// Get category hint with translation support
export function getCategoryHint(
  category: { hint: string; translations?: TranslationData },
  currentLocale: string
): string {
  if (!category.translations || currentLocale === 'en') {
    return category.hint;
  }

  const lang = currentLocale.split('-')[0];
  return category.translations[lang]?.hint || category.hint;
}

// Get skill translated content
export function getSkillTagline(
  skill: { tagline: string; translations?: SkillTranslations },
  currentLocale: string
): string {
  if (!skill.translations || currentLocale === 'en') {
    return skill.tagline;
  }

  const lang = currentLocale.split('-')[0] as 'zh' | 'ja';
  return skill.translations[lang]?.tagline || skill.tagline;
}

export function getSkillDescription(
  skill: { description: string; translations?: SkillTranslations },
  currentLocale: string
): string {
  if (!skill.translations || currentLocale === 'en') {
    return skill.description;
  }

  const lang = currentLocale.split('-')[0] as 'zh' | 'ja';
  return skill.translations[lang]?.description || skill.description;
}

export function getSkillKeyFeatures(
  skill: { key_features: string[]; translations?: SkillTranslations },
  currentLocale: string
): string[] {
  if (!skill.translations || currentLocale === 'en') {
    return skill.key_features;
  }

  const lang = currentLocale.split('-')[0] as 'zh' | 'ja';
  const translated = skill.translations[lang]?.key_features;

  // Only use translated if it has the same number of items
  if (translated && translated.length === skill.key_features.length) {
    return translated;
  }

  return skill.key_features;
}
