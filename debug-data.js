const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL || {
    host: process.env.INSTANCE_CONNECTION_NAME ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}` : (process.env.PGHOST || '34.9.200.153'),
    port: process.env.INSTANCE_CONNECTION_NAME ? undefined : (process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'postgres',
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'JeaGrafe2004*',
    ssl: false // Explicitly disable SSL for Cloud Run
});

async function getLatestBattles() {
    try {
        const battles = await sql`
            SELECT 
                b.id,
                e1.name as emcee1,
                e2.name as emcee2
            FROM battles b
            JOIN emcees e1 ON b.emcee1_id = e1.id
            JOIN emcees e2 ON b.emcee2_id = e2.id
            ORDER BY b.id ASC
            LIMIT 5
        `;
        return battles;
    } catch (error) {
        console.error('Error fetching latest battles:', error);
        return [];
    }
}

async function getFirstBattles() {
    try {
        const battles = await sql`
            SELECT 
                b.id,
                e1.name as emcee1,
                e2.name as emcee2
            FROM battles b
            JOIN emcees e1 ON b.emcee1_id = e1.id
            JOIN emcees e2 ON b.emcee2_id = e2.id
            ORDER BY b.id DESC
            LIMIT 5
        `;
        return battles;
    } catch (error) {
        console.error('Error fetching first battles:', error);
        return [];
    }
}

async function getBattleData() {
    const [latest, first] = await Promise.all([
        getLatestBattles(),
        getFirstBattles()
    ]);
    
    return {
        latest,
        first
    };
}

module.exports = {
    getBattleData,
    getLatestBattles,
    getFirstBattles
};
