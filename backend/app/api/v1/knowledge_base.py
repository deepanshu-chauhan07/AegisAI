from fastapi import APIRouter, Depends, UploadFile, File, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import require_agent, require_manager
from app.services.kb_service import process_document, search_knowledge_base
from app.schemas.knowledge_base import KBSearchRequest, KBSearchResponse
from app.services.audit_service import create_audit_log
from app.models.user import User

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    req: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    result = await process_document(db, file, current_user)
    create_audit_log(db, current_user.id, "KB_UPLOAD", "knowledge_base", None, req.client.host)
    return {"success": True, "data": result}

@router.post("/ask")
def ask_question(
    data: KBSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent)
):
    create_audit_log(db, current_user.id, "KB_SEARCH", "knowledge_base", None)
    return search_knowledge_base(data.question, current_user)
