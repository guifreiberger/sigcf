# ADR 0004 — Monorepo com Docker Compose

**Status:** aceita · **Data:** 25/09/2026

## Contexto

Backend e frontend evoluem juntos: uma funcionalidade nova costuma mexer na API, nos tipos do frontend e nas telas ao mesmo tempo. O ambiente precisa de um MySQL na versão certa e deve ser fácil de reproduzir em qualquer máquina e na nuvem (RNF06).

## Decisão

Um único repositório com as pastas `backend/` e `frontend/`, cada uma com o próprio `package.json` e `Dockerfile`. O `docker-compose.yml` da raiz sobe o MySQL e o Adminer por padrão, o sistema completo no perfil `app` e um túnel HTTPS para testes no celular no perfil `tunel`.

## Alternativas consideradas

- **Dois repositórios:** separação mais rígida, mas cada mudança de ponta a ponta viraria dois pull requests sincronizados.
- **Ferramenta de monorepo (Nx, Turborepo):** útil com muitos pacotes, excessiva para dois projetos.

## Consequências

- Um commit ou pull request descreve a mudança inteira, da migration à tela.
- O CI roda os dois projetos em paralelo e constrói as duas imagens.
- As imagens são as mesmas em desenvolvimento e na nuvem: o backend roda como usuário sem privilégios, e o frontend é servido pelo nginx, que também faz o proxy de `/api`.
- O MySQL do container usa a porta 3307 no computador, para não conflitar com um MySQL instalado localmente.
