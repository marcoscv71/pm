# Plano do MVP do aplicativo web de Gerenciamento de Projetos

## Objetivo e limites

Construir um aplicativo local de gerenciamento de projetos com um quadro Kanban por usuário, autenticação simulada, persistência em SQLite e assistência por IA. O frontend existente em `frontend/` é uma demonstração independente; as etapas devem integrá-lo sem substituir desnecessariamente o comportamento e a interface que já funcionam.

As credenciais do MVP são `user` e `password`. A estrutura de dados deve permitir múltiplos usuários no futuro, mas não é necessário implementar cadastro, gerenciamento de usuários ou autenticação real. A aplicação será empacotada em um contêiner Docker e executada localmente.

## Decisões técnicas já definidas

- Frontend em Next.js; backend em Python com FastAPI.
- O backend entrega o site estático na raiz `/` e as rotas de API sob um prefixo próprio.
- O Docker empacota a aplicação; `uv` gerencia as dependências Python no contêiner.
- SQLite local, criado quando ainda não existir.
- OpenRouter para chamadas de IA, usando o modelo `openai/gpt-oss-120b`.
- `OPENROUTER_API_KEY` vem do arquivo `.env` na raiz; o segredo não deve ser incluído no repositório nem no bundle do frontend.
- Scripts para iniciar e parar a aplicação para macOS, Windows e Linux ficam em `scripts/`.
- A interface deve preservar o esquema de cores definido em `AGENTS.md`.

## Sequência e pontos de aprovação

As etapas abaixo são sequenciais quando uma etapa depende de artefatos ou comportamento da anterior. A abordagem de banco de dados precisa de aprovação antes da implementação da persistência. O contrato da saída estruturada da IA foi aprovado pelo usuário para a Parte 9 e está registrado nessa seção.

## Parte 1: Planejamento e preparação do frontend

**Objetivo:** transformar este documento em um plano verificável, descrever o frontend existente para futuros agentes, obter a aprovação do plano e preparar a demonstração para uso em português brasileiro.

### Checklist

- [x] Detalhar as partes do projeto com atividades, testes e critérios de conclusão.
- [x] Criar `frontend/AGENTS.md` descrevendo a estrutura, o comportamento e os testes existentes.
- [x] Solicitar que o usuário revise e aprove este plano antes de iniciar as etapas de implementação.
- [x] Após a aprovação, traduzir para português brasileiro os textos apresentados ao usuário no quadro de demonstração; preservar nomes de funções, símbolos, identificadores, nomes de rotas e demais palavras pertencentes ao código.
- [x] Atualizar os testes de interface afetados pela tradução sem alterar os identificadores usados pelos testes.

### Testes e verificações

- Conferir que o plano contém checklist, testes e critérios de conclusão para cada parte.
- Executar `npm run test:unit` e `npm run test:e2e` no diretório `frontend/` após a tradução.
- Executar `npm run lint` e `npm run build` no diretório `frontend/`.
- Conferir visualmente os textos principais do quadro e o idioma `pt-BR` da página.

### Critérios de conclusão

- O usuário aprovou o plano antes do início das etapas subsequentes.
- `frontend/AGENTS.md` descreve o código presente sem apresentar funcionalidades futuras como se já existissem.
- A interface visível do quadro está em português brasileiro, os testes passam e os nomes internos do código permanecem inalterados.

## Parte 2: Estrutura inicial (scaffolding)

**Objetivo:** criar o caminho mínimo executável do contêiner até o backend, servindo uma página estática de exemplo e uma resposta de API.

### Checklist

- [x] Criar a configuração Docker necessária para instalar as dependências Python com `uv`, iniciar o FastAPI e servir os arquivos estáticos na raiz `/`.
- [x] Criar a aplicação FastAPI e uma rota simples de API para confirmar a comunicação entre a página e o backend.
- [x] Adicionar uma página HTML estática temporária de “hello world” que faça a chamada à API.
- [x] Criar scripts de início e parada adequados para macOS, Windows e Linux em `scripts/`.
- [x] Documentar somente os comandos essenciais para iniciar e parar o ambiente, incluindo os requisitos do `.env` quando aplicável.

### Testes e verificações

