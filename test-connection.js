const { Pool } = require('pg');

// Database configuration with provided credentials
const pool = new Pool({
  user: 'postgres',
  host: '34.9.200.153',
  database: 'postgres',
  password: 'JeaGrafe2004*',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  const client = await pool.connect();
  try {
    console.log('Testing database connection...');
    
    // Test the connection
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current database time:', result.rows[0].current_time);
    
    // Test a simple query
    const version = await client.query('SELECT version()');
    console.log('\nDatabase version:');
    console.log(version.rows[0].version);
    
  } catch (error) {
    console.error('❌ Error connecting to the database:');
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection();
