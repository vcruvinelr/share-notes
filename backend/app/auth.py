import uuid
from typing import Optional

from fastapi import Depends, HTTPException, Request, Response, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from keycloak import KeycloakOpenID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import UserCreate

security = HTTPBearer(auto_error=False)

# Keycloak client
keycloak_openid = KeycloakOpenID(
    server_url=settings.KEYCLOAK_URL,
    client_id=settings.KEYCLOAK_CLIENT_ID,
    realm_name=settings.KEYCLOAK_REALM,
    client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
)


async def get_current_user(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get current user from JWT token or return None for anonymous.
    Anonymous users are tracked via X-Anonymous-User-Id header or cookie.
    Priority: JWT token > anonymous header > anonymous cookie
    """
    # DEBUG: Check what we received
    auth_header = request.headers.get("Authorization")
    print(f"DEBUG: Authorization header: {auth_header[:50] if auth_header else 'None'}")
    print(f"DEBUG: Credentials object: {credentials}")

    # Priority 1: Check for JWT token first (authenticated users)
    if credentials:
        token = credentials.credentials
        print(f"DEBUG: Processing JWT token for authentication")

        try:
            # Decode JWT token
            KEYCLOAK_PUBLIC_KEY = f"-----BEGIN PUBLIC KEY-----\n{keycloak_openid.public_key()}\n-----END PUBLIC KEY-----"

            # First decode without verification to see what's in the token
            import base64
            import json

            parts = token.split(".")
            if len(parts) >= 2:
                payload_part = parts[1]
                # Add padding if needed
                padding = len(payload_part) % 4
                if padding:
                    payload_part += "=" * (4 - padding)
                decoded_payload = json.loads(base64.urlsafe_b64decode(payload_part))
                print(f"DEBUG: Raw JWT payload: {decoded_payload}")

            # Decode with verification, but don't require audience
            payload = jwt.decode(
                token,
                KEYCLOAK_PUBLIC_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_aud": False},  # Keycloak tokens might not have audience
            )

            keycloak_id: str = payload.get("sub")
            email: str = payload.get("email")
            username: str = payload.get("preferred_username")

            # If sub is missing, use email as unique identifier (Keycloak fallback)
            if keycloak_id is None and email:
                # Use email as the keycloak_id fallback
                keycloak_id = f"email:{email}"
                print(f"DEBUG: No 'sub' claim found, using email as identifier: {keycloak_id}")

            print(
                f"DEBUG: JWT decoded - keycloak_id={keycloak_id}, email={email}, username={username}"
            )

            if keycloak_id is None:
                # Invalid token, fall through to anonymous
                print("DEBUG: No keycloak_id or email in token, falling back to anonymous")
                pass
            else:
                # Get or create user
                result = await db.execute(select(User).where(User.keycloak_id == keycloak_id))
                user = result.scalar_one_or_none()

                if not user:
                    # Create new user
                    user = User(
                        keycloak_id=keycloak_id,
                        email=email,
                        username=username,
                        is_anonymous=False,
                    )
                    db.add(user)
                    try:
                        await db.commit()
                        await db.refresh(user)
                    except Exception as e:
                        # Handle duplicate email/username - user might exist with different keycloak_id
                        await db.rollback()
                        print(f"DEBUG: Error creating user, checking if user exists by email: {e}")
                        # Try to find by email instead
                        if email:
                            result = await db.execute(
                                select(User).where(User.email == email, User.is_anonymous == False)
                            )
                            user = result.scalar_one_or_none()
                        if user:
                            # Update keycloak_id for existing user
                            user.keycloak_id = keycloak_id
                            if username:
                                user.username = username
                            await db.commit()
                            await db.refresh(user)
                        else:
                            raise

                # Clear anonymous cookie when authenticated
                response.delete_cookie(key="anonymous_user_id")

                return user

        except JWTError:
            # Invalid token, fall through to anonymous
            pass

    # Priority 2: No token provided or invalid token, check for anonymous user
    # Check for anonymous user ID from header (frontend localStorage)
    anonymous_user_id = request.headers.get("X-Anonymous-User-Id")

    # Fallback to cookie if header not present
    if not anonymous_user_id:
        anonymous_user_id = request.cookies.get("anonymous_user_id")

    if anonymous_user_id:
        try:
            user_uuid = uuid.UUID(anonymous_user_id)
            result = await db.execute(
                select(User).where(User.id == user_uuid, User.is_anonymous == True)
            )
            user = result.scalar_one_or_none()
            if user:
                return user
        except (ValueError, AttributeError):
            pass

    # No valid session
    return None


async def get_current_user_required(user: Optional[User] = Depends(get_current_user)) -> User:
    """
    Require authenticated user.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user


async def get_or_create_anonymous_user(db: AsyncSession, user_id: Optional[str] = None) -> User:
    """
    Create an anonymous user for unauthenticated access.
    If user_id is provided from frontend, use it to maintain consistency.
    """
    if user_id:
        try:
            user_uuid = uuid.UUID(user_id)
            # Check if user already exists
            result = await db.execute(
                select(User).where(User.id == user_uuid, User.is_anonymous == True)
            )
            existing_user = result.scalar_one_or_none()
            if existing_user:
                return existing_user
            # Create user with provided ID
            user = User(
                id=user_uuid,
                is_anonymous=True,
            )
        except (ValueError, AttributeError):
            # Invalid UUID, create new one
            user = User(
                id=uuid.uuid4(),
                is_anonymous=True,
            )
    else:
        user = User(
            id=uuid.uuid4(),
            is_anonymous=True,
        )

    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
        return user
    except Exception as e:
        # Handle race condition: user was created between check and insert
        await db.rollback()
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                result = await db.execute(
                    select(User).where(User.id == user_uuid, User.is_anonymous == True)
                )
                existing_user = result.scalar_one_or_none()
                if existing_user:
                    return existing_user
            except (ValueError, AttributeError):
                pass
        raise


async def get_current_user_ws(
    websocket: WebSocket, token: Optional[str] = None, db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from WebSocket connection.
    """
    if not token:
        return None

    try:
        KEYCLOAK_PUBLIC_KEY = (
            f"-----BEGIN PUBLIC KEY-----\n{keycloak_openid.public_key()}\n-----END PUBLIC KEY-----"
        )

        payload = jwt.decode(
            token,
            KEYCLOAK_PUBLIC_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.KEYCLOAK_CLIENT_ID,
        )

        keycloak_id: str = payload.get("sub")

        if keycloak_id is None:
            return None

        result = await db.execute(select(User).where(User.keycloak_id == keycloak_id))
        user = result.scalar_one_or_none()

        return user

    except JWTError:
        return None
