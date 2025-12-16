// --- Game Logic: Thayam ---

// --- Game State ---
const faces = [1, 2, 3, 0];
const extraRolls = [1, 5, 6, 12];
const maxRolls = 5;

// Dynamic Player System
let totalPlayers = 4;
let activePlayersList = ['p1', 'p2', 'p3', 'p4'];
let activePlayerIndex = 0; // Index in activePlayersList

// ==========================================
// 1. SOUND SYSTEM & AUDIO CONFIGURATION
// ==========================================
// Audio Context for Fallback Synth
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Define the audio links based on your uploaded filenames
const soundEffects = {
    start: new Audio('assets/game-start.wav'),
    roll:  new Audio('assets/dice-roll.wav'),
    move:  new Audio('assets/token-move.wav'),
    safe:  new Audio('assets/token-safe.wav'),
    kill:  new Audio('assets/token-kill.wav'),
    home:  new Audio('assets/token-home.wav'),
    select: new Audio('assets/token-select.wav'),
    bgm: new Audio('assets/game-bgm.wav') // User provided file
};

// Configure BGM
soundEffects.bgm.loop = true;
soundEffects.bgm.volume = 0.4;

// Audio Configuration Flags
let isBGMEnabled = true;
let isSFXEnabled = true;

// --- Synth BGM Fallback ---
let bgmOscillators = [];
let bgmInterval = null;

function playSynthBGM() {
    if (!isBGMEnabled) return; // double check

    if (audioCtx.state === 'suspended') audioCtx.resume();
    stopSynthBGM(); // clear previous

    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // C-E-G-C-G-E
    let noteIdx = 0;

    bgmInterval = setInterval(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = notes[noteIdx];
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);

        noteIdx = (noteIdx + 1) % notes.length;
    }, 500);
}

function stopSynthBGM() {
    if (bgmInterval) clearInterval(bgmInterval);
    bgmInterval = null;
}
// --------------------------



let isMusicPlaying = false;
let useSynthForBGM = false;

function startMusic() {
    if (isMusicPlaying) return;
    if (!isBGMEnabled) return;

    // Try file first
    if (!useSynthForBGM) {
        const playPromise = soundEffects.bgm.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isMusicPlaying = true;
            }).catch(error => {
                console.warn("BGM File failed/blocked, switching to Synth.", error);
                useSynthForBGM = true;
                playSynthBGM();
                isMusicPlaying = true;
            });
        }
    } else {
        playSynthBGM();
        isMusicPlaying = true;
    }
}

function stopMusic() {
    isMusicPlaying = false;
    soundEffects.bgm.pause();
    soundEffects.bgm.currentTime = 0;
    stopSynthBGM();
}





// Audio Global Volumes
let sfxVolume = 1.0;

function updateBGMVolume(val) {
    const volume = val / 100;
    soundEffects.bgm.volume = volume;
    document.getElementById('bgm-val').innerText = val + '%';
    
    // Auto-enable/disable based on volume
    if (volume > 0) {
        if (!isBGMEnabled || !isMusicPlaying) {
            isBGMEnabled = true;
            startMusic();
        }
    } else {
        // Mute effective
        isBGMEnabled = false;
        stopMusic();
    }
}

function updateSFXVolume(val) {
    sfxVolume = val / 100;
    document.getElementById('sfx-val').innerText = val + '%';
    // isSFXEnabled is effectively true if volume > 0
    isSFXEnabled = (sfxVolume > 0);
    
    if (isSFXEnabled) playSound('roll'); // Feedback
}

// Function to play a sound by name (Updated with Volume)
function playSound(name) {
    if (name === 'bgm') return;
    
    if (!isSFXEnabled || sfxVolume === 0) return;

    if (soundEffects[name]) {
        try {
            soundEffects[name].volume = sfxVolume; // Apply global SFX volume
            soundEffects[name].currentTime = 0; 
            soundEffects[name].play().catch(() => {});
        } catch(e) {}
    }
}


// ==========================================
// 2. UI & MENU LOGIC
// ==========================================

function openSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

// --- Menu Handlers ---

function handleLogin() {
    // Placeholder login
    const btn = document.getElementById('btn-login-action');
    const userDisplay = document.getElementById('settings-username');
    const statusDisplay = document.getElementById('settings-status');
    
    if (btn.innerText === "Login") {
        const name = prompt("Enter Username:", "Player 1");
        if (name) {
            userDisplay.innerText = name;
            statusDisplay.innerText = "Online";
            statusDisplay.style.color = "#10b981";
            btn.innerText = "Logout";
            btn.style.background = "#ef4444";
        }
    } else {
        userDisplay.innerText = "Guest Player";
        statusDisplay.innerText = "Offline";
        statusDisplay.style.color = "#aaa";
        btn.innerText = "Login";
        btn.style.background = "#10b981";
    }
}

function toggleNotif() {
    const btn = document.getElementById('notif-toggle');
    if (btn.classList.contains('on')) {
        btn.classList.remove('on');
        btn.classList.add('off');
        btn.innerText = "OFF";
    } else {
        btn.classList.remove('off');
        btn.classList.add('on');
        btn.innerText = "ON";
    }
}

// --- Winner Modal Logic ---
function showWinnerModal(pid) {
    const modal = document.getElementById('winner-modal');
    const title = document.getElementById('winner-title');
    const avatar = document.getElementById('winner-avatar');
    const name = document.getElementById('winner-name');
    
    const color = getPColor(pid);
    const pName = pid === 'p1' ? "Green Player" : pid === 'p2' ? "Blue Player" : pid === 'p3' ? "Yellow Player" : "Red Player";
    
    modal.style.display = 'flex';
    // title.innerText = "Winner!";
    title.style.color = color === 'yellow' ? '#f1c40f' : color === 'red' ? '#ef4444' : color === 'blue' ? '#3b82f6' : '#10b981';
    
    name.innerText = pName;
    
    // Style avatar
    avatar.style.background = color === 'yellow' ? '#f1c40f' : color === 'red' ? '#ef4444' : color === 'blue' ? '#3b82f6' : '#10b981';
    avatar.style.color = '#fff';
    
    playSound('home');
}

