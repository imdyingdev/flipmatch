const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const sql = require('./db');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3002;

// Middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Debug endpoint to check server status
app.get('/api/status', async (req, res) => {
    try {
        await sql`SELECT 1`;
        res.json({
            status: 'ok',
            database_connected: true,
            message: 'Future Battles server is running and connected to PostgreSQL'
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            status: 'error',
            database_connected: false,
            message: 'Database connection failed'
        });
    }
});

// API endpoint to get all emcees
app.get('/api/emcees', async (req, res) => {
    try {
        const emcees = await sql`SELECT id, name FROM emcees ORDER BY name`;
        res.json(emcees);
    } catch (error) {
        console.error('Error fetching emcees:', error);
        res.status(500).json({ error: 'Failed to fetch emcees' });
    }
});

// API endpoint to get all potential future matchups
app.get('/api/future-matchups', async (req, res) => {
    try {
        console.log('Future matchups endpoint called');
        
        // Test basic connection first
        await sql`SELECT 1`;
        console.log('Database connection test passed for future matchups');

        const futureMatchups = await sql`
            WITH EmceeLastBattle AS (
                SELECT emcee_id, MAX(id) as last_battle_id
                FROM (
                    SELECT emcee1_id as emcee_id, id FROM battles
                    UNION ALL
                    SELECT emcee2_id as emcee_id, id FROM battles
                ) as all_emcee_battles
                GROUP BY emcee_id
            ),
            MatchupVotes AS (
                SELECT 
                    emcee1_id, 
                    emcee2_id, 
                    COUNT(*) as vote_count
                FROM future_battle_votes
                GROUP BY emcee1_id, emcee2_id
            )
            SELECT
                e1.name AS candidate1,
                e2.name AS candidate2,
                e1.id || '-' || e2.id AS matchup_id,
                COALESCE(mv.vote_count, 0) as vote_count
            FROM emcees e1
            CROSS JOIN emcees e2
            LEFT JOIN MatchupVotes mv ON (mv.emcee1_id = e1.id AND mv.emcee2_id = e2.id)
            LEFT JOIN EmceeLastBattle elb1 ON e1.id = elb1.emcee_id
            LEFT JOIN EmceeLastBattle elb2 ON e2.id = elb2.emcee_id
            WHERE e1.id < e2.id
            AND NOT EXISTS (
                SELECT 1
                FROM battles b
                WHERE (b.emcee1_id = e1.id AND b.emcee2_id = e2.id) OR (b.emcee1_id = e2.id AND b.emcee2_id = e1.id)
            )
            ORDER BY 
                vote_count DESC, 
                GREATEST(elb1.last_battle_id, elb2.last_battle_id) ASC NULLS FIRST;
        `;

        // Convert vote_count to integers to fix "01" display issue
        const processedMatchups = futureMatchups.map(matchup => ({
            ...matchup,
            vote_count: parseInt(matchup.vote_count, 10) || 0
        }));

        console.log(`Found ${processedMatchups.length} potential future matchups.`);
        res.json(processedMatchups);

    } catch (error) {
        console.error('Error fetching future matchups:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch future matchups', details: error.message });
    }
});

// API endpoint to get voting statistics
app.get('/api/stats', async (req, res) => {
    try {
        console.log('Stats endpoint called');
        
        // Test basic connection first
        await sql`SELECT 1`;
        console.log('Database connection test passed');
        
        const stats = await sql`
            SELECT
                (SELECT COUNT(*) FROM future_battle_votes) AS total_votes,
                (SELECT COUNT(DISTINCT voter_cookie) FROM future_battle_votes) AS unique_voters,
                (SELECT COUNT(DISTINCT (emcee1_id, emcee2_id)) FROM future_battle_votes) AS total_matchups;
        `;

        console.log('Stats query result:', stats[0]);

        const result = {
            totalVotes: parseInt(stats[0].total_votes, 10) || 0,
            uniqueVoters: parseInt(stats[0].unique_voters, 10) || 0,
            totalMatchups: parseInt(stats[0].total_matchups, 10) || 0
        };

        console.log('Sending stats result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching stats:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
});

// API endpoint to check which matchups a user has voted on
app.post('/api/check-votes', async (req, res) => {
    try {
        let voterCookie = req.cookies.voterId;
        if (!voterCookie) {
            return res.json({ votedMatchups: [] });
        }

        const votedMatchups = await sql`
            SELECT emcee1_id, emcee2_id
            FROM future_battle_votes 
            WHERE voter_cookie = ${voterCookie}
        `;

        res.json({
            votedMatchups: votedMatchups.map(v => `${v.emcee1_id}-${v.emcee2_id}`)
        });
    } catch (error) {
        console.error('Error checking votes:', error);
        res.status(500).json({ error: 'Failed to check votes' });
    }
});

// API endpoint to vote for a future matchup
app.post('/api/vote-future', async (req, res) => {
    const { matchupId } = req.body;
    
    if (!matchupId) {
        return res.status(400).json({ error: 'Missing matchup ID' });
    }

    const [emcee1_id, emcee2_id] = matchupId.split('-').map(Number).sort((a, b) => a - b);

    try {
        // Create voter cookie if it doesn't exist
        let voterCookie = req.cookies.voterId;
        if (!voterCookie) {
            voterCookie = crypto.randomUUID();
            res.cookie('voterId', voterCookie, { 
                maxAge: 365 * 24 * 60 * 60 * 1000, 
                httpOnly: true,
                sameSite: 'lax'
            });
        }

        // Check if user has already voted for this matchup
        const existingVote = await sql`
            SELECT * FROM future_battle_votes 
            WHERE emcee1_id = ${emcee1_id} 
            AND emcee2_id = ${emcee2_id}
            AND voter_cookie = ${voterCookie}
        `;

        if (existingVote.length > 0) {
            return res.status(400).json({ error: 'You have already voted for this matchup' });
        }

        // Insert the vote
        await sql`
            INSERT INTO future_battle_votes (emcee1_id, emcee2_id, voter_cookie)
            VALUES (${emcee1_id}, ${emcee2_id}, ${voterCookie})
        `;

        // Get updated vote count for this matchup
        const voteCount = await sql`
            SELECT COUNT(*) as count 
            FROM future_battle_votes 
            WHERE emcee1_id = ${emcee1_id} AND emcee2_id = ${emcee2_id}
        `;

        // Broadcast real-time update to all connected clients
        io.emit('voteUpdate', {
            matchupId: matchupId,
            newVoteCount: parseInt(voteCount[0].count, 10)
        });

        // Return a success message without recalculating all matchups
        res.json({ success: true });
    } catch (error) {
        console.error('Error processing vote:', error);
        res.status(500).json({ error: 'Failed to process vote' });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(port, async () => {
    console.log(`Future Battles server running on port ${port}`);
    try {
        // Test the database connection
        await sql`SELECT 1`;
        console.log('Successfully connected to PostgreSQL database.');
    } catch (error) {
        console.error('Failed to connect to the database on startup:', error);
    }
});
