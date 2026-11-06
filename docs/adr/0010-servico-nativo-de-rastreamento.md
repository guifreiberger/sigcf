# ADR 0010 — Serviço nativo para gravar e enviar o trajeto no app Android

**Status:** aceita · **Data:** 06/11/2026 · **Substitui em parte:** [ADR 0009](0009-app-android-com-capacitor.md), no GPS em segundo plano

## Contexto

No ADR 0009, o GPS em segundo plano usava o plugin `@capacitor-community/background-geolocation`. Um serviço do Android lia o GPS e entregava cada posição ao JavaScript da tela do app, a WebView. Era o JavaScript que guardava a fila e a enviava ao servidor.

Os testes de campo de 06/11/2026 mostraram que isso só funcionava com o celular carregando:

- **Carregando** (no cabo USB e, de manhã, no carro), o trajeto foi gravado com a tela apagada. Na volta de carro, o envio travou quando o celular trocou o Wi-Fi pelo 4G; isso foi corrigido com tempo-limite nas chamadas e com o servidor gravando cada ponto pelo horário da leitura.
- **Na bateria**, numa volta a pé, o servidor recebeu só as posições do primeiro minuto. Os registros do servidor mostram que o app não fez nenhuma requisição nos 7 minutos seguintes, e a fila estava vazia na hora de concluir: as posições nem chegaram a ser guardadas.

A WebView roda num processo separado do app. O serviço em primeiro plano mantém vivo o processo do app, mas não o da WebView, que o Android congela com a tela apagada e o celular fora da tomada. Como a fila e o envio estavam no JavaScript, nada era guardado nem enviado enquanto a tela ficava apagada.

## Decisão

- **Um serviço em primeiro plano próprio, em Java** ([`frontend/android/app/src/main/java/io/github/guifreiberger/sigcf/rastreamento`](../../frontend/android/app/src/main/java/io/github/guifreiberger/sigcf/rastreamento)). Ele lê o GPS pela localização combinada do Google Play Services, guarda a fila num arquivo do app e envia os lotes direto ao servidor, com o token da sessão e tempo-limite. Nada disso passa pela WebView.
- **Um plugin do próprio app** (`Rastreamento`). A tela o usa só para ligar o serviço ao iniciar a coleta, desligá-lo no fim, consultar o estado (posições aguardando e horário da última leitura) e pedir o envio imediato antes de concluir.
- **As mesmas regras do navegador:** uma leitura a cada 10 s, lotes de até 200, envio a cada 15 s, fila de até cerca de 5 horas sem sinal e descarte quando o servidor responde 409. O que sobrar no fim da coleta é enviado depois, inclusive quando o motorista abre o app outro dia, porque o servidor grava cada ponto pelo horário da leitura.
- Se o Android encerrar o serviço por falta de memória, ele é recriado e continua de onde parou, com a fila salva no aparelho.
- Saem o plugin de terceiros de GPS e o de notificações locais, que só servia a ele.

## Alternativas consideradas

- **Pedir ao motorista para tirar o SIGCF da economia de bateria:** depende de cada celular e fabricante, e não impede o congelamento da WebView.
- **Manter a WebView acordada com uma trava de processamento (wake lock):** gasta mais bateria, e o Android pode congelar o processo da WebView mesmo assim.
- **Plugin comercial (Transistorsoft):** também envia as posições pelo código nativo, mas tem licença paga para a versão final do app, como já registrado no ADR 0009.

## Consequências

- O trajeto deixa de depender da tela: com a tela apagada, outro app aberto ou o SIGCF fechado pelo motorista, o serviço continua gravando e enviando até a coleta terminar.
- **Código nativo no projeto:** cerca de 700 linhas em Java. A fila e o envio são Java puro, cobertos por testes JUnit que rodam no CI (job "App Android"). O serviço e o plugin dependem do Android e são verificados nos testes de campo.
- **Dependência do Google Play Services** (`play-services-location`), que já vinha com o plugin anterior e com o Firebase. Celulares Android sem os serviços do Google ficam sem o trajeto no app.
- Continua só no Android; no navegador e no iPhone valem as limitações do ADR 0008.
- Um teste em rota com o celular na bateria ainda precisa confirmar o trajeto completo com o app novo.
