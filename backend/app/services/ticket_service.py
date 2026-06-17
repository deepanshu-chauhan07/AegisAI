from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.ticket_repository import (
    get_tickets, get_ticket_by_id, create_ticket,
    update_ticket_status, add_comment, get_comments
)
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketStatusUpdate, CommentCreate
import math, uuid

VALID_TRANSITIONS = {
    "open": ["assigned", "escalated"],
    "assigned": ["in_progress", "escalated"],
    "in_progress": ["pending_customer", "resolved", "escalated"],
    "pending_customer": ["in_progress", "resolved"],
    "escalated": ["in_progress", "resolved"],
    "resolved": ["closed", "reopened"],
    "closed": ["reopened"],
    "reopened": ["assigned", "in_progress"]
}

def list_tickets(db: Session, user: User, page: int, size: int, status: str, priority: str, customer_id: uuid.UUID):
    tickets, total = get_tickets(db, user, page, size, status, priority, customer_id)
    return {
        "data": tickets,
        "total": total,
        "page": page,
        "pages": math.ceil(total / size) if total > 0 else 1
    }

def get_ticket(db: Session, ticket_id: uuid.UUID, user: User):
    ticket = get_ticket_by_id(db, ticket_id, user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

def create_new_ticket(db: Session, data: TicketCreate, user: User):
    return create_ticket(db, data.model_dump(), user)

def change_ticket_status(db: Session, ticket_id: uuid.UUID, data: TicketStatusUpdate, user: User):
    ticket = get_ticket_by_id(db, ticket_id, user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    valid_next = VALID_TRANSITIONS.get(ticket.status, [])
    if data.status not in valid_next:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {ticket.status} → {data.status}"
        )
    return update_ticket_status(db, ticket_id, data.status, user)

def add_ticket_comment(db: Session, ticket_id: uuid.UUID, data: CommentCreate, user: User):
    ticket = get_ticket_by_id(db, ticket_id, user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return add_comment(db, ticket_id, data.body, user.id, data.is_internal)

def get_ticket_comments(db: Session, ticket_id: uuid.UUID, user: User):
    ticket = get_ticket_by_id(db, ticket_id, user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return get_comments(db, ticket_id)
