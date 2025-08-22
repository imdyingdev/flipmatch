-- Database optimization script for better performance
-- Run this on your PostgreSQL database to improve query speed

-- Indexes for future_battle_votes table
CREATE INDEX IF NOT EXISTS idx_future_battle_votes_emcee_pair 
ON future_battle_votes(emcee1_id, emcee2_id);

CREATE INDEX IF NOT EXISTS idx_future_battle_votes_voter_cookie 
ON future_battle_votes(voter_cookie);

CREATE INDEX IF NOT EXISTS idx_future_battle_votes_created_at 
ON future_battle_votes(created_at);

-- Composite index for vote counting queries
CREATE INDEX IF NOT EXISTS idx_future_battle_votes_emcees_created 
ON future_battle_votes(emcee1_id, emcee2_id, created_at);

-- Indexes for battles table (for NOT EXISTS queries)
CREATE INDEX IF NOT EXISTS idx_battles_emcee_pair 
ON battles(emcee1_id, emcee2_id);

CREATE INDEX IF NOT EXISTS idx_battles_emcee_pair_reverse 
ON battles(emcee2_id, emcee1_id);

-- Index for emcees table
CREATE INDEX IF NOT EXISTS idx_emcees_name 
ON emcees(name);

-- Analyze tables to update statistics
ANALYZE future_battle_votes;
ANALYZE battles;
ANALYZE emcees;

-- Show index usage statistics (optional)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
