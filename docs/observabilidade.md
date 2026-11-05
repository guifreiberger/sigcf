# Observabilidade — SIGCF

Como o SIGCF é monitorado em produção: o que é coletado, onde consultar e quem é avisado quando algo dá errado.

## O que é coletado

| Sinal | Origem | Destino |
|---|---|---|
| **Uma linha de log por requisição** (método, rota, status, duração) | Middleware [`registro-de-requisicoes`](../backend/src/common/registro-de-requisicoes.middleware.ts) da API, em JSON quando `NODE_ENV=production` | Log Analytics, tabela `ContainerAppConsoleLogs_CL` |
| **Erros e avisos da aplicação** (falha ao enviar push, exceções não tratadas) | Logger do NestJS, também em JSON | Mesma tabela |
| **Eventos dos containers** (início, reinício, falha no health check, escala) | Azure Container Apps | `ContainerAppSystemLogs_CL` |
| **Métricas** (requisições, CPU, memória, réplicas) | Azure Container Apps | Aba *Métricas* do app no portal |
| **Disponibilidade** (health check, que também testa o banco, a cada 5 min de 3 regiões) | Teste padrão do Application Insights, só na produção | `AppAvailabilityResults` |

A query string não é registrada, porque pode conter filtros com dados de clientes. O health check bem-sucedido também não, para não encher o log a cada poucos segundos.

## Alertas

| Alerta | Condição | Aviso |
|---|---|---|
| Produção fora do ar | Health check falhando em 2 das 3 regiões | E-mail ao responsável (grupo de ação `ag-sigcf`) |
| Gasto | 50% do orçamento mensal atingido, ou previsão do mês acima de 100% | E-mail ao responsável |
| Container doente | `/api/health` falhando (inclui o banco) | O Container Apps reinicia o container sozinho (*liveness probe*) |

## Consultas prontas

No portal do Azure, abra o workspace `log-sigcf` → *Logs* e cole a consulta.

**Volume, erros e tempo de resposta (acompanha o RNF07, de respostas abaixo de 300 ms):**

```kusto
ContainerAppConsoleLogs_CL
| where ContainerName_s == "api"
| extend log = parse_json(Log_s)
| where log.context == "HTTP"
| extend status = toint(log.message.status), duracao = toint(log.message.duracaoMs)
| summarize requisicoes = count(),
            erros_5xx = countif(status >= 500),
            p50_ms = percentile(duracao, 50),
            p95_ms = percentile(duracao, 95)
  by bin(TimeGenerated, 15m), ContainerAppName_s
| order by TimeGenerated desc
```

**Rotas mais lentas da última semana:**

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(7d) and ContainerName_s == "api"
| extend log = parse_json(Log_s)
| where log.context == "HTTP"
| summarize chamadas = count(), p95_ms = percentile(toint(log.message.duracaoMs), 95)
  by metodo = tostring(log.message.metodo), rota = tostring(log.message.rota)
| top 10 by p95_ms
```

**Erros da aplicação:**

```kusto
ContainerAppConsoleLogs_CL
| where ContainerName_s == "api"
| extend log = parse_json(Log_s)
| where log.level in ("error", "warn")
| project TimeGenerated, ContainerAppName_s, nivel = log.level, contexto = log.context, mensagem = log.message
| order by TimeGenerated desc
```

**Tentativas de login bloqueadas (possível força bruta):**

```kusto
ContainerAppConsoleLogs_CL
| where ContainerName_s == "api"
| extend log = parse_json(Log_s)
| where log.context == "HTTP" and tostring(log.message.rota) == "/api/auth/login"
| summarize recusadas = countif(toint(log.message.status) == 401),
            bloqueadas = countif(toint(log.message.status) == 429)
  by bin(TimeGenerated, 1h)
```

**Reinícios e falhas dos containers:**

```kusto
ContainerAppSystemLogs_CL
| where Type_s == "Warning"
| project TimeGenerated, ContainerAppName_s, Reason_s, Log_s
| order by TimeGenerated desc
```

**Disponibilidade da produção por região:**

```kusto
AppAvailabilityResults
| where TimeGenerated > ago(24h)
| summarize disponibilidade = round(100.0 * countif(Success == true) / count(), 2) by Location
```

## Quando algo der errado

1. **Chegou o e-mail de produção fora do ar:** veja as falhas dos containers (consulta acima). Se a última implantação for a causa, volte para a versão anterior ([`deploy.md`](deploy.md#voltar-para-a-versão-anterior-rollback)).
2. **Erros 500 aumentando:** filtre os erros da aplicação no horário dos 500. A rota está no log de requisições.
3. **Lentidão:** a consulta de rotas mais lentas aponta onde o p95 passou de 300 ms; o [`desempenho.md`](desempenho.md) descreve como medir localmente.

## Custos da observabilidade

O Log Analytics tem teto de **0,5 GB de ingestão por dia** e retenção de 30 dias, o que mantém o custo dentro da cota gratuita mensal. O teste de disponibilidade roda só na produção: na homologação, ele manteria o app sempre ligado.
