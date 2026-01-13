import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SearchBar from "../components/SearchBar";
import CategoryCard from "../components/CategoryCard";
import { CATEGORIES } from "../lib/constants";
import { getStrings, useLanguage } from "../lib/i18n";
import { useSkillSummary } from "../lib/useSkillSummary";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { counts, total, loading, error } = useSkillSummary();
  const { language } = useLanguage();
  const strings = getStrings(language);

  const categoryCounts = useMemo(() => {
    const next = {};
    CATEGORIES.forEach((category) => {
      next[category.label] = 0;
    });
    Object.entries(counts || {}).forEach(([category, count]) => {
      next[category] = count;
    });
    return next;
  }, [counts]);

  return (
    <div>
      <Header />
      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-inner fade-up">
              <h1 className="hero-title">{strings.searchTitle}</h1>
              <p className="hero-sub">{strings.searchSubtitle}</p>
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={() => {
                  const nextQuery = query.trim();
                  if (nextQuery) {
                    router.push(`/search?q=${encodeURIComponent(nextQuery)}`);
                  } else {
                    router.push("/search");
                  }
                }}
              />
              <div className="meta" style={{ marginTop: "20px" }}>
                {loading
                  ? strings.loadingSkills
                  : strings.availableSkills(total)}
                {error ? ` · ${error}` : ""}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <h2 className="section-title">{strings.categoriesTitle}</h2>
            <div className="category-grid">
              {CATEGORIES.map((category, index) => (
                <CategoryCard
                  key={category.key}
                  value={category.label}
                  label={language === "en" ? category.label_en : category.label}
                  hint={language === "en" ? category.hint_en : category.hint}
                  count={categoryCounts[category.label] ?? 0}
                  countLabel={strings.categoryCount(categoryCounts[category.label] ?? 0)}
                  style={{ "--delay": `${index * 40}ms` }}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
