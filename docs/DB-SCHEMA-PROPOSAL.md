# Proposta de esquema SQLite

Esta proposta da Parte 5 foi aprovada e serviu de base para a persistência do quadro implementada na Parte 6.

## Esquema

Manter os usuários em uma tabela própria e salvar cada quadro completo como JSON em outra tabela. A restrição `UNIQUE` em `boards.user_id` garante no máximo um quadro por usuário.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE
);

CREATE TABLE boards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    data TEXT NOT NULL CHECK (json_valid(data)),
    updated_at TEXT NOT NULL
);
```

Ativar `PRAGMA foreign_keys = ON` em cada conexão SQLite. Usar transação para criar as tabelas e inserir os dados iniciais, e `PRAGMA user_version` para identificar a versão do esquema.

## Representação JSON do quadro

O objeto `data` mantém a forma usada por `BoardData` no frontend, para preservar cartões, colunas e ordenação sem converter para um modelo relacional:

```json
{
  "columns": [
    {
      "id": "col-backlog",
      "title": "Pendências",
      "cardIds": ["card-1", "card-2"]
    }
  ],
  "cards": {
    "card-1": {
      "id": "card-1",
      "title": "Alinhar temas do roteiro",
      "details": "Elaborar temas trimestrais."
    }
  }
}
```

`columns` define a ordem das colunas; `cardIds` define a ordem dos cartões em cada coluna. `cards` guarda cada cartão uma vez, indexado pelo seu `id`. Na leitura e atualização da API, validar a estrutura, a unicidade dos IDs e que cada referência em `cardIds` corresponda a um cartão existente.

## Inicialização e gravação

Quando o arquivo SQLite não existir, a inicialização cria o arquivo e as tabelas, registra o usuário fixo do MVP e insere para ele um quadro com os dados iniciais equivalentes a `initialData`. Se o banco já existir, não reinicializa nem sobrescreve os dados. A criação do esquema e dos registros iniciais ocorre em uma única transação.

Cada atualização substitui o documento JSON inteiro do quadro associado ao usuário corrente e atualiza `updated_at`, na mesma transação. Assim, mudanças em colunas, cartões e ordem são persistidas como uma unidade. Uma falha na validação ou gravação não deve deixar uma atualização parcial.

## Usuário do MVP e identidade

Criar uma única linha em `users` para o nome de usuário fixo `user`, com ID estável `user`. A senha fixa `password` não é armazenada no banco. O quadro inicial referencia esse ID por `boards.user_id`; usuários adicionais poderão receber IDs próprios no futuro, sem mudar a estrutura do JSON.

As rotas de quadro não devem aceitar `user_id` no caminho, query ou corpo. No MVP, o backend resolve o usuário atual para o ID fixo `user`; essa associação não transforma o login de frontend em autenticação segura. O login atual só mantém estado no navegador, portanto não comprova identidade para o backend. O cliente não deve ser tratado como fronteira de segurança; autenticação real e sessões validadas pelo servidor ficam fora desta proposta e exigirão uma etapa própria.

## Aprovação

Proposta aprovada pelo usuário em 19/10/2026. A principal limitação assumida para o MVP é que o backend associa as operações ao usuário fixo, sem receber sua identidade do cliente; proteger a API contra acesso sem login requer autenticação validada no servidor, que não faz parte da experiência simulada atual.
