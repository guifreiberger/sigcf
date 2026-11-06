# Requisitos — SIGCF

Requisitos do Sistema Inteligente de Gestão de Coleta e Frota, construído para a rotina de uma empresa de coleta de recicláveis de Jaraguá do Sul/SC. Hoje o pedido chega por telefone ou WhatsApp, o atendente repassa no grupo dos motoristas e alguém responde que vai buscar. O sistema substitui esse fluxo informal por ordens de coleta rastreáveis.

As user stories e os critérios de aceite de cada requisito estão em [`user-stories.md`](user-stories.md).

## Requisitos funcionais

| ID | Requisito | Descrição |
|---|---|---|
| RF01 | Cadastros | Manter veículos (placa, modelo, capacidade), motoristas (nome, e-mail, telefone, CNH opcional) e clientes (nome, telefone opcional, endereço), com ativação e desativação sem apagar o histórico |
| RF02 | Ordem de coleta | O gestor cria a ordem ligando um cliente, um veículo ativo e um motorista ativo, com data, endereço (sugerido a partir do cliente) e observações, ou a disponibiliza sem motorista (RF12) |
| RF03 | Coletas do motorista | O motorista vê apenas as próprias coletas do dia |
| RF04 | Ciclo de status | Aguardando → Em andamento → Concluída ou Falha; uma coleta disponível passa a Aguardando quando um motorista a aceita; cancelamento só pelo gestor; motivo obrigatório em falha e cancelamento |
| RF05 | Rastreabilidade | Cada mudança de status registra data, hora, usuário, status anterior, novo status e motivo |
| RF06 | Painel do dia | O gestor vê a quantidade de coletas do dia por status, atualizada automaticamente, e a lista com os responsáveis |
| RF07 | Localização nas ações | A localização do motorista é registrada quando ele inicia, conclui ou reporta falha, e o gestor a vê no histórico |
| RF08 | Peso estimado e peso da balança | O atendente pode registrar, ao criar a ordem, o peso estimado pelo cliente; depois da coleta, o gestor registra o peso medido na balança, que é o usado no dashboard e no relatório |
| RF09 | Dashboard e inteligência | Mostrar ao gestor, para o período escolhido, o peso coletado na balança, os clientes que mais pedem coletas e as coletas, falhas, quilômetros e tempo médio de cada motorista; e, a partir do histórico, identificar o padrão de cada cliente, prever a próxima coleta, acompanhar a tendência de peso e alertar coletas esperadas ainda não pedidas, sem APIs externas de IA |
| RF10 | Aviso no celular | Notificar o motorista, mesmo com o app fechado, quando receber uma coleta, tiver uma cancelada ou houver uma coleta disponível para aceitar |
| RF11 | Trajeto da coleta | Enquanto a coleta está em andamento, o gestor acompanha a posição do motorista; ao final, ficam salvos o trajeto, a distância e a duração da corrida. No app Android, o trajeto segue com a tela apagada ou com o motorista em outros apps |
| RF12 | Coleta disponível | O gestor publica a coleta sem motorista; todos os motoristas são avisados e o primeiro que aceitar fica com ela, escolhendo o veículo. Se dois aceitarem ao mesmo tempo, só um consegue |
| RF13 | Edição de ordens | O gestor edita a ordem antes de o motorista iniciar (cliente, endereço, data, peso estimado, observações, motorista e caminhão); em andamento, só as observações; finalizada, só o peso da balança. A troca de motorista avisa quem perdeu e quem ganhou a coleta, e toda edição fica no histórico |
| RF14 | Caminhão padrão | Cada motorista pode ter um caminhão padrão, que vem preenchido ao criar ou editar uma ordem para ele e pode ser trocado |
| RF15 | Relatório de coletas | O gestor baixa uma planilha das coletas do período, filtrada por motorista, cliente e status, com peso da balança, distância, tempo, status, motorista e caminhão |

## Requisitos não funcionais

| ID | Requisito | Como é atendido |
|---|---|---|
| RNF01 | Interface web responsiva | SPA em React, *mobile-first* na tela do motorista, instalável como PWA; no Android, o mesmo frontend também é distribuído como app (Capacitor), para o trajeto continuar com a tela apagada ([ADR 0009](adr/0009-app-android-com-capacitor.md)) |
| RNF02 | API em camadas | NestJS com Controller, Service e Repository (TypeORM) |
| RNF03 | Banco relacional | MySQL 8 com InnoDB; mudança de status e histórico gravados na mesma transação |
| RNF04 | Autenticação e autorização | JWT *stateless* com perfis gestor e motorista |
| RNF05 | Privacidade | Só os dados necessários à operação; localização contínua apenas durante a coleta em andamento (ver [`rastreamento.md`](rastreamento.md)) |
| RNF06 | Conteinerização | Docker e Docker Compose em desenvolvimento e implantação |
| RNF07 | Desempenho | Respostas da API abaixo de 300 ms (ver [`desempenho.md`](desempenho.md)) |

## Fluxos de negócio

O playbook pede ao menos três fluxos de negócio completos. O SIGCF tem sete, todos cobertos por testes automatizados: os testes e2e da API percorrem as regras de cada fluxo, e os testes das telas cobrem a interação do usuário.

| Fluxo | Do início ao fim | Requisitos |
|---|---|---|
| **1. Atendimento de um pedido de coleta** | Cliente pede → gestor cria a ordem → motorista recebe o aviso → vê a coleta no celular → inicia (posição compartilhada) → conclui → gestor acompanha no painel e no histórico | RF02, RF03, RF04, RF05, RF06, RF07, RF10, RF11 |
| **2. Tratamento de exceções** | Motorista reporta falha com motivo, ou gestor cancela com motivo → motorista é avisado do cancelamento → histórico registra quem, quando e por quê | RF04, RF05, RF10 |
| **3. Antecipação de pedidos** | Sistema identifica o padrão do cliente → alerta a coleta esperada e não pedida → gestor cria a ordem já preenchida a partir do alerta | RF08, RF09, RF02 |
| **4. Gestão da frota e da carteira** | Gestor cadastra, edita e desativa veículos, motoristas e clientes; itens inativos deixam de aparecer na criação de ordens, mas o histórico é preservado | RF01 |
| **5. Acompanhamento da corrida** | Motorista inicia → gestor vê no mapa onde ele está → motorista conclui → trajeto, distância e duração ficam salvos na ordem | RF11 |
| **6. Coleta disponível, quem pega?** | Gestor publica a coleta sem motorista → todos os motoristas recebem o aviso → o primeiro que aceita escolhe o veículo e fica com ela → os demais veem que ela já foi aceita | RF12, RF10, RF04 |
| **7. Fechamento do período** | Motorista conclui → carga é pesada na balança → gestor registra o peso na ordem → acompanha o período no dashboard → baixa a planilha do mês | RF08, RF09, RF15 |

## Fora do escopo

Rastreamento fora das coletas ou com o app fechado, roteirização automática, módulos financeiros ou fiscais (NF-e, CT-e), integração com ERPs e aplicativo mobile nativo.
