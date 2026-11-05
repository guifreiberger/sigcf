// Gera as páginas da Wiki do GitHub a partir da documentação do repositório (docs/, README e
// CONTRIBUTING). Os links entre documentos viram links entre páginas da Wiki, e os links para
// código viram links para o arquivo no GitHub, na branch informada.
// Uso: node scripts/gerar-wiki.mjs <pasta-de-saida> [branch]
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const [saida = 'wiki-gerada', branch = 'develop'] = process.argv.slice(2);
const repositorio = 'https://github.com/guifreiberger/sigcf';

// Documento do repositório → nome da página na Wiki (sem acento, para links estáveis).
const paginas = new Map([
  ['README.md', 'Home'],
  ['docs/requisitos.md', 'Requisitos'],
  ['docs/user-stories.md', 'User-Stories'],
  ['docs/arquitetura.md', 'Arquitetura'],
  ['docs/adr/README.md', 'Decisoes-de-Arquitetura'],
  ['docs/der.md', 'Modelo-de-Dados'],
  ['docs/api.md', 'API'],
  ['docs/inteligencia.md', 'Inteligencia'],
  ['docs/rastreamento.md', 'Rastreamento'],
  ['docs/seguranca.md', 'Seguranca'],
  ['docs/acessibilidade.md', 'Acessibilidade'],
  ['docs/deploy.md', 'Implantacao'],
  ['docs/observabilidade.md', 'Observabilidade'],
  ['docs/desempenho.md', 'Desempenho'],
  ['docs/licencas.md', 'Licencas'],
  ['CONTRIBUTING.md', 'Como-Contribuir'],
]);
for (const arquivo of readdirSync(join(raiz, 'docs/adr')).filter((a) => /^\d{4}-.*\.md$/.test(a))) {
  paginas.set(`docs/adr/${arquivo}`, `ADR-${arquivo.replace(/\.md$/, '')}`);
}
for (const arquivo of readdirSync(join(raiz, 'docs/validacao')).filter((a) => a.endsWith('.md'))) {
  paginas.set(`docs/validacao/${arquivo}`, `Validacao-${arquivo.replace(/\.md$/, '')}`);
}

function converterLinks(conteudo, origem) {
  return conteudo.replace(/\]\(([^)\s]+)\)/g, (trecho, alvo) => {
    if (/^(https?:|mailto:|#)/.test(alvo)) return trecho;
    const [caminho, ancora] = alvo.split('#');
    const resolvido = posix.normalize(posix.join(posix.dirname(origem), caminho));
    const sufixo = ancora ? `#${ancora}` : '';
    const pagina = paginas.get(resolvido) ?? paginas.get(posix.join(resolvido, 'README.md'));
    if (pagina) return `](${pagina}${sufixo})`;
    return `](${repositorio}/blob/${branch}/${resolvido}${sufixo})`;
  });
}

const aviso = (origem) =>
  `> Página gerada automaticamente a partir de [\`${origem}\`](${repositorio}/blob/${branch}/${origem}). ` +
  'Para alterar, edite o arquivo no repositório.\n\n';

rmSync(saida, { recursive: true, force: true });
mkdirSync(saida, { recursive: true });

for (const [origem, pagina] of paginas) {
  const conteudo = readFileSync(join(raiz, origem), 'utf8');
  writeFileSync(join(saida, `${pagina}.md`), aviso(origem) + converterLinks(conteudo, origem));
}

const adrs = [...paginas]
  .filter(([origem]) => /^docs\/adr\/\d{4}/.test(origem))
  .map(([, pagina]) => `  - [${pagina.slice(4, 8)}](${pagina})`);
const validacao = [...paginas]
  .filter(([origem]) => origem.startsWith('docs/validacao/'))
  .map(([, pagina]) => `  - [${pagina.replace('Validacao-', '').replace(/-/g, ' ')}](${pagina})`);

writeFileSync(
  join(saida, '_Sidebar.md'),
  [
    '**SIGCF**',
    '',
    '- [Início](Home)',
    '- [Requisitos e fluxos](Requisitos)',
    '- [User stories](User-Stories)',
    '- [Arquitetura (C4)](Arquitetura)',
    '- [Decisões (ADRs)](Decisoes-de-Arquitetura)',
    ...adrs,
    '- [Modelo de dados](Modelo-de-Dados)',
    '- [API](API)',
    '- [Inteligência](Inteligencia)',
    '- [Trajeto da coleta](Rastreamento)',
    '- [Segurança](Seguranca)',
    '- [Acessibilidade](Acessibilidade)',
    '- [Implantação](Implantacao)',
    '- [Observabilidade](Observabilidade)',
    '- [Desempenho](Desempenho)',
    '- Validação',
    ...validacao,
    '- [Licenças](Licencas)',
    '- [Como contribuir](Como-Contribuir)',
    '',
  ].join('\n'),
);

console.log(`${paginas.size} páginas geradas em ${saida}`);
