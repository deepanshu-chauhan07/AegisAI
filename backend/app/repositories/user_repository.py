from sqlalchemy.orm import Session
from app.models.user import User, Role
from app.core.security import hash_password

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_or_create_role(db: Session, role_name: str):
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = Role(name=role_name)
        db.add(role)
        db.commit()
        db.refresh(role)
    return role

def create_user(db: Session, email: str, password: str, full_name: str):
    role = get_or_create_role(db, "agent")
    user = User(
        email=email,
        hashed_pwd=hash_password(password),
        full_name=full_name,
        role_id=role.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
