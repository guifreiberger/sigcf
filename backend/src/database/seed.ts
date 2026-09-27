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

const MOTIVOS_FALHA = [
  'Portão fechado, cliente ausente no local',
  'Material não estava separado para a coleta',
  'Acesso bloqueado por obra na rua',
];
const MOTIVO_CANCELAMENTO = 'Cliente cancelou a solicitação por telefone';

interface Pedido {
  cliente: Cliente;
  data: string;
  kg: number | null;
  status: StatusOrdem;
  motorista: Usuario;
  local: [number, number];
}

// Semente fixa: o seed gera sempre os mesmos dados, o que torna a demonstração reproduzível.
function criarAleatorio(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1_103_515_245 + 12_345) % 2 ** 31;
    return estado / 2 ** 31;
  };
}

function mesesAntes(data: string, meses: number, dia: number) {
  const [ano, mes] = data.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes - meses, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes - 1 - meses, Math.min(dia, ultimoDia), 12))
    .toISOString()
    .slice(0, 10);
}

function trilha(status: StatusOrdem): StatusOrdem[] {
  if (status === CANCELADA) return [AGUARDANDO, CANCELADA];
  if (status === AGUARDANDO) return [AGUARDANDO];
  if (status === EM_ANDAMENTO) return [AGUARDANDO, EM_ANDAMENTO];
  return [AGUARDANDO, EM_ANDAMENTO, status];
}

async function registrar(
  em: EntityManager,
  pedidos: Pedido[],
  gestor: Usuario,
  veiculos: Veiculo[],
  aleatorio: () => number,
  diaAtual: string,
) {
  for (const p of pedidos) {
    const passado = p.data < diaAtual;
    const hora = (h: number, m = 0) =>
      new Date(
        `${p.data}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`,
      );
    const criadaEm = new Date(`${somarDias(p.data, -1)}T17:20:00Z`);
    const veiculo =
      p.kg !== null && p.kg <= 600
        ? veiculos[2]
        : p.kg !== null && p.kg > 5000
          ? veiculos[0]
          : veiculos[1];

    const ordem = await em.save(OrdemColeta, {
      clienteId: p.cliente.id,
      veiculoId: veiculo.id,
      motoristaId: p.motorista.id,
      criadoPorId: gestor.id,
      enderecoColeta: p.cliente.endereco,
      dataColeta: p.data,
      pesoEstimadoKg: p.kg,
      status: p.status,
      ...(passado ? { createdAt: criadaEm, updatedAt: hora(12, 40) } : {}),
    });

    const etapas = trilha(p.status);
    const minutoInicio = Math.floor(aleatorio() * 180);
    await em.insert(
      HistoricoStatus,
      etapas.map((status, i) => {
        const doMotorista = status !== AGUARDANDO && status !== CANCELADA;
        const minutos = minutoInicio + (i - 1) * 45;
        return {
          ordemId: ordem.id,
          usuarioId: doMotorista ? p.motorista.id : gestor.id,
          statusAnterior: i === 0 ? null : etapas[i - 1],
          statusNovo: status,
          motivo:
            status === FALHA
              ? MOTIVOS_FALHA[Math.floor(aleatorio() * MOTIVOS_FALHA.length)]
              : status === CANCELADA
                ? MOTIVO_CANCELAMENTO
                : null,
          latitude: doMotorista
            ? Number((p.local[0] + (aleatorio() - 0.5) * 0.0006).toFixed(6))
            : null,
          longitude: doMotorista
            ? Number((p.local[1] + (aleatorio() - 0.5) * 0.0006).toFixed(6))
            : null,
          precisaoMetros: doMotorista ? 6 + Math.floor(aleatorio() * 20) : null,
          ...(passado
            ? {
                createdAt:
                  i === 0
                    ? criadaEm
                    : hora(11 + Math.floor(minutos / 60), minutos % 60),
              }
            : {}),
        };
      }),
    );
  }
}

