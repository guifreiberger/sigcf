import { MigrationInterface, QueryRunner } from 'typeorm';

export class ColetaDisponivel1793844063398 implements MigrationInterface {
  name = 'ColetaDisponivel1793844063398';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP FOREIGN KEY \`FK_5d20fd768fc199b330bc48011b0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP FOREIGN KEY \`FK_c647e6dc10ad0b0ecfbea113280\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_ordem_motorista_data\` ON \`ordem_coleta\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` CHANGE \`veiculo_id\` \`veiculo_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` CHANGE \`motorista_id\` \`motorista_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` CHANGE \`status\` \`status\` enum ('DISPONIVEL', 'AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NOT NULL DEFAULT 'AGUARDANDO'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historico_status\` CHANGE \`status_anterior\` \`status_anterior\` enum ('DISPONIVEL', 'AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historico_status\` CHANGE \`status_novo\` \`status_novo\` enum ('DISPONIVEL', 'AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_ordem_motorista_data\` ON \`ordem_coleta\` (\`motorista_id\`, \`data_coleta\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD CONSTRAINT \`FK_5d20fd768fc199b330bc48011b0\` FOREIGN KEY (\`veiculo_id\`) REFERENCES \`veiculo\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD CONSTRAINT \`FK_c647e6dc10ad0b0ecfbea113280\` FOREIGN KEY (\`motorista_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Falha de propósito se houver coletas disponíveis (sem motorista): reverter não apaga dados.
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP FOREIGN KEY \`FK_c647e6dc10ad0b0ecfbea113280\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` DROP FOREIGN KEY \`FK_5d20fd768fc199b330bc48011b0\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_ordem_motorista_data\` ON \`ordem_coleta\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`historico_status\` CHANGE \`status_novo\` \`status_novo\` enum ('AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historico_status\` CHANGE \`status_anterior\` \`status_anterior\` enum ('AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` CHANGE \`status\` \`status\` enum ('AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'FALHA', 'CANCELADA') NOT NULL DEFAULT 'AGUARDANDO'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` CHANGE \`motorista_id\` \`motorista_id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` CHANGE \`veiculo_id\` \`veiculo_id\` int NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_ordem_motorista_data\` ON \`ordem_coleta\` (\`motorista_id\`, \`data_coleta\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD CONSTRAINT \`FK_c647e6dc10ad0b0ecfbea113280\` FOREIGN KEY (\`motorista_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`ordem_coleta\` ADD CONSTRAINT \`FK_5d20fd768fc199b330bc48011b0\` FOREIGN KEY (\`veiculo_id\`) REFERENCES \`veiculo\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
