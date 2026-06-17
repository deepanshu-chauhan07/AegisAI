from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime

class WorkflowCondition(BaseModel):
    field: str
    op: str
    value: Any

class WorkflowAction(BaseModel):
    type: str
    params: dict = {}

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str
    conditions: List[WorkflowCondition] = []
    actions: List[WorkflowAction] = []

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    conditions: Optional[List[WorkflowCondition]] = None
    actions: Optional[List[WorkflowAction]] = None

class WorkflowResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    is_active: bool
    trigger_type: str
    conditions: List[dict]
    actions: List[dict]
    run_count: int
    last_run_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class WorkflowExecutionResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    status: str
    trigger_payload: Optional[dict] = None
    result: Optional[dict] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    executed_at: datetime
    class Config:
        from_attributes = True
