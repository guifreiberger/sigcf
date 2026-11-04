# ADR 0001 — Node.js com NestJS e MySQL no lugar de Spring Boot e PostgreSQL

**Status:** aceita, pendente de validação com o orientador · **Data:** 25/09/2026

## Contexto

A versão inicial da proposta (RFC) citava Spring Boot (Java) no backend e PostgreSQL como banco. Já o README do repositório previa Node.js e MySQL, e a interface seria em React. O projeto é desenvolvido por uma única pessoa, com prazo de um semestre, e a proposta exige uma API organizada nas camadas Controller, Service e Repository (RNF02).

## Decisão

Backend em **Node.js 22 com NestJS 12 e TypeORM**, banco **MySQL 8**, tudo em **TypeScript**, a mesma linguagem do frontend. Os RNFs da proposta foram reescritos para refletir a escolha (ver [`tcc/atualizacoes-proposta.tex`](../tcc/atualizacoes-proposta.tex)).

## Alternativas consideradas

- **Spring Boot com PostgreSQL**, como na RFC: stack robusta, mas acrescenta uma segunda linguagem (Java) ao projeto, com mais configuração para o mesmo resultado num MVP individual.
- **Express sem framework:** mais simples no início, mas a separação em camadas ficaria só na disciplina do desenvolvedor, sem nada que a imponha.
- **Prisma no lugar do TypeORM:** boa experiência de uso, mas não tem classes Repository explícitas, que são justamente a camada descrita na RNF02.

## Consequências

- Uma única linguagem nas duas pontas reduz o custo de manutenção e permite compartilhar o raciocínio entre frontend e backend.
- O NestJS impõe módulos, injeção de dependências e a divisão Controller/Service/Repository, o que torna a arquitetura parte da estrutura do framework e mais fácil de defender.
- O MySQL com InnoDB atende às transações ACID exigidas pela RNF03 (mudança de status e histórico gravados juntos).
- **Risco:** o playbook pede seguir a arquitetura e as tecnologias definidas no semestre anterior. A arquitetura em camadas foi mantida e só as tecnologias mudaram; a mudança precisa do aceite do orientador, registrado em ata de orientação.
