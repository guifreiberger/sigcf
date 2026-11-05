import { Truck } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { useEmRota } from '../../api/consultas.ts'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'
import type { MarcadorMapa } from '../../componentes/Mapa.tsx'
import { Mapa } from '../../componentes/MapaSobDemanda.tsx'
import { formatarPlaca, tempoDesde } from '../../util/formatos.ts'

const ATUALIZAR_A_CADA_MS = 15_000

// Substitui o "cadê você?" no grupo do WhatsApp: onde está cada motorista em coleta agora.
export function EmRota() {
  const idTitulo = useId()
  const emRota = useEmRota(ATUALIZAR_A_CADA_MS)
  const motoristas = emRota.data ?? []
  const marcadores = motoristas.flatMap((m): MarcadorMapa[] =>
    m.ultimaPosicao
      ? [
          {
            id: m.ordemId,
            posicao: [m.ultimaPosicao.latitude, m.ultimaPosicao.longitude],
            rotulo: `${m.motorista.nome} · ${m.cliente}`,
          },
        ]
      : [],
  )

  return (
    <section className="cartao" aria-labelledby={idTitulo}>
      <header className="cartao__topo">
        <h2 id={idTitulo}>Em rota agora</h2>
        {motoristas.length > 0 && (
          <small className="texto-suave">
            {motoristas.length === 1 ? '1 coleta em andamento' : `${motoristas.length} coletas em andamento`}
          </small>
        )}
      </header>
      <MensagemErro erro={emRota.error} />
      {emRota.isPending ? (
        <Carregando />
      ) : motoristas.length === 0 ? (
        <Vazio icone={Truck}>Nenhum motorista em coleta agora.</Vazio>
      ) : (
        <div className="em-rota">
          <Mapa rotulo="Mapa dos motoristas em coleta" marcadores={marcadores} />
          <ul className="em-rota__lista">
            {motoristas.map((m) => (
              <li key={m.ordemId}>
                <Link to={`/gestor/ordens/${m.ordemId}`}>
                  <strong>{m.motorista.nome}</strong>
                  <span>
                    {m.cliente} · {formatarPlaca(m.placa)}
                  </span>
                  <small>
                    {m.ultimaPosicao
                      ? `Posição recebida ${tempoDesde(m.ultimaPosicao.registradoEm)}`
                      : 'Ainda sem posição do celular'}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
