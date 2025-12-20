import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PermissionLevel(str, enum.Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class NoteType(str, enum.Enum):
    STANDARD = "standard"
    CODE = "code"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keycloak_id = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    username = Column(String, unique=True, nullable=True)
    is_anonymous = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    stripe_customer_id = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owned_notes = relationship("Note", back_populates="owner", foreign_keys="Note.owner_id")
    permissions = relationship(
        "NotePermission", back_populates="user", cascade="all, delete-orphan"
    )
    subscription = relationship("Subscription", back_populates="user", uselist=False)


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    note_type = Column(
        SQLEnum(NoteType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=NoteType.STANDARD,
    )
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_public = Column(Boolean, default=False)
    share_token = Column(String, unique=True, nullable=True, index=True)
    share_permission_level = Column(String, nullable=True)  # Default permission for share links
    mongodb_content_id = Column(String, nullable=False)  # Reference to MongoDB document
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="owned_notes", foreign_keys=[owner_id])
    permissions = relationship(
        "NotePermission", back_populates="note", cascade="all, delete-orphan"
    )


class NotePermission(Base):
    __tablename__ = "note_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    permission_level = Column(
        SQLEnum(PermissionLevel), nullable=False, default=PermissionLevel.READ
    )
    granted_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    note = relationship("Note", back_populates="permissions")
    user = relationship("User", back_populates="permissions")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    stripe_price_id = Column(String, nullable=True)
    status = Column(SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="subscription")
