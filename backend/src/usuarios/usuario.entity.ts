import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Veiculo } from '../veiculos/veiculo.entity.js';
import { Perfil } from './perfil.enum.js';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nome: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  @Column({ name: 'senha_hash', type: 'varchar', length: 255, select: false })
  senhaHash: string;

  @Column({ type: 'enum', enum: Perfil })
  perfil: Perfil;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cnh: string | null;

  // Caminhão que o motorista costuma usar: vem preenchido ao criar uma ordem para ele (RF14).
  @Column({ name: 'veiculo_padrao_id', type: 'int', nullable: true })
  veiculoPadraoId: number | null;

  @ManyToOne(() => Veiculo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'veiculo_padrao_id' })
  veiculoPadrao?: Relation<Veiculo> | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
