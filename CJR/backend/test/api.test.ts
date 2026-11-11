import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openDatabase, migrate, seed, type Database } from '../src/db.js';
import { createApp } from '../src/app.js';
let db: Database;
let app: ReturnType<typeof createApp>;
const tokens: Record<string, string> = {};
before(async () => {
  db = await openDatabase(true);
  await migrate(db);
  await migrate(db);
  await seed(db);
  await seed(db);
  app = createApp(db, 'test-secret-long-enough-for-local-tests');
  for (const [key, email] of Object.entries({
    admin: 'admin@example.test',
    coord: 'coordenador@example.test',
    colab: 'colaborador@example.test',
  })) {
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Demo@2026!' })
      .expect(200);
    tokens[key] = r.body.token;
  }
});
after(async () => {
  await db?.close();
});
const auth = (key: string) => ({ Authorization: 'Bearer ' + tokens[key] });
test('autenticação é obrigatória, credenciais inválidas falham e hashes não são expostos', async () => {
  await request(app).get('/api/editions').expect(401);
  await request(app).get('/api/editions').set({ Authorization: 'Bearer falsificado' }).expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.test', password: 'errada' })
    .expect(401);
  const r = await request(app).get('/api/users').set(auth('admin')).expect(200);
  assert.equal(r.body.length, 3);
  assert.ok(!JSON.stringify(r.body).includes('password'));
});
test('RBAC restringe usuários, edições e decisões', async () => {
  await request(app).get('/api/users').set(auth('coord')).expect(403);
  await request(app).post('/api/editions').set(auth('coord')).send({}).expect(403);
  await request(app).post('/api/editions/e-2027/decisions').set(auth('colab')).send({}).expect(403);
  await request(app)
    .patch('/api/activities/a-2')
    .set(auth('colab'))
    .send({ status: 'done', version: 1 })
    .expect(403);
});
test('colaborador atualiza apenas situação própria; versão evita sobrescrita e auditoria preserva antes/depois', async () => {
  const before = (await db.query('SELECT count(*)::int AS n FROM audit')).rows[0].n;
  await request(app)
    .patch('/api/activities/a-1')
    .set(auth('colab'))
    .send({ status: 'done', version: 1, title: 'Mudança indevida' })
    .expect(400);
  const r = await request(app)
    .patch('/api/activities/a-1')
    .set(auth('colab'))
    .send({ status: 'done', version: 1 })
    .expect(200);
  assert.equal(r.body.version, 2);
  await request(app)
    .patch('/api/activities/a-1')
    .set(auth('colab'))
    .send({ status: 'pending', version: 1 })
    .expect(409);
  const log = (await db.query("SELECT * FROM audit WHERE entity_id='a-1' ORDER BY id DESC"))
    .rows[0];
  assert.equal(log.actor_id, 'u-colab');
  assert.equal(log.before_data.status, 'doing');
  assert.equal(log.after_data.status, 'done');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM audit')).rows[0].n, before + 1);
});
test('falha na auditoria reverte a alteração na mesma transação', async () => {
  await db.query(
    "CREATE OR REPLACE FUNCTION test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_id='a-4' THEN RAISE EXCEPTION 'test rejection'; END IF; RETURN NEW; END; $$",
  );
  await db.query(
    'CREATE TRIGGER reject_test BEFORE INSERT ON audit FOR EACH ROW EXECUTE FUNCTION test_reject_audit()',
  );
  try {
    await request(app)
      .patch('/api/activities/a-4')
      .set(auth('colab'))
      .send({ status: 'done', version: 1 })
      .expect(500);
    assert.equal(
      (await db.query("SELECT status FROM activities WHERE id='a-4'")).rows[0].status,
      'pending',
    );
  } finally {
    await db.query('DROP TRIGGER reject_test ON audit');
    await db.query('DROP FUNCTION test_reject_audit()');
  }
});
test('edição arquivada é somente leitura e log é imutável', async () => {
  await request(app)
    .post('/api/editions/e-2026/decisions')
    .set(auth('coord'))
    .send({
      title: 'Nova decisão',
      rationale: 'Teste de bloqueio de edição antiga',
      activity_id: null,
    })
    .expect(409);
  await request(app)
    .patch('/api/activities/a-5')
    .set(auth('colab'))
    .send({ status: 'pending', version: 1 })
    .expect(409);
  await assert.rejects(db.query("UPDATE audit SET action='changed' WHERE id=1"));
  await assert.rejects(db.query('DELETE FROM audit WHERE id=1'));
  await request(app).get('/api/editions/e-2026/activities').set(auth('coord')).expect(200);
});
test('fluxo administrativo: criar edição, vincular coordenação, cadastrar tarefa, decisão e envolvido, consultar histórico', async () => {
  const e = await request(app)
    .post('/api/editions')
    .set(auth('admin'))
    .send({
      name: 'Edição de teste',
      year: 2028,
      event_date: '2028-05-20',
      location: 'Local fictício',
      summary: 'Continuidade de teste',
    })
    .expect(201);
  const id = e.body.id;
  await request(app).get(`/api/editions/${id}/activities`).set(auth('coord')).expect(403);
  await request(app)
    .put(`/api/editions/${id}/members/u-coord`)
    .set(auth('admin'))
    .send({})
    .expect(200);
  const a = await request(app)
    .post(`/api/editions/${id}/activities`)
    .set(auth('coord'))
    .send({
      title: 'Preparar passagem',
      description: 'Registrar informações úteis',
      owner_id: 'u-coord',
      due_date: '2028-04-10',
      status: 'pending',
      priority: 'high',
    })
    .expect(201);
  await request(app)
    .post(`/api/editions/${id}/decisions`)
    .set(auth('coord'))
    .send({
      title: 'Organizar checklist',
      rationale: 'Facilitar o trabalho da próxima equipe.',
      activity_id: 'a-1',
    })
    .expect(400);
  await request(app)
    .post(`/api/editions/${id}/decisions`)
    .set(auth('coord'))
    .send({
      title: 'Organizar checklist',
      rationale: 'Facilitar o trabalho da próxima equipe.',
      activity_id: a.body.id,
    })
    .expect(201);
  await request(app)
    .post(`/api/editions/${id}/stakeholders`)
    .set(auth('coord'))
    .send({
      name: 'Grupo Fictício',
      category: 'Parceiro',
      responsibility: 'Apoio de montagem',
      contact: 'teste@example.test',
    })
    .expect(201);
  await request(app)
    .patch('/api/editions/' + id)
    .set(auth('admin'))
    .send({ status: 'archived' })
    .expect(200);
  const r = await request(app).get(`/api/editions/${id}/audit`).set(auth('coord')).expect(200);
  assert.ok(r.body.length >= 5);
  await request(app)
    .post(`/api/editions/${id}/stakeholders`)
    .set(auth('coord'))
    .send({
      name: 'Novo Grupo',
      category: 'Parceiro',
      responsibility: 'Apoio de montagem',
      contact: '',
    })
    .expect(409);
});
test('validação rejeita datas impossíveis, SQL é parametrizado e desativação invalida token existente', async () => {
  await request(app)
    .post('/api/editions/e-2027/activities')
    .set(auth('coord'))
    .send({
      title: 'Teste data',
      description: '',
      owner_id: 'u-coord',
      due_date: '2027-02-30',
      status: 'pending',
      priority: 'normal',
    })
    .expect(400);
  await request(app)
    .get('/api/editions/%27%20OR%201=1--/activities')
    .set(auth('admin'))
    .expect(404);
  await request(app)
    .patch('/api/users/u-colab')
    .set(auth('admin'))
    .send({ role: 'collaborator', active: false })
    .expect(200);
  await request(app).get('/api/me').set(auth('colab')).expect(401);
  await request(app)
    .patch('/api/users/u-admin')
    .set(auth('admin'))
    .send({ role: 'collaborator', active: false })
    .expect(409);
});
