const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

// --- DATABASE CONNECTION - REPLACE WITH YOUR DETAILS ---
const pool = new Pool({
  user: 'postgres',
  host: '34.9.200.153',
  database: 'postgres',
  password: 'JeaGrafe2004*',
  port: 5432,
});

const battlesFilePath = path.join(__dirname, 'battles.csv');

// Main function to populate battles
async function populateBattles() {
  const client = await pool.connect();
  console.log('Connected to PostgreSQL database!');

  try {
    console.log('Clearing existing battles data...');
    await client.query('TRUNCATE TABLE battles RESTART IDENTITY');
    console.log('✅ Battles table cleared.');

    // 1. Fetch all emcees and create a name-to-ID map for fast lookups.
    console.log('Fetching all emcees...');
    const emceesResult = await client.query('SELECT id, name FROM emcees');
    const emceeIdMap = new Map(emceesResult.rows.map(e => [e.name, e.id]));
    console.log(`Found ${emceeIdMap.size} emcees in the database.`);

    const battlesToInsert = new Set();
    let processedCount = 0;

    const battlesStream = fs.createReadStream(battlesFilePath).pipe(csv({
        mapHeaders: ({ header }) => header.trim(),
        mapValues: ({ value }) => value.trim()
    }));

    console.log('Processing battles from CSV...');
    for await (const row of battlesStream) {
      const emcee1Names = row['Column A'] ? row['Column A'].split('/').map(n => n.trim()).filter(Boolean) : [];
      const emcee2Names = row['Column B'] ? row['Column B'].split('/').map(n => n.trim()).filter(Boolean) : [];

      if (emcee1Names.length > 0 && emcee2Names.length > 0) {
        for (const name1 of emcee1Names) {
          for (const name2 of emcee2Names) {
            const id1 = emceeIdMap.get(name1);
            const id2 = emceeIdMap.get(name2);

            if (id1 && id2 && id1 !== id2) {
              // Ensure consistent order (emcee1_id < emcee2_id) to handle duplicates
              const battle = [id1, id2].sort((a, b) => a - b);
              battlesToInsert.add(JSON.stringify(battle));
            }
          }
        }
      }
      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`...processed ${processedCount} rows.`);
      }
    }
    console.log(`Finished processing ${processedCount} rows from CSV.`);

    if (battlesToInsert.size === 0) {
      console.log('No new battles to insert.');
      return;
    }

    // 2. Prepare a single bulk insert query.
    const battleValues = Array.from(battlesToInsert).map(b => JSON.parse(b));
    const values = battleValues.flat();
    const valuePlaceholders = battleValues.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');

    const insertQuery = `
      INSERT INTO battles (emcee1_id, emcee2_id)
      VALUES ${valuePlaceholders}
      ON CONFLICT (emcee1_id, emcee2_id) DO NOTHING
    `;

    console.log(`Attempting to insert ${battleValues.length} unique battles...`);
    const insertResult = await client.query(insertQuery, values);
    console.log(`✅ Successfully inserted ${insertResult.rowCount} new battles into the database.`);

  } catch (error) {
    console.error('Error populating battles:', error);
  } finally {
    client.release();
    await pool.end();
    console.log('Connection closed.');
  }
}

populateBattles();
