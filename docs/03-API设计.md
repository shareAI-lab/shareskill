# ShareSkill API 设计

## 一、概述

ShareSkill 提供两层服务：
1. **Web 服务 (shareskill.run)**：提供 API 供搜索、展示、资源分发
2. **本地 MCP Server (npx shareskill)**：运行在用户机器上，管理本地安装的 skills

```
┌─────────────────────────────────────────────────────────────┐
│  Web 服务 (shareskill.run)                                  │
│  ─────────────────────────                                  │
│  职责: 搜索、展示、提供 API、存储资源文件                    │
│  不负责: 管理用户安装状态                                   │
├─────────────────────────────────────────────────────────────┤
│  本地 MCP Server (npx shareskill)                           │
│  ────────────────────────────────                           │
│  职责: 调用 Web API、管理本地安装的 skills                  │
│  存储位置: ~/.shareskill/skills/                            │
└─────────────────────────────────────────────────────────────┘
```

## 二、Web API

Base URL: `https://shareskill.run/api`

### 2.1 搜索 Skills

**GET /api/search**

混合搜索：语义搜索（70%）+ 全文搜索（30%）

| 参数 | 类型 | 必填 | 说明 |
|-----|-----|-----|-----|
| q | string | 是 | 搜索词 |
| category | string | 否 | 分类筛选 |
| limit | number | 否 | 数量，默认 20，最大 50 |
| page | number | 否 | 页码，默认 1 |

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 123,
        "skill_key": "anthropics/skills:skills/frontend-design",
        "skill_slug": "frontend-design",
        "name": "frontend-design",
        "tagline": "Create distinctive frontend interfaces with high design quality",
        "description": "...",
        "category": "design",
        "tags": ["react", "css", "ui"],
        "key_features": ["Production-grade code", "Bold aesthetic"],
        "repo_full_name": "anthropics/skills",
        "repo_url": "https://github.com/anthropics/skills",
        "repo_stars": 1247,
        "repo_pushed_at": "2025-01-15T10:00:00Z",
        "security_warnings_count": 0,
        "similarity": 0.89
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "total_pages": 8
    }
  }
}
```

### 2.2 Skill 详情

**GET /api/skill/:slug**

| 参数 | 类型 | 说明 |
|-----|-----|-----|
| slug | string | skill_slug |

```json
{
  "success": true,
  "data": {
    "id": 123,
    "skill_key": "anthropics/skills:skills/frontend-design",
    "skill_slug": "frontend-design",
    "repo_full_name": "anthropics/skills",
    "skill_path": "skills/frontend-design",

    "name": "frontend-design",
    "description": "Create distinctive frontend interfaces...",
    "license": "Apache-2.0",
    "compatibility": "Designed for Claude Code",
    "allowed_tools": ["Bash", "Read", "Write"],

    "tagline": "Create distinctive frontend interfaces with high design quality",
    "category": "design",
    "tags": ["react", "css", "ui", "design-system"],
    "key_features": ["Production-grade code", "Bold aesthetic direction"],
    "tech_stack": ["React", "Vue", "Tailwind"],

    "file_tree": [
      {"path": "SKILL.md", "type": "file", "size": 12345},
      {"path": "references/", "type": "dir"}
    ],
    "has_scripts": false,
    "has_references": true,
    "script_count": 0,
    "total_files": 5,

    "security_warnings": [],

    "repo_url": "https://github.com/anthropics/skills",
    "repo_stars": 1247,
    "download_url": "https://github.com/anthropics/skills/blob/main/skills/frontend-design",
    "skill_updated_at": "2025-01-15T10:00:00Z",

    "skill_md_content": "---\nname: frontend-design\n...",

    "related": [...],
    "same_repo": [...]
  }
}
```

### 2.3 获取资源文件

**GET /api/skill/:slug/resource/:path**

获取 skill 中的指定资源文件（script、reference、asset）。

| 参数 | 类型 | 说明 |
|-----|-----|-----|
| slug | string | skill_slug |
| path | string | 资源相对路径，如 `scripts/extract.py` |

**处理逻辑**：

```
1. 查 Supabase Storage 缓存
   ↓ 命中 → 返回内容
   ↓ 未命中
2. 从 GitHub raw 拉取
   ↓
3. 写入 Storage 缓存（异步，不阻塞返回）
   ↓
