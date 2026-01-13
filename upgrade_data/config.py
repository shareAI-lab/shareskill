import os

from dotenv import load_dotenv

load_dotenv()


def getenv_str(name, default=""):
    value = os.getenv(name)
    return value if value is not None else default


def getenv_int(name, default):
    value = os.getenv(name)
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


def getenv_float(name, default):
    value = os.getenv(name)
    if value is None or value == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default


# LLM configuration
CURRENT_MODEL = getenv_str("CURRENT_MODEL", "deepseek")

MODEL_CONFIGS = {
    "claude": {
        "id": getenv_str("CLAUDE_MODEL_ID", "claude-sonnet-4-5-20250929"),
        "url": getenv_str("CLAUDE_API_URL", "https://gaccode.com/claudecode/v1/messages"),
        "api_key": getenv_str("CLAUDE_API_KEY", ""),
    },
    "deepseek": {
        "id": getenv_str("DEEPSEEK_MODEL_ID", "deepseek-chat"),
        "url": getenv_str("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions"),
        "api_key": getenv_str("DEEPSEEK_API_KEY", ""),
    },
    "openai": {
        "id": getenv_str("OPENAI_MODEL_ID", "gpt-4o-mini"),
        "url": getenv_str("OPENAI_API_URL", "https://api.openai-next.com/v1/chat/completions"),
        "api_key": getenv_str("OPENAI_API_KEY", ""),
    },
}

# GitHub
GITHUB_TOKEN = getenv_str("GITHUB_TOKEN", "")

# Concurrency and retry
MAX_CONCURRENT = getenv_int("MAX_CONCURRENT", 100)
MAX_RETRIES = getenv_int("MAX_RETRIES", 3)
RETRY_DELAY = getenv_int("RETRY_DELAY", 5)

# Maintenance tuning (used by stage2_maintenance.py)
LLM_MAX_CONCURRENT = getenv_int("LLM_MAX_CONCURRENT", 60)
VALIDATION_MAX_CONCURRENT = getenv_int("VALIDATION_MAX_CONCURRENT", LLM_MAX_CONCURRENT)
VALIDATION_TASK_TIMEOUT = getenv_int("VALIDATION_TASK_TIMEOUT", 300)

SKILL_MD_TRANSLATION_MAX_CHARS = getenv_int("SKILL_MD_TRANSLATION_MAX_CHARS", 90000)
SKILL_MD_TRANSLATION_CHUNK_CHARS = getenv_int("SKILL_MD_TRANSLATION_CHUNK_CHARS", 8000)
ANALYSIS_MAX_CHARS = getenv_int("ANALYSIS_MAX_CHARS", 8000)

DESCRIPTION_TASK_TIMEOUT = getenv_int("DESCRIPTION_TASK_TIMEOUT", 300)
ANALYSIS_TASK_TIMEOUT = getenv_int("ANALYSIS_TASK_TIMEOUT", 300)
TRANSLATION_TASK_TIMEOUT = getenv_int("TRANSLATION_TASK_TIMEOUT", 300)

PG_COMMIT_EVERY = getenv_int("PG_COMMIT_EVERY", 200)
SKILL_MD_MAX_BYTES = getenv_int("SKILL_MD_MAX_BYTES", 90000)
SUBSTEP_TIMEOUT = getenv_int("SUBSTEP_TIMEOUT", 300)

REPO_SIZE_FULL_CLONE_MAX_KB = getenv_int("REPO_SIZE_FULL_CLONE_MAX_KB", 80000)
SKILL_ENTRY_WORKERS = getenv_int("SKILL_ENTRY_WORKERS", 6)
REPO_CONCURRENT = getenv_int("REPO_CONCURRENT", 3)
REPO_REQUEST_INTERVAL = getenv_float("REPO_REQUEST_INTERVAL", 0.2)
MAX_SKILLS_PER_REPO = getenv_int("MAX_SKILLS_PER_REPO", 50)
