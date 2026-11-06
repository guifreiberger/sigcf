export type Predefinido = '30dias' | 'mes' | 'mesPassado' | '12meses'

export const PERIODOS: { valor: Predefinido; rotulo: string }[] = [
  { valor: '30dias', rotulo: 'Últimos 30 dias' },
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'mesPassado', rotulo: 'Mês passado' },
  { valor: '12meses', rotulo: 'Últimos 12 meses' },
]

function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

const primeiroDia = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}-01`

// Períodos prontos dos filtros do dashboard e do relatório, a partir de "hoje" (AAAA-MM-DD).
export function periodoPredefinido(chave: Predefinido, hoje: string) {
  const [ano, mes] = hoje.split('-').map(Number)
  switch (chave) {
    case '30dias':
      return { de: somarDias(hoje, -29), ate: hoje }
    case 'mes':
      return { de: primeiroDia(ano, mes), ate: hoje }
    case 'mesPassado': {
      const [anoAnterior, mesAnterior] = mes === 1 ? [ano - 1, 12] : [ano, mes - 1]
      return { de: primeiroDia(anoAnterior, mesAnterior), ate: somarDias(primeiroDia(ano, mes), -1) }
    }
    case '12meses': {
      const meses = ano * 12 + (mes - 1) - 11
      return { de: primeiroDia(Math.floor(meses / 12), (meses % 12) + 1), ate: hoje }
    }
  }
}
