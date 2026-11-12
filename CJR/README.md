# CJR — Gestão do Evento · v3

MVP acadêmico do **Desafio 01 — Gestão do Evento**, destinado à Prefeitura de Joinville e à organização do Campeonato Joinvilense de Robótica (CJR). Centraliza a preparação administrativa e preserva o conhecimento entre equipes e edições. Interface clara, azul e com símbolo de robótica, sem brasão ou reprodução de marca oficial.

**Todos os registros, pessoas, contatos, datas e locais da demonstração são fictícios.** O nome do evento identifica o contexto do desafio; o protótipo não comprova aprovação institucional, implantação ou cessão jurídica de direitos. O destinatário pretendido do programa é a Prefeitura de Joinville e a organização do CJR; instrumentos de autoria, licença e eventual cessão devem ser definidos pela equipe com a instituição, conforme o regulamento.

## Leitura confortável e organização operacional (v3)

Texto principal de 16 px, opção Texto maior, controles mais espaçosos e cores de apoio. O módulo Envolvidos agora possui seis abas: Fornecedores, Apoiadores, Voluntários, Parceiros, Empresas contratadas e Outros participantes. Cada participação pode registrar função, quem acompanha, etapa, andamento e orientações. É possível atualizar a responsabilidade, criar uma atividade relacionada e recuperar as mudanças na auditoria.

A análise dos itens 4 e 5 do briefing e as lacunas de discovery estão em [Cobertura e UX v3](docs/COBERTURA-E-UX-V3.md). Em telas pequenas, texto maior ou zoom, a interface permite rolagem controlada; não reduz letras para forçar tudo a caber. Esta versão foi compilada, sem execução de testes.

## Base visual e funcional

Identidade light com base clara de aproximadamente 60%, navegação azul profunda e detalhes vetoriais de robótica. Abas em 100dvh sem rolagem do documento; paginação por espaço disponível, kanban integrado e cadastro de patrocinadores. A Trilha de Auditoria é o destaque do produto, com linha do tempo, comparação legível, filtros e exportação da consulta.

O seed define 4 edições fictícias, 8 contas, 45 atividades, 18 decisões, 71 participações de envolvidos e 16 relações de patrocínio. Registros sintéticos de auditoria são identificados como cenários de demonstração. **Esta revisão não executou testes, conforme solicitado; houve apenas compilação.** Detalhes em [Revisão v2](docs/REVISAO-V2.md) e [Validação](docs/VALIDACAO.md).

## Executar em Windows, macOS ou Linux

Pré-requisito: Node.js 22.15 ou superior e npm. Abra o terminal **nesta pasta**, onde está o package.json:

```sh
npm ci
npm run dev
```

Acesse **http://localhost:5173**. API: http://localhost:3001/api. O primeiro início pode levar alguns segundos para inicializar o PostgreSQL embarcado. Migração e seed são automáticos e idempotentes. Não precisa instalar PostgreSQL nem Docker para esse modo.

