import type { Localizacao } from '../api/tipos.ts'

const arredondar = (valor: number) => Number(valor.toFixed(6))

// Nunca rejeita: sem permissão, sem GPS ou sem resposta a tempo, a ação segue sem localização.
export function obterLocalizacao(): Promise<Localizacao | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: arredondar(coords.latitude),
          longitude: arredondar(coords.longitude),
          precisaoMetros: Math.round(coords.accuracy),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 },
    )
  })
}

export async function localizacaoBloqueada() {
  try {
    const permissao = await navigator.permissions.query({ name: 'geolocation' })
    return permissao.state === 'denied'
  } catch {
    return false
  }
}
