from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth_deps import require_manager
from app.core.sanitizer import validate_bi_sql, check_prompt_injection
from app.services.ai_service import get_ai_response
from app.services.audit_service import create_audit_log
from app.models.user import User
import json

router = APIRouter()

ALLOWED_TABLES = [
    "tickets", "customers", "users", "roles",
    "ticket_comments", "notifications", "workflows"
]

DB_SCHEMA = """
Tables available:
- tickets(id, ticket_number, title, status, priority, category, customer_id, agent_id, sla_breached, created_at, resolved_at)
- customers(id, contact_name, email, company_name, plan_tier, health_score, churn_risk, churn_prob, created_at)
- users(id, email, full_name, role_id, is_active, created_at)
- ticket_comments(id, ticket_id, author_id, body, is_internal, is_ai, created_at)
"""

class BIQueryRequest(BaseModel):
    question: str

@router.post("/query")
def bi_query(
    data: BIQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    if check_prompt_injection(data.question):
        raise HTTPException(status_code=400, detail="Invalid query detected")

    if len(data.question) > 500:
        raise HTTPException(status_code=400, detail="Query too long")

    # Generate SQL
    prompt = f"""You are a SQL expert. Generate a PostgreSQL SELECT query for this question.

Database Schema:
{DB_SCHEMA}

Question: {data.question}

Rules:
1. Only SELECT statements allowed
2. Always add LIMIT 100
3. Use proper PostgreSQL syntax
4. Return ONLY the SQL query, nothing else
5. No explanations, no markdown, just SQL"""

    generated_sql = get_ai_response(prompt).strip()
    generated_sql = generated_sql.replace("```sql", "").replace("```", "").strip()

    # Validate SQL
    is_valid, validated_sql = validate_bi_sql(generated_sql)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid SQL: {validated_sql}")

    # Check allowed tables
    sql_lower = validated_sql.lower()
    for word in ["drop", "delete", "update", "insert", "alter", "truncate"]:
        if word in sql_lower:
            raise HTTPException(status_code=400, detail="Forbidden SQL operation")

    # Execute query
    try:
        result = db.execute(text(validated_sql))
        rows = result.fetchmany(100)
        columns = list(result.keys())
        data_rows = [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

    # Generate insight
    insight_prompt = f"""Question: {data.question}
Data returned {len(data_rows)} rows.
Sample: {json.dumps(data_rows[:3], default=str)}

Write a 1-2 sentence insight about this data. Be concise and business-focused."""

    try:
        insight = get_ai_response(insight_prompt)
    except:
        insight = f"Query returned {len(data_rows)} results."

    # Determine chart type
    chart_type = "bar"
    if len(columns) == 2 and len(data_rows) <= 10:
        chart_type = "bar"
    elif len(data_rows) > 10:
        chart_type = "line"
    elif "distribution" in data.question.lower() or "percentage" in data.question.lower():
        chart_type = "pie"

    create_audit_log(db, current_user.id, "BI_QUERY", "bi", None)

    return {
        "sql": validated_sql,
        "data": data_rows,
        "columns": columns,
        "total_rows": len(data_rows),
        "chart_type": chart_type,
        "insight": insight
    }
