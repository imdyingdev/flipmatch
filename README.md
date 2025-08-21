# Future Battles - Voting System

A voting system for future battle matchups where users can vote for battles they want to see happen. The most voted matchups will appear at the top, helping prioritize which battles should be scheduled.

## Features

- **Vote for Future Battles**: Users can vote for matchups they want to see
- **Automatic Ranking**: Matchups are automatically sorted by vote count (most voted first)
- **Duplicate Vote Prevention**: Uses IP address and cookie tracking to prevent multiple votes
- **Real-time Updates**: Vote counts update immediately after voting
- **Responsive Design**: Works on desktop and mobile devices
- **Statistics Dashboard**: Shows total votes, unique voters, and matchup counts

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Vote Tracking**: IP address + HTTP cookies

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Same database as the main voting-app project

### Installation

1. **Install Dependencies**
   ```bash
   cd future-battles
   npm install
   ```

2. **Database Setup**
   - Update the database password in `db.js`
   - Run the SQL schema:
   ```bash
   psql -U postgres -d voting_app -f database.sql
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   The server will run on http://localhost:3002

## Database Schema

### Tables

- **future_matchups**: Stores the matchup information and vote counts
- **future_votes**: Tracks individual votes with IP and cookie data

### Key Features

- Automatic vote count updates via database triggers
- Unique constraint prevents duplicate votes
- Sample data included for testing

## API Endpoints

- `GET /api/future-matchups` - Get all matchups sorted by vote count
- `POST /api/vote-future` - Vote for a matchup
- `POST /api/check-votes` - Check which matchups user has voted for
- `GET /api/stats` - Get voting statistics
- `GET /api/status` - Health check

## Usage

1. Users see a list of future matchups ranked by vote count
2. Each matchup shows candidates, description, and current vote count
3. Users can vote once per matchup (tracked by IP + cookie)
4. After voting, the list automatically reorders by vote count
5. Most voted matchups appear at the top for easy prioritization

## Voting System

The system uses the same dual-tracking method as the reference voting-app:
- **IP Address**: Prevents voting from the same network
- **HTTP Cookie**: Prevents voting from the same browser
- **Unique Constraint**: Database-level prevention of duplicate votes

## Sample Data

The system includes 5 sample matchups:
- Classic Showdown: Emcee A vs Emcee B
- New Generation: Emcee B vs Emcee C  
- Ultimate Face-off: Emcee C vs Emcee A
- Underground Kings: Emcee D vs Emcee E
- Coast vs Coast: Emcee F vs Emcee G

## Customization

To add new matchups, insert into the `future_matchups` table:
```sql
INSERT INTO future_matchups (matchup_id, title, candidate1, candidate2, description) 
VALUES ('fb006', 'Your Title', 'Candidate 1', 'Candidate 2', 'Description');
```
