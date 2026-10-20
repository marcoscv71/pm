import json
import re
import sqlite3
from email.message import Message
from io import BytesIO
from collections.abc import Iterator
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request

import pytest
from fastapi.testclient import TestClient

from app.board import INITIAL_BOARD
from app.database import MVP_USER_ID, initialize_database
from app.main import create_app
from app.openrouter import CHECK_PROMPT, MODEL, OPENROUTER_URL


@pytest.fixture
def database_path(tmp_path: Path) -> Path:
    return tmp_path / "nested" / "project.db"


@pytest.fixture
def client(database_path: Path) -> Iterator[TestClient]:
    application = create_app(database_path=database_path)
    with TestClient(application) as test_client:
        yield test_client


def test_hello_api_returns_message(client: TestClient) -> None:
    response = client.get("/api/hello")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello, world!"}


def test_root_serves_static_kanban_board(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Kanban Studio" in response.text
    assert "lang=\"pt-BR\"" in response.text


def test_root_serves_frontend_assets(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "/_next/static/" in response.text

    script_path = re.search(
        r'<script[^>]+src="(/_next/static/[^"]+)"', response.text
    )
    assert script_path is not None
    asset_response = client.get(script_path.group(1))

    assert asset_response.status_code == 200
    assert "javascript" in asset_response.headers["content-type"]


def test_missing_database_is_initialized_with_user_and_initial_board(
    client: TestClient,
    database_path: Path,
) -> None:
    assert database_path.exists()
    assert client.get("/api/board").status_code == 200

    with sqlite3.connect(database_path) as connection:
        assert connection.execute("PRAGMA user_version").fetchone()[0] == 1
        users = connection.execute("SELECT id, username FROM users").fetchall()
        board_row = connection.execute(
            "SELECT user_id, data FROM boards"
        ).fetchone()
        foreign_key = connection.execute("PRAGMA foreign_key_list(boards)").fetchone()

    assert users == [(MVP_USER_ID, "user")]
    assert board_row is not None
    assert board_row[0] == MVP_USER_ID
    assert json.loads(board_row[1]) == INITIAL_BOARD.model_dump(mode="json")
    assert foreign_key is not None
    assert foreign_key[2:5] == ("users", "user_id", "id")


def test_database_rejects_board_for_unknown_user(database_path: Path) -> None:
    initialize_database(database_path)
    with sqlite3.connect(database_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                """
                INSERT INTO boards (id, user_id, data, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                ("invalid-board", "missing-user", "{}", "2026-01-01T00:00:00+00:00"),
            )


def test_get_and_update_board_preserve_data_and_order(
    client: TestClient,
) -> None:
    initial_response = client.get("/api/board")
    assert initial_response.status_code == 200
    original = initial_response.json()

    original["columns"][0]["title"] = "A fazer"
    original["columns"][0]["cardIds"].reverse()
    updated_response = client.put("/api/board", json=original)

    assert updated_response.status_code == 200
    assert updated_response.json() == original
    assert client.get("/api/board").json() == original


def test_board_survives_application_restart(database_path: Path) -> None:
    first_app = create_app(database_path=database_path)
    with TestClient(first_app) as first_client:
        board = first_client.get("/api/board").json()
        board["columns"][0]["title"] = "Persistido"
        assert first_client.put("/api/board", json=board).status_code == 200

    restarted_app = create_app(database_path=database_path)
    with TestClient(restarted_app) as restarted_client:
        response = restarted_client.get("/api/board")

    assert response.status_code == 200
    assert response.json()["columns"][0]["title"] == "Persistido"


def test_api_always_uses_fixed_user_without_accepting_user_selection(
    client: TestClient,
    database_path: Path,
) -> None:
    other_board = INITIAL_BOARD.model_copy(deep=True)
    other_board.columns[0].title = "Outro usuário"

    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "INSERT INTO users (id, username) VALUES (?, ?)",
            ("other-user", "other"),
        )
        connection.execute(
            """
            INSERT INTO boards (id, user_id, data, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                "other-board",
                "other-user",
                other_board.model_dump_json(),
                "2026-01-01T00:00:00+00:00",
            ),
        )

    response = client.get("/api/board", params={"user_id": "other-user"})

    assert response.status_code == 200
    assert response.json()["columns"][0]["title"] == "Pendências"


@pytest.mark.parametrize(
    "board",
    [
        {"columns": [], "cards": {}},
        {
            "columns": [{"id": "col-1", "title": "A fazer", "cardIds": ["missing"]}],
            "cards": {},
        },
        {
            "columns": [{"id": "col-1", "title": "A", "cardIds": ["card-1"]}],
            "cards": {
                "card-1": {"id": "card-1", "title": "Tarefa", "details": ""},
                "extra": {"id": "extra", "title": "Órfão", "details": ""},
            },
        },
        {
            "columns": [
                {"id": "col-1", "title": "A", "cardIds": ["card-1"]},
                {"id": "col-1", "title": "B", "cardIds": []},
            ],
            "cards": {"card-1": {"id": "card-1", "title": "Tarefa", "details": ""}},
        },
    ],
)
def test_update_rejects_invalid_board_data(
    client: TestClient,
    board: dict[str, object],
) -> None:
    response = client.put("/api/board", json=board)

    assert response.status_code == 422


def test_update_rejects_user_id_in_request(client: TestClient) -> None:
    board = INITIAL_BOARD.model_dump(mode="json")
    board["user_id"] = "other-user"

    response = client.put("/api/board", json=board)

    assert response.status_code == 422


def test_missing_board_returns_not_found(
    client: TestClient,
    database_path: Path,
) -> None:
    with sqlite3.connect(database_path) as connection:
        connection.execute("DELETE FROM boards WHERE user_id = ?", (MVP_USER_ID,))

    assert client.get("/api/board").status_code == 404
    assert client.put(
        "/api/board",
        json=INITIAL_BOARD.model_dump(mode="json"),
    ).status_code == 404


def test_openrouter_check_sends_expected_request_and_returns_answer(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.openrouter as openrouter

    api_key = "test-only-secret"
    monkeypatch.setenv("OPENROUTER_API_KEY", api_key)
    captured_requests: list[Request] = []
    captured_timeouts: list[int] = []

    def fake_urlopen(request: Request, timeout: int) -> BytesIO:
        captured_requests.append(request)
        captured_timeouts.append(timeout)
        return BytesIO(
            json.dumps(
                {"choices": [{"message": {"content": "4"}}]}
            ).encode()
        )

    monkeypatch.setattr(openrouter, "urlopen", fake_urlopen)
    response = client.post("/api/ai/check")

    request = captured_requests[0]
    assert response.status_code == 200
    assert response.json() == {"model": MODEL, "answer": "4"}
    assert request.full_url == OPENROUTER_URL
    assert request.get_method() == "POST"
    assert request.get_header("Authorization") == f"Bearer {api_key}"
    assert request.get_header("Content-type") == "application/json"
    assert captured_timeouts == [30]
    assert request.data is not None
    assert json.loads(request.data) == {
        "model": MODEL,
        "messages": [{"role": "user", "content": CHECK_PROMPT}],
        "temperature": 0,
    }
    assert api_key not in response.text


def test_openrouter_check_returns_configuration_error_without_key(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    response = client.post("/api/ai/check")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "OpenRouter is not configured. Set OPENROUTER_API_KEY."
    }


@pytest.mark.parametrize(
    ("failure", "expected_detail"),
    [
        (
            HTTPError(
                OPENROUTER_URL,
                429,
                "Rate limited",
                Message(),
                BytesIO(b"private"),
            ),
            "OpenRouter returned HTTP 429.",
        ),
        (URLError("offline"), "Could not connect to OpenRouter."),
        (TimeoutError(), "Could not connect to OpenRouter."),
    ],
)
def test_openrouter_check_reports_provider_and_network_errors_safely(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    failure: Exception,
    expected_detail: str,
) -> None:
    import app.openrouter as openrouter

    api_key = "test-only-secret"
    monkeypatch.setenv("OPENROUTER_API_KEY", api_key)

    def fail_urlopen(request: Request, timeout: int) -> BytesIO:
        _ = request, timeout
        raise failure

    monkeypatch.setattr(openrouter, "urlopen", fail_urlopen)
    response = client.post("/api/ai/check")

    assert response.status_code == 502
    assert response.json() == {"detail": expected_detail}
    assert api_key not in response.text
    assert "private" not in response.text


@pytest.mark.parametrize(
    ("body", "expected_detail"),
    [
        (b"not-json", "OpenRouter returned an invalid response."),
        (b'{"choices":[]}', "OpenRouter returned an invalid response."),
        (
            b'{"choices":[{"message":{"content":" "}}]}',
            "OpenRouter returned an empty response.",
        ),
    ],
)
def test_openrouter_check_rejects_invalid_provider_responses(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    body: bytes,
    expected_detail: str,
) -> None:
    import app.openrouter as openrouter

    monkeypatch.setenv("OPENROUTER_API_KEY", "test-only-secret")

    def return_invalid_response(request: Request, timeout: int) -> BytesIO:
        _ = request, timeout
        return BytesIO(body)

    monkeypatch.setattr(openrouter, "urlopen", return_invalid_response)

    response = client.post("/api/ai/check")

    assert response.status_code == 502
    assert response.json() == {"detail": expected_detail}
