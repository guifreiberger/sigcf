# Trajeto da Coleta (RF11) — Funcionamento e Privacidade

Quando o motorista inicia uma coleta, o gestor passa a ver onde ele está, sem precisar perguntar no grupo do WhatsApp. Quando a coleta termina, o trajeto percorrido, a distância e o tempo da corrida ficam salvos na ordem.

Implementação: [`backend/src/rastreamento/`](../backend/src/rastreamento) (cálculos em [`trajeto.ts`](../backend/src/rastreamento/trajeto.ts)) e [`frontend/src/paginas/motorista/useRastreamento.ts`](../frontend/src/paginas/motorista/useRastreamento.ts).

## Fluxo

```mermaid
sequenceDiagram
    participant M as Celular do motorista
    participant A as API
    participant G as Painel do gestor
    M->>A: Iniciar coleta (status EM_ANDAMENTO)
    loop a cada 15 s, enquanto a coleta está em andamento
        M->>A: POST /rastreamento/pontos (lote de leituras)
    end
    loop a cada 10 a 15 s
        G->>A: GET /rastreamento/em-rota e /rastreamento/ordens/:id
    end
    M->>A: envia o que restou na fila
    M->>A: Concluir ou reportar falha
    M--xA: novos pontos são recusados (409)
```

## No celular do motorista

O motorista pode usar o SIGCF de dois jeitos. No **app Android**, o trajeto continua sendo gravado com a tela apagada ou com ele em outros apps, como o Waze e o WhatsApp ([ADR 0009](adr/0009-app-android-com-capacitor.md)). No **navegador** (inclusive no iPhone), o trajeto só é gravado com o SIGCF aberto na tela.

- **App Android:** ao iniciar a coleta, liga um serviço do Android que mantém o GPS ativo e mostra a notificação fixa "SIGCF: coleta em andamento". Na primeira vez, o celular pede as permissões de localização ("durante o uso do app" basta) e de notificação. As posições são enviadas pelo HTTP nativo, que o Android não limita em segundo plano, e o envio parte da própria leitura do GPS. O serviço desliga ao concluir, reportar falha ou quando o servidor informa que a coleta foi cancelada.

