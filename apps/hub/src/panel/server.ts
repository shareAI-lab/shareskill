import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { listLocalSkills, getLocalSkill, removeLocalSkill, saveLocalSkill } from '../store/skills.js';
import { getSkillPackage } from '../mcp/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function startPanelServer(port: number): Promise<void> {
  const app = express();

  app.use(express.json());

  app.get('/api/skills', async (_req, res) => {
    const skills = listLocalSkills();
    res.json({ success: true, data: skills });
  });

  app.get('/api/skills/:name', async (req, res) => {
    const skill = getLocalSkill(req.params.name);
    if (skill) {
      res.json({ success: true, data: { content: skill.content, files: skill.files } });
    } else {
      res.status(404).json({ success: false, error: 'Skill not found' });
    }
  });

  app.post('/api/skills/download', async (req, res) => {
    try {
      const { skill_key } = req.body;
      const pkg = await getSkillPackage(skill_key);
      const installPath = saveLocalSkill(pkg);
      res.json({ success: true, data: { name: pkg.name, path: installPath } });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  });

  app.delete('/api/skills/:name', async (req, res) => {
    const removed = removeLocalSkill(req.params.name);
    if (removed) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Skill not found' });
    }
  });

  app.get('/', (_req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShareSkill Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-4xl mx-auto py-8 px-4">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">ShareSkill Hub</h1>
      <p class="text-gray-500">Manage your downloaded skills</p>
    </header>

    <div id="skills" class="space-y-4">
      <p class="text-gray-500">Loading...</p>
    </div>

    <div class="mt-8 pt-8 border-t">
      <a href="https://shareskill.run" target="_blank" class="text-blue-600 hover:underline">
        Browse more skills at shareskill.run
      </a>
    </div>
  </div>

  <script>
    async function loadSkills() {
      const res = await fetch('/api/skills');
      const { data } = await res.json();
      const container = document.getElementById('skills');

      if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No skills downloaded yet.</p>';
        return;
      }

      container.innerHTML = data.map(skill => \`
        <div class="p-4 bg-white rounded-lg border border-gray-200">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium text-gray-900">\${skill.name}</h3>
              <p class="text-sm text-gray-500">Downloaded: \${skill.downloadedAt}</p>
              <p class="text-xs text-gray-400">\${skill.path}</p>
            </div>
            <button onclick="removeSkill('\${skill.name}')" class="text-red-600 hover:text-red-700 text-sm">
              Remove
            </button>
          </div>
        </div>
      \`).join('');
    }

    async function removeSkill(name) {
      if (!confirm('Remove ' + name + '?')) return;
      await fetch('/api/skills/' + name, { method: 'DELETE' });
      loadSkills();
    }

    loadSkills();
  </script>
</body>
</html>
    `);
  });

  return new Promise((resolve) => {
    app.listen(port, () => resolve());
  });
}
