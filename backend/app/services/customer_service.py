from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.customer_repository import (
    get_customers, get_customer_by_id,
    create_customer, update_customer, delete_customer
)
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate
import math
import uuid

def list_customers(db: Session, user: User, page: int, size: int, search: str, churn_risk: str):
    customers, total = get_customers(db, user, page, size, search, churn_risk)
    return {
        "data": customers,
        "total": total,
        "page": page,
        "pages": math.ceil(total / size) if total > 0 else 1
    }

def get_customer(db: Session, customer_id: uuid.UUID, user: User):
    customer = get_customer_by_id(db, customer_id, user)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found or access denied")
    return customer

def add_customer(db: Session, data: CustomerCreate, user: User):
    user_role = user.role.name if user.role else "customer"
    if user_role not in ["admin", "manager", "agent"]:
        raise HTTPException(status_code=403, detail="Access denied")
    existing = db.query(__import__('app.models.customer', fromlist=['Customer']).Customer).filter_by(email=data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Customer with this email already exists")
    return create_customer(db, data.model_dump(), user)

def edit_customer(db: Session, customer_id: uuid.UUID, data: CustomerUpdate, user: User):
    customer = update_customer(db, customer_id, data.model_dump(exclude_none=True), user)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found or access denied")
    return customer

def remove_customer(db: Session, customer_id: uuid.UUID, user: User):
    user_role = user.role.name if user.role else "customer"
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete customers")
    customer = delete_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}
