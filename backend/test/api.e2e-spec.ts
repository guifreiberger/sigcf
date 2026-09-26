import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Cliente } from '../src/clientes/cliente.entity.js';
import { hoje } from '../src/common/data.js';
import { Perfil } from '../src/usuarios/perfil.enum.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { Veiculo } from '../src/veiculos/veiculo.entity.js';

const BANCO_DE_TESTES = 'sigcf_test';
process.env.DB_NAME = BANCO_DE_TESTES;

const { AppModule } = await import('../src/app.module.js');
const { configurarApp } = await import('../src/app.setup.js');

type Quem = 'gestor' | 'joao' | 'maria';

describe('API do SIGCF (e2e)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<Quem, string>;
  const ids = {} as Record<
    'joao' | 'maria' | 'cliente' | 'veiculo' | 'veiculoInativo',
    number
  >;

  const api = () => request(app.getHttpServer());
  const como = (quem: Quem) => ({ Authorization: `Bearer ${tokens[quem]}` });
  const novaOrdem = () => ({
    clienteId: ids.cliente,
    veiculoId: ids.veiculo,
    motoristaId: ids.joao,
    dataColeta: hoje(),
  });
  const alterarStatus = (quem: Quem, ordem: number, corpo: object) =>
    api().patch(`/api/ordens/${ordem}/status`).set(como(quem)).send(corpo);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configurarApp(moduleRef.createNestApplication());
    await app.init();

    const ds = app.get(DataSource);
    if (ds.options.database !== BANCO_DE_TESTES) {
      throw new Error(
        `Os testes e2e só podem rodar no banco ${BANCO_DE_TESTES}.`,
      );
    }
    await ds.synchronize(true);

    const senhaHash = await hash('senha-e2e', 4);
    const [, joao, maria] = await ds.getRepository(Usuario).save([
      {
        nome: 'Gestor',
        email: 'gestor@e2e.local',
        senhaHash,
        perfil: Perfil.GESTOR,
      },
      {
        nome: 'João',
        email: 'joao@e2e.local',
        senhaHash,
        perfil: Perfil.MOTORISTA,
        telefone: '47911111111',
      },
      {
        nome: 'Maria',
        email: 'maria@e2e.local',
        senhaHash,
        perfil: Perfil.MOTORISTA,
        telefone: '47922222222',
      },
    ]);
    const [veiculo, veiculoInativo] = await ds.getRepository(Veiculo).save([
      { placa: 'AAA1111', modelo: 'Caminhão', capacidadeKg: 5000 },
      { placa: 'BBB2222', modelo: 'Parado', capacidadeKg: 3000, ativo: false },
    ]);
    const cliente = await ds
      .getRepository(Cliente)
      .save({ nome: 'Cliente Teste', endereco: 'Rua do Teste, 100' });
    Object.assign(ids, {
      joao: joao.id,
      maria: maria.id,
      cliente: cliente.id,
      veiculo: veiculo.id,
      veiculoInativo: veiculoInativo.id,
    });

    for (const quem of ['gestor', 'joao', 'maria'] as const) {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: `${quem}@e2e.local`, senha: 'senha-e2e' })
        .expect(200);
      tokens[quem] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('autenticação e autorização', () => {
    it('recusa credenciais inválidas', () =>
      api()
        .post('/api/auth/login')
        .send({ email: 'gestor@e2e.local', senha: 'errada' })
        .expect(401));

    it('exige token nas rotas protegidas', () =>
      api().get('/api/veiculos').expect(401));

    it('mantém o health check público', () =>
      api().get('/api/health').expect(200, { status: 'ok' }));

    it('não expõe o hash da senha', async () => {
      const res = await api()
        .get('/api/auth/me')
        .set(como('gestor'))
        .expect(200);
      expect(res.body.perfil).toBe('GESTOR');
      expect(res.body).not.toHaveProperty('senhaHash');
    });

    it('impede o motorista de acessar os cadastros', () =>
      api().get('/api/veiculos').set(como('joao')).expect(403));
  });

  describe('RF01 — cadastros', () => {
    it('normaliza a placa e impede duplicidade', async () => {
      const res = await api()
        .post('/api/veiculos')
        .set(como('gestor'))
        .send({ placa: 'abc-1d23', modelo: 'Fiorino', capacidadeKg: 650.5 })
        .expect(201);
      expect(res.body).toMatchObject({ placa: 'ABC1D23', capacidadeKg: 650.5 });

      await api()
        .post('/api/veiculos')
        .set(como('gestor'))
        .send({ placa: 'ABC1D23', modelo: 'Outro', capacidadeKg: 100 })
        .expect(409);
    });

    it('rejeita dados inválidos e campos desconhecidos', async () => {
      await api()
        .post('/api/veiculos')
        .set(como('gestor'))
        .send({ placa: '123', modelo: 'X', capacidadeKg: 10 })
        .expect(400);
      await api()
        .post('/api/veiculos')
        .set(como('gestor'))
        .send({
          placa: 'CCC3333',
          modelo: 'X',
          capacidadeKg: 10,
          ativo: false,
          id: 99,
        })
        .expect(400);
    });

    it('cadastra motorista normalizando e-mail e telefone', async () => {
      const res = await api()
        .post('/api/motoristas')
        .set(como('gestor'))
        .send({
          nome: 'Pedro',
          email: ' PEDRO@e2e.local ',
          senha: 'segredo1',
          telefone: '(47) 99999-0000',
        })
        .expect(201);
      expect(res.body).toMatchObject({
        email: 'pedro@e2e.local',
        telefone: '47999990000',
        perfil: 'MOTORISTA',
        ativo: true,
      });
      expect(res.body).not.toHaveProperty('senhaHash');
    });

    it('filtra por situação ativa/inativa', async () => {
      const res = await api()
        .get('/api/veiculos?ativo=false')
        .set(como('gestor'))
        .expect(200);
      expect(res.body.map((v: Veiculo) => v.id)).toEqual([ids.veiculoInativo]);
    });

    it('desativa sem apagar o registro', async () => {
      const { body } = await api()
        .post('/api/clientes')
        .set(como('gestor'))
        .send({ nome: 'Temporário', endereco: 'Rua A, 1' })
        .expect(201);
      await api()
        .delete(`/api/clientes/${body.id}`)
        .set(como('gestor'))
        .expect(204);
      const res = await api()
        .get(`/api/clientes/${body.id}`)
        .set(como('gestor'))
        .expect(200);
      expect(res.body.ativo).toBe(false);
    });
  });

  describe('RF02 a RF04 — ciclo de vida da ordem de coleta', () => {
    let ordem: number;
    let ordemParaCancelar: number;

    it('RF02: somente o gestor cria ordens', () =>
      api()
        .post('/api/ordens')
        .set(como('joao'))
        .send(novaOrdem())
        .expect(403));

    it('RF02: exige veículo ativo', () =>
      api()
        .post('/api/ordens')
        .set(como('gestor'))
        .send({ ...novaOrdem(), veiculoId: ids.veiculoInativo })
        .expect(422));

    it('RF02: não agenda coletas no passado', () =>
      api()
        .post('/api/ordens')
        .set(como('gestor'))
        .send({ ...novaOrdem(), dataColeta: '2020-01-01' })
        .expect(422));

    it('RF02: cria a ordem com endereço do cliente e histórico inicial', async () => {
      const res = await api()
        .post('/api/ordens')
        .set(como('gestor'))
        .send(novaOrdem())
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'AGUARDANDO',
        dataColeta: hoje(),
        enderecoColeta: 'Rua do Teste, 100',
        transicoesPermitidas: ['CANCELADA'],
      });
      expect(res.body.historico).toHaveLength(1);
      ordem = res.body.id;

      const outra = await api()
        .post('/api/ordens')
        .set(como('gestor'))
        .send(novaOrdem())
        .expect(201);
      ordemParaCancelar = outra.body.id;
    });

    it('RF03: cada motorista vê apenas as próprias coletas do dia', async () => {
      const doJoao = await api()
        .get('/api/ordens/minhas')
        .set(como('joao'))
        .expect(200);
      expect(doJoao.body.map((o: { id: number }) => o.id)).toEqual([
        ordem,
        ordemParaCancelar,
      ]);
      expect(doJoao.body[0].transicoesPermitidas).toEqual(['EM_ANDAMENTO']);

      const daMaria = await api()
        .get('/api/ordens/minhas')
        .set(como('maria'))
        .expect(200);
      expect(daMaria.body).toEqual([]);

      await api().get(`/api/ordens/${ordem}`).set(como('maria')).expect(404);
      await alterarStatus('maria', ordem, { status: 'EM_ANDAMENTO' }).expect(
        404,
      );
    });

    it('RF04: não permite pular etapas', () =>
      alterarStatus('joao', ordem, { status: 'CONCLUIDA' }).expect(409));

    it('RF04: motorista não pode cancelar', () =>
      alterarStatus('joao', ordem, {
        status: 'CANCELADA',
        motivo: 'Desisti',
      }).expect(403));

    it('RF04: falha exige motivo e fica registrada no histórico', async () => {
      const iniciada = await alterarStatus('joao', ordem, {
        status: 'EM_ANDAMENTO',
      }).expect(200);
      expect(iniciada.body.transicoesPermitidas).toEqual([
        'CONCLUIDA',
        'FALHA',
      ]);

      await alterarStatus('joao', ordem, { status: 'FALHA' }).expect(400);

      const res = await alterarStatus('joao', ordem, {
        status: 'FALHA',
        motivo: 'Portão fechado',
      }).expect(200);
      expect(
        res.body.historico.map((h: { statusNovo: string }) => h.statusNovo),
      ).toEqual(['AGUARDANDO', 'EM_ANDAMENTO', 'FALHA']);
      expect(res.body.historico[2]).toMatchObject({
        statusAnterior: 'EM_ANDAMENTO',
        motivo: 'Portão fechado',
        usuario: { id: ids.joao },
      });
    });

    it('RF04: estado final não pode ser alterado', () =>
      alterarStatus('joao', ordem, { status: 'EM_ANDAMENTO' }).expect(409));

    it('RF04: gestor cancela informando o motivo', async () => {
      await alterarStatus('gestor', ordemParaCancelar, {
        status: 'CANCELADA',
      }).expect(400);
      const res = await alterarStatus('gestor', ordemParaCancelar, {
        status: 'CANCELADA',
        motivo: 'Cliente desistiu',
      }).expect(200);
      expect(res.body.status).toBe('CANCELADA');
    });

    it('painel do gestor resume as coletas do dia por status', async () => {
      const res = await api()
        .get('/api/ordens/resumo')
        .set(como('gestor'))
        .expect(200);
      expect(res.body).toMatchObject({
        data: hoje(),
        total: 2,
        porStatus: { AGUARDANDO: 0, EM_ANDAMENTO: 0, FALHA: 1, CANCELADA: 1 },
      });
    });
  });
});