4. 返回内容
```

**返回**：直接返回文件内容，Content-Type 根据文件类型设置。

### 2.4 获取完整 Package

**GET /api/skill/:slug/package**

供本地 MCP Server 下载安装使用，返回完整 skill 文件包。

```json
{
  "success": true,
  "data": {
    "skill_key": "anthropics/skills:skills/pdf",
    "name": "pdf",
    "version": "2025-01-15T10:00:00Z",
    "files": [
      {"path": "SKILL.md", "content": "---\nname: pdf\n..."},
      {"path": "scripts/extract.py", "content": "#!/usr/bin/env python3\n..."},
      {"path": "scripts/merge.py", "content": "..."},
      {"path": "references/API.md", "content": "..."}
    ]
  }
}
```

**处理逻辑**：

```
1. 遍历 file_tree 中所有文件
2. 对每个文件:
   - 查 Storage 缓存 → 命中则返回
   - 未命中 → GitHub 拉取 → 热缓存 → 返回
3. 汇总所有文件返回
```

### 2.5 下载 ZIP

**GET /api/skill/:slug/download**

供 Web 用户点击下载，返回 ZIP 文件。

**返回**：
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="{slug}.zip"`

### 2.6 分类列表

**GET /api/categories**

```json
{
  "success": true,
  "data": {
    "categories": [
      {"key": "frontend", "label": "Frontend", "hint": "Web UI, React, Vue", "count": 456},
      {"key": "backend", "label": "Backend", "hint": "APIs, databases", "count": 389}
    ]
  }
}
```

### 2.7 统计摘要

**GET /api/summary**

```json
{
  "success": true,
  "data": {
    "total_count": 3613,
    "by_category": {
      "frontend": 456,
      "backend": 389
    },
    "top_tags": [
      {"tag": "react", "count": 234},
      {"tag": "typescript", "count": 198}
    ],
    "computed_at": "2025-01-17T12:00:00Z"
  }
}
```

### 2.8 记录事件

**POST /api/events**

```json
{
  "skill_id": 123,
  "event_type": "view",
  "source": "web"
}
```

### 2.9 记录搜索

**POST /api/search-log**

```json
{
  "query": "pdf form",
  "results_count": 15,
  "top_results": [123, 456, 789]
}
```

## 三、资源文件存储策略

### 3.1 设计决策

| 决策点 | 决策 | 理由 |
|--------|------|------|
| **存储位置** | Supabase Storage | 已集成，Cloudflare CDN 全球加速 |
| **存储策略** | 冷热分离 | 平衡存储成本和访问速度 |
| **极限容量** | ~100,000 skills | 排除二进制后，8GB 额度足够 |

### 3.2 冷热分离策略

**预缓存（Pipeline 阶段存储）**：

代码和文档类文件，Agent 最常用：

```
.md, .ts, .js, .mjs, .cjs, .tsx, .jsx,
.py, .json, .yaml, .yml, .sh, .sql, .txt,
.xml, .html, .css, .scss, .less
```

预估大小：~250 MB（当前 3,613 skills）

**按需热缓存（首次请求时存储）**：

二进制和大文件，很少被请求：

```
.ttf, .woff, .woff2, .eot,     # 字体
.png, .jpg, .jpeg, .gif, .svg, # 图片
.mp4, .mp3, .wav,              # 媒体
.pptx, .xlsx, .docx, .pdf,     # Office 文档
.pyc, .pyo, .class,            # 编译产物
.map, .coverage                 # 开发产物
```

### 3.3 获取资源流程

```
get_skill_resource(slug, path)
              │
              ▼
      ┌───────────────┐
      │ Storage 查找   │
      └───────┬───────┘
              │
         存在?
        /     \
      Yes      No
       │        │
       ▼        ▼
    返回内容   GitHub 拉取
                │
                ▼
            写入 Storage（异步热缓存）
                │
                ▼
             返回内容
```

### 3.4 安装/下载流程

```
get_package / download
        │
        ▼
遍历 file_tree 所有文件
        │
        ▼
┌─────────────────────────────┐
│  对每个文件并发处理:         │
│  1. 查 Storage              │
│  2. 没有 → GitHub 拉取      │
│  3. 热缓存写入 Storage      │
└─────────────────────────────┘
        │
        ▼
汇总返回 (JSON 或 ZIP)
```

