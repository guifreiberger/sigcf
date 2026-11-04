import 'leaflet/dist/leaflet.css'
import type { LatLngTuple } from 'leaflet'
import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'

const JARAGUA_DO_SUL: LatLngTuple = [-26.4851, -49.0713]

// O Leaflet desenha em SVG e não lê variáveis CSS: estas são as cores do tema (index.css).
const GRAFITE = '#18181b'
const AMARELO = '#facc15'
const VERDE = '#15803d'

export interface MarcadorMapa {
  id: number | string
  posicao: LatLngTuple
  rotulo: string
  tipo?: 'inicio' | 'atual'
}

interface Props {
  rotulo: string
  trajeto?: LatLngTuple[]
  marcadores?: MarcadorMapa[]
}

// Enquadra o mapa só na primeira vez que há pontos, para não tirar o zoom de quem está olhando
// enquanto as posições ao vivo chegam.
function Enquadrar({ pontos }: { pontos: LatLngTuple[] }) {
  const mapa = useMap()
  const enquadrado = useRef(false)

  useEffect(() => {
    if (enquadrado.current || pontos.length === 0) return
    enquadrado.current = true
    if (pontos.length === 1) mapa.setView(pontos[0], 15)
    else mapa.fitBounds(pontos, { padding: [32, 32], maxZoom: 16 })
  }, [mapa, pontos])

  return null
}

export function Mapa({ rotulo, trajeto = [], marcadores = [] }: Props) {
  return (
    <div className="mapa" role="region" aria-label={rotulo}>
      <MapContainer center={JARAGUA_DO_SUL} zoom={13} scrollWheelZoom={false} className="mapa__area">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {trajeto.length > 1 && (
          <Polyline positions={trajeto} pathOptions={{ color: GRAFITE, weight: 4, opacity: 0.8 }} />
        )}
        {marcadores.map((m) => (
          <CircleMarker
            key={m.id}
            center={m.posicao}
            radius={m.tipo === 'inicio' ? 6 : 9}
            pathOptions={
              m.tipo === 'inicio'
                ? { color: '#ffffff', weight: 2, fillColor: VERDE, fillOpacity: 1 }
                : { color: GRAFITE, weight: 3, fillColor: AMARELO, fillOpacity: 1 }
            }
          >
            <Tooltip>{m.rotulo}</Tooltip>
          </CircleMarker>
        ))}
        <Enquadrar pontos={[...trajeto, ...marcadores.map((m) => m.posicao)]} />
      </MapContainer>
    </div>
  )
}
