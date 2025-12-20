"""add note type

Revision ID: 002
Revises: 001_initial_complete
Create Date: 2025-12-12

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001_initial_complete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type
    note_type_enum = sa.Enum("standard", "code", name="notetype")
    note_type_enum.create(op.get_bind(), checkfirst=True)

    # Add note_type column with default value
    op.add_column(
        "notes", sa.Column("note_type", note_type_enum, nullable=False, server_default="standard")
    )


def downgrade() -> None:
    # Remove note_type column
    op.drop_column("notes", "note_type")

    # Drop enum type
    note_type_enum = sa.Enum("standard", "code", name="notetype")
    note_type_enum.drop(op.get_bind(), checkfirst=True)
