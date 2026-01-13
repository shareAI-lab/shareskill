"""
Stage2 maintenance: sync skills from GitHub and write to Postgres.
"""
import asyncio
import json
import concurrent.futures
import os
import re
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import aiohttp
import psycopg2
from dotenv import load_dotenv

import config

GITHUB_TOKEN = getattr(config, "GITHUB_TOKEN", "")
DEFAULT_BRANCH = "main"
START_PUSHED_DATE = "2026-01-06"
GRAPHQL_URL = "https://api.github.com/graphql"
GRAPHQL_BATCH_SIZE = 50
TEMP_CLONE_ROOT = "temp_skill_projects"
LLM_MAX_CONCURRENT = getattr(config, "LLM_MAX_CONCURRENT", 60)
SKILL_MD_TRANSLATION_MAX_CHARS = getattr(
    config, "SKILL_MD_TRANSLATION_MAX_CHARS", 90000
)
SKILL_MD_TRANSLATION_CHUNK_CHARS = getattr(
    config, "SKILL_MD_TRANSLATION_CHUNK_CHARS", 8000
)
TAGLINE_ZH_MAX_CHARS = getattr(config, "TAGLINE_ZH_MAX_CHARS", 25)
TAGLINE_EN_MAX_WORDS = getattr(config, "TAGLINE_EN_MAX_WORDS", 16)
VALIDATION_MAX_CONCURRENT = getattr(
    config, "VALIDATION_MAX_CONCURRENT", LLM_MAX_CONCURRENT
)
VALIDATION_TASK_TIMEOUT = getattr(config, "VALIDATION_TASK_TIMEOUT", 300)
SKILL_MD_MAX_BYTES = getattr(config, "SKILL_MD_MAX_BYTES", 90000)
SUBSTEP_TIMEOUT = getattr(config, "SUBSTEP_TIMEOUT", 300)
SKILL_MD_TOO_LARGE_NOTICE = "本skill内容体过大，请阅读原文"
DESC_EN_TOO_LARGE = "This skill.md too large, please read SKILL.md."
DESC_ZH_TOO_LARGE = "本SKILL.md过大分析失败，请自行阅读SKILL.md了解详情"
USE_CASE_ZH_TOO_LARGE = "本SKILL.md过大分析失败，请自行阅读SKILL.md了解使用场景"
USE_CASE_EN_TOO_LARGE = "SKILL.md too large to analyze; please read it for use cases."
REPO_SIZE_FULL_CLONE_MAX_KB = getattr(config, "REPO_SIZE_FULL_CLONE_MAX_KB", 80000)
SKILL_ENTRY_WORKERS = getattr(config, "SKILL_ENTRY_WORKERS", 6)
REPO_CONCURRENT = getattr(config, "REPO_CONCURRENT", 3)
REPO_REQUEST_INTERVAL = float(getattr(config, "REPO_REQUEST_INTERVAL", 0.2))
SKILLPATH_FIX_CONCURRENT = getattr(config, "SKILLPATH_FIX_CONCURRENT", 2)
MAX_SKILLS_PER_REPO = getattr(config, "MAX_SKILLS_PER_REPO", 100)
ANALYSIS_MAX_CHARS = getattr(config, "ANALYSIS_MAX_CHARS", 8000)
MAX_RETRIES = getattr(config, "MAX_RETRIES", 3)
RETRY_DELAY = getattr(config, "RETRY_DELAY", 5)
DESCRIPTION_TASK_TIMEOUT = getattr(config, "DESCRIPTION_TASK_TIMEOUT", 300)
ANALYSIS_TASK_TIMEOUT = getattr(config, "ANALYSIS_TASK_TIMEOUT", 300)
TRANSLATION_TASK_TIMEOUT = getattr(config, "TRANSLATION_TASK_TIMEOUT", 300)
PG_COMMIT_EVERY = getattr(config, "PG_COMMIT_EVERY", 200)
PG_SCHEMA = os.getenv("PG_SCHEMA", "public")
VERIFY_DB_WRITE = os.getenv("VERIFY_DB_WRITE", "0") == "1"
VERIFY_LOG_MAX_LEN = getattr(config, "VERIFY_LOG_MAX_LEN", 200)
LLM_MAX_RETRIES = min(int(MAX_RETRIES), 3)
LLM_REQUEST_INTERVAL = float(getattr(config, "LLM_REQUEST_INTERVAL", 0.2))
LOG_CLEARED_OUTPUTS = os.getenv("LOG_CLEARED_OUTPUTS", "0") == "1"
LOG_CLEARED_OUTPUTS_LIMIT = int(getattr(config, "LOG_CLEARED_OUTPUTS_LIMIT", 200))

_llm_rate_lock = asyncio.Lock()
_llm_last_call = {"ts": 0.0}

CATEGORY_TAG_HINTS = {
    "信息获取与检索": "搜索、抓取、爬虫、文档解析、网页解析、数据库查询、知识库检索、RAG、问答、研究调查、事实核验",
    "规划与推理": "任务拆解、路线选择、决策支持、优先级排序、资源评估、风险预案、约束求解、策略优化",
    "工具与系统操作": "CLI/脚本、文件管理、API 调用、系统配置、环境搭建、自动化执行、任务调度、权限操作",
    "代码与工程化": "生成/改造代码、重构、测试、构建与发布、CI/CD、依赖管理、性能优化、代码审查",
    "内容与沟通": "写作、总结、翻译、会议纪要、简报、提案、邮件/消息、FAQ/客服话术",
    "数据处理与分析": "清洗、统计、可视化、报表、ETL、特征工程、异常检测、预测分析",
    "业务流程与自动化": "RPA、工单、审批、流程编排、SOP 执行、跨系统协同、任务分派",
    "监控与运维": "告警处理、巡检、故障排查、日志分析、容量规划、回滚与恢复",
    "评估与质量": "校验、审查、风险评估、数据质量、内容质量、指标验收、合规检查",
    "多模态/媒体处理": "图片、音视频、OCR、ASR、TTS、字幕、图像增强、视频剪辑",
    "安全与合规": "权限、脱敏、风控、审计、密钥管理、漏洞扫描、合规报告",
    "集成与连接器": "第三方 SaaS、Webhook、数据同步、消息队列、SDK/插件、单点登录",
    "评测与基准": "A/B、benchmark、质量度量、回归测试、标注与验收",
    "领域专用": "法务/医疗/金融等、教育、人力、供应链、营销",
    "其他": "未分类/探索中",
}
CATEGORY_NAMES = list(CATEGORY_TAG_HINTS.keys())

BASE_FILTERS = "fork:false archived:false stars:>=1"
SEARCH_QUERIES = [
    "\"SKILL.md\" in:readme claude",
    "\"SKILL.md\" in:readme codex",
    "\"SKILL.md\" in:readme agent",
    "\"SKILL.md\" in:readme \"skill-installer\"",
    "\"SKILL.md\" in:readme anthropic",
    "\"SKILL.md\" in:readme mcp",
    "\"SKILL.md\" in:readme gemini",
]

BLACKLIST_KEYWORDS = [
    "rpg",
    "game",
    "skillswap",
]


def truncate_text(text, max_chars):
    if not text:
        return ""
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars]}\n...[truncated]"


def parse_front_matter(content):
    lines = content.splitlines()
    if not lines or lines[0].strip() not in {"---", "+++"}:
        return {}, content

    delimiter = lines[0].strip()
    end_index = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == delimiter:
            end_index = idx
            break

    if end_index is None:
        return {}, content

    data = {}
    for line in lines[1:end_index]:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip("'\"")

    body = "\n".join(lines[end_index + 1 :])
    return data, body


def normalize_skill_token(text):
    if not text:
        return ""
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def build_skillpath_candidates(repo_name, skill_entries):
    candidates = []
    repo_slug = repo_name.split("/")[-1] if repo_name else ""
    for skill_path, entry in skill_entries.items():
        content = entry.get("content") or ""
        frontmatter, _ = parse_front_matter(content)
        short_name = frontmatter.get("name", "").strip()
        if not short_name:
            short_name = os.path.basename(skill_path) if skill_path else repo_slug
        candidates.append(
            {
                "skill_path": skill_path,
                "short_norm": normalize_skill_token(short_name),
                "basename_norm": normalize_skill_token(os.path.basename(skill_path)),
                "alias_norm": normalize_skill_token(skill_path.replace("/", "_")),
                "is_root": skill_path == "",
            }
        )
    return candidates


def select_skillpath_candidate(skill_short, candidates):
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]["skill_path"]

    short_norm = normalize_skill_token(skill_short)
    base_short = re.sub(r"-\\d+$", "", skill_short or "")
    base_norm = normalize_skill_token(base_short)

    def pick(matches):
        return matches[0]["skill_path"] if len(matches) == 1 else None

    for key in ("short_norm", "basename_norm", "alias_norm"):
        matches = [c for c in candidates if c[key] == short_norm and short_norm]
        picked = pick(matches)
        if picked is not None:
            return picked

    for key in ("short_norm", "basename_norm", "alias_norm"):
        matches = [c for c in candidates if c[key] == base_norm and base_norm]
        picked = pick(matches)
        if picked is not None:
            return picked

    if (skill_short or "").endswith("-root") or not short_norm:
        matches = [c for c in candidates if c["is_root"]]
        picked = pick(matches)
        if picked is not None:
            return picked

    return None


def extract_json_payload(text):
    if not text:
        return None
    payload = text.strip()
    if payload.startswith("```"):
        payload = re.sub(r"^```(?:json)?", "", payload).strip()
        payload = re.sub(r"```$", "", payload).strip()

    start = payload.find("{")
    end = payload.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return payload[start : end + 1]


def normalize_category(value):
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    if "（" in text:
        text = text.split("（", 1)[0].strip()
    if " (" in text:
        text = text.split(" (", 1)[0].strip()
    if text in CATEGORY_NAMES:
        return text
    for category in CATEGORY_NAMES:
        if category in text or text in category:
            return category
    return None


def coerce_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return []
        return [item for item in re.split(r"[,\n;/|，；、]+", trimmed) if item]
    return [str(value)]


def sanitize_tags(value):
    tags = []
    for item in coerce_list(value):
        tag = str(item).strip()
        if tag and tag not in tags:
            tags.append(tag)
    return tags[:5]


def sanitize_category(value):
    for item in coerce_list(value):
        category = normalize_category(item)
        if category:
            return category
    return "其他"


def sanitize_tagline(value):
    if not value:
        return ""
    return " ".join(str(value).strip().splitlines())


def sanitize_use_case(value):
    if isinstance(value, list):
        parts = [str(item).strip() for item in value if str(item).strip()]
        return "；".join(parts)
    if not value:
        return ""
    return " ".join(str(value).strip().splitlines())


class LLMRetryExceeded(RuntimeError):
    pass


async def call_llm_api(session, prompt, retries=0):
    try:
        if config.CURRENT_MODEL not in config.MODEL_CONFIGS:
            raise ValueError(f"未找到模型配置: {config.CURRENT_MODEL}")

        model_config = config.MODEL_CONFIGS[config.CURRENT_MODEL]
        is_claude = config.CURRENT_MODEL == "claude"

        if is_claude:
            headers = {
                "x-api-key": model_config["api_key"],
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            }
            request_body = {
                "model": model_config["id"],
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
            }
        else:
            headers = {
                "Authorization": f"Bearer {model_config['api_key']}",
                "Content-Type": "application/json",
            }
            request_body = {
                "model": model_config["id"],
                "messages": [{"role": "user", "content": prompt}],
            }

        timeout = aiohttp.ClientTimeout(total=120)

        async with session.post(
            model_config["url"],
            headers=headers,
            json=request_body,
            timeout=timeout,
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                await log(f"API请求失败: HTTP {response.status}, 响应: {error_text}", level="ERROR")
                if retries < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAY * (retries + 1))
                    return await call_llm_api(session, prompt, retries + 1)
                raise RuntimeError(f"API调用失败，已重试{MAX_RETRIES}次")

            response_json = await response.json()

            if is_claude:
                if not isinstance(response_json, dict) or "content" not in response_json:
                    raise ValueError(f"Claude API响应格式错误: {response_json}")
                if not response_json["content"] or "text" not in response_json["content"][0]:
                    raise ValueError(f"Claude API响应缺少必要字段: {response_json}")
                return {
                    "choices": [
                        {"message": {"content": response_json["content"][0]["text"]}}
                    ]
                }

            if not isinstance(response_json, dict) or "choices" not in response_json:
                raise ValueError(f"API响应格式错误: {response_json}")
            if not response_json["choices"] or "message" not in response_json["choices"][0]:
                raise ValueError(f"API响应缺少必要字段: {response_json}")
            return response_json

    except asyncio.TimeoutError:
        await log(
            f"API请求超时 (重试次数: {retries}/{LLM_MAX_RETRIES})",
            level="ERROR",
        )
        if retries < LLM_MAX_RETRIES:
            await asyncio.sleep(RETRY_DELAY * (retries + 1))
            return await call_llm_api(session, prompt, retries + 1)
        raise LLMRetryExceeded("LLM retry exceeded")
    except Exception as e:
        await log(
            f"API调用出错 (重试次数: {retries}/{LLM_MAX_RETRIES}): {str(e)}",
            level="ERROR",
        )
        if retries < LLM_MAX_RETRIES:
            await asyncio.sleep(RETRY_DELAY * (retries + 1))
            return await call_llm_api(session, prompt, retries + 1)
        raise LLMRetryExceeded("LLM retry exceeded")


