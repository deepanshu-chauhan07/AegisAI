from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.customers import router as customer_router
from app.api.v1.tickets import router as ticket_router
from app.api.v1.knowledge_base import router as kb_router
from app.api.v1.ai_copilot import router as copilot_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.bi import router as bi_router
from app.api.v1.workflows import router as workflow_router
from app.api.v1.notifications import router as notification_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.privacy import router as privacy_router
from app.api.v1.team import router as team_router
from app.middleware.security import SecurityMiddleware
from app.core.error_handler import (
    http_exception_handler, validation_exception_handler, generic_exception_handler
)

app = FastAPI(title="AegisAI API", version="1.0.0", docs_url="/docs", redoc_url=None)

app.add_middleware(SecurityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://aegis-ai-six-omega.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(customer_router, prefix="/api/v1/customers", tags=["Customers"])
app.include_router(ticket_router, prefix="/api/v1/tickets", tags=["Tickets"])
app.include_router(kb_router, prefix="/api/v1/kb", tags=["Knowledge Base"])
app.include_router(copilot_router, prefix="/api/v1/ai/copilot", tags=["AI Copilot"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(bi_router, prefix="/api/v1/bi", tags=["Generative BI"])
app.include_router(workflow_router, prefix="/api/v1/workflows", tags=["Workflows"])
app.include_router(notification_router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(intelligence_router, prefix="/api/v1/intelligence", tags=["Predictive Intelligence"])
app.include_router(privacy_router, prefix="/api/v1/privacy", tags=["Privacy & GDPR"])
app.include_router(team_router, prefix="/api/v1/team", tags=["Team Management"])

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
