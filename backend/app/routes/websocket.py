import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Optional, Set

from bson.objectid import ObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_mongo_db
from app.models import Note, NotePermission, PermissionLevel, User

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for real-time collaboration."""

    def __init__(self):
        # note_id -> set of (websocket, user_id, username)
        self.active_connections: Dict[str, Set[tuple]] = {}
        # note_id -> current content (in-memory state for real-time sync)
        self.current_content: Dict[str, str] = {}
        self.lock = asyncio.Lock()

    async def connect(
        self, websocket: WebSocket, note_id: str, user_id: str, username: str
    ):
        """Connect a user to a note's collaboration session."""
        await websocket.accept()

        async with self.lock:
            if note_id not in self.active_connections:
                self.active_connections[note_id] = set()
            self.active_connections[note_id].add(
                (websocket, user_id, username)
            )

        # Notify others about new user
        await self.broadcast_to_note(
            note_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "username": username,
                "timestamp": datetime.utcnow().isoformat(),
            },
            exclude_websocket=websocket,
        )

        # Send current user list to the new user
        await self.send_user_list(websocket, note_id)

    async def disconnect(
        self, websocket: WebSocket, note_id: str, user_id: str, username: str
    ):
        """Disconnect a user from a note's collaboration session."""
        async with self.lock:
            if note_id in self.active_connections:
                self.active_connections[note_id].discard(
                    (websocket, user_id, username)
                )

                if not self.active_connections[note_id]:
                    del self.active_connections[note_id]

        # Notify others about user leaving
        await self.broadcast_to_note(
            note_id,
            {
                "type": "user_left",
                "user_id": user_id,
                "username": username,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    async def broadcast_to_note(
        self,
        note_id: str,
        message: dict,
        exclude_websocket: Optional[WebSocket] = None,
    ):
        """Broadcast a message to all users in a note."""
        if note_id not in self.active_connections:
            return

        disconnected = []

        for websocket, user_id, username in self.active_connections[note_id]:
            if websocket == exclude_websocket:
                continue

            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")
                disconnected.append((websocket, user_id, username))

        # Clean up disconnected websockets
        if disconnected:
            async with self.lock:
                for conn in disconnected:
                    self.active_connections[note_id].discard(conn)

    async def send_user_list(self, websocket: WebSocket, note_id: str):
        """Send the list of active users to a websocket."""
        if note_id not in self.active_connections:
            users = []
        else:
            users = [
                {"user_id": uid, "username": uname}
                for _, uid, uname in self.active_connections[note_id]
            ]

        await websocket.send_json(
            {
                "type": "user_list",
                "users": users,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

    def get_active_users(self, note_id: str) -> list:
        """Get list of active users for a note."""
        if note_id not in self.active_connections:
            return []

        return [
            {"user_id": uid, "username": uname}
            for _, uid, uname in self.active_connections[note_id]
        ]


manager = ConnectionManager()


async def verify_note_access(
    note_id: str, user_id: Optional[str], db: AsyncSession
) -> bool:
    """Verify if a user has access to a note."""
    try:
        from uuid import UUID

        note_uuid = UUID(note_id)

        result = await db.execute(select(Note).where(Note.id == note_uuid))
        note = result.scalar_one_or_none()

        if not note:
            return False

        # Public notes are accessible
        if note.is_public:
            return True

        # Notes with share tokens are accessible (shared via link)
        if note.share_token:
            return True

        # Anonymous users can't access private notes (without share token)
        if not user_id or user_id == "":
            return False

        try:
            user_uuid = UUID(user_id)
        except (ValueError, AttributeError):
            return False

        # Owner has access
        if note.owner_id == user_uuid:
            return True

        # Check permissions
        perm_result = await db.execute(
            select(NotePermission).where(
                NotePermission.note_id == note_uuid,
                NotePermission.user_id == user_uuid,
            )
        )
        permission = perm_result.scalar_one_or_none()

        return permission is not None

    except Exception as e:
        logger.error(f"Error verifying access: {e}")
        return False


async def verify_write_permission(
    note_id: str, user_id: Optional[str], db: AsyncSession
) -> bool:
    """Verify if a user has write permission for a note."""
    try:
        from uuid import UUID

        note_uuid = UUID(note_id)

        result = await db.execute(select(Note).where(Note.id == note_uuid))
        note = result.scalar_one_or_none()

        if not note:
            return False

        # Check if note has share_permission_level set to write or admin
        if note.share_permission_level and note.share_permission_level in [
            "write",
            "admin",
        ]:
            return True

        if not user_id:
            return False

        user_uuid = UUID(user_id)

        # Owner has write access
        if note.owner_id == user_uuid:
            return True

        # Check write permissions
        perm_result = await db.execute(
            select(NotePermission).where(
                NotePermission.note_id == note_uuid,
                NotePermission.user_id == user_uuid,
                NotePermission.permission_level.in_(
                    [PermissionLevel.WRITE, PermissionLevel.ADMIN]
                ),
            )
        )
        permission = perm_result.scalar_one_or_none()

        return permission is not None

    except Exception as e:
        logger.error(f"Error verifying write permission: {e}")
        return False


@router.websocket("/ws/notes/{note_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    note_id: str,
    token: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    username: Optional[str] = Query("Anonymous"),
):
    """
    WebSocket endpoint for real-time collaboration on a note.
    Real-time collaboration is only available for premium users.
    """
    # Get database session
    async for db in get_db():
        # If token provided but no user_id, authenticate using token
        actual_user_id = user_id
        actual_username = username

        if token and (not user_id or user_id == ""):
            from fastapi import Response
            from fastapi.security import HTTPAuthorizationCredentials

            from app.auth import get_current_user

            # Create a mock request with the token
            class MockRequest:
                def __init__(self, token):
                    self._token = token
                    self.headers = {"Authorization": f"Bearer {token}"}
                    self.cookies = {}

                def headers_get(self, key):
                    return self.headers.get(key)

            try:
                mock_request = MockRequest(token)
                mock_response = Response()
                credentials = HTTPAuthorizationCredentials(
                    scheme="Bearer", credentials=token
                )

                # Get user from token
                authenticated_user = await get_current_user(
                    mock_request, mock_response, credentials, db
                )
                if authenticated_user:
                    actual_user_id = str(authenticated_user.id)
                    actual_username = authenticated_user.username or "User"
                    logger.info(
                        f"WebSocket authenticated via token: user_id={actual_user_id}"  # noqa: E501
                    )
            except Exception as e:
                logger.error(f"Error authenticating WebSocket via token: {e}")

        # Verify access
        has_access = await verify_note_access(note_id, actual_user_id, db)

        if not has_access:
            await websocket.close(code=1008, reason="Access denied")
            return

        # Check if user has premium access for real-time collaboration
        is_premium = False
        if actual_user_id:
            from uuid import UUID

            try:
                user_result = await db.execute(
                    select(User).where(User.id == UUID(actual_user_id))
                )
                user = user_result.scalar_one_or_none()
                if user:
                    is_premium = user.is_premium
            except Exception as e:
                logger.error(f"Error checking premium status: {e}")

        # If still no user_id, generate one for anonymous user
        if not actual_user_id or actual_user_id == "":
            import uuid

            actual_user_id = str(uuid.uuid4())
            actual_username = f"Anonymous-{actual_user_id[:8]}"

        # Connect to collaboration session
        await manager.connect(
            websocket, note_id, actual_user_id, actual_username
        )

        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)

                message_type = message.get("type")

                if message_type == "edit":
                    # Real-time collaboration requires premium subscription
                    if not is_premium:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "message": "Real-time collaboration requires premium subscription",  # noqa: E501
                            }
                        )
                        continue

                    # Verify write permission
                    has_write = await verify_write_permission(
                        note_id, user_id, db
                    )

                    if not has_write:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "message": "Write permission required",
                            }
                        )
                        continue

                    # Store operation in MongoDB for operational transformation
                    mongo_db = get_mongo_db()
                    from uuid import UUID

                    note_result = await db.execute(
                        select(Note).where(Note.id == UUID(note_id))
                    )
                    note = note_result.scalar_one_or_none()

                    if note:
                        operation = {
                            "type": message.get("operation"),
                            "position": message.get("position"),
                            "content": message.get("content"),
                            "length": message.get("length"),
                            "user_id": user_id,
                            "timestamp": datetime.utcnow(),
                        }

                        # Update note content and add operation
                        await mongo_db.note_contents.update_one(
                            {"_id": ObjectId(note.mongodb_content_id)},
                            {
                                "$push": {"operations": operation},
                                "$set": {"updated_at": datetime.utcnow()},
                            },
                        )

                        # Apply operation to in-memory content
                        current = manager.current_content.get(note_id, "")
                        op_type = operation.get("type")
                        pos = operation.get("position", 0)
                        content = operation.get("content", "")
                        length = operation.get("length", 0)

                        if op_type == "insert":
                            current = current[:pos] + content + current[pos:]
                        elif op_type == "delete":
                            current = current[:pos] + current[pos + length :]
                        elif op_type == "replace":
                            current = (
                                current[:pos]
                                + content
                                + current[pos + length :]
                            )

                        manager.current_content[note_id] = current

                        # Broadcast edit to other users
                        await manager.broadcast_to_note(
                            note_id,
                            {
                                "type": "edit",
                                "user_id": user_id,
                                "username": username,
                                "operation": message.get("operation"),
                                "position": message.get("position"),
                                "content": message.get("content"),
                                "length": message.get("length"),
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                            exclude_websocket=websocket,
                        )

                elif message_type == "cursor":
                    # Real-time cursor tracking requires premium subscription
                    if not is_premium:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "message": "Real-time collaboration requires premium subscription",  # noqa: E501
                            }
                        )
                        continue

                    # Broadcast cursor position
                    await manager.broadcast_to_note(
                        note_id,
                        {
                            "type": "cursor",
                            "user_id": user_id,
                            "username": username,
                            "position": message.get("position"),
                            "selection_end": message.get("selection_end"),
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                        exclude_websocket=websocket,
                    )

                elif message_type == "get_content":
                    # Always fetch fresh content from MongoDB to avoid stale cache  # noqa: E501
                    # This is important for free users who save via HTTP PUT
                    mongo_db = get_mongo_db()
                    from uuid import UUID

                    note_result = await db.execute(
                        select(Note).where(Note.id == UUID(note_id))
                    )
                    note = note_result.scalar_one_or_none()

                    content = ""
                    if note:
                        content_doc = await mongo_db.note_contents.find_one(
                            {"_id": ObjectId(note.mongodb_content_id)}
                        )

                        if content_doc:
                            content = content_doc.get("content", "")
                            # Update in-memory cache for premium users' real-time sync  # noqa: E501
                            manager.current_content[note_id] = content

                    await websocket.send_json(
                        {
                            "type": "content",
                            "content": content,
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                    )

                elif message_type == "ping":
                    # Respond to ping
                    await websocket.send_json(
                        {
                            "type": "pong",
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                    )

        except WebSocketDisconnect:
            await manager.disconnect(websocket, note_id, user_id, username)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            await manager.disconnect(websocket, note_id, user_id, username)

        break
