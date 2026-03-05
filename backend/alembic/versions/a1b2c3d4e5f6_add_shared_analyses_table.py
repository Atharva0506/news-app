"""add shared_analyses table

Revision ID: a1b2c3d4e5f6
Revises: 0ee83ce20fa4
Create Date: 2026-03-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "0ee83ce20fa4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shared_analyses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("article_title", sa.String(), nullable=False),
        sa.Column("article_url", sa.String(), nullable=False),
        sa.Column("analysis_json", sa.JSON(), nullable=False),
        sa.Column("view_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("shared_analyses")
