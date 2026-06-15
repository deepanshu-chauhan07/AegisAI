from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(Integer, autoincrement=True, unique=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"))
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String(30), default="open")
    priority = Column(String(20), default="medium")
    category = Column(String(100))
    tags = Column(ARRAY(String))
    sla_deadline = Column(DateTime(timezone=True))
    sla_breached = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class TicketComment(Base):
    __tablename__ = "ticket_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"))
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    body = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    is_ai = Column(Boolean, default=False)
    attachments = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
