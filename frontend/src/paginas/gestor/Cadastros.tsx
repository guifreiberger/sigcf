import { formatarKg, formatarPlaca, formatarTelefone } from '../../util/formatos.ts'
import { PaginaCadastro } from './PaginaCadastro.tsx'

export function Motoristas() {
  return (
    <PaginaCadastro
      recurso="motoristas"
      titulo="Motoristas"
      descricao="Cada motorista acessa o sistema pelo celular com o e-mail e a senha cadastrados aqui."
      singular="motorista"
      colunas={[
        { titulo: 'Nome', valor: (m) => <strong>{m.nome}</strong> },
        { titulo: 'E-mail', valor: (m) => m.email },
        { titulo: 'Telefone', valor: (m) => formatarTelefone(m.telefone) },
        { titulo: 'CNH', valor: (m) => m.cnh ?? '—' },
      ]}
      campos={[
        { nome: 'nome', rotulo: 'Nome', obrigatorio: true, maxLength: 120 },
        { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true, maxLength: 160 },
        { nome: 'senha', rotulo: 'Senha', tipo: 'password', obrigatorio: true, maxLength: 72 },
        { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', obrigatorio: true, placeholder: '(47) 99999-9999' },
        { nome: 'cnh', rotulo: 'CNH', placeholder: '11 dígitos' },
      ]}
    />
  )
}

export function Veiculos() {
  return (
    <PaginaCadastro
      recurso="veiculos"
      titulo="Veículos"
      descricao="Somente veículos ativos podem ser atribuídos a novas ordens de coleta."
      singular="veículo"
      colunas={[
        { titulo: 'Placa', valor: (v) => <strong>{formatarPlaca(v.placa)}</strong> },
        { titulo: 'Modelo', valor: (v) => v.modelo },
        { titulo: 'Capacidade', valor: (v) => formatarKg(v.capacidadeKg) },
      ]}
      campos={[
        { nome: 'placa', rotulo: 'Placa', obrigatorio: true, maxLength: 8, placeholder: 'ABC1D23' },
        { nome: 'modelo', rotulo: 'Modelo', obrigatorio: true, maxLength: 80 },
        { nome: 'capacidadeKg', rotulo: 'Capacidade de carga (kg)', tipo: 'number', obrigatorio: true, step: '0.01' },
      ]}
    />
  )
}

export function Clientes() {
  return (
    <PaginaCadastro
      recurso="clientes"
      titulo="Clientes"
      descricao="O endereço do cliente é sugerido automaticamente ao criar uma ordem de coleta."
      singular="cliente"
      colunas={[
        { titulo: 'Nome', valor: (c) => <strong>{c.nome}</strong> },
        { titulo: 'Telefone', valor: (c) => formatarTelefone(c.telefone) },
        { titulo: 'Endereço', valor: (c) => c.endereco },
      ]}
      campos={[
        { nome: 'nome', rotulo: 'Nome', obrigatorio: true, maxLength: 120 },
        { nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', placeholder: '(47) 3333-3333' },
        { nome: 'endereco', rotulo: 'Endereço', obrigatorio: true, maxLength: 255 },
      ]}
    />
  )
}
