"use client";

import { useState, type FormEvent } from "react";
import {
  sendAIChatMessage,
  type ChatMessage,
} from "@/lib/aiChatApi";
import type { BoardData } from "@/lib/kanban";

type AIChatPanelProps = {
  onBoardUpdate: (board: BoardData) => void;
  onPendingChange: (pending: boolean) => void;
  onSend: (
    message: string,
    history: ChatMessage[]
  ) => ReturnType<typeof sendAIChatMessage>;
};

export const AIChatPanel = ({
  onBoardUpdate,
  onPendingChange,
  onSend,
}: AIChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) {
      return;
    }

    setDraft("");
    setPendingMessage(message);
    setError(null);
    setLastUpdate(false);
    setIsSending(true);
    onPendingChange(true);

    try {
      const response = await onSend(message, messages);
      setMessages((current) => [
        ...current,
        { role: "user", content: message },
        { role: "assistant", content: response.reply },
      ]);
      if (response.board) {
        onBoardUpdate(response.board);
      }
      setLastUpdate(response.operations.length > 0);
      setPendingMessage(null);
    } catch (sendError: unknown) {
      setDraft(message);
      setPendingMessage(null);
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Não foi possível enviar a mensagem."
      );
    } finally {
      setIsSending(false);
      onPendingChange(false);
    }
  };

  return (
    <aside
      aria-labelledby="ai-chat-title"
      className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-[var(--stroke)] bg-white shadow-[var(--shadow)]"
    >
      <div className="border-b border-[var(--stroke)] bg-[var(--surface-strong)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--secondary-purple)]">
          Assistente do quadro
        </p>
        <h2
          id="ai-chat-title"
          className="mt-2 font-display text-xl font-semibold text-[var(--navy-dark)]"
        >
          Conversar com a IA
        </h2>
        <p className="mt-2 text-sm leading-5 text-[var(--gray-text)]">
          Peça sugestões ou solicite alterações nos cartões e colunas.
        </p>
      </div>

      <div
        className="flex-1 space-y-4 overflow-y-auto p-4"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversa com a IA"
      >
        {messages.length === 0 && !pendingMessage ? (
          <p className="rounded-2xl bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--gray-text)]">
            Olá. Posso ajudar a organizar o quadro, atualizar cartões ou resumir
            o andamento do trabalho.
          </p>
        ) : null}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "ml-6 rounded-2xl bg-[var(--primary-blue)] p-3 text-sm leading-5 text-white"
                : "mr-4 rounded-2xl bg-[var(--surface)] p-3 text-sm leading-5 text-[var(--navy-dark)]"
            }
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-75">
              {message.role === "user" ? "Você" : "Assistente"}
            </p>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        ))}
        {pendingMessage ? (
          <div className="ml-6 rounded-2xl bg-[var(--primary-blue)] p-3 text-sm leading-5 text-white">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-75">
              Você
            </p>
            <p className="whitespace-pre-wrap break-words">{pendingMessage}</p>
          </div>
        ) : null}
        {isSending ? (
          <p role="status" className="text-sm text-[var(--gray-text)]">
            A IA está preparando uma resposta...
          </p>
        ) : null}
        {lastUpdate ? (
          <p className="text-sm font-medium text-[var(--primary-blue)]">
            O quadro foi atualizado.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            Não foi possível enviar a mensagem. {error}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 border-t border-[var(--stroke)] p-4"
      >
        <label
          htmlFor="ai-chat-message"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]"
        >
          Sua mensagem
        </label>
        <textarea
          id="ai-chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={4000}
          rows={3}
          placeholder="Ex.: Mova o cartão de protótipo para Em andamento."
          className="w-full resize-y rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="w-full rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? "Enviando..." : "Enviar mensagem"}
        </button>
      </form>
    </aside>
  );
};
