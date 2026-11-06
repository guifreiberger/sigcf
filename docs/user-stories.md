# User Stories — SIGCF

Histórias escritas a partir do fluxo real da empresa parceira, com critérios de aceite no formato *Dado / Quando / Então*. Cada uma indica o requisito que atende ([`requisitos.md`](requisitos.md)) e onde está o teste que comprova o critério.

## Personas

| Persona | Quem é | O que precisa |
|---|---|---|
| **Carlos**, gestor (42 anos) | Coordena a operação no escritório e atende os pedidos dos clientes | Registrar os pedidos num lugar só, saber o que está acontecendo sem ligar para ninguém e não esquecer clientes que pedem sempre |
| **João**, motorista (35 anos) | Faz as coletas com o caminhão, usa o celular no caminho | Ver rápido o que tem para hoje, com endereço e telefone, e atualizar a coleta com poucos toques |

---

## Cadastros (RF01)

**US01 — Cadastrar a frota e a carteira**
Como **gestor**, quero cadastrar veículos, motoristas e clientes para usá-los nas ordens de coleta.

- Dado um veículo com placa já cadastrada, quando eu tento cadastrá-lo de novo, então o sistema recusa e informa a duplicidade.
- Dado que digito a placa com hífen ou em minúsculas, quando salvo, então ela é guardada no formato padrão (ex.: `ABC1D23`).
- Dado um motorista, quando eu o cadastro, então ele consegue entrar no app com o e-mail e a senha definidos.

**US02 — Desativar sem perder o histórico**
Como **gestor**, quero desativar um veículo, motorista ou cliente que não uso mais, sem apagar as coletas antigas.

- Dado um cliente desativado, quando crio uma ordem, então ele não aparece entre as opções.
- Dado um cliente desativado, quando consulto ordens antigas dele, então elas continuam disponíveis.

> Testes: `backend/test/api.e2e-spec.ts` (RF01), `backend/src/{veiculos,motoristas,clientes}/*.spec.ts`

## Ordem de coleta (RF02, RF08)

**US03 — Registrar um pedido de coleta**
Como **gestor**, quero registrar o pedido do cliente como uma ordem atribuída a um motorista e a um veículo, para substituir a mensagem no grupo do WhatsApp.

- Dado que escolho o cliente, quando abro o formulário, então o endereço dele já vem preenchido e pode ser alterado.
- Dado uma data no passado, quando salvo, então o sistema recusa.
- Dado um veículo ou motorista inativo, quando salvo, então o sistema recusa.
- Dado que o cliente informou o peso aproximado, quando registro a ordem, então o peso estimado fica salvo e aparece para o motorista.

> Testes: `api.e2e-spec.ts` (RF02), `ordens.service.spec.ts`, `frontend/src/paginas/gestor/NovaOrdem.test.tsx`

## Coletas do motorista (RF03, RF04, RF07, RF10)

**US04 — Ver minhas coletas do dia**
Como **motorista**, quero ver só as minhas coletas de hoje, com endereço, telefone e peso estimado, para me organizar.

- Dado que há coletas de vários motoristas, quando abro o app, então vejo apenas as minhas.
- Dado uma coleta em andamento, quando abro a lista, então ela aparece primeiro.
- Dado o endereço da coleta, quando toco em "Abrir no mapa", então o endereço abre no aplicativo de mapas do celular.

**US05 — Atualizar a coleta em campo**
Como **motorista**, quero iniciar e concluir a coleta pelo celular, para o escritório saber sem eu precisar ligar.

- Dado uma coleta aguardando, quando toco em "Iniciar coleta", então ela passa para "em andamento".
- Dado uma coleta em andamento, quando toco em "Concluir coleta", então o app pede confirmação antes de concluir.
- Dado que tento pular uma etapa pela API (aguardando → concluída), então o sistema recusa.
- Dado que o celular permite a localização, quando inicio, concluo ou reporto falha, então o local fica registrado no histórico.

**US06 — Ser avisado de coleta nova**
Como **motorista**, quero receber um aviso no celular, mesmo com o app fechado, quando o escritório me passar uma coleta ou cancelar uma.

- Dado que ativei os avisos, quando o gestor cria uma ordem para mim, então recebo "Nova coleta para você" com o cliente e o endereço.
- Dado que uma coleta minha é cancelada, então recebo o aviso com o motivo.

> Testes: `api.e2e-spec.ts` (RF03, RF04, localização, notificações), `transicoes.spec.ts`, `frontend/src/paginas/motorista/MinhasColetas.test.tsx`

