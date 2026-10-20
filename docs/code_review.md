# Revisão de código

Data: 20/10/2026. Escopo: todo o repositório (commit `5de08d7`).

## Estado verificado

| Verificação | Resultado |
| --- | --- |
| `uv run --group dev pytest` (backend) | 36 passaram |
| `npm run test:unit` (frontend) | 14 passaram |
| `npm run lint` | sem erros |
| `npx tsc --noEmit` | **86 erros**, todos em arquivos `*.test.ts(x)` |

No geral, o código é pequeno, legível e segue o plano. Validação Pydantic, aplicação atômica das operações da IA e o tratamento de erros do OpenRouter estão bem feitos e bem testados. Os itens abaixo estão ordenados por prioridade.

## Prioridade alta

### 1. Resposta longa da IA quebra o chat até recarregar a página

- `backend/app/ai_chat.py:112`: `AIChatResult.reply` não tem limite de tamanho.
- `backend/app/ai_chat.py:25`: `ChatMessage.content` no histórico aceita no máximo 4000 caracteres.
- `frontend/src/components/AIChatPanel.tsx:47-51`: a resposta é guardada no histórico e reenviada.

Comprovado: um `reply` de 5000 caracteres passa na validação de `AIChatResult`, mas `AIChatRequest` com esse texto no histórico é rejeitado com `string_too_long`. A partir daí, todas as mensagens seguintes retornam 422 até o usuário recarregar a página.

**Resolvido:** `reply` agora tem `max_length=MAX_MESSAGE_LENGTH` em `AIChatResult`; uma resposta maior retorna 502 e não entra no histórico. Há um caso de regressão em `test_chat_rejects_invalid_structured_output_without_persisting`.

### 2. Dependências de teste HTTP duplicadas (`httpx` e `httpx2`)

- `backend/pyproject.toml:13-14` declara `httpx` e `httpx2`.

A suspeita inicial de que o `httpx2` não era usado estava errada. O `starlette.testclient` (Starlette 1.9) importa o `httpx2` primeiro e só recorre ao `httpx` como alternativa obsoleta: sem o `httpx2`, o pytest emite `StarletteDeprecationWarning`. O `httpx2` foi mantido.

**Resolvido:** `httpx` removido do grupo `dev`; os 37 testes passam sem avisos.

### 3. Renomear coluna envia um `PUT /api/board` a cada tecla

- `frontend/src/components/KanbanColumn.tsx:44`: `onChange` chama `onRename`, que chama `updateBoard` e `saveBoard` em `KanbanBoard.tsx:142-153`.

Digitar "Pendências" gera 10 gravações do quadro inteiro. Se uma delas falhar, o título volta para o último estado salvo enquanto o usuário ainda digita. Também é possível salvar um título vazio.

**Ação:** manter o título em estado local no `KanbanColumn` e persistir no `onBlur`/Enter, ignorando valores vazios ou sem alteração. Ajustar os testes de renomeação.

### 4. A API fica exposta na rede local sem autenticação

- `compose.yaml:6`: `"8000:8000"` publica a porta em todas as interfaces.

Como o login é apenas no cliente, qualquer máquina da rede pode ler ou sobrescrever o quadro e consumir a chave do OpenRouter por `/api/ai/chat` e `/api/ai/check`.

**Ação:** usar `"127.0.0.1:8000:8000"`, já que o MVP roda localmente.

## Prioridade média

### 5. Texto em inglês na interface

- `frontend/src/components/KanbanBoard.tsx:165`: `details || "No details yet."` grava texto em inglês no quadro.

**Ação:** remover o valor padrão e salvar `details` vazio (o backend aceita `""`), ou traduzir o texto. Ajustar a exibição se necessário.

### 6. Erros de tipagem nos testes do frontend

- `frontend/src/test/vitest.d.ts:1`: `/// <reference types="vitest" />` não declara os globais (`describe`, `it`, `expect`). Isso gera 86 erros no `tsc`; o editor também acusa esses erros.

**Ação:** trocar para `/// <reference types="vitest/globals" />` (ou `"types": ["vitest/globals"]` no `tsconfig.json`) e confirmar que `npx tsc --noEmit` fica limpo. Considerar adicionar `"typecheck": "tsc --noEmit"` ao `package.json`.

### 7. Escrita perdida quando o quadro muda durante a chamada da IA

- `backend/app/main.py:54-67`: o endpoint lê o quadro, espera o LLM (até 30 s) e grava o resultado sem verificar se o quadro mudou nesse intervalo.

Na mesma aba, o `inert` evita o problema, mas uma segunda aba ou um `PUT` direto feito nesse intervalo é sobrescrito sem aviso.

