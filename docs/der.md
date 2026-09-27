# Modelo de Dados (DER) — SIGCF

```mermaid
erDiagram
    USUARIO ||--o{ ORDEM_COLETA : "executa"
    USUARIO ||--o{ ORDEM_COLETA : "cria"
    CLIENTE ||--o{ ORDEM_COLETA : "solicita"
    VEICULO ||--o{ ORDEM_COLETA : "atende"
    ORDEM_COLETA ||--o{ HISTORICO_STATUS : "registra"
    USUARIO ||--o{ HISTORICO_STATUS : "efetua"

    USUARIO {
        int id PK
        varchar nome
        varchar email UK
        varchar senha_hash
        enum perfil "GESTOR | MOTORISTA"
        varchar telefone "obrigatorio p/ motorista"
        varchar cnh "opcional"
        boolean ativo
        datetime created_at
        datetime updated_at
    }

    VEICULO {
        int id PK
        varchar placa UK
        varchar modelo
        decimal capacidade_kg
        boolean ativo
        datetime created_at
        datetime updated_at
    }

    CLIENTE {
        int id PK
        varchar nome
        varchar telefone
        varchar endereco
        boolean ativo
        datetime created_at
        datetime updated_at
    }

    ORDEM_COLETA {
        int id PK
        int cliente_id FK
        int veiculo_id FK
        int motorista_id FK
        int criado_por_id FK
        varchar endereco_coleta
        date data_coleta
        enum status "AGUARDANDO | EM_ANDAMENTO | CONCLUIDA | FALHA | CANCELADA"
        text observacao
        datetime created_at
        datetime updated_at
    }

    HISTORICO_STATUS {
        int id PK
        int ordem_id FK
        int usuario_id FK
        enum status_anterior "nulo na criacao"
        enum status_novo
        varchar motivo
        decimal latitude "nulo se nao informada"
        decimal longitude "nulo se nao informada"
        int precisao_metros
        datetime created_at
    }
```

## Decisões de modelagem

**Tabela única de usuários (herança de tabela única).** Gestor e motorista diferem apenas em `telefone` e `cnh`, e todo motorista precisa autenticar para consultar suas coletas (RF03). Uma tabela `usuario` com a coluna `perfil` evita duplicação e junções desnecessárias. A obrigatoriedade do telefone para motoristas é validada na camada de serviço.

**Cliente como entidade.** Permite consultar o histórico de coletas por cliente — um dos problemas centrais levantados (perda de histórico) — e evita que o gestor redigite dados a cada ordem.

**`endereco_coleta` na ordem (snapshot).** O endereço é copiado do cliente no momento da criação e pode ser ajustado. Se o cliente mudar de endereço, as ordens antigas continuam registrando onde a coleta de fato ocorreu.

**`historico_status` (trilha de auditoria).** Cada mudança de status grava quem alterou, quando, de qual status para qual e o motivo (obrigatório em falha e cancelamento). É o que sustenta a rastreabilidade prometida ao gestor.

**Localização nas ações do motorista.** Quando o motorista inicia, conclui ou reporta falha em uma coleta, o registro de histórico guarda a latitude, a longitude e a precisão informada pelo GPS do celular. Não há rastreamento contínuo: a posição é capturada apenas nesses eventos e somente para ações do motorista, pelo princípio da necessidade da LGPD. Se a permissão for negada ou o GPS não responder, a ação é registrada sem coordenadas. As colunas usam `DECIMAL(9,6)`, precisão de cerca de 11 cm, suficiente para identificar o local do atendimento.

**Índice composto `(motorista_id, data_coleta)`.** A consulta mais frequente do sistema é "coletas do motorista X no dia Y" (RF03). O índice mantém essa consulta dentro do requisito de 300 ms conforme o volume cresce.

**Exclusão lógica.** Veículos, clientes e usuários são desativados (`ativo = false`) em vez de removidos, preservando a integridade referencial das ordens já registradas.

## Máquina de estados da ordem (RF04)

```mermaid
stateDiagram-v2
    [*] --> AGUARDANDO : gestor cria a ordem
    AGUARDANDO --> EM_ANDAMENTO : motorista inicia
    EM_ANDAMENTO --> CONCLUIDA : motorista conclui
    EM_ANDAMENTO --> FALHA : motorista reporta falha (motivo obrigatório)
    AGUARDANDO --> CANCELADA : gestor cancela (motivo obrigatório)
    EM_ANDAMENTO --> CANCELADA : gestor cancela (motivo obrigatório)
    CONCLUIDA --> [*]
    FALHA --> [*]
    CANCELADA --> [*]
```

| Transição | Quem pode |
|---|---|
| AGUARDANDO → EM_ANDAMENTO | Motorista responsável pela ordem |
| EM_ANDAMENTO → CONCLUIDA | Motorista responsável pela ordem |
| EM_ANDAMENTO → FALHA | Motorista responsável pela ordem |
| AGUARDANDO/EM_ANDAMENTO → CANCELADA | Somente gestor |

`CONCLUIDA`, `FALHA` e `CANCELADA` são estados finais.
