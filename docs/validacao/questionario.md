# Questionário Quantitativo (Google Forms)

**Objetivo:** medir a frequência dos problemas levantados nas entrevistas e a importância percebida das funcionalidades do MVP, com uma amostra maior que a das entrevistas.
**Tempo de resposta:** cerca de 5 minutos.
**Divulgação:** grupos e contatos do setor de transporte e coleta. Não solicite nome, e-mail, CPF ou nome da empresa: a coleta mínima de dados simplifica a adequação à LGPD e mantém os participantes não identificados.

Legenda dos tipos de pergunta no Google Forms: **[ME]** múltipla escolha (uma resposta), **[CX]** caixas de seleção (várias respostas), **[L5]** escala linear de 1 a 5, **[TA]** texto aberto (parágrafo).

---

## Seção 1 — Consentimento

Texto de abertura: *"Esta pesquisa faz parte do Trabalho de Conclusão de Curso de Engenharia de Software do Centro Universitário Católica de Santa Catarina. As respostas são anônimas e serão usadas apenas para fins acadêmicos. A participação é voluntária."*

1. **[ME, obrigatória]** Li as informações acima e concordo em participar.
   - Sim, concordo *(segue)*
   - Não concordo *(envia o formulário)*

## Seção 2 — Perfil

2. **[ME]** Qual é a sua função principal?
   - Gestor, dono ou responsável pela operação *(vai para a Seção 3)*
   - Motorista *(vai para a Seção 4)*
   - Outra função administrativa *(vai para a Seção 3)*
3. **[ME]** Quantos veículos a empresa possui?
   - 1 a 5 · 6 a 15 · 16 a 30 · Mais de 30
4. **[ME]** Qual o principal tipo de coleta ou transporte?
   - Resíduos ou recicláveis · Cargas e mercadorias · Entregas urbanas · Outro
5. **[ME]** Em qual estado a empresa atua? *(lista de UFs)*

## Seção 3 — Gestão (gestores e administrativo)

6. **[CX]** Quais ferramentas vocês usam hoje para controlar as coletas?
   - Papel ou caderno · Planilha (Excel, Google Sheets) · WhatsApp ou outro mensageiro · Sistema desenvolvido pela empresa · ERP ou sistema de gestão de frota contratado · Outro
7. Com que frequência estas situações acontecem? **[L5 para cada item: 1 = nunca, 5 = sempre]**
   - a) Perder informações sobre uma coleta já realizada
   - b) Demorar para saber que uma coleta falhou
   - c) Errar ao consolidar ou redigitar dados de coletas
   - d) Não saber em que etapa está cada coleta durante o dia
   - e) Ter dificuldade para responder a um cliente sobre coletas passadas
8. **[ME]** Quanto tempo por dia é gasto organizando e consolidando informações de coletas?
   - Menos de 15 min · 15 a 30 min · 30 min a 1 h · 1 a 2 h · Mais de 2 h
9. **[ME]** A empresa já usou ou avaliou algum sistema de gestão de frota ou de coletas?
   - Usa atualmente · Já usou e parou · Avaliou, mas não contratou · Nunca avaliou
10. **[CX, exibir se "já usou e parou" ou "avaliou, mas não contratou"]** Por quê?
    - Custo alto · Difícil de usar · Exigia equipamentos (rastreador, hardware) · Não atendia a nossa operação · A equipe não aderiu · Outro

*(Segue para a Seção 5.)*

## Seção 4 — Rotina do motorista

11. **[ME]** Como você recebe a lista de coletas do dia?
    - Papel entregue no início do dia · Mensagem no WhatsApp · Ligação · Aplicativo ou sistema · Outro
12. **[ME]** Você tem celular com internet durante o trabalho?
    - Sim, celular próprio · Sim, celular da empresa · Não
13. Com que frequência estas situações acontecem? **[L5 para cada item: 1 = nunca, 5 = sempre]**
    - a) Chegar a um cliente com endereço ou informação incompleta
    - b) Ter dificuldade para avisar o escritório sobre um problema
    - c) Receber mudanças nas coletas sem aviso a tempo
    - d) Ficar sem sinal de internet durante a rota
14. **[L5]** Quão confortável você se sente usando aplicativos no celular? *(1 = nada confortável, 5 = muito confortável)*

## Seção 5 — Funcionalidades (todos)

15. Qual a importância de cada recurso para o seu trabalho? **[L5 para cada item: 1 = nada importante, 5 = essencial]**
    - a) Lista das coletas do dia no celular do motorista
    - b) Atualizar o status da coleta com um toque (iniciada, concluída, falha)
    - c) Registrar o motivo quando uma coleta falha
    - d) Painel com o andamento das coletas do dia atualizado automaticamente
    - e) Histórico de coletas por cliente
    - f) Cadastro centralizado de veículos, motoristas e clientes
16. **[L5]** Se um sistema com esses recursos fosse gratuito ou de baixo custo, qual a chance de a sua empresa usar? *(1 = nenhuma, 5 = muito alta)*
17. **[TA, opcional]** Se você pudesse mudar uma coisa no controle de coletas da sua empresa, o que seria?

---

## Plano de análise

- **Perfil da amostra:** frequências absolutas e percentuais das perguntas 2 a 5.
- **Escalas Likert (7, 13, 14, 15, 16):** por serem dados ordinais, reporte **mediana** e **percentual de respostas 4 ou 5** (em vez de média). Ex.: "68% dos gestores relatam demorar para saber de falhas com frequência (4 ou 5)".
- **Priorização:** ordene os itens da pergunta 15 pelo percentual de 4 e 5. Recursos com baixa importância percebida são candidatos a sair do escopo; recursos pedidos na pergunta 17 e ausentes do MVP entram como trabalhos futuros.
- **Cruzamento com as entrevistas:** para cada hipótese (H1 a H4 do roteiro de entrevista), compare o que foi relatado qualitativamente com a frequência medida aqui.
- **Limitação a declarar:** amostra por conveniência, sem representatividade estatística do setor.