**Ação (decisão do usuário):** aceitar como limitação do MVP e documentá-la, ou comparar `updated_at` antes de gravar e retornar 409 em caso de conflito.

### 8. Falta edição manual de cartões

- `AGENTS.md:9` exige que os cartões possam ser "movidos ... e editados". Hoje a interface só cria, move e remove cartões; a edição existe apenas pela IA (`edit_card`).

**Ação (decisão do usuário):** confirmar se a edição pela IA basta para o MVP. Se não bastar, adicionar edição inline de título e detalhes no `KanbanCard`.

### 9. Os testes E2E nunca exercitam o backend real

- `frontend/tests/kanban.spec.ts` intercepta todas as rotas `/api/*`. Nenhum teste cobre frontend, FastAPI e SQLite juntos.

**Ação:** adicionar um teste E2E mínimo (carregar, mover, recarregar e conferir a persistência) rodando com `PLAYWRIGHT_BASE_URL=http://localhost:8000` contra o contêiner, mantendo o chat simulado.

## Prioridade baixa (simplificação e limpeza)

### Backend

- `backend/app/main.py:46-48`: remover `/api/hello`, que sobrou da estrutura inicial, e o teste correspondente.
- `backend/app/openrouter.py:53-62`: `URLError` e `TimeoutError` já são subclasses de `OSError`, e `JSONDecodeError`/`UnicodeDecodeError` são `ValueError`. Basta `except OSError` e `except ValueError`.
- `backend/app/ai_chat.py:182-186, 220`: `StopIteration` é impossível, porque `BoardData` garante que todo cartão está em uma coluna. Remover a captura de `StopIteration`.
- `backend/app/ai_chat.py:227`: `result.reply.strip()` repete o que o validador já fez.
- `backend/app/ai_chat.py:27-49, 115-120`: três validadores iguais de "não vazio + strip". Trocar por um tipo `Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=...)]`.
- `backend/app/board.py:8,16` e `ai_chat.py:57,89`: `title` aceita string vazia. A IA pode criar cartões ou colunas sem título, o que a interface não permite. Adicionar `min_length=1`.
- `backend/app/ai_chat.py:208`: avaliar `response_format` do tipo `json_schema` (saída estruturada estrita, aceita pelo OpenRouter) no lugar de `json_object` para reduzir os 502 por saída inválida. Validar antes se o provedor do `gpt-oss-120b` suporta esse formato.
- `compose.yaml:7-8`: `DATABASE_PATH` repete o valor já definido no `Dockerfile:20`.

### Frontend

- `frontend/src/components/KanbanBoard.tsx:82`: o `useMemo` de `cardsById` não traz ganho. Usar `board.cards` diretamente.
- `frontend/src/lib/kanban.ts:164-168`: `createId` com `Math.random`. Usar `crypto.randomUUID()`, como o backend já faz com `uuid4`.
- `frontend/src/lib/kanban.ts:18-72`: `initialData` duplica `INITIAL_BOARD` do backend e hoje só serve aos testes. Mover para um fixture de teste.
- `frontend/src/lib/aiChatApi.ts:51`: o limite `20` repete `MAX_HISTORY_MESSAGES`. Usar uma constante nomeada.
- `frontend/package.json:8`: `"start": "next start"` não funciona com `output: "export"`. Remover. `"test"` duplica `"test:unit"`.
- `frontend/package.json:31`: `@types/node ^20` não acompanha o Node 22 do `Dockerfile:1`. Alinhar e revisar as demais versões (Vitest, Node LTS e Python da imagem) contra as últimas estáveis.
- `frontend/src/lib/kanban.test.ts`: cobre apenas 3 casos de `moveCard`. Adicionar os casos de ID inexistente e de soltar sobre o próprio cartão.

### Repositório

- `frontend/test-results/.last-run.json` está versionado. Adicionar `test-results/` e `playwright-report/` ao `frontend/.gitignore` e remover o arquivo do índice.
- `.gitignore` da raiz: o modelo genérico de Python tem cerca de 170 linhas, quase todas sem relação com o projeto. Reduzir ao necessário.
- `Dockerfile`: o contêiner roda como root. Para o MVP local isso é aceitável; registrar como item futuro.

## Ordem sugerida de execução

1. Item 1 (concluído) e item 2.
2. Itens 4, 5 e 6: mudanças de uma linha cada.
3. Item 3, com ajuste dos testes unitários e E2E de renomeação.
4. Decidir os itens 7 e 8 com o usuário.
5. Item 9 e a limpeza de prioridade baixa, um commit por grupo.
