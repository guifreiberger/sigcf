# ADR 0008 — Rastreamento da coleta pelo navegador

**Status:** aceita · **Data:** 04/11/2026

## Contexto

O gestor quer saber onde o motorista está durante a coleta e, ao final, ter o trajeto e o tempo da corrida (RF11). A proposta original deixava o rastreamento em tempo real fora do escopo, e a RNF05 limitava a localização aos momentos de mudança de status. O app do motorista é um PWA ([ADR 0002](0002-pwa-react-para-o-motorista.md)).

## Decisão

- O rastreamento existe só enquanto o motorista tem coleta em andamento. O celular lê o GPS com a API de Geolocalização (uma leitura a cada 10 s), guarda numa fila no aparelho e envia em lotes a cada 15 s. O servidor recusa pontos fora de uma coleta em andamento.
- Durante a coleta, a tela fica ligada com a API Screen Wake Lock, porque o navegador para o GPS quando a tela apaga.
- O gestor acompanha por **consultas periódicas** (10 a 15 s).
- Os mapas usam **Leaflet** com os tiles do **OpenStreetMap**, carregados sob demanda só nas telas do gestor.
- Distância e duração são calculadas a partir dos pontos e do histórico, sem colunas duplicadas na ordem.

Detalhes e regras de cálculo em [`rastreamento.md`](../rastreamento.md).

## Alternativas consideradas

- **WebSocket ou Server-Sent Events para o mapa ao vivo:** atualização instantânea, mas exige conexões persistentes e cuidado extra com escala e proxies. Para uma frota pequena, atualizar a cada 10 a 15 s atende.
- **Google Maps:** conhecido pelos usuários, mas exige chave de API e cobrança acima da cota gratuita.
- **App nativo para rastrear em segundo plano:** resolveria as lacunas com a tela bloqueada, mas contraria o ADR 0002.

## Consequências

- A RNF05 foi revista e o RF11 incluído na proposta, com a justificativa da ampliação de escopo.
- O compartilhamento é visível para o motorista e termina sozinho com a coleta.
- **Limitação aceita:** se o motorista sair do app ou bloquear o celular, o trajeto fica com lacunas.
- Manter a tela ligada aumenta o consumo de bateria durante a coleta.
- Para uso intenso em produção, os tiles públicos do OpenStreetMap devem ser trocados por um provedor próprio ou contratado.
