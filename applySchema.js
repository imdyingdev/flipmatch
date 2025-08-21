const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// --- DATABASE CONNECTION ---
const pool = new Pool({
  user: 'postgres',
  host: '34.9.200.153',
  database: 'postgres',
  password: 'JeaGrafe2004*',
  port: 5432,
});

const schemaFilePath = path.join(__dirname, 'database.sql');

async function applySchema() {
  console.log('Attempting to apply database schema...');
  const client = await pool.connect();
  
  try {
    const sql = fs.readFileSync(schemaFilePath, 'utf8');
    await client.query(sql);
    console.log('✅ Database schema applied successfully!');
  } catch (error) {
    console.error('❌ Error applying database schema:', error);
  } finally {
    client.release();
    await pool.end();
    console.log('Connection closed.');
  }
}

applySchema();
