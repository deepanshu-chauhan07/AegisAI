from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.ticket import Ticket, TicketComment
from app.models.user import User
from typing import Optional
from datetime import datetime, timedelta
import uuid

SLA_HOURS = {"critical": 2, "high": 8, "medium": 24, "low": 72}

def get_tickets(db: Session, user: User, page: int = 1, size: int = 20,
                status: Optional[str] = None, priority: Optional[str] = None,
                customer_id: Optional[uuid.UUID] = None):
    query = db.query(Ticket)
    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if customer_id:
        query = query.filter(Ticket.customer_id == customer_id)
    total = query.count()
    tickets = query.order_by(Ticket.created_at.desc()).offset((page-1)*size).limit(size).all()
    return tickets, total

def get_ticket_by_id(db: Session, ticket_id: uuid.UUID, user: User):
    return db.query(Ticket).filter(Ticket.id == ticket_id).first()

def create_ticket(db: Session, data: dict, agent: User):
    priority = data.get("priority", "medium")
    sla_hours = SLA_HOURS.get(priority, 24)
    sla_deadline = datetime.utcnow() + timedelta(hours=sla_hours)
    ticket = Ticket(**data, agent_id=agent.id, sla_deadline=sla_deadline, status="open")
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    try:
        from app.workflows.engine import trigger_workflows
        trigger_workflows(db, "ticket.created", ticket, {"ticket_id": str(ticket.id)})
    except Exception as e:
        print(f"Workflow trigger error: {e}")

    return ticket

def update_ticket_status(db: Session, ticket_id: uuid.UUID, status: str, user: User):
    ticket = get_ticket_by_id(db, ticket_id, user)
    if not ticket:
        return None
    ticket.status = status
    if status == "resolved":
        ticket.resolved_at = datetime.utcnow()
    elif status == "closed":
        ticket.closed_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    try:
        from app.workflows.engine import trigger_workflows
        trigger_workflows(db, "ticket.status_changed", ticket, {"ticket_id": str(ticket.id), "new_status": status})
    except Exception as e:
        print(f"Workflow trigger error: {e}")

    return ticket

def add_comment(db: Session, ticket_id: uuid.UUID, body: str, author_id: uuid.UUID, is_internal: bool = False, is_ai: bool = False):
    comment = TicketComment(ticket_id=ticket_id, author_id=author_id, body=body, is_internal=is_internal, is_ai=is_ai)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

def get_comments(db: Session, ticket_id: uuid.UUID):
    return db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id).order_by(TicketComment.created_at.asc()).all()
