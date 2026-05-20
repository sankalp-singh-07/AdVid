"""add_projects_table

Revision ID: 0e75f5dba9b9
Revises: 65bde03ff64c
Create Date: 2026-05-19 19:46:40.728135

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e75f5dba9b9'
down_revision: Union[str, None] = '65bde03ff64c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'projects',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('aspect_ratio', sa.String(), nullable=True),
        sa.Column('user_prompt', sa.Text(), nullable=True),
        sa.Column('product_name', sa.String(), nullable=True),
        sa.Column('product_description', sa.Text(), nullable=True),
        sa.Column('target_length', sa.Integer(), nullable=True),
        sa.Column('image_url_1', sa.String(), nullable=True),
        sa.Column('image_url_2', sa.String(), nullable=True),
        sa.Column('combined_image_url', sa.String(), nullable=True),
        sa.Column('video_url', sa.String(), nullable=True),
        sa.Column('is_published', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_generating_image', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_generating_video', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('projects')

