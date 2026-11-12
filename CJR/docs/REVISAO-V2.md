# Revisão v2 — CJR / Memória Viva

## Identidade e composição

A direção visual mantém aproximadamente 60% de superfícies claras, estruturadas por azul profundo e pequenos detalhes em ciano. É uma intenção de composição, não uma medição rígida por tela. O azul #1559CC é uma escolha visual do protótipo, não uma especificação oficial atribuída à Prefeitura. Os elementos de robótica usam desenho vetorial local, trilhas, nós, pontos de conexão e geometria de circuitos; nenhuma fonte ou imagem externa é necessária.

A navegação azul escura contrasta com a área de trabalho em azul gelo. A Trilha de Auditoria aparece no topo do menu, na chamada principal do painel, no login e no bloco Memória Viva. O principal argumento do produto é continuidade com autoria e contexto.

## Cada aba tem um papel

| Aba                   | Papel                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Painel                | Resumir operação, rede de apoio e mudanças recentes, com acesso rápido à trilha                |
| Trilha de auditoria   | Filtrar e recuperar quem alterou, quando, antes/depois e contexto da mudança                   |
| Atividades e decisões | Planejar e acompanhar execução em kanban, antes/durante/depois, junto das decisões permanentes |
| Patrocinadores        | Registrar apoio combinado, responsável pelo relacionamento, contato e andamento por edição     |
| Histórico             | Recuperar responsabilidades, decisões, apoios e aprendizados de uma edição anterior            |
| Envolvidos            | Organizar fornecedores, apoiadores, voluntários, parceiros e empresas contratadas              |
| Usuários e permissões | Controlar contas, perfis, vínculo por edição e consultar mudanças de acesso                    |

O documento não rola. Quadros e listas usam paginação. No celular, um seletor alterna as colunas do kanban e os painéis do resumo. A auditoria alterna entre linha do tempo e comparação, mantendo contexto. Conteúdo completo e formulários são acessíveis em janelas com rolagem interna quando necessária.

## Kanban funcional

Três colunas representam situações das atividades: A fazer, Em execução, Concluídas. A quarta coluna reúne decisões já registradas, com vínculo opcional a uma atividade. Decisões não são tarefas e não recebem etapas artificiais de aprovação. Cartões de atividades podem ser arrastados ou movidos por um seletor acessível por teclado. As duas formas usam a mesma API, checagem de papel e versão otimista. O colaborador só move atividades próprias. Edição arquivada permanece somente leitura.

## Patrocinadores

Patrocínio é uma relação administrativa específica de cada edição. Os campos registram organização, apoio combinado, condições de reconhecimento, contato fictício, responsável, observações e andamento: Em prospecção, Em alinhamento, Confirmado, Apoio recebido. Cadastro e alteração geram auditoria na mesma transação. Não há contratos, pagamentos, gestão contábil, uso automático de marcas ou exposição pública dos contatos.

## Auditoria como diferencial

A interface mostra uma linha do tempo, filtros por pessoa, tipo de registro, ação e texto; uma comparação com nomes de campos em português; e acesso ao contexto do registro. A ação Ver registro completo abre os dados integrais. A exportação JSON inclui somente os registros carregados e filtrados, até 200, sem promessa de histórico completo além desse limite.

Os cenários fictícios adicionados pelo seed usam source=demo e são identificados na tela e na exportação. Operações realizadas pelo usuário usam source=application. A trilha mantém bloqueio de edição pela API e trigger no banco, mas não é inviolável contra o administrador do próprio banco.

## Base fictícia ampliada

Em uma base vazia, o seed define:

- 4 edições: demonstrações de 2024, 2025, 2026 e 2027.
- 8 contas, com papéis operacionais de infraestrutura, comunicação, voluntariado, relacionamento e memória.
- 45 atividades distribuídas entre antes, durante e depois.
- 18 decisões com justificativa e autoria.
- 23 vínculos de envolvidos por edição.
- 16 relações de patrocínio por edição.
- 208 eventos sintéticos na trilha, além do registro inicial da base.

São cenários escritos no código, não dados reais da Prefeitura, de escolas ou de participantes. A expansão é aplicada uma vez por demo_seed_versions; não apaga a base existente. Nomes, contatos, datas e apoios não descrevem fatos institucionais.

## Aderência ao briefing relido

As duas páginas do Desafio 01 destacam organização, continuidade e rastreabilidade; atores e responsabilidades; fornecedores, apoiadores, voluntários, parceiros e empresas contratadas; informações antes/durante/depois; níveis de acesso e consulta histórica. A revisão permanece nesse recorte. Não foram incluídos equipes inscritas, modalidades, disputas, pontuação, resultados nem portal público.

## Limite desta revisão

A pedido do usuário, não foram executados testes. Houve somente compilação para gerar os arquivos de distribuição. Veja VALIDACAO.md para o alcance exato dessa entrega.
