const postgres = require('postgres');

const sql = postgres({
    host: '34.9.200.153',
    port: 5432,
    database: 'postgres', // Or your specific database name
    username: 'postgres', // Default GCP Cloud SQL user
    password: 'JeaGrafe2004*', // Replace with the password you set in GCP
    ssl: false // Explicitly disable SSL for Cloud Run
});

module.exports = sql;

// DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@34.9.200.153:5432/postgres