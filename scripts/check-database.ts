import { connectDatabase, isHostedDatabase } from '../server/db.ts';

const runtimePrivileges = {
  users: ['SELECT', 'INSERT', 'DELETE'],
  sessions: ['SELECT', 'INSERT', 'DELETE'],
  workouts: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  habits: ['SELECT', 'INSERT', 'UPDATE'],
  habit_logs: ['SELECT', 'INSERT', 'UPDATE'],
} as const;

type Privilege = (typeof runtimePrivileges)[keyof typeof runtimePrivileges][number];
type TableAccess = { name: string; rlsActive: boolean } & Record<Privilege, boolean>;

async function checkDatabase() {
  const args = process.argv.slice(2);
  const hosted = args.length === 1 && args[0] === '--hosted';
  if (args.length && !hosted) return 'Uso: npm run db:check [-- --hosted]';

  const url = process.env.DATABASE_URL;
  if (!url) return 'Configura DATABASE_URL con la conexión de PostgreSQL de Qualy.';

  let sql;
  try {
    sql = connectDatabase(url, { quiet: true });
  } catch {
    return 'No se pudo leer la configuración de PostgreSQL. Revisa DATABASE_URL y la configuración TLS.';
  }

  try {
    if (hosted && !isHostedDatabase(sql.options)) {
      return 'La comprobación alojada requiere que DATABASE_URL apunte a un servidor remoto.';
    }
    const { ssl } = sql.options;
    if (hosted && (!ssl || typeof ssl !== 'object' || ssl.rejectUnauthorized !== true)) {
      return 'La comprobación alojada requiere TLS con verificación del certificado.';
    }

    return await sql.begin('read only', async (tx) => {
      const [schema] = await tx<{ usable: boolean; writable: boolean }[]>`
        SELECT pg_catalog.has_schema_privilege(oid, 'USAGE') AS usable,
          (pg_catalog.current_setting('default_transaction_read_only') = 'off' AND NOT pg_catalog.pg_is_in_recovery()) AS writable
        FROM pg_catalog.pg_namespace WHERE nspname = 'qualy'
      `;
      if (!schema) return 'Falta el esquema qualy. Aplica las migraciones en la base de destino.';
      if (!schema.usable) return 'El rol de conexión necesita el permiso USAGE sobre el esquema qualy.';
      if (!schema.writable) return 'La conexión de PostgreSQL debe usar un destino que permita escrituras.';

      const tables = await tx<TableAccess[]>`
        SELECT c.relname AS name, pg_catalog.row_security_active(c.oid) AS "rlsActive",
          pg_catalog.has_table_privilege(c.oid, 'SELECT') AS "SELECT",
          pg_catalog.has_table_privilege(c.oid, 'INSERT') AS "INSERT",
          pg_catalog.has_table_privilege(c.oid, 'UPDATE') AS "UPDATE",
          pg_catalog.has_table_privilege(c.oid, 'DELETE') AS "DELETE"
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'qualy' AND c.relkind IN ('r', 'p')
      `;

      for (const [name, privileges] of Object.entries(runtimePrivileges)) {
        const table = tables.find((entry) => entry.name === name);
        if (!table) return `Falta la tabla qualy.${name}. Aplica las migraciones en la base de destino.`;
        const missing = privileges.filter((privilege) => !table[privilege]);
        if (missing.length) return `El rol de conexión necesita ${missing.join(', ')} sobre qualy.${name}.`;
        // The store scopes requests by owner and the private schema has no RLS policies.
        if (table.rlsActive) return `RLS aplica al rol de conexión sobre qualy.${name}. Usa el rol de servidor configurado para Qualy.`;
      }
    });
  } catch {
    return 'No se pudo comprobar PostgreSQL. Revisa la conexión, las credenciales y el certificado TLS.';
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

const error = await checkDatabase();
if (error) {
  console.error(error);
  process.exitCode = 1;
} else {
  console.log('PostgreSQL disponible. El esquema qualy y los permisos del rol están listos.');
}
