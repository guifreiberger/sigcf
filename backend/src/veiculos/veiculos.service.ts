import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AtualizarVeiculoDto, CriarVeiculoDto } from './dto/veiculo.dto.js';
import { Veiculo } from './veiculo.entity.js';

@Injectable()
export class VeiculosService {
  constructor(
    @InjectRepository(Veiculo) private readonly repo: Repository<Veiculo>,
  ) {}

  listar(ativo?: boolean) {
    return this.repo.find({
      where: ativo === undefined ? {} : { ativo },
      order: { placa: 'ASC' },
    });
  }

  async buscar(id: number) {
    const veiculo = await this.repo.findOneBy({ id });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');
    return veiculo;
  }

  async criar(dto: CriarVeiculoDto) {
    await this.garantirPlacaLivre(dto.placa);
    return this.repo.save(this.repo.create(dto));
  }

  async atualizar(id: number, dto: AtualizarVeiculoDto) {
    const veiculo = await this.buscar(id);
    if (dto.placa && dto.placa !== veiculo.placa) {
      await this.garantirPlacaLivre(dto.placa);
    }
    await this.repo.update(id, dto);
    return this.buscar(id);
  }

  async desativar(id: number) {
    await this.buscar(id);
    await this.repo.update(id, { ativo: false });
  }

  private async garantirPlacaLivre(placa: string) {
    if (await this.repo.existsBy({ placa })) {
      throw new ConflictException('Já existe um veículo com esta placa.');
    }
  }
}
