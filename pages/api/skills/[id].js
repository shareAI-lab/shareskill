import { getSkillByIdentifier } from "../../../lib/server/skillStore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { id } = req.query;
    const skill = await getSkillByIdentifier(Array.isArray(id) ? id[0] : id);
    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }
    return res.status(200).json(skill);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load skill" });
  }
}
