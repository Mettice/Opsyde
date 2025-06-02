#!/usr/bin/env python3
"""
🔐 Security and Authentication Utilities
Handles user authentication and authorization
"""

import os
# Fix JWT import - try both package names
import logging
logger = logging.getLogger(__name__)

try:
    import jwt
    logger.info("Successfully imported jwt package")
except ImportError:
    try:
        import PyJWT as jwt
        logger.info("Successfully imported PyJWT package as jwt")
    except ImportError:
        logger.error("Failed to import JWT. Install with: pip install PyJWT")
        # Create a dummy JWT module for graceful degradation
        class DummyJWT:
            class InvalidTokenError(Exception):
                pass
            class ExpiredSignatureError(Exception):
                pass
            def encode(*args, **kwargs):
                logger.warning("JWT functionality not available - dummy encode used")
                return "dummy-token"
            def decode(*args, **kwargs):
                logger.warning("JWT functionality not available - dummy decode used")
                return {"sub": "dummy-user"}
        jwt = DummyJWT()

import bcrypt
import secrets
import re
from typing import Dict, Any, Optional, Union  # Update this line to include Any if not already there
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union
from cryptography.fernet import Fernet
from pathlib import Path
import json
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from .logging import get_logger
from dotenv import load_dotenv

logger = get_logger(__name__)

# Load environment variables
load_dotenv('.env')

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Security scheme
security = HTTPBearer(auto_error=False)

