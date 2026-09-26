# Protocolo de Teste de Usabilidade do MVP

**Objetivo:** verificar se gestores e motoristas conseguem executar as tarefas centrais do SIGCF sem treinamento prévio, avaliando a hipótese H4 e a meta de baixa curva de aprendizado.
**Participantes:** 3 a 5 por perfil. Estudos de usabilidade mostram que cerca de cinco participantes já revelam a maior parte dos problemas de uma interface (NIELSEN, 2000).
**Duração:** cerca de 20 minutos por participante.

## Preparação

1. No dia da sessão, rode `npm run seed:recriar` no backend: ele apaga os dados e recria a base de demonstração com as coletas marcadas para a data atual. Reexecute entre um participante e outro para que todos encontrem o mesmo cenário.
2. **Gestor:** notebook ou desktop com navegador, logado na tela de login.
3. **Motorista:** celular do próprio participante, acessando o sistema por link, como aconteceria na prática.
4. Tenha em mãos a folha de registro (abaixo), um cronômetro e o questionário SUS.

## Condução

- Explique que **quem está sendo avaliado é o sistema, não a pessoa**, e que dificuldades ajudam a melhorar o produto.
- Peça ao participante que **pense em voz alta** enquanto usa o sistema.
- Leia uma tarefa por vez. **Não ajude nem indique onde clicar.** Se o participante travar por mais de 2 minutos, registre como falha e siga para a próxima.
- Anote hesitações, cliques em lugares errados e comentários espontâneos.

## Tarefas do gestor

| Nº | Tarefa lida ao participante | Critério de sucesso |
|---|---|---|
| G1 | "Entre no sistema com o usuário e a senha deste cartão." | Chega ao painel do dia |
| G2 | "A empresa comprou um caminhão novo, placa ABC1D23, modelo Iveco Daily, 3.500 kg. Cadastre-o." | Veículo aparece na lista de ativos |
| G3 | "Agende uma coleta para amanhã no Mercado Bom Preço, com a Maria, usando o caminhão novo." | Ordem criada com os dados corretos |
| G4 | "Descubra quais coletas de hoje falharam e por quê." | Informa o cliente e o motivo corretos |
| G5 | "O cliente Recicla Norte ligou cancelando a coleta de hoje. Registre isso no sistema." | Ordem cancelada com motivo |
| G6 | "Quantas coletas já foram feitas para a Metalúrgica Schulz?" | Responde usando o filtro por cliente |

## Tarefas do motorista

| Nº | Tarefa lida ao participante | Critério de sucesso |
|---|---|---|
| M1 | "Entre no sistema pelo seu celular com os dados deste cartão." | Vê a lista de coletas do dia |
| M2 | "Qual é a sua próxima coleta? Abra o endereço dela no mapa." | Abre o mapa do endereço correto |
| M3 | "Você chegou ao cliente. Avise o sistema que começou a coleta." | Status muda para Em andamento |
| M4 | "A coleta deu certo. Registre isso." | Status muda para Concluída |
| M5 | "Na coleta seguinte, o cliente não estava no local. Registre isso." | Status Falha com motivo |

## Folha de registro

| Participante | Tarefa | Resultado (S / SD / F) | Tempo | Observações |
|---|---|---|---|---|
| G1 | G1 | | | |
| … | … | | | |

**S** = sucesso sem dificuldade · **SD** = sucesso com dificuldade · **F** = falha ou desistência

## Questionário SUS (aplicar ao final)

Escala: 1 = discordo totalmente, 5 = concordo totalmente.

1. Eu acho que gostaria de usar este sistema com frequência.
2. Eu achei o sistema desnecessariamente complexo.
3. Eu achei o sistema fácil de usar.
4. Eu acho que precisaria da ajuda de uma pessoa com conhecimentos técnicos para usar o sistema.
5. Eu achei que as várias funções do sistema estão bem integradas.
6. Eu achei que o sistema apresenta muita inconsistência.
7. Eu imagino que a maioria das pessoas aprenderia a usar este sistema rapidamente.
8. Eu achei o sistema muito complicado de usar.
9. Eu me senti confiante ao usar o sistema.
10. Eu precisei aprender várias coisas antes de conseguir usar o sistema.

**Cálculo da pontuação (BROOKE, 1996):** nos itens ímpares, subtraia 1 da resposta; nos itens pares, subtraia a resposta de 5. Some os dez valores e multiplique por 2,5. O resultado vai de 0 a 100.

**Interpretação:** a pontuação média observada em centenas de estudos é cerca de **68** (SAURO, 2011). Adote como meta do MVP **SUS ≥ 68** para cada perfil; pontuações a partir de **80,3** correspondem ao conceito A na escala de Sauro e Lewis (2016).

## Análise

- **Eficácia:** taxa de sucesso por tarefa (S + SD sobre o total de participantes).
- **Eficiência:** mediana do tempo por tarefa.
- **Satisfação:** pontuação SUS média por perfil.
- **Problemas de usabilidade:** liste cada problema observado, quantos participantes o encontraram e a gravidade (impede a tarefa, atrasa a tarefa, cosmético). Corrija os que impedem tarefas antes da versão final.

## Referências

- BROOKE, J. SUS: a "quick and dirty" usability scale. In: JORDAN, P. W. et al. (ed.). *Usability Evaluation in Industry*. London: Taylor & Francis, 1996.
- NIELSEN, J. *Why You Only Need to Test with 5 Users*. Nielsen Norman Group, 2000.
- SAURO, J. *A Practical Guide to the System Usability Scale*. Denver: Measuring Usability LLC, 2011.
- SAURO, J.; LEWIS, J. R. *Quantifying the User Experience*. 2. ed. Cambridge: Morgan Kaufmann, 2016.
