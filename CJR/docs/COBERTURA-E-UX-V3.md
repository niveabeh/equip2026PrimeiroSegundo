# Revisão v3 — leitura confortável e gestão dos envolvidos

Revisão de 12/11/2026. Foram relidas as quatro imagens enviadas nesta etapa, com atenção ao Desafio 01, itens 4 (Abrangência e aspectos a investigar) e 5 (Limites e autonomia). As imagens foram tratadas como material de referência; não como autorização para implantação, publicação ou uso de dados reais.

## Problema priorizado e público

Informações e decisões operacionais dispersas dificultam a passagem entre equipes. O MVP prioriza a conexão entre participação, responsabilidade, execução e memória. A interface foi ajustada para leitura confortável por pessoas com diferentes necessidades, inclusive usuários de 45 anos ou mais. Não há cadastro de idade, restrição por idade ou presunção de incapacidade associada à faixa etária.

## Cobertura dos quatro aspectos do item 4

| Aspecto do briefing                                            | O que o MVP oferece                                                                                                                                                  | Limite que permanece                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Acompanhar diferentes edições e suas mudanças                  | Seletor de edição, histórico, registros vinculados à origem e auditoria de alterações                                                                                | Não há comparação automática lado a lado entre anos nem reaproveitamento automático de registros                                             |
| Registrar e recuperar envolvidos, responsabilidades e decisões | Seis abas de envolvidos, criação e atualização de responsabilidades, vínculo opcional da atividade com o envolvido, decisões com justificativa e trilha antes/depois | Não há importação de documentos dispersos, anexos ou busca em toda a instituição                                                             |
| Diferentes níveis de acesso às informações                     | Administrador institucional, coordenador e colaborador, autorização no backend e vínculo por edição                                                                  | A classificação fina de cada campo como restrito e eventual acesso de terceiros dependem de definição institucional                          |
| Continuidade independente da permanência de uma pessoa         | Contatos, função, responsável da equipe, etapa, andamento, orientações e decisões ficam persistidos por edição                                                       | É necessário validar o processo real de passagem de equipe; o sistema não garante que o conhecimento tenha sido registrado de forma completa |

O MVP possui recursos alinhados aos quatro aspectos, mas isso não constitui validação institucional nem comprovação de que todos os processos reais foram cobertos. O próprio item 4 apresenta contexto e aspectos de investigação, e não uma lista fechada de funcionalidades obrigatórias.

## Seis abas dentro do mesmo fluxo operacional

1. **Fornecedores:** materiais, entregas e serviços de apoio à organização.
2. **Apoiadores:** apoios e recursos combinados, com pessoa de referência.
3. **Voluntários:** função, acompanhamento e etapa de participação.
4. **Parceiros:** acordos e responsabilidades compartilhadas.
5. **Empresas contratadas:** acompanhamento operacional do serviço previsto. Não substitui contrato, contratação pública ou pagamento.
6. **Outros participantes:** participações administrativas e de passagem de equipe. Não é cadastro de competidores, estudantes ou equipes inscritas.

Patrocinadores continuam em sua área específica. Uma organização pode exercer mais de uma participação; cada cadastro descreve uma responsabilidade naquela edição, e não um cadastro corporativo único com histórico financeiro.

No computador, os seis grupos são abas com nome, ícone, contagem e cor de apoio. Em telas pequenas, a escolha é feita por uma lista rotulada, com os mesmos seis grupos e registros. A cor não é a única forma de identificar uma categoria. O estado da aba fica na URL; as abas podem ser percorridas por teclado.

## Fluxo coerente com o item 5

**Edição → grupo de envolvidos → responsabilidade → atividade → decisão → auditoria → recuperação histórica.**

A coordenação cadastra a participação, identifica quem da equipe acompanha, define a etapa (antes/durante/depois) e o andamento. Em Ver detalhes, pode atualizar a responsabilidade ou criar uma atividade já relacionada ao envolvido. Essa atividade recebe título e descrição iniciais, que a pessoa revisa, e ainda exige prazo antes de salvar. As decisões podem se vincular à atividade. Inclusões e alterações são registradas na mesma transação do log de auditoria.

A edição arquivada permanece somente leitura na API e na interface. Alterar uma responsabilidade exige a versão atual; um conflito retorna 409. O colaborador pode consultar a rede da edição e alterar apenas a situação de suas próprias atividades. Cadastrar um envolvido não cria uma conta de acesso.

O recorte permanece gestão operacional. Não inclui modalidades, regras de disputa, equipes inscritas, resultados, pontuações, gestão financeira, compras, contratos ou portal público. Não foram criadas seis aplicações diferentes ou fluxos sem persistência: as abas organizam um mesmo módulo e conduzem às atividades e à memória do evento.

## Mudanças de UI e UX

- Texto principal, campos e ações em 16 px no modo padrão; textos auxiliares não menores que 14 px. O layout usa rem para acompanhar a opção de tamanho maior.
- Opção **Texto maior** na barra superior, com tamanho-base de 18 px, preservada apenas neste navegador.
- Botões e controles principais com pelo menos 44 px de altura, rótulos explícitos e foco visível.
- Menos registros por página, calculados pelo espaço disponível e pelo tamanho do texto.
- Leitura dos detalhes em janela própria, sem depender de arrastar cartões ou interpretar somente ícones.
- Azul como identidade principal. Cores suaves ajudam a separar categorias; textos e ícones continuam identificando o significado.
- Busca limitada à aba escolhida, contagem de resultados, opção para limpar a busca e orientação quando não há cadastros.
- A página usa a altura da janela. Em telas pequenas, com zoom ou texto maior, áreas permitem rolagem controlada para evitar corte de conteúdo. A preferência por ausência de rolagem não é atendida à custa de letras pequenas ou informações inacessíveis.

As decisões de UI foram implementadas no código; não representam certificação WCAG nem validação com usuários reais.

## Evolução técnica e dados fictícios

A migração 003 adiciona à participação: responsável da equipe, etapa, andamento, orientações e versão. Também permite relacionar uma atividade a um envolvido da mesma edição. O backend valida esse vínculo, o acesso à edição e a situação de arquivamento.

O seed operacional acrescenta 48 participações fictícias, duas de cada grupo em cada uma das quatro edições. As 23 participações de demonstração anteriores recebem contexto operacional quando ainda não possuem responsável e não foram atualizadas. Em uma base vazia, o código define 71 participações, mantendo as 8 contas, 45 atividades, 18 decisões e 16 relações de patrocínio anteriores. Não foram executados testes para confirmar a população em execução nesta revisão. O seed tem controle de versão e não apaga a base existente.

## Informações internas, restritas e potencialmente públicas

O padrão deste MVP é **interno e autenticado**. Contatos e histórico não possuem portal público. Contas e permissões são administradas pelo perfil institucional. Decidir quais campos exigem restrição adicional, qual é a política de retenção e quais informações poderiam ser publicadas são atividades de discovery a confirmar com a organização. A exportação administrativa da consulta de auditoria não equivale a aprovação de divulgação pública.

## Pendências importantes para a equipe

Validar com organizadores o problema priorizado, a passagem entre equipes, os perfis reais e a classificação das informações; depois realizar sessões com usuários, incluindo pessoas de 45 anos ou mais, revisão de acessibilidade e validação funcional. Integração com outros desafios continua uma proposta de contrato de metadados da edição, sem implementação ou publicação automática.

A pedido do usuário na etapa anterior, não foram executados testes nesta revisão. Houve somente compilação dos arquivos de entrega. Os resultados da v1 não validam a v3.
