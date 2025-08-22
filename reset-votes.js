const sql = require('./db');

async function resetVotes() {
    try {
        console.log('Starting vote reset process...');
        
        // First, let's check current vote count
        const currentStats = await sql`
            SELECT COUNT(*) as total_votes FROM future_battle_votes
        `;
        console.log(`Current votes in database: ${currentStats[0].total_votes}`);
        
        // Delete all existing votes
        const deleteResult = await sql`
            DELETE FROM future_battle_votes
        `;
        console.log('All votes deleted successfully');
        
        // Verify the table structure has created_at column
        const tableInfo = await sql`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'future_battle_votes' 
            AND column_name = 'created_at'
        `;
        
        if (tableInfo.length > 0) {
            console.log('✅ created_at column exists:', tableInfo[0]);
        } else {
            console.log('❌ created_at column missing, adding it...');
            await sql`
                ALTER TABLE future_battle_votes 
                ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            `;
            console.log('✅ created_at column added successfully');
        }
        
        // Verify reset
        const finalStats = await sql`
            SELECT 
                COUNT(*) as total_votes,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as active_today
            FROM future_battle_votes
        `;
        
        console.log('Final verification:');
        console.log(`- Total votes: ${finalStats[0].total_votes}`);
        console.log(`- Active today: ${finalStats[0].active_today}`);
        console.log('✅ Vote reset completed successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('Error during vote reset:', error);
        process.exit(1);
    }
}

resetVotes();
