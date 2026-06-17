from sqlalchemy.orm import Session
from app.models.workflow import Workflow, WorkflowExecution
import uuid

def get_workflows(db: Session):
    return db.query(Workflow).order_by(Workflow.created_at.desc()).all()

def get_workflow_by_id(db: Session, workflow_id: uuid.UUID):
    return db.query(Workflow).filter(Workflow.id == workflow_id).first()

def create_workflow(db: Session, data: dict, created_by: uuid.UUID):
    workflow = Workflow(
        name=data["name"],
        description=data.get("description"),
        trigger_type=data["trigger_type"],
        conditions=[c if isinstance(c, dict) else c.model_dump() for c in data.get("conditions", [])],
        actions=[a if isinstance(a, dict) else a.model_dump() for a in data.get("actions", [])],
        created_by=created_by
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow

def update_workflow(db: Session, workflow_id: uuid.UUID, data: dict):
    workflow = get_workflow_by_id(db, workflow_id)
    if not workflow:
        return None
    for key, value in data.items():
        if value is not None:
            if key in ["conditions", "actions"]:
                value = [v if isinstance(v, dict) else v.model_dump() for v in value]
            setattr(workflow, key, value)
    db.commit()
    db.refresh(workflow)
    return workflow

def toggle_workflow(db: Session, workflow_id: uuid.UUID):
    workflow = get_workflow_by_id(db, workflow_id)
    if not workflow:
        return None
    workflow.is_active = not workflow.is_active
    db.commit()
    db.refresh(workflow)
    return workflow

def delete_workflow(db: Session, workflow_id: uuid.UUID):
    workflow = get_workflow_by_id(db, workflow_id)
    if workflow:
        db.delete(workflow)
        db.commit()
    return workflow

def get_executions(db: Session, workflow_id: uuid.UUID):
    return db.query(WorkflowExecution).filter(
        WorkflowExecution.workflow_id == workflow_id
    ).order_by(WorkflowExecution.executed_at.desc()).limit(50).all()