function closeWinnerModal() {
    document.getElementById('winner-modal').style.display = 'none';
}

function goToMainMenu() {
    window.location.reload();
}

function rematchGame() {
    closeWinnerModal();
    
    // 1. Reset Data
    ['p1','p2','p3','p4'].forEach(pid => {
        tokenPositions[pid] = [0,0,0,0];
        playerStats[pid].cuts = 0;
        
        // Reset Tokens to Base
        const baseClass = getBaseClass(pid);
        const base = document.querySelector(`.${baseClass}`);
        
        for(let i=1; i<=4; i++) {
             const token = document.getElementById(`t-${pid}-${i}`);
             if(token) {
                 token.classList.remove('victory-active', 'jumping', 'retreating');
                 // Remove from current parent
                 if(token.parentElement) token.parentElement.removeChild(token);
                 
                 // Append back to base slot
                 // Assuming base children order: 0->slot1, 1->slot2, etc.
                 const slot = base.children[i-1]; 
                 if(slot) slot.appendChild(token);
             }
        }
        
        // UI Resets
        const killInd = document.getElementById(`${pid}-kill`);
        if(killInd) killInd.style.display = 'none';
        
        const d1 = document.getElementById(`${pid}-d1`);
        const d2 = document.getElementById(`${pid}-d2`);
        if(d1) d1.innerText = "?";
        if(d2) d2.innerText = "?";

        // Reset Buffer
        turnState.rolls = [];
        turnState.usedRolls = [];
        updateBufferUI(pid); 
    });
    
    // 2. Reset Turn State
    turnState = { rolls: [], canRoll: true, usedRolls: [], selectedRollIndex: null, selectedRollValue: null };
    activePlayerIndex = 0;
    
    // 3. Restart
    startGame(totalPlayers, isVsComputer);
}





function openRuleBook() {
    document.getElementById('rules-modal').style.display = 'flex';
}

function closeRuleBook() {
    document.getElementById('rules-modal').style.display = 'none';
}

function openHelpSupport() {
    alert("For support, please contact: support@thayamgame.com\n\nVersion: 1.0.0");
}



function updateMusicBtnUI(active) {
    // Removed
}



// ==========================================
// 3. GAME STATE & DATA STRUCTURES
// ==========================================
// Token State
let tokenPositions = {
    'p1': [0, 0, 0, 0],
    'p2': [0, 0, 0, 0],
    'p3': [0, 0, 0, 0],
    'p4': [0, 0, 0, 0]
};

// Player Stats (Track Cuts)
let playerStats = {
    'p1': { cuts: 0 },
    'p2': { cuts: 0 },
    'p3': { cuts: 0 },
    'p4': { cuts: 0 }
};

let turnState = {
    rolls: [],
    canRoll: true,
    usedRolls: [],
    selectedRollIndex: null,
    selectedRollValue: null
};

