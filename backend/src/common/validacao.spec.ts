import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarClienteDto } from '../clientes/dto/cliente.dto.js';
import {
  AtualizarMotoristaDto,
  CriarMotoristaDto,
} from '../motoristas/dto/motorista.dto.js';
import { DataQueryDto } from '../ordens/dto/ordem.dto.js';
import { AtivoQueryDto } from './ativo-query.dto.js';
import { decimalParaNumero } from './decimal.transformer.js';

// Reproduz o ValidationPipe global: transforma o JSON na classe e valida.
async function validar<T extends object>(Classe: new () => T, dados: object) {
  const instancia = plainToInstance(Classe, dados);
  const erros = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instancia, campos: erros.map((e) => e.property) };
}

const motorista = {
  nome: 'Pedro',
  email: 'pedro@sigcf.local',
  senha: 'senha-forte',
  telefone: '47988880000',
};

describe('validações compartilhadas', () => {
  describe('@IsEmailNormalizado', () => {
    it('remove espaços e converte para minúsculas antes de validar', async () => {
      const { instancia, campos } = await validar(CriarMotoristaDto, {
        ...motorista,
        email: '  Pedro@SIGCF.Local ',
      });

      expect(campos).toEqual([]);
      expect(instancia.email).toBe('pedro@sigcf.local');
    });

    it('recusa e-mail inválido', async () => {
      const { campos } = await validar(CriarMotoristaDto, {
        ...motorista,
        email: 'pedro@',
      });

      expect(campos).toEqual(['email']);
    });
  });

  describe('@IsTelefone', () => {
    it.each(['(47) 98888-0000', '47 3370-1234'])(
      'aceita %s guardando só os dígitos',
      async (telefone) => {
        const { instancia, campos } = await validar(CriarClienteDto, {
          nome: 'WEG',
          endereco: 'Rua A, 100',
          telefone,
        });

        expect(campos).toEqual([]);
        expect(instancia.telefone).toMatch(/^\d{10,11}$/);
      },
    );

    it.each(['98888-0000', '479888800001'])('recusa %s', async (telefone) => {
      const { campos } = await validar(CriarClienteDto, {
        nome: 'WEG',
        endereco: 'Rua A, 100',
        telefone,
      });

      expect(campos).toEqual(['telefone']);
    });
  });

  describe('@IsCnh', () => {
    it('aceita 11 dígitos, mesmo com pontuação', async () => {
      const { instancia, campos } = await validar(CriarMotoristaDto, {
        ...motorista,
        cnh: '123.456.789-01',
      });

      expect(campos).toEqual([]);
      expect(instancia.cnh).toBe('12345678901');
    });

    it('recusa CNH incompleta', async () => {
      const { campos } = await validar(CriarMotoristaDto, {
        ...motorista,
        cnh: '1234',
      });

      expect(campos).toEqual(['cnh']);
    });
  });

  describe('@IsData', () => {
    it('aceita data no formato AAAA-MM-DD', async () => {
      const { campos } = await validar(DataQueryDto, { data: '2026-11-04' });

      expect(campos).toEqual([]);
    });

    it.each(['04/11/2026', '2026-02-30', '2026-11-04T10:00:00Z'])(
      'recusa %s',
      async (data) => {
        const { campos } = await validar(DataQueryDto, { data });

        expect(campos).toEqual(['data']);
      },
    );
  });

  describe('@ParaBooleano', () => {
    it.each([
      ['true', true],
      ['false', false],
    ])('converte a query string "%s"', async (texto, valor) => {
      const { instancia, campos } = await validar(AtivoQueryDto, {
        ativo: texto,
      });

      expect(campos).toEqual([]);
      expect(instancia.ativo).toBe(valor);
    });

    it('recusa outros valores', async () => {
      const { campos } = await validar(AtivoQueryDto, { ativo: 'sim' });

      expect(campos).toEqual(['ativo']);
    });
  });

  it('recusa campos que não pertencem ao DTO', async () => {
    const { campos } = await validar(AtualizarMotoristaDto, {
      perfil: 'GESTOR',
    });

    expect(campos).toEqual(['perfil']);
  });

  it('a senha é opcional na atualização, mas mantém o tamanho mínimo', async () => {
    expect((await validar(AtualizarMotoristaDto, {})).campos).toEqual([]);
    expect(
      (await validar(AtualizarMotoristaDto, { senha: '123' })).campos,
    ).toEqual(['senha']);
  });
});

describe('decimalParaNumero', () => {
  it('converte o DECIMAL que o MySQL devolve como texto', () => {
    expect(decimalParaNumero.from('1250.50')).toBe(1250.5);
    expect(decimalParaNumero.from(null)).toBeNull();
  });

  it('grava o número sem alteração', () => {
    expect(decimalParaNumero.to(1250.5)).toBe(1250.5);
  });
});
