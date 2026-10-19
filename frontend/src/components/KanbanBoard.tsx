"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { createId, moveCard, type BoardData } from "@/lib/kanban";
import { fetchBoard, saveBoard } from "@/lib/boardApi";

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0
    ? pointerCollisions
    : closestCorners(args);
};

type KanbanBoardProps = {
  onLogout: () => void;
};

export const KanbanBoard = ({ onLogout }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const boardRef = useRef<BoardData | null>(null);
  const persistedBoardRef = useRef<BoardData | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveRevisionRef = useRef(0);

  useEffect(() => {
    let isCurrent = true;

    fetchBoard()
      .then((loadedBoard) => {
        if (isCurrent) {
          boardRef.current = loadedBoard;
          persistedBoardRef.current = loadedBoard;
          setBoard(loadedBoard);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Ocorreu um erro inesperado."
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [loadAttempt]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board?.cards ?? {}, [board?.cards]);

  const updateBoard = (nextBoard: BoardData) => {
    boardRef.current = nextBoard;
    setBoard(nextBoard);
    setSaveError(null);
    setSaveStatus("saving");

    const revision = ++saveRevisionRef.current;
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        const savedBoard = await saveBoard(nextBoard);
        persistedBoardRef.current = savedBoard;
        if (revision === saveRevisionRef.current) {
          boardRef.current = savedBoard;
          setBoard(savedBoard);
          setSaveStatus("saved");
        }
      } catch (error: unknown) {
        if (revision === saveRevisionRef.current) {
          const persistedBoard = persistedBoardRef.current;
          boardRef.current = persistedBoard;
          setBoard(persistedBoard);
          setSaveError(
            error instanceof Error
              ? error.message
              : "Ocorreu um erro inesperado."
          );
          setSaveStatus("idle");
        }
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const currentBoard = boardRef.current;
    if (!currentBoard) {
      return;
    }
    updateBoard({
      ...currentBoard,
      columns: moveCard(
        currentBoard.columns,
        active.id as string,
        over.id as string
      ),
    });
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    const currentBoard = boardRef.current;
    if (!currentBoard) {
      return;
    }
    updateBoard({
      ...currentBoard,
      columns: currentBoard.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    });
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const currentBoard = boardRef.current;
    if (!currentBoard) {
      return;
    }
    const id = createId("card");
    updateBoard({
      ...currentBoard,
      cards: {
        ...currentBoard.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: currentBoard.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    });
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    const currentBoard = boardRef.current;
    if (!currentBoard) {
      return;
    }
    updateBoard({
      ...currentBoard,
      cards: Object.fromEntries(
        Object.entries(currentBoard.cards).filter(([id]) => id !== cardId)
      ),
      columns: currentBoard.columns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== cardId),
            }
          : column
      ),
    });
  };

  if (loadError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p role="alert" className="text-sm font-medium text-red-700">
          Não foi possível carregar o quadro. {loadError}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setLoadAttempt((attempt) => attempt + 1);
          }}
          className="rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-sm font-semibold text-white"
        >
          Tentar novamente
        </button>
      </main>
    );
  }

  if (!board) {
    return (
      <main
        role="status"
        className="flex min-h-screen items-center justify-center text-sm text-[var(--gray-text)]"
      >
        Carregando seu quadro...
      </main>
    );
  }

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Quadro Kanban único
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Acompanhe o andamento do trabalho. Renomeie colunas, arraste cartões entre etapas
                e registre observações sem se perder em configurações.
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  Foco
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                  Um quadro. Cinco colunas. Sem complicação.
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)]"
              >
                Sair
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
          <div aria-live="polite">
            {saveError ? (
              <p role="alert" className="text-sm font-medium text-red-700">
                Não foi possível salvar as alterações. Elas foram desfeitas.{" "}
                {saveError}
              </p>
            ) : saveStatus === "saving" ? (
              <p role="status" className="text-sm text-[var(--gray-text)]">
                Salvando alterações...
              </p>
            ) : saveStatus === "saved" ? (
              <p role="status" className="text-sm text-[var(--primary-blue)]">
                Alterações salvas.
              </p>
            ) : null}
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section className="grid gap-6 lg:grid-cols-5">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds.map((cardId) => board.cards[cardId])}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
