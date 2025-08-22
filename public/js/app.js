// Application state
let votedMatchups = [];
let matchupsData = [];
let currentPage = 1;
const itemsPerPage = 50;
let justVoted = new Set(); // Track matchups the user just voted on

// Audio for hover effects
let hoverSound = null;

// Initialize audio
function initializeAudio() {
    try {
        hoverSound = new Audio('/audio/hover-bar.mp3');
        hoverSound.volume = 0.3; // Set volume to 30%
        hoverSound.preload = 'auto';
    } catch (error) {
        console.log('Audio initialization failed:', error);
    }
}

// Play hover sound
function playHoverSound() {
    if (hoverSound) {
        try {
            hoverSound.currentTime = 0; // Reset to start
            hoverSound.play().catch(e => {
                // Ignore autoplay policy errors
                console.log('Audio play prevented by browser policy');
            });
        } catch (error) {
            console.log('Error playing hover sound:', error);
        }
    }
}

// Initialize Socket.IO connection
const socket = io();

// Listen for real-time vote updates
socket.on('voteUpdate', function(data) {
    // Update the local matchup data
    const matchup = matchupsData.find(m => m.matchup_id === data.matchupId);
    if (matchup) {
        matchup.vote_count = data.newVoteCount;
        
        // Always re-render to show updated vote count
        renderMatchups();
        loadStats(); // Refresh stats
    }
});

// Load data when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting data loading...');
    
    // Initialize audio
    initializeAudio();
    
    // Load critical data in parallel for faster initial load
    Promise.all([
        loadStats(),
        loadVotedMatchups(),
        loadMatchups()
    ]).then(() => {
        console.log('Critical data loaded, now loading images lazily...');
        // Load images after critical data is ready
        loadTopEmceesLazy();
    }).catch(error => {
        console.error('Error loading critical data:', error);
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        currentPage = 1; // Reset to first page on new search
        if (matchupsData && matchupsData.length > 0) {
            renderMatchups();
        }
    });
    
    // Enable audio on first user interaction
    document.addEventListener('click', function enableAudio() {
        if (hoverSound) {
            hoverSound.play().then(() => {
                hoverSound.pause();
                hoverSound.currentTime = 0;
            }).catch(() => {});
        }
        document.removeEventListener('click', enableAudio);
    }, { once: true });
});

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        document.getElementById('totalVotes').textContent = stats.totalVotes || 0;
        document.getElementById('uniqueVoters').textContent = stats.uniqueVoters || 0;
        document.getElementById('totalMatchups').textContent = stats.totalMatchups || 0;
        document.getElementById('activeToday').textContent = stats.activeToday || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadVotedMatchups() {
    try {
        const response = await fetch('/api/check-votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        votedMatchups = data.votedMatchups || [];
    } catch (error) {
        console.error('Error loading voted matchups:', error);
    }
}

async function loadMatchups() {
    try {
        const matchupsResponse = await fetch('/api/future-matchups');
        matchupsData = await matchupsResponse.json();

        document.getElementById('loading').style.display = 'none';
        renderMatchups();
    } catch (error) {
        console.error('Error loading matchups:', error);
        showError('Failed to load matchups. Please refresh the page.');
        document.getElementById('loading').style.display = 'none';
    }
}

function renderMatchups() {
    const list = document.getElementById('matchupsList');
    list.innerHTML = '';

    // Check if matchupsData is available
    if (!matchupsData || matchupsData.length === 0) {
        return;
    }

    let displayData = [...matchupsData].sort((a, b) => b.vote_count - a.vote_count);

    const searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
    if (searchQuery) {
        const searchParts = searchQuery.split(' vs ');
        if (searchParts.length === 2) {
            const name1 = searchParts[0].trim();
            const name2 = searchParts[1].trim();
            const searchedIndex = displayData.findIndex(m => {
                const c1 = m.candidate1.toLowerCase();
                const c2 = m.candidate2.toLowerCase();
                return (c1 === name1 && c2 === name2) || (c1 === name2 && c2 === name1);
            });

            if (searchedIndex > -1) {
                const [searchedItem] = displayData.splice(searchedIndex, 1);
                displayData.unshift(searchedItem);
            }
        }
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = displayData.slice(startIndex, endIndex);

    const maxVotes = Math.max(...displayData.map(m => m.vote_count), 1);

    paginatedItems.forEach((matchup, index) => {
        const hasVoted = votedMatchups.includes(matchup.matchup_id);
        const votePercentage = (matchup.vote_count / maxVotes) * 100;
        
        // Orange color for all bars
        const color = 'linear-gradient(135deg, #ff6b35, #ff4500)';

        const item = document.createElement('div');
        item.className = 'bar-row';
        item.innerHTML = `
            <div class="matchup-name">${matchup.candidate1} vs ${matchup.candidate2}</div>
            <div class="bar-container">
                <div class="vote-bar" style="width: ${votePercentage}%; background: ${color};">
                    <div class="vote-count">${matchup.vote_count} ${matchup.vote_count === 1 ? 'vote' : 'votes'}</div>
                </div>
            </div>
            <button class="vote-btn ${hasVoted ? 'voted' : ''}" 
                    onclick="voteForMatchup('${matchup.matchup_id}')">
                <i class="fa-solid fa-fire"></i>
            </button>
        `;
        
        list.appendChild(item);
    });

    renderPagination();
}

async function voteForMatchup(matchupId) {
    try {
        // Mark that this user just voted to prevent double UI update
        justVoted.add(matchupId);
        
        const response = await fetch('/api/vote-future', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchupId })
        });

        const data = await response.json();

        if (data.success) {
            if (data.action === 'voted') {
                votedMatchups.push(matchupId);
                showSuccess('Vote recorded! 🔥');
            } else if (data.action === 'unvoted') {
                // Remove from voted matchups
                const index = votedMatchups.indexOf(matchupId);
                if (index > -1) {
                    votedMatchups.splice(index, 1);
                }
                showSuccess('Vote removed');
            }
            
            // Re-render to update visual state immediately
            renderMatchups();
            
            // Refresh stats after vote
            loadStats();
            
            // Clear the justVoted flag after 1 second to allow socket updates
            setTimeout(() => {
                justVoted.delete(matchupId);
            }, 1000);
        } else {
            // Remove from justVoted if vote failed
            justVoted.delete(matchupId);
            showError(data.error || 'Failed to process vote');
        }
    } catch (error) {
        // Remove from justVoted if vote failed
        justVoted.delete(matchupId);
        console.error('Error voting:', error);
        showError('Failed to record vote. Please try again.');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.className = 'error';
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.className = 'success';
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    const pageCount = Math.ceil(matchupsData.length / itemsPerPage);

    if (pageCount <= 1) return;

    const createButton = (text, page) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'pagination-btn';
        if (page === currentPage) button.classList.add('active');
        button.disabled = page === null || page < 1 || page > pageCount;
        button.onclick = () => {
            if (page !== null && page >= 1 && page <= pageCount) {
                currentPage = page;
                renderMatchups();
            }
        };
        return button;
    };

    const createEllipsis = () => {
        const span = document.createElement('span');
        span.textContent = '...';
        span.style.margin = '0 10px';
        span.style.alignSelf = 'center';
        return span;
    };

    paginationContainer.appendChild(createButton('Previous', currentPage - 1));

    const pages = new Set();
    pages.add(1);
    pages.add(pageCount);
    pages.add(currentPage);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < pageCount) pages.add(currentPage + 1);

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    let lastPage = 0;

    sortedPages.forEach(page => {
        if (page > lastPage + 1) {
            paginationContainer.appendChild(createEllipsis());
        }
        paginationContainer.appendChild(createButton(page, page));
        lastPage = page;
    });

    paginationContainer.appendChild(createButton('Next', currentPage + 1));
}

