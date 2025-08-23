const express = require('express');
const path = require('path');
const { getBattleData } = require('./debug-data');

const app = express();
const port = 3003;

// Serve static files
app.use(express.static(path.join(__dirname)));

// API endpoint to get battle data
app.get('/api/debug-battles', async (req, res) => {
    try {
        const battleData = await getBattleData();
        res.json(battleData);
    } catch (error) {
        console.error('Error fetching battle data:', error);
        res.status(500).json({ error: 'Failed to fetch battle data' });
    }
});

app.listen(port, () => {
    console.log(`Debug server running on http://localhost:${port}`);
    console.log(`Open http://localhost:${port}/debug-matchups.html to view the debug page`);
});
