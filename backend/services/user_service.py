from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import secrets

from ..models.user import User
from ..utils.security import SecurityManager
from ..utils.logger import get_logger

logger = get_logger(__name__)

class UserService:
    def __init__(self, db: Session, security: SecurityManager):
        self.db = db
        self.security = security

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        try:
            # Validate input
            if not self.security.validate_input(user_data.get("email", "")):
                return {"success": False, "error": "Invalid email format"}

            # Hash password
            hashed_password = self.security.hash_password(user_data["password"])
            user_data["hashed_password"] = hashed_password
            del user_data["password"]

            # Create user object
            user = User.from_dict(user_data)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            return {"success": True, "user": user.to_dict()}
        except IntegrityError:
            self.db.rollback()
            return {"success": False, "error": "Username or email already exists"}
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            self.db.rollback()
            return {"success": False, "error": "Internal server error"}

    def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return token"""
        try:
            user = self.db.query(User).filter(User.username == username).first()
            if not user or not self.security.verify_password(password, user.hashed_password):
                return {"success": False, "error": "Invalid credentials"}

            if not user.is_active:
                return {"success": False, "error": "User account is inactive"}

            # Update last login
            user.update_last_login()
            self.db.commit()

            # Create access token
            token = self.security.create_token({"sub": user.username})
            return {
                "success": True,
                "access_token": token,
                "user": user.to_dict()
            }
        except Exception as e:
            logger.error(f"Error authenticating user: {str(e)}")
            return {"success": False, "error": "Internal server error"}

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def update_user(self, username: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user information"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                return {"success": False, "error": "User not found"}

            if "password" in update_data:
                update_data["hashed_password"] = self.security.hash_password(update_data["password"])
                del update_data["password"]

            user.update(update_data)
            self.db.commit()
            return {"success": True, "user": user.to_dict()}
        except IntegrityError:
            self.db.rollback()
            return {"success": False, "error": "Username or email already exists"}
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}")
            self.db.rollback()
            return {"success": False, "error": "Internal server error"}

    def delete_user(self, username: str) -> Dict[str, bool]:
        """Delete user"""
        try:
            user = self.get_user_by_username(username)
            if not user:
                return {"success": False, "error": "User not found"}

            self.db.delete(user)
            self.db.commit()
            return {"success": True}
        except Exception as e:
            logger.error(f"Error deleting user: {str(e)}")
            self.db.rollback()
            return {"success": False, "error": "Internal server error"}

    def initiate_password_reset(self, email: str) -> Dict[str, Any]:
        """Initiate password reset process"""
        try:
            user = self.get_user_by_email(email)
            if not user:
                return {"success": False, "error": "User not found"}

            # Generate reset token
            token = secrets.token_urlsafe(32)
            user.set_password_reset_token(token)
            self.db.commit()

            return {
                "success": True,
                "reset_token": token,
                "email": user.email
            }
        except Exception as e:
            logger.error(f"Error initiating password reset: {str(e)}")
            self.db.rollback()
            return {"success": False, "error": "Internal server error"}

    def reset_password(self, email: str, token: str, new_password: str) -> Dict[str, bool]:
        """Reset user password using reset token"""
        try:
            user = self.get_user_by_email(email)
            if not user:
                return {"success": False, "error": "User not found"}

            if not user.verify_password_reset_token(token):
                return {"success": False, "error": "Invalid or expired reset token"}

            # Update password and clear reset token
            user.hashed_password = self.security.hash_password(new_password)
            user.clear_password_reset_token()
            self.db.commit()

            return {"success": True}
        except Exception as e:
            logger.error(f"Error resetting password: {str(e)}")
            self.db.rollback()
            return {"success": False, "error": "Internal server error"}

    def list_users(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """List all users with pagination"""
        try:
            users = self.db.query(User).offset(skip).limit(limit).all()
            return [user.to_dict() for user in users]
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            return []