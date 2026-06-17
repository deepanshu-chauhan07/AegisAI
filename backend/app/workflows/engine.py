from sqlalchemy.orm import Session
from app.models.workflow import Workflow, WorkflowExecution
from app.models.ticket import Ticket
from app.models.customer import Customer
from app.models.notification import Notification
from datetime import datetime
import time
import uuid

OPERATORS = {
    "eq": lambda a, b: a == b,
    "neq": lambda a, b: a != b,
    "gt": lambda a, b: a > b,
    "lt": lambda a, b: a < b,
    "gte": lambda a, b: a >= b,
    "lte": lambda a, b: a <= b,
    "contains": lambda a, b: b in str(a) if a else False,
}

def get_field_value(obj, field: str):
    return getattr(obj, field, None)

def evaluate_conditions(obj, conditions: list) -> bool:
    if not conditions:
        return True
    for cond in conditions:
        field = cond.get("field")
        op = cond.get("op", "eq")
        value = cond.get("value")
        actual = get_field_value(obj, field)
        operator_fn = OPERATORS.get(op)
        if not operator_fn:
            return False
        try:
            if not operator_fn(actual, value):
                return False
        except Exception:
            return False
    return True

def execute_action(db: Session, action: dict, context_obj):
    action_type = action.get("type")
    params = action.get("params", {})

    if action_type == "assign_agent":
        agent_id = params.get("agent_id")
        if agent_id and isinstance(context_obj, Ticket):
            context_obj.agent_id = uuid.UUID(agent_id)
            context_obj.status = "assigned"
            db.commit()
        return {"action": "assign_agent", "agent_id": agent_id}

    elif action_type == "set_priority":
        priority = params.get("priority")
        if priority and isinstance(context_obj, Ticket):
            context_obj.priority = priority
            db.commit()
        return {"action": "set_priority", "priority": priority}

    elif action_type == "send_notification":
        if isinstance(context_obj, Ticket) and context_obj.agent_id:
            notif = Notification(
                user_id=context_obj.agent_id,
                type="workflow_triggered",
                title=params.get("title", "Workflow Alert"),
                message=params.get("message", "A workflow has been triggered"),
                entity_type="ticket",
                entity_id=context_obj.id
            )
            db.add(notif)
            db.commit()
        return {"action": "send_notification"}

    elif action_type == "escalate":
        if isinstance(context_obj, Ticket):
            context_obj.status = "escalated"
            context_obj.priority = "critical"
            db.commit()
        return {"action": "escalate"}

    elif action_type == "add_tag":
        tag = params.get("tag")
        if isinstance(context_obj, Ticket):
            tags = context_obj.tags or []
            if tag and tag not in tags:
                tags.append(tag)
                context_obj.tags = tags
                db.commit()
        return {"action": "add_tag", "tag": tag}

    return {"action": action_type, "status": "unknown_action"}

def run_workflow(db: Session, workflow: Workflow, trigger_payload: dict, context_obj=None):
    start = time.time()
    execution = WorkflowExecution(
        workflow_id=workflow.id,
        trigger_payload=trigger_payload,
        status="running"
    )
    db.add(execution)
    db.commit()

    try:
        if context_obj and not evaluate_conditions(context_obj, workflow.conditions):
            execution.status = "skipped"
            execution.result = {"reason": "conditions_not_met"}
        else:
            results = []
            for action in workflow.actions:
                result = execute_action(db, action, context_obj)
                results.append(result)
            execution.status = "success"
            execution.result = {"actions_executed": results}

        workflow.run_count += 1
        workflow.last_run_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        execution.status = "failed"
        execution.error_message = str(e)
        db.commit()

    execution.duration_ms = int((time.time() - start) * 1000)
    db.commit()
    return execution

def trigger_workflows(db: Session, trigger_type: str, context_obj=None, payload: dict = None):
    workflows = db.query(Workflow).filter(
        Workflow.trigger_type == trigger_type,
        Workflow.is_active == True
    ).all()

    executions = []
    for wf in workflows:
        execution = run_workflow(db, wf, payload or {}, context_obj)
        executions.append(execution)
    return executions