async function loadTopEmceesLazy() {
    try {
        console.log('Loading top emcees lazily...');
        const response = await fetch('/api/top-matchups-images');
        
        if (!response.ok) {
            console.error('API response not ok:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        console.log('Top emcees data received:', data.topMatchups?.length || 0, 'matchups');
        
        if (data.topMatchups && data.topMatchups.length > 0) {
            // First render without images for immediate display
            renderTopEmcees(data.topMatchups, {});
            
            // Then load images lazily
            loadEmceeImagesBatch(data.topMatchups);
        }
    } catch (error) {
        console.error('Error loading top emcees:', error);
    }
}

async function loadEmceeImagesBatch(topMatchups) {
    try {
        // Get unique emcee names
        const emceeNames = new Set();
        topMatchups.forEach(matchup => {
            if (matchup.vote_count > 0) {
                emceeNames.add(matchup.candidate1);
                emceeNames.add(matchup.candidate2);
            }
        });
        
        const namesArray = Array.from(emceeNames).slice(0, 6); // Limit to 6
        if (namesArray.length === 0) return;
        
        console.log('Loading images for:', namesArray);
        
        const response = await fetch(`/api/emcee-image-batch?names=${encodeURIComponent(namesArray.join(','))}`);
        if (response.ok) {
            const images = await response.json();
            console.log('Received images:', Object.keys(images).length);
            
            // Re-render with images
            renderTopEmcees(topMatchups, images);
        }
    } catch (error) {
        console.error('Error loading emcee images:', error);
    }
}

function renderTopEmcees(topMatchups, emceeImages) {
    const section = document.getElementById('topEmceesSection');
    const grid = document.getElementById('emceesGrid');
    
    if (!section || !grid) {
        console.error('Could not find topEmceesSection or emceesGrid elements');
        return;
    }
    
    // Get unique emcees from top matchups
    const uniqueEmcees = new Set();
    topMatchups.forEach(matchup => {
        if (matchup.vote_count > 0) {
            uniqueEmcees.add(matchup.candidate1);
            uniqueEmcees.add(matchup.candidate2);
        }
    });
    
    if (uniqueEmcees.size === 0) {
        section.style.display = 'none';
        return;
    }
    
    grid.innerHTML = '';
    
    // Display up to 6 unique emcees
    Array.from(uniqueEmcees).slice(0, 6).forEach(emceeName => {
        const imageUrl = emceeImages[emceeName];
        const card = document.createElement('div');
        card.className = 'emcee-card';
        
        if (imageUrl) {
            // Show image if available
            card.innerHTML = `
                <div class="emcee-image-section" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;"></div>
                <div class="emcee-name-section">
                    <div class="emcee-name">${emceeName}</div>
                </div>
            `;
        } else {
            // Show placeholder with loading state
            card.innerHTML = `
                <div class="emcee-image-section lottie-placeholder">
                    <div style="color: white; font-size: 12px; text-align: center;">Loading...</div>
                </div>
                <div class="emcee-name-section">
                    <div class="emcee-name">${emceeName}</div>
                </div>
            `;
        }
        
        grid.appendChild(card);
    });
    
    // Always show section if we have emcees
    if (grid.children.length > 0) {
        section.style.display = 'block';
    }
}