// --- PATH DEFINITIONS ---
// P1(Top), P2(Right), P3(Left), P4(Bottom)
// --- PATH DEFINITIONS ---
// P3(Blue) at TL (Top Path), P1(Yellow) at TR (Right Path)
// P2(Red) at BR (Bottom Path), P4(Green) at BL (Left Path)
// --- PATH DEFINITIONS ---
// P1(Yellow) at TL (Top Path), P2(Red) at TR (Right Path)
// P4(Green) at BR (Bottom Path), P3(Blue) at BL (Left Path)
// --- PATH DEFINITIONS ---
// P1(Green) at BL (Left Path), P2(Blue) at TL (Top Path)
// P3(Yellow) at TR (Right Path), P4(Red) at BR (Bottom Path)
// ==========================================
// 4. BOARD TOPOLOGY (PATH DEFINITIONS)
// ==========================================
const paths = {
    'p3': [ // Yellow - Top Arm
        "c-5-1", "c-4-1", "c-3-1", "c-2-1", "c-1-1", "c-0-1", "c-0-0", "c-1-0", "c-2-0", "c-3-0", "c-4-0", "c-5-0", "tab-tr", "c-6-9", "c-6-10", "c-6-11", "c-6-12", "c-6-13", "c-6-14", "c-7-14", "c-8-14", "c-8-13", "c-8-12", "c-8-11", "c-8-10", "c-8-9", "tab-br", "c-9-0", "c-10-0", "c-11-0", "c-12-0", "c-13-0", "c-14-0", "c-14-1", "c-14-2", "c-13-2", "c-12-2", "c-11-2", "c-10-2", "c-9-2", "tab-bl", "c-8-5", "c-8-4", "c-8-3", "c-8-2", "c-8-1", "c-8-0", "c-7-0", "c-6-0", "c-6-1", "c-6-2", "c-6-3", "c-6-4", "c-6-5", "tab-tl", "c-5-2", "c-4-2", "c-3-2", "c-2-2", "c-1-2", "c-0-2", "c-0-1", "c-1-1", "c-2-1", "c-3-1", "c-4-1", "c-5-1", "center-home"
    ],
    'p4': [ // Red - Right Arm
        "c-7-9", "c-7-10", "c-7-11", "c-7-12", "c-7-13", "c-7-14", "c-8-14", "c-8-13", "c-8-12", "c-8-11", "c-8-10", "c-8-9", "tab-br", "c-9-0", "c-10-0", "c-11-0", "c-12-0", "c-13-0", "c-14-0", "c-14-1", "c-14-2", "c-13-2", "c-12-2", "c-11-2", "c-10-2", "c-9-2", "tab-bl", "c-8-5", "c-8-4", "c-8-3", "c-8-2", "c-8-1", "c-8-0", "c-7-0", "c-6-0", "c-6-1", "c-6-2", "c-6-3", "c-6-4", "c-6-5", "tab-tl", "c-5-2", "c-4-2", "c-3-2", "c-2-2", "c-1-2", "c-0-2", "c-0-1", "c-0-0", "c-1-0", "c-2-0", "c-3-0", "c-4-0", "c-5-0", "tab-tr", "c-6-9", "c-6-10", "c-6-11", "c-6-12", "c-6-13", "c-6-14", "c-7-14", "c-7-13", "c-7-12", "c-7-11", "c-7-10", "c-7-9", "center-home"
    ],
    'p2': [ // Blue - Left Arm
        "c-7-5", "c-7-4", "c-7-3", "c-7-2", "c-7-1", "c-7-0", "c-6-0", "c-6-1", "c-6-2", "c-6-3", "c-6-4", "c-6-5", "tab-tl", "c-5-2", "c-4-2", "c-3-2", "c-2-2", "c-1-2", "c-0-2", "c-0-1", "c-0-0", "c-1-0", "c-2-0", "c-3-0", "c-4-0", "c-5-0", "tab-tr", "c-6-9", "c-6-10", "c-6-11", "c-6-12", "c-6-13", "c-6-14", "c-7-14", "c-8-14", "c-8-13", "c-8-12", "c-8-11", "c-8-10", "c-8-9", "tab-br", "c-9-0", "c-10-0", "c-11-0", "c-12-0", "c-13-0", "c-14-0", "c-14-1", "c-14-2", "c-13-2", "c-12-2", "c-11-2", "c-10-2", "c-9-2", "tab-bl", "c-8-5", "c-8-4", "c-8-3", "c-8-2", "c-8-1", "c-8-0", "c-7-0", "c-7-1", "c-7-2", "c-7-3", "c-7-4", "c-7-5", "center-home"
    ],
    'p1': [ // Green - Bottom Arm
        "c-9-1", "c-10-1", "c-11-1", "c-12-1", "c-13-1", "c-14-1",
        "c-14-2", "c-13-2", "c-12-2", "c-11-2", "c-10-2", "c-9-2",
        "tab-bl",
        "c-8-5", "c-8-4", "c-8-3", "c-8-2", "c-8-1", "c-8-0",
        "c-7-0",
        "c-6-0", "c-6-1", "c-6-2", "c-6-3", "c-6-4", "c-6-5",
        "tab-tl",
        "c-5-2", "c-4-2", "c-3-2", "c-2-2", "c-1-2", "c-0-2",
        "c-0-1",
        "c-0-0", "c-1-0", "c-2-0", "c-3-0", "c-4-0", "c-5-0",
        "tab-tr",
        "c-6-9", "c-6-10", "c-6-11", "c-6-12", "c-6-13", "c-6-14",
        "c-7-14",
        "c-8-14", "c-8-13", "c-8-12", "c-8-11", "c-8-10", "c-8-9",
        "tab-br",
        "c-9-0", "c-10-0", "c-11-0", "c-12-0", "c-13-0", "c-14-0",
        "c-14-1", "c-13-1", "c-12-1", "c-11-1", "c-10-1", "c-9-1",
        "center-home"
    ]
};



function getBaseClass(pid) {
    if (pid === 'p1') return 'base-bl'; // Green
    if (pid === 'p2') return 'base-tl'; // Blue
    if (pid === 'p3') return 'base-tr'; // Yellow
    if (pid === 'p4') return 'base-br'; // Red
}

function getPColor(pid) {
    if (pid === 'p1') return 'green';
    if (pid === 'p2') return 'blue';
    if (pid === 'p3') return 'yellow';
    if (pid === 'p4') return 'red';
}

// ==========================================
// 5. INITIALIZATION & SETUP
// ==========================================
let isVsComputer = false;
let isAIActing = false;
let gameStarted = false;

function startGame(playerCount, vsComputer = false) {
    totalPlayers = playerCount;
    isVsComputer = vsComputer;
    isAIActing = false;
    gameStarted = true;
    
    // Define player subsets
    if (playerCount === 2) {
        activePlayersList = ['p1', 'p3'];
    } else if (playerCount === 3) {
        // Green, Yellow, Red
        activePlayersList = ['p1', 'p3', 'p4'];
    } else {
        activePlayersList = ['p1', 'p2', 'p3', 'p4'];
    }

    activePlayerIndex = 0;

    // UI Setup
    document.getElementById('player-selection-modal').style.display = 'none';
    document.getElementById('game-wrapper').style.display = 'flex'; // or block depending on css
    document.getElementById('exit-btn').style.display = 'block';

    // Hide inactive players
    ['p1', 'p2', 'p3', 'p4'].forEach(pid => {
        const isActive = activePlayersList.includes(pid);
        const card = document.getElementById(`${pid}-card`);
        const tokens = document.querySelectorAll(`.token-${getPColor(pid)}`);
        
        if (isActive) {
            card.style.display = 'flex'; // Match css flex display
            tokens.forEach(t => t.style.display = 'block');
        } else {
            card.style.display = 'none'; // Hide sidebar card
            tokens.forEach(t => t.style.display = 'none'); // Hide tokens on board
        }
    });

    playSound('start');
    startMusic();
    
    // Set initial turn UI
    document.querySelectorAll('.player-card').forEach(c => c.classList.remove('active-turn'));
    document.getElementById(`${activePlayersList[activePlayerIndex]}-card`).classList.add('active-turn');
}

