from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import require_manager
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse, WorkflowExecutionResponse
from app.repositories.workflow_repository import (
    get_workflows, get_workflow_by_id, create_workflow,
    update_workflow, toggle_workflow, delete_workflow, get_executions
)
from app.services.audit_service import create_audit_log
from app.models.user import User
from fastapi import HTTPException
from typing import List
import uuid

router = APIRouter()

VALID_TRIGGERS = [
    "ticket.created", "ticket.status_changed", "ticket.sla_breach",
    "customer.churn_high", "customer.created"
]

@router.get("", response_model=List[WorkflowResponse])
def list_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    return get_workflows(db)

@router.post("", response_model=WorkflowResponse, status_code=201)
def new_workflow(
    data: WorkflowCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    if data.trigger_type not in VALID_TRIGGERS:
        raise HTTPException(status_code=400, detail=f"Invalid trigger type. Use one of: {VALID_TRIGGERS}")
    workflow = create_workflow(db, data.model_dump(), current_user.id)
    create_audit_log(db, current_user.id, "WORKFLOW_CREATE", "workflow", workflow.id, req.client.host)
    return workflow

@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(
    workflow_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    workflow = get_workflow_by_id(db, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.put("/{workflow_id}", response_model=WorkflowResponse)
def edit_workflow(
    workflow_id: uuid.UUID,
    data: WorkflowUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    workflow = update_workflow(db, workflow_id, data.model_dump(exclude_none=True))
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    create_audit_log(db, current_user.id, "WORKFLOW_UPDATE", "workflow", workflow_id, req.client.host)
    return workflow

@router.patch("/{workflow_id}/toggle", response_model=WorkflowResponse)
def toggle(
    workflow_id: uuid.UUID,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    workflow = toggle_workflow(db, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    create_audit_log(db, current_user.id, "WORKFLOW_TOGGLE", "workflow", workflow_id, req.client.host)
    return workflow

@router.delete("/{workflow_id}")
def remove_workflow(
    workflow_id: uuid.UUID,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    workflow = delete_workflow(db, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    create_audit_log(db, current_user.id, "WORKFLOW_DELETE", "workflow", workflow_id, req.client.host)
    return {"message": "Workflow deleted"}

@router.get("/{workflow_id}/executions", response_model=List[WorkflowExecutionResponse])
def workflow_executions(
    workflow_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    return get_executions(db, workflow_id)
