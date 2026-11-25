import postgres from 'postgres';
import type { QualyState } from '../lib/models.ts';
import { databaseErrorCode } from './db.ts';
import { localeFromCookie, translate } from '../lib/i18n.ts';
import { isHttpsDeployment } from '../lib/deployment.ts';
import { todayInBogota } from '../lib/dates.ts';
import { openStore } from './store.ts';
import { demoState } from '../lib/demo.ts';
import { HttpError, object, credentials, workout, habit, date, completion, habitLog } from './validation.ts';
import { hashSession, issueSession, sessionCookie, hashPassword, matchesPassword, makeLimiter } from './auth.ts';

const unavailable = 'El guardado no está disponible por el momento.';
const connectionErrors = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
  'CONNECT_TIMEOUT', 'CONNECTION_CLOSED', '57P01', '57P02', '57P03']);

type ApiResult = QualyState | { id: string } | { ok: boolean } | { error: string };
type ApiOptions = { databaseUrl?: string; schema?: string; origin?: string; now?: () => Date };

function json(status: number, value: ApiResult, cookie?: string) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (cookie) headers.set('Set-Cookie', cookie);
  return Response.json(value, { status, headers });
}

async function bodyOf(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    throw new HttpError(415, 'Envía los datos en formato JSON.');
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        size += chunk.value.byteLength;
        if (size > 262_144) {
          void reader.cancel().catch(() => {});
          throw new HttpError(413, 'El formulario supera el tamaño permitido.');
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return object(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'El formulario contiene datos no válidos.');
  }
}

function allowWrite(request: Request, secure: boolean, origin?: string) {
  const submittedOrigin = request.headers.get('origin');
  const scheme = secure ? 'https' : 'http';
  const expected = origin ?? `${scheme}://${request.headers.get('host') ?? new URL(request.url).host}`;
  if (request.headers.get('x-qualy-request') !== '1' ||
      (submittedOrigin && submittedOrigin !== expected) ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpError(403, 'Abre Qualy directamente para guardar cambios.');
  }
}

export function createApi({
  databaseUrl = process.env.DATABASE_URL,
  schema,
  origin,
  now = () => new Date(),
}: ApiOptions = {}) {
  let store: ReturnType<typeof openStore> | undefined;

  function database() {
    if (!databaseUrl) throw new HttpError(503, unavailable);
    store ??= openStore(databaseUrl, schema);
    return store;
  }
  // Route Handlers do not expose the socket's peer address.
  // Share limits per action instead of trusting forwarded headers.
  const limit = makeLimiter();
  const secure = isHttpsDeployment(origin);
  let cleanupAfter = 0;

  async function handleApi(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname;
    const hash = hashSession(req.headers.get('cookie'));
    const today = todayInBogota(now());
    const timestamp = Date.now();
    const user = hash ? await database().userForSession(hash, timestamp) : undefined;
    if (path === '/api/state' && req.method === 'GET') {
      const state = user ? await database().state(user, today) : demoState(today);
      return json(200, { ...state, signedIn: Boolean(user) });
    }
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) throw new HttpError(404, 'No encontramos esta página.');
    allowWrite(req, secure, origin);
    const data = await bodyOf(req);
    if (databaseUrl && timestamp >= cleanupAfter) {
      cleanupAfter = timestamp + 60 * 60 * 1000;
      try {
        await database().cleanup(timestamp);
      } catch (error) {
        cleanupAfter = 0;
        throw error;
      }
    }

    if (req.method === 'POST') {
      if (path === '/api/demo') {
        if (user) return json(200, { ok: true });
        return limit('demo', 25, async () => {
          const session = issueSession(7);
          await database().createDemo(today, session.hash, session.expires);
          return json(201, { ok: true }, sessionCookie(session, secure));
        });
      }
      if (path === '/api/register' || path === '/api/login') {
        const registering = path === '/api/register';
        const { email, password, name } = credentials(data, registering);
        return limit('auth', 30, async () => {
          const session = issueSession(30);
          if (registering) {
            const passwordHash = await hashPassword(password);
            try {
              await database().createAccount({ name, email, passwordHash, hash: session.hash, expires: session.expires, replacedHash: hash });
            } catch (error) {
              if (!(error instanceof postgres.PostgresError) || error.code !== '23505' || error.constraint_name !== 'users_email_key') throw error;
              throw new HttpError(409, 'No pudimos crear la cuenta con este correo. Puedes intentar iniciar sesión.');
            }
          } else {
            const existing = await database().userForEmail(email);
            const valid = await matchesPassword(password, existing?.password_hash);
            if (!existing || !valid) throw new HttpError(401, 'El correo o la contraseña son incorrectos.');
            await database().createSession(session.hash, existing.id, session.expires, hash);
          }
          return json(registering ? 201 : 200, { ok: true }, sessionCookie(session, secure));
        });
      }
      if (path === '/api/logout') {
        if (hash) await database().removeSession(hash);
        return json(200, { ok: true }, sessionCookie(null, secure));
      }
    }

    if (!user) throw new HttpError(401, 'Inicia sesión para guardar tus cambios.');
    const owner = user.id;
    const item = path.match(/^\/api\/(workouts|habits)\/([a-z0-9-]{1,64})(?:\/(done|log))?$/);
    if (path === '/api/workouts' && req.method === 'POST') {
      return json(201, { id: await database().createWorkout(owner, workout(data)) });
    }
    if (path === '/api/habits' && req.method === 'POST') {
      return json(201, { id: await database().createHabit(owner, habit(data), today) });
    }
    if (!item) throw new HttpError(404, 'No encontramos esta página.');
    const [, collection, id, action] = item;
    let changed;
    if (collection === 'workouts') {
      if (req.method === 'PATCH' && action === 'done') changed = await database().setWorkoutDone(owner, id, completion(data.done));
      if (req.method === 'PUT' && !action) changed = await database().updateWorkout(owner, id, workout(data));
      if (req.method === 'DELETE' && !action) changed = await database().deleteWorkout(owner, id);
    }
    if (collection === 'habits') {
      if (req.method === 'PUT' && !action) changed = await database().updateHabit(owner, id, habit(data));
      if (req.method === 'DELETE' && !action) changed = await database().archiveHabit(owner, id, today);
      if (req.method === 'PATCH' && action === 'log') {
        const day = date(data.day);
        if (day > today) throw new HttpError(422, 'Puedes registrar hábitos hasta el día de hoy.');
        changed = await database().logHabit(owner, id, day, habitLog(data));
      }
    }
    if (!changed) throw new HttpError(404, 'El elemento ya no está disponible.');
    return json(200, { ok: true });
  }

  return {
    async handle(request: Request) {
      const locale = localeFromCookie(request.headers.get('cookie'));
      try {
        return await handleApi(request);
      } catch (error) {
        if (error instanceof HttpError) {
          const label = error.values?.label;
          const values = typeof label === 'string' ? { ...error.values, label: translate(locale, label) } : error.values;
          return json(error.status, { error: translate(locale, error.message, values) });
        }
        const code = databaseErrorCode(error);
        if (code && connectionErrors.has(code)) {
          console.warn('Qualy database unavailable:', code);
          return json(503, { error: translate(locale, unavailable) });
        }
        console.error('Qualy request failed:', code ?? (error instanceof Error ? error.name : 'Unknown error'));
        return json(500, { error: translate(locale, 'Ocurrió un error. Intenta de nuevo.') });
      }
    },
    close: () => store?.close(),
  };
}
