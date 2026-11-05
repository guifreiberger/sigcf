/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Endereço completo da API, usado só no app Android (no navegador a API fica em /api).
  readonly VITE_API_URL?: string
}
