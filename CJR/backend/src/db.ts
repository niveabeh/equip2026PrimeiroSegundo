import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
pg.types.setTypeParser(1082, (value) => value);

export interface Queryable {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}
export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function openDatabase(memory = false): Promise<Database> {
  if (process.env.DATABASE_URL && !memory) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    return {
      query: (s, p) => pool.query(s, p),
      close: () => pool.end(),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const result = await fn(c);
          await c.query('COMMIT');
          return result;
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        } finally {
          c.release();
        }
      },
    };
  }
  const p = new PGlite(
    memory
      ? 'memory://'
      : process.env.DATA_DIR || fileURLToPath(new URL('../data', import.meta.url)),
  );
  await p.waitReady;
  return {
    query: (s, v) => p.query(s, v),
    transaction: (fn) => p.transaction(fn),
    close: () => p.close(),
  };
}
export async function migrate(db: Database) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY)');
  for (const [version, filename] of [
    [1, '001_initial.sql'],
    [2, '002_sponsorships_and_context.sql'],
    [3, '003_operational_responsibilities.sql'],
  ] as const) {
    if (
      (await db.query('SELECT version FROM schema_migrations WHERE version=$1', [version])).rows
        .length
    )
      continue;
    const sql = await readFile(new URL('../migrations/' + filename, import.meta.url), 'utf8');
    await db.transaction(async (tx) => {
      // SQL is static, split only outside function body.
      const statements = sql.split(/;(?=(?:[^$]*\$\$[^$]*\$\$)*[^$]*$)/).filter((s) => s.trim());
      for (const statement of statements) await tx.query(statement);
    });
  }
}
export async function seed(db: Database) {
  if ((await db.query('SELECT id FROM users LIMIT 1')).rows.length) return;
  const hash = await bcrypt.hash('Demo@2026!', 10);
  await db.transaction(async (tx) => {
    for (const [id, name, email, role] of [
      ['u-admin', 'Alex Demo', 'admin@example.test', 'admin'],
      ['u-coord', 'Marina Exemplo', 'coordenador@example.test', 'coordinator'],
      ['u-colab', 'Caio Fictício', 'colaborador@example.test', 'collaborator'],
    ])
      await tx.query('INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)', [
        id,
        name,
        email,
        hash,
        role,
      ]);
    for (const row of [
      [
        'e-2027',
        'Edição de demonstração 2027',
        2027,
        '2027-05-22',
        'Espaço Exemplo • Joinville',
        'planning',
        'Preparação administrativa. Todos os dados desta edição são fictícios.',
      ],
      [
        'e-2026',
        'Edição de demonstração 2026',
        2026,
        '2026-05-23',
        'Centro Fictício',
        'archived',
        'Aprendizado: confirmar infraestrutura e responsáveis com antecedência.',
      ],
    ])
      await tx.query('INSERT INTO editions VALUES($1,$2,$3,$4,$5,$6,$7)', row);
    for (const e of ['e-2027', 'e-2026'])
      for (const u of ['u-coord', 'u-colab'])
        await tx.query('INSERT INTO memberships VALUES($1,$2)', [e, u]);
    const tasks = [
      [
        'a-1',
        'e-2027',
        'Confirmar infraestrutura do espaço',
        'Verificar energia, acesso e pontos de apoio.',
        'u-colab',
        '2027-04-10',
        'doing',
        'high',
      ],
      [
        'a-2',
        'e-2027',
        'Alinhar equipe de acolhimento',
        'Definir funções e pontos de encontro dos voluntários.',
        'u-coord',
        '2027-04-18',
        'pending',
        'normal',
      ],
      [
        'a-3',
        'e-2027',
        'Revisar plano de comunicação interna',
        'Centralizar contatos e rotinas de alinhamento.',
        'u-coord',
        '2027-04-05',
        'done',
        'normal',
      ],
      [
        'a-4',
        'e-2027',
        'Validar checklist de acessibilidade',
        'Conferir circulação, sinalização e apoio.',
        'u-colab',
        '2027-04-15',
        'pending',
        'high',
      ],
      [
        'a-5',
        'e-2026',
        'Registrar aprendizados da edição',
        'Documento de passagem para a próxima equipe.',
        'u-coord',
        '2026-06-01',
        'done',
        'normal',
      ],
    ];
    for (const t of tasks)
      await tx.query(
        'INSERT INTO activities(id,edition_id,title,description,owner_id,due_date,status,priority,phase) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [...t, t[0] === 'a-5' ? 'after' : 'before'],
      );
    await tx.query(
      "INSERT INTO decisions(id,edition_id,activity_id,title,rationale,author_id) VALUES('d-1','e-2027','a-1','Realizar visita técnica antes da montagem','A visita antecipa necessidades de energia e circulação. Proposta fictícia para demonstração.','u-coord'),('d-2','e-2026','a-5','Manter checklist de passagem entre equipes','Reduzir a dependência de conhecimento individual na próxima edição.','u-coord')",
    );
    await tx.query(
      "INSERT INTO stakeholders(id,edition_id,name,category,responsibility,contact) VALUES('s-1','e-2027','Coletivo Exemplo','Voluntário','Acolhimento e orientação','contato@example.test'),('s-2','e-2027','Estruturas Fictícias','Fornecedor','Apoio à montagem e infraestrutura','apoio@example.test'),('s-3','e-2026','Rede Demonstração','Parceiro','Apoio administrativo','rede@example.test')",
    );
    await tx.query(
      "INSERT INTO audit(edition_id,actor_id,action,entity_type,entity_id,after_data) VALUES('e-2027','u-admin','seed','edition','e-2027',$1)",
      [JSON.stringify({ note: 'Base fictícia inicializada' })],
    );
  });
}
