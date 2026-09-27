# API REST — SIGCF

Base: `http://localhost:3000/api`. Exceto `POST /auth/login` e `GET /health`, todas as rotas exigem o cabeçalho `Authorization: Bearer <token>`.

## Autenticação

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | Recebe `{ email, senha }` e devolve `{ accessToken, usuario }` |
| GET | `/auth/me` | qualquer | Dados do usuário autenticado |
| GET | `/health` | público | Verifica API e conexão com o banco |

## Cadastros (RF01)

Mesmo formato para `/motoristas`, `/veiculos` e `/clientes`, todos restritos ao **gestor**.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/{recurso}?ativo=true\|false` | Lista, com filtro opcional por situação |
| GET | `/{recurso}/:id` | Detalhe |
| POST | `/{recurso}` | Cria |
| PATCH | `/{recurso}/:id` | Atualiza parcialmente (inclui `ativo` para reativar) |
| DELETE | `/{recurso}/:id` | Desativa (exclusão lógica), responde 204 |

Campos de criação:

- **motorista:** `nome`, `email`, `senha` (mín. 6), `telefone` (DDD + número), `cnh` (opcional, 11 dígitos)
- **veículo:** `placa` (AAA1234 ou Mercosul AAA1A23; hífen e minúsculas são normalizados), `modelo`, `capacidadeKg`
- **cliente:** `nome`, `endereco`, `telefone` (opcional)

## Ordens de coleta (RF02 a RF04)

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| POST | `/ordens` | gestor | Cria ordem: `clienteId`, `veiculoId`, `motoristaId`, `dataColeta` (AAAA-MM-DD), `enderecoColeta?`, `pesoEstimadoKg?`, `observacao?` |
| GET | `/ordens?data=&status=&motoristaId=&clienteId=` | gestor | Lista com filtros (máx. 200, mais recentes primeiro) |
| GET | `/ordens/resumo?data=` | gestor | Contagem por status do dia (padrão: hoje) |
| GET | `/ordens/minhas?data=` | motorista | Coletas do próprio motorista no dia (padrão: hoje) |
| GET | `/ordens/:id` | ambos | Detalhe com histórico; motorista só acessa as próprias |
| PATCH | `/ordens/:id/status` | ambos | Altera o status: `{ status, motivo?, localizacao? }` |

Toda ordem retornada traz `transicoesPermitidas`: os status para os quais o usuário atual pode movê-la. O frontend usa essa lista para exibir os botões, mantendo a regra de negócio só no backend.

### Localização nas ações do motorista

O campo opcional `localizacao` tem o formato `{ latitude, longitude, precisaoMetros? }`, com latitude entre -90 e 90 e longitude entre -180 e 180. Ela é gravada no registro do histórico criado pela mudança de status, e somente quando a ação é do motorista responsável. Uma localização enviada em ações do gestor é descartada. Sem o campo, a mudança de status é registrada normalmente, com as coordenadas nulas.

## Inteligência

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/inteligencia/clientes` | gestor | Padrão de recorrência, próxima coleta, peso médio e tendência de cada cliente ativo, além dos alertas de coleta esperada |

A resposta traz `alertas` (ordenados do mais atrasado para o mais próximo) e `clientes`, com `recorrencia`, `proximaPrevista`, `proximaAgendada` e `peso`. As regras de cálculo estão em [`inteligencia.md`](inteligencia.md).

## Códigos de erro

| Código | Quando |
|---|---|
| 400 | Dados inválidos, campo desconhecido, coordenadas fora do intervalo ou motivo ausente em falha/cancelamento |
| 401 | Token ausente, inválido ou expirado; credenciais incorretas |
| 403 | Perfil sem permissão (ex.: motorista tentando cancelar) |
| 404 | Recurso inexistente ou ordem de outro motorista |
| 409 | Transição de status inválida; placa ou e-mail duplicado |
| 422 | Regra de negócio: veículo/motorista/cliente inativo, data no passado |
