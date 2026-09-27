import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Cliente } from '../clientes/cliente.entity.js';
import { decimalParaNumero } from '../common/decimal.transformer.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Veiculo } from '../veiculos/veiculo.entity.js';
import { HistoricoStatus } from './historico-status.entity.js';
import { StatusOrdem } from './status-ordem.enum.js';

@Entity('ordem_coleta')
@Index('idx_ordem_motorista_data', ['motoristaId', 'dataColeta'])
export class OrdemColeta {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'cliente_id', type: 'int' })
  clienteId: number;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Relation<Cliente>;

  @Column({ name: 'veiculo_id', type: 'int' })
  veiculoId: number;

  @ManyToOne(() => Veiculo, { nullable: false })
  @JoinColumn({ name: 'veiculo_id' })
  veiculo: Relation<Veiculo>;

  @Column({ name: 'motorista_id', type: 'int' })
  motoristaId: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'motorista_id' })
  motorista: Relation<Usuario>;

  @Column({ name: 'criado_por_id', type: 'int' })
  criadoPorId: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'criado_por_id' })
  criadoPor: Relation<Usuario>;

  @Column({ name: 'endereco_coleta', type: 'varchar', length: 255 })
  enderecoColeta: string;

  @Column({ name: 'data_coleta', type: 'date' })
  dataColeta: string;

  @Column({ type: 'enum', enum: StatusOrdem, default: StatusOrdem.AGUARDANDO })
  status: StatusOrdem;

  @Column({
    name: 'peso_estimado_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalParaNumero,
  })
  pesoEstimadoKg: number | null;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @OneToMany(() => HistoricoStatus, (historico) => historico.ordem)
  historico: Relation<HistoricoStatus[]>;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
