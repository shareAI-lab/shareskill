import crypto from "crypto";
import { getSkillSummary } from "../../../lib/server/skillStore";

const CACHE_TTL = Number(process.env.SKILL_SUMMARY_CACHE_MS) || 15 * 60 * 1000;
const CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=3600";

let cachedSummary = null;
let cachedAt = 0;

function buildEtag(payload) {
  return `W/"${crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex")}"`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    res.setHeader("Cache-Control", CACHE_CONTROL);
    const now = Date.now();
    if (cachedSummary && now - cachedAt < CACHE_TTL) {
      const etag = buildEtag(cachedSummary);
      res.setHeader("ETag", etag);
      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }
      return res.status(200).json(cachedSummary);
    }

    const summary = await getSkillSummary();
    cachedSummary = summary;
    cachedAt = now;
    const etag = buildEtag(summary);
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load summary" });
  }
}
