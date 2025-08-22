// Lottie Fire Enhancement for Top 1 Position
// This script extends the existing voting app to add Lottie animations

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
                    // Wait a bit for DOM to settle, then enhance
                    setTimeout(enhanceTopPositionWithLottie, 50);
                }
            });
        });

        observer.observe(matchupsList, {
            childList: true,
            subtree: true
        });

        // Initial enhancement
        setTimeout(enhanceTopPositionWithLottie, 100);
    }

    function enhanceTopPositionWithLottie() {
        const matchupsList = document.getElementById('matchupsList');
        if (!matchupsList) return;

        const firstBarRow = matchupsList.querySelector('.bar-row');
        if (!firstBarRow) return;

        const voteBtn = firstBarRow.querySelector('.vote-btn');
        const voteBar = firstBarRow.querySelector('.vote-bar');
        if (!voteBtn || !voteBar) return;

        // Add top-position class to button and top-bar class to bar
        voteBtn.classList.add('top-position');
        voteBar.classList.add('top-bar');

        // Check if already enhanced
        if (voteBtn.querySelector('.lottie-fire')) {
            updateFireDisplay(voteBtn);
            return;
        }

        // Create Lottie element
        const lottieElement = document.createElement('dotlottie-wc');
        lottieElement.className = 'lottie-fire';
        lottieElement.setAttribute('src', 'https://lottie.host/df43af21-700d-411b-8cd1-33cf186c9006/FbmRC2jFTB.lottie');
        lottieElement.setAttribute('speed', '1');
        lottieElement.setAttribute('autoplay', '');
        lottieElement.setAttribute('loop', '');

        // Add Lottie element to button
        voteBtn.appendChild(lottieElement);

        // Update display logic based on voted state
        updateFireDisplay(voteBtn);
    }

    function updateFireDisplay(voteBtn) {
        const fireIcon = voteBtn.querySelector('.fa-fire');
        const lottieElement = voteBtn.querySelector('.lottie-fire');
        
        if (!fireIcon || !lottieElement) return;

        if (voteBtn.classList.contains('voted')) {
            // Show Lottie, hide regular fire
            fireIcon.style.display = 'none';
            lottieElement.style.display = 'block';
        } else {
            // Show gray regular fire, hide Lottie
            fireIcon.style.display = 'inline-block';
            fireIcon.style.color = '#ccc';
            lottieElement.style.display = 'none';
        }
    }

    // Listen for socket updates if available
    if (typeof io !== 'undefined') {
        const socket = io();
        socket.on('voteUpdate', function() {
            setTimeout(enhanceTopPositionWithLottie, 100);
        });
    }
})();
