import { MigrationInterface, QueryRunner } from 'typeorm';

export class InscricoesPush1790478494594 implements MigrationInterface {
  name = 'InscricoesPush1790478494594';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`inscricao_push\` (\`id\` int NOT NULL AUTO_INCREMENT, \`usuario_id\` int NOT NULL, \`endpoint\` varchar(500) NOT NULL, \`p256dh\` varchar(200) NOT NULL, \`auth\` varchar(100) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_9b8916a60bfb0d4cc47e40d1f0\` (\`endpoint\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscricao_push\` ADD CONSTRAINT \`FK_91e9b738b3bf72e8bd303b871a4\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inscricao_push\` DROP FOREIGN KEY \`FK_91e9b738b3bf72e8bd303b871a4\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9b8916a60bfb0d4cc47e40d1f0\` ON \`inscricao_push\``,
    );
    await queryRunner.query(`DROP TABLE \`inscricao_push\``);
  }
}
