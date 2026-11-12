import type { Database, Queryable } from './db.js';

/** Expansão acadêmica: relações de organização, sem inscritos nas competições. */
export async function seedOperational(db: Database) {
  if (!(await db.query("SELECT id FROM users WHERE id='u-admin'")).rows.length) return;
  if ((await db.query('SELECT version FROM demo_seed_versions WHERE version=3')).rows.length)
    return;
  await db.transaction(async (tx) => {
    const categories = [
      {
        category: 'Fornecedor',
        owner: 'u-infra',
        phase: 'before',
        names: ['Montagem Aurora Fictícia', 'Oficina Base Exemplo'],
        task: 'Conferir entrega e retirada de estruturas de apoio',
        notes: 'Confirmar materiais, janela de entrega e responsável pelo recebimento.',
      },
      {
        category: 'Apoiador',
        owner: 'u-sponsor',
        phase: 'before',
        names: ['Rede Conectar Simulação', 'Instituto Ponte Fictício'],
        task: 'Alinhar recursos de apoio à organização',
        notes: 'Registrar o apoio combinado e manter uma alternativa de contato.',
      },
      {
        category: 'Voluntário',
        owner: 'u-vol',
        phase: 'during',
        names: ['Grupo Acolher Exemplo', 'Equipe Orientar Fictícia'],
        task: 'Orientar circulação e acolher a equipe de organização',
        notes: 'Confirmar função, ponto de encontro e pessoa de referência.',
      },
      {
        category: 'Parceiro',
        owner: 'u-coord',
        phase: 'before',
        names: ['Núcleo Integração Exemplo', 'Rede Colaborar Simulação'],
        task: 'Alinhar responsabilidades compartilhadas de preparação',
        notes: 'Manter os acordos documentados para a equipe da próxima edição.',
      },
      {
        category: 'Empresa contratada',
        owner: 'u-infra',
        phase: 'during',
        names: ['Serviços Prisma Fictícios', 'Operação Norte Exemplo'],
        task: 'Acompanhar montagem e apoio operacional combinado',
        notes:
          'Registrar a prestação prevista e a confirmação de atendimento. Não representa contratação real.',
      },
      {
        category: 'Outro',
        owner: 'u-doc',
        phase: 'after',
        names: ['Comissão de Passagem Fictícia', 'Grupo de Registro Exemplo'],
        task: 'Reunir aprendizados e informações para a próxima equipe',
        notes:
          'Participação administrativa; não se refere a estudantes, equipes inscritas ou competidores.',
      },
    ];
    const log = async (
      tx: Queryable,
      editionId: string,
      action: string,
      id: string,
      before: unknown,
      after: unknown,
    ) =>
      tx.query(
        "INSERT INTO audit(edition_id,actor_id,action,entity_type,entity_id,before_data,after_data,source) VALUES($1,'u-coord',$2,'stakeholder',$3,$4,$5,'demo')",
        [editionId, action, id, before ? JSON.stringify(before) : null, JSON.stringify(after)],
      );
    for (const editionId of ['e-2027', 'e-2026', 'e-2025', 'e-2024']) {
      const archived =
        (await tx.query('SELECT status FROM editions WHERE id=$1', [editionId])).rows[0]?.status ===
        'archived';
      const existing = (
        await tx.query(
          "SELECT * FROM stakeholders WHERE edition_id=$1 AND owner_id IS NULL AND version=1 AND (id LIKE 'demo-s-%' OR id IN ('s-1','s-2','s-3'))",
          [editionId],
        )
      ).rows;
      for (const before of existing) {
        const config = categories.find((c) => c.category === before.category) || categories[5];
        const after = (
          await tx.query(
            'UPDATE stakeholders SET owner_id=$1,phase=$2,operational_status=$3,notes=$4,version=version+1 WHERE id=$5 RETURNING *',
            [
              config.owner,
              config.phase,
              archived ? 'finished' : 'confirmed',
              config.notes,
              before.id,
            ],
          )
        ).rows[0];
        await log(tx, editionId, 'update', before.id, before, after);
      }
      for (const [index, config] of categories.entries())
        for (const [i, name] of config.names.entries()) {
          const id = `demo-operational-${editionId}-${index}-${i}`;
          const row = (
            await tx.query(
              'INSERT INTO stakeholders(id,edition_id,name,category,responsibility,contact,owner_id,phase,operational_status,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING RETURNING *',
              [
                id,
                editionId,
                name,
                config.category,
                config.task,
                `operacao${index}${i}@example.test`,
                config.owner,
                config.phase,
                archived ? 'finished' : i === 0 ? 'confirmed' : 'scheduled',
                config.notes,
              ],
            )
          ).rows[0];
          if (row) await log(tx, editionId, 'create', id, null, row);
        }
    }
    await tx.query('INSERT INTO demo_seed_versions VALUES(3)');
  });
}