- **Quando começa e termina:** o rastreamento liga sozinho enquanto o motorista tem alguma coleta **em andamento** e desliga quando ela é concluída, reportada como falha ou cancelada pelo gestor. Não há botão para ligar fora de uma coleta.
- **Leitura:** a posição vem da [API de Geolocalização](https://developer.mozilla.org/docs/Web/API/Geolocation/watchPosition) do navegador, com alta precisão. É guardada no máximo **uma leitura a cada 10 segundos**, o suficiente para desenhar o caminho sem gastar bateria e dados à toa.
- **Recuperação do GPS:** num teste de campo em um Android, o acompanhamento contínuo (`watchPosition`) parou de entregar leituras sem avisar, depois que a tela apagou ou o app saiu da frente. Enquanto isso, o pedido avulso de posição (`getCurrentPosition`), usado nas mudanças de status, seguia funcionando. Por isso, se nenhuma leitura chega em 20 segundos, o app refaz o acompanhamento e pede uma posição avulsa, repetindo a cada 10 segundos até as leituras voltarem. O mesmo acontece assim que o motorista volta para o app.
- **Envio:** as leituras ficam numa fila salva no aparelho e são enviadas em **lotes a cada 15 segundos**. Sem sinal, a fila cresce (até cerca de 5 horas de leituras) e é enviada quando a conexão volta. Antes de concluir ou reportar falha, o app envia o que estiver na fila, porque depois disso o servidor não aceita mais pontos daquela coleta.
- **Tela ligada (navegador):** durante a coleta, o navegador usa a [API Screen Wake Lock](https://developer.mozilla.org/docs/Web/API/Screen_Wake_Lock_API) para a tela não apagar. Se o motorista sair do app, a trava cai e é pedida de novo quando ele volta.
- **Transparência:** enquanto compartilha a posição, a tela mostra o aviso "Compartilhando sua localização com o gestor". Se nenhuma posição chega em 30 segundos, o aviso muda para "Procurando o sinal do GPS…", para o motorista não achar que está sendo acompanhado quando não está. Se o GPS estiver bloqueado, a tela orienta a liberar, e a coleta segue funcionando normalmente, apenas sem trajeto.

## No servidor

- `POST /rastreamento/pontos` só aceita leituras do **próprio motorista** e só enquanto ele tem coleta em andamento. Os pontos são gravados em cada coleta em andamento dele; sem nenhuma, a resposta é **409**, e o celular descarta a fila.
- Cada leitura guarda o **horário do celular** (`registrado_em`), não o do envio. Assim, lotes que chegam atrasados por falta de sinal entram na ordem certa.
- Só o **gestor** consulta os trajetos (`GET /rastreamento/em-rota` e `GET /rastreamento/ordens/:id`).

## Cálculos

| Medida | Regra |
|---|---|
| Pontos confiáveis | Leituras com precisão de até **100 m**. Piores que isso costumam vir da antena de celular ou do Wi-Fi, não do GPS, e são descartadas do mapa e da distância |
| Distância percorrida | Soma dos trechos entre pontos consecutivos pela [fórmula de haversine](https://en.wikipedia.org/wiki/Haversine_formula) (distância sobre a superfície da Terra, raio de 6.371 km). Um trecho só conta quando o deslocamento supera **15 m** e a precisão da própria leitura; isso elimina a oscilação do GPS com o caminhão parado no cliente |
| Início da corrida | Momento em que o motorista iniciou a coleta, pelo histórico de status |
| Fim da corrida | Momento em que a coleta saiu de "em andamento" (concluída, falha ou cancelada) |
| Duração | Fim − início; enquanto a coleta está em andamento, agora − início |
| Última posição | Ponto confiável mais recente |

A duração e a distância são calculadas a partir dos dados gravados (histórico e pontos), sem colunas duplicadas na ordem.

## Privacidade (LGPD)

A localização do motorista é dado pessoal. O tratamento segue os princípios do art. 6º da LGPD:

- **Finalidade (I):** acompanhar a execução da coleta e comprovar o atendimento ao cliente. Os pontos não são usados para outra análise.
- **Necessidade (III):** a coleta da posição se limita ao período da corrida. Fora de uma coleta em andamento, o servidor recusa pontos mesmo que o aparelho os envie.
- **Transparência (VI):** o motorista vê na tela quando está compartilhando a posição, e o aviso geral da tela explica que a localização só é compartilhada durante a coleta.
- **Segurança (VII):** o acesso aos trajetos é restrito ao perfil gestor e passa pela mesma autenticação JWT do restante da API.

A RNF05 da proposta foi revista para incluir esse tratamento (ver [`tcc/atualizacoes-proposta.tex`](tcc/atualizacoes-proposta.tex)). Uma política de retenção dos pontos (por exemplo, apagar trajetos com mais de 12 meses, alinhada à janela da tela de Inteligência) deve ser definida com a empresa antes do uso em produção.

## Limitações

- **Navegador:** nenhum navegador permite que um site leia o GPS em segundo plano. No navegador, se o motorista bloquear o celular ou trocar de app, o trajeto fica com uma lacuna até ele voltar, e o mapa liga os pontos em linha reta. No Android isso é resolvido pelo app; no iPhone continua valendo, porque publicar para iPhone exige um Mac e a conta paga de desenvolvedor da Apple.
- **Economia de bateria:** alguns fabricantes encerram serviços em segundo plano por conta própria. Se o trajeto do app apresentar lacunas, o SIGCF precisa sair da otimização de bateria do celular.
- **Atualização do mapa:** o painel consulta a posição a cada 10 a 15 segundos (polling), em vez de receber atualizações em tempo real por WebSocket. Para o volume de uma frota pequena, o atraso é aceitável e a solução é mais simples de operar.
- **Mapa base:** os mapas usam os tiles públicos do OpenStreetMap, com atribuição. Para uso intenso em produção, a [política de uso](https://operations.osmfoundation.org/policies/tiles/) recomenda um provedor de tiles próprio ou contratado.
