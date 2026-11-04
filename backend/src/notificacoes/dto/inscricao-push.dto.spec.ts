import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InscricaoPushDto } from './inscricao-push.dto.js';

async function errosDa(
  endpoint: string,
  keys: object = { p256dh: 'p', auth: 'a' },
) {
  const erros = await validate(
    plainToInstance(InscricaoPushDto, { endpoint, keys }),
  );
  return erros.map((e) => e.property);
}

describe('InscricaoPushDto', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/abc',
    'https://wns2-by3p.notify.windows.com/w/?token=abc',
  ])('aceita o serviço de push do navegador: %s', async (endpoint) => {
    expect(await errosDa(endpoint)).toEqual([]);
  });

  it.each([
    ['endereço interno', 'https://169.254.169.254/latest/meta-data'],
    [
      'host parecido com o permitido',
      'https://fcm.googleapis.com.atacante.com/x',
    ],
    ['sufixo sem ponto', 'https://evilfcm.googleapis.com.br/x'],
    ['HTTP sem TLS', 'http://fcm.googleapis.com/fcm/send/abc'],
  ])('recusa %s para impedir SSRF', async (_, endpoint) => {
    expect(await errosDa(endpoint)).toEqual(['endpoint']);
  });

  it('exige as chaves de criptografia da inscrição', async () => {
    expect(
      await errosDa('https://fcm.googleapis.com/fcm/send/abc', { p256dh: '' }),
    ).toEqual(['keys']);
  });
});
