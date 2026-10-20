import { expect, test } from "@playwright/test";
import type { AIChatResponse } from "../src/lib/aiChatApi";
import { initialData, type BoardData } from "../src/lib/kanban";

const installBoardApi = async (page: import("@playwright/test").Page) => {
  let board: BoardData = structuredClone(initialData);
  let failLoads = false;
  let failNextSave = false;
  let failChat = false;
  let chatResponse: AIChatResponse = {
    reply: "Tudo certo.",
    operations: [],
    board: null,
  };
  const chatRequests: unknown[] = [];

  await page.route("**/api/ai/chat", async (route) => {
    chatRequests.push(route.request().postDataJSON());
    if (failChat) {
      await route.fulfill({
        status: 502,
        json: { detail: "OpenRouter indisponível." },
      });
      return;
    }
    if (chatResponse.board) {
      board = structuredClone(chatResponse.board);
    }
    await route.fulfill({ json: chatResponse });
  });

  await page.route("**/api/board", async (route) => {
    if (route.request().method() === "GET") {
      if (failLoads) {
        await route.fulfill({ status: 503, body: "Service unavailable" });
        return;
      }
      await route.fulfill({ json: board });
      return;
    }

    if (failNextSave) {
      failNextSave = false;
      await route.fulfill({ status: 503, body: "Service unavailable" });
      return;
    }

    board = route.request().postDataJSON() as BoardData;
    await route.fulfill({ json: board });
  });

  return {
    failLoad: () => {
      failLoads = true;
    },
    allowLoad: () => {
      failLoads = false;
    },
    failSave: () => {
      failNextSave = true;
    },
    setChatResponse: (response: AIChatResponse) => {
      chatResponse = response;
    },
    failChat: () => {
      failChat = true;
    },
    getChatRequests: () => structuredClone(chatRequests),
    getBoard: () => structuredClone(board),
  };
};

const login = async (page: import("@playwright/test").Page) => {
  await page.getByLabel("Usuário").fill("user");
  await page.getByLabel("Senha").fill("password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
};

test("requires valid login and clears the session on logout", async ({ page }) => {
  await installBoardApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Acesse seu quadro" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);

  await page.getByLabel("Usuário").fill("user");
  await page.getByLabel("Senha").fill("wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Usuário ou senha inválidos.", { exact: true }))
    .toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);

  await page.getByLabel("Senha").fill("password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByText("Quadro Kanban único")).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("heading", { name: "Acesse seu quadro" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Acesse seu quadro" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});

test("renames a column", async ({ page }) => {
  const api = await installBoardApi(page);
  await page.goto("/");
  await login(page);
  const title = page
    .getByTestId("column-col-backlog")
    .getByRole("textbox", { name: "Título da coluna" });

  await title.fill("A fazer");
  await expect(title).toHaveValue("A fazer");
  await title.press("Enter");
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  expect(api.getBoard().columns[0].title).toBe("A fazer");

  await page.reload();
  await expect(page.getByTestId("column-col-backlog")
    .getByRole("textbox", { name: "Título da coluna" }))
    .toHaveValue("A fazer");
});

test("adds a card to a column", async ({ page }) => {
  const api = await installBoardApi(page);
  await page.goto("/");
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /adicionar cartão/i }).click();
  await firstColumn.getByPlaceholder("Título do cartão").fill("Cartão do Playwright");
  await firstColumn.getByPlaceholder("Detalhes").fill("Adicionado pelo teste e2e.");
  await firstColumn.getByRole("button", { name: /adicionar cartão/i }).click();
  await expect(firstColumn.getByText("Cartão do Playwright")).toBeVisible();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  expect(
    Object.values(api.getBoard().cards).some(
      (card) => card.title === "Cartão do Playwright"
    )
  ).toBe(true);
});

test("removes a card and persists its deletion", async ({ page }) => {
  const api = await installBoardApi(page);
  await page.goto("/");
  await login(page);
  const firstColumn = page.getByTestId("column-col-backlog");

  await firstColumn
    .getByTestId("card-card-1")
    .getByRole("button", { name: "Remover Alinhar temas do roteiro" })
    .click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();

  expect(api.getBoard().cards["card-1"]).toBeUndefined();
  expect(api.getBoard().columns[0].cardIds).not.toContain("card-1");
});

test("moves a card between columns", async ({ page }) => {
  const api = await installBoardApi(page);
  await page.goto("/");
  await login(page);
  const card = page.getByTestId("card-card-1");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  expect(api.getBoard().columns[3].cardIds).toContain("card-1");
});

