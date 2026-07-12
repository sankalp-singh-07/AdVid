"""knowledge bases and production fields

Revision ID: c3f1a2b9d4e5
Revises: ab80ca409237
Create Date: 2026-07-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3f1a2b9d4e5"
down_revision: Union[str, None] = "2c824e980231"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "knowledge_bases",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_knowledge_bases_user_id", "knowledge_bases", ["user_id"])

    # Document production fields
    with op.batch_alter_table("documents") as batch_op:
        batch_op.add_column(sa.Column("knowledge_base_id", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("mime_type", sa.String(), nullable=True))
        batch_op.add_column(
            sa.Column("progress", sa.Integer(), server_default="0", nullable=False)
        )
        batch_op.add_column(sa.Column("stage", sa.String(), nullable=True))
        batch_op.add_column(
            sa.Column("retry_count", sa.Integer(), server_default="0", nullable=False)
        )
        batch_op.create_foreign_key(
            "fk_documents_knowledge_base_id",
            "knowledge_bases",
            ["knowledge_base_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("ix_documents_knowledge_base_id", ["knowledge_base_id"])
        batch_op.create_index("ix_documents_user_id", ["user_id"])

    with op.batch_alter_table("conversations") as batch_op:
        batch_op.add_column(sa.Column("knowledge_base_id", sa.String(), nullable=True))
        batch_op.create_foreign_key(
            "fk_conversations_knowledge_base_id",
            "knowledge_bases",
            ["knowledge_base_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("ix_conversations_knowledge_base_id", ["knowledge_base_id"])
        batch_op.create_index("ix_conversations_user_id", ["user_id"])

    with op.batch_alter_table("messages") as batch_op:
        batch_op.create_index("ix_messages_conversation_id", ["conversation_id"])


def downgrade() -> None:
    with op.batch_alter_table("messages") as batch_op:
        batch_op.drop_index("ix_messages_conversation_id")

    with op.batch_alter_table("conversations") as batch_op:
        batch_op.drop_index("ix_conversations_user_id")
        batch_op.drop_index("ix_conversations_knowledge_base_id")
        batch_op.drop_constraint("fk_conversations_knowledge_base_id", type_="foreignkey")
        batch_op.drop_column("knowledge_base_id")

    with op.batch_alter_table("documents") as batch_op:
        batch_op.drop_index("ix_documents_user_id")
        batch_op.drop_index("ix_documents_knowledge_base_id")
        batch_op.drop_constraint("fk_documents_knowledge_base_id", type_="foreignkey")
        batch_op.drop_column("retry_count")
        batch_op.drop_column("stage")
        batch_op.drop_column("progress")
        batch_op.drop_column("mime_type")
        batch_op.drop_column("knowledge_base_id")

    op.drop_index("ix_knowledge_bases_user_id", table_name="knowledge_bases")
    op.drop_table("knowledge_bases")
