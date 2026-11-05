# ADR 0006 — Inteligência por estatística e regressão, sem APIs de IA

**Status:** aceita · **Data:** 27/09/2026

## Contexto

O nome do sistema promete inteligência, e o gestor precisa antecipar pedidos de clientes recorrentes (RF09). A faculdade proíbe o uso de APIs de inteligência artificial no projeto, e os dados de clientes da empresa não deveriam sair do servidor.

## Decisão

A análise roda no próprio backend, em funções puras de TypeScript ([`analise.ts`](../../backend/src/inteligencia/analise.ts)):

- **recorrência** pelo intervalo médio entre coletas e pela frequência do dia da semana ou do mês;
- **previsão** da próxima coleta a partir do padrão encontrado;
- **tendência de peso** por regressão linear pelo método dos mínimos quadrados, considerada só quando o R² é de pelo menos 0,3;
- **alertas** para coletas esperadas que ainda não foram pedidas.

A metodologia completa está em [`inteligencia.md`](../inteligencia.md).

## Alternativas consideradas

- **API de modelo de linguagem:** proibida pelas regras da disciplina, e os resultados não seriam determinísticos nem explicáveis.
- **Modelo de aprendizado de máquina treinado (séries temporais):** exigiria muito mais histórico do que uma empresa pequena tem, e cada previsão ficaria difícil de explicar ao gestor.

## Consequências

- Os resultados são determinísticos e explicáveis: cada indicador mostra de onde veio.
- As funções puras são testadas isoladamente, sem banco nem rede.
- Os dados dos clientes não saem do servidor.
- Com pouco histórico (menos de três coletas), o sistema não arrisca previsão.