// ==========================================
// 6. ARTIFICIAL INTELLIGENCE (CPU PLAYER)
// ==========================================
async function playComputerTurn() {
    console.log("AI Turn Starting...");
    const aiPid = 'p3';
    
    // 1. Roll Dice Logic
    // Loop for extra rolls
    let rolling = true;
    while(rolling) {
         await new Promise(r => setTimeout(r, 1000)); // Wait before rolling
         handleRoll(aiPid);
         await new Promise(r => setTimeout(r, 1000)); // Wait for roll animation
         
         // Check if we can roll again (handled by handleRoll updating turnState)
         if (!turnState.canRoll) {
             rolling = false;
         }
    }

    // 2. Move Logic
    // Wait a bit
    await new Promise(r => setTimeout(r, 1000)); 

    // consume rolls
    while(turnState.rolls.length > turnState.usedRolls.length) {
         // Re-evaluate available rolls each step
         const availableIndices = turnState.rolls.map((_, i) => i)
                                     .filter(i => !turnState.usedRolls.includes(i));
         
         if (availableIndices.length === 0) break;

         // AI DECISION MAKING (Heuristic)
         let bestMove = null;
         let bestScore = -Infinity;

         // Evaluate all combinations of (Roll x Token)
         for (let rIdx of availableIndices) {
             const rollVal = turnState.rolls[rIdx];
             
             for (let tIdx = 0; tIdx < 4; tIdx++) {
                 const validation = validateMove(aiPid, tIdx, rollVal);
                 
                 if (validation.valid) {
                     // Calculate Score for this move
                     let score = 0;
                     const currentPos = tokenPositions[aiPid][tIdx];
                     const newPos = currentPos === 0 ? 1 : currentPos + rollVal;
                     const targetCellId = paths[aiPid][newPos - 1];
                     
                     // --- BASIC OBJECTIVES ---

                     // 1. Entering Board (High Priority if no tokens out)
                     if (currentPos === 0) {
                         const tokensOnBoard = tokenPositions[aiPid].filter(p => p > 0).length;
                         score += (50 - (tokensOnBoard * 5)); // Higher priority if fewer tokens on board
                     }
                     
                     // 2. Victory / Home (Winning condition)
                     if (targetCellId === 'center-home') score += 500;
                     
                     // 3. Killing Opponent (CRITICAL for strategy & unlocking inner path)
                     const targetCell = document.getElementById(targetCellId);
                     let isKillMove = false;
                     if (targetCell && !isSafeZone(targetCellId) && targetCellId !== 'center-home') {
                         for(let child of targetCell.children) {
                             if(child.classList.contains('token')) {
                                 const parts = child.id.split('-');
                                 if(parts[1] !== aiPid) {
                                     score += 200; // HUGE priority
                                     isKillMove = true;
                                     // Bonus if we haven't cut yet (need to unlock inner path)
                                     if(playerStats[aiPid].cuts === 0) score += 100;
                                 }
                             }
                         }
                     }
                     
                     // 4. Safe Zone (Strategic Safety)
                     if (isSafeZone(targetCellId)) score += 40;
                     
                     // 5. Entering Inner Path (Victory Road)
                     // If we have cuts, entering the inner path is good.
                     const innerThreshold = paths[aiPid].length - 7;
                     if (newPos > innerThreshold && currentPos <= innerThreshold) {
                         // Only if we have cuts
                         if (playerStats[aiPid].cuts > 0) score += 60;
                     }

                     // 6. Progress (Distance traveled)
                     score += (newPos * 0.5); // Slight bias to move forward

                     // --- ADVANCED TACTICS v2 ---

                     // 7. Leaving Safe Zone (Risk Assessment)
                     if (currentPos > 0) {
                         const currentCellId = paths[aiPid][currentPos - 1];
                         if (isSafeZone(currentCellId)) {
                             // Penalty for leaving safety, unless it's a kill or home run
                             if (!isKillMove && targetCellId !== 'center-home') {
                                 score -= 25; // Increased penalty for leaving safety
                             }
                         }
                     }
                     
                     // 8. Stacking Risk (Don't put all eggs in one basket)
                     // If target cell has my own token and is NOT safe, penalty.
                     // Because one cut kills all.
                     if (targetCell && !isSafeZone(targetCellId) && targetCellId !== 'center-home') {
                         let myCount = 0;
                         for(let child of targetCell.children) {
                             if(child.classList.contains('token') && child.id.includes(aiPid)) {
                                 myCount++;
                             }
                         }
                         if (myCount > 0) score -= 15;
                     }
                     
                     // 9. Inner Path/Victory Rush
                     if (newPos > innerThreshold) {
                         // We are in the inner path
                         // Prize getting closer to center
                         const stepsToHome = paths[aiPid].length - newPos;
                         if (stepsToHome < 10 && playerStats[aiPid].cuts > 0) {
                             score += (20 - stepsToHome) * 5; // drastically increase score as we get closer
                         }
                     }
                     
                     // 10. Danger Detection (Simple Lookahead)
                     if (!isSafeZone(targetCellId) && targetCellId !== 'center-home') {
                         score -= 5; 
                     }

                     // Randomness (Human-like variation)
                     score += Math.random() * 10;
                     
                     // Progress Score (Step Delta)
                     // Prioritize actually moving vs staying put.
                     // The step value itself is valuable.
                     score += (rollVal * 2);

                     if (score > bestScore) {
                         bestScore = score;
                         bestMove = { rIdx, rollVal, tIdx };
                     }
                 }
             }
         }

         if (bestMove) {
              isAIActing = true; // Block user
              // Apply Best Move
              selectRollToMove(bestMove.rIdx, bestMove.rollVal);
              
              const token = document.getElementById(`t-${aiPid}-${bestMove.tIdx+1}`);
              handleTokenClick(token);
              
              // Wait for animation
              await waitForAnimation(); 
         } else {
             // No valid moves possible for remaining rolls
             break;
         }
         await new Promise(r => setTimeout(r, 800));
    }
    
    isAIActing = false; // Release
    // Turn should end automatically via checkTurnComplete
}

