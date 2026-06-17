from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    read_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True
