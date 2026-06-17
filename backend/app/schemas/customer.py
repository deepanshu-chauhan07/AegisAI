from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class CustomerCreate(BaseModel):
    contact_name: str
    email: EmailStr
    company_name: Optional[str] = None
    phone: Optional[str] = None
    plan_tier: Optional[str] = "free"
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    contact_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    plan_tier: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class CustomerResponse(BaseModel):
    id: UUID
    contact_name: str
    email: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    plan_tier: Optional[str] = None
    health_score: float
    churn_risk: str
    churn_prob: float
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerListResponse(BaseModel):
    data: List[CustomerResponse]
    total: int
    page: int
    pages: int
