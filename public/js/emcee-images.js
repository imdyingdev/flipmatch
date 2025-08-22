// Emcee Images Functionality
// Loads and displays emcee images from FlipTop for top voted matchups

async function loadTopEmcees() {
    try {
        console.log('Loading top individual emcees...');
        const response = await fetch('/api/top-emcees-individual');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            console.error('API response not ok:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        console.log('Top individual emcees data:', data);
        
        if (data.topEmcees && data.emceeImages) {
            console.log('Rendering top emcees with data:', data.topEmcees.length, 'emcees and', Object.keys(data.emceeImages).length, 'images');
            renderTopEmcees(data.topEmcees, data.emceeImages);
        } else {
            console.log('No data to render - topEmcees:', data.topEmcees, 'emceeImages:', data.emceeImages);
        }
    } catch (error) {
        console.error('Error loading top emcees:', error);
    }
}

function renderTopEmcees(topEmcees, emceeImages) {
    console.log('renderTopEmcees called with:', topEmcees, emceeImages);
    const section = document.getElementById('topEmceesSection');
    const grid = document.getElementById('emceesGrid');
    
    if (!section || !grid) {
        console.error('Could not find topEmceesSection or emceesGrid elements');
        return;
    }
    
    console.log('Top emcees to display:', topEmcees);
    
    if (topEmcees.length === 0) {
        console.log('No emcees with votes, hiding section');
        section.style.display = 'none';
        return;
    }
    
    grid.innerHTML = '';
    
    // Display each emcee as an individual card
    topEmcees.forEach((emcee, index) => {
        console.log(`Processing emcee ${index + 1}:`, emcee.name, 'total votes:', emcee.totalVotes);
        
        const imageUrl = emceeImages[emcee.name];
        console.log(`Emcee ${emcee.name} has image:`, imageUrl);
        
        const card = document.createElement('div');
        card.className = 'emcee-card';
        
        if (imageUrl) {
            card.innerHTML = `
                <div class="emcee-image-section" style="background-image: url('${imageUrl}')"></div>
                <div class="emcee-name-section">
                    <div class="emcee-name">${emcee.name}</div>
                    <div class="emcee-votes">${emcee.totalVotes} votes</div>
                </div>
            `;
            card.dataset.fallback = `
                <div class="emcee-image-section lottie-placeholder">
                    <dotlottie-wc src="https://lottie.host/70a13ccd-5038-4071-901b-010d9d52e89c/blpgp0iCEZ.lottie" 
                                  style="width: 60px; height: 60px;" speed="1" autoplay loop></dotlottie-wc>
                </div>
                <div class="emcee-name-section">
                    <div class="emcee-name">${emcee.name}</div>
                    <div class="emcee-votes">${emcee.totalVotes} votes</div>
                </div>
            `;
            
            // Add error handler for image loading
            const img = new Image();
            img.onload = function() {
                console.log(`Image loaded successfully for ${emcee.name}`);
            };
            img.onerror = function() {
                console.error(`Failed to load image for ${emcee.name}, using fallback`);
                card.innerHTML = card.dataset.fallback;
            };
            img.src = imageUrl;
        } else {
            card.innerHTML = `
                <div class="emcee-image-section lottie-placeholder">
                    <dotlottie-wc src="https://lottie.host/70a13ccd-5038-4071-901b-010d9d52e89c/blpgp0iCEZ.lottie" 
                                  style="width: 60px; height: 60px;" speed="1" autoplay loop></dotlottie-wc>
                </div>
                <div class="emcee-name-section">
                    <div class="emcee-name">${emcee.name}</div>
                    <div class="emcee-votes">${emcee.totalVotes} votes</div>
                </div>
            `;
        }
        
        grid.appendChild(card);
    });
    
    console.log('Added', topEmcees.length, 'individual emcee cards to grid');
    
    // Show section if we have emcees
    if (topEmcees.length > 0) {
        section.style.display = 'block';
        console.log('Showing emcees section');
    } else {
        console.log('No emcees to show, hiding section');
        section.style.display = 'none';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Emcee images module loaded');
    
    // Add a small delay to ensure other data loads first
    setTimeout(() => {
        console.log('Loading top emcees after delay...');
        loadTopEmcees();
    }, 1500);
});
