import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { rotaInicial } from '../auth/contexto.ts'
import { useAuth } from '../auth/useAuth.ts'
import { MensagemErro } from '../componentes/Estados.tsx'

export function Login() {
  const { usuario, entrar } = useAuth()
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={rotaInicial(usuario.perfil)} replace />

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const logado = await entrar(email, senha)
      navegar(rotaInicial(logado.perfil), { replace: true })
    } catch (e) {
      setErro(e)
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <section className="login__marca">
        <img src="/favicon.svg" alt="" width={56} height={56} />
        <h1>SIGCF</h1>
        <p>Gestão de coleta e frota para pequenas e médias transportadoras.</p>
      </section>

      <form className="login__form cartao" onSubmit={enviar}>
        <h2>Entrar</h2>
        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        <MensagemErro erro={erro} />
        <button type="submit" className="botao botao--primario botao--largo" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
