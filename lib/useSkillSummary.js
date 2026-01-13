import { useEffect, useState } from "react";
import { getStrings, useLanguage } from "./i18n";

export function useSkillSummary() {
  const { language } = useLanguage();
  const strings = getStrings(language);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch("/api/skills/summary")
      .then((response) => {
        if (!response.ok) {
          throw new Error(strings.loadingFailed);
        }
        return response.json();
      })
      .then((data) => {
        if (!active) {
          return;
        }
        setCounts(data.counts || {});
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err?.message || strings.loadingFailed);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [strings.loadingFailed]);

  return { counts, total, loading, error };
}
