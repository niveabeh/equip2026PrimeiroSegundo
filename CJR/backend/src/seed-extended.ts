import bcrypt from 'bcryptjs';
import type { Database } from './db.js';

/** Cenários fictícios de demonstração. Não representam histórico institucional real. */
export async function seedExtended(db: Database) {
  if (!(await db.query("SELECT id FROM users WHERE id='u-admin'")).rows.length) return;
  if ((await db.query('SELECT version FROM demo_seed_versions WHERE version=2')).rows.length)
    return;
  const passwordHash = await bcrypt.hash('Demo@2026!', 10);
  await db.transaction(async (tx) => {
    const people = [
      ['u-infra', 'Lia Simulação', 'infraestrutura@example.test', 'collaborator'],
      ['u-comms', 'Ravi Demonstração', 'comunicacao@example.test', 'collaborator'],
      ['u-vol', 'Nina Modelo', 'voluntariado@example.test', 'coordinator'],
      ['u-sponsor', 'Theo Exemplo', 'relacionamento@example.test', 'coordinator'],
      ['u-doc', 'Bia Cenário', 'memoria@example.test', 'collaborator'],
    ];
    for (const [id, name, email, role] of people)
      await tx.query(
        'INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [id, name, email, passwordHash, role],
      );
    for (const year of [2025, 2024])
      await tx.query(
        "INSERT INTO editions VALUES($1,$2,$3,$4,$5,'archived',$6) ON CONFLICT DO NOTHING",
        [
          'e-' + year,
          'Edição de demonstração ' + year,
          year,
          `${year}-05-24`,
          'Pavilhão Fictício • Joinville',
          year === 2025
            ? 'Passagem de equipe: centralizar contatos, confirmar apoios e registrar responsáveis por turno.'
            : 'Aprendizados fictícios: antecipar visita técnica e manter um ponto único de comunicação.',
        ],
      );
    const editionIds = ['e-2027', 'e-2026', 'e-2025', 'e-2024'];
    for (const editionId of editionIds)
      for (const id of ['u-coord', 'u-colab', ...people.map((p) => p[0])])
        await tx.query('INSERT INTO memberships VALUES($1,$2) ON CONFLICT DO NOTHING', [
          editionId,
          id,
        ]);
    const templates = [
      [
        'Mapear pontos de energia',
        'Conferir carga, tomadas e circulação da equipe.',
        'u-infra',
        'before',
        'high',
      ],
      [
        'Confirmar apoio de materiais',
        'Registrar materiais, quantidade e ponto de entrega.',
        'u-sponsor',
        'before',
        'high',
      ],
      [
        'Preparar orientação dos voluntários',
        'Consolidar funções, turnos e responsáveis de referência.',
        'u-vol',
        'before',
        'normal',
      ],
      [
        'Organizar sinalização acessível',
        'Revisar legibilidade, contraste e orientação de circulação.',
        'u-comms',
        'before',
        'high',
      ],
      [
        'Consolidar contatos operacionais',
        'Manter contatos fictícios e alternativas de atendimento.',
        'u-coord',
        'before',
        'normal',
      ],
      [
        'Acompanhar entrega de estruturas',
        'Registrar recebimento e necessidade de ajuste.',
        'u-infra',
        'during',
        'high',
      ],
      [
        'Alinhar ponto de acolhimento',
        'Distribuir equipe e conferir roteiro de orientação.',
        'u-vol',
        'during',
        'normal',
      ],
      [
        'Registrar alinhamentos do dia',
        'Preservar autoria e motivo de mudanças operacionais.',
        'u-colab',
        'during',
        'normal',
      ],
      [
        'Conferir devolução de materiais',
        'Registrar condições e responsável pela devolução.',
        'u-sponsor',
        'after',
        'normal',
      ],
      [
        'Preparar passagem para próxima equipe',
        'Reunir decisões, contatos e aprendizados da edição.',
        'u-doc',
        'after',
        'high',
      ],
    ];
    for (const [editionIndex, editionId] of editionIds.entries()) {
      const year = Number(editionId.slice(2));
      for (const [i, [title, description, owner, phase, priority]] of templates.entries()) {
        const status = editionIndex === 0 ? (['pending', 'doing', 'done'] as const)[i % 3] : 'done';
        await tx.query(
          'INSERT INTO activities(id,edition_id,title,description,owner_id,due_date,status,priority,phase,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
          [
            `demo-a-${year}-${i}`,
            editionId,
            title,
            description,
            owner,
            `${year}-0${phase === 'after' ? 6 : phase === 'during' ? 5 : 4}-${String(10 + i).padStart(2, '0')}`,
            status,
            priority,
            phase,
            status === 'pending' ? 1 : status === 'doing' ? 2 : 3,
          ],
        );
      }
      const organizations = [
        ['Oficina Circuito Exemplo', 'Fornecedor', 'Estruturas e pontos de apoio na montagem'],
        ['Coletivo Horizonte Fictício', 'Voluntário', 'Orientação e acolhimento durante a edição'],
        ['Conexão Modelo', 'Parceiro', 'Apoio à comunicação entre responsáveis'],
        ['Serviços Vetor Demonstração', 'Empresa contratada', 'Montagem e retirada da sinalização'],
        ['Rede Aprender Simulação', 'Apoiador', 'Materiais de apoio para a organização'],
      ];
      for (const [i, [name, category, responsibility]] of organizations.entries())
        await tx.query(
          'INSERT INTO stakeholders(id,edition_id,name,category,responsibility,contact) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
          [
            `demo-s-${year}-${i}`,
            editionId,
            name,
            category,
            responsibility,
            `rede${i}@example.test`,
          ],
        );
      const sponsors = [
        [
          'Nexo Tecnologia Fictícia',
          'Empréstimo de equipamentos de apoio',
          'Crédito no material interno, sujeito a validação',
          'Materiais descritos em checklist; não inclui gestão de competição.',
        ],
        [
          'Órbita Materiais Exemplo',
          'Fornecimento de materiais de sinalização',
          'Registro do apoio nos documentos autorizados',
          'Conferir quantidades e pessoa responsável pelo recebimento.',
        ],
        [
          'Vetor Energia Demonstração',
          'Apoio técnico à infraestrutura elétrica',
          'Condições de reconhecimento ainda a alinhar',
          'Visita de alinhamento com a equipe operacional.',
        ],
        [
          'Ponte Logística Simulação',
          'Transporte de materiais administrativos',
          'Agradecimento condicionado à validação institucional',
          'Definir janela de entrega e retirada.',
        ],
      ];
      for (const [i, [name, contribution, counterpart, notes]] of sponsors.entries())
        await tx.query(
          'INSERT INTO sponsors(id,edition_id,name,contribution,counterpart,contact,owner_id,status,notes,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
          [
            `demo-p-${year}-${i}`,
            editionId,
            name,
            contribution,
            counterpart,
            `apoio${i}@example.test`,
            'u-sponsor',
            editionIndex === 0
              ? ['confirmed', 'delivered', 'contacted', 'prospect'][i]
              : 'delivered',
            notes,
            editionIndex === 0 ? [3, 4, 2, 1][i] : 4,
          ],
        );
      const choices = [
        [
          'Centralizar contatos em um ponto de referência',
          'Evitar mensagens dispersas e facilitar substituições da equipe.',
          'u-coord',
          4,
        ],
        [
          'Conferir materiais antes de confirmar recebimento',
          'Manter responsabilidade explícita e registrar divergências no momento da entrega.',
          'u-sponsor',
          1,
        ],
        [
          'Usar sinalização com alto contraste',
          'Facilitar a orientação e reduzir a dependência de apoio verbal.',
          'u-coord',
          3,
        ],
        [
          'Registrar aprendizados por responsabilidade',
          'A nova equipe precisa recuperar decisões e conhecer o motivo das escolhas.',
          'u-vol',
          9,
        ],
      ];
      for (const [i, [title, rationale, author, activityIndex]] of choices.entries())
        await tx.query(
          'INSERT INTO decisions(id,edition_id,activity_id,title,rationale,author_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
          [
            `demo-d-${year}-${i}`,
            editionId,
            `demo-a-${year}-${activityIndex}`,
            title,
            rationale,
            author,
            `${year === 2027 ? 2026 : year}-11-0${i + 3}T14:00:00Z`,
          ],
        );
      // Eventos sintéticos são identificados explicitamente como source=demo.
      let sequence = 0;
      const record = async (
        entity: string,
        row: any,
        actor: string,
        action: string,
        before: any,
        after: any,
      ) => {
        const timestamp = new Date(
          Date.UTC(year === 2027 ? 2026 : year, 10, 2, 9, sequence++ * 27),
        ).toISOString();
        await tx.query(
          "INSERT INTO audit(edition_id,actor_id,action,entity_type,entity_id,before_data,after_data,created_at,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'demo')",
          [
            editionId,
            actor,
            action,
            entity,
            row.id,
            before ? JSON.stringify(before) : null,
            JSON.stringify(after),
            entity === 'decision' ? row.created_at : timestamp,
          ],
        );
      };
      const activities = (
        await tx.query('SELECT * FROM activities WHERE edition_id=$1 ORDER BY id', [editionId])
      ).rows;
      for (const activity of activities) {
        if (!activity.id.startsWith('demo-a-')) continue;
        const initial = { ...activity, status: 'pending', version: 1 };
        await record('activity', activity, 'u-coord', 'create', null, initial);
        if (activity.status !== 'pending') {
          const doing = { ...activity, status: 'doing', version: 2 };
          await record('activity', activity, activity.owner_id, 'update', initial, doing);
          if (activity.status === 'done')
            await record('activity', activity, activity.owner_id, 'update', doing, activity);
        }
      }
      for (const [table, entity, authorField] of [
        ['decisions', 'decision', 'author_id'],
        ['stakeholders', 'stakeholder', null],
        ['sponsors', 'sponsor', 'owner_id'],
      ] as const) {
        for (const row of (
          await tx.query(`SELECT * FROM ${table} WHERE edition_id=$1 ORDER BY id`, [editionId])
        ).rows) {
          if (entity === 'sponsor') {
            const stages = ['prospect', 'contacted', 'confirmed', 'delivered'];
            let previous = { ...row, status: 'prospect', version: 1 };
            await record(entity, row, row.owner_id, 'create', null, previous);
            for (let stage = 1; stage <= stages.indexOf(row.status); stage++) {
              const next = { ...row, status: stages[stage], version: stage + 1 };
              await record(entity, row, row.owner_id, 'update', previous, next);
              previous = next;
            }
            continue;
          }
          await record(
            entity,
            row,
            authorField ? row[authorField] : 'u-coord',
            'create',
            null,
            row,
          );
        }
      }
    }
    await tx.query('INSERT INTO demo_seed_versions VALUES(2)');
  });
}
