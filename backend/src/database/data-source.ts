import { DataSource } from 'typeorm';
import { opcoesTypeOrm } from './typeorm.config.js';

try {
  process.loadEnvFile();
} catch {
  // Sem .env: as variáveis vêm do ambiente (ex.: container).
}

export default new DataSource(opcoesTypeOrm());
