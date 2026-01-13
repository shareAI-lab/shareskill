import Link from "next/link";
import { getStrings, useLanguage } from "../lib/i18n";
import LanguageToggle from "./LanguageToggle";

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.486 2 12.02c0 4.425 2.865 8.182 6.839 9.504.5.094.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.344-3.369-1.344-.455-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.004.07 1.532 1.034 1.532 1.034.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.253-4.555-1.114-4.555-4.955 0-1.095.39-1.99 1.03-2.69-.103-.253-.447-1.27.098-2.646 0 0 .84-.27 2.75 1.026A9.56 9.56 0 0 1 12 6.844a9.6 9.6 0 0 1 2.504.338c1.909-1.296 2.748-1.026 2.748-1.026.546 1.376.202 2.393.1 2.646.64.7 1.028 1.595 1.028 2.69 0 3.85-2.338 4.698-4.566 4.947.359.31.678.92.678 1.854 0 1.337-.012 2.417-.012 2.745 0 .268.18.58.688.482A10.017 10.017 0 0 0 22 12.02C22 6.486 17.523 2 12 2z" />
    </svg>
  );
}

export default function Header({ children }) {
  const { language } = useLanguage();
  const strings = getStrings(language);
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <span className="logo-mark">S</span>
          {strings.appName}
        </Link>
        <div className="header-actions">
          <div className="header-center">{children}</div>
          <div className="header-right">
            <LanguageToggle />
            <a
              className="gh-link"
              href="https://github.com/shareAI-lab"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <GitHubIcon />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
