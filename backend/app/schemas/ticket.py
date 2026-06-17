from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class TicketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    customer_id: UUID
    priority: Optional[str] = "medium"
    category: Optional[str] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None

class TicketStatusUpdate(BaseModel):
    status: str
    resolution_note: Optional[str] = None

class CommentCreate(BaseModel):
    body: str
    is_internal: bool = False

class CommentResponse(BaseModel):
    id: UUID
    body: str
    is_internal: bool
    is_ai: bool
    created_at: datetime
    class Config:
        from_attributes = True

class TicketResponse(BaseModel):
    id: UUID
    ticket_number: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    category: Optional[str] = None
    customer_id: Optional[UUID] = None
    agent_id: Optional[UUID] = None
    sla_deadline: Optional[datetime] = None
    sla_breached: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class TicketListResponse(BaseModel):
    data: List[TicketResponse]
    total: int
    page: int
    pages: int
