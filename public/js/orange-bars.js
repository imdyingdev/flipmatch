// Orange Bars Enhancement
// This script replaces random colored bars with consistent orange bars

(function() {
    let observer;
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        startObserving();
    });

    function startObserving() {
        const matchupsList = document.getElementById('matchupsList');
        if (!matchupsList) {
            setTimeout(startObserving, 100);
            return;
        }

        // Use MutationObserver to watch for changes in the matchups list
        observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Wait a bit for DOM to settle, then apply orange colors
                    setTimeout(applyOrangeBars, 50);
                }
            });
        });

        observer.observe(matchupsList, {
            childList: true,
            subtree: true
        });

        // Initial application
        setTimeout(applyOrangeBars, 100);
    }

    function applyOrangeBars() {
        const voteBars = document.querySelectorAll('.vote-bar');
        
        voteBars.forEach(function(bar) {
            // Replace any existing background with orange gradient
            bar.style.background = 'linear-gradient(135deg, #ff6b35, #ff4500)';
        });
    }

    // Listen for socket updates if available
    if (typeof io !== 'undefined') {
        const socket = io();
        socket.on('voteUpdate', function() {
            setTimeout(applyOrangeBars, 100);
        });
    }
})();
