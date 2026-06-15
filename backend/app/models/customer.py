from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Customer(Base):
    __tablename__ = "customers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255))
    contact_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20))
    plan_tier = Column(String(50))
    health_score = Column(Float, default=50.0)
    churn_risk = Column(String(20), default="low")
    churn_prob = Column(Float, default=0.0)
    assigned_agent = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    tags = Column(ARRAY(String))
    custom_fields = Column(JSONB, default={})
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
