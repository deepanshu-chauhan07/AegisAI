from sqlalchemy.orm import Session
from app.models.notification import AuditLog
from typing import Optional
import uuid

def create_audit_log(
    db: Session,
    user_id: Optional[uuid.UUID],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