## Exceções e rastreabilidade (RF04, RF05)

**US07 — Reportar falha na coleta**
Como **motorista**, quero informar por que não consegui fazer a coleta, para o gestor decidir o que fazer.

- Dado uma coleta em andamento, quando reporto falha sem motivo, então o sistema recusa.
- Dado os motivos mais comuns, quando abro o formulário, então posso escolher um com um toque.

**US08 — Cancelar uma ordem**
Como **gestor**, quero cancelar uma ordem informando o motivo, quando o cliente desistir.

- Dado que sou motorista, quando tento cancelar, então o sistema não permite.
- Dado uma ordem concluída, quando tento cancelá-la, então o sistema recusa, pois o estado é final.

**US09 — Consultar o histórico da ordem**
Como **gestor**, quero ver quem alterou cada ordem, quando e por quê.

- Dado qualquer mudança de status, quando abro a ordem, então vejo data, hora, usuário, status anterior e novo, e o motivo quando houver.

> Testes: `api.e2e-spec.ts` (RF04), `ordens.service.spec.ts`, `componentes.test.tsx` (DialogoMotivo)

## Painel e acompanhamento (RF06, RF11)

**US10 — Acompanhar o dia**
Como **gestor**, quero ver no painel quantas coletas estão aguardando, em andamento, concluídas, com falha ou canceladas, atualizado sozinho.

- Dado o painel aberto, quando um motorista conclui uma coleta, então os números se atualizam em até 15 segundos.

**US11 — Saber onde o motorista está**
Como **gestor**, quero ver no mapa onde está cada motorista em coleta, sem precisar perguntar no grupo.

- Dado uma coleta em andamento, quando abro o painel, então vejo o motorista no mapa e há quanto tempo veio a última posição.
- Dado que o motorista não tem coleta em andamento, então a posição dele não é coletada nem exibida.

**US12 — Consultar a corrida concluída**
Como **gestor**, quero ver o trajeto, a distância e o tempo de cada coleta concluída.

- Dado uma coleta concluída com posições registradas, quando abro a ordem, então vejo o trajeto no mapa, a duração e a distância percorrida.
- Dado que o celular ficou sem GPS, então a ordem informa que não há trajeto registrado.

**US13 — Compartilhar a posição com transparência**
Como **motorista**, quero saber quando minha localização está sendo compartilhada.

- Dado uma coleta em andamento, então o app mostra "Compartilhando sua localização com o gestor".
- Dado que concluo a coleta, então o compartilhamento termina sozinho.

> Testes: `api.e2e-spec.ts` (painel, RF11), `rastreamento.service.spec.ts`, `trajeto.spec.ts`, `useRastreamento.test.ts`, `frontend/src/paginas/gestor/rastreamento.test.tsx`

## Inteligência (RF09)

**US14 — Não esquecer o cliente que pede sempre**
Como **gestor**, quero ser avisado quando um cliente que costuma pedir coleta ainda não pediu, para oferecer a coleta antes que ele procure outra empresa.

- Dado um cliente com coletas semanais às segundas, quando chega a semana sem pedido, então ele aparece nos alertas como coleta prevista ou atrasada.
- Dado um cliente com menos de três coletas, então o sistema não arrisca previsão.
- Dado um alerta, quando clico em criar ordem, então o formulário abre com o cliente e a data já preenchidos.

**US15 — Entender a tendência de peso**
Como **gestor**, quero saber se o volume de cada cliente está crescendo ou caindo, para planejar o caminhão certo.

- Dado pesos estimados que crescem de forma consistente, então o cliente aparece com tendência de alta, junto com a variação mensal.

> Testes: `analise.spec.ts`, `inteligencia.service.spec.ts`, `api.e2e-spec.ts` (inteligência), `NovaOrdem.test.tsx`

## Coleta disponível (RF12)

Hoje, quando o gestor não sabe quem está livre, ele manda a coleta no grupo dos motoristas e espera alguém responder. As duas histórias abaixo trazem esse costume para o sistema, sem o risco de dois motoristas irem ao mesmo cliente.

**US16 — Oferecer a coleta para quem estiver livre**
Como **gestor**, quero publicar uma coleta sem escolher o motorista, para que quem estiver livre a pegue, como faço hoje no grupo do WhatsApp.

