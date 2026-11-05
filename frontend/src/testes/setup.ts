import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// O jsdom ainda não implementa a abertura modal do <dialog>.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
HTMLDialogElement.prototype.close = function () {
  this.open = false
  this.dispatchEvent(new Event('close'))
}

// O jsdom não implementa matchMedia; por padrão, nenhuma media query corresponde.
window.matchMedia = ((media: string) => ({ matches: false, media })) as unknown as typeof window.matchMedia

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
