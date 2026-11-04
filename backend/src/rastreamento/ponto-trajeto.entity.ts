import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { decimalParaNumero } from '../common/decimal.transformer.js';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';

// Leitura do GPS do motorista enquanto a coleta está em andamento (RF11).
@Entity('ponto_trajeto')
@Index('idx_ponto_ordem_registro', ['ordemId', 'registradoEm'])
export class PontoTrajeto {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'ordem_id', type: 'int' })
  ordemId: number;

  @ManyToOne(() => OrdemColeta, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ordem_id' })
  ordem: Relation<OrdemColeta>;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    transformer: decimalParaNumero,
  })
  latitude: number;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    transformer: decimalParaNumero,
  })
  longitude: number;

  @Column({ name: 'precisao_metros', type: 'int', nullable: true })
  precisaoMetros: number | null;

  // Momento da leitura no celular, que pode ser bem anterior ao envio quando falta sinal.
  @Column({ name: 'registrado_em', type: 'datetime', precision: 3 })
  registradoEm: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
