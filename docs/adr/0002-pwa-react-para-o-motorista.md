# ADR 0002 — Aplicação web progressiva em React para o motorista

**Status:** aceita · **Data:** 25/09/2026

## Contexto

O README inicial previa um aplicativo nativo em Flutter para os motoristas, além do painel web do gestor. Isso significaria três bases de código (backend, web e mobile) para uma pessoa só. As funções do motorista em campo são consultar as coletas do dia, atualizar o status e registrar a localização.

## Decisão

Uma única **SPA em React** atende os dois perfis, com rotas separadas por perfil. A tela do motorista é *mobile-first* e o app é instalável como **PWA** (ícone na tela inicial, funcionamento em tela cheia e notificações).

## Alternativas consideradas

- **Flutter nativo:** acesso completo ao aparelho (inclusive GPS em segundo plano), mas exige uma terceira stack, publicação em loja ou distribuição de APK, e instalação por cada motorista.
- **React Native:** reaproveitaria parte do conhecimento de React, mas manteria a necessidade de loja ou APK e de duas bases de interface.

## Consequências

- O acesso ao sistema é um link, que chega ao motorista pelo mesmo WhatsApp que o sistema pretende substituir. Isso facilita a adoção e a validação com usuários reais.
- Localização, notificações e manter a tela ligada usam APIs padrão dos navegadores (Geolocation, Web Push, Screen Wake Lock).
- **Limitação aceita:** navegadores não leem o GPS com o app fechado, o que afeta o rastreamento (ver [ADR 0008](0008-rastreamento-pelo-navegador.md)). No iPhone, as notificações exigem adicionar o app à Tela de Início.
