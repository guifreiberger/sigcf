# ADR 0003 — Autenticação stateless com JWT

**Status:** aceita · **Data:** 25/09/2026

## Contexto

O sistema tem dois perfis com permissões diferentes (gestor e motorista), e o motorista usa o app no celular, com conexão instável. A API precisa saber quem faz cada requisição e qual o seu perfil (RNF04).

## Decisão

Login com e-mail e senha (hash bcrypt), que devolve um **token JWT** assinado com HS256, válido por 8 horas (um turno). O token carrega o id, o nome e o perfil do usuário. Um guard global do NestJS exige o token em todas as rotas, exceto as marcadas como públicas, e confere o perfil exigido por cada rota. No frontend, a sessão fica no `localStorage`, e uma resposta 401 encerra a sessão.

## Alternativas consideradas

- **Sessão no servidor com cookie:** permite revogar o acesso na hora, mas exige armazenamento de sessões e proteção contra CSRF.
- **OAuth/login social:** não faz sentido para motoristas que não usam contas do Google no trabalho, e acrescenta dependência de terceiros.

## Consequências

- A API não guarda estado de sessão, o que simplifica a escala horizontal.
- As permissões ficam declaradas em cada rota (`@Perfis(Perfil.GESTOR)`), fáceis de auditar e testar.
- **Limitação aceita:** um usuário desativado mantém o acesso até o token expirar, no máximo 8 horas (ver [`seguranca.md`](../seguranca.md)).
- Em produção, a aplicação não sobe com um segredo fraco ou com o valor de exemplo.
