import { useState } from 'react'
import { Link } from 'react-router'
import { useOrdens, useResumo } from '../../api/consultas.ts'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'
import {
  formatarDataExtenso,
  formatarHora,
  hojeLocal,
  ORDEM_STATUS,
  ROTULO_STATUS,
} from '../../util/formatos.ts'
import { TabelaOrdens } from './TabelaOrdens.tsx'

const ATUALIZAR_A_CADA_MS = 15_000

export function Painel() {
  const [data, setData] = useState(hojeLocal())
  const resumo = useResumo(data, ATUALIZAR_A_CADA_MS)
  const ordens = useOrdens({ data }, ATUALIZAR_A_CADA_MS)
  const total = resumo.data?.total ?? 0

  return (
    <>
      <header className="pagina__topo">
        <div>
          <h1>Painel do dia</h1>
          <p className="texto-suave primeira-maiuscula">{formatarDataExtenso(data)}</p>
        </div>
        <div className="pagina__acoes">
          <label className="campo campo--inline">
            <span>Data</span>
            <input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
          </label>
          <Link to="/gestor/ordens/nova" className="botao botao--primario">
            Nova ordem
          </Link>
        </div>
      </header>

      <MensagemErro erro={resumo.error} />

      <section className="resumo" aria-label="Resumo por status">
        <article className="resumo__cartao resumo__cartao--total">
          <span>Total</span>
          <strong>{total}</strong>
        </article>
        {ORDEM_STATUS.map((status) => (
          <article key={status} className={`resumo__cartao resumo__cartao--${status.toLowerCase()}`}>
            <span>{ROTULO_STATUS[status]}</span>
            <strong>{resumo.data?.porStatus[status] ?? 0}</strong>
          </article>
        ))}
      </section>

      {total > 0 && (
        <div className="barra-status" role="img" aria-label="Distribuição das coletas por status">
          {ORDEM_STATUS.map((status) => {
            const qtd = resumo.data?.porStatus[status] ?? 0
            return qtd > 0 ? (
              <span
                key={status}
                className={`barra-status__parte barra-status__parte--${status.toLowerCase()}`}
                style={{ flexGrow: qtd }}
                title={`${ROTULO_STATUS[status]}: ${qtd}`}
              />
            ) : null
          })}
        </div>
      )}

      <section className="cartao">
        <header className="cartao__topo">
          <h2>Coletas do dia</h2>
          {ordens.dataUpdatedAt > 0 && (
            <small className="texto-suave" aria-live="polite">
              {ordens.isFetching ? 'Atualizando…' : `Atualizado às ${formatarHora(ordens.dataUpdatedAt)}`}
            </small>
          )}
        </header>
        <MensagemErro erro={ordens.error} />
        {ordens.isPending ? (
          <Carregando />
        ) : ordens.data?.length ? (
          <TabelaOrdens ordens={ordens.data} />
        ) : (
          <Vazio>Nenhuma coleta programada para esta data.</Vazio>
        )}
      </section>
    </>
  )
}
