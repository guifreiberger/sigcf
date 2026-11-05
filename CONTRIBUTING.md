# Como contribuir com o SIGCF

Obrigado pelo interesse. Este guia vale para quem revisa e para quem propõe mudanças, incluindo os colegas do squad de validação.

## Antes de começar

- **Bugs e sugestões:** abra uma [issue](../../issues/new/choose) usando um dos modelos. Descreva o passo a passo para reproduzir o problema e o que era esperado.
- **Mudanças no código:** abra uma issue antes de mudanças grandes, para alinhar a abordagem.
- **Licença:** o projeto tem todos os direitos reservados (ver [`LICENSE`](LICENSE)). Ao enviar um pull request, você declara que a contribuição é de sua autoria e concorda que ela seja incorporada ao projeto sob os mesmos termos, cedendo ao autor os direitos sobre ela.

## Ambiente local

Siga o passo a passo do [README](README.md#como-executar-localmente). Em resumo: Docker para o MySQL, Node 22, `npm install` em `backend` e em `frontend`, copiar os `.env.example` e rodar `npm run seed`.

## Fluxo de trabalho

1. Crie uma branch a partir de `develop`, com prefixo do tipo da mudança: `feat/rastreamento-ao-vivo`, `fix/fuso-da-data`, `docs/c4`.
2. Escreva primeiro o teste que descreve o comportamento (TDD) e depois o código que o faz passar.
3. Faça commits pequenos no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em português e no imperativo:
   - `feat:` funcionalidade nova
   - `fix:` correção de bug
   - `test:` testes
   - `docs:` documentação
   - `refactor:` mudança de código sem mudar comportamento
   - `chore:` configuração e dependências
   - `ci:` pipeline
4. Abra o pull request para `develop` e preencha o modelo. O CI precisa passar e um revisor precisa aprovar antes do merge.
5. A `main` recebe apenas versões estáveis vindas da `develop`, que geram uma nova release.

## Checklist antes do pull request

No `backend`:

```bash
npm run lint
npm run typecheck
npm run test:cov    # cobertura mínima de 75%
npm run test:e2e    # precisa do MySQL rodando
```

No `frontend`:

```bash
npm run lint
npm run test:cov    # cobertura mínima de 25%
npm run build       # inclui a verificação de tipos
```

O backend usa Prettier (`npm run format`); o frontend segue o estilo do código existente (sem ponto e vírgula, aspas simples).

## Convenções do código

- **Idioma:** nomes de variáveis, funções e mensagens em português, como no domínio do negócio (`ordem`, `motorista`, `coleta`). Termos técnicos consagrados podem ficar em inglês.
- **Regras de negócio no backend:** o frontend só exibe o que a API permite (por exemplo, `transicoesPermitidas`). Toda validação de entrada também acontece no backend.
- **Banco de dados:** o schema muda somente por migration (`npm run migration:generate -- src/database/migrations/NomeDaMudanca`).
- **Comentários:** explicam o porquê de uma decisão, não o que a linha faz.

## Revisão de código

Ao revisar, verifique:

- se a mudança resolve a issue descrita;
- se há teste cobrindo o comportamento novo ou o bug corrigido;
- se as regras de permissão por perfil continuam valendo;
- se dados pessoais são tratados apenas quando necessários (ver [`docs/seguranca.md`](docs/seguranca.md));
- se a documentação em `docs/` foi atualizada quando o comportamento mudou.

Comentários de revisão devem ser específicos e sugerir uma alternativa quando apontarem um problema.