function waitForAnimation() {
    return new Promise(resolve => {
        const check = setInterval(() => {
            if (!isAnimating) {
                clearInterval(check);
                resolve();
            }
        }, 100);
    });
}

// Remove the old DOMContentLoaded listener that just clicked tokens. 
// We will rely on startGame being called from the button.
document.addEventListener('DOMContentLoaded', () => {
    // playSound('start'); // Moved to startGame

    // Auto-start music on first user interaction (Launch phase)
    const enableAudio = () => {
        if (!isMusicPlaying) {
            startMusic();
        }
        // Remove listeners after first interaction
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);

    document.querySelectorAll('.token').forEach(t => {
        t.addEventListener('click', (e) => handleTokenClick(e.target));
    });

    // Spacebar to Roll
    // Keyboard Controls
    document.addEventListener('keydown', (e) => {
        if (!gameStarted) return;
        const currentPid = activePlayersList[activePlayerIndex];

        // Spacebar to Roll
        if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
            e.preventDefault();
            if (turnState.canRoll) {
                handleRoll(currentPid);
            }
        }

        // Arrow Keys to Select Slots
        if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
            e.preventDefault();

            // Get all available (unused) roll indices
            const availableIndices = turnState.rolls.map((_, i) => i)
                .filter(i => !turnState.usedRolls.includes(i));

            if (availableIndices.length === 0) return;

            let currentIndex = -1;
            if (turnState.selectedRollIndex !== null) {
                currentIndex = availableIndices.indexOf(turnState.selectedRollIndex);
            }

            let nextIndex;
            if (e.code === 'ArrowRight') {
                // Determine next value index, loop around if needed for better UX, or just clamp
                // Let's loop for smoother navigation
                if (currentIndex === -1) nextIndex = 0; // Default to first if none selected
                else nextIndex = (currentIndex + 1) % availableIndices.length;
            } else { // Left
                if (currentIndex === -1) nextIndex = availableIndices.length - 1; // Default to last
                else nextIndex = (currentIndex - 1 + availableIndices.length) % availableIndices.length;
            }

            const targetRollIndex = availableIndices[nextIndex];
            const targetValue = turnState.rolls[targetRollIndex];

            selectRollToMove(targetRollIndex, targetValue);
        }
    });

    // --- Handling Loading Screen ---
    // --- Handling Loading Screen ---
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        const minDisplayTime = 2500; // Match animation duration
        const startTime = Date.now();
        let hasFaded = false;

        const removeLoadingScreen = () => {
            if (hasFaded) return;
            
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                hasFaded = true;
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 800); // Match CSS transition
            }, remainingTime);
        };

        // Wait for all assets (images, audio) to load
        if (document.readyState === 'complete') {
            removeLoadingScreen();
        } else {
            window.addEventListener('load', removeLoadingScreen);
        }

        // Safety fallback: Force remove after 6 seconds if something hangs
        setTimeout(removeLoadingScreen, 6000);
    }
});

// ==========================================
// 7. CORE GAME LOGIC (DICE & TURNS)
// ==========================================
function rollSingleDie() {
    return faces[Math.floor(Math.random() * faces.length)];
}

function calculateTotal(d1, d2) {
    if (d1 === 0 && d2 === 0) return 12;
    return d1 + d2;
}

function handleRoll(pid) {
    if (activePlayersList[activePlayerIndex] !== pid) return;
    if (!turnState.canRoll) {
        alert("Max rolls reached or turn ended. Please move tokens.");
        return;
    }

    const d1El = document.getElementById(`${pid}-d1`);
    const d2El = document.getElementById(`${pid}-d2`);

    d1El.classList.add('shake');
    playSound('roll');
    d2El.classList.add('shake');
    
    // Auto-start music on first interaction if not playing
    if (!isMusicPlaying) {
        startMusic();
    }
    d1El.innerText = "?";
    d2El.innerText = "?";

    setTimeout(() => {
        d1El.classList.remove('shake');
        d2El.classList.remove('shake');

        const d1 = rollSingleDie();
        const d2 = rollSingleDie();
        const total = calculateTotal(d1, d2);

        d1El.innerText = d1 === 0 ? "" : d1;
        d2El.innerText = d2 === 0 ? "" : d2;

        turnState.rolls.push(total);
        updateBufferUI(pid);

        const moveCount = turnState.rolls.length;
        const isExtra = extraRolls.includes(total);

        if (moveCount === 5 || !isExtra) {
            turnState.canRoll = false;
            toggleButton(pid, false, "Move Pieces");
        } else {
            toggleButton(pid, true, "Roll Again!");
        }

        checkTurnComplete(pid); // Check if we are stuck immediately
    }, 500);
}

function updateBufferUI(pid) {
    const bufferContainer = document.getElementById(`${pid}-buffer`);
    const slots = bufferContainer.children;
    const rolls = turnState.rolls;

    for (let i = 0; i < slots.length; i++) {
        slots[i].innerText = "";
        slots[i].className = "slot";
        slots[i].onclick = null;
        slots[i].style.cursor = "default";
        slots[i].style.border = "none";
        slots[i].style.transform = "none";
        slots[i].style.opacity = "1";
    }

    rolls.forEach((val, idx) => {
        if (idx < slots.length) {
            slots[idx].innerText = val;
            slots[idx].classList.add('filled');
            if (extraRolls.includes(val)) slots[idx].classList.add('extra');

            if (!turnState.usedRolls.includes(idx)) {
                slots[idx].style.cursor = "pointer";
                slots[idx].onclick = () => selectRollToMove(idx, val);
                if (turnState.selectedRollIndex === idx) {
                    slots[idx].style.border = "2px solid white";
                    slots[idx].style.transform = "scale(1.1)";
                }
            } else {
                slots[idx].classList.add('used');
                slots[idx].style.opacity = "0.5";
            }
        }
    });
}