async def call_llm_with_semaphore(session, prompt, semaphore):
    async with semaphore:
        if LLM_REQUEST_INTERVAL > 0:
            async with _llm_rate_lock:
                now_ts = time.monotonic()
                elapsed = now_ts - _llm_last_call["ts"]
                if elapsed < LLM_REQUEST_INTERVAL:
                    await asyncio.sleep(LLM_REQUEST_INTERVAL - elapsed)
                _llm_last_call["ts"] = time.monotonic()
        return await call_llm_api(session, prompt)


async def run_worker_pool(items, worker, worker_count):
    queue = asyncio.Queue()
    for item in items:
        await queue.put(item)
    for _ in range(worker_count):
        await queue.put(None)

    tasks = [asyncio.create_task(worker(queue)) for _ in range(worker_count)]
    await queue.join()
    await asyncio.gather(*tasks)


def split_markdown_chunks(content, max_chars):
    if not content:
        return []
    lines = content.splitlines(keepends=True)
    chunks = []
    current = []
    current_len = 0
    in_code_block = False
    fence = None

    frontmatter_end = None
    if lines and lines[0].strip() in {"---", "+++"}:
        delimiter = lines[0].strip()
        for idx in range(1, len(lines)):
            if lines[idx].strip() == delimiter:
                frontmatter_end = idx
                break

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            marker = stripped[:3]
            if in_code_block and marker == fence:
                in_code_block = False
                fence = None
            elif not in_code_block:
                in_code_block = True
                fence = marker

        if current and not in_code_block:
            if frontmatter_end is not None and idx <= frontmatter_end:
                pass
            elif current_len + len(line) > max_chars:
                chunks.append("".join(current))
                current = []
                current_len = 0

        current.append(line)
        current_len += len(line)

    if current:
        chunks.append("".join(current))
    return chunks


async def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")


def getenv_first(keys):
    for key in keys:
        value = os.getenv(key)
        if value:
            return value
    return None


def load_pg_config():
    load_dotenv()
    dsn = getenv_first(["PG_DSN", "DATABASE_URL", "PGURL"])
    if dsn:
        return {"dsn": dsn}

    user = getenv_first(["user", "USER", "PGUSER"])
    password = getenv_first(["password", "PASSWORD", "PGPASSWORD"])
    host = getenv_first(["host", "HOST", "PGHOST"])
    port = getenv_first(["port", "PORT", "PGPORT"])
    dbname = getenv_first(["dbname", "DBNAME", "PGDATABASE"])

    missing = [
        name
        for name, value in [
            ("user", user),
            ("password", password),
            ("host", host),
            ("port", port),
            ("dbname", dbname),
        ]
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing Postgres env vars: {', '.join(missing)}")

    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port,
        "dbname": dbname,
    }


def get_pg_connection(config_data, autocommit=True):
    if "dsn" in config_data:
        conn = psycopg2.connect(config_data["dsn"])
    else:
        conn = psycopg2.connect(
            user=config_data["user"],
            password=config_data["password"],
            host=config_data["host"],
            port=config_data["port"],
            dbname=config_data["dbname"],
        )
    conn.autocommit = autocommit
    return conn


def ensure_schema(conn):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = %s AND table_name = %s
        """,
        (PG_SCHEMA, "skills"),
    )
    if cursor.fetchone() is None:
        raise RuntimeError(f"{PG_SCHEMA}.skills does not exist")

    cursor.execute(
        """
        SELECT pg_get_serial_sequence(%s, 'id')
        """,
        (f"{PG_SCHEMA}.skills",),
    )
    seq_row = cursor.fetchone()
    seq_name = seq_row[0] if seq_row else None
    cursor.execute(
        """
        SELECT column_default, is_identity
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s AND column_name = 'id'
        """,
        (PG_SCHEMA, "skills"),
    )
    id_info = cursor.fetchone()
    if id_info:
        column_default, is_identity = id_info
        if not column_default and (is_identity or "").upper() != "YES":
            cursor.execute(f"CREATE SEQUENCE IF NOT EXISTS {PG_SCHEMA}.skills_id_seq")
            cursor.execute(
                f"ALTER TABLE {PG_SCHEMA}.skills "
                f"ALTER COLUMN id SET DEFAULT nextval('{PG_SCHEMA}.skills_id_seq')"
            )
            cursor.execute(
                f"ALTER SEQUENCE {PG_SCHEMA}.skills_id_seq "
                f"OWNED BY {PG_SCHEMA}.skills.id"
            )
            seq_name = f"{PG_SCHEMA}.skills_id_seq"

    if seq_name:
        cursor.execute(f"SELECT COALESCE(MAX(id), 0) FROM {PG_SCHEMA}.skills")
        max_id = cursor.fetchone()[0] or 0
        if max_id <= 0:
            cursor.execute("SELECT setval(%s, %s, %s)", (seq_name, 1, False))
        else:
            cursor.execute("SELECT setval(%s, %s, %s)", (seq_name, max_id, True))

    cursor.execute(f"ALTER TABLE {PG_SCHEMA}.skills ADD COLUMN IF NOT EXISTS tags_en text")
    cursor.execute(
        f"ALTER TABLE {PG_SCHEMA}.skills ADD COLUMN IF NOT EXISTS use_case_en text"
    )
    cursor.execute(
        f"ALTER TABLE {PG_SCHEMA}.skills ADD COLUMN IF NOT EXISTS description_en text"
    )
    cursor.execute(
        f"ALTER TABLE {PG_SCHEMA}.skills ADD COLUMN IF NOT EXISTS description_zh text"
    )
    cursor.execute(
        f"ALTER TABLE {PG_SCHEMA}.skills ADD COLUMN IF NOT EXISTS skill_md_sha text"
    )
    cursor.execute(
        f"ALTER TABLE {PG_SCHEMA}.skills "
        "ADD COLUMN IF NOT EXISTS skill_md_last_checked_at timestamptz"
    )
    cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {PG_SCHEMA}.maintenance_meta (
            key text PRIMARY KEY,
            value text NOT NULL
        )
        """
    )

    conn.commit()


def get_last_run(conn):
    cursor = conn.cursor()
    cursor.execute(
        f"SELECT value FROM {PG_SCHEMA}.maintenance_meta WHERE key = 'last_run'"
    )
    row = cursor.fetchone()
    if not row:
        return None
    return row[0]


def set_last_run(conn, value):
    cursor = conn.cursor()
    cursor.execute(
        f"""
        INSERT INTO {PG_SCHEMA}.maintenance_meta (key, value)
        VALUES ('last_run', %s)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """,
        (value,),
    )
    conn.commit()


