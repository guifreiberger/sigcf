# SIGCF - Sistema Inteligente de Gestão de Coleta e Frota

> **Digitalizando a gestão logística de Pequenas e Médias Empresas (PMEs).**

Projeto de Produto Mínimo Viável (MVP) desenvolvido para o PAC VIII do curso de Engenharia de Software da Católica SC.

---

## Sobre o Projeto

O SIGCF nasceu de uma dor real do mercado logístico: o caos operacional no controle de coletas em PMEs. Atualmente, muitas transportadoras dependem de papel, planilhas desconexas e grupos de WhatsApp para gerenciar rotas e cargas. Isso gera perda de histórico, atrasos na resolução de problemas e altos índices de erro humano.

A solução é uma aplicação web única e responsiva, que atende dois perfis distintos sobre a mesma API:

1. **Painel do Gestor (desktop):** Interface para controle da frota, cadastro de entidades, emissão e acompanhamento de ordens de coleta.
2. **Visão do Motorista (celular):** Interface enxuta, instalável como PWA, focada em consultar as coletas do dia e atualizar o status em campo.

## Diferenciais

* **Acessibilidade e Usabilidade:** Curva de aprendizado mínima para rápida adoção da equipe.
* **Zero Custo de Hardware:** Elimina a necessidade de telemetria cara, utilizando apenas computadores e smartphones já disponíveis.
* **Zero Atrito de Instalação:** O motorista acessa por link — o mesmo canal (WhatsApp) que o sistema vem substituir — sem loja de aplicativos ou APK.
* **Perfis Segregados:** Experiência de usuário (UX) otimizada especificamente para quem gere e para quem executa.
* **Dados Estruturados:** Centralização e organização da operação primária, preparando a base da empresa para futuras aplicações de Business Intelligence (BI).

## Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| Back-end | Node.js + NestJS + TypeORM |
| Front-end | React (Vite) |
| Banco de Dados | MySQL 8 |
| Autenticação | JWT (stateless) |
| Infraestrutura | Docker & Docker Compose |

## Estrutura do Repositório

O projeto está organizado no formato de monorepo:

* `/backend`: API REST em NestJS.
* `/frontend`: Aplicação React responsiva, atendendo gestor e motorista via rotas por perfil.

## Como Executar Localmente

### Pré-requisitos

* [Docker](https://www.docker.com/) e Docker Compose instalados.
* [Node.js](https://nodejs.org/) 20 ou superior.

Não é necessário instalar o MySQL: ele sobe em container.

### Passos

**1. Clone o repositório**

```bash
git clone https://github.com/guifreiberger/sigcf.git
cd sigcf
```

**2. Suba o banco de dados**

```bash
cp .env.example .env
docker compose up -d
```

Isso inicia o MySQL na porta `3307` do host (para não colidir com um MySQL local na `3306`) e o Adminer em `http://localhost:8080`, onde é possível inspecionar as tabelas pelo navegador.

**3. Configure e rode o back-end**

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run start:dev
```

O `seed` aplica as migrations e cria dados de demonstração (um gestor, dois motoristas, veículos, clientes e ordens do dia). Os e-mails e a senha desses usuários estão em `backend/.env.example`. Como as coletas de demonstração são criadas para a data atual, use `npm run seed:recriar` para apagar e recriar a base em outro dia (bloqueado em produção). A API sobe em `http://localhost:3000/api`; os endpoints estão descritos em [`docs/api.md`](docs/api.md).

**4. Rode o front-end**

```bash
cd frontend
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

### Sistema completo em containers

Para rodar backend, frontend e banco inteiramente em Docker, sem Node.js instalado, como seria em um servidor:

```bash
cp .env.example .env
docker compose --profile app up -d --build
docker compose exec backend node dist/database/seed.js
```

A aplicação fica disponível em `http://localhost:8000`. O nginx serve o frontend e encaminha `/api` para o backend, que não fica exposto diretamente. Antes de qualquer deploy real, troque o `JWT_SECRET` e as senhas do `.env`.

### Testar no celular (link HTTPS temporário)

Para abrir o sistema em qualquer celular, mesmo fora da sua rede, suba os containers junto com o túnel do Cloudflare:

```bash
docker compose --profile app --profile tunel up -d --build
docker logs sigcf-tunel
```

Nos logs aparece um endereço `https://….trycloudflare.com`: abra-o no celular. Por ser HTTPS, o navegador oferece a opção de instalar o SIGCF na tela inicial (PWA). O endereço muda sempre que o túnel é reiniciado e para de funcionar quando ele é desligado com `docker stop sigcf-tunel`.

Enquanto o túnel estiver ligado, o sistema fica acessível pela internet. Antes de ligá-lo, troque `JWT_SECRET` e `SEED_SENHA` no `.env` (nunca no `.env.example`, que é público) e recrie os usuários com a nova senha:

```bash
docker compose exec -e NODE_ENV=development backend node dist/database/seed.js --recriar
```

## Testes

```bash
cd backend
npm test            # unitários (máquina de estados do RF04)
npm run test:e2e    # ponta a ponta, contra o banco sigcf_test
```

Os testes e2e recriam o schema do banco `sigcf_test` a cada execução e se recusam a rodar em qualquer outro banco, preservando os dados de desenvolvimento.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/der.md`](docs/der.md) | Modelo de dados, decisões de modelagem e máquina de estados da ordem |
| [`docs/api.md`](docs/api.md) | Endpoints da API, perfis de acesso e códigos de erro |
| [`docs/desempenho.md`](docs/desempenho.md) | Medição do requisito de 300 ms e teste de volume com 200 mil ordens |
| [`docs/validacao/`](docs/validacao) | Roteiro de entrevista, questionário e protocolo de teste de usabilidade (SUS) |
| [`docs/tcc/atualizacoes-proposta.tex`](docs/tcc/atualizacoes-proposta.tex) | Texto em LaTeX com RFs e RNFs atualizados para a proposta |

## Escopo do MVP

Fazem parte da entrega: cadastro de veículos, motoristas e clientes; criação e delegação de ordens de coleta; visão do motorista com as coletas do dia; atualização de status com histórico rastreável; e registro da localização do motorista no momento em que ele inicia, conclui ou reporta falha em uma coleta.

Estão **fora do escopo** desta versão: rastreamento por GPS em tempo real, roteirização automática, módulos financeiros ou fiscais (NF-e/CT-e), integração com ERPs de terceiros e aplicativo mobile nativo.
