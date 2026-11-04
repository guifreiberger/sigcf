import { LimiteDeLoginGuard } from './limite-de-login.guard.js';

// Expõe o método protegido só para o teste.
class GuardDeTeste extends LimiteDeLoginGuard {
  rastrear(req: { ip?: string; body?: { email?: unknown } }) {
    return this.getTracker(req);
  }
}

describe('LimiteDeLoginGuard', () => {
  const guard = new GuardDeTeste({} as never, {} as never, {} as never);

  it('conta as tentativas por IP e e-mail, sem diferenciar maiúsculas', async () => {
    await expect(
      guard.rastrear({
        ip: '203.0.113.7',
        body: { email: ' Gestor@SIGCF.local ' },
      }),
    ).resolves.toBe('203.0.113.7:gestor@sigcf.local');
  });

  it('separa contas diferentes que entram pela mesma rede', async () => {
    const ana = await guard.rastrear({
      ip: '203.0.113.7',
      body: { email: 'ana@sigcf.local' },
    });
    const joao = await guard.rastrear({
      ip: '203.0.113.7',
      body: { email: 'joao@sigcf.local' },
    });

    expect(ana).not.toBe(joao);
  });

  it('ainda limita por IP quando o e-mail não é enviado', async () => {
    await expect(guard.rastrear({ ip: '203.0.113.7', body: {} })).resolves.toBe(
      '203.0.113.7:',
    );
  });
});
