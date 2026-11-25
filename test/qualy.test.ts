import { test } from 'node:test';
import type { TestContext } from 'node:test';
import type { PlannerState } from '../lib/models.ts';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../server/db.ts';
import { createApi } from '../server/api.ts';
import { hashPassword, issueSession, sessionCookie } from '../server/auth.ts';
import { addDays, todayInBogota, weekOf } from '../lib/dates.ts';

const testDay = '2026-11-24';
const time = new Date('2026-11-25T03:40:00.000Z');
const account = { name: 'Ana', email: 'ana@example.test', password: 'Clave12!' };

const databaseUrl = process.env.QUALY_TEST_DATABASE_URL;
const postgresTest = { skip: databaseUrl ? false : 'Configura QUALY_TEST_DATABASE_URL para ejecutar la integración.' };

async function testSchema(t: TestContext) {
  const schema = 'qualy_test_' + randomUUID().replaceAll('-', '');
  const sql = connectDatabase(databaseUrl);
  const migration = await readFile(new URL('../supabase/migrations/20261125000000_create_qualy.sql', import.meta.url), 'utf8');
  t.after(async () => {
    try {
      await sql`DROP SCHEMA IF EXISTS ${sql(schema)} CASCADE`;
    } finally {
      await sql.end();
    }
  });
  await sql.unsafe(migration.replaceAll(/\bqualy\b/g, schema)).simple();
  return { schema, sql };
}

type WriteMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type TestResult<T> = { status: number; body: T; cookie: string | null };
type WriteResponse = { id?: string; error?: string; ok?: boolean };
type StateResponse = PlannerState | { error: string };

