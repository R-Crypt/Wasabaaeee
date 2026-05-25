/* app.js - wasabaaeee 3k followers celebratory website logic */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // State Management
    // ==========================================================================
    const DEFAULT_START_COUNT = 2968;
    
    let state = {
        followerCount: parseInt(localStorage.getItem('wasabaaeee_follower_count')) || DEFAULT_START_COUNT,
        isCelebrating: localStorage.getItem('wasabaaeee_is_celebrating') === 'true'
    };

    // DOM Elements
    const elements = {
        followerCountText: document.getElementById('follower-count'),
        progressFill: document.getElementById('progress-fill'),
        progressPercentage: document.getElementById('progress-percentage'),
        trackerMessage: document.getElementById('tracker-message'),
        floatingLulu: document.getElementById('floating-lulu'),
        meowAudio: document.getElementById('meow-audio'),
        floatingContainer: document.getElementById('floating-container'),
        magicWandBtn: document.getElementById('magic-wand-btn'),
        magicModal: document.getElementById('magic-modal'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        followerInput: document.getElementById('follower-input'),
        setCountBtn: document.getElementById('set-count-btn'),
        addFollowerBtn: document.getElementById('add-follower-btn'),
        triggerCelebrationBtn: document.getElementById('trigger-celebration-btn'),
        resetSimBtn: document.getElementById('reset-sim-btn'),
        celebrationScreen: document.getElementById('celebration-screen'),
        closeCelebrationBtn: document.getElementById('close-celebration-btn'),
        confettiCanvas: document.getElementById('confetti-canvas'),
        targetMilestone: document.querySelector('.target-milestone'),
        timelineTitle: document.querySelector('#milestones-timeline .section-title'),
        celebrationTitle: document.querySelector('.celebration-title'),
        celebrationStats: document.querySelector('.celebration-stats span')
    };

    const RAPIDAPI_KEY = '4640ac7d74msh48804ce34c21c43p12a18cjsnd1c90d2ddba3';
    const INSTAGRAM_USERNAME = 'wasabaaeee';

    // Helper functions for dynamic milestones
    function getMilestoneTarget(count) {
        if (count < 3000) {
            return 3000;
        }
        const lastCelebrated = parseInt(localStorage.getItem('wasabaaeee_last_celebrated')) || 0;
        const currentMultiple = Math.floor(count / 1000) * 1000;
        if (currentMultiple > lastCelebrated) {
            return currentMultiple;
        } else {
            return currentMultiple + 1000;
        }
    }

    function formatMilestoneK(milestone) {
        return `${milestone / 1000}K`;
    }

    // ==========================================================================
    // Initialization
    // ==========================================================================
    initApp();

    function initApp() {
        setupAudioUnlock();
        updateUI();
        initFloatingElements();
        initCurtainInteractions();
        initControlPanel();
        startLiveTracker();
    }

    function setupAudioUnlock() {
        const unlock = () => {
            if (elements.meowAudio) {
                // Play a brief silent cycle to unlock the element for iOS Safari
                elements.meowAudio.play().then(() => {
                    elements.meowAudio.pause();
                    elements.meowAudio.currentTime = 0;
                }).catch(e => console.log("[Audio] Unlock failed/deferred:", e));
            }
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
    }

    function initCurtainInteractions() {
        const container = document.querySelector('.curtain-container');
        const curtains = document.getElementById('curtains');
        if (!container || !curtains) return;

        function openCurtains() {
            curtains.classList.add('open');
            container.classList.add('curtains-locked');
        }

        container.addEventListener('mouseenter', openCurtains);
        container.addEventListener('click', openCurtains);
    }

    // ==========================================================================
    // Follower Tracker & Simulation Logic
    // ==========================================================================
    function updateUI() {
        const currentTarget = getMilestoneTarget(state.followerCount);
        const previousMilestone = currentTarget - 1000;

        // Update live follower text with commas
        elements.followerCountText.textContent = state.followerCount.toLocaleString();
        
        // Calculate progress percentage relative to the current 1K milestone window
        const progress = Math.min(Math.max(((state.followerCount - previousMilestone) / (currentTarget - previousMilestone)) * 100, 0), 100);
        const displayPercent = progress.toFixed(1);
        
        elements.progressFill.style.width = `${progress}%`;
        elements.progressPercentage.textContent = `${displayPercent}%`;

        // Update target milestone display
        if (elements.targetMilestone) {
            elements.targetMilestone.textContent = `/ ${currentTarget.toLocaleString()}`;
        }

        // Update tracker note message
        if (elements.trackerMessage) {
            if (progress >= 90) {
                elements.trackerMessage.textContent = `Almost at ${formatMilestoneK(currentTarget)}!!!`;
            } else if (progress >= 50) {
                elements.trackerMessage.textContent = `More than halfway to ${formatMilestoneK(currentTarget)}! 🚀`;
            } else {
                elements.trackerMessage.textContent = `On the road to ${formatMilestoneK(currentTarget)}! 🌻`;
            }
        }

        // Update document and section titles
        document.title = `wasabaaeee | Road to ${formatMilestoneK(currentTarget)} Followers ✨`;
        if (elements.timelineTitle) {
            elements.timelineTitle.textContent = `Road to ${formatMilestoneK(currentTarget)}`;
        }
        
        // Save current count
        localStorage.setItem('wasabaaeee_follower_count', state.followerCount);

        // Control Panel input sync
        if (elements.followerInput) {
            elements.followerInput.value = state.followerCount;
            elements.followerInput.max = currentTarget + 1000;
        }

        if (elements.triggerCelebrationBtn) {
            elements.triggerCelebrationBtn.textContent = `🎉 ${formatMilestoneK(currentTarget)} Celebration`;
        }

        // Check for milestone
        if (state.followerCount >= currentTarget && !state.isCelebrating) {
            localStorage.setItem('wasabaaeee_last_celebrated', currentTarget);
            triggerCelebration(currentTarget);
            // Re-update UI to reflect the next milestone target and reset progress bar
            updateUI();
        }
    }

    function findFollowersField(obj) {
        if (!obj || typeof obj !== 'object') return null;
        
        // Check direct keys
        const keys = ['follower_count', 'followers_count', 'followers', 'followerCount', 'followersCount'];
        for (let key of keys) {
            if (typeof obj[key] === 'number') return obj[key];
            if (typeof obj[key] === 'string' && !isNaN(obj[key])) return parseInt(obj[key]);
        }
        
        // Recursive search
        for (let key in obj) {
            if (typeof obj[key] === 'object') {
                const found = findFollowersField(obj[key]);
                if (found !== null) return found;
            }
        }
        return null;
    }

    let simulationInterval = null;

    function startClientSideSimulation() {
        if (simulationInterval) return;
        console.log("[Live Tracker] Starting client-side simulation fallback.");
        
        simulationInterval = setInterval(() => {
            const currentTarget = getMilestoneTarget(state.followerCount);
            if (state.followerCount < currentTarget) {
                // 35% chance to increment every 60s
                if (Math.random() < 0.35) {
                    state.followerCount++;
                    updateUI();
                    console.log(`[Live Tracker] Simulated count incremented to: ${state.followerCount}`);
                }
            }
        }, 60000);
    }

    function stopClientSideSimulation() {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
    }

    async function fetchFollowerCountFromRapidAPI() {
        const host = 'instagram-scraper-api2.p.rapidapi.com';
        const url = `https://${host}/user/info?username=${INSTAGRAM_USERNAME}`;
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': host
            }
        };

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            
            let count = null;
            if (data && data.data && data.data.user && typeof data.data.user.edge_followed_by.count === 'number') {
                count = data.data.user.edge_followed_by.count;
            } else {
                count = findFollowersField(data);
            }
            
            if (count !== null && count >= 2000 && count <= 1000000) {
                console.log(`[Live Tracker] Direct RapidAPI count: ${count}`);
                return count;
            }
        } catch (e) {
            console.warn(`[Live Tracker] Direct RapidAPI fetch failed: ${e.message}`);
        }
        return null;
    }

    async function fetchFollowerCount() {
        const url = '/api/followers';

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            // Extract follower count
            let count = null;
            if (data.result && data.result.edge_followed_by && typeof data.result.edge_followed_by.count === 'number') {
                count = data.result.edge_followed_by.count;
            } else {
                count = findFollowersField(data);
            }

            if (count !== null && count >= 2000 && count <= 1000000) {
                // Stop local simulation if server is responding
                stopClientSideSimulation();

                const mode = data.mode || 'unknown';
                console.log(`[Live Tracker] Server count: ${count} (mode: ${mode})`);

                // Only update UI if the count actually changed
                if (count !== state.followerCount) {
                    state.followerCount = count;
                    updateUI();
                }
            } else {
                throw new Error('Could not parse follower count.');
            }
        } catch (error) {
            console.warn(`[Live Tracker] Server API fetch failed: ${error.message}. Trying direct RapidAPI...`);
            
            // Try direct RapidAPI query
            const directCount = await fetchFollowerCountFromRapidAPI();
            if (directCount !== null) {
                stopClientSideSimulation();
                if (directCount !== state.followerCount) {
                    state.followerCount = directCount;
                    updateUI();
                }
            } else {
                console.warn("[Live Tracker] Direct RapidAPI failed. Falling back to local simulation.");
                startClientSideSimulation();
            }
        }
    }

    async function startLiveTracker() {
        // Fetch immediately on load
        await fetchFollowerCount();

        // Poll every 60 seconds — only the real Instagram count updates the display
        setInterval(fetchFollowerCount, 60000);
    }

    // ==========================================================================
    // Audio
    // ==========================================================================
    function playRealMeow() {
        if (elements.meowAudio) {
            elements.meowAudio.currentTime = 0;
            elements.meowAudio.play().catch(e => {
                console.warn('Audio play blocked by browser autoplay policy:', e);
            });
        }
    }

    // ==========================================================================
    // Floating Lulu — click to meow
    // ==========================================================================
    function initFloatingLulu() {
        const lulu = elements.floatingLulu;
        if (!lulu) return;

        lulu.addEventListener('click', () => {
            // Play the meow sound
            playRealMeow();

            // Trigger the bounce animation
            lulu.classList.remove('meow-bounce');
            // Force reflow so re-adding the class re-triggers the animation
            void lulu.offsetWidth;
            lulu.classList.add('meow-bounce');

            // Remove class after animation finishes so it can be re-triggered
            setTimeout(() => lulu.classList.remove('meow-bounce'), 450);

            // Spawn some hearts and sparkles from Lulu's position
            for (let i = 0; i < 5; i++) {
                setTimeout(() => spawnFloatingItem('❤️'), i * 70);
                setTimeout(() => spawnFloatingItem('✨'), i * 90);
            }
        });
    }

    // ==========================================================================
    // Floating Background Elements Spawner
    // ==========================================================================
    function initFloatingElements() {
        const floaters = ['🌻', '🍓', '🍣', '✨', '💛', '🍭', '☀️', '🐱', '🐤', '🐣', '🐥'];
        
        // Spawn initial background elements at random offsets
        for (let i = 0; i < 15; i++) {
            const item = floaters[Math.floor(Math.random() * floaters.length)];
            const delay = Math.random() * -15;
            spawnFloatingItem(item, delay);
        }
        // Seed a couple of Lulus right away
        spawnLuluFloat(-Math.random() * 10);
        spawnLuluFloat(-Math.random() * 8);

        // Periodically spawn new emoji floaters
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                const item = floaters[Math.floor(Math.random() * floaters.length)];
                spawnFloatingItem(item);
            }
        }, 3000);

        // Spawn Lulu every ~20 seconds so she appears occasionally
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                spawnLuluFloat();
            }
        }, 20000);
    }

    // Spawn Lulu as a floating image particle (same mechanic as emoji floaters)
    function spawnLuluFloat(delay = 0) {
        const img = document.createElement('img');
        img.src = 'assets/lulu_float.png';
        img.className = 'floating-item lulu-float';
        img.alt = 'Lulu';
        img.title = 'Click Lulu! 🐾';

        // Random horizontal position
        img.style.left = `${Math.random() * 85}vw`;

        // Random scale (0.4 – 0.85) — a bit smaller than original so she fits with emojis
        const scale = 0.4 + Math.random() * 0.45;
        img.style.transform = `scale(${scale})`;

        // Random animation duration (12 – 22 s)
        const duration = 12 + Math.random() * 10;
        img.style.animationDuration = `${duration}s`;

        if (delay !== 0) {
            img.style.animationDelay = `${delay}s`;
        }

        // Touch/Click = meow + hearts
        const handleLuluTap = (e) => {
            e.preventDefault();
            e.stopPropagation();
            playRealMeow();
            for (let i = 0; i < 4; i++) {
                setTimeout(() => spawnFloatingItem('❤️'), i * 80);
                setTimeout(() => spawnFloatingItem('✨'), i * 100);
            }
        };

        img.addEventListener('click', handleLuluTap);
        img.addEventListener('touchstart', handleLuluTap, { passive: false });

        elements.floatingContainer.appendChild(img);

        // Clean up after animation
        setTimeout(() => img.remove(), (duration + Math.max(0, delay)) * 1000);
    }

    function spawnFloatingItem(emoji, delay = 0) {
        const floater = document.createElement('div');
        floater.className = 'floating-item';
        floater.textContent = emoji;
        
        // Random horizontal position (0-100vw)
        floater.style.left = `${Math.random() * 100}vw`;
        
        // Random scale (0.5 to 1.5)
        const scale = 0.5 + Math.random();
        floater.style.transform = `scale(${scale})`;
        
        // Random animation duration (10 to 20 seconds)
        const duration = 10 + Math.random() * 10;
        floater.style.animationDuration = `${duration}s`;
        
        if (delay !== 0) {
            floater.style.animationDelay = `${delay}s`;
        }

        elements.floatingContainer.appendChild(floater);

        // Cleanup element after animation runs
        setTimeout(() => {
            floater.remove();
        }, (duration + (delay > 0 ? delay : 0)) * 1000);
    }

    // ==========================================================================
    // Milestone Celebration Engine
    // ==========================================================================
    let celebrationActive = false;
    let confettiTimer = null;

    function triggerCelebration(milestone, silent = false) {
        state.isCelebrating = true;
        localStorage.setItem('wasabaaeee_is_celebrating', 'true');
        
        // Update celebration texts dynamically
        if (elements.celebrationTitle) {
            elements.celebrationTitle.textContent = `OMG ${milestone.toLocaleString()} FOLLOWERS! 🥳✨`;
        }
        if (elements.celebrationStats) {
            elements.celebrationStats.textContent = `${milestone.toLocaleString()} 🎉`;
        }
        
        // Show overlay screen
        elements.celebrationScreen.classList.add('active');
        
        // Sound and Confetti
        startConfetti();
        
        // Trigger rapid flowers and cat spawns
        let blastCount = 0;
        const blastInterval = setInterval(() => {
            if (blastCount < 30) {
                spawnFloatingItem('🌻');
                spawnFloatingItem('🍓');
                spawnFloatingItem('🐱');
                spawnFloatingItem('🥳');
                blastCount++;
            } else {
                clearInterval(blastInterval);
            }
        }, 150);

        if (!silent) {
            // Play meow sound a couple of times for celebration
            playRealMeow();
            setTimeout(playRealMeow, 600);
        }
    }

    elements.closeCelebrationBtn.addEventListener('click', () => {
        elements.celebrationScreen.classList.remove('active');
        localStorage.setItem('wasabaaeee_is_celebrating', 'false');
        state.isCelebrating = false;
        stopConfetti();
    });

    // ==========================================================================
    // Confetti Engine (Canvas Particle Physics)
    // ==========================================================================
    const ctx = elements.confettiCanvas.getContext('2d');
    let confettiParticles = [];
    const colors = [
        '#ffd54f', // bright yellow
        '#ffca28', // amber yellow
        '#ffe082', // soft yellow
        '#ffb300', // duck yellow
        '#ff8f00', // orange accent
        '#fff8e1', // cream
        '#7ee8ff'  // baby blue highlight
    ];
    const shapes = ['circle', 'ribbon', 'sunflower', 'strawberry'];

    function resizeCanvas() {
        elements.confettiCanvas.width = window.innerWidth;
        elements.confettiCanvas.height = window.innerHeight;
    }

    class ConfettiParticle {
        constructor() {
            this.x = Math.random() * elements.confettiCanvas.width;
            this.y = Math.random() * -elements.confettiCanvas.height - 20;
            this.size = Math.random() * 8 + 6;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.shape = shapes[Math.floor(Math.random() * shapes.length)];
            
            this.speedY = Math.random() * 4 + 2;
            this.speedX = Math.random() * 2 - 1;
            this.rotation = Math.random() * 360;
            this.rotationSpeed = Math.random() * 4 - 2;
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX;
            this.rotation += this.rotationSpeed;
            
            if (this.y > elements.confettiCanvas.height) {
                this.y = -20;
                this.x = Math.random() * elements.confettiCanvas.width;
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.fillStyle = this.color;
            
            if (this.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.shape === 'ribbon') {
                ctx.fillRect(-this.size / 2, -this.size * 1.5 / 2, this.size, this.size * 1.5);
            } else if (this.shape === 'sunflower') {
                ctx.font = `${this.size * 1.8}px Arial`;
                ctx.fillText('🌻', -this.size / 2, this.size / 2);
            } else if (this.shape === 'strawberry') {
                ctx.font = `${this.size * 1.8}px Arial`;
                ctx.fillText('🍓', -this.size / 2, this.size / 2);
            }
            
            ctx.restore();
        }
    }

    function startConfetti() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        confettiParticles = [];
        for (let i = 0; i < 150; i++) {
            confettiParticles.push(new ConfettiParticle());
        }

        celebrationActive = true;
        animateConfetti();
    }

    function stopConfetti() {
        celebrationActive = false;
        window.removeEventListener('resize', resizeCanvas);
        ctx.clearRect(0, 0, elements.confettiCanvas.width, elements.confettiCanvas.height);
    }

    function animateConfetti() {
        if (!celebrationActive) return;
        
        ctx.clearRect(0, 0, elements.confettiCanvas.width, elements.confettiCanvas.height);
        
        confettiParticles.forEach(p => {
            p.update();
            p.draw();
        });
        
        confettiTimer = requestAnimationFrame(animateConfetti);
    }

    // ==========================================================================
    // Dev Tools / Magic control panel modal
    // ==========================================================================
    function initControlPanel() {
        if (!elements.magicWandBtn) return; // Dev control panel removed

        elements.magicWandBtn.addEventListener('click', () => {
            elements.magicModal.classList.add('active');
        });

        elements.closeModalBtn.addEventListener('click', () => {
            elements.magicModal.classList.remove('active');
        });

        elements.magicModal.addEventListener('click', (e) => {
            if (e.target === elements.magicModal) {
                elements.magicModal.classList.remove('active');
            }
        });

        elements.setCountBtn.addEventListener('click', () => {
            const count = parseInt(elements.followerInput.value);
            if (count >= 2000) {
                state.followerCount = count;
                
                // Sync count to server
                fetch('/api/followers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: count })
                }).catch(err => console.warn("Failed to sync manual count to server:", err));
                
                const currentTarget = getMilestoneTarget(count);
                if (count < currentTarget) {
                    state.isCelebrating = false;
                    localStorage.setItem('wasabaaeee_is_celebrating', 'false');
                    stopConfetti();
                }

                updateUI();
                elements.magicModal.classList.remove('active');
            } else {
                alert("Please enter a follower count of 2000 or more.");
            }
        });

        elements.addFollowerBtn.addEventListener('click', () => {
            state.followerCount++;
            updateUI();
            
            // Sync count to server
            fetch('/api/followers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: state.followerCount })
            }).catch(err => console.warn("Failed to sync addFollower to server:", err));
            
            spawnFloatingItem('👤');
            playRealMeow();
        });

        elements.triggerCelebrationBtn.addEventListener('click', () => {
            const currentTarget = getMilestoneTarget(state.followerCount);
            state.followerCount = currentTarget;
            state.isCelebrating = false; // Reset to allow trigger
            updateUI();
            elements.magicModal.classList.remove('active');
        });

        elements.resetSimBtn.addEventListener('click', () => {
            state.followerCount = DEFAULT_START_COUNT;
            state.isCelebrating = false;
            localStorage.setItem('wasabaaeee_is_celebrating', 'false');
            localStorage.setItem('wasabaaeee_follower_count', DEFAULT_START_COUNT);
            localStorage.removeItem('wasabaaeee_last_celebrated');
            stopConfetti();
            updateUI();
            elements.magicModal.classList.remove('active');
            
            // Sync count to server
            fetch('/api/followers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: DEFAULT_START_COUNT })
            }).then(() => {
                // Re-check API immediately
                fetchFollowerCount();
            }).catch(err => console.warn("Failed to sync reset count to server:", err));
        });
    }
});
