import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const putRequests = () =>
  vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "PUT");

describe("KanbanBoard", () => {
  const onLogout = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        if (String(_input) === "/api/ai/chat") {
          return Promise.resolve(
            jsonResponse({
              reply: "Tudo certo.",
              operations: [],
              board: null,
            })
          );
        }
        const board =
          init?.method === "PUT"
            ? JSON.parse(String(init.body))
            : initialData;
        return Promise.resolve(jsonResponse(board));
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state before rendering the API board", async () => {
    render(<KanbanBoard onLogout={onLogout} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando seu quadro..."
    );
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("loads a board and saves a renamed column", async () => {
    render(<KanbanBoard onLogout={onLogout} />);
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Título da coluna");
    await userEvent.clear(input);
    await userEvent.type(input, "Novo nome");
    expect(input).toHaveValue("Novo nome");
    expect(putRequests()).toHaveLength(0);

    await userEvent.type(input, "{Enter}");

    expect(await screen.findByText("Alterações salvas.")).toBeInTheDocument();
    expect(putRequests()).toHaveLength(1);
    expect(JSON.parse(String(putRequests()[0][1]?.body)).columns[0].title).toBe(
      "Novo nome"
    );
  });

  it("does not save a blank or unchanged column title", async () => {
    render(<KanbanBoard onLogout={onLogout} />);
    const input = within(
      await screen.findByTestId("column-col-backlog")
    ).getByLabelText("Título da coluna");

    await userEvent.clear(input);
    await userEvent.tab();
    expect(input).toHaveValue("Pendências");

    await userEvent.click(input);
    await userEvent.tab();
    expect(putRequests()).toHaveLength(0);
  });

  it("loads cards from the API and saves card additions and removals", async () => {
    render(<KanbanBoard onLogout={onLogout} />);
    await screen.findAllByTestId(/column-/i);
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /adicionar cartão/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/título do cartão/i);
    await userEvent.type(titleInput, "Novo cartão");
    const detailsInput = within(column).getByPlaceholderText(/detalhes/i);
    await userEvent.type(detailsInput, "Observações");

    await userEvent.click(
      within(column).getByRole("button", { name: /adicionar cartão/i })
    );

    expect(within(column).getByText("Novo cartão")).toBeInTheDocument();
    expect(await screen.findByText("Alterações salvas.")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /remover novo cartão/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("Novo cartão")).not.toBeInTheDocument();
    expect(await screen.findByText("Alterações salvas.")).toBeInTheDocument();
  });

  it("shows a load error and retries without showing the demo board", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response("", { status: 503, statusText: "Unavailable" })
      )
      .mockResolvedValueOnce(jsonResponse(initialData));
    render(<KanbanBoard onLogout={onLogout} />);

    expect(
      await screen.findByText(/Não foi possível carregar o quadro/)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("column-col-backlog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByTestId("column-col-backlog")).toBeInTheDocument();
  });

  it("reverts an optimistic change and reports a save error", async () => {
    vi.mocked(fetch).mockImplementation(async (_input, init) => {
      if (init?.method === "PUT") {
        return new Response("", {
          status: 500,
          statusText: "Internal Server Error",
        });
      }
      return jsonResponse(initialData);
    });
    render(<KanbanBoard onLogout={onLogout} />);
    const column = await screen.findByTestId("column-col-backlog");
    const title = within(column).getByLabelText("Título da coluna");
    await userEvent.clear(title);
    await userEvent.type(title, "Alteração não salva");
    await userEvent.tab();

    expect(
      await screen.findByText(/Não foi possível salvar as alterações/)
    ).toBeInTheDocument();
    expect(title).toHaveValue("Pendências");
  });

  it("shows the AI loading state and applies its persisted board update", async () => {
    let resolveChat: ((response: Response) => void) | undefined;
    const updatedBoard = structuredClone(initialData);
    updatedBoard.cards["card-1"].title = "Planejar o roteiro";
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (String(input) === "/api/ai/chat") {
        return new Promise((resolve) => {
          resolveChat = resolve;
        });
      }
      const nextBoard =
        init?.method === "PUT"
          ? JSON.parse(String(init.body))
          : initialData;
      return Promise.resolve(jsonResponse(nextBoard));
    });

    render(<KanbanBoard onLogout={onLogout} />);
    await screen.findAllByTestId(/column-/i);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Sua mensagem"),
      "Atualize o cartão do roteiro."
    );
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(
      screen.getByText("A IA está preparando uma resposta...")
    ).toHaveAttribute("role", "status");
    expect(
      screen.getByTestId("column-col-backlog").closest("[inert]")
    ).not.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          message: "Atualize o cartão do roteiro.",
          history: [],
        }),
      })
    );

    resolveChat?.(
      jsonResponse({
        reply: "Atualizei o título do cartão.",
        operations: [
          { type: "edit_card", card_id: "card-1", title: "Planejar o roteiro" },
        ],
        board: updatedBoard,
      })
    );

    expect(
      await screen.findByText("Atualizei o título do cartão.")
    ).toBeInTheDocument();
    expect(screen.getByText("O quadro foi atualizado.")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("card-card-1")).getByText(
        "Planejar o roteiro"
      )
    ).toBeInTheDocument();
    expect(
      vi.mocked(fetch).mock.calls.filter(
        ([input, init]) => String(input) === "/api/board" && init?.method === "PUT"
      )
    ).toHaveLength(0);
  });

  it("shows the assistant reply when it does not update the board", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input) === "/api/ai/chat") {
        return jsonResponse({
          reply: "O quadro está em ordem.",
          operations: [],
          board: null,
        });
      }
      const nextBoard =
        init?.method === "PUT"
          ? JSON.parse(String(init.body))
          : initialData;
      return jsonResponse(nextBoard);
    });
    render(<KanbanBoard onLogout={onLogout} />);
    await screen.findAllByTestId(/column-/i);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Sua mensagem"), "Resuma o quadro.");
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(await screen.findByText("O quadro está em ordem.")).toBeInTheDocument();
    expect(screen.queryByText("O quadro foi atualizado.")).not.toBeInTheDocument();
  });

  it("sends the chat message with Enter and adds a line break with Shift+Enter", async () => {
    render(<KanbanBoard onLogout={onLogout} />);
    await screen.findAllByTestId(/column-/i);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Sua mensagem");
    await user.type(input, "Primeira linha{Shift>}{Enter}{/Shift}Segunda linha");

    expect(input).toHaveValue("Primeira linha\nSegunda linha");

    await user.type(input, "{Enter}");

    expect(await screen.findByText("Tudo certo.")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/ai/chat",
      expect.objectContaining({
        body: JSON.stringify({
          message: "Primeira linha\nSegunda linha",
          history: [],
        }),
      })
    );
  });

  it("reports chat failures and keeps the message available for retry", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input) === "/api/ai/chat") {
        return new Response(
          JSON.stringify({ detail: "OpenRouter indisponível." }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
      const nextBoard =
        init?.method === "PUT"
          ? JSON.parse(String(init.body))
          : initialData;
      return jsonResponse(nextBoard);
    });
    render(<KanbanBoard onLogout={onLogout} />);
    await screen.findAllByTestId(/column-/i);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Sua mensagem");
    await user.type(input, "Ajude-me com o quadro.");
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "OpenRouter indisponível."
    );
    expect(input).toHaveValue("Ajude-me com o quadro.");
    expect(screen.getByTestId("card-card-1")).toHaveTextContent(
      "Alinhar temas do roteiro"
    );
  });
});
