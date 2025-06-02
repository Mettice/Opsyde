#!/usr/bin/env python3
"""
🔑 Supabase Models for User Settings and API Keys
Production-ready BYOK (Bring Your Own Keys) implementation
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import TypeDecorator, CHAR
import uuid

from database import Base

logger = logging.getLogger(__name__)

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(32), storing as stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(UUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                if isinstance(value, str):
                    return value
                else:
                    return str(uuid.UUID(str(value)))
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value

class UserProfile(Base):
    """User profile table - matches Supabase profiles table"""
    __tablename__ = "profiles"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    username = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    api_keys = relationship("UserAPIKeyDB", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettingsDB", back_populates="user", cascade="all, delete-orphan")

class UserAPIKeyDB(Base):
    """User API keys table for Supabase"""
    __tablename__ = "user_api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(GUID(), ForeignKey("profiles.id"), nullable=False)
    provider_id = Column(String, nullable=False)
    encrypted_key = Column(Text, nullable=False)
    masked_value = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    validation_status = Column(String, default="pending")  # pending, valid, invalid, expired
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
    
    # Ensure unique provider per user
    __table_args__ = (UniqueConstraint('user_id', 'provider_id', name='unique_user_provider'),)
    
    # Relationships
    user = relationship("UserProfile", back_populates="api_keys")

class UserSettingsDB(Base):
    """User settings table for Supabase"""
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(GUID(), ForeignKey("profiles.id"), nullable=False, unique=True)
    preferences = Column(Text, nullable=True)  # JSON string
    quotas = Column(Text, nullable=True)  # JSON string
    monthly_usage = Column(Text, nullable=True)  # JSON string
    usage_limits = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("UserProfile", back_populates="settings")

class IntegrationCredentialDB(Base):
    """Integration credentials table for Supabase"""
    __tablename__ = "integration_credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(GUID(), ForeignKey("profiles.id"), nullable=False)
    service = Column(String, nullable=False)
    credential_type = Column(String, nullable=False)  # webhook_url, token, api_key, etc.
    encrypted_value = Column(Text, nullable=False)
    masked_value = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Ensure unique service per user
    __table_args__ = (UniqueConstraint('user_id', 'service', name='unique_user_service'),) 