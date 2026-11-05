import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { decimalParaNumero } from '../common/decimal.transformer.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { OrdemColeta } from './ordem-coleta.entity.js';
import { StatusOrdem } from './status-ordem.enum.js';

@Entity('historico_status')
export class HistoricoStatus {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'ordem_id', type: 'int' })
  ordemId: number;

  @ManyToOne(() => OrdemColeta, (ordem) => ordem.historico, { nullable: false })
  @JoinColumn({ name: 'ordem_id' })
  ordem: Relation<OrdemColeta>;

  @Column({ name: 'usuario_id', type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<Usuario>;

  @Column({
    name: 'status_anterior',
    type: 'enum',
    enum: StatusOrdem,
    nullable: true,
  })
  statusAnterior: StatusOrdem | null;

  @Column({ name: 'status_novo', type: 'enum', enum: StatusOrdem })
  statusNovo: StatusOrdem;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo: string | null;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalParaNumero,
  })
  latitude: number | null;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalParaNumero,
  })
  longitude: number | null;

  @Column({ name: 'precisao_metros', type: 'int', nullable: true })
  precisaoMetros: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
