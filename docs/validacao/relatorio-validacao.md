# Relatório de Validação com o Parceiro

**Parceiro:** Edepel, empresa de coleta de recicláveis de Jaraguá do Sul/SC.
**Objetivo:** submeter as versões funcionais do SIGCF a quem vai usá-lo e registrar o que foi aprovado e o que foi pedido, como exige o PAC Extensionista VIII. Cada pedido vira uma issue no repositório, para que a mudança no sistema possa ser rastreada até o feedback que a originou.

Instrumentos: [roteiro de entrevista](roteiro-entrevista.md), [protocolo de teste de usabilidade com SUS](teste-usabilidade.md) e [questionário](questionario.md).

## Sessões

| Nº | Data | Participante | Formato | Resultado |
|---|---|---|---|---|
| 1 | 05/11/2026 | Gestor da Edepel | Conversa sobre o sistema e, no mesmo dia, definição das melhorias | Aprovou o sistema como está; pediu o trajeto exato do motorista, mais dados na inteligência, edição de ordens, caminhão padrão, peso da balança e relatório |
| 2 | A agendar | Motoristas (2 a 3) | Teste de usabilidade no app Android, durante uma coleta real, com SUS | Planejada |
| 3 | A agendar | Atendente | Teste de usabilidade no painel do gestor, com SUS | Planejada |

## Sessão 1 — Gestor (05/11/2026)

**O que aprovou:** o sistema no estado em que estava.

**O que pediu:**

1. Saber o trajeto exato que o motorista fez em cada coleta.
2. Mais dados que ele possa usar na tela de inteligência.

Numa segunda conversa no mesmo dia, gestor e autor detalharam esses dados e definiram outras melhorias: editar ordens, um caminhão padrão por motorista, registrar o peso da balança depois da coleta e um relatório das coletas por período em planilha.

**Ajuste de rota:**

| Pedido | O que foi feito | Issue | Situação |
|---|---|---|---|
| Trajeto exato do motorista | No navegador, o trajeto só era gravado com o SIGCF aberto na tela, e um teste de campo no mesmo dia mostrou o trajeto vazio quando a tela apagou. O SIGCF ganhou um app Android que continua gravando com a tela apagada ou com o motorista em outros apps ([ADR 0009](../adr/0009-app-android-com-capacitor.md)) | [#34](https://github.com/guifreiberger/sigcf/issues/34) | Implementado na homologação. No teste de campo de 06/11, o GPS gravou com a tela apagada, mas o envio travou na troca do Wi-Fi para o 4G e o trajeto caiu na coleta seguinte; as duas falhas foram corrigidas. Falta repetir o teste em rota e validar com os motoristas |
| Mais dados na inteligência | A tela de inteligência virou um dashboard do período: peso da balança, clientes que mais pedem e coletas, quilômetros e tempo de cada motorista, mantendo os alertas e padrões | [#35](https://github.com/guifreiberger/sigcf/issues/35), [#39](https://github.com/guifreiberger/sigcf/issues/39) | Implementado na homologação |
| Edição de ordens, apontada como muito importante | Edição pelo gestor, com regras por status, avisos aos motoristas e registro no histórico | [#36](https://github.com/guifreiberger/sigcf/issues/36) | Implementado na homologação |
| Caminhão padrão de cada motorista, com opção de usar outro | Caminhão padrão no cadastro do motorista, preenchido ao escolher o motorista na ordem | [#37](https://github.com/guifreiberger/sigcf/issues/37) | Implementado na homologação |
| Peso pela balança: o motorista vai ao cliente sem saber quanto vai coletar, e o peso só é conhecido depois da pesagem | O gestor registra o peso medido na balança depois da coleta; o peso estimado ficou opcional | [#9](https://github.com/guifreiberger/sigcf/issues/9) | Implementado na homologação |
| Relatório das coletas por período | Planilha para o Excel com peso, distância, tempo, status, motorista e caminhão, filtrável por motorista, cliente e status | [#38](https://github.com/guifreiberger/sigcf/issues/38) | Implementado na homologação |

## Próximas sessões

- **Motoristas:** instalar o app Android no celular de cada participante e acompanhar uma coleta real, seguindo as tarefas do motorista no [protocolo de usabilidade](teste-usabilidade.md). Ao final, aplicar o SUS (meta: 68 ou mais) e conferir no painel se o trajeto foi gravado por inteiro.
- **Atendente:** criar uma ordem para um motorista, disponibilizar uma coleta para todos, acompanhar o painel do dia, editar uma ordem, registrar o peso da balança, consultar o dashboard e baixar o relatório do mês, seguindo as tarefas do gestor no mesmo protocolo, com o SUS ao final.

Os problemas encontrados nas sessões são abertos como issues com a etiqueta `validacao`.
