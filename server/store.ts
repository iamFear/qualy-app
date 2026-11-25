import type { ISql } from 'postgres';
import type { Habit, HabitInput, HabitLog, HabitLogInput, PlannerState, Workout, WorkoutInput } from '../lib/models.ts';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from './db.ts';
import { demoState } from '../lib/demo.ts';
import { HttpError } from './validation.ts';

type SessionUser = { id: string; name: string; email: string | null; demo_expires: string | null };
type Account = { name: string; email: string; passwordHash: string; hash: string; expires: number; replacedHash?: string };

export function openStore(url?: string, schema = 'qualy') {
  const sql = connectDatabase(url);
  const table = (name: string) => sql(schema + '.' + name);
  const users = table('users');
  const sessions = table('sessions');
  const workouts = table('workouts');
  const habits = table('habits');
  const logs = table('habit_logs');

  function putWorkout(tx: ISql, owner: string, id: string, item: WorkoutInput & { done?: boolean }) {
    return tx`INSERT INTO ${workouts} (owner, id, name, day, time, duration, category, notes, exercises, done)
      VALUES (${owner}, ${id}, ${item.name}, ${item.day}, ${item.time}, ${item.duration}, ${item.category},
        ${item.notes}, ${tx.json(item.exercises)}, ${Boolean(item.done)})`;
  }

  function putHabit(tx: ISql, owner: string, id: string, item: HabitInput, day: string) {
    return tx`INSERT INTO ${habits} (owner, id, name, icon, target, unit, note, created_on)
      VALUES (${owner}, ${id}, ${item.name}, ${item.icon}, ${item.target}, ${item.unit}, ${item.note}, ${day})`;
  }

  async function putSession(tx: ISql, hash: string, owner: string, expires: number, replacedHash?: string) {
    await tx`INSERT INTO ${sessions} (hash, owner, expires) VALUES (${hash}, ${owner}, ${expires})`;
    if (replacedHash) await tx`DELETE FROM ${sessions} WHERE hash = ${replacedHash}`;
  }

  return {
    close: () => sql.end({ timeout: 5 }),
    async userForEmail(email: string): Promise<{ id: string; password_hash: string | null } | undefined> {
      const [user] = await sql<{ id: string; password_hash: string | null }[]>`SELECT id, password_hash FROM ${users} WHERE email = ${email}`;
      return user;
    },
    async userForSession(hash: string, now: number): Promise<SessionUser | undefined> {
      const [user] = await sql<SessionUser[]>`SELECT u.id, u.name, u.email, u.demo_expires
        FROM ${sessions} s JOIN ${users} u ON u.id = s.owner
        WHERE s.hash = ${hash} AND s.expires > ${now} AND (u.demo_expires IS NULL OR u.demo_expires > ${now})`;
      return user;
    },
    removeSession: (hash: string) => sql`DELETE FROM ${sessions} WHERE hash = ${hash}`,
    createSession: (hash: string, owner: string, expires: number, replacedHash?: string) =>
      sql.begin((tx) => putSession(tx, hash, owner, expires, replacedHash)),
    cleanup: (now: number) => sql.begin(async (tx) => {
      await tx`DELETE FROM ${sessions} WHERE expires <= ${now}`;
      await tx`DELETE FROM ${users} WHERE demo_expires <= ${now}`;
    }),
    createAccount: ({ name, email, passwordHash, hash, expires, replacedHash }: Account) => sql.begin(async (tx) => {
      const id = randomUUID();
      await tx`INSERT INTO ${users} (id, email, name, password_hash) VALUES (${id}, ${email}, ${name}, ${passwordHash})`;
      await putSession(tx, hash, id, expires, replacedHash);
    }),
    createDemo: (today: string, hash: string, expires: number) => sql.begin(async (tx) => {
      const owner = randomUUID();
      const example = demoState(today);
      await tx`INSERT INTO ${users} (id, name, demo_expires) VALUES (${owner}, 'Invitado', ${expires})`;
      for (const item of example.workouts) await putWorkout(tx, owner, item.id, item);
      for (const item of example.habits) await putHabit(tx, owner, item.id, item, item.created_on);
      await tx`INSERT INTO ${logs} ${tx(example.logs.map((log) => ({ ...log, owner })), 'owner', 'habit_id', 'day', 'amount')}`;
      await putSession(tx, hash, owner, expires);
    }),
    async state(user: SessionUser, today: string): Promise<PlannerState> {
      const owner = user.id;
      const [userWorkouts, userHabits, userLogs] = await Promise.all([
        sql<Workout[]>`SELECT w.id, w.name, w.day::text AS day, to_char(w.time, 'HH24:MI') AS time, w.duration,
          w.category, w.notes, w.exercises, w.done FROM ${workouts} w WHERE w.owner = ${owner} ORDER BY w.day, w.time, w.id`,
        sql<Habit[]>`SELECT id, name, icon, target, unit, note, created_on::text AS created_on, archived_on::text AS archived_on
          FROM ${habits} WHERE owner = ${owner} ORDER BY sort_order`,
        sql<HabitLog[]>`SELECT habit_id, day::text AS day, amount FROM ${logs} WHERE owner = ${owner} ORDER BY habit_id, day`,
      ]);
      return {
        today, demo: Boolean(user.demo_expires),
        user: user.email ? { name: user.name, email: user.email } : null,
        workouts: userWorkouts, habits: userHabits, logs: userLogs,
      };
    },
    async createWorkout(owner: string, item: WorkoutInput) {
      const id = randomUUID();
      await putWorkout(sql, owner, id, item);
      return id;
    },
    async updateWorkout(owner: string, id: string, item: WorkoutInput) {
      const result = await sql`UPDATE ${workouts}
        SET name = ${item.name}, day = ${item.day}, time = ${item.time}, duration = ${item.duration},
          category = ${item.category}, notes = ${item.notes}, exercises = ${sql.json(item.exercises)}
        WHERE owner = ${owner} AND id = ${id}`;
      return result.count > 0;
    },
    async setWorkoutDone(owner: string, id: string, done: boolean) {
      const result = await sql`UPDATE ${workouts} SET done = ${done} WHERE owner = ${owner} AND id = ${id}`;
      return result.count > 0;
    },
    async deleteWorkout(owner: string, id: string) {
      const result = await sql`DELETE FROM ${workouts} WHERE owner = ${owner} AND id = ${id}`;
      return result.count > 0;
    },
    async createHabit(owner: string, item: HabitInput, today: string) {
      const id = randomUUID();
      await putHabit(sql, owner, id, item, today);
      return id;
    },
    async updateHabit(owner: string, id: string, item: HabitInput) {
      const result = await sql`UPDATE ${habits}
        SET name = ${item.name}, icon = ${item.icon}, target = ${item.target}, unit = ${item.unit}, note = ${item.note}
        WHERE owner = ${owner} AND id = ${id} AND archived_on IS NULL`;
      return result.count > 0;
    },
    async archiveHabit(owner: string, id: string, day: string) {
      const result = await sql`UPDATE ${habits} SET archived_on = ${day}
        WHERE owner = ${owner} AND id = ${id} AND archived_on IS NULL`;
      return result.count > 0;
    },
    logHabit: (owner: string, id: string, day: string, data: HabitLogInput) => sql.begin(async (tx) => {
      const [item] = await tx<{ unit: string }[]>`SELECT unit FROM ${habits} WHERE owner = ${owner} AND id = ${id}
        AND created_on <= ${day} AND (archived_on IS NULL OR archived_on > ${day}) FOR SHARE`;
      if (!item) return false;
      const counting = 'delta' in data;
      if (Boolean(item.unit) !== counting) {
        throw new HttpError(422, 'Usa el tipo de registro configurado para este hábito.');
      }
      if (counting) {
        await tx`INSERT INTO ${logs} AS current_log (owner, habit_id, day, amount)
          VALUES (${owner}, ${id}, ${day}, greatest(0, ${data.delta}::integer))
          ON CONFLICT (owner, habit_id, day)
          DO UPDATE SET amount = least(9999, greatest(0, current_log.amount + ${data.delta}::integer))`;
      } else {
        await tx`INSERT INTO ${logs} (owner, habit_id, day, amount)
          VALUES (${owner}, ${id}, ${day}, ${Number(data.done)})
          ON CONFLICT (owner, habit_id, day) DO UPDATE SET amount = excluded.amount`;
      }
      return true;
    }),
  };
}