async function popular(em: EntityManager, senha: string) {
  const aleatorio = criarAleatorio(2026);
  const ruido = (amplitude: number) => (aleatorio() - 0.5) * 2 * amplitude;
  const statusHistorico = () => {
    const sorteio = aleatorio();
    return sorteio < 0.05 ? FALHA : sorteio < 0.08 ? CANCELADA : CONCLUIDA;
  };

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

  const veiculos = await em.save(Veiculo, [
    { placa: 'QJA1B23', modelo: 'VW Delivery 11.180', capacidadeKg: 6000 },
    {
      placa: 'MHK4521',
      modelo: 'Mercedes-Benz Accelo 1016',
      capacidadeKg: 5200,
    },
    { placa: 'RLS2C45', modelo: 'Fiat Fiorino', capacidadeKg: 650 },
  ]);

  const [malharia, supermercado, metalurgica, fundicao, farmacia, centro] =
    await em.save(Cliente, [
      {
        nome: 'Malharia Vale do Itapocu',
        telefone: '4733710001',
        endereco: 'Rua das Malharias, 1200 - Vila Lalau, Jaraguá do Sul/SC',
      },
      {
        nome: 'Supermercado Bom Jardim',
        telefone: '4733710002',
        endereco: 'Av. Central, 455 - Centro, Jaraguá do Sul/SC',
      },
      {
        nome: 'Metalúrgica Rio Molha',
        telefone: '4733710003',
        endereco: 'Rua dos Metalúrgicos, 3100 - Rio Molha, Jaraguá do Sul/SC',
      },
      {
        nome: 'Fundição Barra do Rio',
        telefone: '4733710004',
        endereco: 'Rua da Fundição, 780 - Barra do Rio, Jaraguá do Sul/SC',
      },
      {
        nome: 'Farmácia Vila Nova',
        telefone: null,
        endereco: 'Rua das Flores, 90 - Vila Nova, Jaraguá do Sul/SC',
      },
      {
        nome: 'Centro Comercial Amizade',
        telefone: '4733710006',
        endereco: 'Rua do Comércio, 1500 - Amizade, Jaraguá do Sul/SC',
      },
    ]);

  const locais = new Map<Cliente, [number, number]>([
    [malharia, [-26.4702, -49.0901]],
    [supermercado, [-26.4862, -49.0683]],
    [metalurgica, [-26.4481, -49.1203]],
    [fundicao, [-26.4452, -49.0851]],
    [farmacia, [-26.5003, -49.0752]],
    [centro, [-26.4833, -49.0721]],
  ]);

  const dia = hoje();
  const pedidos: Pedido[] = [];
  const serie = (
    cliente: Cliente,
    datas: string[],
    peso: (i: number) => number | null,
  ) =>
    datas.forEach((data, i) =>
      pedidos.push({
        cliente,
        data,
        kg: peso(i),
        // As duas últimas coletas de cada série ficam concluídas para a previsão partir de datas reais.
        status: i >= datas.length - 2 ? CONCLUIDA : statusHistorico(),
        motorista: i % 2 === 0 ? joao : maria,
        local: locais.get(cliente) ?? [0, 0],
      }),
    );

  // Mensal, peso em alta: a coleta deste mês era esperada há 4 dias e ainda não foi pedida.
  const esperadaMalharia = somarDias(dia, -4);
  const diaMalharia = Number(esperadaMalharia.slice(8, 10));
  serie(
    malharia,
    Array.from({ length: 11 }, (_, k) =>
      mesesAntes(esperadaMalharia, 11 - k, diaMalharia),
    ),
    (i) => Math.round(900 + 85 * i + ruido(50)),
  );

  // Semanal, peso estável: a próxima coleta é esperada daqui a 2 dias.
  serie(
    supermercado,
    Array.from({ length: 52 }, (_, k) => somarDias(dia, 2 - 7 * (52 - k))),
    () => Math.round(350 + ruido(40)),
  );

  // Quinzenal, peso em queda: a próxima coleta é esperada daqui a uma semana.
  serie(
    metalurgica,
    Array.from({ length: 25 }, (_, k) => somarDias(dia, 7 - 14 * (25 - k))),
    (i) => Math.round(1300 - 30 * i + ruido(45)),
  );

  // Intervalos irregulares, de 15 a 26 dias.
  const datasFundicao = [somarDias(dia, -10)];
  while (datasFundicao.length < 16) {
    datasFundicao.unshift(
      somarDias(datasFundicao[0], -(15 + Math.floor(aleatorio() * 12))),
    );
  }
  serie(fundicao, datasFundicao, () => Math.round(600 + ruido(80)));

  // Cliente recente, ainda sem histórico suficiente.
  serie(
    farmacia,
    [somarDias(dia, -40), somarDias(dia, -18)],
    (i) => [150, 180][i],
  );

  // Coletas de hoje e de amanhã, para a tela do motorista.
  const doDia = (
    cliente: Cliente,
    motorista: Usuario,
    status: StatusOrdem,
    kg: number | null,
    data = dia,
  ) =>
    pedidos.push({
      cliente,
      data,
      kg,
      status,
      motorista,
      local: locais.get(cliente) ?? [0, 0],
    });
  doDia(fundicao, joao, AGUARDANDO, 620);
  doDia(farmacia, joao, EM_ANDAMENTO, 160);
  doDia(centro, joao, CONCLUIDA, 400);
  doDia(centro, maria, AGUARDANDO, null);
  doDia(fundicao, maria, FALHA, 580);
  doDia(farmacia, maria, CANCELADA, 140);
  doDia(centro, joao, AGUARDANDO, 380, somarDias(dia, 1));

  await registrar(em, pedidos, gestor, veiculos, aleatorio, dia);
  return pedidos.length;
}

async function executar() {
  const senha = process.env.SEED_SENHA;
  if (!senha) throw new Error('Defina SEED_SENHA no .env para rodar o seed.');

  const recriar = process.argv.includes('--recriar');
  if (recriar && process.env.NODE_ENV === 'production') {
    throw new Error(
      '--recriar apaga todos os dados e não pode rodar em produção.',
    );
  }

  await dataSource.initialize();
  try {
    if (recriar) await dataSource.dropDatabase();
    await dataSource.runMigrations();
    if ((await dataSource.getRepository(Usuario).count()) > 0) {
      console.log(
        'O banco já possui usuários; seed ignorado. Use `npm run seed:recriar` para apagar e recriar.',
      );
      return;
    }
    const total = await dataSource.transaction((em) => popular(em, senha));
    console.log(
      `Seed concluído: 3 usuários, 3 veículos, 6 clientes e ${total} ordens com histórico de 12 meses.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

await executar();
