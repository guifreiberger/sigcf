# SIGCF - Sistema Inteligente de Gestão de Coleta e Frota

> **Digitalizando a gestão logística de Pequenas e Médias Empresas (PMEs).**

Projeto de Produto Mínimo Viável (MVP) desenvolvido para o PAC VIII do curso de Engenharia de Software da Católica SC.

---

## Sobre o Projeto

O SIGCF nasceu de uma dor real do mercado logístico: o caos operacional no controle de coletas em PMEs. Atualmente, muitas transportadoras dependem de papel, planilhas desconexas e grupos de WhatsApp para gerenciar rotas e cargas. Isso gera perda de histórico, atrasos na resolução de problemas e altos índices de erro humano.

A solução é um sistema dividido em dois ambientes integrados:
1. **Painel Web (Gestor):** Interface robusta para controle total da frota, emissão e acompanhamento de ordens de coleta.
2. **App Mobile (Motorista):** Aplicativo intuitivo focado em usabilidade para atualização de status na estrada em tempo real.

## Diferenciais

* **Acessibilidade e Usabilidade:** Curva de aprendizado mínima para rápida adoção da equipe.
* **Zero Custo de Hardware:** Elimina a necessidade de telemetria cara, utilizando apenas computadores e smartphones já disponíveis.
* **Perfis Segregados:** Experiência de usuário (UX) otimizada especificamente para quem gere (Web) e para quem executa (Mobile).
* **Dados Estruturados:** Centralização e organização da operação primária, preparando a base da empresa para futuras aplicações de Business Intelligence (BI).

## Tecnologias Utilizadas

A arquitetura do SIGCF foi pensada para ser moderna, escalável e de fácil manutenção:

* **Back-end:** Node.js
* **Front-end Web:** React
* **Mobile:** Flutter
* **Infraestrutura:** Docker & Docker Compose
* **Banco de Dados:** MySQL

## Estrutura do Repositório

O projeto está organizado no formato de monorepo:

* `/backend`: Contém a API REST construída em Node.js.
* `/frontend`: Contém a interface do gestor logístico construída em React.
* `/mobile`: Contém o aplicativo focado nos motoristas construído em Flutter.

## Como Executar Localmente

### Pré-requisitos
* [Docker](https://www.docker.com/) e Docker Compose instalados.
* [Flutter SDK](https://docs.flutter.dev/get-started/install) instalado para emular o app mobile.

### Passos

1. Clone o repositório:
```bash
   git clone [https://github.com/guifreiberger/sigcf.git](https://github.com/guifreiberger/sigcf.git)
   cd sigcf