# ADR 0007 — Notificações com Web Push e chaves VAPID próprias

**Status:** aceita · **Data:** 27/09/2026

## Contexto

Hoje o motorista fica sabendo de uma coleta nova pelo grupo do WhatsApp. Para substituir esse aviso, o sistema precisa notificar o celular mesmo com o app fechado (RF10), sem depender de app nativo ([ADR 0002](0002-pwa-react-para-o-motorista.md)).

## Decisão

Uso do padrão aberto **Web Push** (RFCs 8030, 8291 e 8292), com a biblioteca `web-push`. O servidor gera o próprio par de chaves **VAPID** para se identificar; o service worker do PWA recebe e exibe os avisos. O envio é desacoplado por uma abstração (`EnviadorPush`), substituída por uma versão falsa nos testes e2e.

## Alternativas consideradas

- **Firebase Cloud Messaging com SDK:** exige conta e chave no Google, além de uma dependência a mais no frontend.
- **SMS ou WhatsApp Business API:** custo por mensagem e cadastro em serviços comerciais.
- **Consulta periódica com o app aberto:** não avisa com o app fechado, que é justamente o caso de uso.

## Consequências

- Não há conta nem chave em serviços de terceiros, e o conteúdo do aviso é criptografado até o aparelho.
- A falha de um aviso nunca desfaz a operação que o originou (criar ou cancelar a ordem).
- Inscrições expiradas são apagadas quando o serviço de push informa 404 ou 410.
- Só são aceitos endereços dos serviços de push dos navegadores, o que impede o servidor de ser usado para requisições a endereços arbitrários (SSRF).
- No iPhone, o motorista precisa adicionar o app à Tela de Início para receber avisos.
