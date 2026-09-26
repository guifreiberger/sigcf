import { hash } from 'bcryptjs';
import type { EntityManager } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity.js';
import { hoje, somarDias } from '../common/data.js';
import { HistoricoStatus } from '../ordens/historico-status.entity.js';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { StatusOrdem } from '../ordens/status-ordem.enum.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Veiculo } from '../veiculos/veiculo.entity.js';
import dataSource from './data-source.js';

const { AGUARDANDO, EM_ANDAMENTO, CONCLUIDA, FALHA, CANCELADA } = StatusOrdem;

async function popular(em: EntityManager, senha: string) {
  const senhaHash = await hash(senha, 10);
  const [gestor, joao, maria] = await em.save(Usuario, [
    {
      nome: 'Carlos Menezes',
      email: 'gestor@sigcf.local',
      senhaHash,
      perfil: Perfil.GESTOR,
    },
    {
      nome: 'João da Silva',
      email: 'joao@sigcf.local',
      senhaHash,
      perfil: Perfil.MOTORISTA,
      telefone: '47991234567',
      cnh: '12345678901',
    },
    {
      nome: 'Maria Oliveira',
      email: 'maria@sigcf.local',
      senhaHash,
      perfil: Perfil.MOTORISTA,
      telefone: '47998765432',
    },
  ]);

  const [caminhao, toco, utilitario] = await em.save(Veiculo, [
    { placa: 'QJA1B23', modelo: 'VW Delivery 11.180', capacidadeKg: 6000 },
    {
      placa: 'MHK4521',
      modelo: 'Mercedes-Benz Accelo 1016',
      capacidadeKg: 5200,
    },
    { placa: 'RLS2C45', modelo: 'Fiat Fiorino', capacidadeKg: 650 },
  ]);

  const [mercado, metalurgica, reciclagem] = await em.save(Cliente, [
    {
      nome: 'Mercado Bom Preço',
      telefone: '4733221100',
      endereco: 'Rua XV de Novembro, 1200 - Centro, Joinville/SC',
    },
    {
      nome: 'Metalúrgica Schulz',
      telefone: '4733445566',
      endereco: 'Rua Dona Francisca, 8300 - Distrito Industrial, Joinville/SC',
    },
    {
      nome: 'Recicla Norte',
      telefone: null,
      endereco: 'Av. Getúlio Vargas, 450 - Centro, Jaraguá do Sul/SC',
    },
  ]);

  const dia = hoje();
  const planos = [
    {
      motorista: joao,
      veiculo: caminhao,
      cliente: mercado,
      trilha: [AGUARDANDO],
    },
    {
      motorista: joao,
      veiculo: caminhao,
      cliente: metalurgica,
      trilha: [AGUARDANDO, EM_ANDAMENTO],
    },
    {
      motorista: joao,
      veiculo: caminhao,
      cliente: reciclagem,
      trilha: [AGUARDANDO, EM_ANDAMENTO, CONCLUIDA],
    },
    {
      motorista: maria,
      veiculo: utilitario,
      cliente: mercado,
      trilha: [AGUARDANDO],
    },
    {
      motorista: maria,
      veiculo: utilitario,
      cliente: metalurgica,
      trilha: [AGUARDANDO, EM_ANDAMENTO, FALHA],
      motivo: 'Portão fechado, cliente ausente no local',
    },
    {
      motorista: maria,
      veiculo: toco,
      cliente: reciclagem,
      trilha: [AGUARDANDO, CANCELADA],
      motivo: 'Cliente cancelou a solicitação por telefone',
    },
    {
      motorista: joao,
      veiculo: toco,
      cliente: metalurgica,
      trilha: [AGUARDANDO],
      data: somarDias(dia, 1),
    },
  ];

  for (const plano of planos) {
    const statusFinal = plano.trilha[plano.trilha.length - 1];
    const ordem = await em.save(OrdemColeta, {
      clienteId: plano.cliente.id,
      veiculoId: plano.veiculo.id,
      motoristaId: plano.motorista.id,
      criadoPorId: gestor.id,
      enderecoColeta: plano.cliente.endereco,
      dataColeta: plano.data ?? dia,
      status: statusFinal,
    });

    await em.insert(
      HistoricoStatus,
      plano.trilha.map((status, i) => ({
        ordemId: ordem.id,
        usuarioId:
          status === AGUARDANDO || status === CANCELADA
            ? gestor.id
            : plano.motorista.id,
        statusAnterior: i === 0 ? null : plano.trilha[i - 1],
        statusNovo: status,
        motivo:
          status === FALHA || status === CANCELADA
            ? (plano.motivo ?? null)
            : null,
      })),
    );
  }
}

async function executar() {
  const senha = process.env.SEED_SENHA;
  if (!senha) throw new Error('Defina SEED_SENHA no .env para rodar o seed.');

  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    if ((await dataSource.getRepository(Usuario).count()) > 0) {
      console.log('O banco já possui usuários; seed ignorado.');
      return;
    }
    await dataSource.transaction((em) => popular(em, senha));
    console.log(
      'Seed concluído: 3 usuários, 3 veículos, 3 clientes e 7 ordens.',
    );
  } finally {
    await dataSource.destroy();
  }
}

await executar();
