"""fix note type enum values

Revision ID: 003
Revises: 002
Create Date: 2025-12-12

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the existing enum constraint and column
    op.drop_column("notes", "note_type")

    # Drop the old enum type
    op.execute("DROP TYPE IF EXISTS notetype")

    # Create the enum type with correct lowercase values
    op.execute("CREATE TYPE notetype AS ENUM ('standard', 'code')")

    # Re-add the column with the correct enum type
    op.add_column(
        "notes",
        sa.Column(
            "note_type",
            sa.Enum("standard", "code", name="notetype"),
            nullable=False,
            server_default="standard",
        ),
    )


def downgrade() -> None:
    # Drop column
    op.drop_column("notes", "note_type")

    # Drop enum type
    op.execute("DROP TYPE IF EXISTS notetype")

    # Recreate with uppercase (old version)
    op.execute("CREATE TYPE notetype AS ENUM ('STANDARD', 'CODE')")

    # Re-add column with old enum
    op.add_column(
        "notes",
        sa.Column(
            "note_type",
            sa.Enum("STANDARD", "CODE", name="notetype"),
            nullable=False,
            server_default="STANDARD",
        ),
    )
