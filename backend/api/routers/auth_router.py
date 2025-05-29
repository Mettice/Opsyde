from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
from utils.security import security_manager
from utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token"""
    try:
        # Validate credentials (replace with your authentication logic)
        if not await validate_credentials(form_data.username, form_data.password):
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials"
            )
            
        # Create access token
        token_data = {
            "sub": form_data.username,
            "scopes": form_data.scopes or []
        }
        
        access_token = security_manager.create_token(token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register")
async def register(user_data: Dict[str, Any]):
    """Register a new user"""
    try:
        # Validate required fields
        required = ["username", "password", "email"]
        if not all(field in user_data for field in required):
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {required}"
            )
            
        # Validate email format
        if not security_manager.validate_input(user_data["email"], "email"):
            raise HTTPException(
                status_code=400,
                detail="Invalid email format"
            )
            
        # Hash password
        hashed_password = security_manager.hash_password(user_data["password"])
        
        # Store user (implement your storage logic)
        user_id = await create_user({
            **user_data,
            "password": hashed_password
        })
        
        return {
            "success": True,
            "user_id": user_id,
            "message": "User registered successfully"
        }
    except Exception as e:
        logger.error(f"Error in registration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh")
async def refresh_token(token: str = Depends(oauth2_scheme)):
    """Refresh access token"""
    try:
        # Verify current token
        token_data = security_manager.verify_token(token)
        
        # Create new token
        new_token = security_manager.create_token({
            "sub": token_data["sub"],
            "scopes": token_data.get("scopes", [])
        })
        
        return {
            "access_token": new_token,
            "token_type": "bearer"
        }
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """Logout and invalidate token"""
    try:
        # Add token to blacklist (implement your blacklist logic)
        await blacklist_token(token)
        
        return {
            "success": True,
            "message": "Logged out successfully"
        }
    except Exception as e:
        logger.error(f"Error in logout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user information"""
    try:
        token_data = security_manager.verify_token(token)
        
        # Get user data (implement your user retrieval logic)
        user_data = await get_user(token_data["sub"])
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return user_data
    except Exception as e:
        logger.error(f"Error getting user data: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    token: str = Depends(oauth2_scheme)
):
    """Change user password"""
    try:
        token_data = security_manager.verify_token(token)
        
        # Validate old password
        user_data = await get_user(token_data["sub"])
        if not security_manager.verify_password(old_password, user_data["password"]):
            raise HTTPException(status_code=401, detail="Invalid password")
            
        # Update password
        hashed_password = security_manager.hash_password(new_password)
        await update_user_password(token_data["sub"], hashed_password)
        
        return {
            "success": True,
            "message": "Password changed successfully"
        }
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset-password")
async def request_password_reset(email: str):
    """Request password reset"""
    try:
        # Validate email
        if not security_manager.validate_input(email, "email"):
            raise HTTPException(status_code=400, detail="Invalid email format")
            
        # Generate reset token
        reset_token = security_manager.create_token(
            {"sub": email},
            expires_in=3600  # 1 hour
        )
        
        # Send reset email (implement your email sending logic)
        await send_reset_email(email, reset_token)
        
        return {
            "success": True,
            "message": "Password reset instructions sent"
        }
    except Exception as e:
        logger.error(f"Error requesting password reset: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset-password/confirm")
async def confirm_password_reset(
    reset_token: str,
    new_password: str
):
    """Confirm password reset"""
    try:
        # Verify reset token
        token_data = security_manager.verify_token(reset_token)
        
        # Update password
        hashed_password = security_manager.hash_password(new_password)
        await update_user_password_by_email(token_data["sub"], hashed_password)
        
        return {
            "success": True,
            "message": "Password reset successfully"
        }
    except Exception as e:
        logger.error(f"Error confirming password reset: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions (implement these based on your storage solution)

async def validate_credentials(username: str, password: str) -> bool:
    """Validate user credentials"""
    # Implement your validation logic
    pass

async def create_user(user_data: Dict[str, Any]) -> str:
    """Create a new user"""
    # Implement your user creation logic
    pass

async def get_user(username: str) -> Optional[Dict[str, Any]]:
    """Get user data"""
    # Implement your user retrieval logic
    pass

async def update_user_password(username: str, hashed_password: str):
    """Update user password"""
    # Implement your password update logic
    pass

async def update_user_password_by_email(email: str, hashed_password: str):
    """Update user password by email"""
    # Implement your password update logic
    pass

async def blacklist_token(token: str):
    """Add token to blacklist"""
    # Implement your token blacklist logic
    pass

async def send_reset_email(email: str, reset_token: str):
    """Send password reset email"""
    # Implement your email sending logic
    pass 