### 3.5 中国用户体验

| 资源类型 | 来源 | 体验 |
|----------|------|------|
| 代码/文档 | Supabase Storage (Cloudflare CDN) | 秒返回 |
| 二进制（首次） | GitHub → 热缓存 | 可能稍慢 |
| 二进制（之后） | Storage 缓存 | 秒返回 |
| GitHub 不可用 | 返回 GitHub raw URL | Agent 在 client 端重试 |

### 3.6 存储容量估算

| 指标 | 数值 |
|------|------|
| 当前 skills | 3,613 |
| 每 skill 平均存储（排除二进制） | ~70 KB |
| 当前总存储 | ~250 MB |
| Supabase Pro 额度 | 8 GB |
| 可存储 skills 数 | ~100,000 |

## 四、MCP 设计理念

### 4.1 核心洞察：Skills 是「即时知识」而非「必须安装的软件」

Agent Skills 规范的核心设计是 **Progressive Disclosure（渐进式披露）**：

```
Tier 1: Metadata (~100 tokens)  -> 始终在上下文中，用于判断相关性
Tier 2: Instructions (<5000 tokens) -> 激活时加载，包含完整工作流程
Tier 3: Resources (on-demand) -> 按需加载，引用文档/脚本/资产
```

这意味着：
- **Skill 的核心价值是 SKILL.md 中的知识和指令**
- **大多数情况下，Agent 只需要「知道怎么做」即可开始工作**
- **安装只是为了持久化，方便后续复用，不是使用的前提**

### 4.2 MCP 设计原则

1. **Knowledge-First（知识优先）**
   - `remote_get_skill` 返回完整 SKILL.md，Agent 立即可用
   - 安装是可选的持久化操作，不是必要步骤

2. **Agent-Guided Decision（Agent 引导决策）**
   - MCP 返回足够信息让 Agent 判断
   - 明确提示 Agent 可以直接使用还是需要安装

3. **Progressive Resource Loading（渐进式资源加载）**
   - 默认只返回 SKILL.md + 文件树大纲
   - scripts/references/assets 按需单独获取

4. **User-Centric Workflow（用户中心工作流）**
   - 鼓励 Agent 询问用户意向
   - 「直接开始工作」vs「安装后再开始」

### 4.3 命名规范

**前缀区分**：
- `remote_*`：需要网络，调用 Web API
- `local_*`：无需网络，操作本地文件

**命名结构**：`动词_对象`，完整语义，Agent 一眼就知道做什么。

## 五、MCP Tools

### 5.1 工具总览

| Tool | 网络 | 说明 |
|------|:----:|------|
| `remote_search_skills` | Yes | 搜索在线 skills |
| `remote_get_skill` | Yes | 获取 skill 完整详情，可直接使用 |
| `remote_get_skill_resource` | Yes | 获取 skill 资源文件 |
| `remote_download_skill` | Yes | 下载安装到本地 |
| `local_list_skills` | No | 列出已安装 |
| `local_get_skill` | No | 读取已安装 skill |
| `local_get_skill_resource` | No | 读取已安装资源文件 |
| `local_remove_skill` | No | 卸载 |

### 5.2 remote_search_skills

搜索在线 Skills，返回简洁列表。

```json
{
  "name": "remote_search_skills",
  "description": "Search for Agent Skills online to help with the current task. Returns a list of matching skills with basic info. After finding a relevant skill, use remote_get_skill to get the full instructions.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query describing what you need help with"
      },
      "category": {
        "type": "string",
        "description": "Filter by category (optional)"
      },
      "limit": {
        "type": "number",
        "description": "Max results (default: 5, max: 10)",
        "default": 5
      }
    },
    "required": ["query"]
  }
}
```

**返回格式**：

```
Found 3 skills for "pdf table extraction":

1. **pdf** (anthropics/skills) - 1,247 stars
   The go-to skill for PDF operations: extraction, form filling, merging
   Category: data | Tags: pdf, extraction, forms

2. **pdf-table-extractor** (acme/tools) - 456 stars
   Specialized table extraction from PDFs with structure preservation
   Category: data | Tags: pdf, tables, data-extraction

3. **document-ocr** (vision/tools) - 234 stars
   OCR for scanned documents and images
   Category: data | Tags: ocr, pdf, image

---
Next steps:
- remote_get_skill(skill_key) - Get full skill instructions (can start working immediately)
- remote_download_skill(skill_key) - Download to local for future reuse (optional)
```