function selectRollToMove(rollIndex, rollValue) {
    if (turnState.selectedRollIndex === rollIndex) {
        turnState.selectedRollIndex = null;
        turnState.selectedRollValue = null;
    } else {
        turnState.selectedRollIndex = rollIndex;
        turnState.selectedRollValue = rollValue;
        playSound('select');
    }
    const currentPid = activePlayersList[activePlayerIndex];
    updateBufferUI(currentPid);
    const color = getPColor(currentPid);
    document.querySelectorAll(`.token-${color}`).forEach(t => t.style.boxShadow = turnState.selectedRollIndex !== null ? "0 0 15px white" : "");
}

let isAnimating = false; // Animation Lock

// ==========================================
// 8. TOKEN MOVEMENT & RULES
// ==========================================
function handleTokenClick(tokenElement) {
    if (isAnimating) return; // Prevent clicks during movement

    const pid = activePlayersList[activePlayerIndex];
    if (!tokenElement.classList.contains(`token-${getPColor(pid)}`)) return;
    if (turnState.selectedRollIndex === null) {
        alert("Please select a dice roll value first!");
        return;
    }
    const rollVal = turnState.selectedRollValue;
    const rollIdx = turnState.selectedRollIndex;
    const parts = tokenElement.id.split('-');
    const tokenIndex = parseInt(parts[2]) - 1;

    // Validate Move First
    const validation = validateMove(pid, tokenIndex, rollVal);
    if (!validation.valid) {
        alert(validation.reason);
        return;
    }

    executeMove(pid, tokenIndex, rollVal, rollIdx, tokenElement);
}

function validateMove(pid, tokenIndex, steps) {
    const currentPos = tokenPositions[pid][tokenIndex];
    let newPos = 0;

    // 1. Entry Rule
    if (currentPos === 0) {
        if (steps !== 1) return { valid: false, reason: "Must roll a 1 (Thayam) to enter!" };
        newPos = 1;
    } else {
        newPos = currentPos + steps;
    }

    // 2. Overshoot
    if (newPos > paths[pid].length) return { valid: false, reason: "Move overshoots the path." };

    // 3. Inner Path Killer Rule
    // Inner path is last 6 steps (5 arm cells + 1 center-home).
    // Indices: N-6 to N-1. We want to BLOCK N-6 onwards.
    // So newPos >= N-6. Or newPos > N-7. 
    const innerThreshold = paths[pid].length - 7;
    if (newPos > innerThreshold && playerStats[pid].cuts === 0) {
        return { valid: false, reason: "You must cut an opponent's token to enter the Inner Path!" };
    }

    // 4. Safe Zone Exclusive Rule
    const targetId = paths[pid][newPos - 1];
    if (targetId && isSafeZone(targetId)) {
        const cell = document.getElementById(targetId);
        if (cell) {
            const tokens = cell.querySelectorAll('.token');
            for (let t of tokens) {
                if (t.classList.contains('retreating')) continue; // Ignore tokens currently being cut
                const tPid = t.id.split('-')[1];
                if (tPid !== pid) {
                    return { valid: false, reason: "Safe zone is exclusively occupied by another player!" };
                }
            }
        }
    }

    return { valid: true };
}

// ... existing code ...

function cutToken(opponentPid, tokenNumber, tokenElement) {
    const tIdx = parseInt(tokenNumber) - 1;
    const currentPos = tokenPositions[opponentPid][tIdx];

    // Logically reset position immediately so game state is correct
    tokenPositions[opponentPid][tIdx] = 0;
    playSound('kill');
    // playerStats[opponentPid].cuts = Math.max(0, playerStats[opponentPid].cuts - 1); // REMOVED: Once 'gate' is open, it stays open.
    // Actually, cut resets the victim's progress. 

    // Find target base slot
    const baseClass = getBaseClass(opponentPid);
    const slots = document.querySelectorAll(`.${baseClass} .token-slot`);
    let targetSlot = null;
    for (let slot of slots) {
        // Check if empty AND not reserved by another incoming token
        if (slot.children.length === 0 && !slot.classList.contains('reserved-slot')) {
            targetSlot = slot;
            slot.classList.add('reserved-slot'); // Mark as taken immediately
            break;
        }
    }

    if (!targetSlot) {
        // Fallback if full logic fails
        return;
    }

    // Build Reverse Path
    let retreatPathIds = [];
    // If at pos X (index X-1), we want to visit path indices X-2 down to 0
    if (currentPos > 0) {
        for (let i = currentPos - 2; i >= 0; i--) {
            if (i < paths[opponentPid].length) {
                retreatPathIds.push(paths[opponentPid][i]);
            }
        }
    }

    // Start Animation
    tokenElement.classList.add('retreating');
    let step = 0;

    function animateRetreat() {
        if (step < retreatPathIds.length) {
            const cellId = retreatPathIds[step];
            const cell = document.getElementById(cellId);
            if (cell) {
                playSound('move'); // Sound for dragging back
                cell.appendChild(tokenElement);
            }
            step++;
            setTimeout(animateRetreat, 50); // Fast 50ms per step
        } else {
            // Final placement
            targetSlot.appendChild(tokenElement);
            targetSlot.classList.remove('reserved-slot'); // Unmark
            tokenElement.classList.remove('retreating');
            tokenElement.classList.remove('victory-active');
        }
    }

    animateRetreat();
}

