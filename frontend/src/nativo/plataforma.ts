import { Capacitor } from '@capacitor/core'

// Verdadeiro quando o SIGCF roda dentro do app Android, e não no navegador.
export function ehAppNativo() {
  return Capacitor.isNativePlatform()
}
