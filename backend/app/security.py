"""Authentication, password hashing and role checks."""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Admin

ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def get_current_admin(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Admin:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_error
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
    except jwt.PyJWTError:
        raise credentials_error
    if not email:
        raise credentials_error

    admin = db.scalar(select(Admin).where(Admin.email == email))
    if admin is None or not admin.is_active:
        raise credentials_error
    return admin


def require_publisher(admin: Admin = Depends(get_current_admin)) -> Admin:
    """Only roles that may upload/publish documents pass this check."""
    if admin.role not in {"admin", "publisher"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires publisher permissions.",
        )
    return admin
