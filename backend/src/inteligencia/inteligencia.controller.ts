import { Controller, Get } from '@nestjs/common';
import { Perfis } from '../auth/decorators.js';
import { Perfil } from '../usuarios/perfil.enum.js';
import { InteligenciaService } from './inteligencia.service.js';

@Controller('inteligencia')
@Perfis(Perfil.GESTOR)
export class InteligenciaController {
  constructor(private readonly inteligencia: InteligenciaService) {}

  @Get('clientes')
  clientes() {
    return this.inteligencia.analisarClientes();
  }
}