### 5.3 remote_get_skill

**核心 Tool**：获取 Skill 完整内容，Agent 可立即使用。

```json
{
  "name": "remote_get_skill",
  "description": "Get complete skill details including full SKILL.md content. After calling this, you have all the knowledge needed to help the user - you can start working immediately without downloading. Download is optional and only needed if the user wants to save this skill for future offline reuse.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "skill_key": {
        "type": "string",
        "description": "Skill key from search results"
      }
    },
    "required": ["skill_key"]
  }
}
```

**返回格式**：

```
# pdf (anthropics/skills)

## Overview
The go-to skill for PDF operations: extraction, form filling, merging, conversion.

## Metadata
- **Category**: data
- **License**: Apache-2.0
- **Compatibility**: Claude Code, Cursor, Codex
- **Stars**: 1,247 | Updated: 2 days ago

## Security
No security warnings.

## Package Contents
```
pdf/
├── SKILL.md (15.2 KB)
├── scripts/
│   ├── extract.py
│   ├── fill_form.py
│   └── merge.py
└── references/
    └── API_REFERENCE.md
```

## SKILL.md Content
---
name: pdf
description: Comprehensive PDF processing skill...
---

# PDF Processing Skill

## When to Use
- User mentions PDF files or documents
- Need to extract text, tables, or data from PDFs
...

[Full SKILL.md content continues]

---

## What's Next?

You now have all the knowledge from this skill. You can:

1. **Start working immediately** - Use the instructions above to help the user
2. **Ask the user** - "I found a skill that can help. Should I start working now,
   or would you like me to download it locally for future reuse?"

If the user wants to download for reuse:
- remote_download_skill("anthropics/skills:skills/pdf")

To get additional resource files (if needed during work):
- remote_get_skill_resource("anthropics/skills:skills/pdf", "scripts/extract.py")
```

### 5.4 remote_get_skill_resource

按需获取 Skill 中的特定资源文件。

```json
{
  "name": "remote_get_skill_resource",
  "description": "Get a specific resource file from an online skill package (script, reference doc, or asset). Use this when following skill instructions that reference additional files.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "skill_key": {
        "type": "string",
        "description": "Skill key"
      },
      "resource_path": {
        "type": "string",
        "description": "Relative path to resource (e.g., 'scripts/extract.py', 'references/API.md')"
      }
    },
    "required": ["skill_key", "resource_path"]
  }
}
```

**返回格式**：直接返回文件内容。

```python
#!/usr/bin/env python3
"""PDF text extraction script."""

import sys
from pdfplumber import open as open_pdf

def extract_text(pdf_path: str) -> str:
    ...
```

### 5.5 remote_download_skill

下载 Skill 到本地（持久化，便于复用）。

```json
{
  "name": "remote_download_skill",
  "description": "Download a skill to local storage for future offline reuse. This downloads all skill files to ~/.shareskill/skills/. Only needed if user wants persistent access - you can use skill knowledge immediately after remote_get_skill without downloading.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "skill_key": {
        "type": "string",
        "description": "Skill key to download"
      },
      "confirm_security": {
        "type": "boolean",
        "description": "Confirm download despite security warnings",
        "default": false
      }
    },
    "required": ["skill_key"]
  }
}
```

**返回格式（成功）**：

```
Downloaded "pdf" successfully!

Location: ~/.shareskill/skills/pdf/
Files: SKILL.md, scripts/extract.py, scripts/fill_form.py, scripts/merge.py, references/API_REFERENCE.md

This skill is now available offline. You can:
- Use local_list_skills() to see all downloaded skills
- Use local_get_skill("pdf") to load it in future sessions without network
- The skill will be available for offline use

Note: You already have the skill knowledge from remote_get_skill - you can continue working!
```

**返回格式（有安全警告）**：

```
Security warnings found for "risky-skill":

HIGH: scripts/install.sh:15
  Uses sudo: `sudo chmod 777 /etc/config`

MEDIUM: SKILL.md:89
  Accesses environment variables containing potential secrets

Review these warnings carefully. To download anyway:
remote_download_skill("owner/repo:path", confirm_security=true)
```

### 5.6 local_list_skills

