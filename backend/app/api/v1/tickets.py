from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import require_agent
from app.schemas.ticket import (
    TicketCreate, TicketStatusUpdate, CommentCreate,
    TicketResponse, TicketListResponse, CommentResponse
)
from app.services.ticket_service import (
    list_tickets, get_ticket, create_new_ticket,
    change_ticket_status, add_ticket_comment, get_ticket_comments
)
from app.services.audit_service import create_audit_log
from app.models.user import User
from typing import Optional, List
import uuid

router = APIRouter()

@router.get("", response_model=TicketListResponse)
def get_tickets(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    customer_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    return list_tickets(db, current_user, page, size, status, priority, customer_id)

@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket(
    data: TicketCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    ticket = create_new_ticket(db, data, current_user)
    create_audit_log(db, current_user.id, "TICKET_CREATE", "ticket", ticket.id, req.client.host)
    return ticket

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket_detail(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    return get_ticket(db, ticket_id, current_user)

@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: uuid.UUID,
    data: TicketStatusUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    ticket = change_ticket_status(db, ticket_id, data, current_user)
    create_audit_log(db, current_user.id, f"TICKET_STATUS_{data.status.upper()}", "ticket", ticket_id, req.client.host)
    return ticket

@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=201)
def add_comment(
    ticket_id: uuid.UUID,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    return add_ticket_comment(db, ticket_id, data, current_user)

@router.get("/{ticket_id}/comments", response_model=List[CommentResponse])
def get_comments(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    return get_ticket_comments(db, ticket_id, current_user)
