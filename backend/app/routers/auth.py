"""Authentication endpoints (admin workspace)."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Admin
from ..schemas import AdminLogin, AdminOut, Token
from ..security import (
    create_access_token,
    get_current_admin,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _authenticate(db: Session, email: str, password: str) -> Admin:
    admin = db.scalar(select(Admin).where(Admin.email == email))
    if admin is None or not verify_password(password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled"
        )
    return admin


@router.post("/login", response_model=Token)
def login(payload: AdminLogin, db: Session = Depends(get_db)) -> Token:
    admin = _authenticate(db, payload.email, payload.password)
    return Token(access_token=create_access_token(admin.email, admin.role))


@router.post("/token", response_model=Token)
def login_form(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    """OAuth2 password-flow variant (used by the API docs "Authorize" button)."""
    admin = _authenticate(db, form.username, form.password)
    return Token(access_token=create_access_token(admin.email, admin.role))


@router.get("/me", response_model=AdminOut)
def me(admin: Admin = Depends(get_current_admin)) -> Admin:
    return admin
