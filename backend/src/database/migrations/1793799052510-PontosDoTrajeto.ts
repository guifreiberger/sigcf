import { MigrationInterface, QueryRunner } from 'typeorm';

export class PontosDoTrajeto1793799052510 implements MigrationInterface {
  name = 'PontosDoTrajeto1793799052510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`ponto_trajeto\` (\`id\` int NOT NULL AUTO_INCREMENT, \`ordem_id\` int NOT NULL, \`latitude\` decimal(9,6) NOT NULL, \`longitude\` decimal(9,6) NOT NULL, \`precisao_metros\` int NULL, \`registrado_em\` datetime(3) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_ponto_ordem_registro\` (\`ordem_id\`, \`registrado_em\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ponto_trajeto\` ADD CONSTRAINT \`FK_41b896db71b805566d3cb5c5daf\` FOREIGN KEY (\`ordem_id\`) REFERENCES \`ordem_coleta\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ponto_trajeto\` DROP FOREIGN KEY \`FK_41b896db71b805566d3cb5c5daf\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_ponto_ordem_registro\` ON \`ponto_trajeto\``,
    );
    await queryRunner.query(`DROP TABLE \`ponto_trajeto\``);
  }
}
