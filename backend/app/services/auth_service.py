from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.user_repository import get_user_by_email, create_user
from app.core.security import verify_password, create_access_token
from app.core.sanitizer import validate_password_strength

def register_user(db: Session, email: str, password: str, full_name: str):
    if get_user_by_email(db, email):
        raise HTTPException(status_code=409, detail="Email already registered")

    is_valid, msg = validate_password_strength(password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    return create_user(db, email, password, full_name)

def login_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_pwd):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "Bearer"}
