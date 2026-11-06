import { MigrationInterface, QueryRunner } from 'typeorm';

export class AparelhosDoApp1793924047523 implements MigrationInterface {
  name = 'AparelhosDoApp1793924047523';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`aparelho_app\` (\`id\` int NOT NULL AUTO_INCREMENT, \`usuario_id\` int NOT NULL, \`token\` varchar(500) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_d39f27fa2e174355e9890328e0\` (\`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`aparelho_app\` ADD CONSTRAINT \`FK_b67cf226f63382cad86291276df\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aparelho_app\` DROP FOREIGN KEY \`FK_b67cf226f63382cad86291276df\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_d39f27fa2e174355e9890328e0\` ON \`aparelho_app\``,
    );
    await queryRunner.query(`DROP TABLE \`aparelho_app\``);
  }
}
