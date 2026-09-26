import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// O driver do MySQL devolve DECIMAL como string para não perder precisão.
const decimalParaNumero = {
  to: (valor: number) => valor,
  from: (valor: string) => Number(valor),
};

@Entity('veiculo')
export class Veiculo {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  placa: string;

  @Column({ type: 'varchar', length: 80 })
  modelo: string;

  @Column({
    name: 'capacidade_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalParaNumero,
  })
  capacidadeKg: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
