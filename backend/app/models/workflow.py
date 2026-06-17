from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    trigger_type = Column(String(100), nullable=False)
    conditions = Column(JSONB, nullable=False, default=[])
    actions = Column(JSONB, nullable=False, default=[])
    run_count = Column(Integer, default=0)
    last_run_at = Column(DateTime(timezone=True))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id"))
    trigger_payload = Column(JSONB)
    status = Column(String(20))
    result = Column(JSONB)
    error_message = Column(Text)
    duration_ms = Column(Integer)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
