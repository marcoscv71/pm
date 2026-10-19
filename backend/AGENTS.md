# Backend

## Estrutura atual

- `app/main.py` define a aplicação FastAPI, as rotas `/api/board` e `/api/hello` e a entrega da exportação estática do frontend em `frontend/out` (configurável por `FRONTEND_STATIC_DIR`).
- `app/board.py` define e valida o JSON do quadro; `app/database.py` cria o esquema SQLite aprovado e lê/grava o quadro do usuário fixo `user`.
- `tests/test_main.py` verifica a inicialização do banco, persistência e isolamento, validação da API, a página inicial e seus recursos.
- `pyproject.toml` define as dependências Python; `uv.lock` fixa as versões usadas na instalação.

## Execução e testes

O contêiner usa `uv` para instalar as dependências, armazena o banco no volume Docker `/data/pm.db` e inicia Uvicorn na porta 8000. Para executar os testes localmente neste diretório, gere primeiro a exportação com `cd ../frontend && npm run build`, depois execute `uv run --group dev pytest` em `backend/`. Localmente, `DATABASE_PATH` pode apontar para outro arquivo; o padrão é `backend/data/pm.db`.

## Orientações

- Mantenha as rotas de API sob `/api/` e registre-as antes do mount de arquivos estáticos em `/`.
- Não copie `.env` nem exponha `OPENROUTER_API_KEY` em respostas, arquivos estáticos ou imagem Docker.
- As rotas de API devem ser registradas antes do mount de arquivos estáticos na raiz para não serem interceptadas.