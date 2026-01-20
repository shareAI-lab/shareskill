import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator, locale } from 'svelte-i18n';

const defaultLocale = 'en';

register('en', () => import('./locales/en.json'));
register('zh', () => import('./locales/zh.json'));
register('ja', () => import('./locales/ja.json'));

export function initI18n() {
  init({
    fallbackLocale: defaultLocale,
    initialLocale: browser ? getLocaleFromNavigator()?.split('-')[0] || defaultLocale : defaultLocale,
  });
}

export function setLocale(lang: string) {
  locale.set(lang);
  if (browser) {
    localStorage.setItem('locale', lang);
    document.documentElement.lang = lang;
  }
}

export function getStoredLocale(): string | null {
  if (browser) {
    return localStorage.getItem('locale');
  }
  return null;
}

export const supportedLocales = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

export { locale } from 'svelte-i18n';
