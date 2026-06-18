from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import require_admin
from app.models.user import User, Role
from app.services.audit_service import create_audit_log
from pydantic import BaseModel
from typing import List
import uuid

router = APIRouter()

class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    role: str

class UpdateRoleRequest(BaseModel):
    role_name: str

@router.get("", response_model=List[TeamMemberResponse])
def list_team(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).all()
    result = []
    for u in users:
        role = db.query(Role).filter(Role.id == u.role_id).first()
        result.append(TeamMemberResponse(
            id=u.id, email=u.email, full_name=u.full_name,
            is_active=u.is_active, role=role.name if role else "none"
        ))
    return result

@router.patch("/{user_id}/role")
def update_role(
    user_id: uuid.UUID,
    data: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.query(Role).filter(Role.name == data.role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    user.role_id = role.id
    db.commit()
    create_audit_log(db, current_user.id, "ROLE_UPDATE", "user", user_id)
    return {"message": f"Role updated to {data.role_name}"}

@router.patch("/{user_id}/toggle-active")
def toggle_active(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.is_active = not user.is_active
    db.commit()
    create_audit_log(db, current_user.id, "USER_TOGGLE_ACTIVE", "user", user_id)
    return {"message": "User status updated", "is_active": user.is_active}
