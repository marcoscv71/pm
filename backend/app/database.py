import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from app.board import BoardData, INITIAL_BOARD

MVP_USER_ID = "user"
SCHEMA_VERSION = 1


@contextmanager
def _connect(database_path: Path) -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(database_path)
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize_database(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)

    with _connect(database_path) as connection:
        connection.execute("BEGIN IMMEDIATE")

        version = connection.execute("PRAGMA user_version").fetchone()[0]
        if version > SCHEMA_VERSION:
            raise RuntimeError(
                f"Database schema version {version} is newer than supported version {SCHEMA_VERSION}."
            )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS boards (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
                data TEXT NOT NULL CHECK (json_valid(data)),
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)",
            (MVP_USER_ID, MVP_USER_ID),
        )
        connection.execute(
            """
            INSERT OR IGNORE INTO boards (id, user_id, data, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                "board-user",
                MVP_USER_ID,
                INITIAL_BOARD.model_dump_json(),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        connection.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")


def read_board(database_path: Path, user_id: str) -> BoardData | None:
    with _connect(database_path) as connection:
        row = connection.execute(
            "SELECT data FROM boards WHERE user_id = ?",
            (user_id,),
        ).fetchone()

    if row is None:
        return None
    return BoardData.model_validate(json.loads(row[0]))


def write_board(database_path: Path, user_id: str, board: BoardData) -> bool:
    with _connect(database_path) as connection:
        cursor = connection.execute(
            """
            UPDATE boards
            SET data = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (
                board.model_dump_json(),
                datetime.now(timezone.utc).isoformat(),
                user_id,
            ),
        )
        return cursor.rowcount == 1
