"""add missing combined_image_url

Revision ID: f2b43a9d2c6e
Revises: 0e75f5dba9b9
Create Date: 2026-05-25 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2b43a9d2c6e"
down_revision: Union[str, None] = "0e75f5dba9b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("projects")}

    if "combined_image_url" not in columns:
        op.add_column(
            "projects",
            sa.Column("combined_image_url", sa.String(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("projects")}

    if "combined_image_url" in columns:
        op.drop_column("projects", "combined_image_url")
