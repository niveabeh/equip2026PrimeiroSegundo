# Validação da entrega

Verificado em 11/11/2026, Windows, Node.js 22.15 e npm 10.9.2.

## Automatizada

- `npm run build`: aprovado. Verificação TypeScript do frontend e backend e geração do bundle Vite.
- `npm test`: **9 testes aprovados** — 7 testes de integração da API com PostgreSQL PGlite e 2 testes de regras de datas no frontend.
- Migração e seed executados duas vezes no teste para verificar idempotência.
- Testes cobrem autenticação, ocultação de hashes, RBAC, vínculo por edição, restrição de colaborador, validação de data, consultas parametrizadas, invalidação de acesso por desativação, conflito de versão, preservação de antes/depois e bloqueio de UPDATE/DELETE na auditoria.
- O fluxo de integração cria edição, vincula coordenação, cria atividade, decisão e envolvido, arquiva e consulta os registros históricos. Associação de decisão a atividade de outra edição é rejeitada.
- Um trigger de falha controlada na auditoria prova que a atualização da atividade é revertida na mesma transação. A linha `API error { code: 'P0001' }` nesse teste é esperada.

## Interface e execução local

- Servidor Express iniciado e frontend compilado servido em localhost:3001, com banco persistido em backend/data.
- Login administrativo validado no navegador, com leitura real do painel, envolvidos e navegação.
- Marca **CJR**, símbolo de robô, título da página, contexto do evento e identificação de dados fictícios conferidos na versão renderizada.
- Painel conferido em viewport desktop e em 390 × 844: menu recolhível, cabeçalho, seletor de edição, resumo e cartões em disposição móvel.
- Formulários usam rótulos, validação nativa e validação de servidor. Foco visível e navegação por teclado implementados; menu móvel fechado usa inert para não receber foco fora da tela.

## Limites da verificação

Docker Compose incluído, mas **não executado ponta a ponta**: o executável Docker está instalado e o serviço/daemon não estava ativo. PostgreSQL externo via driver pg não foi validado em execução neste ambiente. A validação automatizada do SQL foi feita no motor PostgreSQL PGlite.

Não foram realizadas auditoria formal WCAG, teste com leitor de tela, teste de carga, pentest, implantação pública nem validação institucional. Testes do frontend são de regras de data; a revisão da interface foi manual, não uma suíte E2E automatizada. O comando de desenvolvimento combina scripts dos dois workspaces; o modo observado no navegador foi o servidor com frontend compilado.
