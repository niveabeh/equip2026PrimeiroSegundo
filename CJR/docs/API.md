# API REST

## Revisão v3: envolvidos e execução operacional

`PATCH /stakeholders/:id` permite que administração ou coordenação atualizem a participação de uma edição não arquivada. Exige `version`; conflito retorna 409. O corpo de cadastro/atualização aceita `name`, `category`, `responsibility` (até 1000 caracteres), `contact`, `owner_id` (ou null para registros legados), `phase`, `operational_status` e `notes` (até 2000 caracteres).

Etapas: `before`, `during`, `after`. Andamentos operacionais: `scheduled`, `confirmed`, `in_progress`, `finished`. O responsável da equipe deve estar ativo e ter acesso à edição. A atualização da participação e seu log pertencem à mesma transação. O GET da edição inclui `owner_name` e os campos operacionais.

Atividades passam a aceitar `stakeholder_id` opcional e anulável. O backend rejeita vínculo com envolvido de outra edição. A rota usada para criar uma atividade a partir da interface é `/atividades?nova=1&envolvido=<id>`; ela preenche valores iniciais para revisão pela pessoa, sem salvar automaticamente.

As seis abas da interface usam a mesma entidade e os valores de categoria existentes: Fornecedor, Apoiador, Voluntário, Parceiro, Empresa contratada, Outro. O estado da aba pode ser representado em `/envolvidos?categoria=fornecedores` e chaves equivalentes. Um `ref` na URL administrativa abre o registro em seu grupo correspondente; toda consulta permanece sujeita à autorização da edição.

Revisão v2: patrocinadores são relações administrativas por edição, sem contratos ou pagamentos. As rotas novas usam as mesmas regras de autenticação, vínculo, arquivamento e auditoria transacional.

| Método e caminho            | Operação                                           |
| --------------------------- | -------------------------------------------------- |
| GET /editions/:id/sponsors  | Consulta de patrocinadores e responsáveis          |
| POST /editions/:id/sponsors | Admin/coordenação: cadastro de relação             |
| PATCH /sponsors/:id         | Admin/coordenação: atualização com versão otimista |

Corpo de patrocínio: `{name, contribution, counterpart, contact, owner_id, status, notes}`. Atualizações exigem também `version`. Andamentos: `prospect`, `contacted`, `confirmed`, `delivered`. O responsável precisa estar ativo e ter acesso à edição. Um conflito retorna HTTP 409.

Atividades agora possuem `phase`: `before`, `during`, `after`, com padrão `before` para clientes antigos. O kanban usa as situações existentes, e a movimentação pelo colaborador continua aceitando somente `{status,version}`. A categoria de envolvidos também aceita **Empresa contratada**.

Registros de auditoria incluem `source`: `demo` para cenários fictícios escritos no seed, `application` para operações da aplicação. A consulta por edição ordena por instante e identificador, decrescentes. A paginação da interface e a exportação JSON abrangem os dados carregados, até 200 registros; não existe paginação de todo o histórico no servidor nesta revisão.

Base `/api`. JSON. Enviar `Authorization: Bearer <token>` exceto em login e health. Não existe cadastro público. Erros: `{error: string, details?: object}`. 400 validação; 401 sessão; 403 permissão; 404 inexistente; 409 conflito/arquivamento/duplicidade; 429 limite de tentativas.

| Método e caminho                  | Acesso / operação                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| GET /health                       | Verifica conexão com banco, sem dados administrativos                                |
| POST /auth/login                  | `{email,password}` → `{token,user}`                                                  |
| GET /me                           | Identidade ativa atual                                                               |
| GET /editions                     | Edições visíveis ao perfil                                                           |
| POST /editions                    | Admin: `{name,year,event_date,location,summary}`                                     |
| PATCH /editions/:id               | Admin: `{status: planning\|active\|archived}`; edição não arquivada                  |
| GET /editions/:id/members         | Usuários ativos que podem ser responsáveis                                           |
| PUT /editions/:id/members/:userId | Admin: vincular usuário ativo; corpo `{}`                                            |
| GET /editions/:id/activities      | Lista de atividades e nome do responsável                                            |
| POST /editions/:id/activities     | Admin/coordenação: criar atividade                                                   |
| PATCH /activities/:id             | Admin/coordenação: campos + version; colaborador próprio: somente `{status,version}` |
| GET /editions/:id/decisions       | Decisões, autoria e atividade relacionada                                            |
| POST /editions/:id/decisions      | Admin/coordenação: `{title,rationale,activity_id: string\|null}`                     |
| GET /editions/:id/stakeholders    | Consulta de envolvidos                                                               |
| POST /editions/:id/stakeholders   | Admin/coordenação: `{name,category,responsibility,contact}`                          |
| GET /editions/:id/audit           | Últimos 200 registros da edição, mais recentes primeiro                              |
| GET /users                        | Admin: contas sem senha/hash                                                         |
| POST /users                       | Admin: `{name,email,password,role}`; senha mínima de 12 caracteres                   |
| PATCH /users/:id                  | Admin: `{role,active}`; não permite autoalteração                                    |
| GET /admin/audit                  | Admin: últimos 200 registros globais                                                 |

Todos os caminhos com edição exigem acesso a ela. Coordenador e colaborador precisam de vínculo. Edição arquivada bloqueia gravações até para administração. Perfis: `admin`, `coordinator`, `collaborator`.

Exemplo de atividade (datas civis YYYY-MM-DD):

```json
{
  "title": "Conferir infraestrutura",
  "description": "Verificar os pontos de apoio",
  "owner_id": "u-colab",
  "due_date": "2027-04-10",
  "status": "pending",
  "priority": "high"
}
```

Situações: `pending`, `doing`, `done`; prioridades: `normal`, `high`. Para atualização por coordenação, envie todos esses campos e a versão atual `version`. O servidor retorna a versão incrementada. Versão desatualizada retorna 409. Categorias de envolvidos: Fornecedor, Parceiro, Voluntário, Apoiador, Empresa contratada, Outro. Decisões só aceitam atividade da mesma edição. Inclusões retornam HTTP 201.

Não há rotas DELETE. Nenhum endpoint aceita autor ou instante de auditoria informados pelo cliente. Não há API de competições nem API pública de histórico.
