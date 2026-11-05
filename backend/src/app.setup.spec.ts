import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configurarApp } from './app.setup.js';

describe('configurarApp', () => {
  const app = {
    setGlobalPrefix: vi.fn(),
    set: vi.fn(),
    use: vi.fn(),
    useGlobalPipes: vi.fn(),
    enableShutdownHooks: vi.fn(),
  };

  beforeAll(() => configurarApp(app as unknown as NestExpressApplication));

  it('publica as rotas sob /api', () => {
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
  });

  it('confia só nos proxies da rede interna para descobrir o IP do cliente', () => {
    expect(app.set).toHaveBeenCalledWith(
      'trust proxy',
      'loopback, linklocal, uniquelocal',
    );
  });

  it('adiciona os cabeçalhos de segurança do helmet', () => {
    const [middleware] = app.use.mock.calls[0] as [unknown];

    expect(middleware).toEqual(expect.any(Function));
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
