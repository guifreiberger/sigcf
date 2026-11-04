import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { configurarApp } from './app.setup.js';

describe('configurarApp', () => {
  const app = {
    setGlobalPrefix: vi.fn(),
    useGlobalPipes: vi.fn(),
    enableShutdownHooks: vi.fn(),
  };

  beforeAll(() => configurarApp(app as unknown as INestApplication));

  it('publica as rotas sob /api', () => {
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
  });

  it('valida todas as entradas, recusando campos desconhecidos', () => {
    const [pipe] = app.useGlobalPipes.mock.calls[0] as [ValidationPipe];

    expect(pipe).toBeInstanceOf(ValidationPipe);
    expect(pipe).toMatchObject({
      validatorOptions: { whitelist: true, forbidNonWhitelisted: true },
      isTransformEnabled: true,
    });
  });

  it('encerra as conexões ao receber sinal de parada', () => {
    expect(app.enableShutdownHooks).toHaveBeenCalled();
  });
});
