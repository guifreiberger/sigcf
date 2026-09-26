import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './cliente.entity.js';
import { AtualizarClienteDto, CriarClienteDto } from './dto/cliente.dto.js';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente) private readonly repo: Repository<Cliente>,
  ) {}

  listar(ativo?: boolean) {
    return this.repo.find({
      where: ativo === undefined ? {} : { ativo },
      order: { nome: 'ASC' },
    });
  }

  async buscar(id: number) {
    const cliente = await this.repo.findOneBy({ id });
    if (!cliente) throw new NotFoundException('Cliente não encontrado.');
    return cliente;
  }

  criar(dto: CriarClienteDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async atualizar(id: number, dto: AtualizarClienteDto) {
    await this.buscar(id);
    await this.repo.update(id, dto);
    return this.buscar(id);
  }

  async desativar(id: number) {
    await this.buscar(id);
    await this.repo.update(id, { ativo: false });
  }
}
