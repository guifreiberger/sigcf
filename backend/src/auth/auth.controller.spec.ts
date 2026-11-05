import { Perfil } from '../usuarios/perfil.enum.js';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import { CHAVE_PUBLICO } from './decorators.js';

describe('AuthController', () => {
  const service = {
    login: vi.fn().mockResolvedValue({ accessToken: 'token' }),
    perfil: vi.fn().mockResolvedValue({ id: 1 }),
  };
  const controller = new AuthController(service as unknown as AuthService);

  it('o login é a única rota pública', () => {
    const publica = (rota: keyof AuthController) =>
      Reflect.getMetadata(CHAVE_PUBLICO, AuthController.prototype[rota]) as
        boolean | undefined;

    expect(publica('login')).toBe(true);
    expect(publica('me')).toBeUndefined();
  });

  it('autentica com e-mail e senha', async () => {
    await expect(
      controller.login({ email: 'gestor@sigcf.local', senha: 'x' }),
    ).resolves.toEqual({ accessToken: 'token' });
    expect(service.login).toHaveBeenCalledWith('gestor@sigcf.local', 'x');
  });

  it('devolve o perfil do usuário autenticado', async () => {
    const usuario = { id: 1, nome: 'Ana', perfil: Perfil.GESTOR };

    await expect(controller.me(usuario)).resolves.toEqual({ id: 1 });
    expect(service.perfil).toHaveBeenCalledWith(usuario);
  });
});