function executeMove(pid, tokenIndex, steps, rollIdx, tokenElement) {
    isAnimating = true;
    const currentPos = tokenPositions[pid][tokenIndex];
    let newPos = currentPos === 0 ? 1 : currentPos + steps;

    // Calculate path IDs for animation
    let pathIds = [];
    if (currentPos === 0) {
        pathIds.push(paths[pid][0]); // Just the start cell
    } else {
        // Collect IDs from next cell up to destination
        // currentPos corresponds to paths index [currentPos-1] (where we are)
        // We need indices: currentPos, currentPos+1, ... up to newPos-1
        for (let i = currentPos; i < newPos; i++) {
            if (i < paths[pid].length) {
                pathIds.push(paths[pid][i]);
            }
        }
    }

    let stepCount = 0;

    // Recursive animation function
    function animateStep() {
        if (stepCount < pathIds.length) {
            const nextCellId = pathIds[stepCount];
            let cell = document.getElementById(nextCellId);

            // SPECIAL HANDLING: If entering center-home, target specific slot directly
            if (nextCellId === 'center-home') {
                const color = getPColor(pid);
                const slots = document.querySelectorAll(`.hm-c[data-color="${color}"]`);
                for (let s of slots) {
                    if (s.children.length === 0) {
                        cell = s;
                        break;
                    }
                }
            }

            if (cell) {
                 // Determine if this is the final step
                const isFinal = (stepCount === pathIds.length - 1);

                if (currentPos === 0 && stepCount === 0) {
                     playSound('move'); // Enter sound
                } else {
                     playSound('move'); 
                }

                cell.appendChild(tokenElement);

                // Trigger Jump Animation
                tokenElement.classList.remove('jumping');
                void tokenElement.offsetWidth; // Force Reflow
                tokenElement.classList.add('jumping');
            }

            stepCount++;
            setTimeout(animateStep, 300); // 300ms delay between steps
        } else {
            finalizeMove(pid, tokenIndex, newPos, rollIdx, tokenElement);
        }
    }

    animateStep();
}

function finalizeMove(pid, tokenIndex, newPos, rollIdx, tokenElement) {
    const targetCellId = paths[pid][newPos - 1];

    const targetCell = document.getElementById(targetCellId);
    if (targetCell) {
        const occupants = targetCell.children;
        let cutHappened = false;

        // Cutting Logic (Only at destination)
        if (occupants.length > 0 && !isSafeZone(targetCellId) && targetCellId !== 'center-home') {
            Array.from(occupants).forEach(child => {
                if (child.classList.contains('token')) {
                    const parts = child.id.split('-');
                    const childPid = parts[1];
                    if (childPid !== pid) {
                        cutToken(childPid, parts[2], child);
                        cutHappened = true;
                    }
                }
            });
        }

        if (cutHappened) {
            playerStats[pid].cuts++;
            // Show Kill Indicator UI
            const indicator = document.getElementById(`${pid}-kill`);
            if (indicator) indicator.style.display = "inline";

            // Alert after a slight delay to not jar the animation ending
            setTimeout(() => alert("You cut an opponent! Inner Path Unlocked."), 50);
        }

        // ENTRY CHECK: Inner Path (Victory Zone)
        // If target is center-home, verify player has at least 1 kill
        if (targetCellId === 'center-home') {
            playSound('home');
            if (playerStats[pid].cuts === 0) {
                alert("You need at least one kill to enter the Home!");
                // Revert move logic would go here, but validation usually catches this.
                // Since this is finalizeMove, we assume validation passed.
                // However, double-check logic:
            }

            // Victory Logic: Place in specific 5x5 Grid Slot
            const color = getPColor(pid); // 'green', 'blue', 'yellow', 'red'
            
            // Check if already placed in valid slot (by animation)
            let alreadyPlaced = false;
            if (tokenElement.parentElement && 
                tokenElement.parentElement.classList.contains('hm-c') && 
                tokenElement.parentElement.dataset.color === color) {
                alreadyPlaced = true;
            }

            if (!alreadyPlaced) {
                // Find all empty slots for this color
                const slots = document.querySelectorAll(`.hm-c[data-color="${color}"]`);
                let placed = false;

                for (let slot of slots) {
                    if (slot.children.length === 0) {
                        slot.appendChild(tokenElement);
                        placed = true;
                        break;
                    }
                }

                if (!placed) {
                    // Formatting fallback if all slots full (unlikely in normal game flow)
                    targetCell.appendChild(tokenElement);
                }
            }
        } else {
            targetCell.appendChild(tokenElement);
            // Check if landed on safe zone for sound
            if (isSafeZone(targetCellId)) {
                playSound('safe');
            }
        }

        tokenPositions[pid][tokenIndex] = newPos;

        // Check for Victory Line Entry
        const innerThreshold = paths[pid].length - 7;
        if (newPos > innerThreshold) {
            tokenElement.classList.add('victory-active');
        }

        // Check Win Condition
        let finishedTokens = 0;
        for (let i = 0; i < 4; i++) {
            const pos = tokenPositions[pid][i];
            if (pos > 0 && paths[pid][pos - 1] === 'center-home') {
                finishedTokens++;
            }
        }

        if (finishedTokens === 4) {
            // Delay slightly to allow UI update
            setTimeout(() => {
                showWinnerModal(pid);
            }, 500);
            return;
        }

        turnState.usedRolls.push(rollIdx);
        turnState.selectedRollIndex = null;
        turnState.selectedRollValue = null;

        updateBufferUI(pid);
        checkTurnComplete(pid);
    }
    isAnimating = false; // Unlock
}

