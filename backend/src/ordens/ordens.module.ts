import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdemColeta } from './ordem-coleta.entity.js';
import { OrdensController } from './ordens.controller.js';
import { OrdensService } from './ordens.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([OrdemColeta])],
  controllers: [OrdensController],
  providers: [OrdensService],
})
export class OrdensModule {}
