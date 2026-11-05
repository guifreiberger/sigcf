// Gera o par de chaves VAPID das notificações push e grava no GitHub: a pública como variável e
// a privada como segredo do repositório. A chave privada não aparece na tela nem vai para arquivo.
// Uso, na raiz do projeto e com o GitHub CLI logado: node infra/configurar-avisos.mjs
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const webpush = createRequire(new URL('../backend/package.json', import.meta.url))('web-push');
const caminhoNoWindows = 'C:\\Program Files\\GitHub CLI\\gh.exe';
const gh = existsSync(caminhoNoWindows) ? caminhoNoWindows : 'gh';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
execFileSync(gh, ['secret', 'set', 'VAPID_PRIVATE_KEY'], { input: privateKey, stdio: ['pipe', 'inherit', 'inherit'] });
execFileSync(gh, ['variable', 'set', 'VAPID_PUBLIC_KEY', '--body', publicKey], { stdio: 'inherit' });
console.log('Chaves das notificações configuradas no GitHub.');
