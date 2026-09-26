import { useState } from 'react'
import { Link } from 'react-router'
import { type FiltrosOrdens, useCadastro, useOrdens } from '../../api/consultas.ts'
import type { StatusOrdem } from '../../api/tipos.ts'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'
import { ORDEM_STATUS, ROTULO_STATUS } from '../../util/formatos.ts'
import { TabelaOrdens } from './TabelaOrdens.tsx'

export function Ordens() {
  const [filtros, setFiltros] = useState<FiltrosOrdens>({})
  const ordens = useOrdens(filtros)
  const motoristas = useCadastro('motoristas')
  const clientes = useCadastro('clientes')

  const alterar = (parcial: FiltrosOrdens) => setFiltros((atual) => ({ ...atual, ...parcial }))
  const paraId = (valor: string) => (valor ? Number(valor) : undefined)

  return (
    <>
      <header className="pagina__topo">
        <div>
          <h1>Ordens de coleta</h1>
          <p className="texto-suave">Histórico completo, com filtros por data, status, motorista e cliente.</p>
        </div>
        <Link to="/gestor/ordens/nova" className="botao botao--primario">
          Nova ordem
        </Link>
      </header>

      <section className="filtros cartao" aria-label="Filtros">
        <label className="campo">
          <span>Data</span>
          <input type="date" value={filtros.data ?? ''} onChange={(e) => alterar({ data: e.target.value || undefined })} />
        </label>
        <label className="campo">
          <span>Status</span>
          <select value={filtros.status ?? ''} onChange={(e) => alterar({ status: e.target.value as StatusOrdem | '' })}>
            <option value="">Todos</option>
            {ORDEM_STATUS.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Motorista</span>
          <select value={filtros.motoristaId ?? ''} onChange={(e) => alterar({ motoristaId: paraId(e.target.value) })}>
            <option value="">Todos</option>
            {motoristas.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Cliente</span>
          <select value={filtros.clienteId ?? ''} onChange={(e) => alterar({ clienteId: paraId(e.target.value) })}>
            <option value="">Todos</option>
            {clientes.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="botao botao--fantasma" onClick={() => setFiltros({})}>
          Limpar filtros
        </button>
      </section>

      <section className="cartao">
        <MensagemErro erro={ordens.error} />
        {ordens.isPending ? (
          <Carregando />
        ) : ordens.data?.length ? (
          <>
            <TabelaOrdens ordens={ordens.data} mostrarData />
            {ordens.data.length === 200 && (
              <p className="texto-suave">Mostrando as 200 ordens mais recentes. Use os filtros para refinar.</p>
            )}
          </>
        ) : (
          <Vazio>Nenhuma ordem encontrada com esses filtros.</Vazio>
        )}
      </section>
    </>
  )
}
