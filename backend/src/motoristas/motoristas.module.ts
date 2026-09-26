import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import { MotoristasController } from './motoristas.controller.js';
import { MotoristasService } from './motoristas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [MotoristasController],
  providers: [MotoristasService],
})
export class MotoristasModule {}
