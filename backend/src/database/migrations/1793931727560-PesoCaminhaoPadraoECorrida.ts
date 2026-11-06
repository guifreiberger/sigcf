import { MigrationInterface, QueryRunner } from 'typeorm';
import { consolidarCorridasAntigas } from '../../rastreamento/consolidar-corridas.js';

export class PesoCaminhaoPadraoECorrida1793931727560 implements MigrationInterface {
  name = 'PesoCaminhaoPadraoECorrida1793931727560';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`usuario\` ADD \`veiculo_padrao_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD \`peso_real_kg\` decimal(10,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD \`distancia_metros\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD \`duracao_segundos\` int NULL`,
    );
    // Coletas que já terminaram ganham a distância e a duração calculadas a partir dos pontos.
    await consolidarCorridasAntigas(queryRunner);
    await queryRunner.query(
      `ALTER TABLE \`usuario\` ADD CONSTRAINT \`FK_65e3cf8a1f25aceeadaa697921b\` FOREIGN KEY (\`veiculo_padrao_id\`) REFERENCES \`veiculo\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`usuario\` DROP FOREIGN KEY \`FK_65e3cf8a1f25aceeadaa697921b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP COLUMN \`duracao_segundos\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP COLUMN \`distancia_metros\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP COLUMN \`peso_real_kg\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`usuario\` DROP COLUMN \`veiculo_padrao_id\``,
    );
  }
}
