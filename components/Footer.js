import { getStrings, useLanguage } from "../lib/i18n";

export default function Footer() {
  const { language } = useLanguage();
  const strings = getStrings(language);
  return (
    <footer className="footer">
      <div className="container">{strings.footer}</div>
    </footer>
  );
}
