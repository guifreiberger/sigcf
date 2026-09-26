import { type FormEvent, type ReactNode, useState } from 'react'
import {
  type Recurso,
  type TipoPorRecurso,
  useAlternarAtivo,
  useCadastro,
  useSalvarCadastro,
} from '../../api/consultas.ts'
import { Dialogo } from '../../componentes/Dialogo.tsx'
import { Carregando, MensagemErro, Vazio } from '../../componentes/Estados.tsx'

export interface CampoCadastro {
  nome: string
  rotulo: string
  tipo?: 'text' | 'email' | 'password' | 'tel' | 'number'
  obrigatorio?: boolean
  maxLength?: number
  placeholder?: string
  step?: string
}

export interface ColunaCadastro<T> {
  titulo: string
  valor: (item: T) => ReactNode
}

interface Props<R extends Recurso> {
  recurso: R
  titulo: string
  descricao: string
  singular: string
  colunas: ColunaCadastro<TipoPorRecurso[R]>[]
  campos: CampoCadastro[]
}

type Situacao = 'ativos' | 'inativos' | 'todos'
const ATIVO_POR_SITUACAO = { ativos: true, inativos: false, todos: undefined }

export function PaginaCadastro<R extends Recurso>({ recurso, titulo, descricao, singular, colunas, campos }: Props<R>) {
  const [situacao, setSituacao] = useState<Situacao>('ativos')
  const [editando, setEditando] = useState<TipoPorRecurso[R] | 'novo' | null>(null)
  const lista = useCadastro(recurso, ATIVO_POR_SITUACAO[situacao])
  const alternar = useAlternarAtivo(recurso)

  return (
    <>
      <header className="pagina__topo">
        <div>
          <h1>{titulo}</h1>
          <p className="texto-suave">{descricao}</p>
        </div>
        <button type="button" className="botao botao--primario" onClick={() => setEditando('novo')}>
          Novo {singular}
        </button>
      </header>

      <section className="cartao">
        <div className="abas" role="tablist" aria-label="Situação">
          {(['ativos', 'inativos', 'todos'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={situacao === s}
              className={`aba ${situacao === s ? 'aba--ativa' : ''}`}
              onClick={() => setSituacao(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <MensagemErro erro={lista.error ?? alternar.error} />

        {lista.isPending ? (
          <Carregando />
        ) : lista.data?.length ? (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  {colunas.map((c) => (
                    <th key={c.titulo}>{c.titulo}</th>
                  ))}
                  <th>Situação</th>
                  <th className="tabela__acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.data.map((item) => (
                  <tr key={item.id} className={item.ativo ? '' : 'tabela__linha--inativa'}>
                    {colunas.map((c) => (
                      <td key={c.titulo}>{c.valor(item)}</td>
                    ))}
                    <td>
                      <span className={`selo ${item.ativo ? 'selo--ativo' : 'selo--inativo'}`}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="tabela__acoes">
                      <button type="button" className="botao botao--pequeno botao--secundario" onClick={() => setEditando(item)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="botao botao--pequeno botao--fantasma"
                        disabled={alternar.isPending}
                        onClick={() => alternar.mutate({ id: item.id, ativo: !item.ativo })}
                      >
                        {item.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vazio>Nenhum registro {situacao === 'todos' ? '' : situacao.slice(0, -1)} encontrado.</Vazio>
        )}
      </section>

      <Dialogo
        aberto={editando !== null}
        titulo={editando === 'novo' ? `Novo ${singular}` : `Editar ${singular}`}
        aoFechar={() => setEditando(null)}
      >
        {editando !== null && (
          <FormularioCadastro
            recurso={recurso}
            campos={campos}
            item={editando === 'novo' ? null : editando}
            aoConcluir={() => setEditando(null)}
          />
        )}
      </Dialogo>
    </>
  )
}

interface PropsFormulario {
  recurso: Recurso
  campos: CampoCadastro[]
  item: { id: number } | null
  aoConcluir: () => void
}

function FormularioCadastro({ recurso, campos, item, aoConcluir }: PropsFormulario) {
  const salvar = useSalvarCadastro(recurso)
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      campos.map((c) => {
        const atual = item && c.tipo !== 'password' ? (item as Record<string, unknown>)[c.nome] : ''
        return [c.nome, atual === null || atual === undefined ? '' : String(atual)]
      }),
    ),
  )

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const dados: Record<string, unknown> = {}
    for (const campo of campos) {
      const valor = valores[campo.nome].trim()
      if (campo.tipo === 'password') {
        if (valor) dados[campo.nome] = valor
      } else if (campo.tipo === 'number') {
        dados[campo.nome] = Number(valor)
      } else {
        dados[campo.nome] = valor === '' && !campo.obrigatorio ? null : valor
      }
    }
    salvar.mutate({ id: item?.id, dados }, { onSuccess: aoConcluir })
  }

  return (
    <form className="dialogo__corpo" onSubmit={enviar}>
      {campos.map((campo) => {
        const senhaNaEdicao = item !== null && campo.tipo === 'password'
        return (
          <label key={campo.nome} className="campo">
            <span>
              {senhaNaEdicao ? `Nova ${campo.rotulo.toLowerCase()} (opcional)` : campo.rotulo}
              {!campo.obrigatorio && !senhaNaEdicao && <small className="texto-suave"> (opcional)</small>}
            </span>
            <input
              type={campo.tipo ?? 'text'}
              value={valores[campo.nome]}
              onChange={(e) => setValores((v) => ({ ...v, [campo.nome]: e.target.value }))}
              required={campo.obrigatorio && !senhaNaEdicao}
              maxLength={campo.maxLength}
              minLength={campo.tipo === 'password' ? 6 : undefined}
              placeholder={campo.placeholder}
              step={campo.step}
              min={campo.tipo === 'number' ? 0 : undefined}
              autoComplete={campo.tipo === 'password' ? 'new-password' : 'off'}
            />
          </label>
        )
      })}
      <MensagemErro erro={salvar.error} />
      <footer className="dialogo__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoConcluir}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--primario" disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </footer>
    </form>
  )
}
