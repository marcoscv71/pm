# Scripts de execução

Este diretório contém scripts para iniciar e parar a aplicação Docker Compose:

- `start.sh` e `stop.sh` para macOS e Linux.
- `start.bat` e `stop.bat` para Windows.

Os scripts referenciam `compose.yaml` na raiz do repositório, independentemente do diretório de trabalho atual. O Docker Desktop ou Docker Engine com o plugin Compose deve estar instalado e em execução.