O banco local é **PGlite: PostgreSQL compilado para WebAssembly**, persistido em `backend/data`. Não é um array em memória nem um mock de API. Execute apenas um processo backend usando esse diretório. Os testes usam outro banco, temporário em memória, e não alteram os dados da aplicação. [Documentação do PGlite](https://pglite.dev/docs/).

Para servir o frontend compilado pelo backend em uma única porta:

```sh
npm start
```

Acesse **http://localhost:3001**. Esse comando faz o build antes de iniciar. Encerre a execução anterior com Ctrl+C para liberar a porta 3001. Não execute os dois modos ao mesmo tempo.

## PostgreSQL com Docker Compose

Com Docker Desktop/Engine em execução, na raiz:

```sh
docker compose up --build
```

Acesse **http://localhost:3001**. O Compose cria PostgreSQL 17 com volume persistente e o servidor Node servindo a aplicação compilada. O banco não expõe uma porta ao host. Para parar, `docker compose down` preserva o volume. As credenciais e a chave padrão do Compose são **somente de demonstração local**, com a aplicação publicada em 127.0.0.1. Antes de qualquer hospedagem, substitua `JWT_SECRET` e `POSTGRES_PASSWORD`, desative `SEED_DEMO` e siga as pendências de segurança abaixo.

Também é possível usar um PostgreSQL próprio: copie `backend/.env.example` para `backend/.env` e configure `DATABASE_URL`. O mesmo esquema SQL, migração e seed são usados nos dois adaptadores. O modo local usa PGlite quando essa variável não está definida.

## Contas de teste

Senha de todas as contas iniciais: **`Demo@2026!`**

| E-mail fictício          | Perfil                      | Responsabilidade                                                                 |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------- |
| admin@example.test       | Administrador institucional | Edições, arquivamento, contas, perfis, vínculos e acesso global                  |
| coordenador@example.test | Coordenador de edição       | Atividades, atribuições, decisões e envolvidos das edições vinculadas            |
| colaborador@example.test | Colaborador operacional     | Consulta às edições vinculadas e atualização da situação das próprias atividades |

Contas adicionais (mesma senha): infraestrutura@example.test, comunicacao@example.test, voluntariado@example.test, relacionamento@example.test e memoria@example.test.

Coordenador e colaborador não acessam automaticamente novas edições. O administrador precisa vinculá-los em **Usuários e permissões**. Envolvidos (parceiros, voluntários, fornecedores) não recebem uma conta automaticamente.

## Fluxo demonstrável

1. Entrar como administrador e abrir **Painel da edição**: preparação, progresso real das atividades, próximos passos e decisões.
2. Em **Atividades e decisões**, criar uma atividade, atribuir um responsável vinculado, definir prazo, prioridade e etapa antes/durante/depois. Mover o cartão por arraste ou pelo seletor de situação.
3. Entrar como colaborador: atualizar somente a situação de uma atividade própria. As outras ficam em consulta.
4. Entrar como coordenador: registrar uma decisão, sua justificativa e, opcionalmente, a atividade relacionada.
5. Abrir **Patrocinadores**: cadastrar apoio combinado, responsável, condições de reconhecimento e acompanhar o andamento.
6. Consultar **Trilha de auditoria**: filtrar autoria, ação e registro, comparar os campos antes/depois e exportar a consulta.
7. Abrir **Histórico de edições**, consultar a edição fictícia de 2026 e recuperar decisões/aprendizados. O seletor de edição muda todas as consultas administrativas.
8. Como administrador, criar uma edição e vincular a próxima equipe. Arquivar uma edição a torna somente leitura, inclusive pela API. O MVP não reabre edições arquivadas.

## Escopo e entregas

| Necessidade do briefing         | Implementação                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Organização                     | Edições, atividades, envolvidos e responsabilidades por edição                 |
| Continuidade                    | Consulta de edições anteriores, resumo de aprendizados, decisões com contexto  |
| Rastreabilidade                 | Auditoria transacional e registros de decisão permanentes                      |
| Diferentes níveis de acesso     | Autenticação, RBAC no servidor e vínculo por edição                            |
| MVP funcional, não apenas telas | Navegação, formulários e persistência real, mensagens de erro e estados vazios |
| Privacidade desde a concepção   | Dados fictícios, área autenticada, sem portal público                          |
| Engenharia e continuidade       | Migração, seed, testes, build, Compose e documentação técnica                  |

Não inclui gestão de equipes de robótica, inscrições de estudantes, modalidades, regras de disputas, pontuações ou resultados. Também não inclui portal público nem publicação automática da memória do evento. Integração com os outros desafios é uma proposta documentada, não uma integração já realizada.

## Estrutura e comandos

```text
frontend/src/
  app/        inicialização, roteamento, estilos
  pages/      composição das telas administrativas
  widgets/    estrutura de navegação e contexto de edição
  features/   autenticação e formulário de atividades
  entities/   contratos e estado das edições
  shared/     cliente HTTP, formatação e estados de carregamento
backend/
  src/        servidor, API, autorização e adaptador de banco
  migrations/ esquema PostgreSQL versionado
  test/       testes de integração com banco real PGlite
docs/         arquitetura, API, roteiro de pitch e validação
```

Frontend e backend são workspaces separados. A direção de dependências do FSD é `app → pages → widgets → features → entities → shared`; páginas também podem importar diretamente camadas inferiores. Nenhuma camada inferior importa páginas ou app. Os contratos em `entities/models.ts` não dependem da camada shared. O backend foi mantido compacto para o hackathon; separação adicional por domínio está no backlog.

```sh
npm test       # integração da API e regras de datas no frontend
npm run build # TypeScript nos dois projetos e bundle Vite
```

O lockfile fixa as versões efetivamente instaladas. A migração inicial fica em `backend/migrations/001_initial.sql`; a tabela `schema_migrations` registra sua aplicação. Novas evoluções deverão adicionar migrações, sem editar a migração aplicada. O seed inicial popula uma base vazia. A expansão em seed-extended.ts acrescenta cenários fictícios uma única vez via demo_seed_versions, inclusive em uma base de demonstração anterior, sem apagar dados existentes. A migração 002 acrescenta patrocinadores, etapa da atividade e origem do log; a 003 acrescenta acompanhamento operacional dos envolvidos e vínculo de atividade. seed-operational.ts completa os cenários de demonstração uma vez, sem apagar a base. Em `NODE_ENV=production`, seed exige `SEED_DEMO=true`; `JWT_SECRET` de pelo menos 32 caracteres é obrigatório.

## Segurança e limites conhecidos

- Senhas com bcrypt; tokens JWT HS256 com validade de duas horas. O servidor consulta usuário e perfil a cada requisição, então desativação e troca de perfil afetam tokens já emitidos.
- JWT mantido em sessionStorage, não em localStorage. Esse armazenamento ainda é vulnerável a XSS; evolução prevista para cookies HttpOnly/Secure, proteção CSRF e renovação/revogação de sessões. Sair remove o token deste navegador, sem revogá-lo no servidor.
- Chave aleatória no desenvolvimento: reiniciar o servidor encerra as sessões. Configure segredo fixo forte no ambiente de hospedagem.
- Consultas parametrizadas, validação Zod, limite de corpo, Helmet, limite de tentativas de login e CORS de origem configurável. CORS não substitui autorização.
- Cada alteração de domínio e seu log pertencem à mesma transação. Falha no log reverte a alteração. Trigger bloqueia UPDATE/DELETE na auditoria, mas o proprietário/superusuário do banco pode remover esse mecanismo. O MVP não é um registro forense inviolável; contas de migração e aplicação precisam ser separadas antes de produção.
- Versão otimista das atividades, responsabilidades de envolvidos e relações de patrocínio evita sobrescrita silenciosa; conflito retorna HTTP 409. Decisões são permanentes; correções devem ser novas decisões que referenciem o contexto anterior.
- Auditoria carrega até 200 registros recentes por edição. Há paginação na interface e exportação JSON dos registros carregados e filtrados. Ainda não há paginação de todo o histórico no servidor, anexos, notificações, recuperação de senha, SSO, MFA, remoção de vínculo nem exclusão de registros. Eventos sintéticos usam source=demo; alterações realizadas pelo usuário usam source=application.
- Envolvidos podem ser cadastrados e atualizados com auditoria e conflito de versão. Decisões são permanentes; sua correção exige um novo registro com contexto. Edições têm criação e mudança de situação na API; arquivamento está disponível na tela. Datas, nomes e locais existentes são de demonstração.
- Sem certificação formal de acessibilidade. Há navegação por teclado, foco visível, link para pular ao conteúdo, rótulos, tabelas semânticas, mensagens com role, layout móvel e respeito a movimento reduzido. As abas usam altura fixa e paginação; no celular, as colunas e os painéis alternam por seletores. Formulários e registros completos abrem em janelas com rolagem interna quando necessária para preservar conteúdo e acesso por teclado.
- O aplicativo funciona sem fontes remotas: usa fontes do sistema. Não carrega logotipos oficiais ou imagens externas.
- Antes de produção: HTTPS, segredos próprios, gestão de sessões, usuários reais por processo autorizado, validação institucional/LGPD, política de retenção e restauração testada de backups. PGlite local é destinado à demonstração, não à implantação multi-instância.

## Backlog priorizado

| Prioridade | Evolução                                                             | Resultado esperado                                            |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| P0         | Validar o problema, fluxo e perfis com a organização                 | Confirmar aderência e regras de acesso reais                  |
| P0         | Sessões HttpOnly, recuperação de senha e conta inicial segura        | Retirar credenciais de demonstração de qualquer implantação   |
| P0         | Separar usuário de migração e aplicação; backups e retenção          | Reduzir acesso privilegiado e preservar registros             |
| P1         | Paginação completa no servidor e política de exportação da auditoria | Consulta histórica completa em maior volume                   |
| P1         | Remoção de vínculo e gestão detalhada da edição                      | Completar o ciclo administrativo                              |
| P1         | Checklist reutilizável entre edições, com origem rastreada           | Acelerar preparação sem copiar decisões como fatos novos      |
| P1         | Testes E2E automatizados, revisão WCAG e testes com usuários         | Ampliar validação de UX, acessibilidade e responsividade      |
| P2         | Anexos privados com controle de acesso, notificações e SSO           | Apoiar operação após validação do recorte                     |
| P2         | Contrato de integração aprovado por campo                            | Compartilhar apenas metadados autorizados com outros domínios |

Consulte [arquitetura e modelo](docs/ARQUITETURA.md), [contrato REST](docs/API.md), [roteiro de apresentação](docs/DEMONSTRACAO.md) e [validação executada](docs/VALIDACAO.md).

## Uso de IA e autoria

Foi utilizado **OpenAI Codex** para apoiar interpretação do material fornecido, elaboração do código, interface, testes e documentação. As imagens do regulamento e briefing, incluindo as quatro imagens reenviadas em 12/11/2026, foram consultadas na conversa de implementação; não são distribuídas no ZIP. A equipe deve revisar, compreender e responder pelas entregas, identificar seus integrantes e declarar este uso no pitch. Não foi efetuado deploy, publicação em GitHub ou cessão institucional. Não foi atribuída uma licença de terceiros ao código do projeto; as dependências mantêm suas próprias licenças.
