# Acessibilidade — SIGCF

A WCAG 2.1 é norma "Core" do playbook. O SIGCF foi auditado nos níveis **A e AA** e corrigido até não restar nenhuma violação nas telas principais.

## Como foi auditado

- **Ferramenta:** [axe-core](https://github.com/dequelabs/axe-core) 4.10, o mesmo motor da auditoria de acessibilidade do Lighthouse, executado no navegador sobre a aplicação real.
- **Critérios:** regras das tags `wcag2a`, `wcag2aa`, `wcag21a` e `wcag21aa`, mais as boas práticas do axe.
- **Telas:** login; painel do dia; lista de ordens; nova ordem; detalhe da ordem com trajeto; inteligência; cadastros de motoristas, veículos e clientes; tela do motorista; diálogo de reportar falha.
- **Larguras:** 1280 px (gestor, no computador) e 375 px (motorista, no celular).

## O que foi encontrado e corrigido

| Problema | Critério WCAG | Onde | Correção |
|---|---|---|---|
| Texto secundário com contraste de 3,1 a 3,4:1 | 1.4.3 Contraste (mínimo de 4,5:1) | Abas inativas dos cadastros, horários do histórico e outros textos discretos | Cor `--texto-fraco` de #8b8b93 para #6b6b73 (4,9:1 sobre o fundo e 5,3:1 sobre branco) |
| Botão "Concluir coleta" com contraste de 3,3:1 | 1.4.3 | Tela do motorista | Fundo verde mais escuro (#15803d), com contraste acima de 5:1 |
| Cartões de coletas finalizadas com o conteúdo esmaecido por transparência | 1.4.3 | Tela do motorista | Os cartões ficam discretos pelo fundo, sem transparência |
| Tabelas com rolagem horizontal que não podiam ser roladas pelo teclado | 2.1.1 Teclado | Ordens, cadastros e inteligência | As áreas de rolagem recebem foco e um rótulo para leitores de tela |
| Foco automático em campos ao abrir telas | Boa prática ligada a 2.4.3 Ordem do foco | Login e diálogo de motivo | Removido; o diálogo usa o foco padrão do `<dialog>` |
| Diálogos com o mesmo `id` no título, anunciados com o nome errado | 4.1.2 Nome, função e valor | Tela do motorista | Cada diálogo gera um `id` próprio (`useId`) |

**Resultado:** nenhuma violação nas telas e larguras auditadas.

## O que já atendia

- Todos os campos de formulário têm rótulo visível associado (`<label>`), e as mensagens de erro usam `role="alert"`.
- Foco visível em todos os elementos interativos (`:focus-visible` com anel de destaque).
- Ícones decorativos ocultos dos leitores de tela (`aria-hidden`), e botões só com ícone têm `aria-label`.
- Estados de carregamento anunciados com `role="status"`, e o progresso do dia com `role="progressbar"`.
- O idioma da página é declarado (`lang="pt-BR"`), e o zoom do navegador não é bloqueado.
- A animação do indicador "ao vivo" respeita a preferência de movimento reduzido.

## Testes automáticos

O arquivo [`frontend/src/acessibilidade.test.tsx`](../frontend/src/acessibilidade.test.tsx) roda o axe a cada execução do CI sobre a tela de login, o painel, a nova ordem, a tela do motorista e o diálogo de falha. Uma violação nova faz o build falhar.

O contraste de cores depende do layout renderizado, que o ambiente de testes (jsdom) não tem. Por isso esse critério fica de fora dos testes automáticos e é verificado na auditoria no navegador, a ser repetida a cada mudança visual relevante.

## Limitações

- **Mapas:** o mapa do Leaflet é um complemento visual. As mesmas informações aparecem em texto ao lado (lista de motoristas em rota, duração, distância e horários do trajeto).
- **Leitores de tela:** a auditoria automática não substitui o teste com um leitor de tela real (NVDA ou TalkBack), que fica recomendado para a validação com usuários.
