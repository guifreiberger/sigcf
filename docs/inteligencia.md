# Inteligência para o Gestor — Metodologia

A tela de Inteligência ajuda o atendente a antecipar pedidos de coleta. Em vez de esperar o cliente ligar ou mandar mensagem, o sistema identifica o padrão de cada cliente e avisa quando uma coleta costumeira ainda não foi pedida.

Todo o cálculo é feito dentro do próprio sistema, em TypeScript, sem nenhuma API externa de inteligência artificial. Os dados dos clientes não saem do servidor, os resultados são determinísticos (os mesmos dados produzem sempre a mesma resposta) e cada número exibido pode ser explicado. Implementação: [`backend/src/inteligencia/analise.ts`](../backend/src/inteligencia/analise.ts), com testes em [`analise.spec.ts`](../backend/src/inteligencia/analise.spec.ts).

## Dados considerados

- Ordens de coleta dos **últimos 12 meses**, por cliente ativo.
- Ordens **canceladas são descartadas**, para que pedidos feitos por engano não distorçam o padrão.
- O padrão e a previsão usam as coletas até hoje; ordens futuras indicam apenas que a próxima coleta já está agendada.
- O peso vem do campo **peso estimado**, informado pelo atendente ao criar a ordem.

## Recorrência

Com as datas únicas das coletas em ordem cronológica, o sistema calcula o intervalo médio entre coletas consecutivas, o dia da semana mais frequente e o dia do mês mais frequente (aceitando ±2 dias, pois "por volta do dia 5" inclui os dias 4 e 6). São necessárias **pelo menos 3 coletas**; abaixo disso, o cliente aparece como histórico insuficiente.

| Padrão | Condição | Exemplo exibido |
|---|---|---|
| Mensal | intervalo médio entre 25 e 35 dias e ≥ 60% das coletas no mesmo dia do mês | Todo mês, por volta do dia 5 |
| Semanal | intervalo médio entre 5 e 9 dias e ≥ 60% no mesmo dia da semana | Toda segunda-feira |
| Quinzenal | intervalo médio entre 12 e 17 dias e ≥ 60% no mesmo dia da semana | A cada duas semanas, geralmente na quarta-feira |
| Intervalo | nenhuma das anteriores | A cada 21 dias, em média |

A **regularidade** é a proporção de coletas que seguem o padrão encontrado. No padrão por intervalo, ela é `1 − (desvio padrão ÷ média)` dos intervalos, limitada entre 0 e 100%.

## Próxima coleta prevista

A partir da última coleta: +7 dias (semanal), +14 dias (quinzenal), o intervalo médio (intervalo) ou o mesmo dia do mês seguinte (mensal), ajustado para o último dia em meses mais curtos.

## Alertas de coleta esperada

Um cliente só gera alerta quando **não há nenhuma ordem agendada** para ele a partir de hoje.

| Alerta | Condição |
|---|---|
| Atrasada | a data prevista passou há mais de 2 dias |
| Prevista | a data prevista está entre 2 dias atrás e 3 dias à frente |

Cada alerta tem o botão **Criar ordem**, que abre o formulário já preenchido com o cliente, o endereço e a data prevista.

## Tendência de peso

O peso médio é a média aritmética dos pesos estimados. Para a tendência, aplica-se **regressão linear por mínimos quadrados** do peso em função do tempo (em dias). A inclinação é convertida em variação percentual mensal em relação à média, e o coeficiente de determinação R² mede o quanto a reta explica os dados.

| Tendência | Condição |
|---|---|
| Alta | variação > +5% ao mês **e** R² ≥ 0,3 |
| Queda | variação < −5% ao mês **e** R² ≥ 0,3 |
| Estável | demais casos |

A exigência de R² evita que oscilações aleatórias sejam apresentadas como tendência. São necessárias pelo menos 4 amostras de peso.

## Limitações

- Detecta padrões de calendário simples (semanal, quinzenal, mensal); não identifica sazonalidades mais complexas, como picos no fim do ano.
- A tendência de peso depende da qualidade das estimativas informadas pelo cliente ao atendente.
- Os limites (60% de regularidade, 5% ao mês, R² 0,3, tolerâncias em dias) foram definidos por critério de projeto e podem ser recalibrados com os dados reais da operação.
