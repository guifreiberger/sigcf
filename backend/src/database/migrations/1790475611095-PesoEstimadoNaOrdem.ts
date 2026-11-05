import { MigrationInterface, QueryRunner } from 'typeorm';

export class PesoEstimadoNaOrdem1790475611095 implements MigrationInterface {
  name = 'PesoEstimadoNaOrdem1790475611095';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `ordem_coleta` ADD `peso_estimado_kg` decimal(10,2) NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `ordem_coleta` DROP COLUMN `peso_estimado_kg`',
    );
  }
}
