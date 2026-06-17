from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.customer import Customer
from app.models.ticket import Ticket
from datetime import datetime

def extract_features(db: Session, customer: Customer) -> dict:
    ticket_count = db.query(func.count(Ticket.id)).filter(Ticket.customer_id == customer.id).scalar() or 0
    critical_tickets = db.query(func.count(Ticket.id)).filter(
        Ticket.customer_id == customer.id, Ticket.priority == "critical"
    ).scalar() or 0
    sla_breaches = db.query(func.count(Ticket.id)).filter(
        Ticket.customer_id == customer.id, Ticket.sla_breached == True
    ).scalar() or 0
    open_tickets = db.query(func.count(Ticket.id)).filter(
        Ticket.customer_id == customer.id,
        Ticket.status.in_(["open", "in_progress", "escalated"])
    ).scalar() or 0
    resolved_tickets = db.query(func.count(Ticket.id)).filter(
        Ticket.customer_id == customer.id, Ticket.status == "resolved"
    ).scalar() or 0

    days_since_signup = (datetime.utcnow() - customer.created_at.replace(tzinfo=None)).days if customer.created_at else 0
    plan_tier_map = {"free": 0, "starter": 1, "pro": 2, "enterprise": 3}
    plan_score = plan_tier_map.get(customer.plan_tier, 0)

    resolution_rate = resolved_tickets / ticket_count if ticket_count > 0 else 1.0

    return {
        "health_score": float(customer.health_score or 50.0),
        "ticket_count": int(ticket_count),
        "critical_ticket_ratio": float(critical_tickets / ticket_count) if ticket_count > 0 else 0.0,
        "sla_breach_count": int(sla_breaches),
        "open_ticket_count": int(open_tickets),
        "days_since_signup": int(days_since_signup),
        "plan_tier_score": int(plan_score),
        "resolution_rate": float(resolution_rate)
    }

def get_feature_columns():
    return [
        "health_score", "ticket_count", "critical_ticket_ratio",
        "sla_breach_count", "open_ticket_count", "days_since_signup",
        "plan_tier_score", "resolution_rate"
    ]