function start(schema: string) {
  const api = createApi({ databaseUrl, schema, now: () => time });
  const base = 'http://127.0.0.1:4317';
  return {
    client: (initialCookie?: string | null) => {
      let cookie = initialCookie?.split(';')[0];
      function call(path: '/api/state'): Promise<TestResult<StateResponse>>;
      function call(path: string, method: WriteMethod, data?: object, headers?: Record<string, string>): Promise<TestResult<WriteResponse>>;
      async function call(path: string, method: WriteMethod | 'GET' = 'GET', data: object = {}, headers: Record<string, string> = {}):
        Promise<TestResult<StateResponse | WriteResponse>> {
        const res = await api.handle(new Request(base + path, {
          method,
          headers: {
            ...(cookie ? { cookie } : {}),
            ...(method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Qualy-Request': '1', Origin: base }),
            ...headers,
          },
          body: method === 'GET' ? undefined : JSON.stringify(data),
        }));
        const set = res.headers.get('set-cookie');
        if (set) cookie = set.split(';')[0];
        return { status: res.status, body: await res.json() as StateResponse | WriteResponse, cookie: set };
      }
      return call;
    },
    close: api.close,
  };
}

async function plannerState(client: ReturnType<ReturnType<typeof start>['client']>) {
  const { status, body } = await client('/api/state');
  assert.equal(status, 200);
  assert.ok('user' in body);
  return body;
}

test('Los días y la semana siguen el calendario de Bogotá', () => {
  assert.equal(todayInBogota(time), testDay);
  assert.deepEqual(weekOf('2026-12-31'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
});

test('El registro rechaza correos mal formados y contraseñas débiles', async (t) => {
  const api = createApi({ databaseUrl: '' });
  t.after(() => api.close());
  const invalid: Array<[Partial<typeof account>, RegExp]> = [
    [{ email: 'ana.example.test' }, /correo electrónico/],
    [{ email: 'ana..lopez@example.test' }, /correo electrónico/],
    [{ email: 'ana@example..test' }, /correo electrónico/],
    [{ email: 'ana@-example.test' }, /correo electrónico/],
    [{ email: 'ana@example-.test' }, /correo electrónico/],
    [{ password: 'Clave1!' }, /contraseña/],
    [{ password: 'Clave123' }, /contraseña/],
    [{ password: 'Clave 12' }, /contraseña/],
  ];

  for (const [fields, error] of invalid) {
    const response = await api.handle(new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Qualy-Request': '1' },
      body: JSON.stringify({ ...account, ...fields }),
    }));
    assert.equal(response.status, 422, JSON.stringify(fields));
    assert.equal(response.headers.get('set-cookie'), null);
    assert.match((await response.json()).error, error, JSON.stringify(fields));
  }
});

test('El registro simultáneo de variantes de un correo solo crea una cuenta', postgresTest, async (t) => {
  const { schema, sql } = await testSchema(t);
  const app = start(schema);
  t.after(() => app.close());
  const email = 'ana+agenda@fit.example.test';
  const name = 'Ana López';
  const variant = '  ' + email.toUpperCase() + '  ';
  const results = await Promise.all([email, variant].map((address) =>
    app.client()('/api/register', 'POST', { ...account, name, email: address })));
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  const created = results.find((result) => result.status === 201);
  assert.ok(created?.cookie);
  const duplicate = results.find((result) => result.status === 409);
  assert.equal(duplicate?.cookie, null);
  assert.deepEqual((await plannerState(app.client(created.cookie))).user, { name, email });

  const users = sql(schema + '.users');
  const rows = await sql`SELECT name, email FROM ${users}`;
  assert.deepEqual([...rows], [{ name, email }]);
  const relogin = app.client();
  assert.equal((await relogin('/api/login', 'POST', { ...account, email: variant })).status, 200);
  assert.deepEqual((await plannerState(relogin)).user, { name, email });
});

test('Una cuenta anterior puede iniciar sesión con su contraseña original', postgresTest, async (t) => {
  const { schema, sql } = await testSchema(t);
  const app = start(schema);
  t.after(() => app.close());
  const users = sql(schema + '.users');
  const password = 'una frase de prueba';
  const passwordHash = await hashPassword(password);
  await sql`INSERT INTO ${users} (id, email, name, password_hash)
    VALUES ('legacy-account', ${account.email}, ${account.name}, ${passwordHash})`;

  const client = app.client();
  assert.equal((await client('/api/login', 'POST', { ...account, password })).status, 200);
  assert.deepEqual((await plannerState(client)).user, { name: account.name, email: account.email });
});

test('Las cuentas aíslan rutinas y hábitos y guardan su estado después de reiniciar', postgresTest, async (t) => {
  const { schema } = await testSchema(t);
  let app = start(schema);
  t.after(() => app.close());
  const ana = app.client();
  const other = app.client();
  const register = await ana('/api/register', 'POST', account);
  assert.equal(register.status, 201);
  assert.ok(register.cookie);
  assert.match(register.cookie, /HttpOnly; SameSite=Strict/);
  assert.deepEqual(await plannerState(ana), {
    today: testDay,
    user: { name: account.name, email: account.email },
    workouts: [], habits: [], logs: [],
  });
  assert.equal((await other('/api/register', 'POST', { ...account, name: 'Luis', email: 'luis@example.test' })).status, 201);
  const session = {
    name: 'Piernas', day: testDay, time: '07:30', duration: 40, category: 'Fuerza', notes: 'Mancuernas',
    exercises: [{ name: 'Sentadilla', sets: 3, reps: 8, rest: 75, details: 'Baja con control.',
      video: 'https://www.youtube.com/watch?v=B86Zj72LwzA' }],
  };
  assert.equal((await ana('/api/workouts', 'POST', { ...session, day: '2026-02-30' })).status, 422);
  assert.equal((await ana('/api/workouts', 'POST', { ...session, exercises: [] })).status, 422);
  const created = await ana('/api/workouts', 'POST', session);
  assert.equal(created.status, 201);
  assert.ok(created.body.id);
  const workoutUrl = `/api/workouts/${created.body.id}`;
  assert.equal((await other(workoutUrl + '/done', 'PATCH', { done: true })).status, 404);
  assert.equal((await other(workoutUrl, 'PUT', { ...session, name: 'Cambios de otra cuenta' })).status, 404);
  assert.equal((await other(workoutUrl, 'DELETE')).status, 404);
  assert.equal((await ana(workoutUrl, 'PUT', { ...session, name: 'Piernas y técnica' })).status, 200);
  assert.equal((await ana(workoutUrl + '/done', 'PATCH', { done: true })).status, 200);

  const habit = await ana('/api/habits', 'POST', { name: 'Agua', unit: 'vasos', target: 8, icon: 'water' });
  assert.equal(habit.status, 201);
  assert.ok(habit.body.id);
  const habitUrl = `/api/habits/${habit.body.id}`;
  assert.equal((await other(habitUrl + '/log', 'PATCH', { day: testDay, delta: 1 })).status, 404);
  assert.equal((await other(habitUrl, 'PUT', { name: 'Otro hábito', unit: 'vasos', target: 2, icon: 'water' })).status, 404);
  assert.equal((await other(habitUrl, 'DELETE')).status, 404);
  assert.equal((await ana(habitUrl + '/log', 'PATCH', { day: testDay, done: true })).status, 422);
  assert.equal((await ana(habitUrl + '/log', 'PATCH', { day: addDays(testDay, 1), delta: 1 })).status, 422);
  assert.equal((await ana(habitUrl + '/log', 'PATCH', { day: testDay, delta: 1 }, { Origin: 'https://example.test' })).status, 403);
  const increments = await Promise.all(Array.from({ length: 5 }, () =>
    ana(habitUrl + '/log', 'PATCH', { day: testDay, delta: 1 })));
  assert.ok(increments.every((result) => result.status === 200));
  assert.deepEqual(await plannerState(other), {
    today: testDay,
    user: { name: 'Luis', email: 'luis@example.test' },
    workouts: [], habits: [], logs: [],
  });
  await app.close();
  app = start(schema);
  assert.equal((await plannerState(app.client(register.cookie))).user.email, account.email);

  const relogin = app.client();
  assert.equal((await relogin('/api/login', 'POST', { ...account, password: 'incorrecta' })).status, 401);
  const login = await relogin('/api/login', 'POST', account);
  assert.equal(login.status, 200);
  const state = await plannerState(relogin);
  assert.deepEqual(state.workouts[0].exercises, session.exercises);
  assert.equal(state.workouts[0].name, 'Piernas y técnica');
  assert.equal(state.workouts[0].done, true);
  assert.deepEqual(state.habits.map(({ name }) => name), ['Agua']);
  assert.deepEqual(state.logs, [{ habit_id: habit.body.id, day: testDay, amount: 5 }]);
  assert.equal((await relogin('/api/logout', 'POST')).status, 200);
  assert.equal((await relogin('/api/state')).status, 401);
  assert.equal((await app.client(login.cookie)('/api/state')).status, 401);
  assert.equal((await relogin(workoutUrl, 'DELETE')).status, 401);
});

test('Las sesiones anónimas, caducadas y antiguas de demo no acceden a la agenda', postgresTest, async (t) => {
  const { schema, sql } = await testSchema(t);
  const app = start(schema);
  t.after(() => app.close());
  const personal = await app.client()('/api/register', 'POST', account);
  assert.equal(personal.status, 201);
  const expired = issueSession(30);
  const oldDemo = issueSession(7);
  const users = sql(schema + '.users');
  const sessions = sql(schema + '.sessions');
  await sql`INSERT INTO ${sessions} (hash, owner, expires)
    SELECT ${expired.hash}, id, ${Date.now() - 1_000} FROM ${users} WHERE email = ${account.email}`;
  await sql`INSERT INTO ${users} (id, name, demo_expires) VALUES ('old-demo', 'Invitado', ${oldDemo.expires})`;
  await sql`INSERT INTO ${sessions} (hash, owner, expires) VALUES (${oldDemo.hash}, 'old-demo', ${oldDemo.expires})`;

  for (const [label, cookie] of [
    ['sin sesión', undefined],
    ['sesión caducada', sessionCookie(expired, false)],
    ['sesión de demo vigente', sessionCookie(oldDemo, false)],
  ]) {
    const client = app.client(cookie);
    const state = await client('/api/state');
    assert.equal(state.status, 401, label);
    assert.ok('error' in state.body, label);
    assert.equal((await client('/api/habits', 'POST', { name: 'Agua', unit: 'vasos', target: 8, icon: 'water' })).status, 401, label);
    const retired = await client('/api/demo', 'POST');
    assert.equal(retired.status, 404, label);
    assert.equal(retired.cookie, null, label);
  }
  assert.equal((await app.client(personal.cookie)('/api/demo', 'POST')).status, 404);
});

test('Una preview de Vercel permite su origen HTTPS y emite cookies seguras', postgresTest, async (t) => {
  const { schema } = await testSchema(t);
  const previous = { VERCEL: process.env.VERCEL, VERCEL_ENV: process.env.VERCEL_ENV };
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = 'preview';
  const app = start(schema);
  t.after(async () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await app.close();
  });

  const client = app.client();
  const host = 'qualy-preview.example.test';
  assert.equal((await client('/api/register', 'POST', account, { Host: host, Origin: 'https://other.example.test' })).status, 403);
  assert.equal((await client('/api/register', 'POST', account, { Host: host, Origin: 'http://' + host })).status, 403);
  const register = await client('/api/register', 'POST', account, { Host: host, Origin: 'https://' + host });
  assert.equal(register.status, 201);
  assert.ok(register.cookie);
  assert.match(register.cookie, /HttpOnly; SameSite=Strict.*; Secure$/);
});

