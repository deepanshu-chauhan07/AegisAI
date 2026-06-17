from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket, TicketComment
from app.models.notification import Notification, AuditLog
from app.services.audit_service import create_audit_log
import uuid

router = APIRouter()

@router.get("/my-data")
def export_my_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """GDPR Right to Access — export all personal data tied to this account."""
    tickets = db.query(Ticket).filter(Ticket.agent_id == current_user.id).all()
    comments = db.query(TicketComment).filter(TicketComment.author_id == current_user.id).all()
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).all()

    create_audit_log(db, current_user.id, "GDPR_DATA_EXPORT", "user", current_user.id)

    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        },
        "tickets_handled": [{"id": str(t.id), "title": t.title, "created_at": t.created_at.isoformat()} for t in tickets],
        "comments_made": [{"id": str(c.id), "body": c.body, "created_at": c.created_at.isoformat()} for c in comments],
        "notifications": [{"title": n.title, "created_at": n.created_at.isoformat()} for n in notifications]
    }

@router.delete("/my-account")
def delete_my_account(
    confirm: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """GDPR Right to Erasure — anonymize/deactivate account. Does not hard-delete audit trails (legal requirement)."""
    if not confirm:
        raise HTTPException(status_code=400, detail="Set confirm=true to proceed with account deletion")

    create_audit_log(db, current_user.id, "GDPR_ACCOUNT_DELETE_REQUEST", "user", current_user.id)

    current_user.email = f"deleted-{current_user.id}@anonymized.local"
    current_user.full_name = "Deleted User"
    current_user.is_active = False
    db.commit()

    return {"message": "Account anonymized and deactivated. Audit logs retained per legal requirements."}

@router.delete("/customer/{customer_id}")
def delete_customer_data(
    customer_id: uuid.UUID,
    confirm: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """GDPR Right to Erasure for a customer record (admin/manager use, on customer request)."""
    if not confirm:
        raise HTTPException(status_code=400, detail="Set confirm=true to proceed")

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.contact_name = "Deleted Customer"
    customer.email = f"deleted-{customer.id}@anonymized.local"
    customer.phone = None
    customer.company_name = None
    customer.is_active = False
    db.commit()

    create_audit_log(db, current_user.id, "GDPR_CUSTOMER_DATA_DELETE", "customer", customer_id)
    return {"message": "Customer data anonymized per GDPR erasure request"}
