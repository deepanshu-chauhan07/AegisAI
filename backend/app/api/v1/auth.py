from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_deps import get_current_user
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import register_user, login_user
from app.services.audit_service import create_audit_log
from app.models.user import User

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=201)
def register(request: RegisterRequest, req: Request, db: Session = Depends(get_db)):
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = register_user(db, request.email, request.password, request.full_name)
    create_audit_log(db, user.id, "USER_REGISTER", "user", user.id, req.client.host)
    return user

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    result = login_user(db, request.email, request.password)
    create_audit_log(db, None, "USER_LOGIN", "auth", None, req.client.host, req.headers.get("user-agent"))
    return result

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    create_audit_log(db, current_user.id, "USER_LOGOUT", "auth", None)
    return {"message": "Logged out successfully"}