def parse_tags(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return []
        try:
            parsed = json.loads(trimmed)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    return [str(item).strip() for item in coerce_list(value) if str(item).strip()]


def split_use_case(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in re.split(r"[；;\n]+", str(value)) if item.strip()]


def contains_chinese(text):
    if not text:
        return False
    return re.search(r"[\u4e00-\u9fff]", text) is not None


def contains_latin(text):
    if not text:
        return False
    return re.search(r"[A-Za-z]", text) is not None


def normalize_translation(text):
    if not text:
        return ""
    payload = text.strip()
    if payload.startswith("```"):
        payload = re.sub(r"^```(?:text)?", "", payload).strip()
        payload = re.sub(r"```$", "", payload).strip()
    return " ".join(payload.splitlines()).strip()


def format_raw_output(text):
    value = text if text is not None else ""
    value = str(value).replace("\n", "\\n")
    if len(value) > LOG_CLEARED_OUTPUTS_LIMIT:
        value = value[:LOG_CLEARED_OUTPUTS_LIMIT] + "...(truncated)"
    return value


def clamp_words(text, max_words):
    if not text:
        return ""
    parts = text.split()
    if len(parts) <= max_words:
        return text
    return " ".join(parts[:max_words])


def enforce_chinese(text):
    cleaned = normalize_translation(text)
    return cleaned if contains_chinese(cleaned) else ""


def enforce_english(text):
    cleaned = normalize_translation(text)
    if contains_chinese(cleaned):
        return ""
    return cleaned if contains_latin(cleaned) else ""


def normalize_skill_md_translation(text):
    if not text:
        return ""
    payload = text.strip()
    if payload.startswith("```"):
        payload = re.sub(r"^```(?:markdown|md)?", "", payload).strip()
        payload = re.sub(r"```$", "", payload).strip()
    return payload


def is_skill_md_translation_placeholder(text):
    if not text:
        return False
    return text.strip() == SKILL_MD_TOO_LARGE_NOTICE


def normalize_tagline(text):
    value = sanitize_tagline(text)
    if not value:
        return ""
    value = re.sub(r"\s*/\s*", "/", value)
    if "/" not in value:
        return ""
    zh, en = value.split("/", 1)
    zh = zh.strip()
    en = en.strip()
    if len(zh) > TAGLINE_ZH_MAX_CHARS:
        zh = zh[:TAGLINE_ZH_MAX_CHARS].strip()
    if len(en.split()) > TAGLINE_EN_MAX_WORDS:
        en = clamp_words(en, TAGLINE_EN_MAX_WORDS)
    if not zh or not en:
        return ""
    if not contains_chinese(zh):
        return ""
    if contains_chinese(en) or not contains_latin(en):
        return ""
    return f"{zh}/{en}"


class UpdateVerificationError(RuntimeError):
    pass


def drop_empty_updates(update):
    for key in list(update.keys()):
        if key == "id":
            continue
        value = update.get(key)
        if value is None:
            update.pop(key, None)
            continue
        if isinstance(value, str) and not value.strip():
            update.pop(key, None)
    return update


def verify_db_update(cursor, skill_id, fields):
    if not fields:
        return {}
    columns = list(fields.keys())
    cursor.execute(
        f"SELECT {', '.join(columns)} FROM {PG_SCHEMA}.skills WHERE id = %s",
        (skill_id,),
    )
    row = cursor.fetchone()
    if row is None:
        raise UpdateVerificationError(f"verify failed: id {skill_id} not found")
    actual_fields = dict(zip(columns, row))
    mismatches = []
    for col, expected in fields.items():
        actual = actual_fields.get(col)
        if expected != actual:
            mismatches.append(f"{col} expected={expected!r} actual={actual!r}")
    if mismatches:
        detail = "; ".join(mismatches)
        raise UpdateVerificationError(f"verify failed: id {skill_id} {detail}")
    return actual_fields


def format_verify_fields(fields):
    parts = []
    for key, value in fields.items():
        if value is None:
            text = "NULL"
        else:
            text = str(value)
        if len(text) > VERIFY_LOG_MAX_LEN:
            text = text[:VERIFY_LOG_MAX_LEN] + "...(truncated)"
        parts.append(f"{key}={text}")
    return "; ".join(parts)


async def translate_skill_md_content(session, content, semaphore):
    if not content:
        return None
    if SKILL_MD_TRANSLATION_MAX_CHARS and len(content) > SKILL_MD_TRANSLATION_MAX_CHARS:
        await log(
            f"SKILL.md 内容过长，跳过翻译 (len={len(content)})",
            level="WARN",
        )
        return SKILL_MD_TOO_LARGE_NOTICE

    chunks = split_markdown_chunks(content, SKILL_MD_TRANSLATION_CHUNK_CHARS)
    translated_parts = []
    for chunk in chunks:
        prompt = build_skill_md_translation_prompt(chunk)
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        translated = normalize_skill_md_translation(
            response["choices"][0]["message"]["content"]
        )
        if not translated:
            return None
        translated_parts.append(translated)

    merged = "".join(translated_parts).strip()
    return merged or None


async def generate_use_case_zh(session, content, semaphore):
    prompt = build_use_case_prompt(content)
    response = await call_llm_with_semaphore(session, prompt, semaphore)
    raw = response["choices"][0]["message"]["content"]
    candidate = normalize_translation(raw)
    if contains_chinese(candidate):
        return candidate
    if LOG_CLEARED_OUTPUTS:
        await log(
            f"use_case cleared: {format_raw_output(raw)}",
            level="WARN",
        )
    return ""


async def translate_use_case_en(session, text, semaphore):
    prompt = build_use_case_en_prompt(text)
    response = await call_llm_with_semaphore(session, prompt, semaphore)
    raw = response["choices"][0]["message"]["content"]
    candidate = normalize_translation(raw)
    if contains_chinese(candidate) or not contains_latin(candidate):
        if LOG_CLEARED_OUTPUTS:
            await log(
                f"use_case_en cleared: {format_raw_output(raw)}",
                level="WARN",
            )
        return ""
    return candidate


async def translate_use_case_zh(session, text, semaphore):
    prompt = build_use_case_zh_prompt(text)
    response = await call_llm_with_semaphore(session, prompt, semaphore)
    raw = response["choices"][0]["message"]["content"]
    candidate = normalize_translation(raw)
    if contains_chinese(candidate):
        return candidate
    if LOG_CLEARED_OUTPUTS:
        await log(
            f"use_case_zh cleared: {format_raw_output(raw)}",
            level="WARN",
        )
    return ""


async def generate_description_zh(session, content, semaphore, attempts=2):
    prompt = build_description_zh_prompt(content)
    for _ in range(attempts):
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        raw = response["choices"][0]["message"]["content"]
        candidate = enforce_chinese(raw)
        if candidate:
            if len(candidate) > 150:
                candidate = candidate[:150].strip()
            return candidate
        if LOG_CLEARED_OUTPUTS:
            await log(
                f"description_zh cleared: {format_raw_output(raw)}",
                level="WARN",
            )
    return ""


async def generate_description_en(session, content, semaphore, attempts=2):
    prompt = build_description_en_prompt(content)
    for _ in range(attempts):
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        raw = response["choices"][0]["message"]["content"]
        candidate = enforce_english(raw)
        if candidate:
            candidate = clamp_words(candidate, 100)
            return candidate
        if LOG_CLEARED_OUTPUTS:
            await log(
                f"description_en cleared: {format_raw_output(raw)}",
                level="WARN",
            )
    return ""


async def generate_tagline(session, skill_name, description, skill_md_content, semaphore, attempts=2):
    prompt = build_tagline_prompt(skill_name, description, skill_md_content)
    for _ in range(attempts):
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        raw = response["choices"][0]["message"]["content"]
        candidate = normalize_tagline(raw)
        if candidate:
            return candidate
        if LOG_CLEARED_OUTPUTS:
            await log(
                f"tagline cleared: {format_raw_output(raw)}",
                level="WARN",
            )
    description_text = description or ""
    skill_md_excerpt = truncate_text(skill_md_content or "", ANALYSIS_MAX_CHARS)

    zh_candidate = ""
    en_candidate = ""
    if description_text and contains_chinese(description_text):
        prompt = build_tagline_zh_prompt(skill_name, description_text, skill_md_excerpt)
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        zh_candidate = enforce_chinese(response["choices"][0]["message"]["content"])
        if zh_candidate:
            zh_candidate = zh_candidate[:TAGLINE_ZH_MAX_CHARS].strip()
            prompt = build_tagline_en_from_zh_prompt(zh_candidate)
            response = await call_llm_with_semaphore(session, prompt, semaphore)
            en_candidate = enforce_english(response["choices"][0]["message"]["content"])
            if en_candidate:
                en_candidate = clamp_words(en_candidate, TAGLINE_EN_MAX_WORDS)
    elif description_text and contains_latin(description_text) and not contains_chinese(description_text):
        prompt = build_tagline_en_prompt(skill_name, description_text, skill_md_excerpt)
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        en_candidate = enforce_english(response["choices"][0]["message"]["content"])
        if en_candidate:
            en_candidate = clamp_words(en_candidate, TAGLINE_EN_MAX_WORDS)
            prompt = build_tagline_zh_from_en_prompt(en_candidate)
            response = await call_llm_with_semaphore(session, prompt, semaphore)
            zh_candidate = enforce_chinese(response["choices"][0]["message"]["content"])
            if zh_candidate:
                zh_candidate = zh_candidate[:TAGLINE_ZH_MAX_CHARS].strip()
    else:
        prompt = build_tagline_zh_prompt(skill_name, "", skill_md_excerpt)
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        zh_candidate = enforce_chinese(response["choices"][0]["message"]["content"])
        if zh_candidate:
            zh_candidate = zh_candidate[:TAGLINE_ZH_MAX_CHARS].strip()
            prompt = build_tagline_en_from_zh_prompt(zh_candidate)
            response = await call_llm_with_semaphore(session, prompt, semaphore)
            en_candidate = enforce_english(response["choices"][0]["message"]["content"])
            if en_candidate:
                en_candidate = clamp_words(en_candidate, TAGLINE_EN_MAX_WORDS)

    combined = normalize_tagline(f"{zh_candidate}/{en_candidate}")
    return combined


async def translate_description_zh(session, text, semaphore, attempts=2):
    prompt = build_description_zh_translation_prompt(text)
    for _ in range(attempts):
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        raw = response["choices"][0]["message"]["content"]
        candidate = enforce_chinese(raw)
        if candidate:
            if len(candidate) > 150:
                candidate = candidate[:150].strip()
            return candidate
        if LOG_CLEARED_OUTPUTS:
            await log(
                f"description_zh_translate cleared: {format_raw_output(raw)}",
                level="WARN",
            )
    return ""


async def translate_description_en(session, text, semaphore, attempts=2):
    prompt = build_description_en_translation_prompt(text)
    for _ in range(attempts):
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        raw = response["choices"][0]["message"]["content"]
        candidate = enforce_english(raw)
        if candidate:
            candidate = clamp_words(candidate, 100)
            return candidate
        if LOG_CLEARED_OUTPUTS:
            await log(
                f"description_en_translate cleared: {format_raw_output(raw)}",
                level="WARN",
            )
    return ""


def build_translation_prompt(tags, use_cases):
    return (
        "Translate the following Chinese content to English.\n"
        "Rules:\n"
        "- Keep the number of items and order.\n"
        "- Do not add or remove items.\n"
        "- If an input list is empty, output an empty list.\n"
        "- Output JSON only, no extra text.\n\n"
        f"tags: {json.dumps(tags, ensure_ascii=False)}\n"
        f"use_cases: {json.dumps(use_cases, ensure_ascii=False)}\n\n"
        'Output JSON format: {"tags_en":["..."],"use_case_en":["..."]}'
    )


def build_tag_category_prompt(skill_name, description, skill_md_content):
    description_text = description if description else "（无）"
    categories_text = "\n".join(
        [f"- {name}（标签参考: {hints}）" for name, hints in CATEGORY_TAG_HINTS.items()]
    )
    return f"""请分析以下 Skill 内容，只输出 JSON，不要输出任何多余文本或Markdown标记。

JSON 规则：
1. tags 最多 5 个，必须是 JSON 数组
2. category 必须从下面列表中选择，只输出分类名称（不要带括号内容）

分类列表（括号内容是标签参考，可用于 tags，但不要放进 category）：
{categories_text}

Skill ID: {skill_name}
description: {description_text}

SKILL.md 内容:
{skill_md_content}

JSON 输出字段：
{{
  "tags": ["标签1", "标签2"],
  "category": "信息获取与检索"
}}
"""


def build_tagline_use_case_prompt(skill_name, description, skill_md_content):
    description_text = description if description else "（无）"
    return f"""请分析以下 Skill 内容，只输出 JSON，不要输出任何多余文本或Markdown标记。

JSON 规则：
1. tagline 为双语一句话描述，格式示例：中文描述/English description
2. tagline 中文不超过 25 个字，英文不超过 16 个词
3. use_case 使用中文，1-3 条，用“；”连接，格式示例：在...情况下，用...实现...

Skill ID: {skill_name}
description: {description_text}

SKILL.md 内容:
{skill_md_content}

JSON 输出字段：
{{
  "tagline": "中文/English",
  "use_case": "在...情况下，用...实现..."
}}
"""


def build_tagline_prompt(skill_name, description, skill_md_content):
    description_text = description if description else "（无）"
    return f"""请基于以下信息生成一句话双语标语，仅输出这一行文本。
输出格式必须为：中文一句话描述/English tagline
要求：
- 必须只输出一行，不要 JSON/列表/多行
- 中文必须是中文，且不超过 25 个字
- 英文必须是英文，且不超过 16 个词
- 使用“/”作为唯一分隔符，不要带额外空格

正确示例：
自动汇总日志并告警/Auto-summarize logs and alert

错误示例（请避免）：
- 输出解释文字
- 只有中文或只有英文
- 使用“|”或“ - ”分隔

Skill ID: {skill_name}
description: {description_text}

SKILL.md 内容:
{skill_md_content}
"""


def build_tagline_zh_prompt(skill_name, description, skill_md_content):
    description_text = description if description else "（无）"
    return f"""请基于以下信息生成一句中文标语，仅输出中文一句话。
要求：
- 不超过 25 个字
- 只输出中文一句话，不要标点外的任何说明

Skill ID: {skill_name}
description: {description_text}

SKILL.md 内容:
{skill_md_content}
"""


def build_tagline_en_prompt(skill_name, description, skill_md_content):
    description_text = description if description else "(none)"
    return f"""Generate one concise English tagline based on the info below.
Requirements:
- English only
- No more than 16 words
- Output only one line, no extra text

Skill ID: {skill_name}
description: {description_text}

SKILL.md:
{skill_md_content}
"""


def build_tagline_en_from_zh_prompt(tagline_zh):
    return f"""Translate the following Chinese tagline into concise English.
Requirements:
- English only
- No more than 16 words
- Output only one line, no extra text

中文标语:
{tagline_zh}
"""


def build_tagline_zh_from_en_prompt(tagline_en):
    return f"""将以下英文标语翻译为中文一句话。
要求：
- 不超过 25 个字
- 只输出中文一句话，不要任何说明

英文标语:
{tagline_en}
"""


def build_skill_md_translation_prompt(skill_md_content):
    return (
        "Translate the following SKILL.md chunk into Chinese. "
        "Preserve YAML frontmatter, code blocks, links, and commands. "
        "Output only the translated chunk, no extra text.\n\n"
        f"{skill_md_content}"
    )


def build_use_case_prompt(skill_md_content):
    return (
        "请基于以下 SKILL.md 内容输出 1-3 条使用场景，使用中文。\n"
        "要求：\n"
        "- 每条使用场景格式示例：在...情况下，用...实现...\n"
        "- 仅使用“；”分隔多条，不要编号\n"
        "- 只输出中文文本，不要 Markdown/JSON/解释\n"
        "正确示例：在需要批量清洗数据时，用该技能自动化处理；在生成报告时，用该技能汇总要点\n"
        "错误示例：1. ...；2. ... / 使用场景如下：...\n\n"
        f"SKILL.md:\n{skill_md_content}"
    )


def build_use_case_en_prompt(use_case_text):
    return (
        "Translate the following Chinese use cases to English.\n"
        "Requirements:\n"
        "- Keep the number and order of items\n"
        "- Use '；' as separator (no numbering)\n"
        "- Output plain text only, no extra text\n\n"
        f"Use cases:\n{use_case_text}"
    )


def build_use_case_zh_prompt(use_case_text):
    return (
        "将下面英文使用场景翻译成中文。\n"
        "要求：\n"
        "- 保持条目数量和顺序\n"
        "- 使用“；”分隔（不要编号）\n"
        "- 只输出中文文本，不要解释\n\n"
        f"Use cases:\n{use_case_text}"
    )


def build_description_zh_prompt(skill_md_content):
    return (
        "请基于以下 SKILL.md 内容生成一句中文简介。\n"
        "要求：\n"
        "- 只输出中文一句话\n"
        "- 必须包含中文字符\n"
        "- 不超过150字\n"
        "- 不要输出列表、JSON、Markdown或解释\n"
        "正确示例：用于将日志自动归纳并生成摘要的技能。\n\n"
        f"SKILL.md:\n{skill_md_content}"
    )


def build_description_en_prompt(skill_md_content):
    return (
        "Generate one concise English description based on the SKILL.md content.\n"
        "Requirements:\n"
        "- English only, no Chinese\n"
        "- <= 100 words\n"
        "- Output a single sentence, plain text only\n"
        "Example: A skill that summarizes logs and highlights key issues.\n\n"
        f"SKILL.md:\n{skill_md_content}"
    )


def build_description_zh_translation_prompt(text):
    return (
        "把下面内容翻译成中文。\n"
        "要求：\n"
        "- 只输出中文一句话\n"
        "- 必须包含中文字符\n"
        "- 不超过150字\n"
        "- 不要输出列表、JSON、Markdown或解释\n\n"
        f"Text:\n{text}"
    )


def build_description_en_translation_prompt(text):
    return (
        "Translate the following text to English.\n"
        "Requirements:\n"
        "- English only, no Chinese\n"
        "- <= 100 words\n"
        "- Output a single sentence, plain text only\n\n"
        f"Text:\n{text}"
    )


def normalize_en_list(items):
    if not isinstance(items, list):
        return None
    cleaned = []
    for item in items:
        text = str(item).strip()
        if text:
            cleaned.append(text)
    return cleaned


def coerce_en_list(value, expected_len, separators, allow_merge=False):
    if value is None:
        items = []
    elif isinstance(value, list):
        items = normalize_en_list(value) or []
    elif isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            items = []
        else:
            items = None
            if trimmed.startswith("[") and trimmed.endswith("]"):
                try:
                    parsed = json.loads(trimmed)
                except json.JSONDecodeError:
                    parsed = None
                if isinstance(parsed, list):
                    items = normalize_en_list(parsed)
            if items is None:
                items = [part.strip() for part in re.split(separators, trimmed) if part.strip()]
    else:
        text = str(value).strip()
        items = [text] if text else []

    if expected_len == 0:
        return []
    if allow_merge and expected_len == 1 and len(items) > 1:
        return ["；".join(items)]
    return items


def parse_json_payload(text):
    if not text:
        return None
    payload = extract_json_payload(text)
    return payload or text.strip()


def build_clone_url(repo_name, from_repo):
    if from_repo:
        if from_repo.endswith(".git"):
            return from_repo
        return f"{from_repo}.git"
    return f"https://github.com/{repo_name}.git"


def run_git(args, cwd, timeout=None):
    effective_timeout = timeout or SUBSTEP_TIMEOUT
    try:
        result = subprocess.run(
            ["git", "-C", cwd, *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=effective_timeout,
        )
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError(
            f"git timeout after {effective_timeout}s: {' '.join(args)}"
        ) from exc
    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise RuntimeError(stderr or f"git failed: {' '.join(args)}")
    return result.stdout


def list_repo_files(repo_path):
    output = run_git(["ls-tree", "-r", "--name-only", "HEAD"], repo_path)
    return [line.strip() for line in output.splitlines() if line.strip()]


def collect_skill_entries(repo_path, file_paths, repo_name=None, max_skills=None):
    skill_candidates = {}
    for path in file_paths:
        lower = path.lower()
        if not lower.endswith("skill.md"):
            continue
        skill_path = os.path.dirname(path)
        preferred = path.endswith("SKILL.md")
        existing = skill_candidates.get(skill_path)
        if existing and existing["preferred"] and not preferred:
            continue
        skill_candidates[skill_path] = {"path": path, "preferred": preferred}

    entries = {}
    total = len(skill_candidates)
    if total > 0:
        name = repo_name or repo_path
        print(f"[INFO] 子进度: {name} 发现 SKILL.md {total} 个")
    if total == 0:
        return entries
    if max_skills and total > max_skills:
        name = repo_name or repo_path
        print(
            f"[WARN] 子进度: {name} SKILL.md 数量超阈值({max_skills})，跳过仓库"
        )
        return None

    def read_entry(skill_path, info):
        entry_start = time.monotonic()
        def elapsed():
            return time.monotonic() - entry_start

        sha = ""
        content = None
        too_large = False
        entry_error = None
        try:
            if elapsed() > SUBSTEP_TIMEOUT:
                raise TimeoutError("entry timeout before size check")
            size_text = run_git(["cat-file", "-s", f"HEAD:{info['path']}"], repo_path)
            size_bytes = int(size_text.strip() or 0)
            if SKILL_MD_MAX_BYTES and size_bytes > SKILL_MD_MAX_BYTES:
                too_large = True
            else:
                if elapsed() > SUBSTEP_TIMEOUT:
                    raise TimeoutError("entry timeout before content read")
                content = run_git(["show", f"HEAD:{info['path']}"], repo_path)
            if elapsed() > SUBSTEP_TIMEOUT:
                raise TimeoutError("entry timeout before sha")
            sha = run_git(["rev-parse", f"HEAD:{info['path']}"], repo_path).strip()
        except Exception as exc:
            entry_error = str(exc)
        return skill_path, {
            "path": info["path"],
            "content": content,
            "sha": sha,
            "too_large": too_large,
            "error": entry_error,
        }

    name = repo_name or repo_path
    worker_count = min(SKILL_ENTRY_WORKERS, total)
    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = [
            executor.submit(read_entry, skill_path, info)
            for skill_path, info in skill_candidates.items()
        ]
        try:
            for future in concurrent.futures.as_completed(futures, timeout=SUBSTEP_TIMEOUT):
                skill_path, entry = future.result()
                completed += 1
                if entry.get("too_large"):
                    print(
                        f"[WARN] 子进度: {name} SKILL.md 过大，跳过读取: {entry['path']}"
                    )
                if entry.get("error"):
                    print(
                        f"[ERROR] 子进度: {name} 读取 SKILL.md 失败: {entry['path']}, 错误: {entry['error']}"
                    )
                print(
                    f"[INFO] 子进度: {name} 读取 SKILL.md {completed}/{total}"
                )
                entries[skill_path] = entry
        except concurrent.futures.TimeoutError:
            print(f"[WARN] 子进度: {name} 读取 SKILL.md 超时")
            for future in futures:
                future.cancel()
        finally:
            if len(entries) < total:
                for skill_path, info in skill_candidates.items():
                    if skill_path in entries:
                        continue
                    entries[skill_path] = {
                        "path": info["path"],
                        "content": None,
                        "sha": "",
                        "too_large": False,
                        "error": "entry timeout",
                    }

    return entries


def clone_repo(repo_name, from_repo, default_branch, shallow=True):
    os.makedirs(TEMP_CLONE_ROOT, exist_ok=True)
    clone_dir = tempfile.mkdtemp(
        prefix=f"{repo_name.replace('/', '_')}_", dir=TEMP_CLONE_ROOT
    )
    clone_url = build_clone_url(repo_name, from_repo)
    branch = default_branch or DEFAULT_BRANCH
    try:
        args = [
            "git",
            "clone",
            "--no-checkout",
            "--branch",
            branch,
            "--single-branch",
        ]
        if shallow:
            args.extend(["--depth", "1", "--filter=blob:none"])
        args.extend([clone_url, clone_dir])
        subprocess.run(
            args,
            check=True,
            timeout=SUBSTEP_TIMEOUT,
        )
        return clone_dir
    except Exception:
        shutil.rmtree(clone_dir, ignore_errors=True)
        raise


def clone_repo_default_branch(repo_name, from_repo):
    os.makedirs(TEMP_CLONE_ROOT, exist_ok=True)
    clone_dir = tempfile.mkdtemp(
        prefix=f"{repo_name.replace('/', '_')}_", dir=TEMP_CLONE_ROOT
    )
    clone_url = build_clone_url(repo_name, from_repo)
    try:
        args = [
            "git",
            "clone",
            "--no-checkout",
            "--single-branch",
            "--depth",
            "1",
            "--filter=blob:none",
            clone_url,
            clone_dir,
        ]
        subprocess.run(args, check=True, timeout=SUBSTEP_TIMEOUT)
        return clone_dir
    except Exception:
        shutil.rmtree(clone_dir, ignore_errors=True)
        raise


def parse_date(date_str):
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def format_date(date_obj):
    return date_obj.strftime("%Y-%m-%d")


def parse_last_run(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def parse_github_datetime(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def start_date_to_datetime(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None


def is_blacklisted(repo):
    name = repo.get("full_name", "")
    desc = repo.get("description") or ""
    text = f"{name} {desc}".lower()

    for keyword in BLACKLIST_KEYWORDS:
        if re.search(rf"\\b{re.escape(keyword)}\\b", text):
            return True
    return False


async def search_repositories(session, query, page=1, per_page=100):
    try:
        search_url = (
            "https://api.github.com/search/repositories"
            f"?q={quote(query)}"
            f"&sort=updated&page={page}&per_page={per_page}"
        )
        headers = {"Accept": "application/vnd.github.v3+json"}
        if GITHUB_TOKEN:
            headers["Authorization"] = f"token {GITHUB_TOKEN}"

        async with session.get(search_url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("items", []), data.get("total_count", 0)
            if response.status == 403:
                reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
                sleep_time = max(reset_time - time.time(), 0) + 10
                await log(f"达到API限制，等待 {sleep_time} 秒...")
                await asyncio.sleep(sleep_time)
                return await search_repositories(session, query, page, per_page)

            await log(f"搜索请求失败: status {response.status}", level="ERROR")
            return [], 0
    except Exception as e:
        await log(f"搜索仓库时出错: {str(e)}", level="ERROR")
        return [], 0


async def process_query_range(session, base_query, start_date, end_date, seen_repos):
    date_range = f"pushed:{start_date}..{end_date}"
    query = f"{base_query} {date_range}"

    await log(f"统计查询: {query}")
    _, total_count = await search_repositories(session, query, page=1, per_page=1)

    if total_count == 0:
        return

    if total_count > 1000:
        start_dt = parse_date(start_date)
        end_dt = parse_date(end_date)
        if start_dt < end_dt:
            delta_days = (end_dt - start_dt).days
            mid_dt = start_dt + timedelta(days=delta_days // 2)
            left_start = start_dt
            left_end = mid_dt
            right_start = mid_dt + timedelta(days=1)
            right_end = end_dt

            await process_query_range(
                session,
                base_query,
                format_date(left_start),
                format_date(left_end),
                seen_repos,
            )
            if right_start <= right_end:
                await process_query_range(
                    session,
                    base_query,
                    format_date(right_start),
                    format_date(right_end),
                    seen_repos,
                )
            return
        await log(f"单日结果超过1000条，无法继续拆分: {query}")

    page = 1
    while True:
        await log(f"搜索: {query}, 页码: {page}")
        repos, _ = await search_repositories(session, query, page, per_page=100)
        if not repos:
            break

        for repo in repos:
            repo_name = repo.get("full_name")
            if not repo_name or repo_name in seen_repos:
                continue
            if is_blacklisted(repo):
                continue
            seen_repos.add(repo_name)

        if len(repos) < 100:
            break
        page += 1
        await asyncio.sleep(2)


async def fetch_repo_info(session, repo_name):
    url = f"https://api.github.com/repos/{repo_name}"
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    async with session.get(url, headers=headers) as response:
        if response.status == 401:
            await log(
                f"GitHub token 无效或权限不足，跳过仓库: {repo_name}",
                level="ERROR",
            )
            return {"error": "unauthorized"}
        if response.status == 404:
            await log(f"仓库不存在: {repo_name}", level="WARN")
            return {"error": "not_found"}
        if response.status == 403:
            reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
            sleep_time = max(reset_time - time.time(), 0) + 10
            await log(f"达到API限制，等待 {sleep_time} 秒...")
            await asyncio.sleep(sleep_time)
            return await fetch_repo_info(session, repo_name)
        if response.status != 200:
            await log(f"获取仓库信息失败: {repo_name}, status: {response.status}", level="ERROR")
            return {"error": f"status_{response.status}"}
        data = await response.json()
        return {
            "default_branch": data.get("default_branch") or DEFAULT_BRANCH,
            "stars": int(data.get("stargazers_count", 0)),
            "html_url": data.get("html_url") or f"https://github.com/{repo_name}",
            "pushed_at": data.get("pushed_at") or "",
            "size_kb": data.get("size"),
        }


def chunk_list(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def build_repo_info_query(batch):
    alias_map = {}
    variables = {}
    var_defs = []
    fields = []

    for idx, repo_name in enumerate(batch):
        owner, name = repo_name.split("/", 1)
        o_key = f"o{idx}"
        n_key = f"n{idx}"
        var_defs.append(f"${o_key}: String!")
        var_defs.append(f"${n_key}: String!")
        variables[o_key] = owner
        variables[n_key] = name
        alias = f"r{idx}"
        alias_map[alias] = repo_name
        fields.append(
            f'{alias}: repository(owner: ${o_key}, name: ${n_key}) '
            "{ pushedAt url stargazerCount diskUsage defaultBranchRef { name } }"
        )

    fields.append("rateLimit { remaining resetAt cost }")
    query = f"query({', '.join(var_defs)}) {{\n  " + "\n  ".join(fields) + "\n}"
    return query, variables, alias_map


def extract_rate_limit_sleep(headers):
    reset_time = int(headers.get("X-RateLimit-Reset", 0))
    if reset_time:
        return max(reset_time - time.time(), 0) + 10
    return 60


async def fetch_repo_infos_batch(session, repo_names):
    results = {}
    if not repo_names:
        return results
    if not GITHUB_TOKEN:
        await log("未配置 GITHUB_TOKEN，跳过 GraphQL 批量查询", level="WARN")
        return results

    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Content-Type": "application/json",
    }

    for batch in chunk_list(repo_names, GRAPHQL_BATCH_SIZE):
        query, variables, alias_map = build_repo_info_query(batch)
        while True:
            async with session.post(
                GRAPHQL_URL,
                headers=headers,
                json={"query": query, "variables": variables},
            ) as response:
                if response.status == 403:
                    sleep_time = extract_rate_limit_sleep(response.headers)
                    await log(f"达到API限制，等待 {sleep_time} 秒...")
                    await asyncio.sleep(sleep_time)
                    continue
                if response.status != 200:
                    await log(
                        f"GraphQL 请求失败: HTTP {response.status}",
                        level="ERROR",
                    )
                    break

                payload = await response.json()
                if payload.get("errors"):
                    message = payload["errors"][0].get("message", "")
                    if "rate limit" in message.lower():
                        sleep_time = extract_rate_limit_sleep(response.headers)
                        await log(f"达到API限制，等待 {sleep_time} 秒...")
                        await asyncio.sleep(sleep_time)
                        continue
                    await log(f"GraphQL 返回错误: {message}", level="ERROR")

                data = payload.get("data") or {}
                for alias, repo_data in data.items():
                    if alias == "rateLimit":
                        continue
                    repo_name = alias_map.get(alias)
                    if not repo_name:
                        continue
                    if not repo_data:
                        results[repo_name] = None
                        continue
                    results[repo_name] = {
                        "default_branch": repo_data.get("defaultBranchRef", {}).get("name")
                        or DEFAULT_BRANCH,
                        "stars": int(repo_data.get("stargazerCount", 0)),
                        "html_url": repo_data.get("url") or f"https://github.com/{repo_name}",
                        "pushed_at": repo_data.get("pushedAt") or "",
                        "size_kb": repo_data.get("diskUsage"),
                    }
                break

    return results


def build_file_tree_from_paths(file_paths, skill_path):
    prefix = skill_path.strip("/")
    if prefix:
        prefix = f"{prefix}/"
    entries = []
    for path in file_paths:
        if prefix:
            if not path.startswith(prefix):
                continue
            relative = path[len(prefix) :]
        else:
            relative = path
        if relative:
            entries.append(relative)
    return "\n".join(sorted(set(entries)))


def build_download_url(github_url, default_branch, skill_path):
    branch = default_branch or DEFAULT_BRANCH
    if not skill_path:
        return f"{github_url}/archive/refs/heads/{branch}.zip"
    target_url = f"{github_url}/tree/{branch}/{skill_path}"
    encoded = quote(target_url, safe=":/")
    return f"https://download-directory.github.io/?url={encoded}"


def build_install_instructions(from_repo, skill_path, download_url):
    repo_skill_url = from_repo if not skill_path else f"{from_repo}/{skill_path}"
    return "\n".join(
        [
            "Claude Code:",
            f"1. 下载并解压: {download_url}",
            "2. 将 skill 目录放入 ~/.claude/skills/ (或 Claude Code 配置的 skills 目录)",
            "3. 重新打开 Claude Code，确认 skill 已生效",
            "",
            "Codex CLI:",
            f"1. 运行: skill-installer {repo_skill_url}",
            "2. 或将 skill 目录复制到 ~/.codex/skills/ 后重启 CLI",
        ]
    )


def get_repo_name(skill_name, from_repo):
    if skill_name and ":" in skill_name:
        return skill_name.split(":", 1)[0]
    if from_repo:
        return from_repo.rstrip("/").split("github.com/")[-1]
    return None


def ensure_unique_skill_name(cursor, base_name, repo_name, skill_path):
    def exists(name):
        cursor.execute(
            f"SELECT 1 FROM {PG_SCHEMA}.skills WHERE skill_name = %s LIMIT 1",
            (name,),
        )
        return cursor.fetchone() is not None

    if not exists(base_name):
        return base_name

    if skill_path:
        candidate = f"{repo_name}:{skill_path.replace('/', '_')}"
    else:
        candidate = f"{repo_name}:{base_name}-root"
    if not exists(candidate):
        return candidate

    suffix = 2
    while True:
        candidate = f"{base_name}-{suffix}"
        if not exists(candidate):
            return candidate
        suffix += 1


def load_existing_skills(conn):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            id,
            skill_name,
            fromrepo,
            skillpath,
            description_en,
            description_zh,
            skill_md_content,
            skill_md_sha,
            file_tree
        FROM {schema}.skills
        """.format(
            schema=PG_SCHEMA
        )
    )
    rows = cursor.fetchall()
    repo_map = {}
    for row in rows:
        record = {
            "id": row[0],
            "skill_name": row[1],
            "from_repo": row[2],
            "skill_path": row[3] or "",
            "description_en": row[4] or "",
            "description_zh": row[5] or "",
            "skill_md_content": row[6] or "",
            "skill_md_sha": row[7] or "",
            "file_tree": row[8] or "",
        }
        repo_name = get_repo_name(record["skill_name"], record["from_repo"])
        if not repo_name:
            continue
        repo_data = repo_map.setdefault(repo_name, {"from_repo": record["from_repo"], "skills": {}})
        repo_data["from_repo"] = record["from_repo"] or repo_data.get("from_repo")
        repo_data["skills"].setdefault(record["skill_path"], []).append(record)
    return repo_map


def update_repo_stars(conn, repo_name, stars):
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE {PG_SCHEMA}.skills SET repostars = %s WHERE skill_name LIKE %s",
        (stars, f"{repo_name}:%"),
    )
    conn.commit()


def update_skill_checked(conn, skill_id, now_iso, sha=None):
    cursor = conn.cursor()
    if sha:
        cursor.execute(
            """
            UPDATE {schema}.skills
            SET skill_md_sha = %s, skill_md_last_checked_at = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """.format(
                schema=PG_SCHEMA
            ),
            (sha, now_iso, skill_id),
        )
    else:
        cursor.execute(
            """
            UPDATE {schema}.skills
            SET skill_md_last_checked_at = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """.format(
                schema=PG_SCHEMA
            ),
            (now_iso, skill_id),
        )
    conn.commit()


def update_skill_base(
    conn,
    skill_id,
    from_repo,
    skill_path,
    stars,
    download_url,
    skill_md_content,
    file_tree,
    how_to_install,
    sha,
    now_iso,
):
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE {schema}.skills
        SET
            fromrepo = %s,
            skillpath = %s,
            repostars = %s,
            download_url = %s,
            skill_md_content = %s,
            file_tree = %s,
            how_to_install = %s,
            skill_md_sha = %s,
            skill_md_last_checked_at = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """.format(
            schema=PG_SCHEMA
        ),
        (
            from_repo,
            skill_path,
            stars,
            download_url,
            skill_md_content,
            file_tree,
            how_to_install,
            sha,
            now_iso,
            skill_id,
        ),
    )
    conn.commit()


def update_skill_path(conn, skill_id, skill_path):
    cursor = conn.cursor()
    cursor.execute(
        f"""
        UPDATE {PG_SCHEMA}.skills
        SET skillpath = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """,
        (skill_path, skill_id),
    )
    conn.commit()


def insert_skill(
    conn,
    skill_name,
    from_repo,
    skill_path,
    stars,
    download_url,
    skill_md_content,
    file_tree,
    how_to_install,
    sha,
    now_iso,
):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO {schema}.skills (
            skill_name,
            fromrepo,
            skillpath,
            repostars,
            download_url,
            skill_md_content,
            file_tree,
            how_to_install,
            skill_md_sha,
            skill_md_last_checked_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """.format(
            schema=PG_SCHEMA
        ),
        (
            skill_name,
            from_repo,
            skill_path,
            stars,
            download_url,
            skill_md_content,
            file_tree,
            how_to_install,
            sha,
            now_iso,
        ),
    )
    conn.commit()
    return cursor.fetchone()[0]


def delete_skill(conn, skill_id):
    cursor = conn.cursor()
    cursor.execute(
        f"DELETE FROM {PG_SCHEMA}.skills WHERE id = %s",
        (skill_id,),
    )
    conn.commit()


async def analyze_skill(session, skill, semaphore, queue):
    try:
        skill_md_content = skill.get("skill_md_content") or ""
        skill_md_excerpt = truncate_text(skill_md_content, ANALYSIS_MAX_CHARS)
        description_en_existing = (skill.get("description_en") or "").strip()
        description_zh_existing = (skill.get("description_zh") or "").strip()
        if description_en_existing and contains_chinese(description_en_existing):
            description_en_existing = ""
        if description_zh_existing and not contains_chinese(description_zh_existing):
            description_zh_existing = ""
        description_for_prompt = description_zh_existing or description_en_existing

        tags = None
        category = None
        tagline = None
        use_case = None
        description_en = description_en_existing or None
        description_zh = description_zh_existing or None

        if skill_md_excerpt or description_for_prompt:
            try:
                prompt = build_tag_category_prompt(
                    skill["skill_name"], description_for_prompt, skill_md_excerpt
                )
                response = await call_llm_with_semaphore(session, prompt, semaphore)
                payload = parse_json_payload(response["choices"][0]["message"]["content"])
                if payload:
                    parsed = json.loads(payload)
                    tags = sanitize_tags(parsed.get("tags"))
                    category = sanitize_category(
                        parsed.get("category") or parsed.get("categories")
                    )
            except Exception as e:
                await log(
                    f"标签分类解析失败: {skill['skill_name']}, 错误: {str(e)}",
                    level="ERROR",
                )

            try:
                prompt = build_tagline_use_case_prompt(
                    skill["skill_name"], description_for_prompt, skill_md_excerpt
                )
                response = await call_llm_with_semaphore(session, prompt, semaphore)
                payload = parse_json_payload(response["choices"][0]["message"]["content"])
                if payload:
                    parsed = json.loads(payload)
                    tagline = normalize_tagline(parsed.get("tagline"))
                    use_case = sanitize_use_case(parsed.get("use_case"))
            except Exception as e:
                await log(
                    f"标语用例解析失败: {skill['skill_name']}, 错误: {str(e)}",
                    level="ERROR",
                )

        if not description_en and not description_zh:
            if skill_md_excerpt:
                try:
                    description_zh = await generate_description_zh(
                        session, skill_md_excerpt, semaphore
                    )
                    description_en = await generate_description_en(
                        session, skill_md_excerpt, semaphore
                    )
                except Exception as e:
                    await log(
                        f"描述生成失败: {skill['skill_name']}, 错误: {str(e)}",
                        level="ERROR",
                    )

        try:
            if description_zh and not description_en:
                description_en = await translate_description_en(
                    session, description_zh, semaphore
                )
            if description_en and not description_zh:
                description_zh = await translate_description_zh(
                    session, description_en, semaphore
                )
        except Exception as e:
            await log(
                f"描述翻译失败: {skill['skill_name']}, 错误: {str(e)}",
                level="ERROR",
            )

        skill_md_translation = None
        if skill_md_content:
            try:
                skill_md_translation = await translate_skill_md_content(
                    session, skill_md_content, semaphore
                )
            except Exception as e:
                await log(
                    f"SKILL.md 翻译失败: {skill['skill_name']}, 错误: {str(e)}",
                    level="ERROR",
                )

        tags_value = None
        if tags is not None:
            tags_value = json.dumps(tags, ensure_ascii=False)
        tagline_value = tagline if tagline else None
        use_case_value = use_case if use_case else None
        category_value = category if category else None
        if description_en and contains_chinese(description_en):
            description_en = None
        if description_zh and not contains_chinese(description_zh):
            description_zh = None
        if description_en == "":
            description_en = None
        if description_zh == "":
            description_zh = None

        await queue.put(
            {
                "id": skill["id"],
                "tagline": tagline_value,
                "tags": tags_value,
                "categories": category_value,
                "description_en": description_en,
                "description_zh": description_zh,
                "use_case": use_case_value,
                "skill_md_content_translation": skill_md_translation,
            }
        )
    except Exception as e:
        await log(f"分析失败: {skill['skill_name']}, 错误: {str(e)}", level="ERROR")


async def analysis_writer(queue, pg_config):
    conn = get_pg_connection(pg_config, autocommit=False)
    cursor = conn.cursor()
    pending = 0
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        try:
            fields = []
            values = []
            verify_fields = {}
            for field in (
                "tagline",
                "tags",
                "categories",
                "description_en",
                "description_zh",
                "use_case",
                "skill_md_content_translation",
            ):
                if item.get(field) is not None:
                    fields.append(f"{field} = %s")
                    value = item.get(field)
                    values.append(value)
                    verify_fields[field] = value

            if fields:
                values.append(item.get("id"))
                cursor.execute(
                    f"""
                    UPDATE {PG_SCHEMA}.skills
                    SET {", ".join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    values,
                )
                if VERIFY_DB_WRITE:
                    actual_fields = verify_db_update(
                        cursor, item.get("id"), verify_fields
                    )
                    await log(
                        f"校验写入 id={item.get('id')} {format_verify_fields(actual_fields)}"
                    )
                pending += 1
                if pending >= PG_COMMIT_EVERY:
                    conn.commit()
                    pending = 0
        except Exception as e:
            conn.rollback()
            await log(f"保存分析结果时出错: {str(e)}", level="ERROR")
            if isinstance(e, UpdateVerificationError):
                raise
        finally:
            queue.task_done()
    if pending:
        conn.commit()
    cursor.close()
    conn.close()


async def translation_writer(queue, pg_config):
    conn = get_pg_connection(pg_config, autocommit=False)
    cursor = conn.cursor()
    pending = 0
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        try:
            fields = []
            values = []
            verify_fields = {}
            if item.get("tags_en") is not None:
                fields.append("tags_en = %s")
                value = item.get("tags_en")
                values.append(value)
                verify_fields["tags_en"] = value
            if item.get("use_case_en") is not None:
                fields.append("use_case_en = %s")
                value = item.get("use_case_en")
                values.append(value)
                verify_fields["use_case_en"] = value
            if fields:
                values.append(item.get("id"))
                cursor.execute(
                    f"""
                    UPDATE {PG_SCHEMA}.skills
                    SET {", ".join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    values,
                )
                if VERIFY_DB_WRITE:
                    actual_fields = verify_db_update(
                        cursor, item.get("id"), verify_fields
                    )
                    await log(
                        f"校验写入 id={item.get('id')} {format_verify_fields(actual_fields)}"
                    )
                pending += 1
                if pending >= PG_COMMIT_EVERY:
                    conn.commit()
                    pending = 0
        except Exception as e:
            conn.rollback()
            await log(f"保存翻译结果时出错: {str(e)}", level="ERROR")
            if isinstance(e, UpdateVerificationError):
                raise
        finally:
            queue.task_done()
    if pending:
        conn.commit()
    cursor.close()
    conn.close()


async def description_writer(queue, pg_config):
    conn = get_pg_connection(pg_config, autocommit=False)
    cursor = conn.cursor()
    pending = 0
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        try:
            fields = []
            values = []
            verify_fields = {}
            if item.get("description_en") is not None:
                fields.append("description_en = %s")
                value = item.get("description_en")
                values.append(value)
                verify_fields["description_en"] = value
            if item.get("description_zh") is not None:
                fields.append("description_zh = %s")
                value = item.get("description_zh")
                values.append(value)
                verify_fields["description_zh"] = value
            if item.get("use_case") is not None:
                fields.append("use_case = %s")
                value = item.get("use_case")
                values.append(value)
                verify_fields["use_case"] = value
            if item.get("use_case_en") is not None:
                fields.append("use_case_en = %s")
                value = item.get("use_case_en")
                values.append(value)
                verify_fields["use_case_en"] = value
            if item.get("tagline") is not None:
                fields.append("tagline = %s")
                value = item.get("tagline")
                values.append(value)
                verify_fields["tagline"] = value
            if item.get("skill_md_content_translation") is not None:
                fields.append("skill_md_content_translation = %s")
                value = item.get("skill_md_content_translation")
                values.append(value)
                verify_fields["skill_md_content_translation"] = value
            if fields:
                values.append(item.get("id"))
                cursor.execute(
                    f"""
                    UPDATE {PG_SCHEMA}.skills
                    SET {", ".join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    values,
                )
                if VERIFY_DB_WRITE:
                    actual_fields = verify_db_update(
                        cursor, item.get("id"), verify_fields
                    )
                    await log(
                        f"校验写入 id={item.get('id')} {format_verify_fields(actual_fields)}"
                    )
                pending += 1
                if pending >= PG_COMMIT_EVERY:
                    conn.commit()
                    pending = 0
        except Exception as e:
            conn.rollback()
            await log(f"保存描述回填失败: {str(e)}", level="ERROR")
            if isinstance(e, UpdateVerificationError):
                raise
        finally:
            queue.task_done()
    if pending:
        conn.commit()
    cursor.close()
    conn.close()


async def run_llm_updates(skills, pg_config):
    if not skills:
        return

    total = len(skills)
    await log(f"需要分析的skills: {total}")

    semaphore = asyncio.Semaphore(LLM_MAX_CONCURRENT)
    queue = asyncio.Queue()
    writer_task = asyncio.create_task(analysis_writer(queue, pg_config))
    progress = AnalysisProgress(total)

    async with aiohttp.ClientSession() as session:
        async def worker(task_queue):
            while True:
                skill = await task_queue.get()
                if skill is None:
                    task_queue.task_done()
                    break
                skill_id = skill.get("id")
                try:
                    await asyncio.wait_for(
                        analyze_skill(session, skill, semaphore, queue),
                        timeout=ANALYSIS_TASK_TIMEOUT,
                    )
                    await progress.tick(skill_id, "updated")
                except asyncio.TimeoutError:
                    await log(
                        f"分析超时: id={skill_id}, timeout={ANALYSIS_TASK_TIMEOUT}s",
                        level="ERROR",
                    )
                    await progress.tick(skill_id, "failed")
                except Exception as e:
                    await log(
                        f"分析失败: id={skill_id}, 错误: {str(e)}",
                        level="ERROR",
                    )
                    await progress.tick(skill_id, "failed")
                finally:
                    task_queue.task_done()

        await run_worker_pool(skills, worker, LLM_MAX_CONCURRENT)

    await queue.join()
    await queue.put(None)
    await writer_task


class AnalysisProgress:
    def __init__(self, total):
        self.total = total
        self.completed = 0
        self.failed = 0
        self.lock = asyncio.Lock()

    async def tick(self, skill_id, status):
        async with self.lock:
            self.completed += 1
            if status == "failed":
                self.failed += 1
            await log(
                f"分析进度 {self.completed}/{self.total} "
                f"(failed={self.failed}) id={skill_id} {status}"
            )


class RepoProgress:
    def __init__(self, total, label):
        self.total = total
        self.label = label
        self.completed = 0
        self.lock = asyncio.Lock()

    async def tick(self, repo_name):
        async with self.lock:
            self.completed += 1
            await log(f"{self.label} {self.completed}/{self.total}: {repo_name}")


class TranslationProgress:
    def __init__(self, total):
        self.total = total
        self.completed = 0
        self.skipped = 0
        self.failed = 0
        self.lock = asyncio.Lock()

    async def tick(self, skill_id, status):
        async with self.lock:
            self.completed += 1
            if status == "skipped":
                self.skipped += 1
            elif status == "failed":
                self.failed += 1
            await log(
                f"翻译进度 {self.completed}/{self.total} "
                f"(skipped={self.skipped}, failed={self.failed}) id={skill_id} {status}"
            )


class DescriptionProgress:
    def __init__(self, total):
        self.total = total
        self.completed = 0
        self.skipped = 0
        self.failed = 0
        self.lock = asyncio.Lock()

    async def tick(self, skill_id, status):
        async with self.lock:
            self.completed += 1
            if status == "skipped":
                self.skipped += 1
            elif status == "failed":
                self.failed += 1
            await log(
                f"描述回填进度 {self.completed}/{self.total} "
                f"(skipped={self.skipped}, failed={self.failed}) id={skill_id} {status}"
            )


class DescriptionFixProgress:
    def __init__(self, total):
        self.total = total
        self.completed = 0
        self.skipped = 0
        self.failed = 0
        self.lock = asyncio.Lock()

    async def tick(self, skill_id, status):
        async with self.lock:
            self.completed += 1
            if status == "skipped":
                self.skipped += 1
            elif status == "failed":
                self.failed += 1
            await log(
                f"描述中文修复进度 {self.completed}/{self.total} "
                f"(skipped={self.skipped}, failed={self.failed}) id={skill_id} {status}"
            )


class ValidationProgress:
    def __init__(self, total):
        self.total = total
        self.completed = 0
        self.updated = 0
        self.failed = 0
        self.lock = asyncio.Lock()

    async def tick(self, skill_id, status):
        async with self.lock:
            self.completed += 1
            if status == "updated":
                self.updated += 1
            elif status == "failed":
                self.failed += 1
            await log(
                f"验证回填进度 {self.completed}/{self.total} "
                f"(updated={self.updated}, failed={self.failed}) id={skill_id} {status}"
            )


async def translate_skill(session, row, semaphore, queue, progress):
    skill_id, tags_raw, use_case_raw, tags_en_existing, use_case_en_existing = row
    tags_list = parse_tags(tags_raw)
    use_cases_list = split_use_case(use_case_raw)

    need_tags = not (tags_en_existing and str(tags_en_existing).strip())
    need_use_case = not (use_case_en_existing and str(use_case_en_existing).strip())

    if need_tags and not tags_list and need_use_case and not use_cases_list:
        await progress.tick(skill_id, "skipped")
        return
    if not need_tags and not need_use_case:
        await progress.tick(skill_id, "skipped")
        return

    tags_input = tags_list if need_tags else []
    use_cases_input = use_cases_list if need_use_case else []
    if not tags_input and not use_cases_input:
        await progress.tick(skill_id, "skipped")
        return

    prompt = build_translation_prompt(tags_input, use_cases_input)
    try:
        response = await call_llm_with_semaphore(session, prompt, semaphore)
        result_text = response["choices"][0]["message"]["content"]
        payload = extract_json_payload(result_text) or result_text.strip()
        result = json.loads(payload)
    except LLMRetryExceeded:
        await log(f"翻译重试上限，跳过: id={skill_id}", level="WARN")
        await progress.tick(skill_id, "skipped")
        return
    except Exception as e:
        await log(f"翻译失败: id={skill_id}, 错误: {str(e)}", level="ERROR")
        await progress.tick(skill_id, "failed")
        return

    tags_en_list = (
        coerce_en_list(result.get("tags_en"), len(tags_input), r"[,\n;；|，]+")
        if need_tags
        else []
    )
    use_case_en_list = (
        coerce_en_list(
            result.get("use_case_en"),
            len(use_cases_input),
            r"[；;\n]+",
            allow_merge=True,
        )
        if need_use_case
        else []
    )

    if need_tags and (tags_en_list is None or len(tags_en_list) != len(tags_input)):
        await log(f"Invalid tags_en for id={skill_id}", level="ERROR")
        await progress.tick(skill_id, "failed")
        return
    if need_use_case and (
        use_case_en_list is None or len(use_case_en_list) != len(use_cases_input)
    ):
        await log(f"Invalid use_case_en for id={skill_id}", level="ERROR")
        await progress.tick(skill_id, "failed")
        return

    update = {"id": skill_id}
    if need_tags:
        update["tags_en"] = json.dumps(tags_en_list, ensure_ascii=False)
    if need_use_case:
        update["use_case_en"] = "；".join(use_case_en_list)

    await queue.put(update)
    await progress.tick(skill_id, "updated")


async def backfill_description(session, row, semaphore, queue, progress):
    skill_id, description_en_raw, description_zh_raw, skill_md_content = row
    description_en_existing = (description_en_raw or "").strip()
    description_zh_existing = (description_zh_raw or "").strip()
    force_clear_zh = False
    if description_en_existing and contains_chinese(description_en_existing):
        description_en_existing = ""
    if description_zh_existing and not contains_chinese(description_zh_existing):
        description_zh_existing = ""
        force_clear_zh = True

    need_en = not description_en_existing
    need_zh = not description_zh_existing

    if not need_en and not need_zh:
        await progress.tick(skill_id, "skipped")
        return

    description_en = description_en_existing
    description_zh = description_zh_existing

    try:
        if not description_en_existing and not description_zh_existing:
            if not skill_md_content:
                await progress.tick(skill_id, "skipped")
                return
            excerpt = truncate_text(skill_md_content, ANALYSIS_MAX_CHARS)
            if need_zh:
                description_zh = await generate_description_zh(
                    session, excerpt, semaphore
                )
            if need_en:
                description_en = await generate_description_en(
                    session, excerpt, semaphore
                )
        else:
            if need_zh and description_en_existing:
                description_zh = await translate_description_zh(
                    session, description_en_existing, semaphore
                )
            if need_en and description_zh_existing:
                description_en = await translate_description_en(
                    session, description_zh_existing, semaphore
                )
            if (need_zh and not description_zh) or (need_en and not description_en):
                if skill_md_content:
                    excerpt = truncate_text(skill_md_content, ANALYSIS_MAX_CHARS)
                    if need_zh and not description_zh:
                        description_zh = await generate_description_zh(
                            session, excerpt, semaphore
                        )
                    if need_en and not description_en:
                        description_en = await generate_description_en(
                            session, excerpt, semaphore
                        )
    except LLMRetryExceeded:
        await log(f"描述回填重试上限，跳过: id={skill_id}", level="WARN")
        await progress.tick(skill_id, "skipped")
        return
    except Exception as e:
        await log(f"描述回填失败: id={skill_id}, 错误: {str(e)}", level="ERROR")
        await progress.tick(skill_id, "failed")
        return

    if description_en and contains_chinese(description_en):
        description_en = ""
    if description_zh and not contains_chinese(description_zh):
        description_zh = ""

    update = {"id": skill_id}
    if need_en and description_en:
        update["description_en"] = description_en
    if need_zh and description_zh:
        update["description_zh"] = description_zh
    if force_clear_zh and not description_zh:
        update["description_zh"] = ""

    update = drop_empty_updates(update)
    if len(update) == 1:
        await progress.tick(skill_id, "skipped")
        return

    await queue.put(update)
    await progress.tick(skill_id, "updated")


async def run_description_backfill(pg_config):
    conn = get_pg_connection(pg_config)
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT id, description_en, description_zh, skill_md_content
        FROM {PG_SCHEMA}.skills
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    candidates = []
    for row in rows:
        _, description_en_raw, description_zh_raw, _ = row
        description_en = (description_en_raw or "").strip()
        description_zh = (description_zh_raw or "").strip()
        if not description_en or not description_zh:
            candidates.append(row)
            continue
        if description_en and contains_chinese(description_en):
            candidates.append(row)
            continue
        if description_zh and not contains_chinese(description_zh):
            candidates.append(row)
            continue

    total = len(candidates)
    if total == 0:
        await log("无需回填描述。")
        return

    await log(f"需要回填描述的记录: {total}")

    semaphore = asyncio.Semaphore(LLM_MAX_CONCURRENT)
    queue = asyncio.Queue()
    writer_task = asyncio.create_task(description_writer(queue, pg_config))
    progress = DescriptionProgress(total)

    async with aiohttp.ClientSession() as session:
        async def worker(task_queue):
            while True:
                row = await task_queue.get()
                if row is None:
                    task_queue.task_done()
                    break
                skill_id = row[0]
                try:
                    await asyncio.wait_for(
                        backfill_description(session, row, semaphore, queue, progress),
                        timeout=DESCRIPTION_TASK_TIMEOUT,
                    )
                except asyncio.TimeoutError:
                    await log(
                        f"描述回填超时: id={skill_id}, timeout={DESCRIPTION_TASK_TIMEOUT}s",
                        level="ERROR",
                    )
                    await progress.tick(skill_id, "failed")
                finally:
                    task_queue.task_done()

        await run_worker_pool(candidates, worker, LLM_MAX_CONCURRENT)

    await queue.join()
    await queue.put(None)
    await writer_task


async def fix_description_zh(session, row, semaphore, queue, progress):
    skill_id, description_en = row
    if not description_en:
        await progress.tick(skill_id, "skipped")
        return
    try:
        description_zh = await translate_description_zh(
            session, description_en, semaphore
        )
    except LLMRetryExceeded:
        await log(f"描述中文修复重试上限，跳过: id={skill_id}", level="WARN")
        await progress.tick(skill_id, "skipped")
        return
    except Exception as e:
        await log(f"描述中文修复失败: id={skill_id}, 错误: {str(e)}", level="ERROR")
        await progress.tick(skill_id, "failed")
        return
    if not description_zh:
        await progress.tick(skill_id, "failed")
        return
    await queue.put({"id": skill_id, "description_zh": description_zh})
    await progress.tick(skill_id, "updated")


async def run_description_zh_fix(pg_config):
    conn = get_pg_connection(pg_config, autocommit=False)
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT id, description_en, description_zh
        FROM {PG_SCHEMA}.skills
        WHERE description_zh IS NOT NULL AND description_zh != ''
        """
    )
    rows = cursor.fetchall()
    candidates = []
    for skill_id, description_en, description_zh in rows:
        if description_zh and not contains_chinese(description_zh):
            candidates.append((skill_id, description_en or ""))

    if not candidates:
        cursor.close()
        conn.close()
        await log("无需修复 description_zh。")
        return

    cursor.executemany(
        f"UPDATE {PG_SCHEMA}.skills SET description_zh = '' WHERE id = %s",
        [(row[0],) for row in candidates],
    )
    conn.commit()
    cursor.close()
    conn.close()

    total = len(candidates)
    await log(f"需要修复 description_zh 的记录: {total}")

    semaphore = asyncio.Semaphore(LLM_MAX_CONCURRENT)
    queue = asyncio.Queue()
    writer_task = asyncio.create_task(description_writer(queue, pg_config))
    progress = DescriptionFixProgress(total)

    async with aiohttp.ClientSession() as session:
        async def worker(task_queue):
            while True:
                row = await task_queue.get()
                if row is None:
                    task_queue.task_done()
                    break
                skill_id = row[0]
                try:
                    await asyncio.wait_for(
                        fix_description_zh(session, row, semaphore, queue, progress),
                        timeout=DESCRIPTION_TASK_TIMEOUT,
                    )
                except asyncio.TimeoutError:
                    await log(
                        f"描述中文修复超时: id={skill_id}, timeout={DESCRIPTION_TASK_TIMEOUT}s",
                        level="ERROR",
                    )
                    await progress.tick(skill_id, "failed")
                finally:
                    task_queue.task_done()

        await run_worker_pool(candidates, worker, LLM_MAX_CONCURRENT)

    await queue.join()
    await queue.put(None)
    await writer_task


async def run_translation_updates(pg_config):
    conn = get_pg_connection(pg_config)
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT id, tags, use_case, tags_en, use_case_en
        FROM {PG_SCHEMA}.skills
        WHERE
            ((tags_en IS NULL OR tags_en = '') AND (tags IS NOT NULL AND tags != ''))
            OR ((use_case_en IS NULL OR use_case_en = '') AND (use_case IS NOT NULL AND use_case != ''))
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    total = len(rows)
    if total == 0:
        await log("无需翻译的记录。")
        return

    await log(f"需要翻译的记录: {total}")

    semaphore = asyncio.Semaphore(LLM_MAX_CONCURRENT)
    queue = asyncio.Queue()
    writer_task = asyncio.create_task(translation_writer(queue, pg_config))
    progress = TranslationProgress(total)

    async with aiohttp.ClientSession() as session:
        async def worker(task_queue):
            while True:
                row = await task_queue.get()
                if row is None:
                    task_queue.task_done()
                    break
                skill_id = row[0]
                try:
                    await asyncio.wait_for(
                        translate_skill(session, row, semaphore, queue, progress),
                        timeout=TRANSLATION_TASK_TIMEOUT,
                    )
                except asyncio.TimeoutError:
                    await log(
                        f"翻译超时: id={skill_id}, timeout={TRANSLATION_TASK_TIMEOUT}s",
                        level="ERROR",
                    )
                    await progress.tick(skill_id, "failed")
                finally:
                    task_queue.task_done()

        await run_worker_pool(rows, worker, LLM_MAX_CONCURRENT)

    await queue.join()
    await queue.put(None)
    await writer_task


async def validate_backfill_skill(session, row, semaphore, queue, progress):
    (
        skill_id,
        skill_name,
        skill_md_content,
        description_en,
        description_zh,
        tagline,
        use_case,
        use_case_en,
        translation,
    ) = row
    skill_md_content = skill_md_content or ""
    too_large = False
    if SKILL_MD_MAX_BYTES and skill_md_content:
        too_large = len(skill_md_content.encode("utf-8")) > SKILL_MD_MAX_BYTES
    too_large_translation = False
    if SKILL_MD_TRANSLATION_MAX_CHARS and skill_md_content:
        too_large_translation = (
            len(skill_md_content) > SKILL_MD_TRANSLATION_MAX_CHARS
        )

    description_en = description_en or ""
    description_zh = description_zh or ""
    tagline = tagline or ""

    need_desc_en = not description_en.strip()
    need_desc_zh = not description_zh.strip()
    need_use_case = not use_case or not str(use_case).strip()
    need_use_case_en = not use_case_en or not str(use_case_en).strip()
    translation_text = (translation or "").strip()
    translation_placeholder = is_skill_md_translation_placeholder(translation_text)
    need_translation = (
        not translation_text or (translation_placeholder and not too_large_translation)
    )
    need_tagline = not tagline.strip()

    update = {"id": skill_id}

    excerpt = ""
    if skill_md_content and not too_large:
        excerpt = truncate_text(skill_md_content, ANALYSIS_MAX_CHARS)

    try:
        if need_desc_en and need_desc_zh:
            if too_large or not excerpt:
                update["description_en"] = DESC_EN_TOO_LARGE
                update["description_zh"] = DESC_ZH_TOO_LARGE
            else:
                update["description_zh"] = await generate_description_zh(
                    session, excerpt, semaphore
                )
                update["description_en"] = await generate_description_en(
                    session, excerpt, semaphore
                )
        elif need_desc_en and description_zh:
            update["description_en"] = await translate_description_en(
                session, description_zh, semaphore
            )
        elif need_desc_zh and description_en:
            update["description_zh"] = await translate_description_zh(
                session, description_en, semaphore
            )

        if need_tagline:
            desc_for_tagline = ""
            desc_zh_value = update.get("description_zh") or description_zh
            desc_en_value = update.get("description_en") or description_en
            if desc_zh_value and contains_chinese(desc_zh_value):
                desc_for_tagline = desc_zh_value
            elif desc_en_value and contains_latin(desc_en_value) and not contains_chinese(desc_en_value):
                desc_for_tagline = desc_en_value

            tagline_context = desc_for_tagline or excerpt
            if tagline_context:
                generated_tagline = await generate_tagline(
                    session,
                    skill_name or str(skill_id),
                    desc_for_tagline,
                    tagline_context if not desc_for_tagline else "",
                    semaphore,
                )
                if generated_tagline:
                    update["tagline"] = generated_tagline

        if need_use_case and need_use_case_en:
            if too_large or not excerpt:
                update["use_case"] = USE_CASE_ZH_TOO_LARGE
                update["use_case_en"] = USE_CASE_EN_TOO_LARGE
            else:
                use_case_generated = await generate_use_case_zh(
                    session, excerpt, semaphore
                )
                if use_case_generated:
                    update["use_case"] = use_case_generated
                    update["use_case_en"] = await translate_use_case_en(
                        session, use_case_generated, semaphore
                    )
        elif need_use_case and use_case_en:
            update["use_case"] = await translate_use_case_zh(
                session, use_case_en, semaphore
            )
        elif need_use_case_en and use_case:
            update["use_case_en"] = await translate_use_case_en(
                session, use_case, semaphore
            )

        if need_translation:
            if not skill_md_content:
                update["skill_md_content_translation"] = ""
            elif too_large_translation:
                update["skill_md_content_translation"] = SKILL_MD_TOO_LARGE_NOTICE
            elif excerpt:
                update["skill_md_content_translation"] = await translate_skill_md_content(
                    session, skill_md_content, semaphore
                )
    except LLMRetryExceeded:
        await log(f"验证回填重试上限，跳过: id={skill_id}", level="WARN")
        await progress.tick(skill_id, "skipped")
        return
    except Exception as exc:
        await log(f"验证回填失败: id={skill_id}, 错误: {exc}", level="ERROR")
        await progress.tick(skill_id, "failed")
        return

    update = drop_empty_updates(update)
    if len(update) == 1:
        await progress.tick(skill_id, "skipped")
        return

    await queue.put(update)
    await progress.tick(skill_id, "updated")


async def run_validation_backfill(pg_config):
    conn = get_pg_connection(pg_config)
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT id, skill_name, skill_md_content, description_en, description_zh, tagline, use_case, use_case_en, skill_md_content_translation
        FROM {PG_SCHEMA}.skills
        WHERE
            (description_en IS NULL OR description_en = '')
            OR (description_zh IS NULL OR description_zh = '')
            OR (tagline IS NULL OR tagline = '')
            OR (use_case IS NULL OR use_case = '')
            OR (use_case_en IS NULL OR use_case_en = '')
            OR (skill_md_content_translation IS NULL OR skill_md_content_translation = '')
            OR (skill_md_content_translation = %s)
        """,
        (SKILL_MD_TOO_LARGE_NOTICE,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    total = len(rows)
    if total == 0:
        await log("验证回填：无需处理。")
        return

    await log(f"验证回填：需要处理 {total} 条记录")

    semaphore = asyncio.Semaphore(VALIDATION_MAX_CONCURRENT)
    queue = asyncio.Queue()
    writer_task = asyncio.create_task(description_writer(queue, pg_config))
    progress = ValidationProgress(total)

    async with aiohttp.ClientSession() as session:
        async def worker(task_queue):
            while True:
                row = await task_queue.get()
                if row is None:
                    task_queue.task_done()
                    break
                skill_id = row[0]
                try:
                    await asyncio.wait_for(
                        validate_backfill_skill(session, row, semaphore, queue, progress),
                        timeout=VALIDATION_TASK_TIMEOUT,
                    )
                except asyncio.TimeoutError:
                    await log(
                        f"验证回填超时: id={skill_id}, timeout={VALIDATION_TASK_TIMEOUT}s",
                        level="ERROR",
                    )
                    await progress.tick(skill_id, "failed")
                finally:
                    task_queue.task_done()

        await run_worker_pool(rows, worker, VALIDATION_MAX_CONCURRENT)

    await queue.join()
    await queue.put(None)
    await writer_task


async def run_skillpath_backfill(pg_config):
    conn = get_pg_connection(pg_config)
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT id, skill_name, fromrepo
        FROM {PG_SCHEMA}.skills
        WHERE skillpath IS NULL
        ORDER BY id
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    if not rows:
        await log("skillpath 回填：无需处理。")
        return

    repo_map = {}
    for skill_id, skill_name, from_repo in rows:
        repo_name = get_repo_name(skill_name, from_repo)
        if not repo_name:
            continue
        repo_map.setdefault(repo_name, []).append(
            {"id": skill_id, "skill_name": skill_name, "from_repo": from_repo}
        )

    total_repos = len(repo_map)
    await log(
        f"skillpath 回填：需要处理 {len(rows)} 条记录，涉及 {total_repos} 个仓库"
    )

    progress = RepoProgress(total_repos, "skillpath回填进度")

    async def fix_repo(repo_name, records):
        clone_dir = None
        try:
            clone_dir = await asyncio.to_thread(
                clone_repo_default_branch, repo_name, records[0].get("from_repo")
            )
            file_paths = await asyncio.to_thread(list_repo_files, clone_dir)
            skill_entries = await asyncio.to_thread(
                collect_skill_entries, clone_dir, file_paths, repo_name=repo_name
            )
            if not skill_entries:
                await log(f"skillpath 回填：仓库无 SKILL.md: {repo_name}", level="WARN")
                return
        except Exception as exc:
            await log(
                f"skillpath 回填：克隆或读取失败: {repo_name}, 错误: {exc}",
                level="WARN",
            )
            return
        finally:
            if clone_dir:
                await asyncio.to_thread(shutil.rmtree, clone_dir, True)

        candidates = build_skillpath_candidates(repo_name, skill_entries)
        updates = []
        skipped = 0
        for record in records:
            skill_name = record["skill_name"] or ""
            skill_short = skill_name.split(":", 1)[1] if ":" in skill_name else ""
            candidate_path = select_skillpath_candidate(skill_short, candidates)
            if candidate_path is None:
                skipped += 1
                continue
            updates.append((candidate_path, record["id"]))

        if updates:
            conn = get_pg_connection(pg_config)
            cursor = conn.cursor()
            cursor.executemany(
                f"""
                UPDATE {PG_SCHEMA}.skills
                SET skillpath = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                updates,
            )
            conn.commit()
            cursor.close()
            conn.close()
        await log(
            f"skillpath 回填：{repo_name} updated={len(updates)} skipped={skipped}"
        )

    async def worker(task_queue):
        while True:
            item = await task_queue.get()
            if item is None:
                task_queue.task_done()
                break
            repo_name, records = item
            try:
                await fix_repo(repo_name, records)
            finally:
                await progress.tick(repo_name)
                task_queue.task_done()

    await run_worker_pool(
        list(repo_map.items()),
        worker,
        min(SKILLPATH_FIX_CONCURRENT, max(total_repos, 1)),
    )


async def process_repo(
    session,
    pg_config,
    repo_name,
    repo_data,
    now_iso,
    cutoff_dt=None,
    repo_info=None,
    enforce_skill_limit=False,
):
    if repo_info is None:
        repo_info = await fetch_repo_info(session, repo_name)
    if repo_info and repo_info.get("error") == "unauthorized":
        await log(f"跳过仓库（GitHub 认证失败）: {repo_name}", level="WARN")
        return []
    if repo_info and repo_info.get("error") == "not_found":
        conn = get_pg_connection(pg_config, autocommit=True)
        records = []
        for items in (repo_data.get("skills") or {}).values():
            records.extend(items)
        if records:
            for record in records:
                delete_skill(conn, record["id"])
            await log(f"仓库不存在或不可访问，已删除其所有 skill: {repo_name}", level="WARN")
        else:
            await log(f"获取仓库信息失败，跳过: {repo_name}", level="WARN")
        conn.close()
        return []
    if not repo_info or (repo_info and repo_info.get("error")):
        await log(f"获取仓库信息失败，跳过: {repo_name}", level="WARN")
        return []

    conn = get_pg_connection(pg_config, autocommit=True)
    try:
        default_branch = repo_info["default_branch"]
        stars = repo_info["stars"]
        from_repo = repo_info["html_url"]
        pushed_at = parse_github_datetime(repo_info.get("pushed_at"))
        size_kb = repo_info.get("size_kb")

        update_repo_stars(conn, repo_name, stars)

        if cutoff_dt and pushed_at and pushed_at <= cutoff_dt:
            await log(
                f"跳过仓库（无新提交）: {repo_name}, pushed_at={pushed_at.isoformat()}",
                level="INFO",
            )
            return []

        clone_dir = None
        try:
            use_shallow = True
            if isinstance(size_kb, int):
                use_shallow = size_kb > REPO_SIZE_FULL_CLONE_MAX_KB
            mode = "浅克隆" if use_shallow else "普通克隆"
            await log(
                f"子进度: {repo_name} 开始克隆 ({mode}, size_kb={size_kb})"
            )
            clone_dir = await asyncio.to_thread(
                clone_repo,
                repo_name,
                from_repo,
                default_branch,
                shallow=use_shallow,
            )
            await log(f"子进度: {repo_name} 克隆完成")
            await log(f"子进度: {repo_name} 列出文件")
            file_paths = await asyncio.to_thread(list_repo_files, clone_dir)
            await log(f"子进度: {repo_name} 读取 SKILL.md")
            skill_entries = await asyncio.to_thread(
                collect_skill_entries,
                clone_dir,
                file_paths,
                repo_name=repo_name,
                max_skills=MAX_SKILLS_PER_REPO if enforce_skill_limit else None,
            )
            await log(f"子进度: {repo_name} 读取 SKILL.md 完成")
            if skill_entries is None:
                await log(
                    f"SKILL.md 数量超过阈值，跳过仓库: {repo_name}",
                    level="WARN",
                )
                return []
        except TimeoutError as e:
            await log(f"子进度超时，跳过仓库: {repo_name}, 错误: {str(e)}", level="WARN")
            return []
        except Exception as e:
            await log(f"克隆或读取仓库失败: {repo_name}, 错误: {str(e)}", level="ERROR")
            return []
        finally:
            if clone_dir:
                await asyncio.to_thread(shutil.rmtree, clone_dir, True)

        existing_skills = repo_data.get("skills", {})
        to_update_llm = []

        for skill_path, records in existing_skills.items():
            entry = skill_entries.get(skill_path)
            if not entry:
                for record in records:
                    delete_skill(conn, record["id"])
                    await log(f"已删除 skill: {record['skill_name']}")
                continue

            sha = entry.get("sha") or ""
            content = entry.get("content") or ""
            if entry.get("error"):
                await log(
                    f"SKILL.md 读取失败，跳过内容更新: {repo_name}:{skill_path}",
                    level="WARN",
                )
                for record in records:
                    update_skill_checked(conn, record["id"], now_iso, sha=sha or None)
                continue
            if entry.get("too_large"):
                await log(
                    f"SKILL.md 过大，跳过内容更新: {repo_name}:{skill_path}",
                    level="WARN",
                )
                for record in records:
                    update_skill_checked(conn, record["id"], now_iso, sha=sha or None)
                continue

            for record in records:
                if sha and sha == record.get("skill_md_sha"):
                    update_skill_checked(conn, record["id"], now_iso, sha=sha)
                    continue

                file_tree = build_file_tree_from_paths(file_paths, skill_path)
                download_url = build_download_url(from_repo, default_branch, skill_path)
                how_to_install = build_install_instructions(
                    from_repo, skill_path, download_url
                )

                if content == record.get("skill_md_content"):
                    update_skill_checked(conn, record["id"], now_iso, sha=sha)
                    continue

                update_skill_base(
                    conn,
                    record["id"],
                    from_repo,
                    skill_path,
                    stars,
                    download_url,
                    content,
                    file_tree,
                    how_to_install,
                    sha,
                    now_iso,
                )

                to_update_llm.append(
                    {
                        "id": record["id"],
                        "skill_name": record["skill_name"],
                        "description_en": record.get("description_en") or "",
                        "description_zh": record.get("description_zh") or "",
                        "skill_md_content": content,
                    }
                )

        for skill_path, entry in skill_entries.items():
            if skill_path in existing_skills:
                continue

            content = entry.get("content") or ""
            frontmatter, _ = parse_front_matter(content)
            skill_short_name = frontmatter.get("name", "").strip()
            if not skill_short_name:
                skill_short_name = (
                    os.path.basename(skill_path)
                    if skill_path
                    else repo_name.split("/")[-1]
                )

            cursor = conn.cursor()
            base_skill_name = f"{repo_name}:{skill_short_name}"
            skill_name = ensure_unique_skill_name(
                cursor, base_skill_name, repo_name, skill_path
            )
            cursor.close()

            file_tree = build_file_tree_from_paths(file_paths, skill_path)
            download_url = build_download_url(from_repo, default_branch, skill_path)
            how_to_install = build_install_instructions(
                from_repo, skill_path, download_url
            )
            sha = entry.get("sha") or ""

            skill_id = insert_skill(
                conn,
                skill_name,
                from_repo,
                skill_path,
                stars,
                download_url,
                content,
                file_tree,
                how_to_install,
                sha,
                now_iso,
            )

            await log(f"新增 skill: {skill_name}")
            if entry.get("too_large") or entry.get("error"):
                cursor = conn.cursor()
                cursor.execute(
                    f"""
                    UPDATE {PG_SCHEMA}.skills
                    SET skill_md_content_translation = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (SKILL_MD_TOO_LARGE_NOTICE, skill_id),
                )
                conn.commit()
                cursor.close()
            else:
                to_update_llm.append(
                    {
                        "id": skill_id,
                        "skill_name": skill_name,
                        "description_en": "",
                        "description_zh": "",
                        "skill_md_content": content,
                    }
                )

        return to_update_llm
    finally:
        conn.close()


async def main():
    pg_config = load_pg_config()
    await log(f"开始维护 Postgres (schema={PG_SCHEMA})...")

    conn = get_pg_connection(pg_config, autocommit=True)
    ensure_schema(conn)

    last_run = get_last_run(conn)
    if last_run:
        start_date = last_run.split("T")[0]
    else:
        start_date = START_PUSHED_DATE
    cutoff_dt = parse_last_run(last_run) or start_date_to_datetime(start_date)
    now = datetime.utcnow()
    now_iso = now.isoformat()

    if os.getenv("ONLY_VALIDATION", "0") == "1":
        await log("仅运行校验回填阶段 (ONLY_VALIDATION=1)")
        await run_validation_backfill(pg_config)
        await run_skillpath_backfill(pg_config)
        set_last_run(conn, now_iso)
        conn.close()
        await log("维护完成，已写入 Postgres。")
        try:
            if os.path.isdir(TEMP_CLONE_ROOT):
                shutil.rmtree(TEMP_CLONE_ROOT, ignore_errors=True)
                await log(f"已清理临时目录: {TEMP_CLONE_ROOT}")
        except OSError as e:
            await log(f"清理临时目录失败: {e}", level="WARN")
        return

    repo_map = load_existing_skills(conn)
    existing_repo_names = set(repo_map.keys())

    async with aiohttp.ClientSession() as session:
        await log(f"阶段 1/3：维护已有仓库，共 {len(existing_repo_names)} 个")
        to_update_llm = []
        to_update_lock = asyncio.Lock()
        rate_lock = asyncio.Lock()
        last_repo_start = {"ts": 0.0}

        async def repo_rate_limit():
            async with rate_lock:
                now_ts = time.monotonic()
                elapsed = now_ts - last_repo_start["ts"]
                if elapsed < REPO_REQUEST_INTERVAL:
                    await asyncio.sleep(REPO_REQUEST_INTERVAL - elapsed)
                last_repo_start["ts"] = time.monotonic()

        existing_repo_list = sorted(existing_repo_names)
        repo_infos = await fetch_repo_infos_batch(session, existing_repo_list)
        progress = RepoProgress(len(existing_repo_list), "维护进度")

        def make_repo_worker(progress_tracker, enforce_skill_limit):
            async def repo_worker(task_queue):
                while True:
                    item = await task_queue.get()
                    if item is None:
                        task_queue.task_done()
                        break
                    repo_name, repo_data, repo_info = item
                    try:
                        await repo_rate_limit()
                        await progress_tracker.tick(repo_name)
                        updates = await process_repo(
                            session,
                            pg_config,
                            repo_name,
                            repo_data,
                            now_iso,
                            cutoff_dt,
                            repo_info=repo_info,
                            enforce_skill_limit=enforce_skill_limit,
                        )
                        if updates:
                            async with to_update_lock:
                                to_update_llm.extend(updates)
                    except Exception as exc:
                        await log(
                            f"仓库处理失败: {repo_name}, 错误: {str(exc)}",
                            level="ERROR",
                        )
                    finally:
                        task_queue.task_done()
            return repo_worker

        await run_worker_pool(
            [
                (
                    repo_name,
                    repo_map.get(repo_name, {"from_repo": "", "skills": {}}),
                    repo_infos.get(repo_name),
                )
            for repo_name in existing_repo_list
            ],
            make_repo_worker(progress, False),
            min(REPO_CONCURRENT, max(len(existing_repo_list), 1)),
        )

        discovered_repo_names = set(existing_repo_names)
        await log(f"阶段 2/3：发现新仓库，共 {len(SEARCH_QUERIES)} 个查询")
        for query in SEARCH_QUERIES:
            full_query = f"{query} {BASE_FILTERS}"
            await log(f"搜索查询: {full_query}")
            await process_query_range(
                session,
                full_query,
                start_date,
                now.strftime("%Y-%m-%d"),
                discovered_repo_names,
            )

        new_repo_names = sorted(discovered_repo_names - existing_repo_names)
        await log(f"阶段 3/3：处理新仓库，共 {len(new_repo_names)} 个")
        new_repo_infos = await fetch_repo_infos_batch(session, new_repo_names)
        new_progress = RepoProgress(len(new_repo_names), "新增维护进度")

        await run_worker_pool(
            [
                (repo_name, {"from_repo": "", "skills": {}}, new_repo_infos.get(repo_name))
                for repo_name in new_repo_names
            ],
            make_repo_worker(new_progress, True),
            min(REPO_CONCURRENT, max(len(new_repo_names), 1)),
        )

        if os.getenv("ONLY_VALIDATION", "0") == "1":
            await log("仅运行校验回填阶段 (ONLY_VALIDATION=1)")
        else:
            await log(f"需要更新的skills: {len(to_update_llm)}")
            await run_llm_updates(to_update_llm, pg_config)
            await run_translation_updates(pg_config)
            await run_description_backfill(pg_config)
            await run_description_zh_fix(pg_config)

        await run_validation_backfill(pg_config)
        await run_skillpath_backfill(pg_config)

    set_last_run(conn, now_iso)
    conn.close()

    await log("维护完成，已写入 Postgres。")
    try:
        if os.path.isdir(TEMP_CLONE_ROOT):
            shutil.rmtree(TEMP_CLONE_ROOT, ignore_errors=True)
            await log(f"已清理临时目录: {TEMP_CLONE_ROOT}")
    except OSError as e:
        await log(f"清理临时目录失败: {e}", level="WARN")


if __name__ == "__main__":
    asyncio.run(main())
