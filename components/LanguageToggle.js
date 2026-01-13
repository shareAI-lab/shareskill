import { getStrings, useLanguage } from "../lib/i18n";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const strings = getStrings(language);
  return (
    <div className="lang-toggle" role="group" aria-label="Language toggle">
      <button
        className={`lang-button ${language === "zh" ? "active" : ""}`}
        type="button"
        onClick={() => setLanguage("zh")}
        aria-pressed={language === "zh"}
      >
        {strings.languageZh}
      </button>
      <button
        className={`lang-button ${language === "en" ? "active" : ""}`}
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
      >
        {strings.languageEn}
      </button>
    </div>
  );
}
