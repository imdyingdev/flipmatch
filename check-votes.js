const sql = require('./db');

async function checkVotes() {
    try {
        console.log('=== VOTE DATABASE CHECK ===');
        console.log('Current time:', new Date().toISOString());
        console.log('');
        
        // Check all votes with timestamps
        const allVotes = await sql`
            SELECT 
                id,
                emcee1_id,
                emcee2_id,
                voter_cookie,
                created_at,
                EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_ago
            FROM future_battle_votes 
            ORDER BY created_at DESC
        `;
        
        console.log(`Total votes in database: ${allVotes.length}`);
        console.log('');
        
        if (allVotes.length > 0) {
            console.log('Recent votes:');
            allVotes.slice(0, 10).forEach((vote, index) => {
                console.log(`${index + 1}. Vote ID: ${vote.id}`);
                console.log(`   Matchup: ${vote.emcee1_id} vs ${vote.emcee2_id}`);
                console.log(`   Created: ${vote.created_at}`);
                console.log(`   Hours ago: ${Math.round(vote.hours_ago * 100) / 100}`);
                console.log('');
            });
        }
        
        // Check votes in last 24 hours
        const last24h = await sql`
            SELECT 
                COUNT(*) as count,
                MIN(created_at) as oldest,
                MAX(created_at) as newest
            FROM future_battle_votes 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        `;
        
        console.log('=== LAST 24 HOURS ANALYSIS ===');
        console.log(`Votes in last 24h: ${last24h[0].count}`);
        if (last24h[0].count > 0) {
            console.log(`Oldest vote: ${last24h[0].oldest}`);
            console.log(`Newest vote: ${last24h[0].newest}`);
        }
        console.log('');
        
        // Test the exact query used in stats endpoint
        const statsQuery = await sql`
            SELECT
                (SELECT COUNT(*) FROM future_battle_votes) AS total_votes,
                (SELECT COUNT(DISTINCT voter_cookie) FROM future_battle_votes) AS unique_voters,
                (SELECT COUNT(DISTINCT (emcee1_id, emcee2_id)) FROM future_battle_votes) AS total_matchups,
                (SELECT COUNT(*) FROM future_battle_votes WHERE created_at >= NOW() - INTERVAL '24 hours') AS active_today;
        `;
        
        console.log('=== STATS ENDPOINT QUERY RESULT ===');
        console.log('Total votes:', statsQuery[0].total_votes);
        console.log('Unique voters:', statsQuery[0].unique_voters);
        console.log('Total matchups:', statsQuery[0].total_matchups);
        console.log('Active today:', statsQuery[0].active_today);
        console.log('');
        
        // Check if there are any timezone issues
        console.log('=== TIMEZONE CHECK ===');
        const timeCheck = await sql`
            SELECT 
                NOW() as server_now,
                NOW() - INTERVAL '24 hours' as cutoff_time,
                CURRENT_TIMESTAMP as current_timestamp
        `;
        
        console.log('Server NOW():', timeCheck[0].server_now);
        console.log('24h cutoff:', timeCheck[0].cutoff_time);
        console.log('Current timestamp:', timeCheck[0].current_timestamp);
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking votes:', error);
        process.exit(1);
    }
}

checkVotes();
