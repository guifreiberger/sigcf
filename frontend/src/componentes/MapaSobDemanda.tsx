import { type ComponentProps, lazy, Suspense } from 'react'
import { Carregando } from './Estados.tsx'

// O Leaflet só é baixado nas telas do gestor que mostram mapa; o celular do motorista não precisa dele.
const MapaLeaflet = lazy(() => import('./Mapa.tsx').then((modulo) => ({ default: modulo.Mapa })))

export function Mapa(props: ComponentProps<typeof MapaLeaflet>) {
  return (
    <Suspense fallback={<Carregando texto="Carregando o mapa…" />}>
      <MapaLeaflet {...props} />
    </Suspense>
  )
}