- [x] Construir a imagem Docker e iniciar o contêiner localmente.
- [x] Verificar que `/` entrega a página de exemplo e que a página recebe a resposta esperada da rota de API.
- [x] Verificar a rota de API diretamente e confirmar que erros de inicialização ou de configuração não são apresentados como sucesso.
- [x] Exercitar os scripts compatíveis com o sistema operacional disponível; revisar os demais scripts para comandos e caminhos apropriados à plataforma.
- [x] Confirmar que `.env` e `OPENROUTER_API_KEY` não são copiados para a imagem nem expostos pela página.

### Critérios de conclusão

- [x] A aplicação inicia localmente no contêiner e encerra pelos scripts correspondentes.
- [x] A raiz serve a página estática de exemplo, e a chamada de API retorna a resposta esperada.
- [x] A configuração funciona sem depender de um servidor de desenvolvimento do Next.js.

## Parte 3: Integração do frontend

**Objetivo:** substituir a página temporária pelo quadro existente, exportado estaticamente e servido pelo backend em `/`.

### Checklist

- [x] Configurar o Next.js para gerar uma saída estática compatível com a entrega pelo FastAPI.
- [x] Ajustar a configuração Docker para construir o frontend e disponibilizar sua saída estática ao backend.
- [x] Fazer a raiz `/` exibir o quadro Kanban de demonstração existente.
- [x] Preservar as interações já implementadas: renomear colunas, criar e remover cartões e arrastar cartões entre colunas.
- [x] Manter as rotas de API distintas da entrega de arquivos estáticos.

### Testes e verificações

- [x] Executar os testes unitários do frontend, incluindo os testes de `KanbanBoard` e das operações do quadro.
- [x] Executar os testes end-to-end do Playwright para carregamento, criação e movimentação de cartões.
- [x] Executar lint e build/export estático do frontend.
- [x] Construir e iniciar o contêiner e confirmar que `/` serve o quadro e que os recursos estáticos carregam.
- [x] Confirmar que a interação do quadro funciona na versão servida pelo FastAPI, não apenas no servidor de desenvolvimento.

### Critérios de conclusão

- [x] O quadro de demonstração é servido na raiz pelo contêiner e suas interações existentes passam nos testes.
- [x] A construção para produção não exige o servidor de desenvolvimento Next.js.

## Parte 4: Experiência simulada de login

**Objetivo:** exigir as credenciais fixas do MVP antes de exibir o quadro e permitir sair da sessão simulada.

### Checklist

- [x] Exibir uma tela de login ao acessar a aplicação sem uma sessão autenticada.
- [x] Aceitar somente as credenciais `user` e `password` para este MVP.
- [x] Exibir o quadro depois de um login válido e informar de forma clara quando as credenciais forem inválidas.
- [x] Permitir logout e voltar a exigir login para acessar o quadro.
- [x] Manter a solução explicitamente limitada a uma experiência simulada, sem sugerir que seja autenticação segura ou real.

### Testes e verificações

- [x] Testar a visualização inicial do login, credenciais válidas e inválidas, acesso ao quadro após autenticação e logout.
- [x] Confirmar que o quadro não fica visível após logout nem ao recarregar a aplicação sem sessão válida.
- [x] Executar testes unitários, end-to-end, lint e build do frontend.
- [x] Confirmar que os testes não dependem de estado deixado por outro teste.

### Critérios de conclusão

- [x] O quadro só é apresentado após o login simulado; logout remove o acesso e exige nova autenticação.
- [x] Todos os cenários de login e saída passam em testes automatizados.

## Parte 5: Modelagem do banco de dados

**Objetivo:** definir e documentar como representar usuários e quadros Kanban no SQLite, armazenando os dados do quadro como JSON.

### Checklist

- [x] Propor um esquema SQLite que associe cada quadro a um usuário e permita vários usuários no futuro, mantendo um quadro por usuário no MVP.
- [x] Definir a representação JSON do quadro coerente com colunas, cartões e suas relações.
- [x] Documentar em `docs/` o esquema, as relações, a criação inicial do banco e como alterações do quadro serão persistidas.
- [x] Registrar como o login fixo do MVP se relaciona com a identidade do usuário no banco, sem acrescentar cadastro ou gerenciamento de contas.
- [x] Apresentar a proposta ao usuário e obter aprovação antes de implementar a persistência.

### Testes e verificações

