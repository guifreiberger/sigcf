# Arquitetura — SIGCF

Arquitetura descrita com o [modelo C4](https://c4model.com/), em três níveis: contexto, containers e componentes. As decisões que levaram a ela estão nos [ADRs](adr/).

**Legenda dos diagramas:** caixas escuras são pessoas, amarelas são partes do SIGCF e cinza são sistemas externos. Entre colchetes, o tipo do elemento ou a tecnologia.

## Nível 1 — Contexto

Quem usa o sistema e com o que ele se comunica.

```mermaid
flowchart TB
    classDef pessoa fill:#18181b,stroke:#18181b,color:#ffffff
    classDef sistema fill:#facc15,stroke:#854d0e,color:#18181b
    classDef externo fill:#e4e4e7,stroke:#71717a,color:#18181b

    cliente["<b>Cliente</b><br/>[Pessoa externa]<br/>Empresa que gera recicláveis<br/>e pede a coleta"]:::externo
    gestor["<b>Gestor / atendente</b><br/>[Pessoa]<br/>Registra os pedidos, delega as coletas<br/>e acompanha a operação"]:::pessoa
    motorista["<b>Motorista</b><br/>[Pessoa]<br/>Executa as coletas e atualiza<br/>o status pelo celular"]:::pessoa
    sigcf["<b>SIGCF</b><br/>[Sistema de software]<br/>Ordens de coleta, acompanhamento da frota<br/>e inteligência sobre os pedidos"]:::sistema
    push["<b>Serviços de push</b><br/>[Sistema externo]<br/>Web Push dos navegadores e Firebase<br/>Cloud Messaging (app Android)"]:::externo
    osm["<b>OpenStreetMap</b><br/>[Sistema externo]<br/>Mapa base"]:::externo
    mapas["<b>App de mapas do celular</b><br/>[Sistema externo]<br/>Navegação até o cliente"]:::externo

    cliente -- "Pede a coleta por telefone ou WhatsApp" --> gestor
    gestor -- "Cria ordens e acompanha as coletas<br/>[HTTPS]" --> sigcf
    motorista -- "Consulta e atualiza as coletas,<br/>compartilha a posição [HTTPS]" --> sigcf
    sigcf -- "Envia avisos de coleta<br/>[Web Push e FCM]" --> push
    push -- "Entrega o aviso no celular" --> motorista
    sigcf -. "Carrega os tiles do mapa [HTTPS]" .-> osm
    motorista -. "Abre o endereço da coleta" .-> mapas
```

## Nível 2 — Containers

As partes executáveis do SIGCF e como conversam.

```mermaid
flowchart TB
    classDef pessoa fill:#18181b,stroke:#18181b,color:#ffffff
    classDef container fill:#facc15,stroke:#854d0e,color:#18181b
    classDef externo fill:#e4e4e7,stroke:#71717a,color:#18181b

    gestor["<b>Gestor</b><br/>[Pessoa]"]:::pessoa
    motorista["<b>Motorista</b><br/>[Pessoa]"]:::pessoa

    subgraph sigcf["SIGCF"]
        spa["<b>Aplicação web</b><br/>[React 19, Vite, TanStack Query, Leaflet]<br/>Telas do gestor (desktop) e do motorista<br/>(mobile-first, instalável como PWA)"]:::container
        sw["<b>Service worker</b><br/>[Workbox]<br/>Cache do app e recebimento<br/>dos avisos com o app fechado"]:::container
        nginx["<b>Servidor web</b><br/>[nginx]<br/>Entrega os arquivos da aplicação,<br/>cabeçalhos de segurança e proxy de /api"]:::container
        api["<b>API</b><br/>[Node 22, NestJS 12, TypeORM]<br/>Regras de negócio, autenticação JWT,<br/>inteligência e rastreamento"]:::container
        db[("<b>Banco de dados</b><br/>[MySQL 8, InnoDB]<br/>Cadastros, ordens, histórico, trajetos,<br/>inscrições de push e aparelhos do app")]:::container
        app["<b>App Android</b><br/>[Capacitor 8, mesmo frontend]<br/>Motorista: trajeto por serviço nativo<br/>e avisos pelo Firebase"]:::container
    end

    push["<b>Serviços de push</b><br/>[Sistema externo]"]:::externo
    fcm["<b>Firebase Cloud Messaging</b><br/>[Sistema externo]"]:::externo
    osm["<b>OpenStreetMap</b><br/>[Sistema externo]"]:::externo

    gestor -- "Usa no navegador" --> spa
    motorista -- "Usa no navegador do celular" --> spa
    motorista -- "Usa no Android" --> app
    app -- "Chama /api pelo HTTP nativo<br/>[HTTPS, JSON]" --> nginx
    spa -- "Carrega a aplicação e chama /api<br/>[HTTPS, JSON]" --> nginx
    nginx -- "Encaminha /api<br/>[HTTP]" --> api
    api -- "Lê e grava<br/>[SQL, TCP 3306]" --> db
    api -- "Envia avisos criptografados<br/>[Web Push, VAPID]" --> push
    push -- "Entrega" --> sw
    sw -- "Mostra a notificação" --> motorista
    api -- "Envia avisos ao app<br/>[FCM HTTP v1, conta de serviço]" --> fcm
    fcm -- "Entrega" --> app
    spa -- "Busca os tiles<br/>[HTTPS]" --> osm
```

## Nível 3 — Componentes da API

Cada módulo do NestJS segue as camadas Controller → Service → Repository (RNF02): o controller recebe a requisição já validada, o service aplica a regra de negócio e o repositório do TypeORM acessa o banco.

```mermaid
flowchart LR
    classDef componente fill:#facc15,stroke:#854d0e,color:#18181b
    classDef transversal fill:#fef9c3,stroke:#854d0e,color:#18181b
    classDef externo fill:#e4e4e7,stroke:#71717a,color:#18181b

    nginx["Servidor web<br/>[nginx]"]:::externo
    db[("MySQL")]:::externo
    push["Serviços de push"]:::externo

    subgraph api["API (NestJS)"]
        direction LR
        seguranca["<b>Segurança</b><br/>[helmet, AuthGuard, LimiteDeLoginGuard]<br/>Cabeçalhos, JWT, perfis<br/>e tentativas de login"]:::transversal
        validacao["<b>Validação</b><br/>[ValidationPipe, DTOs]<br/>Recusa dados inválidos<br/>e campos desconhecidos"]:::transversal
        auth["<b>Autenticação</b><br/>[AuthController, AuthService]<br/>Login e perfil"]:::componente
        cadastros["<b>Cadastros</b><br/>[Motoristas, Veículos, Clientes]<br/>RF01"]:::componente
        ordens["<b>Ordens</b><br/>[OrdensService, transicoes.ts]<br/>Criação, máquina de estados,<br/>histórico e painel (RF02–RF07)"]:::componente
        intel["<b>Inteligência</b><br/>[InteligenciaService, analise.ts]<br/>Recorrência, previsão,<br/>regressão do peso (RF09)"]:::componente
        notif["<b>Notificações</b><br/>[NotificacoesService, EnviadorPush]<br/>Inscrições e avisos (RF10)"]:::componente
        rast["<b>Rastreamento</b><br/>[RastreamentoService, trajeto.ts]<br/>Pontos, distância e duração (RF11)"]:::componente
        repos["<b>Repositórios</b><br/>[TypeORM]<br/>Entidades, migrations<br/>e transações"]:::transversal
    end

    nginx --> seguranca --> validacao
    validacao --> auth & cadastros & ordens & intel & notif & rast
    ordens -- "Avisa o motorista" --> notif
    notif -- "[Web Push]" --> push
    auth & cadastros & ordens & intel & notif & rast --> repos
    repos -- "[SQL]" --> db
```

### Onde fica cada parte

| Pasta | Conteúdo |
|---|---|
| `backend/src/<módulo>/` | Controller, service, entidade, DTOs e testes de cada módulo (`auth`, `clientes`, `motoristas`, `veiculos`, `ordens`, `inteligencia`, `notificacoes`, `rastreamento`) |
| `backend/src/common/` | Validações compartilhadas, datas no fuso de São Paulo e conversão de decimais |
| `backend/src/database/` | Configuração do TypeORM, migrations e seed |
| `backend/test/` | Testes e2e contra um MySQL de verdade |
| `frontend/src/api/` | Cliente HTTP, tipos e consultas (TanStack Query) |
| `frontend/src/auth/` | Sessão, contexto de autenticação e rotas protegidas por perfil |
| `frontend/src/componentes/` | Componentes compartilhados (diálogos, estados, mapa, status) |
| `frontend/src/paginas/` | Telas do gestor e do motorista |
| `frontend/src/util/` | Formatação, localização e notificações |

## Caminho de uma requisição

Do toque do motorista em **Concluir coleta** até o banco de dados:

```mermaid
sequenceDiagram
    autonumber
    actor M as Motorista
    participant T as Tela (React)
    participant N as nginx
    participant G as AuthGuard
    participant P as ValidationPipe
    participant S as OrdensService
    participant B as MySQL
    participant W as Serviço de push

    M->>T: Toca em "Confirmar conclusão"
    T->>T: Envia a fila de posições pendentes (RF11)
    T->>N: PATCH /api/ordens/42/status<br/>Authorization: Bearer token
    N->>G: Encaminha para a API
    G->>G: Verifica assinatura, validade e perfil do token
    G->>P: Requisição autenticada
    P->>P: Valida o corpo com o AlterarStatusDto
    P->>S: alterarStatus(42, dto, motorista)
    S->>B: Abre transação e trava a ordem (SELECT ... FOR UPDATE)
    S->>S: validarTransicao(EM_ANDAMENTO → CONCLUIDA, MOTORISTA)
    S->>B: UPDATE na ordem, INSERT no histórico e COMMIT
    S-->>T: 200, ordem atualizada com o histórico
    T->>T: Atualiza a lista e o painel (invalida as consultas)
    opt Cancelamento pelo gestor
        S-)W: Aviso ao motorista, em segundo plano
    end
```

Uma regra violada vira o código HTTP correspondente: transição inválida → 409, perfil sem permissão → 403, motivo ausente → 400. A ordem de outro motorista responde 404, para não revelar que existe.

## Implantação

Em desenvolvimento e nas demonstrações locais, o Docker Compose sobe os mesmos containers do diagrama de nível 2 (perfil `app`), mais o Adminer para inspecionar o banco e um túnel HTTPS opcional para testar no celular (perfil `tunel`). As instruções de implantação, incluindo a nuvem, estão em [`deploy.md`](deploy.md).
