import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FiltroRelatorioDto, PeriodoDto } from './periodo.dto.js';

async function validar<T extends object>(Classe: new () => T, dados: object) {
  const instancia = plainToInstance(Classe, dados);
  const erros = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instancia, campos: erros.map((e) => e.property).sort() };
}

describe('DTOs dos relatórios', () => {
  it('exige o início e o fim do período', async () => {
    expect((await validar(PeriodoDto, {})).campos).toEqual(['ate', 'de']);
  });

  it('converte os filtros da query string', async () => {
    const { instancia, campos } = await validar(FiltroRelatorioDto, {
      de: '2026-11-01',
      ate: '2026-11-30',
      motoristaId: '7',
      clienteId: '3',
      status: 'CONCLUIDA',
    });

    expect(campos).toEqual([]);
    expect(instancia).toMatchObject({ motoristaId: 7, clienteId: 3 });
  });

  it('recusa status inexistente e data inválida', async () => {
    const { campos } = await validar(FiltroRelatorioDto, {
      de: '2026-13-01',
      ate: '2026-11-30',
      status: 'PAUSADA',
    });

    expect(campos).toEqual(['de', 'status']);
  });
});
