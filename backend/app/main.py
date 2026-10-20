from contextlib import asynccontextmanager
import os
from pathlib import Path
from collections.abc import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from app.ai_chat import AIChatRequest, AIChatResponse, run_ai_chat
from app.board import BoardData
from app.database import MVP_USER_ID, initialize_database, read_board, write_board
from app.openrouter import run_connection_check


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    initialize_database(app.state.database_path)
    yield


def create_app(
    database_path: Path | None = None,
    static_dir: Path | None = None,
) -> FastAPI:
    application = FastAPI(lifespan=lifespan)
    application.state.database_path = database_path or Path(
        os.environ.get(
            "DATABASE_PATH",
            str(Path(__file__).resolve().parents[1] / "data" / "pm.db"),
        )
    )

    @application.get("/api/board", response_model=BoardData)
    def get_board() -> BoardData:
        board = read_board(application.state.database_path, MVP_USER_ID)
        if board is None:
            raise HTTPException(status_code=404, detail="Board not found.")
        return board

    @application.put("/api/board", response_model=BoardData)
    def update_board(board: BoardData) -> BoardData:
        if not write_board(application.state.database_path, MVP_USER_ID, board):
            raise HTTPException(status_code=404, detail="Board not found.")
        return board

    @application.get("/api/hello")
    def hello() -> dict[str, str]:
        return {"message": "Hello, world!"}

    @application.post("/api/ai/check")
    def check_openrouter() -> dict[str, str]:
        return run_connection_check()

    @application.post("/api/ai/chat", response_model=AIChatResponse)
    def chat_with_openrouter(request: AIChatRequest) -> AIChatResponse:
        board = read_board(application.state.database_path, MVP_USER_ID)
        if board is None:
            raise HTTPException(status_code=404, detail="Board not found.")

        response = run_ai_chat(board, request)
        if response.board is not None and not write_board(
            application.state.database_path,
            MVP_USER_ID,
            response.board,
        ):
            raise HTTPException(status_code=404, detail="Board not found.")
        return response

    resolved_static_dir = static_dir or Path(
        os.environ.get(
            "FRONTEND_STATIC_DIR",
            str(Path(__file__).resolve().parents[2] / "frontend" / "out"),
        )
    )
    application.mount(
        "/", StaticFiles(directory=resolved_static_dir, html=True), name="static"
    )
    return application


app = create_app()
