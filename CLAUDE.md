# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MVP de Gerenciamento de Projetos: um quadro Kanban de usuário único (exportação estática do Next.js) servido por um backend FastAPI com persistência em SQLite e uma barra lateral de chat com IA (OpenRouter, `openai/gpt-oss-120b`) capaz de criar/editar/mover/remover cartões e renomear colunas.

Leia os `AGENTS.md` (raiz, `backend/`, `frontend/`, `scripts/`) e `docs/PLAN.md` antes de fazer alterações; o plano acompanha cada parte com checklists e critérios de conclusão. Os textos da interface ficam em português brasileiro; os identificadores do código permanecem em inglês.

## Comandos

Executar a aplicação completa (Docker Compose, http://localhost:8000):

```sh
scripts/start.sh   # docker compose up --build -d
scripts/stop.sh
```

Frontend (a partir de `frontend/`):

```sh
npm run dev
npm run lint
npm run build                         # exportação estática para frontend/out
npm run test:unit                     # Vitest
npx vitest run src/lib/kanban.test.ts # um único arquivo de teste unitário
npm run test:e2e                      # Playwright; inicia `next dev` na porta 3000, exceto se PLAYWRIGHT_BASE_URL estiver definido
```

Backend (a partir de `backend/`, usa `uv`; exige que `frontend/out` exista, então execute antes `npm run build` em `frontend/`):

```sh
uv run --group dev pytest
uv run --group dev pytest tests/test_ai_chat.py::nome_do_teste
uv run uvicorn app.main:app --reload
```

## Arquitetura

- **Origem única.** `create_app()` em `backend/app/main.py` registra todas as rotas `/api/*` e depois monta a exportação do Next.js (`FRONTEND_STATIC_DIR`, padrão `frontend/out`) em `/`. As rotas de API devem ser registradas antes desse mount. Os testes usam `create_app(database_path, static_dir)` para isolar o estado.
- **Quadro como um único documento JSON.** `app/board.py` define `BoardData` (colunas com `cardIds` ordenados + um mapa `cards`, com validação de referências consistentes). `app/database.py` o armazena como JSON na tabela `boards`, uma linha por usuário, criada na inicialização. O esquema suporta múltiplos usuários, mas o MVP fixa `MVP_USER_ID = "user"`; a API nunca recebe a identidade do navegador. O caminho do banco vem de `DATABASE_PATH` (`/data/pm.db` no volume Docker `pm-data`, `backend/data/pm.db` localmente).
- **Login simulado.** O login (`user`/`password`) acontece apenas no cliente (`AuthenticatedApp.tsx`, `localStorage`); não protege a API.
- **Fluxo de dados do frontend.** `KanbanBoard.tsx` carrega via `GET /api/board` e persiste cada alteração com `PUT /api/board` (`src/lib/boardApi.ts`). Os tipos do quadro e funções puras (`moveCard`, `createId`) ficam em `src/lib/kanban.ts` e espelham os modelos Pydantic do backend.
- **Chat com IA.** `POST /api/ai/chat` recebe `message` + `history` opcional (máx. 20). `app/ai_chat.py` envia o quadro atual como contexto, solicita resposta em objeto JSON, valida-a contra modelos tipados de operação (`AIChatResult`) e aplica as operações atomicamente; saída inválida retorna 502 e não altera o quadro. O servidor persiste o quadro atualizado e o retorna em `board` (nulo se não houver operações). O frontend aplica o quadro retornado diretamente e não deve enviar um `PUT /api/board` duplicado.
- **OpenRouter.** `app/openrouter.py` chama a API com `urllib` da biblioteca padrão, lendo `OPENROUTER_API_KEY` do ambiente em tempo de requisição (`.env` da raiz, injetado pelo Compose, nunca copiado para a imagem). Os testes simulam o transporte HTTP; nunca envie a chave em testes, logs, respostas ou código cliente.

## Cores

Amarelo destaque `#ecad0a`, azul primário `#209dd7`, roxo secundário `#753991` (botões de envio/ações importantes), azul-marinho `#032147` (títulos), cinza `#888888` (textos de apoio). Definidas em `frontend/src/app/globals.css`.

## Padrões de código

Mantenha a simplicidade: sem engenharia excessiva, sem programação defensiva desnecessária, sem funcionalidades extras. Use as versões e APIs mais recentes das bibliotecas. Mantenha o README mínimo. Nunca use emojis. Identifique e comprove a causa raiz antes de corrigir.
