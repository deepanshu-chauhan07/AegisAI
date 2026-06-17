from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.customer import Customer
from app.models.user import User
from typing import Optional
import uuid

def get_customers(
    db: Session,
    user: User,
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    churn_risk: Optional[str] = None
):
    query = db.query(Customer).filter(Customer.is_active == True)

    # Search
    if search:
        query = query.filter(or_(
            Customer.contact_name.ilike(f"%{search}%"),
            Customer.email.ilike(f"%{search}%"),
            Customer.company_name.ilike(f"%{search}%")
        ))

    # Filter
    if churn_risk:
        query = query.filter(Customer.churn_risk == churn_risk)

    total = query.count()
    customers = query.offset((page - 1) * size).limit(size).all()
    return customers, total

def get_customer_by_id(db: Session, customer_id: uuid.UUID, user: User):
    return db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.is_active == True
    ).first()

def create_customer(db: Session, data: dict, created_by: User):
    customer = Customer(**data)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

def update_customer(db: Session, customer_id: uuid.UUID, data: dict, user: User):
    customer = get_customer_by_id(db, customer_id, user)
    if not customer:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer

def delete_customer(db: Session, customer_id: uuid.UUID):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if customer:
        customer.is_active = False
        db.commit()
    return customer