- Dado que escolho "Disponibilizar para os motoristas", quando salvo, então a ordem fica disponível, sem motorista e sem veículo, e todos os motoristas ativos recebem o aviso "Coleta disponível: quem pega?".
- Dado que informo só o motorista ou só o veículo, quando salvo, então o sistema recusa.
- Dado uma coleta que ninguém aceitou, quando eu a cancelo com motivo, então ela some da lista dos motoristas.

**US17 — Pegar uma coleta disponível**
Como **motorista**, quero ver as coletas disponíveis e aceitar uma, escolhendo o veículo, para assumir o serviço pelo celular.

- Dado coletas disponíveis de hoje em diante, quando abro o app, então vejo cada uma com o cliente, o endereço, o dia e o peso estimado.
- Dado que aceito com um veículo ativo, então a coleta passa a ser minha, com o status aguardando, e o histórico registra que fui eu que aceitei.
- Dado que outro motorista aceitou antes, quando confirmo, então o app avisa que a coleta já foi aceita e não deixa tentar de novo.
- Dado que dois motoristas aceitam no mesmo instante, então só um fica com a coleta.

> Testes: `api.e2e-spec.ts` (RF12, incluindo dois motoristas aceitando ao mesmo tempo), `ordens.service.spec.ts`, `transicoes.spec.ts`, `notificacoes.service.spec.ts`, `frontend/src/paginas/motorista/ColetasDisponiveis.test.tsx`, `NovaOrdem.test.tsx`

## Melhorias pedidas pelo gestor (RF08, RF09, RF13 a RF15)

Definidas com o gestor da Edepel na validação de 05/11/2026 ([relatório](validacao/relatorio-validacao.md)).

**US18 — Corrigir uma ordem de coleta**
Como **gestor**, quero editar uma ordem depois de criada, para corrigir data, endereço ou motorista sem cancelar e criar outra.

- Dado uma ordem aguardando, quando troco o motorista, então ela sai da lista de quem a tinha, entra na do novo, os dois são avisados e o histórico registra a edição.
- Dado uma ordem aguardando, quando tiro o motorista e o caminhão, então ela volta a ficar disponível para todos.
- Dado uma coleta em andamento, quando tento mudar a data, então o sistema recusa; as observações podem ser alteradas.
- Dado uma coleta finalizada, então ela não pode ser editada.

**US19 — Já vir com o caminhão do motorista**
Como **gestor**, quero que, ao escolher o motorista, o caminhão que ele costuma usar já venha preenchido, mas que eu possa trocar naquela ordem.

- Dado um motorista com caminhão padrão, quando o escolho na ordem, então o caminhão dele é preenchido e a tela indica que é o padrão.
- Dado que troco o caminhão, então a ordem fica com o que escolhi.

**US20 — Registrar o peso da balança**
Como **gestor**, quero registrar o peso medido na balança depois da coleta, porque o motorista vai ao cliente sem saber quanto vai coletar.

- Dado uma coleta concluída, quando registro o peso, então ele aparece na ordem, fica no histórico e passa a contar no dashboard e no relatório.
- Dado uma coleta que ainda não foi concluída, então o sistema recusa o peso.

**US21 — Acompanhar o período no dashboard**
Como **gestor**, quero ver quanto foi coletado, quais clientes mais pedem e quanto cada motorista trabalhou no período, para planejar a operação.

- Dado um período, então vejo o total de coletas, o peso da balança, a distância percorrida e o tempo médio, e quantas concluídas ainda esperam pesagem.
- Dado o período, então vejo o peso por dia (ou por mês, em períodos longos), o ranking de clientes e uma tabela por motorista.
- Os alertas de coletas esperadas e os padrões de pedidos continuam na mesma tela.

**US22 — Baixar o relatório do mês**
Como **gestor**, quero baixar uma planilha das coletas do período, para guardar, conferir e mandar aos clientes.

- Dado um período e filtros por motorista, cliente e status, quando baixo, então recebo uma planilha que abre no Excel com uma linha por coleta.
- Dado que não há coletas com esses filtros, então o sistema avisa e não baixa nada.
- Um texto digitado que começa como fórmula não é executado ao abrir no Excel.

> Testes: `api.e2e-spec.ts` (RF13, RF08, RF14, RF09 e RF15), `ordens.service.spec.ts`, `indicadores.spec.ts`, `relatorios.service.spec.ts`, `motoristas.service.spec.ts`, `frontend/src/paginas/gestor/EditarOrdem.test.tsx`, `DetalheOrdem.test.tsx`, `Dashboard.test.tsx`, `Relatorios.test.tsx`, `Cadastros.test.tsx`, `frontend/src/util/planilha.test.ts`
