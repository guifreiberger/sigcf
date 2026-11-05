import { Ban, Building2, ChevronLeft, Info, MapPin, MapPinOff, Truck, UserRound, Weight } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAlterarStatus, useOrdem } from '../../api/consultas.ts'
import { DialogoMotivo } from '../../componentes/DialogoMotivo.tsx'
import { Carregando, MensagemErro } from '../../componentes/Estados.tsx'
import { IconeStatus } from '../../componentes/IconeStatus.tsx'
import { StatusBadge } from '../../componentes/StatusBadge.tsx'
import {
  formatarData,
  formatarDataHora,
  formatarKg,
  formatarPlaca,
  formatarTelefone,
  linkCoordenadas,
  ROTULO_STATUS,
} from '../../util/formatos.ts'
import { TrajetoDaOrdem } from './TrajetoDaOrdem.tsx'

function Voltar() {
  return (
    <Link to="/gestor/ordens" className="voltar">
      <ChevronLeft size={16} aria-hidden />
      Ordens
    </Link>
  )
}

export function DetalheOrdem() {
  const id = Number(useParams().id)
  const ordem = useOrdem(id)
  const alterar = useAlterarStatus()
  const [cancelando, setCancelando] = useState(false)

  if (ordem.isPending) return <Carregando />
  if (ordem.error || !ordem.data) {
    return (
      <>
        <Voltar />
        <MensagemErro erro={ordem.error} />
      </>
    )
  }

  const o = ordem.data
  const podeCancelar = o.transicoesPermitidas.includes('CANCELADA')

  return (
    <>
      <header className="pagina__topo">
        <div>
          <Voltar />
          <h1>
            Ordem #{o.id} <StatusBadge status={o.status} />
          </h1>
          <p className="texto-suave">
            Coleta em {formatarData(o.dataColeta)} · criada por {o.criadoPor?.nome} em {formatarDataHora(o.createdAt)}
          </p>
        </div>
        {podeCancelar && (
          <button type="button" className="botao botao--perigo-contorno" onClick={() => setCancelando(true)}>
            <Ban size={18} aria-hidden />
            Cancelar ordem
          </button>
        )}
      </header>

      <TrajetoDaOrdem ordem={o} />

      <div className="grade-detalhe">
        <section className="cartao">
          <h2>Dados da coleta</h2>
          <dl className="definicoes">
            <dt>
              <Building2 size={16} aria-hidden />
              Cliente
            </dt>
            <dd>
              {o.cliente.nome}
              <small className="texto-suave bloco">{formatarTelefone(o.cliente.telefone)}</small>
            </dd>
            <dt>
              <MapPin size={16} aria-hidden />
              Endereço
            </dt>
            <dd>{o.enderecoColeta}</dd>
            <dt>
              <Weight size={16} aria-hidden />
              Peso estimado
            </dt>
            <dd>{o.pesoEstimadoKg != null ? formatarKg(o.pesoEstimadoKg) : 'Não informado'}</dd>
            <dt>
              <UserRound size={16} aria-hidden />
              Motorista
            </dt>
            <dd>
              {o.motorista?.nome}
              <small className="texto-suave bloco">{formatarTelefone(o.motorista?.telefone ?? null)}</small>
            </dd>
            <dt>
              <Truck size={16} aria-hidden />
              Veículo
            </dt>
            <dd>
              {formatarPlaca(o.veiculo.placa)} — {o.veiculo.modelo}
              <small className="texto-suave bloco">Capacidade {formatarKg(o.veiculo.capacidadeKg)}</small>
            </dd>
            {o.observacao && (
              <>
                <dt>
                  <Info size={16} aria-hidden />
                  Observações
                </dt>
                <dd className="pre-linha">{o.observacao}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="cartao">
          <h2>Histórico de status</h2>
          <ol className="linha-tempo">
            {o.historico?.map((h) => (
              <li key={h.id} className={`linha-tempo__item linha-tempo__item--${h.statusNovo.toLowerCase()}`}>
                <span className="linha-tempo__icone">
                  <IconeStatus status={h.statusNovo} size={16} />
                </span>
                <div className="linha-tempo__topo">
                  <strong>{ROTULO_STATUS[h.statusNovo]}</strong>
                  <time dateTime={h.createdAt}>{formatarDataHora(h.createdAt)}</time>
                </div>
                <span className="texto-suave">
                  {h.statusAnterior ? 'Alterado' : 'Criada'} por {h.usuario.nome}
                </span>
                {h.motivo && <p className="linha-tempo__motivo">“{h.motivo}”</p>}
                {h.latitude != null && h.longitude != null ? (
                  <a
                    className="linha-tempo__local"
                    href={linkCoordenadas(h.latitude, h.longitude)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin size={14} aria-hidden />
                    Ver local no mapa
                    {h.precisaoMetros != null && ` (precisão de ${h.precisaoMetros} m)`}
                  </a>
                ) : (
                  h.usuario.perfil === 'MOTORISTA' && (
                    <span className="linha-tempo__local texto-suave">
                      <MapPinOff size={14} aria-hidden />
                      Localização não registrada
                    </span>
                  )
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <DialogoMotivo
        aberto={cancelando}
        titulo={`Cancelar ordem #${o.id}`}
        descricao="O cancelamento é definitivo e ficará registrado no histórico com o motivo informado."
        rotuloConfirmar="Cancelar ordem"
        sugestoes={['Cliente cancelou a solicitação', 'Veículo indisponível', 'Ordem criada por engano']}
        enviando={alterar.isPending}
        erro={alterar.error}
        aoFechar={() => {
          setCancelando(false)
          alterar.reset()
        }}
        aoConfirmar={(motivo) =>
          alterar.mutate({ id: o.id, status: 'CANCELADA', motivo }, { onSuccess: () => setCancelando(false) })
        }
      />
    </>
  )
}
