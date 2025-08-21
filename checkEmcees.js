const { Pool } = require('pg');

// --- DATABASE CONNECTION ---
const pool = new Pool({
  user: 'postgres',
  host: '34.9.200.153',
  database: 'postgres',
  password: 'JeaGrafe2004*',
  port: 5432,
});

async function checkEmcees() {
  const client = await pool.connect();
  console.log('Connected to PostgreSQL database!');

  try {
    // Get the total count of emcees
    const countResult = await client.query('SELECT COUNT(*) FROM emcees');
    const count = parseInt(countResult.rows[0].count, 10);
    console.log(`Found ${count} emcees in the database.`);

    // If there are emcees, show a few examples
    if (count > 0) {
      const sampleResult = await client.query('SELECT name FROM emcees LIMIT 10');
      console.log('--- Sample of emcees ---');
      sampleResult.rows.forEach(row => console.log(row.name));
      console.log('------------------------');
    }

  } catch (error) {
    console.error('Error checking emcees:', error.message);
    if (error.code === '42P01') {
        console.log('Hint: The `emcees` table does not exist. You may need to run the `applySchema.js` script.');
    }
  } finally {
    client.release();
    await pool.end();
    console.log('Connection closed.');
  }
}

checkEmcees();
