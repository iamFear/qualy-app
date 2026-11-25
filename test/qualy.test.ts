import { test } from 'node:test';
import type { TestContext } from 'node:test';
import type { QualyState } from '../lib/models.ts';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../server/db.ts';
import { localizeDemo } from '../lib/demo-language.ts';
import { demoState } from '../lib/demo.ts';
import { createApi } from '../server/api.ts';
import { addDays, todayInBogota, weekOf } from '../lib/dates.ts';

const demoDate = '2026-11-24';
const time = new Date('2026-11-25T03:40:00.000Z');
const account = { name: 'Ana', email: 'ana@example.test', password: 'una frase de prueba' };

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
  return schema;
}

type WriteMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type TestResult<T> = { status: number; body: T; cookie: string | null };
type WriteResponse = { id?: string; error?: string; ok?: boolean };

function start(schema: string) {
  const api = createApi({ databaseUrl, schema, now: () => time });
  const base = 'http://127.0.0.1:4317';
  return {
    client: (initialCookie?: string | null) => {
      let cookie = initialCookie?.split(';')[0];
      function call(path: '/api/state'): Promise<TestResult<QualyState>>;
      function call(path: string, method: WriteMethod, data?: object, headers?: Record<string, string>): Promise<TestResult<WriteResponse>>;
      async function call(path: string, method: WriteMethod | 'GET' = 'GET', data: object = {}, headers: Record<string, string> = {}):
        Promise<TestResult<QualyState | WriteResponse>> {
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
        return { status: res.status, body: await res.json() as QualyState | WriteResponse, cookie: set };
      }
      return call;
    },
    close: api.close,
  };
}

