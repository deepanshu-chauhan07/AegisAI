from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.core.database import get_db
from app.core.auth_deps import require_manager
from app.models.ticket import Ticket
from app.models.customer import Customer
from app.models.user import User
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()

@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    total_customers = db.query(Customer).filter(Customer.is_active == True).count()
    open_tickets = db.query(Ticket).filter(Ticket.status.in_(["open", "in_progress", "assigned"])).count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status == "resolved").count()
    total_tickets = db.query(Ticket).count()
    sla_breached = db.query(Ticket).filter(Ticket.sla_breached == True).count()
    critical_tickets = db.query(Ticket).filter(
        Ticket.priority == "critical",
        Ticket.status.in_(["open", "assigned"])
    ).count()

    return {
        "total_customers": total_customers,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved_tickets,
        "total_tickets": total_tickets,
        "sla_breached": sla_breached,
        "critical_tickets": critical_tickets,
        "resolution_rate": round((resolved_tickets / total_tickets * 100) if total_tickets > 0 else 0, 1),
        "csat_score": 4.3
    }

@router.get("/tickets/trends")
def get_ticket_trends(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    tickets = db.query(Ticket).filter(Ticket.created_at >= start_date).all()

    daily_counts: dict = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        daily_counts[date] = {"date": date, "created": 0, "resolved": 0}

    for ticket in tickets:
        date = ticket.created_at.strftime("%Y-%m-%d")
        if date in daily_counts:
            daily_counts[date]["created"] += 1
        if ticket.status == "resolved" and ticket.resolved_at:
            res_date = ticket.resolved_at.strftime("%Y-%m-%d")
            if res_date in daily_counts:
                daily_counts[res_date]["resolved"] += 1

    return {"data": list(daily_counts.values()), "days": days}

@router.get("/tickets/by-priority")
def get_tickets_by_priority(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    result = db.query(
        Ticket.priority,
        func.count(Ticket.id).label("count")
    ).group_by(Ticket.priority).all()

    return {"data": [{"priority": r.priority, "count": r.count} for r in result]}

@router.get("/tickets/by-status")
def get_tickets_by_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    result = db.query(
        Ticket.status,
        func.count(Ticket.id).label("count")
    ).group_by(Ticket.status).all()

    return {"data": [{"status": r.status, "count": r.count} for r in result]}

@router.get("/customers/health-distribution")
def get_health_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    customers = db.query(Customer).filter(Customer.is_active == True).all()
    healthy = sum(1 for c in customers if c.health_score >= 70)
    at_risk = sum(1 for c in customers if 40 <= c.health_score < 70)
    critical = sum(1 for c in customers if c.health_score < 40)

    return {
        "data": [
            {"name": "Healthy", "value": healthy, "color": "#10B981"},
            {"name": "At Risk", "value": at_risk, "color": "#F59E0B"},
            {"name": "Critical", "value": critical, "color": "#DC2626"}
        ]
    }