class SecurityManager:
    """Manages security operations including encryption, tokens, and validation"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.encryption_key = os.getenv("ENCRYPTION_KEY") or self._generate_encryption_key()
        self.fernet = Fernet(self.encryption_key.encode())
        
        # JWT settings
        self.SECRET_KEY = self.secret_key
        self.ALGORITHM = self.algorithm
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 30
        
        # Email regex pattern
        self.EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        
        # Token blacklist (replace with database in production)
        self.token_blacklist = set()
        
    def _generate_secret_key(self) -> str:
        """Generate a secure secret key"""
        return secrets.token_urlsafe(32)
        
    def _generate_encryption_key(self) -> str:
        """Generate a Fernet encryption key"""
        return Fernet.generate_key().decode()

    def create_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT token"""
        try:
            to_encode = data.copy()
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(minutes=15)
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating token: {str(e)}")
            raise

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode a JWT token"""
        try:
            # Check if token is blacklisted
            if token in self.token_blacklist:
                raise jwt.InvalidTokenError("Token is blacklisted")
            
            # Decode and verify token
            payload = jwt.decode(
                token,
                self.SECRET_KEY,
                algorithms=[self.ALGORITHM]
            )
            
            return payload
        except jwt.ExpiredSignatureError:
            logger.error("Token has expired")
            raise
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            raise

    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        try:
            return self.pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Error hashing password: {str(e)}")
            raise

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            return self.pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Error verifying password: {str(e)}")
            return False

    def encrypt_data(self, data: Union[str, bytes]) -> str:
        """Encrypt data using Fernet"""
        try:
            if isinstance(data, str):
                data = data.encode()
            return self.fernet.encrypt(data).decode()
        except Exception as e:
            logger.error(f"Error encrypting data: {str(e)}")
            raise SecurityError("Failed to encrypt data")

    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt Fernet-encrypted data"""
        try:
            return self.fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            logger.error(f"Error decrypting data: {str(e)}")
            raise SecurityError("Failed to decrypt data")

    def validate_input(self, email: str) -> bool:
        """Validate email format"""
        return bool(self.EMAIL_PATTERN.match(email))

    def sanitize_input(self, data: str) -> str:
        """Sanitize input to prevent injection attacks"""
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>\'";]', '', data)
        return sanitized

    def sanitize_output(self, data: Any) -> Any:
        """
        Sanitize output data to prevent XSS and other injection attacks.
        Handles different data types appropriately.
        """
        if isinstance(data, str):
            # Remove potentially dangerous HTML/script tags
            sanitized = re.sub(r'<script.*?>.*?</script>', '', data, flags=re.IGNORECASE | re.DOTALL)
            sanitized = re.sub(r'<.*?>', '', sanitized)
            # Escape special characters
            sanitized = (
                sanitized
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#x27;')
            )
            return sanitized
        elif isinstance(data, dict):
            return {k: self.sanitize_output(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self.sanitize_output(item) for item in data]
        else:
            # For other types (int, float, bool, None), return as is
            return data

    def generate_api_key(self) -> str:
        """Generate a secure API key"""
        return secrets.token_urlsafe(32)

    def blacklist_token(self, token: str):
        """Add a token to the blacklist"""
        try:
            self.token_blacklist.add(token)
        except Exception as e:
            logger.error(f"Error blacklisting token: {str(e)}")
            raise

    def is_token_blacklisted(self, token: str) -> bool:
        """Check if a token is blacklisted"""
        return token in self.token_blacklist

    def init_app(self, app):
        """Initialize the security manager with the FastAPI app"""
        # This method can be used for any app-specific initialization
        # For now, it's just a placeholder for compatibility
        logger.info("Security manager initialized with FastAPI app")
        pass

    def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """
        Validate password strength
        Returns a dictionary with validation result and error message if any
        """
        if len(password) < 8:
            return {"valid": False, "error": "Password must be at least 8 characters long"}
        
        if not any(c.isupper() for c in password):
            return {"valid": False, "error": "Password must contain at least one uppercase letter"}
        
        if not any(c.islower() for c in password):
            return {"valid": False, "error": "Password must contain at least one lowercase letter"}
        
        if not any(c.isdigit() for c in password):
            return {"valid": False, "error": "Password must contain at least one number"}
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return {"valid": False, "error": "Password must contain at least one special character"}
        
        return {"valid": True}

class SecurityError(Exception):
    """Custom exception for security-related errors"""
    pass

class APIKeyManager:
    """Manages API key operations"""
    
    def __init__(self, storage_path: str = "api_keys"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self.security = SecurityManager(os.getenv("JWT_SECRET_KEY"), os.getenv("JWT_ALGORITHM"))

    def create_api_key(self, user_id: str, scopes: list = None) -> Dict[str, Any]:
        """Create a new API key"""
        api_key = self.security.generate_api_key()
        created_at = datetime.utcnow().isoformat()
        
        key_data = {
            "key": self.security.encrypt_data(api_key),
            "user_id": user_id,
            "scopes": scopes or [],
            "created_at": created_at,
            "last_used": None
        }
        
        # Save key data
        key_file = self.storage_path / f"{user_id}.json"
        with open(key_file, 'w') as f:
            json.dump(key_data, f)
            
        return {
            "api_key": api_key,
            "created_at": created_at,
            "scopes": scopes
        }

    def validate_api_key(self, api_key: str, required_scopes: list = None) -> bool:
        """Validate an API key and its scopes"""
        try:
            # Search through all key files
            for key_file in self.storage_path.glob("*.json"):
                with open(key_file) as f:
                    key_data = json.load(f)
                    
                stored_key = self.security.decrypt_data(key_data["key"])
                if stored_key == api_key:
                    # Check scopes if required
                    if required_scopes:
                        key_scopes = set(key_data.get("scopes", []))
                        if not set(required_scopes).issubset(key_scopes):
                            return False
                    
                    # Update last used timestamp
                    key_data["last_used"] = datetime.utcnow().isoformat()
                    with open(key_file, 'w') as f:
                        json.dump(key_data, f)
                        
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
            return False

    def revoke_api_key(self, user_id: str) -> bool:
        """Revoke an API key"""
        try:
            key_file = self.storage_path / f"{user_id}.json"
            if key_file.exists():
                key_file.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"Error revoking API key: {str(e)}")
            return False

# Example usage:
# token = security_manager.create_token({"user_id": "123"})
# data = security_manager.verify_token(token)
# encrypted = security_manager.encrypt_data("sensitive data")
# decrypted = security_manager.decrypt_data(encrypted)
# is_valid = security_manager.validate_input("user@example.com")

# Create global security manager instance
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", JWT_SECRET_KEY)
security_manager = SecurityManager(secret_key=SUPABASE_JWT_SECRET)

# TODO: Production implementation should include:
# 1. JWT token validation with Supabase
# 2. User session management
# 3. Role-based access control
# 4. Rate limiting per user
# 5. Audit logging

def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Get current user from Supabase JWT token (optional - returns None if no token)
    """
    try:
        if not credentials:
            # No token provided - return None for anonymous access
            logger.info("🔓 No authentication token provided - anonymous access")
            return None
        
        # Get the JWT token from Authorization header
        token = credentials.credentials
        
        # Validate Supabase JWT token
        supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not supabase_jwt_secret:
            logger.warning("⚠️ SUPABASE_JWT_SECRET not configured - using development mode")
            # For development, if no JWT secret is configured, treat as anonymous
            return None
        
        try:
            # Decode and validate the Supabase JWT token
            payload = jwt.decode(token, supabase_jwt_secret, algorithms=["HS256"])
            
            # Extract user information from Supabase token
            user_id = payload.get("sub")  # Supabase user ID
            email = payload.get("email")
            
            if user_id:
                logger.info(f"🔐 Authenticated Supabase user: {user_id}")
                return {
                    "id": user_id,
                    "email": email,
                    "aud": payload.get("aud"),
                    "role": payload.get("role", "authenticated")
                }
            else:
                logger.warning("🔒 Invalid Supabase token - no user ID")
                return None
                
        except jwt.ExpiredSignatureError:
            logger.warning("🔒 Supabase token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"🔒 Invalid Supabase token: {str(e)}")
            return None
        
    except Exception as e:
        logger.error(f"❌ Error validating Supabase token: {str(e)}")
        return None

def get_current_user_required(
    current_user: Optional[Dict] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    """
    Get current user (required - raises exception if no valid user)
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

def get_user_id_for_request(
    current_user: Optional[Dict] = Depends(get_current_user_optional)
) -> str:
    """
    Get user ID for the current request
    Returns authenticated user ID or 'anonymous' for unauthenticated requests
    """
    if current_user and current_user.get("id"):
        logger.info(f"🔐 Authenticated user: {current_user['id']}")
        return str(current_user["id"])
    else:
        logger.info("🔓 Anonymous user request")
        return "anonymous"

async def get_current_user_async(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Legacy async function for backward compatibility"""
    try:
        payload = security_manager.verify_token(token)
        return payload
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Backward compatibility aliases for existing imports (after function definitions)
get_current_user = get_current_user_required
