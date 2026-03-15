// ----------------------------------------------------
// App State & Configuration
// ----------------------------------------------------
let supabaseClient = null;
let currentUser = null;
let currentQuestion = null;
let countdownInterval = null;

// Initialize Supabase if config exists
// Defer initialization until DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        initApp();
    } else {
        console.warn("Supabase not configured. Waiting for config.js update...");
        initAppDevMode();
    }
});

// ----------------------------------------------------
// UI Navigation Controllers
// ----------------------------------------------------
let views = {};

// We populate this inside initApp to ensure DOM is ready
function initViews() {
    views = {
        timelock: document.getElementById('timelock-view'),
        login: document.getElementById('login-view'),
        question: document.getElementById('question-view'),
        success: document.getElementById('success-view'),
        bridge: document.getElementById('bridge-view'),
        'slide-1': document.getElementById('slide-view-1'),
        'slide-2': document.getElementById('slide-view-2'),
        'slide-3': document.getElementById('slide-view-3'),
        'slide-4': document.getElementById('slide-view-4'),
        'slide-5': document.getElementById('slide-view-5'),
        penalty: document.getElementById('penalty-view')
    };
}

function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
    }
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

// ----------------------------------------------------
// Initialization & Global Time Lock
// ----------------------------------------------------
function initApp() {
    initViews();
    setupEventListeners();
    checkGlobalTimeLock();
}

function initAppDevMode() {
    console.log("Running in DEV mode (No DB connecting)");
    CONFIG = { EID_DATE: '2020-01-01T00:00:00Z' }; // Force past
    initViews();
    setupEventListeners();
    checkGlobalTimeLock();
}

