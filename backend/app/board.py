from pydantic import BaseModel, ConfigDict, Field, model_validator


class Card(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str
    details: str


class Column(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str
    cardIds: list[str]


class BoardData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[Column] = Field(min_length=1)
    cards: dict[str, Card]

    @model_validator(mode="after")
    def validate_card_references(self) -> "BoardData":
        column_ids = [column.id for column in self.columns]
        if len(column_ids) != len(set(column_ids)):
            raise ValueError("Column IDs must be unique.")

        if any(card_id != card.id for card_id, card in self.cards.items()):
            raise ValueError("Card keys must match card IDs.")

        card_ids = [
            card_id for column in self.columns for card_id in column.cardIds
        ]
        if len(card_ids) != len(set(card_ids)):
            raise ValueError("Cards must appear in only one column.")
        if set(card_ids) != set(self.cards):
            raise ValueError("Column references must include every card exactly once.")

        return self


INITIAL_BOARD = BoardData.model_validate(
    {
        "columns": [
            {"id": "col-backlog", "title": "Pendências", "cardIds": ["card-1", "card-2"]},
            {"id": "col-discovery", "title": "Descoberta", "cardIds": ["card-3"]},
            {
                "id": "col-progress",
                "title": "Em andamento",
                "cardIds": ["card-4", "card-5"],
            },
            {"id": "col-review", "title": "Em revisão", "cardIds": ["card-6"]},
            {"id": "col-done", "title": "Concluído", "cardIds": ["card-7", "card-8"]},
        ],
        "cards": {
            "card-1": {
                "id": "card-1",
                "title": "Alinhar temas do roteiro",
                "details": "Elaborar temas trimestrais com declarações de impacto e métricas.",
            },
            "card-2": {
                "id": "card-2",
                "title": "Reunir feedback dos clientes",
                "details": "Analisar marcadores de suporte, notas de vendas e feedback sobre cancelamentos.",
            },
            "card-3": {
                "id": "card-3",
                "title": "Criar protótipo do painel de análise",
                "details": "Esboçar o layout inicial do painel e os principais níveis de detalhamento.",
            },
            "card-4": {
                "id": "card-4",
                "title": "Refinar os nomes dos status",
                "details": "Padronizar os nomes e o tom das colunas do quadro.",
            },
            "card-5": {
                "id": "card-5",
                "title": "Projetar o layout dos cartões",
                "details": "Definir hierarquia visual e espaçamento para facilitar a leitura de listas extensas.",
            },
            "card-6": {
                "id": "card-6",
                "title": "Testar microinterações",
                "details": "Verificar estados de foco, carregamento e passagem do cursor.",
            },
            "card-7": {
                "id": "card-7",
                "title": "Publicar a página de marketing",
                "details": "Texto final aprovado e pacote de recursos entregue.",
            },
            "card-8": {
                "id": "card-8",
                "title": "Concluir a sprint de integração",
                "details": "Documentar as notas da versão e compartilhá-las com a equipe.",
            },
        },
    }
)
