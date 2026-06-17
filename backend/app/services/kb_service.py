from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from app.models.user import User
from app.rag.embedder import chunk_text, upsert_document, search_similar
import uuid, os, tempfile

ALLOWED_TYPES = ["application/pdf", "text/plain", "text/markdown",
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
MAX_SIZE = 50 * 1024 * 1024

def extract_text(file_path: str, file_type: str) -> str:
    if "pdf" in file_type:
        import fitz
        doc = fitz.open(file_path)
        return " ".join(page.get_text() for page in doc)
    elif "word" in file_type or file_path.endswith(".docx"):
        from docx import Document
        doc = Document(file_path)
        return " ".join(p.text for p in doc.paragraphs)
    else:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

async def process_document(db: Session, file: UploadFile, user: User):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="File type not allowed. Use PDF, DOCX, TXT, or MD")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 50MB")

    doc_id = str(uuid.uuid4())
    title = file.filename or "Untitled Document"

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        text = extract_text(tmp_path, file.content_type)
        chunks = chunk_text(text)
        chunk_count = upsert_document(doc_id, chunks, title)
        return {
            "doc_id": doc_id,
            "title": title,
            "status": "indexed",
            "chunk_count": chunk_count,
            "file_size": len(content)
        }
    finally:
        os.unlink(tmp_path)

def search_knowledge_base(question: str, user: User):
    from app.core.sanitizer import check_prompt_injection
    if check_prompt_injection(question):
        raise HTTPException(status_code=400, detail="Invalid query detected")

    results = search_similar(question, top_k=5)
    citations = []
    context = ""

    for match in results:
        if match.score >= 0.3:
            citations.append({
                "doc_id": match.metadata.get("doc_id"),
                "doc_title": match.metadata.get("doc_title"),
                "chunk_text": match.metadata.get("chunk_text"),
                "score": round(match.score, 3)
            })
            context += match.metadata.get("chunk_text", "") + "\n\n"

    if not context:
        return {
            "answer": "No relevant information found in the knowledge base for your question.",
            "citations": []
        }

    answer = f"Based on the knowledge base:\n\n{context[:1000]}..."
    return {"answer": answer, "citations": citations}