function checkGlobalTimeLock() {
    const eidDate = new Date(CONFIG.EID_DATE).getTime();

    // Clear existing interval if any
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = eidDate - now;

        if (distance <= 0) {
            clearInterval(countdownInterval);
            // Eid is here! Show login view
            if (!currentUser) switchView('login');
        } else {
            // Eid is not here yet. Update timer.
            switchView('timelock');
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            document.getElementById('countdown-timer').innerHTML =
                `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
    }, 1000);
}

// ----------------------------------------------------
// Event Listeners
// ----------------------------------------------------
function setupEventListeners() {
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('submit-answer-btn').addEventListener('click', handleAnswerSubmit);
    
    document.getElementById('begin-slides-btn').addEventListener('click', () => transitionToSlide(1));
    document.getElementById('next-slide-1').addEventListener('click', () => transitionToSlide(2));
    document.getElementById('next-slide-2').addEventListener('click', () => transitionToSlide(3));
    document.getElementById('next-slide-3').addEventListener('click', () => transitionToSlide(4));
    document.getElementById('next-slide-4').addEventListener('click', () => transitionToSlide(5));
}

// ----------------------------------------------------
// Authentication & Routing
// ----------------------------------------------------
async function handleLogin() {
    const name = "Moh"; // Hardcoded to single user flow
    hideError('login-error');

    if (!supabaseClient) {
        // Dev mode mock
        currentUser = { id: 1, name: name, flow_type: "person_2", current_step: 1 };
        loadNextQuestion();
        return;
    }

    try {
        // We look up 'Moh' from the database to retain the table structure and lock data
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('name', name)
            .single();

        if (error) throw error;
        currentUser = data;

        // Check lock status
        if (currentUser.lock_until_timestamp) {
            const lockTime = new Date(currentUser.lock_until_timestamp).getTime();
            if (new Date().getTime() < lockTime) {
                logActivity('Penalty Active', `User opened app while locked until ${new Date(lockTime).toLocaleTimeString()}`);
                showPenaltyView(lockTime);
                return;
            } else {
                // Clear lock in DB
                logActivity('Penalty Expired', 'User returned after penalty expired.');
                await supabaseClient.from('users').update({ lock_until_timestamp: null }).eq('id', currentUser.id);
            }
        } else {
            logActivity('App Opened', 'User loaded the site and bypassed time lock.');
        }

        loadNextQuestion();

    } catch (err) {
        console.error(err);
        showError('login-error', 'Failed to log in. Try again.');
    }
}

// ----------------------------------------------------
// Telemetry
// ----------------------------------------------------
async function logActivity(eventType, details) {
    if (!supabaseClient) {
        console.log(`[DEV LOG] ${eventType}: ${details}`);
        return;
    }
    try {
        await supabaseClient.from('activity_logs').insert([{ event_type: eventType, details: details }]);
    } catch (e) {
        console.error("Failed to log activity:", e);
    }
}

// ----------------------------------------------------
// Core Flow Logic
// ----------------------------------------------------

async function loadNextQuestion() {
    if (!supabaseClient) {
        // Dev mode mock
        currentQuestion = { question_text: "How are you remembered in my contacts?", correct_answer: "mohsina", step_number: currentUser.current_step };
        document.getElementById('question-text').textContent = currentQuestion.question_text;
        switchView('question');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('questions')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('step_number', currentUser.current_step)
            .single();

        if (error && error.code === 'PGRST116') {
            // No more questions for this user! They finished their flow.
            handleFlowCompletion();
            return;
        } else if (error) {
            throw error;
        }

        currentQuestion = data;

        document.getElementById('step-indicator').textContent = `Question ${currentQuestion.step_number}`;
        document.getElementById('question-text').textContent = currentQuestion.question_text;
        const options = document.getElementsByName('decoy_answer');
        for (let i = 0; i < options.length; i++) options[i].checked = false;
        hideError('answer-error');
        switchView('question');

    } catch (err) {
        console.error(err);
        showError('answer-error', 'Error loading question.');
    }
}

async function handleAnswerSubmit() {
    const selectedOption = document.querySelector('input[name="decoy_answer"]:checked');
    const answer = selectedOption ? selectedOption.value.trim().toLowerCase() : '';
    hideError('answer-error');

    if (!answer) return;

    if (answer === currentQuestion.correct_answer.toLowerCase()) {
        // Correct
        if (currentUser.flow_type === 'person_2' && currentQuestion.step_number === 1) {
            logActivity('Decoy Passed', `Answered decoy correctly: ${answer}`);
            // Person 2 False Finish Trigger
            triggerPerson2FalseFinish();
        } else {
            // Advance step
            currentUser.current_step += 1;
            if (supabaseClient) {
                await supabaseClient.from('users').update({ current_step: currentUser.current_step }).eq('id', currentUser.id);
            }
            loadNextQuestion();
        }
    } else {
        // Incorrect formulation -> PENALTY
        logActivity('Decoy Failed', `Guessed incorrectly: ${answer}`);
        applyPenalty(2); // 2 hours Standard
    }
}

async function applyPenalty(hours) {
    // Generate penalty time in clean UTC for the database
    const lockTime = new Date();
    lockTime.setHours(lockTime.getHours() + hours);
    const utcIsoString = lockTime.toISOString();

    if (supabaseClient) {
        // We explicitly tell Supabase this is a UTC string so it matches `TIMESTAMPTZ` natively
        await supabaseClient.from('users').update({ lock_until_timestamp: utcIsoString }).eq('id', currentUser.id);
    }

    showPenaltyView(lockTime.getTime());
}

function showPenaltyView(lockTimeMillis) {
    switchView('penalty');

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const distance = lockTimeMillis - new Date().getTime();

        if (distance <= 0) {
            clearInterval(countdownInterval);
            switchView('login'); // Allow login again
        } else {
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);
            document.getElementById('penalty-timer').innerHTML = `${h}h ${m}m ${s}s`;
        }
    }, 1000);
}

function handleFlowCompletion() {
    // If we reach here, standard or Person 1 finished all questions nicely.
    switchView('success');
}

// ----------------------------------------------------
// Person 2 Specific Logic
// ----------------------------------------------------

function triggerPerson2FalseFinish() {
    // Show standard success view first
    switchView('success');

    // Wait 3 seconds, then transition to Cinematic Bridge
    setTimeout(() => {
        startCinematicSequence();
    }, 3000);
}

function startCinematicSequence() {
    // Activate dark cinematic theme
    document.body.classList.add('cinematic-mode');
    switchView('bridge');

    // Start fade sequences
    setTimeout(() => {
        document.getElementById('bridge-line-1').classList.add('visible');
    }, 100);

    // Wait 2.5s -> show line 2
    setTimeout(() => {
        const line2 = document.getElementById('bridge-line-2');
        line2.classList.remove('hidden');
        void line2.offsetWidth; // trigger reflow
        line2.classList.add('visible');
    }, 2600);

    // Wait 2s more -> show button
    setTimeout(() => {
        const btn = document.getElementById('turn-page-btn');
        btn.classList.remove('hidden');
        void btn.offsetWidth;
        btn.classList.add('visible');
    }, 4600);
}

// ----------------------------------------------------
// Presentation Slides Logic
// ----------------------------------------------------

function transitionToSlide(slideNum) {
    if (slideNum === 1) {
        // Fade out bridge contents
        document.getElementById('bridge-line-1').classList.remove('visible');
        document.getElementById('bridge-line-2').classList.remove('visible');
        document.getElementById('begin-slides-btn').classList.remove('visible');
        
        // Switch view after fade out completes
        setTimeout(() => {
            switchView('slide-1');
            fadeInSlideContents(1);
        }, 1000);
        return;
    }

    // Fade out previous slide
    const prevSlide = document.getElementById(`slide-view-${slideNum - 1}`);
    const prevElements = prevSlide.querySelectorAll('.fade-in-element');
    prevElements.forEach(el => el.classList.remove('visible'));

    setTimeout(() => {
        switchView(`slide-${slideNum}`);
        fadeInSlideContents(slideNum);
    }, 1000);
}

function fadeInSlideContents(slideNum) {
    const slideId = `slide-view-${slideNum}`;
    const slideItems = document.querySelectorAll(`#${slideId} .fade-in-element`);
    
    slideItems.forEach((el, index) => {
        setTimeout(() => {
            el.classList.remove('hidden');
            void el.offsetWidth; // trigger reflow
            el.classList.add('visible');
        }, 100 + (index * 1500)); // Stagger fade in by a second and a half each
    });

    if (slideNum === 5) {
        logActivity('Flow Completed', 'User reached the final presentation slide.');
    }
}
