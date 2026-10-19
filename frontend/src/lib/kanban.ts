export type Card = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardData = {
  columns: Column[];
  cards: Record<string, Card>;
};

export const initialData: BoardData = {
  columns: [
    { id: "col-backlog", title: "Pendências", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Descoberta", cardIds: ["card-3"] },
    {
      id: "col-progress",
      title: "Em andamento",
      cardIds: ["card-4", "card-5"],
    },
    { id: "col-review", title: "Em revisão", cardIds: ["card-6"] },
    { id: "col-done", title: "Concluído", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Alinhar temas do roteiro",
      details: "Elaborar temas trimestrais com declarações de impacto e métricas.",
    },
    "card-2": {
      id: "card-2",
      title: "Reunir feedback dos clientes",
      details: "Analisar marcadores de suporte, notas de vendas e feedback sobre cancelamentos.",
    },
    "card-3": {
      id: "card-3",
      title: "Criar protótipo do painel de análise",
      details: "Esboçar o layout inicial do painel e os principais níveis de detalhamento.",
    },
    "card-4": {
      id: "card-4",
      title: "Refinar os nomes dos status",
      details: "Padronizar os nomes e o tom das colunas do quadro.",
    },
    "card-5": {
      id: "card-5",
      title: "Projetar o layout dos cartões",
      details: "Definir hierarquia visual e espaçamento para facilitar a leitura de listas extensas.",
    },
    "card-6": {
      id: "card-6",
      title: "Testar microinterações",
      details: "Verificar estados de foco, carregamento e passagem do cursor.",
    },
    "card-7": {
      id: "card-7",
      title: "Publicar a página de marketing",
      details: "Texto final aprovado e pacote de recursos entregue.",
    },
    "card-8": {
      id: "card-8",
      title: "Concluir a sprint de integração",
      details: "Documentar as notas da versão e compartilhá-las com a equipe.",
    },
  },
};

const isColumnId = (columns: Column[], id: string) =>
  columns.some((column) => column.id === id);

const findColumnId = (columns: Column[], id: string) => {
  if (isColumnId(columns, id)) {
    return id;
  }
  return columns.find((column) => column.cardIds.includes(id))?.id;
};

export const moveCard = (
  columns: Column[],
  activeId: string,
  overId: string
): Column[] => {
  const activeColumnId = findColumnId(columns, activeId);
  const overColumnId = findColumnId(columns, overId);

  if (!activeColumnId || !overColumnId) {
    return columns;
  }

  const activeColumn = columns.find((column) => column.id === activeColumnId);
  const overColumn = columns.find((column) => column.id === overColumnId);

  if (!activeColumn || !overColumn) {
    return columns;
  }

  const isOverColumn = isColumnId(columns, overId);

  if (activeColumnId === overColumnId) {
    if (isOverColumn) {
      const nextCardIds = activeColumn.cardIds.filter(
        (cardId) => cardId !== activeId
      );
      nextCardIds.push(activeId);
      return columns.map((column) =>
        column.id === activeColumnId
          ? { ...column, cardIds: nextCardIds }
          : column
      );
    }

    const oldIndex = activeColumn.cardIds.indexOf(activeId);
    const newIndex = activeColumn.cardIds.indexOf(overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return columns;
    }

    const nextCardIds = [...activeColumn.cardIds];
    nextCardIds.splice(oldIndex, 1);
    nextCardIds.splice(newIndex, 0, activeId);

    return columns.map((column) =>
      column.id === activeColumnId
        ? { ...column, cardIds: nextCardIds }
        : column
    );
  }

  const activeIndex = activeColumn.cardIds.indexOf(activeId);
  if (activeIndex === -1) {
    return columns;
  }

  const nextActiveCardIds = [...activeColumn.cardIds];
  nextActiveCardIds.splice(activeIndex, 1);

  const nextOverCardIds = [...overColumn.cardIds];
  if (isOverColumn) {
    nextOverCardIds.push(activeId);
  } else {
    const overIndex = overColumn.cardIds.indexOf(overId);
    const insertIndex = overIndex === -1 ? nextOverCardIds.length : overIndex;
    nextOverCardIds.splice(insertIndex, 0, activeId);
  }

  return columns.map((column) => {
    if (column.id === activeColumnId) {
      return { ...column, cardIds: nextActiveCardIds };
    }
    if (column.id === overColumnId) {
      return { ...column, cardIds: nextOverCardIds };
    }
    return column;
  });
};

export const createId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}-${randomPart}${timePart}`;
};
