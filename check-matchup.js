const postgres = require('postgres');
const URL = 'postgres://postgres:JeaGrafe2004*@34.9.200.153:5432/postgres';

const sql = postgres(URL, { ssl: 'require' });

async function checkMatchup(emcee1Name, emcee2Name) {
    try {
        console.log(`Checking for potential matchup: ${emcee1Name} vs ${emcee2Name}`);

        const emcees = await sql`
            SELECT id, name FROM emcees WHERE name IN (${emcee1Name}, ${emcee2Name})
        `;

        if (emcees.length < 2) {
            console.log('Could not find both emcees in the database.');
            return;
        }

        const emcee1 = emcees.find(e => e.name === emcee1Name);
        const emcee2 = emcees.find(e => e.name === emcee2Name);

        const battle = await sql`
            SELECT 1 FROM battles
            WHERE (emcee1_id = ${emcee1.id} AND emcee2_id = ${emcee2.id})
               OR (emcee1_id = ${emcee2.id} AND emcee2_id = ${emcee1.id})
        `;

        if (battle.length > 0) {
            console.log(`Result: ${emcee1Name} and ${emcee2Name} have already battled.`);
        } else {
            console.log(`Result: Yes, ${emcee1Name} vs ${emcee2Name} is a potential future matchup!`);
        }

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await sql.end();
    }
}

const [,, emcee1, emcee2] = process.argv;

if (!emcee1 || !emcee2) {
    console.log('Please provide two emcee names as arguments.');
    console.log('Example: node check-matchup.js "Emcee A" "Emcee B"');
} else {
    checkMatchup(emcee1, emcee2);
}
