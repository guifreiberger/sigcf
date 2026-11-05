import { Usuario } from '../usuarios/usuario.entity.js';
import dataSource from './data-source.js';
import { criarGestor, lerDadosDoGestor } from './gestor-inicial.js';

// Uso no container: GESTOR_NOME=... GESTOR_EMAIL=... GESTOR_SENHA=... node dist/database/criar-gestor.js
const dados = lerDadosDoGestor();
await dataSource.initialize();
try {
  await dataSource.runMigrations();
  const resultado = await criarGestor(dataSource.getRepository(Usuario), dados);
  console.log(
    resultado === 'criado'
      ? `Gestor ${dados.email} criado.`
      : `Já existe um usuário com o e-mail ${dados.email}; nada foi alterado.`,
  );
} finally {
  await dataSource.destroy();
}