test('Los días y la semana siguen el calendario de Bogotá', () => {
  assert.equal(todayInBogota(time), demoDate);
  assert.deepEqual(weekOf('2026-12-31'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
});

test('Las cuentas aíslan rutinas y hábitos y guardan su estado después de reiniciar', postgresTest, async (t) => {
  const schema = await testSchema(t);
  let app = start(schema);
  t.after(() => app.close());
  const ana = app.client();
  const other = app.client();
  const register = await ana('/api/register', 'POST', account);
  assert.equal(register.status, 201);
  assert.ok(register.cookie);
  assert.match(register.cookie, /HttpOnly; SameSite=Strict/);
  assert.equal((await ana('/api/state')).body.workouts.length, 0);
  assert.equal((await app.client()('/api/register', 'POST', account)).status, 409);
  assert.equal((await other('/api/register', 'POST', { ...account, name: 'Luis', email: 'luis@example.test' })).status, 201);
  const session = {
    name: 'Piernas', day: demoDate, time: '07:30', duration: 40, category: 'Fuerza', notes: 'Mancuernas',
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
  assert.equal((await other(workoutUrl, 'DELETE')).status, 404);
  assert.equal((await ana(workoutUrl, 'PUT', { ...session, name: 'Piernas y técnica' })).status, 200);
  assert.equal((await ana(workoutUrl + '/done', 'PATCH', { done: true })).status, 200);

  const habit = await ana('/api/habits', 'POST', { name: 'Agua', unit: 'vasos', target: 8, icon: 'water' });
  assert.equal(habit.status, 201);
  assert.ok(habit.body.id);
  const habitUrl = `/api/habits/${habit.body.id}`;
  assert.equal((await other(habitUrl + '/log', 'PATCH', { day: demoDate, delta: 1 })).status, 404);
  assert.equal((await ana(habitUrl + '/log', 'PATCH', { day: demoDate, done: true })).status, 422);
  assert.equal((await ana(habitUrl + '/log', 'PATCH', { day: addDays(demoDate, 1), delta: 1 })).status, 422);
  assert.equal((await ana(habitUrl + '/log', 'PATCH', { day: demoDate, delta: 1 }, { Origin: 'https://example.test' })).status, 403);
  const increments = await Promise.all(Array.from({ length: 5 }, () =>
    ana(habitUrl + '/log', 'PATCH', { day: demoDate, delta: 1 })));
  assert.ok(increments.every((result) => result.status === 200));
  assert.equal((await other('/api/state')).body.habits.length, 0);
  await app.close();
  app = start(schema);
  assert.equal((await app.client(register.cookie)('/api/state')).body.user?.email, account.email);

  const relogin = app.client();
  assert.equal((await relogin('/api/login', 'POST', { ...account, password: 'incorrecta' })).status, 401);
  assert.equal((await relogin('/api/login', 'POST', account)).status, 200);
  const { body: state } = await relogin('/api/state');
  assert.deepEqual(state.workouts[0].exercises, session.exercises);
  assert.equal(state.workouts[0].name, 'Piernas y técnica');
  assert.equal(state.workouts[0].done, true);
  assert.deepEqual(state.logs, [{ habit_id: habit.body.id, day: demoDate, amount: 5 }]);
  assert.equal((await relogin('/api/logout', 'POST')).status, 200);
  assert.equal((await relogin(workoutUrl, 'DELETE')).status, 401);
});

test('La demo solo guarda cambios dentro de la sesión que la abrió', postgresTest, async (t) => {
  const app = start(await testSchema(t));
  t.after(() => app.close());
  const first = app.client();
  const second = app.client();
  assert.equal((await first('/api/state')).body.signedIn, false);
  assert.equal((await first('/api/demo', 'POST')).status, 201);
  assert.equal((await first('/api/habits/sol/log', 'PATCH', { day: demoDate, done: false })).status, 200);
  assert.equal((await first('/api/state')).body.logs.find((log) => log.habit_id === 'sol' && log.day === demoDate)?.amount, 0);
  assert.equal((await second('/api/state')).body.logs.find((log) => log.habit_id === 'sol' && log.day === demoDate)?.amount, 1);
  assert.equal((await first('/api/habits/sol', 'DELETE')).status, 200);
  assert.equal((await first('/api/state')).body.habits.find((item) => item.id === 'sol')?.archived_on, demoDate);
});

test('Una preview de Vercel permite su origen HTTPS y emite cookies seguras', postgresTest, async (t) => {
  const schema = await testSchema(t);
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
  assert.equal((await client('/api/demo', 'POST', {}, { Host: host, Origin: 'https://other.example.test' })).status, 403);
  assert.equal((await client('/api/demo', 'POST', {}, { Host: host, Origin: 'http://' + host })).status, 403);
  const demo = await client('/api/demo', 'POST', {}, { Host: host, Origin: 'https://' + host });
  assert.equal(demo.status, 201);
  assert.ok(demo.cookie);
  assert.match(demo.cookie, /HttpOnly; SameSite=Strict.*; Secure$/);
});

test('Un hábito puede cambiar de tipo y de meta conservando sus registros', postgresTest, async (t) => {
  const app = start(await testSchema(t));
  t.after(() => app.close());
  const client = app.client();
  await client('/api/demo', 'POST');
  const item = '/api/habits/agua';
  const named = { name: 'Hidratación', icon: 'water' };

  assert.equal((await client(item, 'PUT', { ...named, unit: 'botellas', target: 0 })).status, 422);
  assert.equal((await client(item, 'PUT', { ...named, unit: '', target: 1 })).status, 200);
  assert.equal((await client(item + '/log', 'PATCH', { day: demoDate, delta: 1 })).status, 422);
  assert.equal((await client(item, 'PUT', { ...named, unit: 'botellas', target: 3 })).status, 200);
  assert.equal((await client(item + '/log', 'PATCH', { day: demoDate, delta: 1 })).status, 200);
  assert.equal((await client(item + '/log', 'PATCH', { day: demoDate, delta: -1 })).status, 200);
  const { body: before } = await client('/api/state');
  const edited = before.habits.find(({ id }) => id === 'agua');
  assert.ok(edited);
  assert.deepEqual([edited.name, edited.unit, edited.target], ['Hidratación', 'botellas', 3]);
  assert.equal(before.logs.find(({ habit_id, day }) => habit_id === 'agua' && day === demoDate)?.amount, 5);

  assert.equal((await client(item, 'DELETE')).status, 200);
  assert.equal((await client(item + '/log', 'PATCH', { day: demoDate, delta: 1 })).status, 404);
  const { body: after } = await client('/api/state');
  assert.equal(after.habits.find(({ id }) => id === 'agua')?.archived_on, demoDate);
  assert.deepEqual(after.logs, before.logs);
});

test('La demo permite alternar el idioma sin cambiar contenido creado por la persona', () => {
  const source = demoState(demoDate);
  source.habits[0].name = 'Mi hábito editado';
  const english = localizeDemo(source, 'en');
  assert.equal(english.habits[0].name, 'Mi hábito editado');
  assert.equal(english.habits[0].unit, 'glasses');
  assert.equal(english.workouts[1].name, 'Full-body strength');
  assert.deepEqual(localizeDemo(english, 'es'), source);
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
