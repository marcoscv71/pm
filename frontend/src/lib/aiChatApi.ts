import type { BoardData } from "@/lib/kanban";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatOperation =
  | {
      type: "create_card";
      column_id: string;
      title: string;
      details: string;
    }
  | {
      type: "edit_card";
      card_id: string;
      title?: string;
      details?: string;
    }
  | {
      type: "move_card";
      card_id: string;
      column_id: string;
    }
  | {
      type: "rename_column";
      column_id: string;
      title: string;
    }
  | {
      type: "delete_card";
      card_id: string;
    };

export type AIChatResponse = {
  reply: string;
  operations: ChatOperation[];
  board: BoardData | null;
};

const chatEndpoint = "/api/ai/chat";

export const sendAIChatMessage = async (
  message: string,
  history: ChatMessage[]
): Promise<AIChatResponse> => {
  const response = await fetch(chatEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: history.slice(-20) }),
  });

  if (!response.ok) {
    let detail = `A API respondeu com o erro ${response.status}.`;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        typeof body.detail === "string"
      ) {
        detail = body.detail;
      }
    } catch {
      // Keep the status-based error when the server response is not JSON.
    }
    throw new Error(detail);
  }

  return (await response.json()) as AIChatResponse;
};
