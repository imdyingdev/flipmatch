const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// --- DATABASE CONNECTION - REPLACE WITH YOUR DETAILS ---
const pool = new Pool({
  user: 'postgres', // default user
  host: '34.9.200.153',
  database: 'postgres',
  password: 'JeaGrafe2004*',
  port: 5432,
});

const emceesFilePath = path.join(__dirname, 'emcees.json');

async function uploadEmcees() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database!');

    try {
      console.log('Clearing existing emcees data...');
      await client.query('TRUNCATE TABLE emcees RESTART IDENTITY CASCADE'); // CASCADE will also clear dependent tables like battles
      console.log('✅ Emcees table cleared.');

      const emceesData = JSON.parse(fs.readFileSync(emceesFilePath, 'utf8'));

      if (emceesData.length === 0) {
        console.log('No emcees to upload.');
        return;
      }

      const values = emceesData.map(name => `('${name.replace(/'/g, "''")}')`).join(',');
      const insertQuery = `INSERT INTO emcees (name) VALUES ${values} ON CONFLICT (name) DO NOTHING`;

      console.log(`Attempting to insert ${emceesData.length} emcees...`);
      const result = await client.query(insertQuery);
      console.log(`✅ Successfully inserted ${result.rowCount} new emcees.`);

    } catch (error) {
      console.error('Error uploading emcees:', error);
    } finally {
      client.release();
      await pool.end();
      console.log('Connection closed.');
    }
  } catch (error) {
    console.error('Error uploading emcees:', error);
    const client = await pool.connect();
    await client.query('ROLLBACK');
    client.release();
  } finally {
    await pool.end();
  }
}

uploadEmcees();