- [x] Revisar a proposta quanto à possibilidade de recuperar um quadro completo e associá-lo inequivocamente a um usuário.
- [x] Conferir que o desenho representa o requisito de JSON e contempla a criação de um banco ausente.
- [x] Validar que as decisões documentadas não contradizem as limitações e decisões técnicas deste plano.

### Critérios de conclusão

- [x] A abordagem e o esquema estão documentados em `docs/` e aprovados pelo usuário antes de serem codificados.

## Parte 6: Backend e persistência

**Objetivo:** implementar a inicialização do SQLite e as rotas que leem e atualizam o quadro pertencente ao usuário autenticado.

### Checklist

- [x] Implementar a criação do banco e do esquema aprovado quando o arquivo ainda não existir.
- [x] Implementar as rotas de API para obter e atualizar o quadro do usuário corrente.
- [x] Persistir e recuperar a representação JSON do quadro sem perder colunas, cartões ou a ordem dos cartões.
- [x] Garantir que cada operação use o usuário associado à sessão simulada, sem permitir selecionar arbitrariamente o usuário pela requisição.
- [x] Retornar respostas e erros HTTP apropriados para recursos ausentes e dados inválidos.

### Testes e verificações

- [x] Usar testes unitários de backend com banco temporário isolado.
- [x] Testar criação do banco em diretório vazio, leitura do quadro inicial, atualização, leitura posterior e isolamento entre usuários.
- [x] Testar dados inválidos e erros das rotas sem depender de um serviço externo.
- [x] Confirmar que reiniciar a aplicação preserva os dados.

### Critérios de conclusão

- [x] O banco é criado quando ausente, e as rotas leem e persistem o quadro correto para o usuário.
- [x] Os testes de backend cobrem o fluxo normal, isolamento e erros relevantes.

## Parte 7: Integração frontend e backend

**Objetivo:** fazer o quadro autenticado usar a API e manter as alterações do usuário após recarga e reinicialização.

### Checklist

- [x] Carregar o quadro da API depois do login, apresentando um estado de carregamento enquanto os dados são obtidos.
- [x] Enviar à API as alterações feitas na interface, incluindo renomear colunas, criar/remover cartões e mover cartões.
- [x] Atualizar a interface de forma consistente com respostas bem-sucedidas e apresentar falhas de API sem simular salvamento concluído.
- [x] Manter os dados associados à sessão e ao usuário autenticado.
- [x] Configurar os testes para usar uma API controlada ou um backend de teste, em vez de depender de serviços externos.

### Testes e verificações

- [x] Testar carregamento e cada tipo de alteração pela interface e confirmar o estado persistido consultando novamente a API.
- [x] Testar recarga da página e reinicialização do backend sem perda do quadro.
- [x] Testar falha de carregamento e falha de salvamento, verificando que o usuário recebe indicação clara.
- [x] Executar testes de backend, testes unitários e end-to-end do frontend, lint e build.
- [x] Validar o fluxo integrado no contêiner.

### Critérios de conclusão

- [x] Alterações feitas no quadro são persistidas pelo backend e reaparecem depois de recarga.
- [x] Falhas de comunicação são visíveis e não resultam em uma indicação falsa de sucesso.

## Parte 8: Conectividade com IA via OpenRouter

**Objetivo:** confirmar que o backend consegue fazer uma chamada ao OpenRouter com a configuração do projeto.

### Checklist

- [x] Ler `OPENROUTER_API_KEY` da configuração de ambiente no backend, sem enviá-la ao frontend ou registrá-la em logs.
- [x] Usar o modelo `openai/gpt-oss-120b`.
- [x] Implementar uma chamada simples de verificação ao modelo, separada da funcionalidade final de chat.
- [x] Tratar erros de configuração, rede e resposta do provedor de forma explícita.
- [x] Manter testes automatizados comuns independentes de acesso à rede e de uma chave real.

### Testes e verificações

- [x] Testar a montagem da requisição e o tratamento de respostas/erros com chamadas externas simuladas.
- [ ] Executar, quando houver chave configurada e conectividade, um teste manual ou opt-in que envia “2+2” e verifica uma resposta equivalente a “4”. Não executado neste ambiente para não transmitir a credencial a um serviço externo.
- [x] Verificar que a chave não aparece na resposta, no bundle, nos logs nem na imagem final.

