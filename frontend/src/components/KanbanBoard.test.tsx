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

describe("KanbanBoard", () => {
  const onLogout = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
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
    expect(await screen.findByText("Alterações salvas.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({ method: "PUT" })
    );
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
});
