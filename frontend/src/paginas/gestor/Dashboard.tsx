import { useState } from 'react'
import { useDashboard } from '../../api/consultas.ts'
import type { Dashboard as DadosDashboard } from '../../api/tipos.ts'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'
import { formatarData, formatarDistancia, formatarDuracao, formatarKg, hojeLocal } from '../../util/formatos.ts'
import { PERIODOS, type Predefinido, periodoPredefinido } from '../../util/periodos.ts'
import { PadroesDosClientes } from './Inteligencia.tsx'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const plural = (n: number, singular: string, pluralTexto = `${singular}s`) => `${n} ${n === 1 ? singular : pluralTexto}`

// Dashboard do gestor (RF09): peso da balança, clientes que mais pedem e trabalho de cada
// motorista no período, com os alertas e padrões da inteligência logo abaixo.
export function Dashboard() {
  const [predefinido, setPredefinido] = useState<Predefinido | 'personalizado'>('30dias')
  const [periodo, setPeriodo] = useState(() => periodoPredefinido('30dias', hojeLocal()))
  const dashboard = useDashboard(periodo.de, periodo.ate)

  function escolherPredefinido(valor: Predefinido | 'personalizado') {
    setPredefinido(valor)
    if (valor !== 'personalizado') setPeriodo(periodoPredefinido(valor, hojeLocal()))
  }

  function mudarData(campo: 'de' | 'ate', valor: string) {
    if (!valor) return
    setPredefinido('personalizado')
    setPeriodo((atual) => ({ ...atual, [campo]: valor }))
  }

  return (
    <>
      <header className="pagina__topo">
        <div>
          <h1>Dashboard</h1>
          <p className="texto-suave">Coletas, peso da balança e trabalho dos motoristas no período escolhido.</p>
        </div>
        <div className="filtros">
          <label className="campo campo--inline">
            <span>Período</span>
            <select value={predefinido} onChange={(e) => escolherPredefinido(e.target.value as Predefinido | 'personalizado')}>
              {PERIODOS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
              <option value="personalizado">Personalizado</option>
            </select>
          </label>
          <label className="campo campo--inline">
            <span>De</span>
            <input type="date" value={periodo.de} max={periodo.ate} onChange={(e) => mudarData('de', e.target.value)} />
          </label>
          <label className="campo campo--inline">
            <span>Até</span>
            <input type="date" value={periodo.ate} min={periodo.de} onChange={(e) => mudarData('ate', e.target.value)} />
          </label>
        </div>
      </header>

      <MensagemErro erro={dashboard.error} />
      {dashboard.isPending ? <Carregando /> : dashboard.data && <Paineis dados={dashboard.data} />}

      <PadroesDosClientes />
    </>
  )
}

function Paineis({ dados }: { dados: DadosDashboard }) {
  const { totais } = dados
  return (
    <>
      <section className="indicadores" aria-label="Indicadores do período">
        <article className="indicador">
          <span className="indicador__rotulo">Coletas no período</span>
          <strong className="indicador__valor">{totais.coletas}</strong>
          <small>
            {plural(totais.concluidas, 'concluída')} · {plural(totais.falhas, 'falha')} ·{' '}
            {plural(totais.canceladas, 'cancelada')}
          </small>
        </article>
        <article className={`indicador ${totais.semPesagem ? 'indicador--atencao' : ''}`}>
          <span className="indicador__rotulo">Peso coletado</span>
          <strong className="indicador__valor">{formatarKg(totais.pesoKg)}</strong>
          <small>
            {totais.semPesagem
              ? `${plural(totais.semPesagem, 'concluída', 'concluídas')} sem pesagem`
              : 'Peso medido na balança'}
          </small>
        </article>
        <article className="indicador">
          <span className="indicador__rotulo">Distância percorrida</span>
          <strong className="indicador__valor">{formatarDistancia(totais.distanciaMetros)}</strong>
          <small>Pelo trajeto gravado nas coletas</small>
        </article>
        <article className="indicador">
          <span className="indicador__rotulo">Tempo médio por coleta</span>
          <strong className="indicador__valor">
            {totais.duracaoMediaSegundos == null ? '—' : formatarDuracao(totais.duracaoMediaSegundos)}
          </strong>
          <small>Do início à conclusão</small>
        </article>
      </section>

      <section className="cartao">
        <h2>Peso coletado por {dados.agrupamento === 'dia' ? 'dia' : 'mês'}</h2>
        <GraficoPeso dados={dados} />
      </section>

      <div className="grade-detalhe">
        <section className="cartao">
          <h2>Clientes que mais pedem coletas</h2>
          <RankingClientes clientes={dados.clientes} />
        </section>
        <section className="cartao">
          <h2>Motoristas</h2>
          <TabelaMotoristas motoristas={dados.motoristas} />
        </section>
      </div>
    </>
  )
}

// As dicas das pontas se alinham para dentro do gráfico, sem passar da borda da tela.
const posicaoDaDica = (indice: number, total: number) =>
  indice < total / 3 ? 'grafico-colunas__coluna--inicio' : indice >= (total * 2) / 3 ? 'grafico-colunas__coluna--fim' : ''

function GraficoPeso({ dados }: { dados: DadosDashboard }) {
  const pontos = dados.pesoPorPeriodo
  const maximo = Math.max(0, ...pontos.map((p) => p.pesoKg))
  const rotulo = (periodo: string) => {
    if (dados.agrupamento === 'dia') return formatarData(periodo).slice(0, 5)
    const [ano, mes] = periodo.split('-')
    return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`
  }
  const descricao = (p: (typeof pontos)[number]) =>
    `${rotulo(p.periodo)}: ${formatarKg(p.pesoKg)} em ${plural(p.coletas, 'coleta')}`

  if (!maximo) return <Vazio>Nenhum peso de balança registrado no período.</Vazio>

  return (
    <div className="grafico-colunas">
      <span className="grafico-colunas__escala">Até {formatarKg(maximo)}</span>
      <ol className="grafico-colunas__area" aria-label={`Peso coletado por ${dados.agrupamento === 'dia' ? 'dia' : 'mês'}`}>
        {pontos.map((p, i) => (
          // Cada coluna recebe foco, para a dica com o valor aparecer também pelo teclado.
          <li
            key={p.periodo}
            className={`grafico-colunas__coluna ${posicaoDaDica(i, pontos.length)}`}
            tabIndex={0}
            aria-label={descricao(p)}
          >
            <span className="grafico-colunas__barra" style={{ height: `${(p.pesoKg / maximo) * 100}%` }} />
            <span className="grafico-colunas__dica" aria-hidden>
              {descricao(p)}
            </span>
          </li>
        ))}
      </ol>
      <div className="grafico-colunas__eixo" aria-hidden>
        <span>{rotulo(pontos[0].periodo)}</span>
        <span>{rotulo(pontos[pontos.length - 1].periodo)}</span>
      </div>
      <details>
        <summary>Ver em tabela</summary>
        <div className="tabela-rolagem" tabIndex={0} role="region" aria-label="Peso coletado em tabela">
          <table className="tabela">
            <thead>
              <tr>
                <th>{dados.agrupamento === 'dia' ? 'Dia' : 'Mês'}</th>
                <th>Peso</th>
                <th>Coletas</th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.periodo}>
                  <td>{rotulo(p.periodo)}</td>
                  <td>{formatarKg(p.pesoKg)}</td>
                  <td>{p.coletas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

function RankingClientes({ clientes }: { clientes: DadosDashboard['clientes'] }) {
  if (!clientes.length) return <Vazio>Nenhuma coleta pedida no período.</Vazio>
  const maior = Math.max(...clientes.map((c) => c.coletas))
  return (
    <ol className="ranking" aria-label="Clientes que mais pedem coletas">
      {clientes.map((c) => (
        <li key={c.clienteId}>
          <div className="ranking__topo">
            <strong>{c.cliente}</strong>
            <span className="ranking__valores">
              <span>{plural(c.coletas, 'coleta')}</span>
              {c.pesoKg > 0 && <small>{formatarKg(c.pesoKg)}</small>}
            </span>
          </div>
          <span className="ranking__trilho" aria-hidden>
            <span className="ranking__barra" style={{ width: `${(c.coletas / maior) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  )
}

function TabelaMotoristas({ motoristas }: { motoristas: DadosDashboard['motoristas'] }) {
  if (!motoristas.length) return <Vazio>Nenhuma coleta atribuída a motoristas no período.</Vazio>
  return (
    <div className="tabela-rolagem" tabIndex={0} role="region" aria-label="Trabalho dos motoristas">
      <table className="tabela">
        <thead>
          <tr>
            <th>Motorista</th>
            <th>Coletas</th>
            <th>Falhas</th>
            <th>Distância</th>
            <th>Peso</th>
            <th>Tempo médio</th>
          </tr>
        </thead>
        <tbody>
          {motoristas.map((m) => (
            <tr key={m.motoristaId}>
              <th scope="row">{m.motorista}</th>
              <td>{m.coletas}</td>
              <td>{m.falhas}</td>
              <td>{formatarDistancia(m.distanciaMetros)}</td>
              <td>{formatarKg(m.pesoKg)}</td>
              <td>{m.duracaoMediaSegundos == null ? '—' : formatarDuracao(m.duracaoMediaSegundos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
