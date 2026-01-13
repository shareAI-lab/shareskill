import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Tag from "../../components/Tag";
import FileTree from "../../components/FileTree";
import MarkdownView from "../../components/MarkdownView";
import {
  formatNumber,
  formatRelativeDate,
  getSkillDisplayName,
  splitTagline
} from "../../lib/utils";
import { getCategoryDisplay } from "../../lib/constants";
import {
  getLocalizedFromBilingual,
  getLocalizedInstallText,
  getLocalizedText,
  getStrings,
  useLanguage
} from "../../lib/i18n";
import { useSkillDetail } from "../../lib/useSkillDetail";

function Section({ title, children }) {
  return (
    <div className="section-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function getSafeFileName(value) {
  return sanitizeName(String(value || "skill")) || "skill";
}

function sanitizeName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "skill";
}

export default function SkillDetail() {
  const router = useRouter();
  const routeId = Array.isArray(router.query.id)
    ? router.query.id[0]
    : router.query.id;
  const { language } = useLanguage();
  const strings = getStrings(language);
  const [docView, setDocView] = useState("current");
  const [downloadState, setDownloadState] = useState({
    loading: false,
    error: ""
  });

  const { skill, loading, error } = useSkillDetail(routeId);
  const taglineText = useMemo(
    () => getLocalizedFromBilingual(skill?.tagline, language),
    [skill, language]
  );
  const taglineLines = useMemo(() => splitTagline(taglineText), [taglineText]);
  const tagList = useMemo(() => {
    const tags = language === "en" ? skill?.tags_en : skill?.tags;
    const fallback = skill?.tags || [];
    return ((tags && tags.length ? tags : fallback) || []).filter(Boolean);
  }, [skill, language]);
  const descriptionText = useMemo(
    () =>
      language === "zh"
        ? skill?.description_zh || ""
        : skill?.description_en || "",
    [skill, language]
  );
  const useCaseText = useMemo(
    () =>
      getLocalizedText(
        {
          zh: skill?.use_case,
          en: skill?.use_case_en,
          fallback: skill?.use_case
        },
        language
      ),
    [skill, language]
  );
  const installText = useMemo(
    () =>
      getLocalizedInstallText(
        skill?.how_to_install,
        language,
        language === "en" ? strings.defaultInstall : ""
      ),
    [skill, language, strings.defaultInstall]
  );
  const docContent = useMemo(() => {
    if (!skill) {
      return "";
    }
    if (docView === "origin") {
      return skill.skill_md_content;
    }
    if (language === "zh") {
      return skill.skill_md_content_translation || skill.skill_md_content;
    }
    return skill.skill_md_content;
  }, [docView, language, skill]);

  const handleDownload = async () => {
    if (!skill?.download_url || downloadState.loading) {
      return;
    }
    setDownloadState({ loading: true, error: "" });
    try {
      const params = new URLSearchParams();
      params.set("url", skill.download_url);
      if (skill.fromRepo) {
        params.set("repo", skill.fromRepo);
      }
      if (skill.skillPath) {
        params.set("skillPath", skill.skillPath);
      }
      if (skill.skill_name) {
        params.set("name", skill.skill_name);
      }
      const response = await fetch(`/api/repack?${params.toString()}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || strings.packagingFailed);
      }
      const blob = await response.blob();
      const filename = `${getSafeFileName(skill.skill_name)}.zip`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDownloadState({ loading: false, error: "" });
    } catch (err) {
      setDownloadState({
        loading: false,
        error: err?.message || strings.downloadFailed
      });
    }
  };

  return (
    <div>
      <Header />
      <main>
        <section className="detail-hero">
          <div className="container">
            <button
              className="page-button"
              onClick={() => router.back()}
              type="button"
            >
              {strings.back}
            </button>
          </div>
        </section>

        <section className="section">
          <div className="container">
            {loading && <div className="loading">{strings.skillLoading}</div>}
            {error && <div className="loading">{error}</div>}
            {!loading && !skill && (
              <div className="loading">{strings.skillNotFound}</div>
            )}
            {skill && (
              <div className="detail-header">
                <div className="detail-title">
                  <h1>{getSkillDisplayName(skill)}</h1>
                  <div className="badge">
                    ⭐ {formatNumber(skill.repostars, language)}
                  </div>
                </div>
                <p className="detail-sub">
                  {taglineLines.length
                    ? taglineLines.map((line, index) => (
                        <span key={`${line}-${index}`} className="detail-sub-line">
                          {line}
                        </span>
                      ))
                    : strings.noTagline}
                </p>
                <div className="tag-list">
                  {tagList.length
                    ? tagList.map((tag, index) => (
                        <Tag key={`${tag}-${index}`} label={tag} />
                      ))
                    : <Tag label={strings.noTags} />}
                </div>
                <div className="meta">
                  <span className="meta-category">
                    {strings.categoryLabel}: {getCategoryDisplay(skill.category, language)}
                  </span>
                  <span className="meta-updated">
                    {strings.updatedLabelDetail}: {formatRelativeDate(skill.updated_at, language)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {skill && (
          <section className="section">
            <div className="container detail-grid">
              <Section title={strings.descriptionTitle}>
                <p>{descriptionText || strings.noDescription}</p>
              </Section>
              <Section title={strings.useCaseTitle}>
                <p style={{ whiteSpace: "pre-line" }}>
                  {useCaseText || strings.noUseCase}
                </p>
              </Section>
              <Section title={strings.installTitle}>
                {installText ? (
                  <pre className="code-block">{installText}</pre>
                ) : (
                  <pre className="code-block">{strings.defaultInstall}</pre>
                )}
              </Section>
              <Section title={strings.linksTitle}>
                <div className="link-list">
                  {skill.fromRepo && (
                    <a
                      className="link-button"
                      href={skill.fromRepo}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {strings.repoLink}
                    </a>
                  )}
                  {skill.download_url && (
                    <>
                      <button
                        className="link-button"
                        type="button"
                        onClick={handleDownload}
                        disabled={downloadState.loading}
                      >
                        {downloadState.loading
                          ? strings.downloadPackaging
                          : strings.downloadSkill}
                      </button>
                      <a
                        className="link-button"
                        href={skill.download_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {strings.downloadOriginal}
                      </a>
                    </>
                  )}
                </div>
                {downloadState.error ? (
                  <p style={{ marginTop: "12px", color: "#a14b1f" }}>
                    {downloadState.error}
                  </p>
                ) : null}
                {skill.skillPath ? (
                  <p style={{ marginTop: "12px" }}>
                    {strings.pathLabel}: {skill.skillPath}
                  </p>
                ) : null}
              </Section>
            </div>
          </section>
        )}

        {skill && (
          <section className="section">
            <div className="container">
              <div className="section-card">
                <h3>{strings.docTitle}</h3>
                <div className="tabs">
                  <button
                    className={`tab ${docView === "origin" ? "active" : ""}`}
                    onClick={() => setDocView("origin")}
                    type="button"
                  >
                    {strings.docOrigin}
                  </button>
                  <button
                    className={`tab ${docView === "current" ? "active" : ""}`}
                    onClick={() => setDocView("current")}
                    type="button"
                  >
                    {strings.docCurrent}
                  </button>
                </div>
                <div className="doc-pane">
                  <MarkdownView content={docContent} />
                </div>
              </div>
            </div>
          </section>
        )}

        {skill && (
          <section className="section">
            <div className="container">
              <div className="section-card">
                <h3>{strings.fileTreeTitle}</h3>
                <FileTree fileTree={skill.file_tree} />
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
