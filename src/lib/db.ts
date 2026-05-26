import postgres from 'postgres';

const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const fromCamel = (s: string) => s.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);

let _sql: ReturnType<typeof postgres> | undefined;

function getDb() {
  if (!_sql) {
    _sql = postgres(process.env.DATABASE_URL!, {
      ssl: 'require',
      max: 1,
      idle_timeout: 60,
      max_lifetime: 300,
      connect_timeout: 10,
      prepare: false,
      transform: {
        column: { from: toCamel, to: fromCamel },
      },
    });
  }
  return _sql;
}

export default getDb;