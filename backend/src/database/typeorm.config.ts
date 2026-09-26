import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity.js';
import { HistoricoStatus } from '../ordens/historico-status.entity.js';
import { OrdemColeta } from '../ordens/ordem-coleta.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Veiculo } from '../veiculos/veiculo.entity.js';

export function opcoesTypeOrm(): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    entities: [Usuario, Veiculo, Cliente, OrdemColeta, HistoricoStatus],
    migrations: [join(import.meta.dirname, 'migrations', '*.js')],
    synchronize: false,
  };
}
