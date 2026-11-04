import { opcoesTypeOrm } from './typeorm.config.js';

describe('opcoesTypeOrm', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('conecta sem TLS no banco local', () => {
    vi.stubEnv('DB_SSL', '');

    expect(opcoesTypeOrm()).toMatchObject({ ssl: undefined });
  });

  it('exige TLS com certificado válido quando DB_SSL=true (banco na nuvem)', () => {
    vi.stubEnv('DB_SSL', 'true');

    expect(opcoesTypeOrm()).toMatchObject({
      ssl: { rejectUnauthorized: true },
    });
  });

  it('lê o servidor e as credenciais do ambiente', () => {
    vi.stubEnv('DB_HOST', 'sigcf.mysql.database.azure.com');
    vi.stubEnv('DB_PORT', '3306');
    vi.stubEnv('DB_NAME', 'sigcf_homologacao');

    expect(opcoesTypeOrm()).toMatchObject({
      host: 'sigcf.mysql.database.azure.com',
      port: 3306,
      database: 'sigcf_homologacao',
    });
  });
});
