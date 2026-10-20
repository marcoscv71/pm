# Aplicativo de Gerenciamento de Projetos

## Iniciar

Requer Docker com Docker Compose. No macOS ou Linux, execute `scripts/start.sh`; no Windows, execute `scripts\start.bat`. A aplicação ficará disponível em <http://localhost:8000>.

## Parar

Execute `scripts/stop.sh` no macOS ou Linux, ou `scripts\stop.bat` no Windows.

`OPENROUTER_API_KEY` deve ser definido no `.env` da raiz para usar a verificação de conectividade de IA; o arquivo não é copiado para a imagem.

Os dados do quadro são salvos no SQLite e ficam no volume Docker `pm-data`, mantidos ao parar e iniciar a aplicação. O login permanece uma simulação no cliente e não protege a API.

`POST /api/ai/check` envia uma pergunta fixa de conectividade ao modelo `openai/gpt-oss-120b` e retorna a resposta do provedor. A rota exige `OPENROUTER_API_KEY`; sem a chave retorna erro de configuração, e falhas do provedor são reportadas sem expor dados secretos.

`POST /api/ai/chat` recebe `message` e um `history` opcional (até 20 mensagens com `role` `user` ou `assistant`). O backend inclui o quadro atual no contexto e retorna `reply`, `operations` e `board` (nulo quando não há alteração). Operações válidas são aplicadas e persistidas pelo servidor; respostas inválidas não alteram o quadro.
