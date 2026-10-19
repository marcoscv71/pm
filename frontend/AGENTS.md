# Frontend

## Contexto

Este diretório contém uma aplicação Kanban feita com Next.js, React e TypeScript. O login continua simulado no cliente; o quadro autenticado é carregado e salvo pela API FastAPI, sem autenticação segura ou chat com IA.

## Estrutura existente

- `src/app/page.tsx` renderiza `AuthenticatedApp` na rota `/`; `next.config.ts` configura a exportação estática para entrega pelo FastAPI.
- `src/app/layout.tsx` define o layout raiz, metadados e fontes.
- `src/app/globals.css` define as cores, superfícies e estilos globais. As cores do produto são amarelo `#ecad0a`, azul `#209dd7`, roxo `#753991`, azul-marinho `#032147` e cinza `#888888`.
- `src/components/KanbanBoard.tsx` carrega o quadro da API e coordena arrastar e soltar, renomear colunas, criar/remover cartões e a sobreposição do cartão arrastado; alterações são persistidas pela API.
- `src/components/AuthenticatedApp.tsx` controla a sessão simulada no `localStorage`, e `LoginScreen.tsx` apresenta o formulário de entrada. As credenciais fixas são `user` e `password`; isso não oferece proteção de segurança. Ao entrar, o quadro é obtido via `/api/board`.
- `src/components/KanbanColumn.tsx`, `KanbanCard.tsx`, `KanbanCardPreview.tsx` e `NewCardForm.tsx` compõem as colunas, cartões, prévia de arraste e formulário de criação.
- `src/lib/kanban.ts` define os tipos `Card`, `Column` e `BoardData`, os dados de demonstração e as funções utilitárias do quadro, incluindo `moveCard` e `createId`.
- `src/lib/boardApi.ts` encapsula as requisições de leitura e atualização para `/api/board`.
- Os testes unitários ficam junto às funcionalidades em `src/components/` e `src/lib/`; `src/test/setup.ts` configura o ambiente de teste.
- `tests/kanban.spec.ts` contém testes end-to-end com Playwright.
- Os testes E2E interceptam `/api/board` e mantêm estado de API controlado, incluindo cenários de falha de leitura/gravação; não dependem de serviços externos.
- `AuthenticatedApp.test.tsx` testa o login simulado e a restauração/remoção de sessão.
- `src/test/setup.ts` configura o `localStorage` de teste para jsdom quando o runtime não o fornece.

## Comandos

Use os scripts de `package.json` a partir deste diretório:

- `npm run dev` inicia o servidor de desenvolvimento.
- `npm run test:unit` executa os testes unitários com Vitest.
- `npm run test:e2e` executa os testes end-to-end com Playwright.
- `npm run lint` executa ESLint.
- `npm run build` constrói o frontend.

O build de produção exporta os arquivos estáticos para `out/`; o Docker os inclui na imagem servida pelo backend.

## Orientações de alteração

- Preserve os tipos e a separação atual entre componentes de interface e utilitários de domínio, a menos que a mudança exija uma reorganização.
- Ao traduzir a interface, traduza textos apresentados ao usuário para português brasileiro; preserve nomes de funções, símbolos, identificadores, seletores e palavras que pertencem ao código.
- Atualize os testes de interface quando os textos acessíveis mudarem, sem remover a cobertura de comportamento.
- O login nesta etapa é somente uma simulação no cliente. Não o apresente como autenticação segura nem confunda o estado salvo no `localStorage` com uma sessão protegida no backend.
- O backend associa `/api/board` ao usuário fixo `user` no MVP; a API não recebe identidade de usuário do navegador.
- Execute os testes e verificações relevantes para as alterações. O chat com IA ainda não está implementado.
