# Avaliação de Desempenho — RNF de tempo de resposta (< 300 ms)

Medições realizadas em 25/09/2026, em ambiente local de desenvolvimento.

**Ambiente:** Intel Core i5-12400F, Windows 11 Pro, Docker Desktop 4.92 (WSL 2), MySQL 8.0.46 em container, Node.js 22.17, NestJS 12, TypeORM 1.1. API e cliente de medição na mesma máquina, portanto os tempos não incluem latência de rede real.

## 1. Latência da API

Requisições sequenciais após 5 requisições de aquecimento, com a base de demonstração do `seed` (7 ordens). Script: [`desempenho/medir-latencia.mjs`](desempenho/medir-latencia.mjs).

| Endpoint | n | p50 | p95 | p99 | máx. |
|---|---|---|---|---|---|
| `GET /ordens/minhas` (RF03) | 200 | 3,5 ms | 4,8 ms | 6,4 ms | 6,5 ms |
| `GET /ordens` (lista do gestor) | 200 | 5,2 ms | 6,4 ms | 7,4 ms | 7,6 ms |
| `GET /ordens/resumo` (painel) | 200 | 2,8 ms | 3,8 ms | 4,7 ms | 5,3 ms |
| `GET /ordens/:id` (detalhe + histórico) | 200 | 5,0 ms | 6,1 ms | 7,0 ms | 7,7 ms |
| `GET /veiculos` | 200 | 2,7 ms | 3,5 ms | 3,9 ms | 3,9 ms |
| `POST /auth/login` | 30 | 67,8 ms | 70,0 ms | 70,2 ms | 70,2 ms |

O login é o endpoint mais lento por decisão de segurança: o hash bcrypt com custo 10 é deliberadamente caro para dificultar ataques de força bruta.

## 2. Consulta do RF03 sob volume

Com poucos registros qualquer consulta é rápida, então a base de demonstração não prova que o requisito se sustenta com o crescimento. Para isso, a tabela `ordem_coleta` do banco de testes foi carregada com **200.002 ordens** (50 motoristas × 365 dias, cerca de 11 coletas por motorista por dia) e a consulta "coletas do motorista X hoje" foi analisada com `EXPLAIN ANALYZE`. Script: [`desempenho/carga-rf03.sql`](desempenho/carga-rf03.sql).

| Cenário | Estratégia do MySQL | Linhas lidas | Tempo |
|---|---|---|---|
| Com índice `(motorista_id, data_coleta)` | Index lookup | 11 | **0,05 a 0,13 ms** |
| Sem índice (`IGNORE INDEX`) | Table scan | 200.002 | **77 a 268 ms** |

A faixa reflete o estado do cache do InnoDB: o maior tempo sem índice ocorreu com cache frio, logo após a carga; o menor, com as páginas da tabela já em memória. Mesmo no melhor caso a varredura é cerca de 600 vezes mais lenta. No pior caso, apenas a consulta ao banco consumiria quase todo o orçamento de 300 ms, e o tempo cresceria linearmente com o histórico acumulado. Com o índice, o custo depende somente do número de coletas do motorista no dia, independentemente do tamanho total da tabela.

## Limitações

- Medições sequenciais (um cliente por vez); não avaliam concorrência de múltiplos usuários simultâneos.
- Rede local: em produção somam-se a latência de rede e o tempo de TLS.
- O teste de volume isola a consulta no banco; a latência da API sob volume deve ser repetida quando houver um ambiente de homologação.
