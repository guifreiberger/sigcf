# Segurança — SIGCF

Medidas adotadas, organizadas pelas categorias do [OWASP Top 10 (2021)](https://owasp.org/Top10/), com o arquivo onde cada uma está implementada.

| Categoria OWASP | Risco no SIGCF | Medida | Onde |
|---|---|---|---|
| **A01 — Controle de acesso** | Motorista ver ou alterar coletas de outro; motorista acessar telas do gestor | Guard global exige token em todas as rotas, exceto as marcadas como públicas (login e health check). Cada rota declara os perfis aceitos. O motorista só enxerga as próprias ordens: as dos outros respondem 404, sem revelar que existem. Pontos de trajeto só são aceitos para as coletas em andamento do próprio motorista | [`auth.guard.ts`](../backend/src/auth/auth.guard.ts), [`ordens.service.ts`](../backend/src/ordens/ordens.service.ts) (`podeVer`), [`rastreamento.service.ts`](../backend/src/rastreamento/rastreamento.service.ts) |
| **A02 — Falhas criptográficas** | Vazamento de senhas; tokens forjados | Senhas guardadas com bcrypt (custo 10), nunca devolvidas pela API. Tokens JWT assinados com segredo que, em produção, precisa ter 32 caracteres ou mais e não pode ser o valor de exemplo. HTTPS no túnel e na nuvem, com HSTS | [`motoristas.service.ts`](../backend/src/motoristas/motoristas.service.ts), [`segredo-jwt.ts`](../backend/src/auth/segredo-jwt.ts), [`seguranca.conf`](../frontend/seguranca.conf) |
| **A03 — Injeção** | SQL injection; XSS | Todas as consultas passam pelo TypeORM, que usa parâmetros em vez de concatenar texto. Toda entrada é validada por DTOs (`class-validator`), e campos desconhecidos são recusados. O React escapa o conteúdo exibido, e a política de conteúdo (CSP) só permite scripts do próprio site | [`app.setup.ts`](../backend/src/app.setup.ts), DTOs em `backend/src/**/dto`, [`seguranca.conf`](../frontend/seguranca.conf) |
| **A04 — Design inseguro** | Pular etapas do fluxo pela API, mesmo com a tela bloqueando | A máquina de estados da ordem roda no backend; o frontend só exibe os botões das transições que o backend informa como permitidas | [`transicoes.ts`](../backend/src/ordens/transicoes.ts) |
| **A05 — Configuração incorreta** | Cabeçalhos ausentes; segredos no repositório; versão do servidor exposta | `helmet` na API e cabeçalhos próprios no nginx (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS), sem `X-Powered-By` e sem a versão do nginx. CORS desligado, porque o frontend e a API ficam na mesma origem. Segredos só em variáveis de ambiente, com `.env` no `.gitignore`. O seed destrutivo é bloqueado em produção. Os containers rodam sem usuário root: a API como `node` e o nginx pela imagem oficial sem privilégios | [`app.setup.ts`](../backend/src/app.setup.ts), [`nginx.conf`](../frontend/nginx.conf), [`seed.ts`](../backend/src/database/seed.ts), [`backend/Dockerfile`](../backend/Dockerfile), [`frontend/Dockerfile`](../frontend/Dockerfile) |
| **A06 — Componentes vulneráveis** | Dependência com falha conhecida | `npm audit` sem vulnerabilidades nas dependências de produção dos dois projetos. Restam alertas moderados apenas em ferramentas de build (`@nestjs/cli` e `vite-plugin-pwa`), que não entram nas imagens de produção | `package.json` de cada projeto |
| **A07 — Falhas de autenticação** | Força bruta na senha; enumeração de usuários | Até 5 tentativas de login por minuto para cada combinação de IP e e-mail, sem bloquear colegas que entram pela mesma rede. A mensagem de erro é a mesma para e-mail inexistente, senha errada e usuário desativado. Tokens expiram em 8 horas | [`limite-de-login.guard.ts`](../backend/src/auth/limite-de-login.guard.ts), [`auth.service.ts`](../backend/src/auth/auth.service.ts) |
| **A08 — Integridade de software e dados** | Build com dependências diferentes das testadas; schema alterado à mão | `npm ci` com lockfile no CI e nas imagens. O schema do banco só muda por migrations versionadas | [`ci.yml`](../.github/workflows/ci.yml), `backend/src/database/migrations` |
| **A09 — Registro e monitoramento** | Falha em produção passar despercebida | Logs do NestJS na saída padrão do container e health check que consulta o banco. A observabilidade na nuvem entra com o deploy | [`health.controller.ts`](../backend/src/health.controller.ts) |
| **A10 — SSRF** | Usar o servidor para fazer requisições a endereços internos | O endereço de inscrição de push só é aceito se for HTTPS de um dos serviços de push dos navegadores | [`inscricao-push.dto.ts`](../backend/src/notificacoes/dto/inscricao-push.dto.ts) |

Cada medida tem teste automatizado: os unitários cobrem regras e validações, e o e2e (`backend/test/api.e2e-spec.ts`) confere cabeçalhos, permissões por perfil, bloqueio de login e a recusa de endereços de push.

## Dados pessoais (LGPD)

O sistema trata só o necessário à operação: nome, e-mail, telefone, CNH opcional e a localização do motorista durante as coletas. Não há dados financeiros nem sensíveis. As regras da localização estão em [`rastreamento.md`](rastreamento.md).

## Limitações conhecidas

- **Token de usuário desativado:** o token é verificado pela assinatura, sem consultar o banco a cada requisição. Um motorista desativado continua com acesso até o token expirar (no máximo 8 horas). Se isso for crítico para a empresa, a saída é reduzir a validade do token ou consultar o status do usuário no guard.
- **Limite de login em memória:** a contagem de tentativas fica na memória da instância. Com mais de uma réplica da API, cada uma conta separadamente; nesse cenário, a contagem passaria para um armazenamento compartilhado, como o Redis.

## Decisões de infraestrutura

A análise estática (SonarCloud) aponta três pontos no Terraform que foram avaliados e mantidos de propósito. Eles ficam registrados como exceções no [`sonar-project.properties`](../sonar-project.properties), sempre restritas ao arquivo `infra/base/main.tf`:

| Apontamento | Por que foi mantido | Evolução possível |
|---|---|---|
| MySQL com acesso pela rede pública (`terraform:S6329`) | O firewall só aceita conexões vindas de serviços do Azure, toda conexão exige TLS e a senha é gerada pelo Terraform, sem ser exposta. Rede privada exigiria integrar o ambiente de containers a uma rede virtual, com custo e complexidade fora do orçamento do TCC | Rede virtual com *private endpoint* para o banco |
| MySQL sem identidade gerenciada (`terraform:S6378`) | A identidade no servidor MySQL só é necessária para criptografar com chave própria ou para autenticar pelo Entra ID. A API se conecta com usuário e senha guardados como *secret* do Container Apps | Autenticação da API no banco pelo Entra ID |
| Papel Contributor para a identidade de implantação (`terraform:S6381`) | O papel vale só para o grupo de recursos `rg-sigcf`, e a identidade só pode ser usada por jobs dos ambientes `homologacao` e `producao` do GitHub; a produção ainda exige aprovação manual | Trocar por papéis mais restritos (Container Apps, monitoramento e operador de identidade) |
