from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth_deps import get_current_user
from app.core.security import verify_password, hash_password
from app.core.sanitizer import validate_password_strength
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import register_user, login_user
from app.services.audit_service import create_audit_log
from app.models.user import User, Role

router = APIRouter()


def build_user_response(db: Session, user: User) -> dict:
    role = db.query(Role).filter(Role.id == user.role_id).first()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "role": role.name if role else None
    }


@router.post("/register", response_model=UserResponse, status_code=201)
def register(request: RegisterRequest, req: Request, db: Session = Depends(get_db)):
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = register_user(db, request.email, request.password, request.full_name)
    create_audit_log(db, user.id, "USER_REGISTER", "user", user.id, req.client.host)
    return build_user_response(db, user)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    result = login_user(db, request.email, request.password)
    create_audit_log(db, None, "USER_LOGIN", "auth", None, req.client.host, req.headers.get("user-agent"))
    return result


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return build_user_response(db, current_user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    create_audit_log(db, current_user.id, "USER_LOGOUT", "auth", None)
    return {"message": "Logged out successfully"}


class UpdateProfileRequest(BaseModel):
    full_name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.patch("/me", response_model=UserResponse)
def update_profile(
    data: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.full_name = data.full_name.strip()
    db.commit()
    db.refresh(current_user)
    return build_user_response(db, current_user)


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.current_password, current_user.hashed_pwd):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    is_valid, msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    current_user.hashed_pwd = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}
