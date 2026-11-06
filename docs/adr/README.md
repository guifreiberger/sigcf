# Registros de Decisões de Arquitetura (ADRs)

Cada arquivo registra uma decisão relevante: o contexto em que foi tomada, o que se decidiu, as alternativas descartadas e as consequências. O formato segue a proposta de [Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

| Nº | Decisão | Status | Data |
|---|---|---|---|
| [0001](0001-node-nestjs-mysql.md) | Node.js com NestJS e MySQL no lugar de Spring Boot e PostgreSQL | Aceita, pendente de validação com o orientador | 25/09/2026 |
| [0002](0002-pwa-react-para-o-motorista.md) | Aplicação web progressiva em React para o motorista, no lugar de app nativo em Flutter | Aceita; complementada pelo 0009 no Android | 25/09/2026 |
| [0003](0003-autenticacao-jwt.md) | Autenticação stateless com JWT e perfis no token | Aceita | 25/09/2026 |
| [0004](0004-monorepo-e-containers.md) | Monorepo com Docker Compose | Aceita | 25/09/2026 |
| [0005](0005-datas-sem-fuso.md) | Datas de coleta como texto e "hoje" no fuso de São Paulo | Aceita | 26/09/2026 |
| [0006](0006-inteligencia-sem-api-de-ia.md) | Inteligência por estatística e regressão, sem APIs de IA | Aceita | 27/09/2026 |
| [0007](0007-notificacoes-web-push.md) | Notificações com Web Push e chaves VAPID próprias | Aceita | 27/09/2026 |
| [0008](0008-rastreamento-pelo-navegador.md) | Rastreamento da coleta pelo navegador, com consultas periódicas e OpenStreetMap | Aceita; limitação de segundo plano resolvida pelo 0009 | 04/11/2026 |
| [0009](0009-app-android-com-capacitor.md) | App Android com Capacitor para o trajeto em segundo plano e avisos pelo Firebase | Aceita | 05/11/2026 |

Para registrar uma decisão nova, copie o formato de um ADR existente, use o próximo número e adicione a linha nesta tabela. Um ADR não é editado depois de aceito: se a decisão mudar, cria-se outro que o substitui.
