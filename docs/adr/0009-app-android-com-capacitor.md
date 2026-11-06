# ADR 0009 — App Android com Capacitor para o trajeto em segundo plano

**Status:** aceita · **Data:** 05/11/2026 · **Substitui em parte:** [ADR 0002](0002-pwa-react-para-o-motorista.md), para o motorista que usa Android, e a limitação aceita no [ADR 0008](0008-rastreamento-pelo-navegador.md)

## Contexto

No teste de campo de 05/11/2026, o celular de um motorista (Android, Chrome) parou de enviar posições quando a tela apagou e o app foi para segundo plano. A coleta ficou sem nenhum ponto de trajeto, e a tela continuava dizendo que a localização estava sendo compartilhada. A recuperação do GPS ao voltar para o app resolveu o caso em que ele parava de vez, mas não o problema de fundo: nenhum navegador permite ler o GPS em segundo plano.

Exigir o app aberto com a tela ligada durante toda a coleta deixa o celular inutilizável: o motorista usa o Waze ou o Google Maps para chegar ao cliente, atende ligações e responde mensagens. O gestor precisa do caminho inteiro da corrida, e não de um registro com lacunas.

## Decisão

- **Empacotar o mesmo frontend em um app Android com o [Capacitor](https://capacitorjs.com/) 8**, na pasta `frontend/android`. Nenhuma tela foi reescrita: o código identifica que roda no app com `ehAppNativo()` e troca apenas o que o navegador não consegue fazer.
- **GPS em segundo plano** com o plugin `@capacitor-community/background-geolocation`. Ele usa um serviço em primeiro plano do Android, com uma notificação fixa enquanto a coleta está em andamento. O serviço liga quando o motorista inicia a coleta e desliga quando ela é concluída, reportada como falha ou cancelada pelo gestor.
- **HTTP nativo no app** (`CapacitorHttp`): depois de alguns minutos em segundo plano, o Android limita a internet da WebView. Pelo mesmo motivo, o envio das posições parte da própria leitura do GPS, e não de um temporizador da tela, que o Android congela.
- **Avisos pelo Firebase Cloud Messaging**, porque o Web Push do navegador não funciona dentro do app. O navegador continua recebendo os avisos pelo Web Push ([ADR 0007](0007-notificacoes-web-push.md)).
- **Dois apps instaláveis lado a lado**, homologação e produção, cada um com o endereço da API do seu ambiente. A distribuição é por arquivo APK, sem loja.

## Alternativas consideradas

- **Continuar só no navegador:** trajeto com lacunas e celular preso ao SIGCF durante a coleta. Descartada depois do teste de campo.
- **App nativo em Kotlin, Flutter ou React Native:** resolveria o problema, mas exigiria reescrever as telas e manter uma segunda base de código num projeto individual.
- **Trusted Web Activity (o PWA aberto pelo Chrome como app):** mantém as limitações do navegador para o GPS.
- **Plugin comercial de geolocalização (Transistorsoft):** mais recursos, mas com licença paga para gerar a versão final do app.

## Consequências

- O gestor vê o trajeto completo, mesmo com o motorista usando outros apps ou com a tela apagada.
- **Só Android.** Quem usa iPhone continua no navegador, com as limitações do ADR 0008: publicar para iPhone exige um Mac e a conta paga de desenvolvedor da Apple.
- **Instalação por APK:** o motorista precisa liberar a instalação daquela fonte uma vez. A Play Store fica fora do plano, porque exige uma revisão específica para apps com localização em segundo plano.
- **Nova dependência externa:** o Firebase (plano gratuito). A chave da conta de serviço é um segredo do ambiente, como as demais.
- **Bateria:** o GPS fica ligado durante a coleta. Alguns fabricantes encerram serviços em segundo plano por conta própria; nesse caso, o SIGCF precisa sair da economia de bateria do celular.
- **Build do app:** exige Java 21 e o Android SDK, descritos em [`deploy.md`](../deploy.md).
- A RNF01 e o RF11 da proposta foram atualizados para incluir o app Android.