test("moves a card into an empty column", async ({ page }) => {
  const api = await installBoardApi(page);
  await page.goto("/");
  await login(page);
  const targetColumn = page.getByTestId("column-col-review");
  await targetColumn.getByTestId("card-card-6")
    .getByRole("button", { name: "Remover Testar microinterações" })
    .click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  await expect(targetColumn.getByText("Solte um cartão aqui")).toBeVisible();

  const card = page.getByTestId("card-card-1");
  const cardBox = await card.boundingBox();
  const emptyState = targetColumn.getByText("Solte um cartão aqui");
  const emptyBox = await emptyState.boundingBox();
  if (!cardBox || !emptyBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    emptyBox.x + emptyBox.width / 2,
    emptyBox.y + emptyBox.height / 2,
    { steps: 12 }
  );
  await page.mouse.up();

  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();
  expect(api.getBoard().columns[3].cardIds).toContain("card-1");
});

test("reports load failures and retries the API request", async ({ page }) => {
  const api = await installBoardApi(page);
  api.failLoad();
  await page.goto("/");
  await page.getByLabel("Usuário").fill("user");
  await page.getByLabel("Senha").fill("password");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText(/Não foi possível carregar o quadro/)).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);

  api.allowLoad();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("reports save failures and reverts the unsaved change", async ({ page }) => {
  const api = await installBoardApi(page);
  await page.goto("/");
  await login(page);
  api.failSave();
  const title = page
    .getByTestId("column-col-backlog")
    .getByRole("textbox", { name: "Título da coluna" });

  await title.fill("Não persistido");
  await title.press("Enter");
  await expect(page.getByText(/Não foi possível salvar as alterações/))
    .toBeVisible();

  await expect(title).toHaveValue("Pendências");
  expect(api.getBoard().columns[0].title).toBe("Pendências");
});

test("sends chat history and applies the AI board update without reloading", async ({
  page,
}) => {
  const api = await installBoardApi(page);
  const updatedBoard = structuredClone(initialData);
  updatedBoard.cards["card-1"].title = "Planejar o roteiro";
  api.setChatResponse({
    reply: "Atualizei o título do cartão.",
    operations: [
      { type: "edit_card", card_id: "card-1", title: "Planejar o roteiro" },
    ],
    board: updatedBoard,
  });

  await page.goto("/");
  await login(page);
  await page.getByLabel("Sua mensagem").fill("Renomeie o cartão do roteiro.");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(page.getByText("Atualizei o título do cartão.")).toBeVisible();
  await expect(page.getByText("O quadro foi atualizado.")).toBeVisible();
  await expect(page.getByTestId("card-card-1")).toContainText(
    "Planejar o roteiro"
  );
  expect(api.getChatRequests()).toEqual([
    { message: "Renomeie o cartão do roteiro.", history: [] },
  ]);
  expect(api.getBoard().cards["card-1"].title).toBe("Planejar o roteiro");

  await page.getByLabel("Sua mensagem").fill("O que você alterou?");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Atualizei o título do cartão.")).toHaveCount(2);
  expect(api.getChatRequests()[1]).toEqual({
    message: "O que você alterou?",
    history: [
      { role: "user", content: "Renomeie o cartão do roteiro." },
      { role: "assistant", content: "Atualizei o título do cartão." },
    ],
  });

  await page.reload();
  await expect(page.getByTestId("card-card-1")).toContainText(
    "Planejar o roteiro"
  );
});

test("shows an AI response without board changes", async ({ page }) => {
  const api = await installBoardApi(page);
  api.setChatResponse({
    reply: "O quadro está em ordem.",
    operations: [],
    board: null,
  });
  await page.goto("/");
  await login(page);

  await page.getByLabel("Sua mensagem").fill("Resuma o quadro.");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(page.getByText("O quadro está em ordem.")).toBeVisible();
  await expect(page.getByText("O quadro foi atualizado.")).toHaveCount(0);
  expect(api.getBoard()).toEqual(initialData);
});

test("reports AI request errors and preserves the draft", async ({ page }) => {
  const api = await installBoardApi(page);
  api.failChat();
  await page.goto("/");
  await login(page);

  const message = page.getByLabel("Sua mensagem");
  await message.fill("Ajude-me a organizar o quadro.");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(page.locator("aside").getByRole("alert")).toContainText(
    "OpenRouter indisponível."
  );
  await expect(message).toHaveValue("Ajude-me a organizar o quadro.");
  expect(api.getBoard()).toEqual(initialData);
});
