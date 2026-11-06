import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Veiculo } from '../veiculos/veiculo.entity.js';
import {
  AtualizarMotoristaDto,
  CriarMotoristaDto,
} from './dto/motorista.dto.js';

@Injectable()
export class MotoristasService {
  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    @InjectRepository(Veiculo)
    private readonly veiculos: Repository<Veiculo>,
  ) {}

  listar(ativo?: boolean) {
    return this.repo.find({
      where: {
        perfil: Perfil.MOTORISTA,
        ...(ativo === undefined ? {} : { ativo }),
      },
      order: { nome: 'ASC' },
    });
  }

  async buscar(id: number) {
    const motorista = await this.repo.findOneBy({
      id,
      perfil: Perfil.MOTORISTA,
    });
    if (!motorista) throw new NotFoundException('Motorista não encontrado.');
    return motorista;
  }

  async criar({ senha, ...dados }: CriarMotoristaDto) {
    await this.garantirEmailLivre(dados.email);
    await this.garantirCaminhaoAtivo(dados.veiculoPadraoId);
    const { id } = await this.repo.save(
      this.repo.create({
        ...dados,
        perfil: Perfil.MOTORISTA,
        senhaHash: await hash(senha, 10),
      }),
    );
    return this.buscar(id);
  }

  async atualizar(id: number, { senha, ...dados }: AtualizarMotoristaDto) {
    const motorista = await this.buscar(id);
    if (dados.email && dados.email !== motorista.email) {
      await this.garantirEmailLivre(dados.email);
    }
    await this.garantirCaminhaoAtivo(dados.veiculoPadraoId);
    await this.repo.update(id, {
      ...dados,
      ...(senha ? { senhaHash: await hash(senha, 10) } : {}),
    });
    return this.buscar(id);
  }

  async desativar(id: number) {
    await this.buscar(id);
    await this.repo.update(id, { ativo: false });
  }

  private async garantirCaminhaoAtivo(id: number | null | undefined) {
    if (id == null) return;
    if (!(await this.veiculos.existsBy({ id, ativo: true }))) {
      throw new UnprocessableEntityException(
        'Caminhão não encontrado ou inativo.',
      );
    }
  }

  private async garantirEmailLivre(email: string) {
    if (await this.repo.existsBy({ email })) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }
  }
}
