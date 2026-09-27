import { Link } from 'react-router'
import { useInteligencia } from '../../api/consultas.ts'
import type { AlertaColeta, AnaliseCliente } from '../../api/tipos.ts'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'
import { formatarData, formatarKg } from '../../util/formatos.ts'

const plural = (n: number, palavra: string) => `${n} ${palavra}${n === 1 ? '' : 's'}`

function textoAlerta({ tipo, dias, dataPrevista }: AlertaColeta) {
  const data = formatarData(dataPrevista)
  if (tipo === 'ATRASADA') return `Era esperada em ${data}, há ${plural(-dias, 'dia')}, e ainda não há pedido`
  if (dias === 0) return 'Esperada para hoje e ainda não há pedido'
  if (dias < 0) return `Era esperada em ${data}, há ${plural(-dias, 'dia')}`
  return `Esperada para ${data}, daqui a ${plural(dias, 'dia')}`
}

function Tendencia({ peso }: { peso: AnaliseCliente['peso'] }) {
  if (peso.tendencia === 'INSUFICIENTE' || peso.variacaoMensalPct === null) return <>—</>
  const variacao = `${peso.variacaoMensalPct > 0 ? '+' : ''}${peso.variacaoMensalPct.toLocaleString('pt-BR')}% ao mês`
  const rotulo = { ALTA: '↑ Alta', QUEDA: '↓ Queda', ESTAVEL: '→ Estável' }[peso.tendencia]
  return (
    <span className={`tendencia tendencia--${peso.tendencia.toLowerCase()}`} title={`R² = ${peso.r2}`}>
      {rotulo}
      <small className="bloco">{variacao}</small>
    </span>
  )
}

function Proxima({ analise }: { analise: AnaliseCliente }) {
  if (analise.proximaAgendada) return <>Agendada para {formatarData(analise.proximaAgendada)}</>
  if (analise.proximaPrevista) return <>Prevista para {formatarData(analise.proximaPrevista)}</>
  return <>—</>
}

export function Inteligencia() {
  const analise = useInteligencia()
  const dados = analise.data

  return (
    <>
      <header className="pagina__topo">
        <div>
          <h1>Inteligência</h1>
          <p className="texto-suave">Padrões de cada cliente, calculados a partir das coletas dos últimos 12 meses.</p>
        </div>
      </header>

      <MensagemErro erro={analise.error} />

      {analise.isPending ? (
        <Carregando />
      ) : (
        dados && (
          <>
            <section className="cartao">
              <h2>Coletas esperadas</h2>
              {dados.alertas.length ? (
                <ul className="alertas">
                  {dados.alertas.map((a) => (
                    <li key={a.clienteId} className={`alerta-coleta alerta-coleta--${a.tipo.toLowerCase()}`}>
                      <div>
                        <strong>{a.cliente}</strong>
                        <span>{a.padrao}</span>
                        <small>{textoAlerta(a)}</small>
                      </div>
                      <Link
                        className="botao botao--primario botao--pequeno"
                        to={`/gestor/ordens/nova?clienteId=${a.clienteId}&data=${a.dataPrevista < dados.hoje ? dados.hoje : a.dataPrevista}`}
                      >
                        Criar ordem
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio>Nenhum cliente com coleta esperada para os próximos dias.</Vazio>
              )}
            </section>

            <section className="cartao">
              <h2>Padrões por cliente</h2>
              <div className="tabela-rolagem">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Padrão</th>
                      <th>Regularidade</th>
                      <th>Última coleta</th>
                      <th>Próxima</th>
                      <th>Peso médio</th>
                      <th>Tendência de peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.clientes.map((c) => (
                      <tr key={c.clienteId}>
                        <td>
                          <strong>{c.cliente}</strong>
                          <small className="texto-suave bloco">{plural(c.totalColetas, 'coleta')}</small>
                        </td>
                        <td className={c.recorrencia.tipo === 'INSUFICIENTE' ? 'texto-suave' : ''}>
                          {c.recorrencia.descricao}
                        </td>
                        <td>{c.recorrencia.regularidade != null ? `${Math.round(c.recorrencia.regularidade * 100)}%` : '—'}</td>
                        <td>{c.ultimaColeta ? formatarData(c.ultimaColeta) : '—'}</td>
                        <td>
                          <Proxima analise={c} />
                        </td>
                        <td>
                          {c.peso.mediaKg != null ? (
                            <>
                              {formatarKg(c.peso.mediaKg)}
                              <small className="texto-suave bloco">{plural(c.peso.amostras, 'amostra')}</small>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <Tendencia peso={c.peso} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="texto-suave nota-metodo">
              <strong>Como calculamos:</strong> o padrão considera o intervalo entre as coletas (sem as canceladas) e o dia
              da semana ou do mês que mais se repete, exigindo ao menos 3 coletas. A regularidade é a proporção de
              coletas que seguem o padrão. A tendência usa regressão linear sobre o peso estimado e só é indicada quando a
              variação passa de 5% ao mês com ajuste consistente (R² de pelo menos 0,3).
            </p>
          </>
        )
      )}
    </>
  )
}