列出已下载到本地的 Skills。

```json
{
  "name": "local_list_skills",
  "description": "List all locally downloaded skills. These are skills previously downloaded for offline reuse.",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

**返回格式**：

```
Downloaded skills (3):

1. **pdf** - The go-to skill for PDF operations
   Location: ~/.shareskill/skills/pdf/

2. **frontend-design** - Create distinctive frontend interfaces
   Location: ~/.shareskill/skills/frontend-design/

3. **git-workflow** - Git commit and branch management
   Location: ~/.shareskill/skills/git-workflow/

Use local_get_skill(name) to load a skill's full content.
```

### 5.7 local_get_skill

获取已下载 Skill 的完整内容（无需网络）。

```json
{
  "name": "local_get_skill",
  "description": "Load a downloaded skill's SKILL.md content from local storage. Use this when you need to work with a previously downloaded skill - no network required.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Skill name (folder name in ~/.shareskill/skills/)"
      }
    },
    "required": ["name"]
  }
}
```

**返回格式**：SKILL.md 完整内容 + 可用资源文件列表。

### 5.8 local_get_skill_resource

读取已下载 Skill 的资源文件（无需网络）。

```json
{
  "name": "local_get_skill_resource",
  "description": "Read a resource file from a downloaded skill. No network required.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Skill name"
      },
      "resource_path": {
        "type": "string",
        "description": "Relative path to resource"
      }
    },
    "required": ["name", "resource_path"]
  }
}
```

### 5.9 local_remove_skill

删除已下载的 Skill。

```json
{
  "name": "local_remove_skill",
  "description": "Remove a downloaded skill from local storage.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Skill name to remove"
      }
    },
    "required": ["name"]
  }
}
```

## 六、Agent 工作流示例

### 6.1 典型流程：搜索 → 获取 → 直接使用

```
User: "帮我从这个 PDF 里提取表格数据"

Agent: (检测到需要 PDF 处理能力)
       → remote_search_skills(query="pdf table extraction")

MCP: Found 3 skills for "pdf table extraction":
     1. pdf (anthropics/skills) - 1,247 stars
        The go-to skill for PDF operations
     ...

Agent: (判断 pdf 最合适)
       → remote_get_skill(skill_key="anthropics/skills:skills/pdf")

MCP: [返回完整 SKILL.md 内容和文件树]

Agent: "我找到了一个 PDF 处理技能，已经了解了提取表格的方法。
        我可以直接开始帮你提取，或者你希望我先把这个技能下载到本地
        以便将来离线快速复用？"

User: "直接开始吧"

Agent: (使用 SKILL.md 中的知识执行任务)
       "好的，根据技能指引，我来提取表格..."
       → [按照 SKILL.md 中的指令操作]
```

### 6.2 需要资源文件的流程

```
Agent: (执行过程中发现需要脚本)
       "根据技能说明，需要使用 extract.py 脚本来处理复杂表格..."
       → remote_get_skill_resource("anthropics/skills:skills/pdf", "scripts/extract.py")

MCP: [返回 extract.py 内容]

Agent: (使用脚本内容)
       → Bash: python3 -c "..." 或保存后执行
```

### 6.3 优先使用本地已下载的流程

```
User: "帮我处理另一个 PDF"

Agent: → local_list_skills()

MCP: Downloaded skills (1):
     1. pdf - The go-to skill for PDF operations

Agent: → local_get_skill("pdf")

MCP: [返回本地 SKILL.md 内容]

Agent: (无需联网，直接使用本地知识)
       "我本地已经有 PDF 处理技能，直接开始工作..."
```

### 6.4 完整决策流程图

```
用户提出需求
      │
      ▼
┌─────────────────┐
│ local_list_skills │  ← 先查本地
└────────┬────────┘
         │
    有相关 skill?
      /        \
    Yes         No
     │           │
     ▼           ▼
local_get_skill  remote_search_skills
     │                │
     ▼                ▼
 直接使用        remote_get_skill
                      │
                      ▼
                 Agent 获得知识
                 开始工作
                      │
                      ▼
                 工作完成后
                 "是否下载以便离线复用?"
                      │
                     Yes
                      │
                      ▼
                 remote_download_skill
