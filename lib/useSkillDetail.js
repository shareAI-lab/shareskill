import { useEffect, useState } from "react";
import { getStrings, useLanguage } from "./i18n";

export function useSkillDetail(id) {
  const { language } = useLanguage();
  const strings = getStrings(language);
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setSkill(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/skills/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((response) => {
        if (response.status === 404) {
          return null;
        }
        if (!response.ok) {
          throw new Error(strings.loadingFailed);
        }
        return response.json();
      })
      .then((data) => {
        setSkill(data || null);
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
  }, [id, strings.loadingFailed]);

  return { skill, loading, error };
}
