import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { SQLOutputValue } from 'node:sqlite';
import type { Parameter } from 'postgres';
import { connectDatabase, databaseErrorCode } from '../server/db.ts';

const tables = [
  ['users', ['id', 'email', 'name', 'password_hash', 'demo_expires']],
  ['sessions', ['hash', 'owner', 'expires']],
  ['workouts', ['owner', 'id', 'name', 'day', 'time', 'duration', 'category', 'notes', 'exercises', 'done']],
  ['habits', ['owner', 'id', 'name', 'icon', 'target', 'unit', 'note', 'created_on', 'archived_on']],
  ['habit_logs', ['owner', 'habit_id', 'day', 'amount']],
] as const;

type ImportRow = Record<string, SQLOutputValue | boolean | Parameter>;

async function importData(path: string) {
  const sql = connectDatabase();
  let sqlite: DatabaseSync | undefined;
  try {
    const source = new DatabaseSync(path, { readOnly: true });
    sqlite = source;
    source.exec('BEGIN');
    if (source.prepare('PRAGMA user_version').get()?.user_version !== 1) {
      throw new Error('UNSUPPORTED_SQLITE');
    }
    return await sql.begin(async (tx) => {
      await tx`LOCK TABLE qualy.users, qualy.sessions, qualy.workouts, qualy.habits, qualy.habit_logs
        IN SHARE ROW EXCLUSIVE MODE`;
      const [existing] = await tx`SELECT id FROM qualy.users LIMIT 1`;
      if (existing) throw new Error('DESTINATION_NOT_EMPTY');

      const counts: Record<string, number> = {};
      for (const [table, columns] of tables) {
        const rows = source.prepare('SELECT ' + columns.join(', ') + ' FROM ' + table + ' ORDER BY rowid');
        const target = tx('qualy.' + table);
        let batch: ImportRow[] = [];
        let count = 0;
        for (const row of rows.iterate()) {
          if (table === 'workouts') {
            if (typeof row.exercises !== 'string') throw new Error('UNSUPPORTED_SQLITE');
            batch.push({ ...row, done: Boolean(row.done), exercises: tx.json(JSON.parse(row.exercises)) });
          } else {
            batch.push(row);
          }
          count++;
          if (batch.length === 200) {
            await tx`INSERT INTO ${target} ${tx(batch, ...columns)}`;
            batch = [];
          }
        }
        if (batch.length) await tx`INSERT INTO ${target} ${tx(batch, ...columns)}`;
        counts[table] = count;
      }
      return counts;
    });
  } finally {
    try {
      sqlite?.close();
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error('Configura DATABASE_URL para el destino PostgreSQL.');
  process.exitCode = 1;
} else {
  try {
    const counts = await importData(resolve(process.argv[2] || 'data/qualy.sqlite'));
    console.log('Importación completada.');
    console.table(counts);
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    if (message === 'DESTINATION_NOT_EMPTY') {
      console.error('El destino ya contiene datos de Qualy. La importación requiere un esquema vacío.');
    } else if (message === 'UNSUPPORTED_SQLITE') {
      console.error('El archivo SQLite no tiene la versión de esquema esperada.');
    } else {
      console.error('La importación falló. Código:', databaseErrorCode(error) ?? (error instanceof Error ? error.name : 'Error desconocido'));
    }
    process.exitCode = 1;
  }
}
