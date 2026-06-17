from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.auth_deps import require_agent
from app.models.user import User
from app.models.ticket import Ticket
from app.services.ai_service import suggest_reply, summarize_ticket, analyze_sentiment
from app.services.audit_service import create_audit_log
import uuid

router = APIRouter()

class SuggestRequest(BaseModel):
    ticket_id: uuid.UUID
    tone: Optional[str] = "professional"

class SummarizeRequest(BaseModel):
    ticket_id: uuid.UUID

class SentimentRequest(BaseModel):
    ticket_id: uuid.UUID

def get_ticket_or_404(db: Session, ticket_id: uuid.UUID):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.post("/suggest")
def suggest(
    data: SuggestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    ticket = get_ticket_or_404(db, data.ticket_id)
    reply = suggest_reply(
        ticket.title,
        ticket.description or "",
        "Customer",
        data.tone
    )
    create_audit_log(db, current_user.id, "AI_SUGGEST_REPLY", "ticket", data.ticket_id)
    return {"reply": reply, "tone": data.tone}

@router.post("/summarize")
def summarize(
    data: SummarizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    ticket = get_ticket_or_404(db, data.ticket_id)
    result = summarize_ticket(
        ticket.title,
        ticket.description or "",
        []
    )
    create_audit_log(db, current_user.id, "AI_SUMMARIZE", "ticket", data.ticket_id)
    return result

@router.post("/sentiment")
def sentiment(
    data: SentimentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    ticket = get_ticket_or_404(db, data.ticket_id)
    result = analyze_sentiment(
        ticket.title,
        ticket.description or ""
    )
    create_audit_log(db, current_user.id, "AI_SENTIMENT", "ticket", data.ticket_id)
    return result
