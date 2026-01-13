import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getStrings, useLanguage } from "../lib/i18n";

export default function MarkdownView({ content }) {
  const { language } = useLanguage();
  const strings = getStrings(language);
  const value = content || "";
  if (!value.trim()) {
    return <div className="markdown muted">{strings.noDocContent}</div>;
  }
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
    </div>
  );
}
