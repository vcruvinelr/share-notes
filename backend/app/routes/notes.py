import secrets
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, get_or_create_anonymous_user
from app.database import get_db, get_mongo_db
from app.models import Note, NotePermission, PermissionLevel, User
from app.routes.websocket import manager
from app.schemas import (
    NoteCreate,
    NoteDetailResponse,
    NotePermissionResponse,
    NoteResponse,
    NoteUpdate,
    ShareNoteRequest,
    ShareNoteResponse,
)

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("/me")
async def get_current_user_info(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Get current user information, creating anonymous user if needed.
    This is used to get the anonymous user ID for WebSocket connections.
    """
    if current_user is None:
        # Get anonymous user ID from header (frontend localStorage)
        anonymous_id = request.headers.get("X-Anonymous-User-Id")
        current_user = await get_or_create_anonymous_user(db, anonymous_id)
        # Set cookie for anonymous user
        response.set_cookie(
            key="anonymous_user_id",
            value=str(current_user.id),
            httponly=True,
            max_age=30 * 24 * 60 * 60,  # 30 days
            samesite="lax",
        )

    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "is_anonymous": current_user.is_anonymous,
    }


@router.post(
    "/", response_model=NoteDetailResponse, status_code=status.HTTP_201_CREATED
)
async def create_note(
    note_data: NoteCreate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Create a new note.
    Anonymous users create private (non-public) notes by default.
    """
    # Get or create anonymous user if not authenticated
    is_new_anonymous = False
    if current_user is None:
        # Get anonymous user ID from header (frontend localStorage)
        anonymous_id = request.headers.get("X-Anonymous-User-Id")
        current_user = await get_or_create_anonymous_user(db, anonymous_id)
        is_new_anonymous = True

    # Check note limit for free users
    if not current_user.is_premium:
        note_count_query = select(func.count(Note.id)).where(
            Note.owner_id == current_user.id
        )
        result = await db.execute(note_count_query)
        note_count = result.scalar()

        if note_count >= 3:
            raise HTTPException(
                status_code=403,
                detail="Note limit reached. Upgrade to premium for unlimited notes.",  # noqa: E501
            )

    # Store content in MongoDB
    mongo_db = get_mongo_db()
    note_content = {
        "content": note_data.content,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "operations": [],  # For operational transformation
    }
    result = await mongo_db.note_contents.insert_one(note_content)
    mongodb_content_id = str(result.inserted_id)

    # Create note metadata in PostgreSQL
    note = Note(
        title=note_data.title,
        note_type=note_data.note_type,
        owner_id=current_user.id,
        is_public=note_data.is_public,
        mongodb_content_id=mongodb_content_id,
    )

    db.add(note)
    await db.commit()
    await db.refresh(note)

    # Set cookie for anonymous users
    if is_new_anonymous:
        response.set_cookie(
            key="anonymous_user_id",
            value=str(current_user.id),
            max_age=30 * 24 * 60 * 60,  # 30 days
            httponly=True,
            samesite="lax",
        )

    # Load relationships
    query_result = await db.execute(select(Note).where(Note.id == note.id))
    note = query_result.scalar_one()

    # Get content from MongoDB using the stored ID
    from bson import ObjectId

    content_doc = await mongo_db.note_contents.find_one(
        {"_id": ObjectId(mongodb_content_id)}
    )

    # Prepare note response data
    note_dict = note.__dict__.copy()
    note_dict["note_type"] = note.note_type.value  # Convert enum to string

    return NoteDetailResponse(
        **note_dict,
        content=content_doc["content"],
        owner=current_user,
        permissions=[],
    )


@router.get("/", response_model=List[NoteResponse])
async def list_notes(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    List all notes accessible to the current user.
    For anonymous users: only their own notes (identified by owner_id).
    For authenticated users: their notes and shared notes.
    """
    is_new_anonymous = False
    if current_user is None:
        # Get anonymous user ID from header (frontend localStorage)
        anonymous_id = request.headers.get("X-Anonymous-User-Id")
        current_user = await get_or_create_anonymous_user(db, anonymous_id)
        is_new_anonymous = True

    # Set cookie for new anonymous users
    if is_new_anonymous:
        response.set_cookie(
            key="anonymous_user_id",
            value=str(current_user.id),
            max_age=30 * 24 * 60 * 60,  # 30 days
            httponly=True,
            samesite="lax",
        )

    # Separate data for anonymous vs authenticated users
    # Anonymous users: only see their own notes
    # Authenticated users: only see notes from other authenticated users (exclude anonymous)  # noqa: E501
    if current_user.is_anonymous:
        # Anonymous users only see their own notes
        result = await db.execute(
            select(Note)
            .where(Note.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
        )
    else:
        # Authenticated users see their notes and shared notes,
        # but EXCLUDE anonymous user notes
        result = await db.execute(
            select(Note)
            .join(User, Note.owner_id == User.id)
            .where(
                (
                    (Note.owner_id == current_user.id)
                    | (
                        Note.permissions.any(
                            NotePermission.user_id == current_user.id
                        )
                    )
                )
                & (User.is_anonymous is False)
            )
            .offset(skip)
            .limit(limit)
        )

    notes = result.scalars().all()
    return notes


@router.get("/{note_id}", response_model=NoteDetailResponse)
async def get_note(
    note_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Get a specific note by ID.
    """
    # Get or create anonymous user if not authenticated
    if current_user is None:
        # Get anonymous user ID from header (frontend localStorage)
        anonymous_id = request.headers.get("X-Anonymous-User-Id")
        if anonymous_id:
            current_user = await get_or_create_anonymous_user(db, anonymous_id)

    result = await db.execute(
        select(Note)
        .options(selectinload(Note.owner), selectinload(Note.permissions))
        .where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Enforce separation: anonymous users can't access authenticated user notes and vice versa  # noqa: E501
    if current_user and note.owner:
        # Prevent authenticated users from accessing anonymous user notes
        if not current_user.is_anonymous and note.owner.is_anonymous:
            raise HTTPException(status_code=403, detail="Access denied")
        # Prevent anonymous users from accessing authenticated user notes
        if current_user.is_anonymous and not note.owner.is_anonymous:
            raise HTTPException(status_code=403, detail="Access denied")

    # Check permissions for private notes
    if not note.is_public:
        # If still no user after trying to create anonymous, deny access
        if current_user is None:
            raise HTTPException(
                status_code=403, detail="Authentication required"
            )

        # Check if user owns the note
        if note.owner_id != current_user.id:
            # Check if user has permission
            perm_result = await db.execute(
                select(NotePermission).where(
                    NotePermission.note_id == note_id,
                    NotePermission.user_id == current_user.id,
                )
            )
            permission = perm_result.scalar_one_or_none()
            if not permission:
                raise HTTPException(status_code=403, detail="Access denied")

    # Get content from MongoDB
    mongo_db = get_mongo_db()
    from bson.objectid import ObjectId

    content_doc = await mongo_db.note_contents.find_one(
        {"_id": ObjectId(note.mongodb_content_id)}
    )

    if not content_doc:
        raise HTTPException(status_code=500, detail="Note content not found")

    return NoteDetailResponse(
        id=note.id,
        title=note.title,
        note_type=note.note_type.value,
        owner_id=note.owner_id,
        is_public=note.is_public,
        share_token=note.share_token,
        created_at=note.created_at,
        updated_at=note.updated_at,
        content=content_doc["content"],
        owner=note.owner,
        permissions=note.permissions,
    )


@router.put("/{note_id}", response_model=NoteDetailResponse)
async def update_note(
    note_id: UUID,
    note_data: NoteUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Update a note (title, content, or public status).
    Free users can edit their own notes via this endpoint (save button).
    Premium users also have real-time WebSocket updates.
    """
    # Get or create anonymous user if not authenticated
    if current_user is None:
        # Get anonymous user ID from header (frontend localStorage)
        anonymous_id = request.headers.get("X-Anonymous-User-Id")
        if anonymous_id:
            current_user = await get_or_create_anonymous_user(db, anonymous_id)

    result = await db.execute(
        select(Note)
        .options(selectinload(Note.owner), selectinload(Note.permissions))
        .where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Enforce separation: anonymous users can't modify authenticated user notes and vice versa  # noqa: E501
    if current_user and note.owner:
        if not current_user.is_anonymous and note.owner.is_anonymous:
            raise HTTPException(status_code=403, detail="Access denied")
        if current_user.is_anonymous and not note.owner.is_anonymous:
            raise HTTPException(status_code=403, detail="Access denied")

    # Check permissions
    has_write_permission = False

    if current_user and note.owner_id == current_user.id:
        has_write_permission = True
    elif current_user:
        perm_result = await db.execute(
            select(NotePermission).where(
                NotePermission.note_id == note_id,
                NotePermission.user_id == current_user.id,
                NotePermission.permission_level.in_(
                    [PermissionLevel.WRITE, PermissionLevel.ADMIN]
                ),
            )
        )
        permission = perm_result.scalar_one_or_none()
        has_write_permission = permission is not None

    # If still no permission, check share_permission_level for anonymous users
    if not has_write_permission and note.share_permission_level:
        if note.share_permission_level in ["write", "admin"]:
            has_write_permission = True

    if not has_write_permission:
        raise HTTPException(
            status_code=403, detail="Write permission required"
        )

    # Update PostgreSQL metadata
    if note_data.title is not None:
        note.title = note_data.title
    if note_data.note_type is not None:
        note.note_type = note_data.note_type
    if note_data.is_public is not None:
        note.is_public = note_data.is_public

    # Update MongoDB content
    if note_data.content is not None:
        mongo_db = get_mongo_db()
        from bson.objectid import ObjectId

        await mongo_db.note_contents.update_one(
            {"_id": ObjectId(note.mongodb_content_id)},
            {
                "$set": {
                    "content": note_data.content,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        # Clear WebSocket in-memory cache to ensure fresh content is fetched
        if str(note.id) in manager.current_content:
            del manager.current_content[str(note.id)]

    await db.commit()
    await db.refresh(note)

    # Get updated content
    mongo_db = get_mongo_db()
    from bson.objectid import ObjectId

    content_doc = await mongo_db.note_contents.find_one(
        {"_id": ObjectId(note.mongodb_content_id)}
    )

    return NoteDetailResponse(
        id=note.id,
        title=note.title,
        note_type=note.note_type.value,
        owner_id=note.owner_id,
        is_public=note.is_public,
        share_token=note.share_token,
        share_permission_level=note.share_permission_level,
        created_at=note.created_at,
        updated_at=note.updated_at,
        content=content_doc["content"],
        owner=note.owner,
        permissions=note.permissions,
    )


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Delete a note. Only owner can delete.
    """
    # Get or create anonymous user if not authenticated
    if current_user is None:
        # Get anonymous user ID from header (frontend localStorage)
        anonymous_id = request.headers.get("X-Anonymous-User-Id")
        if anonymous_id:
            current_user = await get_or_create_anonymous_user(db, anonymous_id)

    result = await db.execute(
        select(Note)
        .options(selectinload(Note.owner))
        .where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Enforce separation: anonymous users can't delete authenticated user notes and vice versa  # noqa: E501
    if current_user and note.owner:
        if not current_user.is_anonymous and note.owner.is_anonymous:
            raise HTTPException(status_code=403, detail="Access denied")
        if current_user.is_anonymous and not note.owner.is_anonymous:
            raise HTTPException(status_code=403, detail="Access denied")

    if current_user is None or note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete")

    # Delete from MongoDB
    mongo_db = get_mongo_db()
    from bson.objectid import ObjectId

    await mongo_db.note_contents.delete_one(
        {"_id": ObjectId(note.mongodb_content_id)}
    )

    # Delete from PostgreSQL (cascades to permissions)
    await db.delete(note)
    await db.commit()

    return None


@router.post("/{note_id}/share", response_model=ShareNoteResponse)
async def share_note(
    note_id: UUID,
    share_data: ShareNoteRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Share a note with another user or generate a share link.
    Anonymous users can only generate share links, not share with specific users.  # noqa: E501
    """
    # Get or create anonymous user if not authenticated
    is_new_anonymous = False
    if current_user is None:
        # Get anonymous user ID from header (frontend localStorage)
        anonymous_id = request.headers.get("X-Anonymous-User-Id")
        current_user = await get_or_create_anonymous_user(db, anonymous_id)
        is_new_anonymous = True

    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can share")

    # Set cookie for new anonymous users
    if is_new_anonymous:
        response.set_cookie(
            key="anonymous_user_id",
            value=str(current_user.id),
            max_age=30 * 24 * 60 * 60,  # 30 days
            httponly=True,
            samesite="lax",
        )

    response = ShareNoteResponse()

    # Generate share link
    if share_data.generate_link:
        if not note.share_token:
            note.share_token = secrets.token_urlsafe(32)

        # Non-premium users can only share with read-only permission
        if not current_user.is_premium:
            note.share_permission_level = "read"
        else:
            # Store the default permission level for share links
            note.share_permission_level = share_data.permission_level.value

        await db.commit()
        await db.refresh(note)

        response.share_token = note.share_token
        response.share_url = f"/notes/shared/{note.share_token}"

    # Share with specific user - requires premium subscription
    if share_data.user_email:
        # Team sharing requires premium subscription
        if not current_user.is_premium:
            raise HTTPException(
                status_code=403,
                detail="Team sharing requires premium subscription. Use share links instead.",  # noqa: E501
            )

        user_result = await db.execute(
            select(User).where(User.email == share_data.user_email)
        )
        target_user = user_result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if permission already exists
        perm_result = await db.execute(
            select(NotePermission).where(
                NotePermission.note_id == note_id,
                NotePermission.user_id == target_user.id,
            )
        )
        existing_perm = perm_result.scalar_one_or_none()

        if existing_perm:
            existing_perm.permission_level = share_data.permission_level
        else:
            permission = NotePermission(
                note_id=note_id,
                user_id=target_user.id,
                permission_level=share_data.permission_level,
            )
            db.add(permission)

        await db.commit()

        # Get the permission with user info
        perm_result = await db.execute(
            select(NotePermission).where(
                NotePermission.note_id == note_id,
                NotePermission.user_id == target_user.id,
            )
        )
        permission = perm_result.scalar_one()

        response.permission = NotePermissionResponse.model_validate(permission)

    return response


@router.get("/shared/{share_token}", response_model=NoteDetailResponse)
async def get_shared_note(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Access a note via share token.
    """
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.owner), selectinload(Note.permissions))
        .where(Note.share_token == share_token)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Get content from MongoDB
    mongo_db = get_mongo_db()
    from bson.objectid import ObjectId

    content_doc = await mongo_db.note_contents.find_one(
        {"_id": ObjectId(note.mongodb_content_id)}
    )

    if not content_doc:
        raise HTTPException(status_code=500, detail="Note content not found")

    return NoteDetailResponse(
        id=note.id,
        title=note.title,
        note_type=note.note_type.value,
        owner_id=note.owner_id,
        is_public=note.is_public,
        share_token=note.share_token,
        share_permission_level=note.share_permission_level,
        created_at=note.created_at,
        updated_at=note.updated_at,
        content=content_doc["content"],
        owner=note.owner,
        permissions=note.permissions,
    )
