from fastapi import APIRouter, Depends, Query, Request, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import get_current_user, require_agent, require_admin
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerListResponse
from app.services.customer_service import list_customers, get_customer, add_customer, edit_customer, remove_customer
from app.services.audit_service import create_audit_log
from app.models.user import User
from typing import Optional
import uuid

router = APIRouter()

@router.get("", response_model=CustomerListResponse)
def get_customers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=100),
    churn_risk: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    return list_customers(db, current_user, page, size, search, churn_risk)

@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(
    data: CustomerCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    customer = add_customer(db, data, current_user)
    create_audit_log(db, current_user.id, "CUSTOMER_CREATE", "customer", customer.id, req.client.host)
    return customer

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer_detail(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    return get_customer(db, customer_id, current_user)

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: uuid.UUID,
    data: CustomerUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    customer = edit_customer(db, customer_id, data, current_user)
    create_audit_log(db, current_user.id, "CUSTOMER_UPDATE", "customer", customer_id, req.client.host)
    return customer

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: uuid.UUID,
    req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    result = remove_customer(db, customer_id, current_user)
    create_audit_log(db, current_user.id, "CUSTOMER_DELETE", "customer", customer_id, req.client.host)
    return result


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.services.csv_import_service import import_customers_csv
    result = await import_customers_csv(db, file)
    create_audit_log(db, current_user.id, "CSV_IMPORT", "customer", None)
    return {"success": True, "data": result}
