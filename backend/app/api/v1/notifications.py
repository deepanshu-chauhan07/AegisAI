from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import get_current_user
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.models.user import User
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    return query.order_by(Notification.created_at.desc()).limit(50).all()

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_at.is_(None)
    ).count()
    return {"unread_count": count}

@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.read_at = datetime.utcnow()
        db.commit()
    return {"message": "Marked as read"}

@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_at.is_(None)
    ).update({"read_at": datetime.utcnow()})
    db.commit()
    return {"message": "All marked as read"}
