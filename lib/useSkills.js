import { useEffect, useMemo, useState } from "react";
import { getStrings, useLanguage } from "./i18n";

export function useSkills({
  q = "",
  category = "",
  page = 1,
  pageSize = 16,
  sort = "latest"
} = {}) {
  const { language } = useLanguage();
  const strings = getStrings(language);
  const [skills, setSkills] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (page) params.set("page", String(page));
    if (pageSize) params.set("pageSize", String(pageSize));
    if (sort) params.set("sort", sort);
    return params.toString();
  }, [q, category, page, pageSize, sort]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/skills?${queryString}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(strings.loadingFailed);
        }
        return response.json();
      })
      .then((data) => {
        setSkills(data.items || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") {
          return;
        }
        setError(err?.message || strings.loadingFailed);
        setLoading(false);
      });

    return () => controller.abort();
  }, [queryString, strings.loadingFailed]);

  return { skills, total, loading, error };
}
