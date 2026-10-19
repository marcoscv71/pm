import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthenticatedApp } from "@/components/AuthenticatedApp";
import { initialData } from "@/lib/kanban";

describe("AuthenticatedApp", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(initialData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the login screen when there is no session", async () => {
    render(<AuthenticatedApp />);

    expect(
      await screen.findByRole("heading", { name: "Acesse seu quadro" })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("column-col-backlog")).not.toBeInTheDocument();
  });

  it("rejects invalid credentials and accepts the fixed credentials", async () => {
    const user = userEvent.setup();
    render(<AuthenticatedApp />);

    await user.type(await screen.findByLabelText("Usuário"), "user");
    await user.type(screen.getByLabelText("Senha"), "incorrect");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Usuário ou senha inválidos."
    );
    expect(screen.queryByTestId("column-col-backlog")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Senha"));
    await user.type(screen.getByLabelText("Senha"), "password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByTestId("column-col-backlog")).toBeInTheDocument();
    expect(window.localStorage.getItem("kanban-studio-session")).toBe(
      "authenticated"
    );
  });

  it("restores a valid session on load and removes it on logout", async () => {
    window.localStorage.setItem("kanban-studio-session", "authenticated");
    const user = userEvent.setup();
    render(<AuthenticatedApp />);

    await user.click(
      await screen.findByRole("button", { name: "Sair" })
    );

    expect(
      await screen.findByRole("heading", { name: "Acesse seu quadro" })
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("kanban-studio-session")).toBeNull();
  });
});
