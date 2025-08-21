const postgres = require('postgres');

const sql = postgres({
    host: process.env.INSTANCE_CONNECTION_NAME ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}` : (process.env.PGHOST || '34.9.200.153'),
    port: process.env.INSTANCE_CONNECTION_NAME ? undefined : (process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'postgres',
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'JeaGrafe2004*',
    ssl: false // Explicitly disable SSL for Cloud Run
});

module.exports = sql;

// DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@34.9.200.153:5432/postgres