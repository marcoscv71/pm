# O MVP do aplicativo web de Gerenciamento de Projetos

## Requisitos de Negócio

Este projeto consiste na construção de um Aplicativo de Gerenciamento de Projetos. Principais funcionalidades:
- O usuário pode fazer login
- Quando autenticado, o usuário vê um quadro Kanban representando seu projeto
- O quadro Kanban possui colunas fixas que podem ser renomeadas
- Os cartões no quadro Kanban podem ser movidos via arrastar e soltar (drag and drop) e editados
- Há uma funcionalidade de chat com IA em uma barra lateral; a IA é capaz de criar / editar / mover um ou mais cartões

## Limitações

Para o MVP, haverá apenas o login de usuário (fixado no código como 'user' e 'password'), mas o banco de dados dará suporte a múltiplos usuários para o futuro.

Para o MVP, haverá apenas 1 quadro Kanban por usuário autenticado.

Para o MVP, a aplicação rodará localmente (em um contêiner Docker).

## Decisões Técnicas

- Frontend em NextJS
- Backend em Python FastAPI, incluindo a entrega do site estático do NextJS na raiz `/`
- Tudo empacotado em um contêiner Docker
- Uso do "uv" como gerenciador de pacotes para Python no contêiner Docker
- Uso do OpenRouter para as chamadas de IA. A chave `OPENROUTER_API_KEY` está localizada no `.env` na raiz do projeto
- Uso do modelo `openai/gpt-oss-120b`
- Uso de banco de dados local SQLite para o banco de dados, criando um novo banco caso ele não exista
- Scripts de iniciar e parar o servidor para Mac, PC e Linux no diretório `scripts/`

## Ponto de Partida

Um MVP funcional do frontend já foi construído e está localizado no diretório `frontend`. Ele ainda não foi projetado para a configuração em Docker. Trata-se de uma demonstração puramente de frontend.

## Esquema de Cores

- Amarelo Destaque: `#ecad0a` linhas de destaque, destaques
- Azul Primário: `#209dd7` links, seções chave
- Roxo Secundário: `#753991` botões de envio, ações importantes
- Azul-Marinho Escuro: `#032147` títulos principais
- Texto Cinza: `#888888` textos de apoio, rótulos

## Padrões de Código

1. Use as versões mais recentes das bibliotecas e abordagens idiomáticas atualizadas
2. Mantenha a simplicidade - NUNCA faça engenharia excessiva, SEMPRE simplifique, SEM programação defensiva desnecessária. Sem funcionalidades extras - foco na simplicidade.
3. Seja conciso. Mantenha o README mínimo. IMPORTANTE: nunca use emojis
4. Ao encontrar problemas, sempre identifique a causa raiz antes de tentar uma correção. Não adivinhe. Prove com evidências e, em seguida, corrija a causa raiz.

## Documentação de Trabalho

Todos os documentos para o planejamento e execução deste projeto estarão no diretório `docs/`.
Por favor, revise o documento `docs/PLAN.md` antes de prosseguir.
