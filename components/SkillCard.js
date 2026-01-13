import Link from "next/link";
import Tag from "./Tag";
import {
  formatRelativeDate,
  getSkillDisplayName,
  getSkillIdentifier,
  splitTagline
} from "../lib/utils";
import { getCategoryDisplay } from "../lib/constants";
import { getLocalizedFromBilingual, getStrings, useLanguage } from "../lib/i18n";

export default function SkillCard({ skill, style }) {
  const { language } = useLanguage();
  const strings = getStrings(language);
  const rawTags = language === "en" ? skill.tags_en : skill.tags;
  const tagList = (rawTags && rawTags.length ? rawTags : skill.tags || []).filter(Boolean);
  const taglineText = getLocalizedFromBilingual(skill.tagline, language);
  const taglineLines = splitTagline(taglineText);
  return (
    <Link
      href={`/skill/${getSkillIdentifier(skill)}`}
      className="skill-card fade-up"
      style={style}
    >
      <h3 className="skill-title">{getSkillDisplayName(skill)}</h3>
      <p className="skill-tagline">
        {taglineLines.length
          ? taglineLines.map((line, index) => (
              <span key={`${line}-${index}`} className="skill-tagline-line">
                {line}
              </span>
            ))
          : strings.noTagline}
      </p>
      <div className="tag-list">
        {tagList.length
          ? tagList
              .slice(0, 5)
              .map((tag, index) => <Tag key={`${tag}-${index}`} label={tag} />)
          : <Tag label={strings.noTags} />}
      </div>
      <div className="meta">
        <span className="meta-category">
          {strings.categoryLabel}: {getCategoryDisplay(skill.category, language)}
        </span>
        <span className="meta-updated">
          {strings.updatedLabel}: {formatRelativeDate(skill.updated_at, language)}
        </span>
      </div>
    </Link>
  );
}
