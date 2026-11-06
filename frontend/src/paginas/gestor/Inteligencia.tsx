import { CalendarClock, CircleCheck, Info, Minus, Plus, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
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
  const { rotulo, Icone } = {
    ALTA: { rotulo: 'Alta', Icone: TrendingUp },
    QUEDA: { rotulo: 'Queda', Icone: TrendingDown },
    ESTAVEL: { rotulo: 'Estável', Icone: Minus },
  }[peso.tendencia]
  return (
    <span className={`tendencia tendencia--${peso.tendencia.toLowerCase()}`} title={`R² = ${peso.r2}`}>
      <Icone size={18} aria-hidden />
      <span>
        {rotulo}
        <small className="bloco">{variacao}</small>
      </span>
    </span>
  )
}

function Proxima({ analise }: { analise: AnaliseCliente }) {
  if (analise.proximaAgendada) return <>Agendada para {formatarData(analise.proximaAgendada)}</>
  if (analise.proximaPrevista) return <>Prevista para {formatarData(analise.proximaPrevista)}</>
  return <>—</>
}

// Alertas e padrões de pedidos de cada cliente (RF09), calculados a partir das coletas dos
// últimos 12 meses. Aparece no dashboard, abaixo dos indicadores do período.
export function PadroesDosClientes() {
  const analise = useInteligencia()
  const dados = analise.data

  return (
    <>
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
                      <span className="alerta-coleta__icone">
                        {a.tipo === 'ATRASADA' ? (
                          <TriangleAlert size={20} aria-hidden />
                        ) : (
                          <CalendarClock size={20} aria-hidden />
                        )}
                      </span>
                      <div>
                        <strong>{a.cliente}</strong>
                        <span>{a.padrao}</span>
                        <small>{textoAlerta(a)}</small>
                      </div>
                      <Link
                        className="botao botao--primario botao--pequeno"
                        to={`/gestor/ordens/nova?clienteId=${a.clienteId}&data=${a.dataPrevista < dados.hoje ? dados.hoje : a.dataPrevista}`}
                      >
                        <Plus size={16} aria-hidden />
                        Criar ordem
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio icone={CircleCheck}>Nenhum cliente com coleta esperada para os próximos dias.</Vazio>
              )}
            </section>

            <section className="cartao">
              <h2>Padrões por cliente</h2>
              <div className="tabela-rolagem" tabIndex={0} role="region" aria-label="Padrões por cliente">
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
                        <td
                          className={`tabela__quebra ${c.recorrencia.tipo === 'INSUFICIENTE' ? 'texto-suave' : ''}`}
                        >
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
              <Info size={16} aria-hidden />
              <span>
                <strong>Como calculamos:</strong> o padrão considera o intervalo entre as coletas (sem as canceladas) e o
                dia da semana ou do mês que mais se repete, exigindo ao menos 3 coletas. A regularidade é a proporção de
                coletas que seguem o padrão. A tendência usa regressão linear sobre o peso estimado e só é indicada quando
                a variação passa de 5% ao mês com ajuste consistente (R² de pelo menos 0,3).
              </span>
            </p>
          </>
        )
      )}
    </>
  )
}
