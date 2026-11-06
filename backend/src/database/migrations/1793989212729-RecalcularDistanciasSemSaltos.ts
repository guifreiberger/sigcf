import { MigrationInterface, QueryRunner } from 'typeorm';
import { recalcularDistancias } from '../../rastreamento/consolidar-corridas.js';

// Recalcula a distância gravada das coletas terminadas sem os saltos do GPS, que somavam
// idas e voltas que o caminhão não fez.
export class RecalcularDistanciasSemSaltos1793989212729 implements MigrationInterface {
  name = 'RecalcularDistanciasSemSaltos1793989212729';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await recalcularDistancias(queryRunner);
  }

  // As distâncias antigas, com os saltos, não ficam registradas, e voltar a elas recriaria o erro.
  public async down(): Promise<void> {}
}
