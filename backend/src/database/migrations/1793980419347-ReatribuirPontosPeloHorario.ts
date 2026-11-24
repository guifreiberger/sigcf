import { MigrationInterface, QueryRunner } from 'typeorm';
import { reatribuirPontosPeloHorario } from '../../rastreamento/consolidar-corridas.js';

// Leva cada ponto do trajeto para a coleta que estava em andamento no horário da leitura,
// corrigindo os pontos que chegaram atrasados e foram gravados na coleta seguinte.
export class ReatribuirPontosPeloHorario1793980419347 implements MigrationInterface {
  name = 'ReatribuirPontosPeloHorario1793980419347';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await reatribuirPontosPeloHorario(queryRunner);
  }

  // Não há como desfazer: a coleta em que cada ponto estava antes não fica registrada, e
  // devolvê-los a ela recriaria o erro.
  public async down(): Promise<void> {}
}
