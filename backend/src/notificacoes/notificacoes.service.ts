import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type ObjectLiteral, Repository } from 'typeorm';
import { Perfil } from '../usuarios/perfil.enum.js';
import { AparelhoApp } from './aparelho-app.entity.js';
import type { Aviso } from './avisos.js';
import { InscricaoPushDto } from './dto/inscricao-push.dto.js';
import { EnviadorFcm } from './enviador-fcm.js';
import { EnviadorPush } from './enviador-push.js';
import { InscricaoPush } from './inscricao-push.entity.js';

const MOTORISTAS_ATIVOS = {
  where: { usuario: { perfil: Perfil.MOTORISTA, ativo: true } },
};

// Grava o registro ou, se a chave única já existe, atualiza as colunas dadas. O upsert do
// TypeORM dava erro 500 no MySQL quando o registro já existia igual, o que acontece a cada
// vez que o app abre: ele tentava reler um id que o banco não devolve nesse caso.
function gravarOuAtualizar<T extends ObjectLiteral>(
  repositorio: Repository<T>,
  valores: Partial<T>,
  colunas: string[],
  chave: string[],
) {
  return repositorio
    .createQueryBuilder()
    .insert()
    .values(valores)
    .orUpdate(colunas, chave)
    .updateEntity(false)
    .execute();
}

// Onde procurar os destinos de um aviso: inscrições do navegador e aparelhos com o app.
interface Destinos {
  doNavegador: () => Promise<InscricaoPush[]>;
  doApp: () => Promise<AparelhoApp[]>;
}

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    @InjectRepository(InscricaoPush)
    private readonly inscricoes: Repository<InscricaoPush>,
    private readonly enviador: EnviadorPush,
    @InjectRepository(AparelhoApp)
    private readonly aparelhos: Repository<AparelhoApp>,
    private readonly fcm: EnviadorFcm,
  ) {}

  chavePublica() {
    return { chavePublica: this.enviador.chavePublica };
  }

  async inscrever(usuarioId: number, dto: InscricaoPushDto) {
    await gravarOuAtualizar(
      this.inscricoes,
      {
        usuarioId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      ['usuario_id', 'p256dh', 'auth'],
      ['endpoint'],
    );
  }

  async remover(usuarioId: number, endpoint: string) {
    await this.inscricoes.delete({ usuarioId, endpoint });
  }

  async registrarAparelho(usuarioId: number, token: string) {
    await gravarOuAtualizar(
      this.aparelhos,
      { usuarioId, token },
      ['usuario_id'],
      ['token'],
    );
  }

  async removerAparelho(usuarioId: number, token: string) {
    await this.aparelhos.delete({ usuarioId, token });
  }

  enviarParaUsuario(usuarioId: number, aviso: Aviso) {
    return this.enviar(aviso, {
      doNavegador: () => this.inscricoes.findBy({ usuarioId }),
      doApp: () => this.aparelhos.findBy({ usuarioId }),
    });
  }

  enviarParaMotoristas(aviso: Aviso) {
    return this.enviar(aviso, {
      doNavegador: () => this.inscricoes.find(MOTORISTAS_ATIVOS),
      doApp: () => this.aparelhos.find(MOTORISTAS_ATIVOS),
    });
  }

  // Nunca rejeita: a falha de um aviso não pode desfazer a operação que o originou.
  // Navegador e app são independentes: a falha de um não impede o outro.
  private async enviar(aviso: Aviso, destinos: Destinos) {
    const resultados = await Promise.allSettled([
      this.enviarAoNavegador(aviso, destinos.doNavegador),
      this.enviarAoApp(aviso, destinos.doApp),
    ]);
    for (const resultado of resultados) {
      if (resultado.status === 'rejected') {
        this.logger.warn(
          `Falha ao processar notificações: ${String(resultado.reason)}`,
        );
      }
    }
  }

  private async enviarAoApp(
    aviso: Aviso,
    buscar: () => Promise<AparelhoApp[]>,
  ) {
    if (!this.fcm.ativo) return;
    const aparelhos = await buscar();
    await Promise.all(
      aparelhos.map(async (aparelho) => {
        const resultado = await this.fcm.enviar(aparelho.token, aviso);
        if (resultado === 'EXPIRADO') {
          await this.aparelhos.delete({ id: aparelho.id });
        }
      }),
    );
  }

  private async enviarAoNavegador(
    aviso: Aviso,
    buscar: () => Promise<InscricaoPush[]>,
  ) {
    if (!this.enviador.chavePublica) return;
    const destinos = await buscar();
    const conteudo = JSON.stringify(aviso);
    await Promise.all(
      destinos.map(async (destino) => {
        const resultado = await this.enviador.enviar(destino, conteudo);
        if (resultado === 'EXPIRADO') {
          await this.inscricoes.delete({ id: destino.id });
        }
      }),
    );
  }
}
