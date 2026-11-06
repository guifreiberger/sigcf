import { Injectable, Logger } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import type { Aviso } from './avisos.js';
import type { ResultadoEnvio } from './enviador-push.js';

interface CredenciaisFirebase {
  project_id: string;
  client_email: string;
  private_key: string;
}

// Avisos ao app Android pelo Firebase Cloud Messaging. Dentro do app o Web Push do navegador
// não funciona, então o servidor fala com o Firebase usando a chave de uma conta de serviço.
export abstract class EnviadorFcm {
  abstract readonly ativo: boolean;
  abstract enviar(token: string, aviso: Aviso): Promise<ResultadoEnvio>;
}

// A chave da conta de serviço chega em base64 (FIREBASE_CREDENCIAIS_BASE64), para caber numa
// variável de ambiente sem quebras de linha. Sem ela, ou inválida, os avisos no app ficam desligados.
export function lerCredenciaisFirebase(
  valor: string | undefined,
): CredenciaisFirebase | null {
  if (!valor) return null;
  try {
    const credenciais = JSON.parse(
      Buffer.from(valor, 'base64').toString('utf8'),
    ) as Partial<CredenciaisFirebase>;
    const { project_id, client_email, private_key } = credenciais;
    if (!project_id || !client_email || !private_key) return null;
    return { project_id, client_email, private_key };
  } catch {
    return null;
  }
}

// A mesma tag por ordem faz o aviso de cancelamento substituir o de nova coleta no celular,
// como no Web Push. O canal "coletas" é criado pelo app com prioridade alta.
export function mensagemFcm(token: string, aviso: Aviso) {
  return {
    message: {
      token,
      notification: { title: aviso.titulo, body: aviso.corpo },
      data: { url: aviso.url, tag: aviso.tag },
      android: {
        priority: 'high',
        ttl: '43200s',
        notification: {
          tag: aviso.tag,
          channel_id: 'coletas',
          icon: 'ic_notificacao',
          color: '#FACC15',
        },
      },
    },
  };
}

interface ErroFirebase {
  error?: { status?: string; details?: { errorCode?: string }[] };
}

@Injectable()
export class FirebaseEnviador extends EnviadorFcm {
  private readonly logger = new Logger(FirebaseEnviador.name);
  private readonly credenciais: CredenciaisFirebase | null;
  private readonly autenticacao: GoogleAuth | null;

  constructor() {
    super();
    const valor = process.env.FIREBASE_CREDENCIAIS_BASE64;
    this.credenciais = lerCredenciaisFirebase(valor);
    if (valor && !this.credenciais) {
      this.logger.warn(
        'FIREBASE_CREDENCIAIS_BASE64 inválida: avisos no app desligados.',
      );
    }
    this.autenticacao = this.credenciais
      ? new GoogleAuth({
          credentials: this.credenciais,
          scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        })
      : null;
  }

  get ativo() {
    return this.credenciais !== null;
  }

  async enviar(token: string, aviso: Aviso): Promise<ResultadoEnvio> {
    if (!this.credenciais || !this.autenticacao) return 'FALHOU';
    try {
      const acesso = await this.autenticacao.getAccessToken();
      const resposta = await fetch(
        `https://fcm.googleapis.com/v1/projects/${this.credenciais.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${acesso}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mensagemFcm(token, aviso)),
        },
      );
      if (resposta.ok) return 'ENVIADO';

      const erro = (await resposta.json().catch(() => null)) as ErroFirebase;
      // O Firebase responde UNREGISTERED quando o app foi desinstalado ou o token trocou.
      const desinstalado = erro?.error?.details?.some(
        (d) => d.errorCode === 'UNREGISTERED',
      );
      if (desinstalado) return 'EXPIRADO';
      this.logger.warn(
        `Falha ao enviar aviso ao app: ${resposta.status} ${erro?.error?.status ?? ''}`,
      );
      return 'FALHOU';
    } catch (erro) {
      this.logger.warn(`Falha ao enviar aviso ao app: ${String(erro)}`);
      return 'FALHOU';
    }
  }
}
