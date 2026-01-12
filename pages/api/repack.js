import JSZip from "jszip";

const ALLOWED_HOSTS = new Set([
  "github.com",
  "codeload.github.com",
  "raw.githubusercontent.com"
]);

function sanitizeName(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim() || "skill";
}

function getSafeFileName(value) {
  return sanitizeName(value) || "skill";
}

function getRepoZipUrl(repoUrl, ref = "HEAD") {
  if (!repoUrl) {
    return "";
  }
  const match = String(repoUrl).match(/github\.com[:/](.+?)\/(.+?)(?:\.git|\/|$)/i);
  if (!match) {
    return "";
  }
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  if (!owner || !repo) {
    return "";
  }
  const safeRef = encodeURIComponent(ref || "HEAD");
  return `https://codeload.github.com/${owner}/${repo}/zip/${safeRef}`;
}

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch (error) {
    return false;
  }
}

function normalizeSkillPath(skillPath) {
  return String(skillPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function extractRelativePath(path, skillPath) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  if (!skillPath) {
    return normalizedPath;
  }
  const normalizedSkill = normalizeSkillPath(skillPath);
  if (!normalizedSkill) {
    return normalizedPath;
  }
  const directPrefix = `${normalizedSkill}/`;
  if (normalizedPath.startsWith(directPrefix)) {
    return normalizedPath.slice(directPrefix.length);
  }
  const marker = `/${normalizedSkill}/`;
  const index = normalizedPath.indexOf(marker);
  if (index !== -1) {
    return normalizedPath.slice(index + marker.length);
  }
  return null;
}

function getCommonPrefix(paths) {
  const segments = paths
    .map((path) => path.split("/").filter(Boolean))
    .filter((items) => items.length > 0);
  if (!segments.length) {
    return "";
  }
  const first = segments[0][0];
  const allSame = segments.every((items) => items[0] === first);
  return allSame ? `${first}/` : "";
}

function removePrefix(path, prefix) {
  if (!prefix) {
    return path;
  }
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

async function loadZip(url) {
  if (!isAllowedUrl(url)) {
    throw new Error("不支持的下载地址");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("下载失败");
  }
  const buffer = await response.arrayBuffer();
  try {
    return await JSZip.loadAsync(buffer);
  } catch (error) {
    throw new Error("下载地址不是 zip");
  }
}

async function fetchZip({ url, repoUrl, repoRef }) {
  if (url) {
    try {
      return await loadZip(url);
    } catch (error) {
      if (repoUrl) {
        const repoZip = getRepoZipUrl(repoUrl, repoRef);
        if (repoZip) {
          return await loadZip(repoZip);
        }
      }
      throw error;
    }
  }
  if (repoUrl) {
    const repoZip = getRepoZipUrl(repoUrl, repoRef);
    if (repoZip) {
      return await loadZip(repoZip);
    }
  }
  throw new Error("缺少下载地址");
}

function buildOutputZip({ zip, skillPath, folderName }) {
  const files = Object.values(zip.files).filter((file) => !file.dir);
  if (!files.length) {
    throw new Error("压缩包为空");
  }
  const normalizedSkillPath = normalizeSkillPath(skillPath);
  const selected = [];
  if (normalizedSkillPath) {
    for (const file of files) {
      const relative = extractRelativePath(file.name, normalizedSkillPath);
      if (relative) {
        selected.push({ file, relative });
      }
    }
  }

  const targetFiles = selected.length
    ? selected
    : files.map((file) => ({ file, relative: file.name }));

  const prefix = selected.length
    ? ""
    : getCommonPrefix(targetFiles.map((item) => item.relative));

  const output = new JSZip();
  const root = output.folder(folderName);

  targetFiles.forEach((entry) => {
    const relative = removePrefix(entry.relative, prefix);
    if (!relative) {
      return;
    }
    root.file(relative, entry.file.async("uint8array"));
  });

  return output;
}

function getQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}

function parseDownloadDirectoryUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "download-directory.github.io") {
      return null;
    }
    const inner = url.searchParams.get("url");
    if (!inner) {
      return null;
    }
    const innerUrl = new URL(inner);
    if (innerUrl.hostname !== "github.com") {
      return null;
    }
    const segments = innerUrl.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      return null;
    }
    const [owner, repo, marker, ref, ...rest] = segments;
    if (marker !== "tree" || !ref) {
      return {
        repoUrl: `https://github.com/${owner}/${repo}`,
        skillPath: "",
        ref: "HEAD"
      };
    }
    return {
      repoUrl: `https://github.com/${owner}/${repo}`,
      skillPath: rest.join("/"),
      ref
    };
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    let url = getQueryValue(req.query.url);
    let repo = getQueryValue(req.query.repo);
    let skillPath = getQueryValue(req.query.skillPath);
    const name = getQueryValue(req.query.name);
    let repoRef = "";
    if (url) {
      const parsed = parseDownloadDirectoryUrl(url);
      if (parsed) {
        repo = repo || parsed.repoUrl;
        repoRef = parsed.ref || repoRef;
        if (!skillPath && parsed.skillPath) {
          skillPath = parsed.skillPath;
        }
        url = "";
      }
    }
    const zip = await fetchZip({ url, repoUrl: repo, repoRef });
    const folderName = getSafeFileName(name || skillPath || "skill");
    const output = buildOutputZip({
      zip,
      skillPath,
      folderName
    });
    const buffer = await output.generateAsync({ type: "nodebuffer" });
    const filename = `${folderName}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.status(200).send(buffer);
  } catch (error) {
    res.status(400).send(error?.message || "打包失败");
  }
}

export const config = {
  api: {
    responseLimit: false
  }
};
