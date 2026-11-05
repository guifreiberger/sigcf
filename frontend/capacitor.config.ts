import type { CapacitorConfig } from '@capacitor/cli'

// App Android do motorista: o mesmo frontend, empacotado com o Capacitor para o GPS
// continuar funcionando com a tela apagada (ver docs/adr/0009).
const config: CapacitorConfig = {
  appId: 'io.github.guifreiberger.sigcf',
  appName: 'SIGCF',
  webDir: 'dist',
  android: {
    // Sem a ponte antiga, o Android para de entregar as posições após 5 minutos em segundo plano.
    useLegacyBridge: true,
  },
}

export default config
