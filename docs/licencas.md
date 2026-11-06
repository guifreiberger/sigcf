# Licenças — SIGCF

## Código do projeto

O código do SIGCF é de autoria de Guilherme Gabriel Freiberger, com **todos os direitos reservados** (ver [`LICENSE`](../LICENSE)). O repositório é público para avaliação acadêmica e portfólio, o que não concede licença de uso. Contribuições seguem as regras do [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Componentes de terceiros

Todas as dependências usadas em produção têm licenças que permitem o uso em software fechado. Nenhuma é copyleft forte (GPL ou AGPL): a verificação percorreu também as dependências indiretas, com `npm ls --omit=dev --all`.

### Backend

| Componente | Versão | Licença | Uso |
|---|---|---|---|
| NestJS (`@nestjs/*`) | 12 | MIT | Framework da API |
| `@nestjs/throttler` | 6.7 | MIT | Limite de tentativas de login |
| TypeORM | 1.1 | MIT | Mapeamento objeto-relacional e migrations |
| mysql2 | 3.24 | MIT | Driver do MySQL |
| class-validator / class-transformer | 0.15 / 0.5 | MIT | Validação das entradas |
| helmet | 8.3 | MIT | Cabeçalhos de segurança |
| bcryptjs | 3.0 | BSD-3-Clause | Hash das senhas |
| rxjs | 7.8 | Apache-2.0 | Dependência do NestJS |
| reflect-metadata | 0.2 | Apache-2.0 | Metadados dos decorators |
| web-push | 3.6 | MPL-2.0 | Envio das notificações push |
| google-auth-library | 11.3 | Apache-2.0 | Autenticação no Firebase para os avisos no app Android |

### Frontend

| Componente | Versão | Licença | Uso |
|---|---|---|---|
| React / React DOM | 19 | MIT | Interface |
| React Router | 7 | MIT | Rotas |
| TanStack Query | 5 | MIT | Consultas à API e cache |
| Leaflet | 1.9 | BSD-2-Clause | Mapas |
| React Leaflet | 5.0 | Hippocratic-2.1 | Componentes React para o Leaflet |
| Lucide | 1.x | ISC | Ícones |
| Inter (`@fontsource-variable/inter`) | 5.3 | SIL OFL 1.1 | Fonte |
| Capacitor (`@capacitor/core`, `android`, `push-notifications`, `local-notifications`) | 8 | MIT | App Android do motorista e avisos pelo Firebase |
| `@capacitor-community/background-geolocation` | 1.3 | MIT | GPS em segundo plano no app Android |

### Observações

- **MPL-2.0 (`web-push`):** licença copyleft fraca, por arquivo. Só alterações nos arquivos da própria biblioteca teriam de ser publicadas; o projeto a usa sem modificações.
- **Hippocratic-2.1 (`react-leaflet`):** licença de "fonte ética", que proíbe usos que violem direitos humanos. O uso no SIGCF, de gestão de coletas, está dentro do permitido. Ela não é aprovada pela OSI, o que vale considerar se o sistema for comercializado.
- **SIL OFL 1.1 (Inter):** a fonte pode ser embutida e distribuída com o software; não pode ser vendida isoladamente.

## Dados, serviços e imagens

| Item | Licença ou termos | Como é atendido |
|---|---|---|
| Mapas do [OpenStreetMap](https://www.openstreetmap.org/copyright) | Dados ODbL; tiles sob a [política de uso](https://operations.osmfoundation.org/policies/tiles/) da OSMF | Atribuição "© OpenStreetMap" exibida em todo mapa. Para uso intenso em produção, a recomendação é um provedor de tiles próprio ou contratado ([`rastreamento.md`](rastreamento.md)) |
| Serviços de push dos navegadores (Google, Mozilla, Apple, Microsoft) | Termos de cada navegador | Usados por meio do padrão aberto Web Push, sem conta ou chave nesses serviços |
| [Firebase Cloud Messaging](https://firebase.google.com/terms) | Termos do Firebase (plano gratuito) | Avisos ao app Android; o servidor se autentica com a conta de serviço do projeto, guardada como segredo |
| Ícone da notificação do app (Material Icons, "location_on") | Apache-2.0 | Desenho vetorial em `frontend/android/app/src/main/res/drawable/ic_notificacao.xml` |
| Imagem `node` | MIT (Node.js) | Base do container da API |
| Imagem `nginx` | BSD-2-Clause | Base do container do frontend |
| Imagem `mysql` | GPLv2 (MySQL Community Server) | Banco em servidor separado, acessado pela rede; o código do SIGCF não é ligado ao MySQL, o que não o torna obra derivada |

## Como conferir

```bash
cd backend && npm ls --omit=dev --all
cd frontend && npm ls --omit=dev --all
```

O campo `license` de cada pacote fica em `node_modules/<pacote>/package.json`.
