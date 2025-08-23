require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const sql = require('./db');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { JSDOM } = require('jsdom');
const compression = require('compression');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3002;
// const port = 3002;

// Rate limiting middleware
const voteRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 votes per windowMs
    message: { error: 'Too many votes, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 API requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// IP tracking for additional protection
const ipVoteTracker = new Map();

// Cache for expensive operations
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached data
function getCachedData(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

// Helper function to set cached data
function setCachedData(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// Middleware
app.use(compression()); // Enable gzip compression
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to API routes
app.use('/api/', apiRateLimit);

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

// Configurable threshold for recent battles
const RECENT_BATTLES_THRESHOLD = process.env.RECENT_BATTLES_THRESHOLD || 50;

// API endpoint to get all potential future matchups
app.get('/api/future-matchups', async (req, res) => {
    try {
        console.log('Future matchups endpoint called');
        console.log(`Using recent battles threshold: ${RECENT_BATTLES_THRESHOLD}`);
        
        // Check cache first
        const cachedData = getCachedData('future-matchups');
        if (cachedData) {
            console.log('Returning cached future matchups');
            return res.json(cachedData);
        }
        
        // Optimized query with prioritized ordering for recent emcees
        // Get emcees from first N battles (oldest battles = recent emcees in our context)
        const futureMatchups = await sql`
            WITH recent_emcees AS (
                SELECT DISTINCT emcee_id FROM (
                    SELECT emcee1_id as emcee_id FROM (
                        SELECT emcee1_id FROM battles ORDER BY id ASC LIMIT ${RECENT_BATTLES_THRESHOLD}
                    ) recent1
                    UNION
                    SELECT emcee2_id as emcee_id FROM (
                        SELECT emcee2_id FROM battles ORDER BY id ASC LIMIT ${RECENT_BATTLES_THRESHOLD}
                    ) recent2
                ) all_recent
            )
            SELECT
                e1.name AS candidate1,
                e2.name AS candidate2,
                e1.id || '-' || e2.id AS matchup_id,
                COALESCE(vote_counts.vote_count, 0) as vote_count,
                -- Priority scoring: only both new emcees get highest priority
                CASE 
                    -- Both emcees in recent battles (highest priority - only new vs new)
                    WHEN e1_recent.emcee_id IS NOT NULL AND e2_recent.emcee_id IS NOT NULL THEN 3
                    -- One emcee in recent battles (medium priority - mixed new vs old)  
                    WHEN e1_recent.emcee_id IS NOT NULL OR e2_recent.emcee_id IS NOT NULL THEN 2
                    -- Both emcees NOT in recent battles (lowest priority - old vs old)
                    ELSE 1
                END as priority_score,
                -- Add randomization within same priority level
                RANDOM() as random_order
            FROM emcees e1
            CROSS JOIN emcees e2
            LEFT JOIN (
                SELECT 
                    emcee1_id, 
                    emcee2_id, 
                    COUNT(*) as vote_count
                FROM future_battle_votes
                GROUP BY emcee1_id, emcee2_id
            ) vote_counts ON (vote_counts.emcee1_id = e1.id AND vote_counts.emcee2_id = e2.id)
            LEFT JOIN recent_emcees e1_recent ON e1_recent.emcee_id = e1.id
            LEFT JOIN recent_emcees e2_recent ON e2_recent.emcee_id = e2.id
            WHERE e1.id < e2.id
            AND NOT EXISTS (
                SELECT 1
                FROM battles b
                WHERE (b.emcee1_id = e1.id AND b.emcee2_id = e2.id) OR (b.emcee1_id = e2.id AND b.emcee2_id = e1.id)
            )
            ORDER BY priority_score DESC, vote_count DESC, random_order;
        `;

        // Convert vote_count to integers
        const processedMatchups = futureMatchups.map(matchup => ({
            ...matchup,
            vote_count: parseInt(matchup.vote_count, 10) || 0
        }));

        // Cache the result
        setCachedData('future-matchups', processedMatchups);

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
        
        // Check cache first
        const cachedData = getCachedData('stats');
        if (cachedData) {
            console.log('Returning cached stats');
            return res.json(cachedData);
        }
        
        // Single optimized query
        const stats = await sql`
            SELECT
                COUNT(*) AS total_votes,
                COUNT(DISTINCT voter_cookie) AS unique_voters,
                COUNT(DISTINCT (emcee1_id, emcee2_id)) AS total_matchups,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS active_today
            FROM future_battle_votes;
        `;

        const result = {
            totalVotes: parseInt(stats[0].total_votes, 10) || 0,
            uniqueVoters: parseInt(stats[0].unique_voters, 10) || 0,
            totalMatchups: parseInt(stats[0].total_matchups, 10) || 0,
            activeToday: parseInt(stats[0].active_today, 10) || 0
        };

        // Cache the result for 1 minute (stats change frequently)
        cache.set('stats', { data: result, timestamp: Date.now() });

        console.log('Sending stats result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching stats:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
});

// API endpoint to scrape emcee image from FlipTop
app.get('/api/emcee-image/:name', async (req, res) => {
    try {
        const emceeName = req.params.name.toLowerCase().replace(/\s+/g, '');
        const url = `https://www.fliptop.com.ph/emcees/${emceeName}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(404).json({ error: 'Emcee not found' });
        }
        
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Look for image with class 'emcee-img'
        const emceeImg = document.querySelector('.emcee-img');
        if (emceeImg) {
            const imgSrc = emceeImg.src;
            // Make sure the URL is absolute
            const imageUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.fliptop.com.ph${imgSrc}`;
            res.json({ imageUrl, name: req.params.name });
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    } catch (error) {
        console.error('Error scraping emcee image:', error);
        res.status(500).json({ error: 'Failed to scrape image' });
    }
});

// API endpoint to get top individual emcees by total votes across all matchups
app.get('/api/top-emcees-individual', async (req, res) => {
    try {
        console.log('Top individual emcees endpoint called');
        
        // Get emcees ranked by total votes across all their matchups
        const topEmcees = await sql`
            WITH EmceeVotes AS (
                SELECT 
                    e.name as emcee_name,
                    SUM(COALESCE(mv.vote_count, 0)) as total_votes
                FROM emcees e
                LEFT JOIN (
                    SELECT 
                        emcee1_id, 
                        emcee2_id, 
                        COUNT(*) as vote_count
                    FROM future_battle_votes
                    GROUP BY emcee1_id, emcee2_id
                ) mv ON (mv.emcee1_id = e.id OR mv.emcee2_id = e.id)
                GROUP BY e.id, e.name
                HAVING SUM(COALESCE(mv.vote_count, 0)) > 0
                ORDER BY total_votes DESC
                LIMIT 5
            )
            SELECT * FROM EmceeVotes;
        `;

        console.log('Top individual emcees found:', topEmcees.length);
        topEmcees.forEach(e => console.log(`${e.emcee_name}: ${e.total_votes} total votes`));

        // Scrape images for each top emcee
        const emceeImages = {};
        for (const emcee of topEmcees) {
            const name = emcee.emcee_name;
            try {
                // Try different URL formats for emcee names
                const urlVariants = [
                    name.toLowerCase().replace(/\s+/g, ''),           // "Emcee Name" -> "emceename"
                    name.toLowerCase().replace(/\s+/g, '-'),          // "Emcee Name" -> "emcee-name"
                    name.toLowerCase(),                               // "Emcee Name" -> "emcee name"
                    name.toLowerCase().replace(/\s+/g, '_'),          // "Emcee Name" -> "emcee_name"
                ];

                let imageFound = false;
                for (const variant of urlVariants) {
                    if (imageFound) break;
                    
                    const url = `https://www.fliptop.com.ph/emcees/${variant}`;
                    console.log(`Trying ${name} from ${url}`);
                    
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            const html = await response.text();
                            const dom = new JSDOM(html);
                            const document = dom.window.document;
                            
                            const emceeImg = document.querySelector('.emcee-img');
                            if (emceeImg) {
                                const imgSrc = emceeImg.src;
                                const imageUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.fliptop.com.ph${imgSrc}`;
                                emceeImages[name] = imageUrl;
                                console.log(`Found image for ${name}: ${imageUrl}`);
                                imageFound = true;
                            }
                        }
                    } catch (fetchError) {
                        console.log(`Failed to fetch ${url}: ${fetchError.message}`);
                    }
                }
                
                if (!imageFound) {
                    console.log(`No image found for ${name} after trying all variants`);
                }
            } catch (error) {
                console.error(`Error scraping image for ${name}:`, error);
            }
        }

        console.log('Final emcee images:', emceeImages);

        const result = {
            topEmcees: topEmcees.map(e => ({
                name: e.emcee_name,
                totalVotes: parseInt(e.total_votes, 10) || 0
            })),
            emceeImages
        };

        console.log('Sending result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching top individual emcees:', error);
        res.status(500).json({ error: 'Failed to fetch top individual emcees' });
    }
});

// API endpoint to get top matchups with images (optimized with caching)
app.get('/api/top-matchups-images', async (req, res) => {
    try {
        console.log('Top matchups images endpoint called');
        
        // Check cache first
        const cachedData = getCachedData('top-matchups-images');
        if (cachedData) {
            console.log('Returning cached top matchups with images');
            return res.json(cachedData);
        }
        
        // Get top 6 matchups (increased for better variety)
        const topMatchups = await sql`
            SELECT
                e1.name AS candidate1,
                e2.name AS candidate2,
                COALESCE(vote_counts.vote_count, 0) as vote_count
            FROM emcees e1
            CROSS JOIN emcees e2
            LEFT JOIN (
                SELECT 
                    emcee1_id, 
                    emcee2_id, 
                    COUNT(*) as vote_count
                FROM future_battle_votes
                GROUP BY emcee1_id, emcee2_id
            ) vote_counts ON (vote_counts.emcee1_id = e1.id AND vote_counts.emcee2_id = e2.id)
            WHERE e1.id < e2.id
            AND NOT EXISTS (
                SELECT 1
                FROM battles b
                WHERE (b.emcee1_id = e1.id AND b.emcee2_id = e2.id) OR (b.emcee1_id = e2.id AND b.emcee2_id = e1.id)
            )
            AND vote_counts.vote_count > 0
            ORDER BY vote_count DESC
            LIMIT 6;
        `;

        console.log('Top matchups found:', topMatchups.length);

        // Get unique emcee names from top matchups
        const emceeNames = new Set();
        topMatchups.forEach(matchup => {
            if (matchup.vote_count > 0) {
                emceeNames.add(matchup.candidate1);
                emceeNames.add(matchup.candidate2);
            }
        });

        console.log('Unique emcee names to scrape:', Array.from(emceeNames));

        // Return data immediately without images for faster response
        // Images will be loaded lazily by the client
        const result = {
            topMatchups: topMatchups.map(m => ({
                ...m,
                vote_count: parseInt(m.vote_count, 10) || 0
            })),
            emceeImages: {} // Empty for now, will be populated by separate endpoint
        };

        // Cache the result for longer since images don't change often
        setCachedData('top-matchups-images', result);

        console.log('Sending result without images for faster response');
        res.json(result);
    } catch (error) {
        console.error('Error fetching top matchups with images:', error);
        res.status(500).json({ error: 'Failed to fetch top matchups with images' });
    }
});

// New endpoint for lazy loading individual emcee images
app.get('/api/emcee-image-batch', async (req, res) => {
    try {
        const { names } = req.query;
        if (!names) {
            return res.status(400).json({ error: 'Names parameter required' });
        }

        const emceeNames = names.split(',').slice(0, 10); // Limit to 10 names max
        const cacheKey = `images-${emceeNames.sort().join('-')}`;
        
        // Check cache first
        const cachedImages = getCachedData(cacheKey);
        if (cachedImages) {
            return res.json(cachedImages);
        }

        const emceeImages = {};
        
        // Process images in parallel with limited concurrency
        const promises = emceeNames.map(async (name) => {
            const trimmedName = name.trim();
            if (!trimmedName) return;
            
            try {
                const urlVariants = [
                    trimmedName.toLowerCase().replace(/\s+/g, ''),
                    trimmedName.toLowerCase().replace(/\s+/g, '-')
                ];

                for (const variant of urlVariants) {
                    try {
                        const url = `https://www.fliptop.com.ph/emcees/${variant}`;
                        const response = await fetch(url, { timeout: 3000 }); // 3 second timeout
                        
                        if (response.ok) {
                            const html = await response.text();
                            const dom = new JSDOM(html);
                            const emceeImg = dom.window.document.querySelector('.emcee-img');
                            
                            if (emceeImg) {
                                const imgSrc = emceeImg.src;
                                const imageUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.fliptop.com.ph${imgSrc}`;
                                emceeImages[trimmedName] = imageUrl;
                                break;
                            }
                        }
                    } catch (fetchError) {
                        console.log(`Failed to fetch image for ${trimmedName}: ${fetchError.message}`);
                    }
                }
            } catch (error) {
                console.error(`Error processing ${trimmedName}:`, error.message);
            }
        });

        // Wait for all promises with timeout
        await Promise.allSettled(promises);

        // Cache images for longer duration
        cache.set(cacheKey, { data: emceeImages, timestamp: Date.now() });

        res.json(emceeImages);
    } catch (error) {
        console.error('Error in batch image loading:', error);
        res.status(500).json({ error: 'Failed to load images' });
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

// API endpoint to vote for a future matchup (toggle vote)
app.post('/api/vote-future', voteRateLimit, async (req, res) => {
    // CSRF protection - check for custom header
    if (!req.headers['x-requested-with']) {
        return res.status(403).json({ error: 'Invalid request' });
    }
    
    // Additional IP-based protection
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const ipData = ipVoteTracker.get(clientIP) || { votes: [], lastVote: 0 };
    
    // Clean old votes (older than 5 minutes)
    ipData.votes = ipData.votes.filter(voteTime => now - voteTime < 5 * 60 * 1000);
    
    // Check if IP has voted too recently (less than 1 second ago for unvote)
    if (now - ipData.lastVote < 1000) {
        return res.status(429).json({ error: 'Please wait before voting again' });
    }
    
    // Check if IP has too many votes in the last 5 minutes
    if (ipData.votes.length >= 15) {
        return res.status(429).json({ error: 'Too many votes from this IP' });
    }
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

        let action = '';
        
        if (existingVote.length > 0) {
            // User has voted - remove the vote (unvote)
            await sql`
                DELETE FROM future_battle_votes 
                WHERE emcee1_id = ${emcee1_id} 
                AND emcee2_id = ${emcee2_id}
                AND voter_cookie = ${voterCookie}
            `;
            action = 'unvoted';
        } else {
            // User hasn't voted - add the vote
            await sql`
                INSERT INTO future_battle_votes (emcee1_id, emcee2_id, voter_cookie)
                VALUES (${emcee1_id}, ${emcee2_id}, ${voterCookie})
            `;
            action = 'voted';
        }
        
        // Update IP tracking
        ipData.votes.push(now);
        ipData.lastVote = now;
        ipVoteTracker.set(clientIP, ipData);

        // Get updated vote count for this matchup
        const voteCount = await sql`
            SELECT COUNT(*) as count 
            FROM future_battle_votes 
            WHERE emcee1_id = ${emcee1_id} AND emcee2_id = ${emcee2_id}
        `;

        // Invalidate relevant caches when votes change
        cache.delete('future-matchups');
        cache.delete('stats');
        cache.delete('top-matchups-images');
        
        // Broadcast real-time update to all connected clients
        io.emit('voteUpdate', {
            matchupId: matchupId,
            newVoteCount: parseInt(voteCount[0].count, 10)
        });

        // Debug: Check active today count after vote
        const activeToday = await sql`
            SELECT COUNT(*) as count 
            FROM future_battle_votes 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        `;
        console.log(`After ${action}: Active today count = ${activeToday[0].count}`);

        // Return success with action type
        res.json({ success: true, action: action });
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
