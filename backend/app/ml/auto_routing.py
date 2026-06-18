from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.ticket import Ticket
from app.models.user import User, Role
from typing import Optional
import uuid

CATEGORY_SKILL_MAP = {
    "billing": ["billing", "finance"],
    "technical": ["technical", "engineering"],
    "account": ["account", "general"],
    "feature": ["product", "technical"],
    "other": ["general"],
}

def get_agent_workload(db: Session, agent_id: uuid.UUID) -> int:
    return db.query(func.count(Ticket.id)).filter(
        Ticket.agent_id == agent_id,
        Ticket.status.in_(["open", "in_progress", "assigned"])
    ).scalar() or 0

def get_agent_resolution_rate(db: Session, agent_id: uuid.UUID) -> float:
    total = db.query(func.count(Ticket.id)).filter(Ticket.agent_id == agent_id).scalar() or 0
    resolved = db.query(func.count(Ticket.id)).filter(
        Ticket.agent_id == agent_id, Ticket.status == "resolved"
    ).scalar() or 0
    return resolved / total if total > 0 else 0.5

def recommend_agent(db: Session, category: Optional[str], priority: str) -> dict:
    """
    Recommend the best agent for a new ticket using a weighted score:
    - Lower current workload is better (40%)
    - Higher historical resolution rate is better (40%)
    - Priority urgency boosts weight on resolution rate for critical tickets (20%)
    """
    agent_role = db.query(Role).filter(Role.name == "agent").first()
    manager_role = db.query(Role).filter(Role.name == "manager").first()
    eligible_role_ids = [r.id for r in [agent_role, manager_role] if r]

    agents = db.query(User).filter(
        User.role_id.in_(eligible_role_ids),
        User.is_active == True
    ).all()

    if not agents:
        return {"error": "No active agents available for assignment"}

    scored_agents = []
    for agent in agents:
        workload = get_agent_workload(db, agent.id)
        resolution_rate = get_agent_resolution_rate(db, agent.id)

        workload_score = 1 / (1 + workload)
        urgency_weight = 0.6 if priority in ["critical", "high"] else 0.4

        composite_score = (
            workload_score * (1 - urgency_weight) +
            resolution_rate * urgency_weight
        )

        scored_agents.append({
            "agent_id": str(agent.id),
            "agent_name": agent.full_name,
            "current_workload": workload,
            "resolution_rate": round(resolution_rate, 2),
            "score": round(composite_score, 4)
        })

    scored_agents.sort(key=lambda x: x["score"], reverse=True)

    return {
        "recommended_agent": scored_agents[0] if scored_agents else None,
        "all_candidates": scored_agents,
        "reasoning": f"Selected based on lowest workload and highest resolution rate, weighted for '{priority}' priority"
    }
