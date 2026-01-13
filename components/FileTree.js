import { getStrings, useLanguage } from "../lib/i18n";

function cleanLine(line) {
  return line.replace(/^[\s│├└─|+]+/, "").trim();
}

function getIndentDepth(line) {
  let count = 0;
  for (const char of line) {
    if (char === " " || char === "\t" || char === "│" || char === "├" || char === "└" || char === "─" || char === "|" || char === "+") {
      count += 1;
    } else {
      break;
    }
  }
  return Math.floor(count / 2);
}

function buildTreeFromIndentedLines(lines) {
  const root = { name: "root", children: [], type: "dir" };
  const stack = [{ depth: -1, node: root }];

  lines.forEach((line) => {
    const nameRaw = cleanLine(line);
    if (!nameRaw) {
      return;
    }
    const depth = getIndentDepth(line);
    const isDir = nameRaw.endsWith("/");
    const name = isDir ? nameRaw.slice(0, -1) : nameRaw;

    while (stack.length && depth <= stack[stack.length - 1].depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    const node = { name, children: [], type: isDir ? "dir" : "file" };
    parent.children.push(node);
    if (isDir) {
      stack.push({ depth, node });
    }
  });

  return root;
}

function buildTreeFromPaths(lines) {
  const root = { name: "root", children: [], type: "dir" };
  lines.forEach((line) => {
    const cleaned = cleanLine(line);
    if (!cleaned) {
      return;
    }
    const isDir = cleaned.endsWith("/");
    const path = isDir ? cleaned.slice(0, -1) : cleaned;
    const parts = path.split("/").filter(Boolean);
    let current = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      let child = current.children.find((item) => item.name === part);
      if (!child) {
        child = { name: part, children: [], type: isLeaf && !isDir ? "file" : "dir" };
        current.children.push(child);
      }
      current = child;
    });
  });
  return root;
}

function buildTree(fileTree) {
  if (!fileTree) {
    return null;
  }
  const lines = fileTree.split("\n").map((line) => line.trimEnd());
  const filtered = lines.filter((line) => line.trim());
  if (!filtered.length) {
    return null;
  }
  const hasIndent = filtered.some((line) => /^[\s│├└─|+]+/.test(line));
  return hasIndent ? buildTreeFromIndentedLines(filtered) : buildTreeFromPaths(filtered);
}

function TreeNode({ node }) {
  if (!node) {
    return null;
  }
  if (node.type === "file" || node.children.length === 0) {
    return <div>{node.name}</div>;
  }
  return (
    <details open>
      <summary>{node.name}</summary>
      <div className="tree-item">
        {node.children.map((child, index) => (
          <TreeNode key={`${node.name}-${child.name}-${index}`} node={child} />
        ))}
      </div>
    </details>
  );
}

export default function FileTree({ fileTree }) {
  const { language } = useLanguage();
  const strings = getStrings(language);
  const tree = buildTree(fileTree);
  if (!tree) {
    return <div className="tree">{strings.noFileTree}</div>;
  }
  return (
    <div className="tree">
      {tree.children.map((child, index) => (
        <TreeNode key={`${child.name}-${index}`} node={child} />
      ))}
    </div>
  );
}
