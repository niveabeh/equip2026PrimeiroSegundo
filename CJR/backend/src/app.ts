import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database, Queryable } from './db.js';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coordinator' | 'collaborator';
  active: boolean;
};
declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const text = z.string().trim().min(3).max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    'Data inválida',
  );
const role = z.enum(['admin', 'coordinator', 'collaborator']);
const publicUser = 'id,name,email,role,active';
export function createApp(db: Database, secret: string) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '64kb' }));
  const audit = async (
    tx: Queryable,
    req: Request,
    edition: string | null,
    action: string,
    entity: string,
    id: string,
    before: unknown,
    after: unknown,
  ) => {
    await tx.query(
      'INSERT INTO audit(edition_id,actor_id,action,entity_type,entity_id,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [
        edition,
        req.user.id,
        action,
        entity,
        id,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
      ],
    );
  };
  const admin = (req: Request) => {
    if (req.user.role !== 'admin')
      throw new HttpError(403, 'Apenas o administrador pode realizar esta ação.');
  };
  const edition = async (req: Request, id: string, write = false, tx: Queryable = db) => {
    const e = (
      await tx.query('SELECT * FROM editions WHERE id=$1' + (write ? ' FOR UPDATE' : ''), [id])
    ).rows[0];
    if (!e) throw new HttpError(404, 'Edição não encontrada.');
    if (
      req.user.role !== 'admin' &&
      !(
        await tx.query('SELECT 1 FROM memberships WHERE edition_id=$1 AND user_id=$2', [
          id,
          req.user.id,
        ])
      ).rows.length
    )
      throw new HttpError(403, 'Você não está vinculado a esta edição.');
    if (write && e.status === 'archived')
      throw new HttpError(409, 'Edição arquivada: consulta somente.');
    return e;
  };
  const manage = (req: Request) => {
    if (req.user.role === 'collaborator')
      throw new HttpError(403, 'Ação disponível para coordenação e administração.');
  };
  app.get('/api/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  app.post(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
    }),
    async (req, res) => {
      const body = z
        .object({ email: z.string().email().max(200), password: z.string().min(1).max(200) })
        .parse(req.body);
      const u = (await db.query('SELECT * FROM users WHERE email=$1', [body.email.toLowerCase()]))
        .rows[0];
      if (!u || !u.active || !(await bcrypt.compare(body.password, u.password_hash)))
        throw new HttpError(401, 'E-mail ou senha inválidos.');
      res.json({
        token: jwt.sign({ sub: u.id }, secret, { expiresIn: '2h', algorithm: 'HS256' }),
        user: { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active },
      });
    },
  );
  app.use('/api', async (req, res, next) => {
    try {
      const value = jwt.verify((req.headers.authorization || '').replace(/^Bearer /, ''), secret, {
        algorithms: ['HS256'],
      });
      if (typeof value === 'string' || !value.sub) throw new Error();
      const u = (
        await db.query(`SELECT ${publicUser} FROM users WHERE id=$1 AND active=true`, [value.sub])
      ).rows[0];
      if (!u) throw new Error();
      req.user = u;
      next();
    } catch {
      res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
    }
  });
  app.get('/api/me', (req, res) => res.json(req.user));
  app.get('/api/editions', async (req, res) =>
    res.json(
      (
        await db.query(
          req.user.role === 'admin'
            ? 'SELECT * FROM editions ORDER BY year DESC'
            : 'SELECT e.* FROM editions e JOIN memberships m ON m.edition_id=e.id WHERE m.user_id=$1 ORDER BY year DESC',
          req.user.role === 'admin' ? [] : [req.user.id],
        )
      ).rows,
    ),
  );
  app.post('/api/editions', async (req, res) => {
    admin(req);
    const b = z
      .object({
        name: text,
        year: z.number().int().min(2020).max(2100),
        event_date: date,
        location: text,
        summary: z.string().trim().max(2000),
      })
      .parse(req.body);
    const id = randomUUID();
    const result = await db.transaction(async (tx) => {
      const row = (
        await tx.query(
          "INSERT INTO editions(id,name,year,event_date,location,status,summary) VALUES($1,$2,$3,$4,$5,'planning',$6) RETURNING *",
          [id, b.name, b.year, b.event_date, b.location, b.summary],
        )
      ).rows[0];
      await audit(tx, req, id, 'create', 'edition', id, null, row);
      return row;
    });
    res.status(201).json(result);
  });
  app.patch('/api/editions/:id', async (req, res) => {
    admin(req);
    const b = z.object({ status: z.enum(['planning', 'active', 'archived']) }).parse(req.body);
    res.json(
      await db.transaction(async (tx) => {
        const before = await edition(req, String(req.params.id), true, tx);
        const row = (
          await tx.query('UPDATE editions SET status=$1 WHERE id=$2 RETURNING *', [
            b.status,
            before.id,
          ])
        ).rows[0];
        await audit(tx, req, before.id, 'status', 'edition', before.id, before, row);
        return row;
      }),
    );
  });
  app.get('/api/editions/:id/members', async (req, res) => {
    await edition(req, String(req.params.id));
    res.json(
      (
        await db.query(
          `SELECT u.${publicUser.split(',').join(',u.')} FROM users u WHERE u.active=true AND (u.role='admin' OR EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id AND m.edition_id=$1)) ORDER BY u.name`,
          [req.params.id],
        )
      ).rows,
    );
  });
  app.put('/api/editions/:id/members/:userId', async (req, res) => {
    admin(req);
    await db.transaction(async (tx) => {
      await edition(req, String(req.params.id), true, tx);
      const u = (
        await tx.query('SELECT id FROM users WHERE id=$1 AND active=true', [req.params.userId])
      ).rows[0];
      if (!u) throw new HttpError(404, 'Usuário não encontrado.');
      await tx.query('INSERT INTO memberships VALUES($1,$2) ON CONFLICT DO NOTHING', [
        req.params.id,
        u.id,
      ]);
      await audit(tx, req, String(req.params.id), 'assign', 'membership', u.id, null, {
        user_id: u.id,
      });
    });
    res.json({ ok: true });
  });
  app.get('/api/editions/:id/activities', async (req, res) => {
    await edition(req, String(req.params.id));
    res.json(
      (
        await db.query(
          'SELECT a.*,u.name AS owner_name FROM activities a JOIN users u ON u.id=a.owner_id WHERE edition_id=$1 ORDER BY due_date,title',
          [req.params.id],
        )
      ).rows,
    );
  });
  const activitySchema = z.object({
    title: text,
    description: z.string().trim().max(3000),
    owner_id: z.string().max(100),
    due_date: date,
    status: z.enum(['pending', 'doing', 'done']),
    priority: z.enum(['normal', 'high']),
    phase: z.enum(['before', 'during', 'after']).default('before'),
    stakeholder_id: z.string().max(100).nullable().default(null),
  });
  app.post('/api/editions/:id/activities', async (req, res) => {
    manage(req);
    const b = activitySchema.parse(req.body);
    const id = randomUUID();
    res.status(201).json(
      await db.transaction(async (tx) => {
        await edition(req, String(req.params.id), true, tx);
        await checkOwner(tx, String(req.params.id), b.owner_id);
        await checkStakeholder(tx, String(req.params.id), b.stakeholder_id);
        const a = (
          await tx.query(
            'INSERT INTO activities(id,edition_id,title,description,owner_id,due_date,status,priority,phase,stakeholder_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
            [
              id,
              req.params.id,
              b.title,
              b.description,
              b.owner_id,
              b.due_date,
              b.status,
              b.priority,
              b.phase,
              b.stakeholder_id,
            ],
          )
        ).rows[0];
        await audit(tx, req, String(req.params.id), 'create', 'activity', id, null, a);
        return a;
      }),
    );
  });
  app.patch('/api/activities/:id', async (req, res) => {
    res.json(
      await db.transaction(async (tx) => {
        const before = (
          await tx.query('SELECT * FROM activities WHERE id=$1 FOR UPDATE', [req.params.id])
        ).rows[0];
        if (!before) throw new HttpError(404, 'Atividade não encontrada.');
        await edition(req, before.edition_id, true, tx);
        const version = z.number().int().positive().parse(req.body.version);
        if (version !== before.version)
          throw new HttpError(
            409,
            'Registro alterado por outra pessoa. Recarregue antes de salvar.',
          );
        let b: any;
        if (req.user.role === 'collaborator') {
          if (before.owner_id !== req.user.id)
            throw new HttpError(403, 'Você só pode atualizar suas próprias atividades.');
          b = z
            .object({ status: z.enum(['pending', 'doing', 'done']), version: z.number() })
            .strict()
            .parse(req.body);
          b = { ...before, status: b.status };
        } else {
          b = activitySchema.parse(req.body);
          await checkOwner(tx, before.edition_id, b.owner_id);
          await checkStakeholder(tx, before.edition_id, b.stakeholder_id);
        }
        const a = (
          await tx.query(
            'UPDATE activities SET title=$1,description=$2,owner_id=$3,due_date=$4,status=$5,priority=$6,phase=$7,stakeholder_id=$8,version=version+1 WHERE id=$9 RETURNING *',
            [
              b.title,
              b.description,
              b.owner_id,
              b.due_date,
              b.status,
              b.priority,
              b.phase,
              b.stakeholder_id,
              before.id,
            ],
          )
        ).rows[0];
        await audit(tx, req, before.edition_id, 'update', 'activity', before.id, before, a);
        return a;
      }),
    );
  });
  app.get('/api/editions/:id/decisions', async (req, res) => {
    await edition(req, String(req.params.id));
    res.json(
      (
        await db.query(
          'SELECT d.*,u.name AS author_name,a.title AS activity_title FROM decisions d JOIN users u ON u.id=d.author_id LEFT JOIN activities a ON a.id=d.activity_id WHERE d.edition_id=$1 ORDER BY d.created_at DESC',
          [req.params.id],
        )
      ).rows,
    );
  });
  app.post('/api/editions/:id/decisions', async (req, res) => {
    manage(req);
    const b = z
      .object({
        title: text,
        rationale: z.string().trim().min(10).max(3000),
        activity_id: z.string().nullable(),
      })
      .parse(req.body);
    const id = randomUUID();
    res.status(201).json(
      await db.transaction(async (tx) => {
        await edition(req, String(req.params.id), true, tx);
        if (
          b.activity_id &&
          !(
            await tx.query('SELECT id FROM activities WHERE id=$1 AND edition_id=$2', [
              b.activity_id,
              req.params.id,
            ])
          ).rows.length
        )
          throw new HttpError(400, 'A atividade deve pertencer à edição.');
        const d = (
          await tx.query(
            'INSERT INTO decisions(id,edition_id,activity_id,title,rationale,author_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
            [id, req.params.id, b.activity_id, b.title, b.rationale, req.user.id],
          )
        ).rows[0];
        await audit(tx, req, String(req.params.id), 'create', 'decision', id, null, d);
        return d;
      }),
    );
  });
  app.get('/api/editions/:id/stakeholders', async (req, res) => {
    await edition(req, String(req.params.id));
    res.json(
      (
        await db.query(
          'SELECT s.*,u.name AS owner_name FROM stakeholders s LEFT JOIN users u ON u.id=s.owner_id WHERE edition_id=$1 ORDER BY s.name',
          [req.params.id],
        )
      ).rows,
    );
  });
  const stakeholderSchema = z.object({
    name: text,
    category: z.enum([
      'Fornecedor',
      'Parceiro',
      'Voluntário',
      'Apoiador',
      'Empresa contratada',
      'Outro',
    ]),
    responsibility: z.string().trim().min(3).max(1000),
    contact: z.string().trim().max(200),
    owner_id: z.string().max(100).nullable().default(null),
    phase: z.enum(['before', 'during', 'after']).default('before'),
    operational_status: z
      .enum(['scheduled', 'confirmed', 'in_progress', 'finished'])
      .default('scheduled'),
    notes: z.string().trim().max(2000).default(''),
  });
  app.post('/api/editions/:id/stakeholders', async (req, res) => {
    manage(req);
    const b = stakeholderSchema.parse(req.body);
    const id = randomUUID();
    res.status(201).json(
      await db.transaction(async (tx) => {
        await edition(req, String(req.params.id), true, tx);
        if (b.owner_id) await checkOwner(tx, String(req.params.id), b.owner_id);
        const s = (
          await tx.query(
            'INSERT INTO stakeholders(id,edition_id,name,category,responsibility,contact,owner_id,phase,operational_status,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
            [
              id,
              req.params.id,
              b.name,
              b.category,
              b.responsibility,
              b.contact,
              b.owner_id,
              b.phase,
              b.operational_status,
              b.notes,
            ],
          )
        ).rows[0];
        await audit(tx, req, String(req.params.id), 'create', 'stakeholder', id, null, s);
        return s;
      }),
    );
  });
  app.patch('/api/stakeholders/:id', async (req, res) => {
    manage(req);
    const b = stakeholderSchema.extend({ version: z.number().int().positive() }).parse(req.body);
    res.json(
      await db.transaction(async (tx) => {
        const before = (
          await tx.query('SELECT * FROM stakeholders WHERE id=$1 FOR UPDATE', [req.params.id])
        ).rows[0];
        if (!before) throw new HttpError(404, 'Envolvido não encontrado.');
        await edition(req, before.edition_id, true, tx);
        if (before.version !== b.version)
          throw new HttpError(
            409,
            'Esta responsabilidade foi alterada por outra pessoa. Recarregue antes de salvar.',
          );
        if (b.owner_id) await checkOwner(tx, before.edition_id, b.owner_id);
        const row = (
          await tx.query(
            'UPDATE stakeholders SET name=$1,category=$2,responsibility=$3,contact=$4,owner_id=$5,phase=$6,operational_status=$7,notes=$8,version=version+1 WHERE id=$9 RETURNING *',
            [
              b.name,
              b.category,
              b.responsibility,
              b.contact,
              b.owner_id,
              b.phase,
              b.operational_status,
              b.notes,
              before.id,
            ],
          )
        ).rows[0];
        await audit(tx, req, before.edition_id, 'update', 'stakeholder', before.id, before, row);
        return row;
      }),
    );
  });
  const sponsorSchema = z.object({
    name: text,
    contribution: z.string().trim().min(3).max(2000),
    counterpart: z.string().trim().max(2000),
    contact: z.string().trim().max(200),
    owner_id: z.string().max(100),
    status: z.enum(['prospect', 'contacted', 'confirmed', 'delivered']),
    notes: z.string().trim().max(3000),
  });
  app.get('/api/editions/:id/sponsors', async (req, res) => {
    await edition(req, String(req.params.id));
    res.json(
      (
        await db.query(
          'SELECT s.*,u.name AS owner_name FROM sponsors s JOIN users u ON u.id=s.owner_id WHERE s.edition_id=$1 ORDER BY s.name',
          [req.params.id],
        )
      ).rows,
    );
  });
  app.post('/api/editions/:id/sponsors', async (req, res) => {
    manage(req);
    const b = sponsorSchema.parse(req.body),
      id = randomUUID();
    res.status(201).json(
      await db.transaction(async (tx) => {
        await edition(req, String(req.params.id), true, tx);
        await checkOwner(tx, String(req.params.id), b.owner_id);
        const row = (
          await tx.query(
            'INSERT INTO sponsors(id,edition_id,name,contribution,counterpart,contact,owner_id,status,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
            [
              id,
              req.params.id,
              b.name,
              b.contribution,
              b.counterpart,
              b.contact,
              b.owner_id,
              b.status,
              b.notes,
            ],
          )
        ).rows[0];
        await audit(tx, req, String(req.params.id), 'create', 'sponsor', id, null, row);
        return row;
      }),
    );
  });
  app.patch('/api/sponsors/:id', async (req, res) => {
    manage(req);
    const b = sponsorSchema.extend({ version: z.number().int().positive() }).parse(req.body);
    res.json(
      await db.transaction(async (tx) => {
        const before = (
          await tx.query('SELECT * FROM sponsors WHERE id=$1 FOR UPDATE', [req.params.id])
        ).rows[0];
        if (!before) throw new HttpError(404, 'Patrocinador não encontrado.');
        await edition(req, before.edition_id, true, tx);
        if (before.version !== b.version)
          throw new HttpError(
            409,
            'A relação de patrocínio foi alterada. Recarregue antes de salvar.',
          );
        await checkOwner(tx, before.edition_id, b.owner_id);
        const row = (
          await tx.query(
            'UPDATE sponsors SET name=$1,contribution=$2,counterpart=$3,contact=$4,owner_id=$5,status=$6,notes=$7,version=version+1 WHERE id=$8 RETURNING *',
            [
              b.name,
              b.contribution,
              b.counterpart,
              b.contact,
              b.owner_id,
              b.status,
              b.notes,
              before.id,
            ],
          )
        ).rows[0];
        await audit(tx, req, before.edition_id, 'update', 'sponsor', before.id, before, row);
        return row;
      }),
    );
  });
  app.get('/api/editions/:id/audit', async (req, res) => {
    await edition(req, String(req.params.id));
    res.json(
      (
        await db.query(
          'SELECT a.*,u.name AS actor_name FROM audit a JOIN users u ON u.id=a.actor_id WHERE a.edition_id=$1 ORDER BY a.created_at DESC,a.id DESC LIMIT 200',
          [req.params.id],
        )
      ).rows,
    );
  });
  app.get('/api/users', async (req, res) => {
    admin(req);
    res.json((await db.query(`SELECT ${publicUser} FROM users ORDER BY name`)).rows);
  });
  app.post('/api/users', async (req, res) => {
    admin(req);
    const b = z
      .object({
        name: text,
        email: z.string().email().max(200),
        password: z.string().min(12).max(100),
        role,
      })
      .parse(req.body);
    const id = randomUUID();
    const hash = await bcrypt.hash(b.password, 12);
    res.status(201).json(
      await db.transaction(async (tx) => {
        const u = (
          await tx.query(
            `INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING ${publicUser}`,
            [id, b.name, b.email.toLowerCase(), hash, b.role],
          )
        ).rows[0];
        await audit(tx, req, null, 'create', 'user', id, null, u);
        return u;
      }),
    );
  });
  app.patch('/api/users/:id', async (req, res) => {
    admin(req);
    const b = z.object({ role, active: z.boolean() }).parse(req.body);
    if (req.params.id === req.user.id)
      throw new HttpError(409, 'Você não pode alterar seu próprio acesso.');
    res.json(
      await db.transaction(async (tx) => {
        const before = (
          await tx.query(`SELECT ${publicUser} FROM users WHERE id=$1 FOR UPDATE`, [req.params.id])
        ).rows[0];
        if (!before) throw new HttpError(404, 'Usuário não encontrado.');
        const u = (
          await tx.query(`UPDATE users SET role=$1,active=$2 WHERE id=$3 RETURNING ${publicUser}`, [
            b.role,
            b.active,
            req.params.id,
          ])
        ).rows[0];
        await audit(tx, req, null, 'update', 'user', u.id, before, u);
        return u;
      }),
    );
  });
  app.get('/api/admin/audit', async (req, res) => {
    admin(req);
    res.json(
      (
        await db.query(
          'SELECT a.*,u.name AS actor_name FROM audit a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 200',
        )
      ).rows,
    );
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Confira os campos informados.', details: err.flatten() });
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err.code === '23505') {
      res.status(409).json({ error: 'Registro já cadastrado.' });
      return;
    }
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'JSON inválido.' });
      return;
    }
    console.error('API error', { code: err.code || 'unknown' });
    res.status(500).json({ error: 'Não foi possível concluir a operação.' });
  });
  return app;
}
async function checkOwner(tx: Queryable, editionId: string, userId: string) {
  if (
    !(
      await tx.query(
        "SELECT id FROM users u WHERE id=$1 AND active=true AND (role='admin' OR EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id AND m.edition_id=$2))",
        [userId, editionId],
      )
    ).rows.length
  )
    throw new HttpError(400, 'Responsável precisa estar ativo e vinculado à edição.');
}
async function checkStakeholder(tx: Queryable, editionId: string, id: string | null) {
  if (
    id &&
    !(await tx.query('SELECT id FROM stakeholders WHERE id=$1 AND edition_id=$2', [id, editionId]))
      .rows.length
  )
    throw new HttpError(400, 'O envolvido precisa pertencer à mesma edição da atividade.');
}
