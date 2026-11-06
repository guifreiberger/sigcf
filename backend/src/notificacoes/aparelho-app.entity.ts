import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';

// Celular com o app Android do SIGCF, identificado pelo token que o Firebase gera para ele.
// Cada token pertence a um único usuário: quem entrar depois no mesmo aparelho fica com ele.
@Entity('aparelho_app')
export class AparelhoApp {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'usuario_id', type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Relation<Usuario>;

  @Column({ type: 'varchar', length: 500, unique: true })
  token: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
