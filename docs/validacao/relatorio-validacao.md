# Relatório de Validação com o Parceiro

**Parceiro:** Edepel, empresa de coleta de recicláveis de Jaraguá do Sul/SC.
**Objetivo:** submeter as versões funcionais do SIGCF a quem vai usá-lo e registrar o que foi aprovado e o que foi pedido, como exige o PAC Extensionista VIII. Cada pedido vira uma issue no repositório, para que a mudança no sistema possa ser rastreada até o feedback que a originou.

Instrumentos: [roteiro de entrevista](roteiro-entrevista.md), [protocolo de teste de usabilidade com SUS](teste-usabilidade.md) e [questionário](questionario.md).

## Sessões

| Nº | Data | Participante | Formato | Resultado |
|---|---|---|---|---|
| 1 | 05/11/2026 | Gestor da Edepel | Conversa sobre o sistema | Aprovou o sistema como está; pediu o trajeto exato do motorista e mais dados na inteligência |
| 2 | A agendar | Motoristas (2 a 3) | Teste de usabilidade no app Android, durante uma coleta real, com SUS | Planejada |
| 3 | A agendar | Atendente | Teste de usabilidade no painel do gestor, com SUS | Planejada |

## Sessão 1 — Gestor (05/11/2026)

**O que aprovou:** o sistema no estado em que estava.

**O que pediu:**

1. Saber o trajeto exato que o motorista fez em cada coleta.
2. Mais dados que ele possa usar na tela de inteligência.

**Ajuste de rota:**

| Pedido | O que foi feito | Issue | Situação |
|---|---|---|---|
| Trajeto exato do motorista | No navegador, o trajeto só era gravado com o SIGCF aberto na tela, e um teste de campo no mesmo dia mostrou o trajeto vazio quando a tela apagou. O SIGCF ganhou um app Android que continua gravando com a tela apagada ou com o motorista em outros apps ([ADR 0009](../adr/0009-app-android-com-capacitor.md)) | [#34](https://github.com/guifreiberger/sigcf/issues/34) | Implementado na homologação; falta o teste de campo longo e a validação com os motoristas |
| Mais dados na inteligência | Quais dados incluir está sendo definido com o gestor | [#35](https://github.com/guifreiberger/sigcf/issues/35) | Em definição |

## Próximas sessões

- **Motoristas:** instalar o app Android no celular de cada participante e acompanhar uma coleta real, seguindo as tarefas do motorista no [protocolo de usabilidade](teste-usabilidade.md). Ao final, aplicar o SUS (meta: 68 ou mais) e conferir no painel se o trajeto foi gravado por inteiro.
- **Atendente:** criar uma ordem para um motorista, disponibilizar uma coleta para todos, acompanhar o painel do dia e consultar a inteligência, seguindo as tarefas do gestor no mesmo protocolo, com o SUS ao final.

Os problemas encontrados nas sessões são abertos como issues com a etiqueta `validacao`.