### Critérios de conclusão

- [x] O backend usa o modelo e a configuração especificados e processa uma resposta de verificação; a chamada real opt-in permanece pendente.
- [x] A suíte automatizada continua executável sem chave ou conexão com OpenRouter.

## Parte 9: Chamada de IA com contexto do quadro e saída estruturada

**Objetivo:** enviar à IA a pergunta, o histórico e o quadro atual, e interpretar a resposta estruturada para exibir uma resposta ao usuário e, opcionalmente, atualizar o quadro.

### Contrato aprovado

Contrato aprovado: a IA retorna um objeto JSON com `reply` (resposta não vazia em linguagem natural) e `operations` (lista de operações tipadas; lista vazia significa nenhuma alteração). IDs de cartões/colunas existentes devem corresponder exatamente aos IDs do quadro. A aplicação gera os IDs de novos cartões. Operações permitidas:

- `create_card`: `column_id`, `title`, `details`.
- `edit_card`: `card_id` e pelo menos um dos campos `title` ou `details`.
- `move_card`: `card_id`, `column_id`.
- `rename_column`: `column_id`, `title`.
- `delete_card`: `card_id`.

Operações são aplicadas em ordem sobre uma cópia do quadro. Se qualquer operação for inválida, nenhuma alteração é persistida. O endpoint recebe a mensagem atual e um histórico limitado a 20 mensagens de usuário/assistente; o quadro atual é obtido pelo backend, nunca aceito do cliente.

### Checklist

- [x] Definir e aprovar com o usuário o formato da saída estruturada e as operações de quadro permitidas.
- [x] Enviar à IA o quadro JSON do usuário, a pergunta atual e o histórico de conversa pertinente.
- [x] Solicitar e validar uma saída estruturada conforme o contrato aprovado.
- [x] Retornar ao cliente a resposta em linguagem natural e, se aplicável, a atualização validada.
- [x] Persistir atualizações somente depois de validar e aplicar a saída ao quadro do usuário correto.
- [x] Tratar saída incompleta ou inválida e erros do provedor sem aplicar alterações parciais ou apresentar sucesso falso.

### Testes e verificações

- [x] Testar montagem do contexto, inclusão do histórico e saída estruturada com respostas do provedor simuladas.
- [x] Testar resposta sem atualização, atualização válida e saída inválida conforme o contrato aprovado.
- [x] Confirmar que alterações persistidas continuam associadas ao usuário correto e não corrompem o quadro.
- [x] Confirmar que falhas do provedor não alteram os dados persistidos.
- [x] Manter os testes automatizados sem dependência de rede ou chave real.

### Critérios de conclusão

- [x] A chamada inclui o quadro, pergunta e histórico; a resposta e as atualizações opcionais seguem o contrato aprovado.
- [x] Saídas inválidas ou falhas não são aplicadas nem comunicadas como sucesso.

## Parte 10: Interface do chat com IA

**Objetivo:** adicionar uma barra lateral de chat integrada ao backend e atualizar o quadro quando a IA retornar uma alteração válida.

### Checklist

- [x] Adicionar à interface um widget lateral de chat que se adapte ao layout existente.
- [x] Permitir envio de mensagens e apresentar o histórico relevante da conversa.
- [x] Exibir estados de envio/carregamento e comunicar falhas de forma clara.
- [x] Enviar mensagens ao backend e renderizar a resposta do assistente.
- [x] Aplicar na interface a atualização do quadro retornada pelo backend, sem exigir recarga manual.
- [x] Preservar o fluxo normal de edição do quadro e o estado de login/logout.

### Testes e verificações

- [x] Testar envio, resposta, estado de carregamento e erros do chat com respostas de backend controladas.
- [x] Testar uma resposta sem alteração e outra com alteração conforme o contrato aprovado na Parte 9.
- [x] Confirmar que a interface reflete a atualização persistida sem recarregar a página.
- [x] Executar testes unitários, end-to-end, lint e build; validar também no contêiner integrado.

### Critérios de conclusão

- [x] O usuário conversa com a IA pela barra lateral e vê a resposta na interface.
- [x] Quando o backend retorna uma atualização válida, o quadro muda automaticamente e permanece consistente com os dados persistidos.
- [x] A experiência existente do quadro e o fluxo de autenticação continuam funcionais.