function checkTurnComplete(pid) {
    if (turnState.canRoll) return; // Still rolling

    // All rolls used?
    if (turnState.usedRolls.length === turnState.rolls.length) {
        finishTurn();
        return;
    }

    // Check if any valid moves exist for remaining rolls
    const unusedIndices = turnState.rolls.map((v, i) => i).filter(i => !turnState.usedRolls.includes(i));
    let canMove = false;
    for (let idx of unusedIndices) {
        const val = turnState.rolls[idx];
        for (let tIdx = 0; tIdx < 4; tIdx++) {
            if (validateMove(pid, tIdx, val).valid) {
                canMove = true;
                break;
            }
        }
        if (canMove) break;
    }

    if (!canMove) {
        setTimeout(endTurn, 1000);
    }
}

function finishTurn() {
    document.querySelectorAll('.token').forEach(t => t.style.boxShadow = "");
    setTimeout(() => {
        endTurn();
    }, 1000);
}

function isSafeZone(cellId) {
    const cell = document.getElementById(cellId);
    if (!cell) return false;
    // Only cells with a star are safe zones (Exclusive Entry)
    return cell.querySelector('.fa-star') !== null;
}





function endTurn() {
    const currentPid = activePlayersList[activePlayerIndex];
    toggleButton(currentPid, false, "Wait");
    document.getElementById(`${currentPid}-card`).classList.remove('active-turn');

    turnState.rolls = [];
    turnState.canRoll = true;
    turnState.usedRolls = [];
    turnState.selectedRollIndex = null;

    activePlayerIndex = (activePlayerIndex + 1) % activePlayersList.length;
    const nextPid = activePlayersList[activePlayerIndex];

    document.getElementById(`${nextPid}-card`).classList.add('active-turn');
    toggleButton(nextPid, true, "Roll");

    document.getElementById(`${nextPid}-d1`).innerText = "?";
    document.getElementById(`${nextPid}-d2`).innerText = "?";
    const bufferContainer = document.getElementById(`${nextPid}-buffer`);
    for (let slot of bufferContainer.children) {
        slot.innerText = ""; slot.className = "slot";
        slot.style.border = "none";
    }
    document.querySelectorAll('.token').forEach(t => t.style.boxShadow = "");

    // Trigger AI if applicable
    if (isVsComputer && nextPid === 'p3') {
        playComputerTurn();
    }
}

function toggleButton(pid, enabled, text) {
    const btn = document.getElementById(`${pid}-btn`);
    if (btn) {
        btn.innerText = text;
        btn.disabled = !enabled;
        if (enabled) btn.classList.add('pulse');
        else btn.classList.remove('pulse');
    }
}

// ==========================================
// 8. ONLINE MULTIPLAYER (MOCK UI)
// ==========================================
let onlinePlayerCount = 2;

window.switchOnlineTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'create') {
        document.getElementById('online-create-section').style.display = 'flex';
        document.getElementById('online-join-section').style.display = 'none';
        document.getElementById('online-lobby').style.display = 'none';
    } else {
        document.getElementById('online-create-section').style.display = 'none';
        document.getElementById('online-join-section').style.display = 'flex';
        document.getElementById('online-lobby').style.display = 'none';
    }
}

window.selectOnlinePlayerCount = function(count, btn) {
    onlinePlayerCount = count;
    document.querySelectorAll('.local-player-options button').forEach(b => b.classList.remove('selected-p-count'));
    if(btn) btn.classList.add('selected-p-count');
}

window.generateRoom = function() {
    const name = document.getElementById('online-player-name').value;
    if (!name) { alert("Please enter your name!"); return; }

    // Mock Code Generation
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    document.getElementById('display-room-code').innerText = code;
    
    document.getElementById('online-create-section').style.display = 'none';
    document.getElementById('online-lobby').style.display = 'flex';
    document.querySelector('.online-tabs').style.display = 'none';
    document.getElementById('connected-players-list').innerHTML = `
        <div style="color:#00ff6a"><i class="fa-solid fa-user"></i> ${name} (Host)</div>
        <div style="margin-top:10px; font-style:italic;">Waiting for others...</div>
    `;
}

window.joinRoom = function() {
    const name = document.getElementById('online-player-name').value;
    const code = document.getElementById('room-code-input').value;
    if (!name) { alert("Please enter your name!"); return; }
    if (code.length !== 4) { alert("Invalid Room Code"); return; }

    document.getElementById('display-room-code').innerText = code.toUpperCase();
    
    document.getElementById('online-join-section').style.display = 'none';
    document.getElementById('online-lobby').style.display = 'flex';
    document.querySelector('.online-tabs').style.display = 'none';
    document.getElementById('connected-players-list').innerHTML = `
        <div style="color:#ccc"><i class="fa-solid fa-user"></i> Host</div>
        <div style="color:#00ff6a"><i class="fa-solid fa-user"></i> ${name} (You)</div>
    `;
    // Enable start for demo purposes if joining
    const startBtn = document.getElementById('btn-start-online');
    startBtn.style.opacity = '1'; 
    startBtn.style.cursor = 'pointer';
    startBtn.onclick = () => { startGame(onlinePlayerCount); };
}

window.copyRoomLink = function() {
    const code = document.getElementById('display-room-code').innerText;
    const link = `https://thayam.game/join/${code}`;
    navigator.clipboard.writeText(link).then(() => {
        alert("Link copied to clipboard: " + link);
    });
}

window.confirmExit = function() {
    if (gameStarted) {
        if (confirm("Are you sure you want to exit the game? Current progress will be lost.")) {
            // Reloading is the safest way to reset complex game state
            window.location.reload();
        }
    } else {
        window.location.reload();
    }
}