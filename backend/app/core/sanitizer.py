import re
import html

FORBIDDEN_SQL = [
    "drop", "delete", "truncate", "alter", "create",
    "insert", "update", "exec", "execute", "xp_",
    "union", "script", "javascript"
]

PROMPT_INJECTION_PATTERNS = [
    r"ignore previous",
    r"ignore all instructions",
    r"you are now",
    r"act as",
    r"jailbreak",
    r"dan mode",
    r"pretend you",
    r"system prompt",
    r"disregard",
]

def sanitize_string(value: str) -> str:
    value = html.escape(value.strip())
    value = re.sub(r'[<>"\']', '', value)
    return value[:10000]

def check_sql_injection(value: str) -> bool:
    lower = value.lower()
    return any(word in lower for word in FORBIDDEN_SQL)

def check_prompt_injection(value: str) -> bool:
    lower = value.lower()
    return any(re.search(p, lower) for p in PROMPT_INJECTION_PATTERNS)

def validate_bi_sql(sql: str) -> tuple[bool, str]:
    sql_upper = sql.upper().strip()
    if not sql_upper.startswith("SELECT"):
        return False, "Only SELECT queries allowed"
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "EXEC"]
    for word in forbidden:
        if word in sql_upper:
            return False, f"Forbidden keyword: {word}"
    if not ("LIMIT" in sql_upper):
        sql = sql.rstrip(";") + " LIMIT 1000"
    return True, sql

def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    common_passwords = ["password123", "12345678", "qwerty123", "admin123"]
    if password.lower() in common_passwords:
        return False, "Password is too common, please choose a stronger one"
    return True, "ok"