```

## 七、设计决策说明

### 7.1 为什么 remote_get_skill 返回完整 SKILL.md？

1. **符合 Agent Skills 规范的 Progressive Disclosure 设计**
   - SKILL.md body 是 Tier 2，激活时应完整加载
   - 包含 Agent 完成任务所需的全部指令

2. **减少 Agent 的决策负担**
   - 获取详情后立即可用，无需额外步骤
   - 下载变成可选的「锦上添花」

3. **更好的用户体验**
   - 用户说「提取 PDF」，Agent 几秒内就能开始工作
   - 不需要等待下载、确认等繁琐步骤

### 7.2 为什么资源文件单独获取？

1. **避免上下文膨胀**
   - 一个 Skill 可能有多个脚本和引用文档
   - 一次性返回所有内容会浪费 tokens

2. **按需加载更高效**
   - Agent 可能只需要 SKILL.md 就能完成任务
   - 只有指令中明确需要时才获取资源

3. **符合 Tier 3 设计**
   - scripts/references/assets 是「on-demand」资源
   - Agent 根据工作需要决定是否加载

### 7.3 为什么用 remote/local 前缀？

1. **清晰区分网络依赖**
   - Agent 一眼就知道是否需要网络
   - 离线场景下只用 `local_*` 工具

2. **语义完整自描述**
   - `remote_download_skill` 比 `install_skill` 更准确
   - 动作是「从远程下载」，不是「安装软件」

3. **减少 Agent 困惑**
   - 没有歧义，不需要猜测
   - 工具名本身就是使用说明

### 7.4 下载的价值

下载不是必须的，但有其价值：

1. **离线可用** - 不需要每次联网查询
2. **更快加载** - 本地读取比 API 更快
3. **版本锁定** - 保存当前版本，不受更新影响
4. **网络不稳定时** - 中国用户的备用方案

## 八、本地 MCP Server 数据结构

### 8.1 目录结构

```
~/.shareskill/
├── config.json              # 配置文件
└── skills/                  # 已下载的 skills
    ├── pdf/
    │   ├── SKILL.md
    │   ├── scripts/
    │   │   ├── extract.py
    │   │   └── merge.py
    │   └── references/
    │       └── API.md
    └── frontend-design/
        ├── SKILL.md
        └── references/
            └── examples.md
```

### 8.2 config.json

```json
{
  "api_base": "https://shareskill.run/api",
  "cache_ttl": 86400,
  "downloaded_at": {
    "pdf": "2025-01-15T10:00:00Z",
    "frontend-design": "2025-01-14T08:30:00Z"
  }
}
```

## 九、Admin API

见 [06-后台管理.md](./06-后台管理.md) 中的 API 接口部分。

## 十、错误处理

### HTTP 状态码

| Code | 说明 |
|------|-----|
| 400 | 参数错误 |
| 401 | 未认证（Admin API） |
| 403 | 无权限（Admin API） |
| 404 | 资源不存在 |
| 429 | 限流 |
| 500 | 服务器错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "SKILL_NOT_FOUND",
    "message": "Skill 'nonexistent/skill:path' not found"
  }
}
```

### 常见错误码

| Code | 说明 |
|-----|-----|
| INVALID_QUERY | 缺少或无效的查询参数 |
| SKILL_NOT_FOUND | Skill 不存在 |
| RESOURCE_NOT_FOUND | 资源文件不存在 |
| DOWNLOAD_FAILED | 下载失败 |
| SECURITY_WARNING | 有安全警告需确认 |
| RATE_LIMITED | 请求过于频繁 |
| GITHUB_UNAVAILABLE | GitHub 资源暂时不可用 |

### GitHub 不可用时的处理

```json
{
  "success": false,
  "error": {
    "code": "GITHUB_UNAVAILABLE",
    "message": "Failed to fetch resource from GitHub",
    "fallback_url": "https://raw.githubusercontent.com/owner/repo/HEAD/path/to/file"
  }
}
```

Agent 可使用 `fallback_url` 在 client 端重试。

## 十一、限流

| 接口类型 | 限制 |
|---------|-----|
| Web API (search) | 60 req/min/IP |
| Web API (detail) | 120 req/min/IP |
| Web API (resource) | 200 req/min/IP |
| Web API (package) | 30 req/min/IP |
| Web API (events) | 300 req/min/IP |
| MCP Tools | 通过 Web API，受上述限制 |
| Admin API | 需认证，无限流 |
