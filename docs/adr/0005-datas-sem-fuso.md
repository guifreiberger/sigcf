# ADR 0005 — Datas de coleta como texto e "hoje" no fuso de São Paulo

**Status:** aceita · **Data:** 26/09/2026

## Contexto

A data da coleta é um dia do calendário, sem hora. Nos testes, uma ordem criada para 26/09 aparecia como 25/09: o driver do MySQL convertia a coluna `DATE` em um objeto `Date` à meia-noite UTC, e no fuso de Brasília (UTC−3) isso cai às 21h do dia anterior. O mesmo problema afetava o "hoje" usado para listar as coletas do motorista, que dependia do fuso do servidor (em containers e na nuvem, normalmente UTC).

## Decisão

- Colunas `DATE` são lidas como texto `AAAA-MM-DD` (`dateStrings: ['DATE']` no TypeORM) e trafegam assim pela API e pelo frontend, sem conversão de fuso.
- O "hoje" do backend é calculado explicitamente no fuso `America/Sao_Paulo` ([`common/data.ts`](../../backend/src/common/data.ts)), independentemente do fuso do servidor.
- Momentos exatos (histórico, pontos do trajeto) continuam como `DATETIME` em UTC (`timezone: 'Z'`).

## Alternativas consideradas

- **Configurar o fuso do servidor e do banco para São Paulo:** funcionaria na máquina local, mas quebraria silenciosamente em qualquer ambiente com outra configuração.
- **Guardar a data como `DATETIME` ao meio-dia:** contornaria o deslocamento, mas mistura dois conceitos e complica as comparações.

## Consequências

- A data mostrada é sempre a data cadastrada, em qualquer ambiente.
- Comparações de data viram comparações de texto no formato ISO, que mantêm a ordem cronológica.
- Um teste e2e reproduz o caso original para impedir que o problema volte.