test('Un hábito puede cambiar de tipo y de meta conservando sus registros', postgresTest, async (t) => {
  const { schema } = await testSchema(t);
  const app = start(schema);
  t.after(() => app.close());
  const client = app.client();
  assert.equal((await client('/api/register', 'POST', account)).status, 201);
  const named = { name: 'Hidratación', icon: 'water' };
  const habit = await client('/api/habits', 'POST', { ...named, unit: 'vasos', target: 8 });
  assert.equal(habit.status, 201);
  assert.ok(habit.body.id);
  const id = habit.body.id;
  const item = '/api/habits/' + id;
  assert.equal((await client(item + '/log', 'PATCH', { day: testDay, delta: 5 })).status, 200);

  assert.equal((await client(item, 'PUT', { ...named, unit: 'botellas', target: 0 })).status, 422);
  assert.equal((await client(item, 'PUT', { ...named, unit: '', target: 1 })).status, 200);
  assert.equal((await client(item + '/log', 'PATCH', { day: testDay, delta: 1 })).status, 422);
  const fixed = await client('/api/habits', 'POST', { name: 'Estirar', icon: 'water', unit: '', target: 1 });
  assert.equal(fixed.status, 201);
  assert.ok(fixed.body.id);
  const fixedLog = '/api/habits/' + fixed.body.id + '/log';
  assert.equal((await client(fixedLog, 'PATCH', { day: testDay, done: true })).status, 200);
  assert.equal((await plannerState(client)).logs.find(({ habit_id }) => habit_id === fixed.body.id)?.amount, 1);
  assert.equal((await client(fixedLog, 'PATCH', { day: testDay, done: false })).status, 200);
  assert.equal((await client(item, 'PUT', { ...named, unit: 'botellas', target: 3 })).status, 200);
  assert.equal((await client(item + '/log', 'PATCH', { day: testDay, delta: 1 })).status, 200);
  assert.equal((await client(item + '/log', 'PATCH', { day: testDay, delta: -1 })).status, 200);
  const before = await plannerState(client);
  const edited = before.habits.find((habit) => habit.id === id);
  assert.ok(edited);
  assert.deepEqual([edited.name, edited.unit, edited.target], ['Hidratación', 'botellas', 3]);
  assert.equal(before.logs.find(({ habit_id, day }) => habit_id === id && day === testDay)?.amount, 5);
  assert.equal(before.logs.find(({ habit_id }) => habit_id === fixed.body.id)?.amount, 0);

  assert.equal((await client(item, 'DELETE')).status, 200);
  assert.equal((await client(item + '/log', 'PATCH', { day: testDay, delta: 1 })).status, 404);
  const after = await plannerState(client);
  assert.equal(after.habits.find((habit) => habit.id === id)?.archived_on, testDay);
  assert.deepEqual(after.logs, before.logs);
});

test('Los errores de la API siguen la preferencia de idioma', async () => {
  const api = createApi({ databaseUrl: '' });
  const response = await api.handle(new Request('http://localhost/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Qualy-Request': '1',
      Cookie: 'qualy_locale=en',
    },
    body: '{}',
  }));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'Check the “Email” field.');
});
