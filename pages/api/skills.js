import { listSkills } from "../../lib/server/skillStore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=600"
    );
    const { q = "", category = "", sort = "latest" } = req.query;
    const page = Number.parseInt(req.query.page, 10) || 1;
    const pageSize = Number.parseInt(req.query.pageSize, 10) || 16;
    const data = await listSkills({ q, category, page, pageSize, sort });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Failed to load skills",
      detail: String(error?.message || error)
    });
  }
}
