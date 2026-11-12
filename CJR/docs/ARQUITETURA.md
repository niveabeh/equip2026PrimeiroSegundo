# Arquitetura e decisões

## Adições da v3

A migração 003 acrescenta acompanhamento operacional a stakeholders e o vínculo opcional activities.stakeholder_id. A entidade continua representando a participação em uma edição, não a organização inteira. O seed operacional é idempotente pelo marcador 3 em demo_seed_versions. Categorias compartilham um fluxo, com seis abas, para não multiplicar telas sem comportamento consistente.

A feature reading controla exclusivamente a preferência local de texto maior (16/18 px de base). A tipografia usa rem, tamanhos auxiliares a partir de 14 px e controles principais de pelo menos 44 px. A paginação considera a área disponível e a escala do texto. Em alturas menores e com zoom, áreas podem rolar para não cortar conteúdo; não há redução de texto como solução de densidade.

Um envolvido pode originar uma atividade com referência persistida, sujeita a FK e validação da mesma edição. O usuário revisa os campos e define o prazo antes de salvar. Alterações de responsabilidades são protegidas por versão otimista e auditadas. Arquivamento e RBAC continuam no backend. Veja COBERTURA-E-UX-V3.md para a matriz do briefing e as lacunas de discovery.

## Adições da v2

- A migração `002_sponsorships_and_context.sql` adiciona `activities.phase`, `audit.source`, `sponsors` e `demo_seed_versions`.
- `sponsors` se relaciona com edição e usuário responsável, possui versão otimista e gera auditoria de inclusão/alteração na mesma transação. A pessoa responsável precisa estar ativa e vinculada à edição, ou ser administradora.
- `seed-extended.ts` acrescenta cenários fictícios uma vez, preservando a base existente. As transições sintéticas são marcadas `source=demo`, enquanto eventos da API usam o padrão `source=application`.
- A camada shared fornece Modal, Pagination, RoboticsMark e paginação pelo espaço real do contêiner com ResizeObserver. O documento principal fica em 100dvh; os registros usam paginação, sem rolagem da página. Janelas de edição permitem rolagem interna para textos longos e telas pequenas.
- A auditoria transforma campos técnicos em nomes administrativos na camada entities/audit. Referências resolvidas incluem nomes de responsáveis e títulos de atividades. O registro bruto permanece acessível em uma janela separada.

```mermaid
erDiagram
  EDITIONS ||--o{ SPONSORS : relaciona
  USERS ||--o{ SPONSORS : acompanha
  EDITIONS ||--o{ AUDIT : preserva
```

Problema priorizado: perda de contexto e responsabilidades quando informações administrativas ficam dispersas e a equipe muda. Público: administração institucional, coordenação de edição e colaboradores operacionais. Hipótese: registros centralizados, autoria e consulta histórica reduzem dependência de pessoas específicas. O MVP demonstra o fluxo; não mede impacto real nem presume validação institucional.

```mermaid
flowchart LR
  U[Equipe organizadora] --> V[Vue 3 · FSD]
  V -->|REST JSON + JWT| E[Express · autenticação · RBAC]
  E --> T[Transação: registro + auditoria]
  T --> P[(PostgreSQL / PGlite)]
```

REST usa prefixo `/api`. A identidade vem do JWT, mas papel e situação ativa vêm do banco em cada requisição. Administração acessa todas as edições; demais perfis exigem membership. Toda gravação em uma edição verifica bloqueio de arquivamento no servidor. Novas atribuições exigem responsável ativo e com acesso à edição.

```mermaid
erDiagram
  USERS ||--o{ MEMBERSHIPS : possui
  EDITIONS ||--o{ MEMBERSHIPS : autoriza
  EDITIONS ||--o{ ACTIVITIES : organiza
  USERS ||--o{ ACTIVITIES : responsavel
  EDITIONS ||--o{ DECISIONS : preserva
  ACTIVITIES o|--o{ DECISIONS : contextualiza
  USERS ||--o{ DECISIONS : registra
  EDITIONS ||--o{ STAKEHOLDERS : envolve
  USERS ||--o{ AUDIT : autor
  EDITIONS o|--o{ AUDIT : contexto
```

- `editions`: referência administrativa compartilhável, situação, data, local e resumo.
- `memberships`: vínculo explícito por usuário e edição; perfil global está em users.
- `activities`: título, descrição, responsável único, prazo, prioridade, situação e versão.
- `decisions`: título, justificativa, autor, data e vínculo opcional com atividade. Somente inclusão.
- `stakeholders`: nome e função por edição; não equivale a usuário do sistema.
- `audit`: autor, instante, entidade, identificador, ação e JSON antes/depois. Mudanças em contas têm contexto de edição nulo e são visíveis na auditoria administrativa.

IDs de domínio usam UUID para novos registros; seed usa IDs legíveis. Auditoria usa sequência bigserial. Chaves estrangeiras preservam referências. Todos os dados do seed são fictícios. O log registra contas sem senha/hash. Respostas de atividades não carregam dados privados da conta além da identificação do responsável.

## Escolhas e trade-offs

Vue 3 + TypeScript com FSD separa composição de páginas, fluxos de usuário, entidades e infraestrutura. O shell é widget; o formulário de atividade e a sessão são features reutilizáveis. Recursos menores permanecem nas páginas para evitar abstrações vazias. Vite faz proxy em desenvolvimento; no build, Express serve o frontend na mesma origem.

PostgreSQL atende relações, integridade e auditoria. PGlite executa o motor PostgreSQL em um único processo no modo de demonstração, com armazenamento local; o adaptador `pg` atende PostgreSQL externo. Ambos usam consultas parametrizadas e a mesma migração. Não foram adicionados Redis, microsserviços nem agentes autônomos: os “agentes” deste recorte são os atores humanos e suas responsabilidades.

Migração e seed executam na inicialização de uma instância. Para produção com múltiplas réplicas, mover migrações para um job exclusivo, adicionar bloqueio de migração e credenciais separadas. Atividades usam versão otimista mais bloqueio de linha; arquivamento bloqueia a linha da edição dentro da transação.

## Fronteiras e interoperabilidade futura

| Informação                                  | Fonte de verdade proposta | Consumo futuro                    | Regra                                     |
| ------------------------------------------- | ------------------------- | --------------------------------- | ----------------------------------------- |
| edition.id e metadados gerais               | Gestão do Evento          | Competições e histórico público   | Contrato versionado e validação por campo |
| Atividades, contatos e auditoria            | Gestão do Evento          | Equipe administrativa autorizada  | Não publicar automaticamente              |
| Modalidades, equipes, disputas e resultados | Gestão das Competições    | Outros domínios conforme contrato | Não modelados neste MVP                   |
| Conteúdo público e memória educativa        | Histórico Público         | Portal público                    | Publicação validada pela instituição      |

Não existe endpoint público nem compartilhamento entre equipes nesta entrega. Uma futura API de integração deverá usar credencial de serviço, escopo mínimo e aprovação institucional dos campos publicados. Não reutilizar o endpoint administrativo como portal público.
