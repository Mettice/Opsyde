from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from typing import Optional, Dict, Any

from database import Base
from auth.utils import verify_password, get_password_hash

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    api_key_hash = Column(String, nullable=True)

    @property
    def is_authenticated(self) -> bool:
        """Check if user is authenticated."""
        return True if self.id else False

    def verify_password(self, password: str) -> bool:
        """Verify the user's password."""
        return verify_password(password, self.hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Get hash of password."""
        return get_password_hash(password)

    def to_dict(self) -> Dict[str, Any]:
        """Convert user object to dictionary."""
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "is_active": self.is_active,
            "is_superuser": self.is_superuser,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "User":
        """Create a user instance from dictionary data."""
        return cls(
            email=data.get("email"),
            username=data.get("username"),
            hashed_password=get_password_hash(data.get("password")) if data.get("password") else None,
            is_active=data.get("is_active", True),
            is_superuser=data.get("is_superuser", False)
        )