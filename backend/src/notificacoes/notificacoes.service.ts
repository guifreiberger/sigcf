import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InscricaoPushDto } from './dto/inscricao-push.dto.js';
import { EnviadorPush } from './enviador-push.js';
import { InscricaoPush } from './inscricao-push.entity.js';

export interface Aviso {
  titulo: string;
  corpo: string;
  url: string;
  tag: string;
}

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    @InjectRepository(InscricaoPush)
    private readonly inscricoes: Repository<InscricaoPush>,
    private readonly enviador: EnviadorPush,
  ) {}

  chavePublica() {
    return { chavePublica: this.enviador.chavePublica };
  }

  async inscrever(usuarioId: number, dto: InscricaoPushDto) {
    await this.inscricoes.upsert(
      {
        usuarioId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      ['endpoint'],
    );
  }

  async remover(usuarioId: number, endpoint: string) {
    await this.inscricoes.delete({ usuarioId, endpoint });
  }

  // Nunca rejeita: a falha de um aviso não pode desfazer a operação que o originou.
  async enviarParaUsuario(usuarioId: number, aviso: Aviso) {
    if (!this.enviador.chavePublica) return;
    try {
      const destinos = await this.inscricoes.findBy({ usuarioId });
      const conteudo = JSON.stringify(aviso);
      await Promise.all(
        destinos.map(async (destino) => {
          const resultado = await this.enviador.enviar(destino, conteudo);
          if (resultado === 'EXPIRADO') {
            await this.inscricoes.delete({ id: destino.id });
          }
        }),
      );
    } catch (erro) {
      this.logger.warn(`Falha ao processar notificações: ${String(erro)}`);
    }
  }
}
