// Hover Audio Handler for Voting Bars
// Separate file to handle hover sound effects

(function() {
    'use strict';
    
    // Audio for hover effects
    let hoverSound = null;
    let emceeHoverSound = null;
    let fireSound = null; // For vote/fire button clicks
    let audioInitialized = false;

    // Initialize audio
    function initializeAudio() {
        try {
            hoverSound = new Audio('/audio/hover-bar.mp3');
            hoverSound.volume = 0.3; // Set volume to 30%
            hoverSound.preload = 'auto';
            
            emceeHoverSound = new Audio('/audio/hover-char.mp3');
            emceeHoverSound.volume = 0.3; // Set volume to 30%
            emceeHoverSound.preload = 'auto';

            fireSound = new Audio('/audio/fire.mp3');
            fireSound.volume = 0.5; // Set volume to 50%
            fireSound.preload = 'auto';
            
            audioInitialized = true;
            console.log('Hover and fire audio initialized');
        } catch (error) {
            console.log('Audio initialization failed:', error);
        }
    }

    // Play hover sound for bars
    function playHoverSound() {
        if (hoverSound && audioInitialized) {
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

    // Play hover sound for emcee cards
    function playFireSound() {
        if (fireSound && audioInitialized) {
            try {
                fireSound.currentTime = 0; // Reset to start
                fireSound.play().catch(e => {
                    // Ignore autoplay policy errors
                    console.log('Audio play prevented by browser policy');
                });
            } catch (error) {
                console.log('Error playing fire sound:', error);
            }
        }
    }

    // Play hover sound for emcee cards
    function playEmceeHoverSound() {
        if (emceeHoverSound && audioInitialized) {
            try {
                emceeHoverSound.currentTime = 0; // Reset to start
                emceeHoverSound.play().catch(e => {
                    // Ignore autoplay policy errors
                    console.log('Audio play prevented by browser policy');
                });
            } catch (error) {
                console.log('Error playing emcee hover sound:', error);
            }
        }
    }

    // Add event listeners to existing elements
    function addEventListeners() {
        const barContainers = document.querySelectorAll('.bar-container');
        const voteBars = document.querySelectorAll('.vote-bar');
        const emceeCards = document.querySelectorAll('.emcee-card');
        const voteButtons = document.querySelectorAll('.vote-btn');
        
        // Add listeners to bar containers
        barContainers.forEach(container => {
            container.addEventListener('mouseenter', playHoverSound);
        });
        
        // Add listeners to vote bars
        voteBars.forEach(bar => {
            bar.addEventListener('mouseenter', playHoverSound);
        });
        
        // Add listeners to emcee cards
        emceeCards.forEach(card => {
            card.addEventListener('mouseenter', playEmceeHoverSound);
        });

        // Add listeners to vote buttons
        voteButtons.forEach(button => {
            button.addEventListener('click', playFireSound);
        });
        
        console.log(`Added hover sound to ${barContainers.length} bar containers, ${voteBars.length} vote bars, and ${emceeCards.length} emcee cards. Added fire sound to ${voteButtons.length} vote buttons.`);
    }

    // Observer to watch for new bars being added dynamically
    function setupMutationObserver() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node contains elements
                            const barContainers = node.querySelectorAll ? node.querySelectorAll('.bar-container') : [];
                            const voteBars = node.querySelectorAll ? node.querySelectorAll('.vote-bar') : [];
                            const emceeCards = node.querySelectorAll ? node.querySelectorAll('.emcee-card') : [];
                            const voteButtons = node.querySelectorAll ? node.querySelectorAll('.vote-btn') : [];
                            
                            // Add listeners to new bar containers
                            barContainers.forEach(container => {
                                container.addEventListener('mouseenter', playHoverSound);
                            });
                            
                            // Add listeners to new vote bars
                            voteBars.forEach(bar => {
                                bar.addEventListener('mouseenter', playHoverSound);
                            });
                            
                            // Add listeners to new emcee cards
                            emceeCards.forEach(card => {
                                card.addEventListener('mouseenter', playEmceeHoverSound);
                            });

                            // Add listeners to new vote buttons
                            voteButtons.forEach(button => {
                                button.addEventListener('click', playFireSound);
                            });
                            
                            // Check if the node itself is one of these elements
                            if (node.classList && node.classList.contains('bar-container')) {
                                node.addEventListener('mouseenter', playHoverSound);
                            }
                            if (node.classList && node.classList.contains('vote-bar')) {
                                node.addEventListener('mouseenter', playHoverSound);
                            }
                            if (node.classList && node.classList.contains('emcee-card')) {
                                node.addEventListener('mouseenter', playEmceeHoverSound);
                            }
                            if (node.classList && node.classList.contains('vote-btn')) {
                                node.addEventListener('click', playFireSound);
                            }
                        }
                    });
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize everything when DOM is ready
    function initialize() {
        initializeAudio();
        addEventListeners();
        setupMutationObserver();
        
        // Enable audio on first user interaction
        document.addEventListener('click', function enableAudio() {
            if (hoverSound) {
                hoverSound.play().then(() => {
                    hoverSound.pause();
                    hoverSound.currentTime = 0;
                }).catch(() => {});
            }
            if (emceeHoverSound) {
                emceeHoverSound.play().then(() => {
                    emceeHoverSound.pause();
                    emceeHoverSound.currentTime = 0;
                }).catch(() => {});
            }
            if (fireSound) {
                fireSound.play().then(() => {
                    fireSound.pause();
                    fireSound.currentTime = 0;
                }).catch(() => {});
            }
            document.removeEventListener('click', enableAudio);
        }, { once: true });
    }

    // Start when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Also re-initialize when new content is loaded (for dynamic updates)
    window.addEventListener('load', function() {
        setTimeout(addEventListeners, 1000); // Add delay to catch dynamically loaded content
    });

})();
