import {
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  Smartphone,
  Sparkles,
  Truck,
} from 'lucide-react'
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
  const [mostrarSenha, setMostrarSenha] = useState(false)
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
      <section className="login__lado">
        <div className="marca">
          <span className="marca__icone">
            <Truck size={20} strokeWidth={2.25} aria-hidden />
          </span>
          <span className="marca__textos">
            <strong className="marca__nome">SIGCF</strong>
            <span className="marca__sub">Gestão de coleta e frota</span>
          </span>
        </div>

        <h1 className="login__titulo">
          Coletas organizadas, do <em>pedido</em> à <em>conclusão</em>.
        </h1>

        <ul className="login__beneficios">
          <li>
            <ClipboardList aria-hidden />
            Pedidos registrados em um só lugar
          </li>
          <li>
            <Smartphone aria-hidden />
            Motoristas atualizam o status pelo celular
          </li>
          <li>
            <Sparkles aria-hidden />
            Alertas das coletas que os clientes costumam pedir
          </li>
        </ul>

        <p className="login__rodape">Sistema Inteligente de Gestão de Coleta e Frota</p>
        <Truck className="login__decoracao" size={340} strokeWidth={0.9} aria-hidden />
      </section>

      <section className="login__area">
        <form className="login__form" onSubmit={enviar}>
          <div>
            <h2>Entrar</h2>
            <p className="texto-suave">Use o e-mail e a senha cadastrados pelo gestor.</p>
          </div>

          <label className="campo">
            <span>E-mail</span>
            <span className="campo-com-icone">
              <Mail size={18} aria-hidden />
              <input
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="nome@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </span>
          </label>

          <label className="campo">
            <span>Senha</span>
            <span className="campo-com-icone">
              <Lock size={18} aria-hidden />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              <button
                type="button"
                className="botao-icone campo__alternar"
                onClick={() => setMostrarSenha((m) => !m)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </span>
          </label>

          <MensagemErro erro={erro} />

          <button type="submit" className="botao botao--primario botao--largo botao--grande" disabled={enviando}>
            {enviando ? (
              <>
                <LoaderCircle size={18} className="girar" aria-hidden />
                Entrando…
              </>
            ) : (
              <>
                Entrar
                <ArrowRight size={18} aria-hidden />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  )
}
