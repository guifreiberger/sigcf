import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Publico } from './auth/decorators.js';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @Publico()
  async verificar() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }
}
