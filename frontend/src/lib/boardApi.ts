import type { BoardData } from "@/lib/kanban";

const boardEndpoint = "/api/board";

const readBoardResponse = async (response: Response): Promise<BoardData> => {
  if (!response.ok) {
    throw new Error(`A API respondeu com o erro ${response.status}.`);
  }

  return (await response.json()) as BoardData;
};

export const fetchBoard = async (): Promise<BoardData> => {
  const response = await fetch(boardEndpoint);
  return readBoardResponse(response);
};

export const saveBoard = async (board: BoardData): Promise<BoardData> => {
  const response = await fetch(boardEndpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(board),
  });
  return readBoardResponse(response);
};
