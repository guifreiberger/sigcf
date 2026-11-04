import { useQueryClient } from '@tanstack/react-query'
import type { LatLngTuple } from 'leaflet'
import { MapPinOff } from 'lucide-react'
import { useEffect, useId } from 'react'
import { useTrajeto } from '../../api/consultas.ts'
import type { Ordem, StatusOrdem } from '../../api/tipos.ts'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'
import type { MarcadorMapa } from '../../componentes/Mapa.tsx'
import { Mapa } from '../../componentes/MapaSobDemanda.tsx'
import { formatarDistancia, formatarDuracao, formatarHora, tempoDesde } from '../../util/formatos.ts'

// O trajeto só existe depois que o motorista inicia a coleta (RF11).
export function TrajetoDaOrdem({ ordem }: { ordem: Ordem }) {
  const comecou = ordem.historico?.some((h) => h.statusNovo === 'EM_ANDAMENTO') ?? false
  return comecou ? <PainelTrajeto ordemId={ordem.id} statusDaOrdem={ordem.status} /> : null
}

function PainelTrajeto({ ordemId, statusDaOrdem }: { ordemId: number; statusDaOrdem: StatusOrdem }) {
  const idTitulo = useId()
  const trajeto = useTrajeto(ordemId)
  const queryClient = useQueryClient()
  const status = trajeto.data?.status

  // A consulta ao vivo percebe primeiro quando o motorista conclui; atualiza o resto da tela.
  useEffect(() => {
    if (status && status !== statusDaOrdem) queryClient.invalidateQueries({ queryKey: ['ordem', ordemId] })
  }, [status, statusDaOrdem, ordemId, queryClient])

  if (trajeto.isPending) return <Carregando texto="Carregando o trajeto…" />
  if (!trajeto.data) return <MensagemErro erro={trajeto.error} />

  const { pontos, ultimaPosicao, inicio, fim, duracaoSegundos, distanciaMetros } = trajeto.data
  const aoVivo = status === 'EM_ANDAMENTO'
  const caminho = pontos.map((p): LatLngTuple => [p.latitude, p.longitude])
  const marcadores: MarcadorMapa[] = []
  if (caminho.length > 1) marcadores.push({ id: 'inicio', posicao: caminho[0], rotulo: 'Início do trajeto', tipo: 'inicio' })
  if (ultimaPosicao) {
    marcadores.push({
      id: 'atual',
      posicao: [ultimaPosicao.latitude, ultimaPosicao.longitude],
      rotulo: aoVivo ? `Posição atual (${tempoDesde(ultimaPosicao.registradoEm)})` : 'Fim do trajeto',
    })
  }

  return (
    <section className="cartao" aria-labelledby={idTitulo}>
      <header className="cartao__topo">
        <h2 id={idTitulo}>Trajeto da coleta</h2>
        {aoVivo && <span className="ao-vivo">Ao vivo</span>}
      </header>
      <MensagemErro erro={trajeto.error} />

      <dl className="indicadores-trajeto">
        <div>
          <dt>{aoVivo ? 'Em andamento há' : 'Duração'}</dt>
          <dd>{duracaoSegundos != null ? formatarDuracao(duracaoSegundos) : '—'}</dd>
        </div>
        <div>
          <dt>Distância percorrida</dt>
          <dd>{formatarDistancia(distanciaMetros)}</dd>
        </div>
        <div>
          <dt>Início</dt>
          <dd>{inicio ? formatarHora(Date.parse(inicio)) : '—'}</dd>
        </div>
        <div>
          <dt>{aoVivo ? 'Última posição' : 'Fim'}</dt>
          <dd>
            {aoVivo
              ? ultimaPosicao
                ? tempoDesde(ultimaPosicao.registradoEm)
                : '—'
              : fim
                ? formatarHora(Date.parse(fim))
                : '—'}
          </dd>
        </div>
      </dl>

      {pontos.length > 0 ? (
        <Mapa rotulo="Mapa do trajeto da coleta" trajeto={caminho} marcadores={marcadores} />
      ) : (
        <Vazio icone={MapPinOff}>
          {aoVivo
            ? 'Aguardando a primeira posição do celular do motorista.'
            : 'Nenhum trajeto registrado: o celular do motorista estava sem GPS ou com o app fechado.'}
        </Vazio>
      )}
    </section>
  )
}
