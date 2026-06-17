from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class KBDocResponse(BaseModel):
    id: UUID
    title: str
    file_type: str
    file_size: Optional[int] = None
    status: str
    chunk_count: int
    created_at: datetime
    class Config:
        from_attributes = True

class KBSearchRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None

class KBSearchResponse(BaseModel):
    answer: str
    citations: List[dict]
