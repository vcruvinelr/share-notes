from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class PermissionLevel(str, Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class NoteType(str, Enum):
    STANDARD = "standard"
    CODE = "code"


# User Schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None


class UserCreate(UserBase):
    keycloak_id: Optional[str] = None
    is_anonymous: bool = False


class UserResponse(UserBase):
    id: UUID
    is_anonymous: bool
    is_premium: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Subscription Schemas
class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    status: SubscriptionStatus
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CheckoutSessionRequest(BaseModel):
    price_id: str = "price_premium_monthly"  # Default price ID


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


# Note Schemas
class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(default="")
    note_type: NoteType = NoteType.STANDARD
    is_public: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    note_type: Optional[NoteType] = None
    is_public: Optional[bool] = None


class NoteResponse(BaseModel):
    id: UUID
    title: str
    note_type: str
    owner_id: Optional[UUID]
    is_public: bool
    share_token: Optional[str]
    share_permission_level: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class NoteDetailResponse(NoteResponse):
    content: str
    owner: Optional[UserResponse] = None
    permissions: List["NotePermissionResponse"] = []


# Permission Schemas
class NotePermissionCreate(BaseModel):
    user_id: Optional[UUID] = None
    permission_level: PermissionLevel = PermissionLevel.READ


class NotePermissionResponse(BaseModel):
    id: UUID
    note_id: UUID
    user_id: Optional[UUID]
    permission_level: PermissionLevel
    granted_at: datetime
    user: Optional[UserResponse] = None
    
    model_config = ConfigDict(from_attributes=True)


class ShareNoteRequest(BaseModel):
    user_email: Optional[str] = None
    permission_level: PermissionLevel = PermissionLevel.READ
    generate_link: bool = False


class ShareNoteResponse(BaseModel):
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    permission: Optional[NotePermissionResponse] = None


# WebSocket Schemas
class WSMessage(BaseModel):
    type: str  # "join", "leave", "edit", "cursor", "user_list"
    note_id: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    data: Optional[dict] = None


class WSEditMessage(BaseModel):
    type: str = "edit"
    note_id: str
    user_id: str
    username: str
    operation: str  # "insert", "delete", "replace"
    position: int
    content: Optional[str] = None
    length: Optional[int] = None


class WSCursorMessage(BaseModel):
    type: str = "cursor"
    note_id: str
    user_id: str
    username: str
    position: int
    selection_end: Optional[int] = None
