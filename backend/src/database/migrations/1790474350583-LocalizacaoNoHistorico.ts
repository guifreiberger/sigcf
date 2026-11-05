import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocalizacaoNoHistorico1790474350583 implements MigrationInterface {
  name = 'LocalizacaoNoHistorico1790474350583';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `historico_status` ADD `latitude` decimal(9,6) NULL, ADD `longitude` decimal(9,6) NULL, ADD `precisao_metros` int NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `historico_status` DROP COLUMN `precisao_metros`, DROP COLUMN `longitude`, DROP COLUMN `latitude`',
    );
  }
}
