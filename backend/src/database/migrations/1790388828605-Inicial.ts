import { MigrationInterface, QueryRunner } from 'typeorm';

export class Inicial1790388828605 implements MigrationInterface {
  name = 'Inicial1790388828605';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`cliente\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nome\` varchar(120) NOT NULL, \`telefone\` varchar(20) NULL, \`endereco\` varchar(255) NOT NULL, \`ativo\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`usuario\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nome\` varchar(120) NOT NULL, \`email\` varchar(160) NOT NULL, \`senha_hash\` varchar(255) NOT NULL, \`perfil\` enum ('GESTOR', 'MOTORISTA') NOT NULL, \`telefone\` varchar(20) NULL, \`cnh\` varchar(20) NULL, \`ativo\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_2863682842e688ca198eb25c12\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`veiculo\` (\`id\` int NOT NULL AUTO_INCREMENT, \`placa\` varchar(10) NOT NULL, \`modelo\` varchar(80) NOT NULL, \`capacidade_kg\` decimal(10,2) NOT NULL, \`ativo\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_a6a498ac4313a6bc4f8967c24d\` (\`placa\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`ordem_coleta\` (\`id\` int NOT NULL AUTO_INCREMENT, \`cliente_id\` int NOT NULL, \`veiculo_id\` int NOT NULL, \`motorista_id\` int NOT NULL, \`criado_por_id\` int NOT NULL, \`endereco_coleta\` varchar(255) NOT NULL, \`data_coleta\` date NOT NULL, \`status\` enum ('AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NOT NULL DEFAULT 'AGUARDANDO', \`observacao\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_ordem_motorista_data\` (\`motorista_id\`, \`data_coleta\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`historico_status\` (\`id\` int NOT NULL AUTO_INCREMENT, \`ordem_id\` int NOT NULL, \`usuario_id\` int NOT NULL, \`status_anterior\` enum ('AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NULL, \`status_novo\` enum ('AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NOT NULL, \`motivo\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD CONSTRAINT \`FK_3aed35213e5179188a1d3749032\` FOREIGN KEY (\`cliente_id\`) REFERENCES \`cliente\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD CONSTRAINT \`FK_5d20fd768fc199b330bc48011b0\` FOREIGN KEY (\`veiculo_id\`) REFERENCES \`veiculo\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD CONSTRAINT \`FK_c647e6dc10ad0b0ecfbea113280\` FOREIGN KEY (\`motorista_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD CONSTRAINT \`FK_e5a00afc1290ed830b93a07ca7e\` FOREIGN KEY (\`criado_por_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historico_status\` ADD CONSTRAINT \`FK_68614ef752c55424c16637f5f7c\` FOREIGN KEY (\`ordem_id\`) REFERENCES \`ordem_coleta\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historico_status\` ADD CONSTRAINT \`FK_5f9e94e038c438f202985031101\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`historico_status\` DROP FOREIGN KEY \`FK_5f9e94e038c438f202985031101\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`historico_status\` DROP FOREIGN KEY \`FK_68614ef752c55424c16637f5f7c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP FOREIGN KEY \`FK_e5a00afc1290ed830b93a07ca7e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP FOREIGN KEY \`FK_c647e6dc10ad0b0ecfbea113280\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP FOREIGN KEY \`FK_5d20fd768fc199b330bc48011b0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP FOREIGN KEY \`FK_3aed35213e5179188a1d3749032\``,
    );
    await queryRunner.query(`DROP TABLE \`historico_status\``);
    await queryRunner.query(
      `DROP INDEX \`idx_ordem_motorista_data\` ON \`ordem_coleta\``,
    );
    await queryRunner.query(`DROP TABLE \`ordem_coleta\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_a6a498ac4313a6bc4f8967c24d\` ON \`veiculo\``,
    );
    await queryRunner.query(`DROP TABLE \`veiculo\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_2863682842e688ca198eb25c12\` ON \`usuario\``,
    );
    await queryRunner.query(`DROP TABLE \`usuario\``);
    await queryRunner.query(`DROP TABLE \`cliente\``);
  }
}
