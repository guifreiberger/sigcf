import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAlterarStatus, useOrdem } from '../../api/consultas.ts'
import { DialogoMotivo } from '../../componentes/DialogoMotivo.tsx'
import { Carregando, MensagemErro } from '../../componentes/Estados.tsx'
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

export function DetalheOrdem() {
  const id = Number(useParams().id)
  const ordem = useOrdem(id)
  const alterar = useAlterarStatus()
  const [cancelando, setCancelando] = useState(false)

  if (ordem.isPending) return <Carregando />
  if (ordem.error || !ordem.data) {
    return (
      <>
        <Link to="/gestor/ordens" className="voltar">
          ← Ordens
        </Link>
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
          <Link to="/gestor/ordens" className="voltar">
            ← Ordens
          </Link>
          <h1>
            Ordem #{o.id} <StatusBadge status={o.status} />
          </h1>
          <p className="texto-suave">
            Coleta em {formatarData(o.dataColeta)} · criada por {o.criadoPor?.nome} em {formatarDataHora(o.createdAt)}
          </p>
        </div>
        {podeCancelar && (
          <button type="button" className="botao botao--perigo-contorno" onClick={() => setCancelando(true)}>
            Cancelar ordem
          </button>
        )}
      </header>

      <div className="grade-detalhe">
        <section className="cartao">
          <h2>Dados da coleta</h2>
          <dl className="definicoes">
            <dt>Cliente</dt>
            <dd>
              {o.cliente.nome}
              <small className="texto-suave bloco">{formatarTelefone(o.cliente.telefone)}</small>
            </dd>
            <dt>Endereço</dt>
            <dd>{o.enderecoColeta}</dd>
            <dt>Peso estimado</dt>
            <dd>{o.pesoEstimadoKg != null ? formatarKg(o.pesoEstimadoKg) : 'Não informado'}</dd>
            <dt>Motorista</dt>
            <dd>
              {o.motorista?.nome}
              <small className="texto-suave bloco">{formatarTelefone(o.motorista?.telefone ?? null)}</small>
            </dd>
            <dt>Veículo</dt>
            <dd>
              {formatarPlaca(o.veiculo.placa)} — {o.veiculo.modelo}
              <small className="texto-suave bloco">Capacidade {formatarKg(o.veiculo.capacidadeKg)}</small>
            </dd>
            {o.observacao && (
              <>
                <dt>Observações</dt>
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
                    Ver local no mapa
                    {h.precisaoMetros != null && ` (precisão de ${h.precisaoMetros} m)`}
                  </a>
                ) : (
                  h.usuario.perfil === 'MOTORISTA' && (
                    <span className="linha-tempo__local texto-suave">Localização não registrada</span>
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
