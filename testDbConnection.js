const sql = require('./db.js');

async function testConnection() {
  console.log('Attempting to connect to the database...');
  try {
    const result = await sql`SELECT NOW()`;
    console.log('✅ Successfully connected to the database!');
    console.log('Current database time:', result[0].now);
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
  } finally {
    await sql.end();
    console.log('Connection closed.');
  }
}

testConnection();
