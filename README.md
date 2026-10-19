# Aplicativo de Gerenciamento de Projetos

## Iniciar

Requer Docker com Docker Compose. No macOS ou Linux, execute `scripts/start.sh`; no Windows, execute `scripts\start.bat`. A aplicação ficará disponível em <http://localhost:8000>.

## Parar

Execute `scripts/stop.sh` no macOS ou Linux, ou `scripts\stop.bat` no Windows.

O `.env` e `OPENROUTER_API_KEY` não são necessários nesta etapa e não são copiados para a imagem.

Os dados do quadro são salvos no SQLite e ficam no volume Docker `pm-data`, mantidos ao parar e iniciar a aplicação. O login permanece uma simulação no cliente e não protege a API.
