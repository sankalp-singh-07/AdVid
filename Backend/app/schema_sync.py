from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection
from sqlalchemy.schema import CreateColumn

from app.db import Base
from utils.logger import get_logger


logger = get_logger("schema_sync")


def ensure_missing_columns(connection: Connection) -> None:
    """
    Add safe, missing model columns to existing tables.

    SQLAlchemy's create_all creates new tables but does not alter old tables.
    This keeps development databases from crashing when a nullable column is
    added before an Alembic migration has been applied.
    """
    inspector = inspect(connection)
    preparer = connection.dialect.identifier_preparer

    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue

        existing_columns = {
            column["name"] for column in inspector.get_columns(table.name)
        }

        for column in table.columns:
            if column.name in existing_columns:
                continue

            if not column.nullable and column.server_default is None:
                logger.warning(
                    "Skipping missing non-nullable column without server default: %s.%s",
                    table.name,
                    column.name,
                )
                continue

            table_name = preparer.format_table(table)
            column_sql = CreateColumn(column).compile(dialect=connection.dialect)
            logger.warning(
                "Adding missing database column: %s.%s",
                table.name,
                column.name,
            )
            connection.execute(
                text(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")
            )
