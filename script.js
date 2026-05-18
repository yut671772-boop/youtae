/**
 * 교실 자리 바꾸기 웹 애플리케이션 코어 로직
 * Smart Classroom Seating Arranger - app.js
 */

// --- 1. Audio Synthesizer Class (Chalk scratch & School Bell) ---
class SeatingAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API is not supported in this browser:", e);
        }
    }

    // Custom synthesis of chalk-scratching noise
    playChalkScratch() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const duration = 0.04 + Math.random() * 0.03; // varying short scratch length
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate Brown Noise (deeper, woodier noise suited for blackboard friction)
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.05 * white)) / 1.05;
            lastOut = data[i];
            data[i] *= 4.0; // amplify sound
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Bandpass filter to sweep high screechy chalk frequencies
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(6.0, now);
        filter.frequency.setValueAtTime(1400 + Math.random() * 800, now);
        filter.frequency.exponentialRampToValueAtTime(2500 + Math.random() * 1000, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noiseNode.start(now);
        noiseNode.stop(now + duration);
    }

    // Custom synthesis of a traditional resonant school bell chime
    playSchoolBell() {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // Pure resonant overtones forming an A major pentatonic/bell chord
        // Frequencies: A4 (440Hz), C#5 (554.37Hz), E5 (659.25Hz), A5 (880Hz), C#6 (1108.73Hz), E6 (1318.51Hz)
        const partials = [440.00, 554.37, 659.25, 880.00, 1108.73, 1318.51];
        
        partials.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            // Bell ringing: use sine for smooth tones, triangle for metallic ping
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            
            // Stagger decay times: higher partial overtones decay much quicker
            const decay = 2.5 - (idx * 0.35);
            const volume = idx === 0 ? 0.08 : 0.04; // base frequency is slightly louder
            
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
            
            osc.start(now);
            osc.stop(now + decay);
        });
    }
}

// --- 2. Canvas Confetti Particle System ---
class SeatingConfetti {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationFrameId = null;
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    spawn(count = 100) {
        const colors = [
            '#ffffff', // chalk white
            '#fdf5b7', // chalk yellow
            '#ffb7d5', // chalk pink
            '#b7f3ff', // chalk cyan
            '#ffd0b7', // chalk orange
            '#c7ffd8'  // chalk light green
        ];

        const centerX = this.canvas.width / 2;
        const topY = 120; // Spawn near blackboard blackboard-header

        // Blast particles downwards and outwards from blackboard
        for (let i = 0; i < count; i++) {
            const angle = Math.PI / 4 + Math.random() * (Math.PI / 2); // 45 to 135 degrees (downward fan)
            const speed = 4 + Math.random() * 8;
            this.particles.push({
                x: centerX - 100 + Math.random() * 200,
                y: topY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 6 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: -4 + Math.random() * 8,
                opacity: 1
            });
        }

        if (!this.animationFrameId) {
            this.animate();
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // slow gravity downward
            p.vx *= 0.98; // air drag
            p.rotation += p.rotationSpeed;
            p.opacity -= 0.008;

            if (p.opacity <= 0 || p.y > this.canvas.height) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.globalAlpha = p.opacity;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
        }

        if (this.particles.length > 0) {
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.animationFrameId = null;
        }
    }
}

// --- 3. Main Seating Controller Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Seating State
    let rows = 5;
    let cols = 6;
    let desks = []; // Array of { index: Number, studentName: String, isLocked: Boolean, isBlocked: Boolean }
    let students = []; // Plain Array of student names loaded from textarea
    let activeMode = 'assign'; // 'assign' or 'block'
    let isDrawing = false;

    // Instantiate sub-engines
    const audio = new SeatingAudio();
    const confetti = new SeatingConfetti('confetti-canvas');

    // 2. DOM Elements
    const bodyEl = document.body;
    const desksGridEl = document.getElementById('desks-grid-container');
    const inputRows = document.getElementById('input-rows');
    const inputCols = document.getElementById('input-cols');
    const studentNamesArea = document.getElementById('student-names-area');
    const studentCountEl = document.getElementById('student-count');
    const unassignedCountEl = document.getElementById('unassigned-count');
    const vacantCountEl = document.getElementById('vacant-count');
    const themeSelect = document.getElementById('theme-select');
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const toastEl = document.getElementById('toast');
    const modeTipEl = document.getElementById('mode-tip-text');

    // Control buttons
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnClearLocks = document.getElementById('btn-clear-locks');
    const btnExportText = document.getElementById('btn-export-text');
    const btnPrint = document.getElementById('btn-print');
    
    // Config controls
    const btnRowDec = document.getElementById('btn-row-dec');
    const btnRowInc = document.getElementById('btn-row-inc');
    const btnColDec = document.getElementById('btn-col-dec');
    const btnColInc = document.getElementById('btn-col-inc');
    const btnModeAssign = document.getElementById('btn-mode-assign');
    const btnModeBlock = document.getElementById('btn-mode-block');
    const btnSampleNames = document.getElementById('btn-sample-names');

    // --- State Initialization & Storage ---
    function initSeatingApp() {
        // Load settings from localStorage
        const savedRows = localStorage.getItem('seating_rows');
        const savedCols = localStorage.getItem('seating_cols');
        if (savedRows && savedCols) {
            rows = parseInt(savedRows, 10);
            cols = parseInt(savedCols, 10);
            inputRows.value = rows;
            inputCols.value = cols;
        }

        // Load Student Names textarea
        const savedNames = localStorage.getItem('seating_student_names');
        if (savedNames) {
            studentNamesArea.value = savedNames;
        } else {
            // Load default sample names on first run
            loadSampleStudentNames();
        }

        // Load visual theme
        const savedTheme = localStorage.getItem('seating_theme');
        if (savedTheme) {
            themeSelect.value = savedTheme;
            setAppTheme(savedTheme);
        } else {
            setAppTheme('chalkboard');
        }

        // Load Sound Setting
        const savedSound = localStorage.getItem('seating_sound_enabled');
        if (savedSound !== null) {
            audio.enabled = savedSound === 'true';
            updateSoundButtonUI();
        }

        // Load Desks Layout setup
        loadDesksState();

        // Initial setup/update
        parseStudentNames();
        updateInfoPanel();
        renderDesksBoard();
    }

    function saveDesksState() {
        localStorage.setItem('seating_desks', JSON.stringify(desks));
        localStorage.setItem('seating_rows', rows.toString());
        localStorage.setItem('seating_cols', cols.toString());
    }

    function loadDesksState() {
        const savedDesks = localStorage.getItem('seating_desks');
        const defaultDesksCount = rows * cols;

        if (savedDesks) {
            const parsed = JSON.parse(savedDesks);
            // Verify if parsed dimensions fit current row/col
            if (parsed.length === defaultDesksCount) {
                desks = parsed;
                return;
            }
        }

        // If no saved state or mismatch, rebuild clean grid array
        desks = Array.from({ length: defaultDesksCount }, (_, i) => ({
            index: i,
            studentName: '',
            isLocked: false,
            isBlocked: false
        }));
        saveDesksState();
    }

    // --- UI Theme & Audio Controls ---
    function setAppTheme(theme) {
        if (theme === 'cyber') {
            bodyEl.classList.remove('chalkboard-theme');
            bodyEl.classList.add('cyber-theme');
        } else {
            bodyEl.classList.remove('cyber-theme');
            bodyEl.classList.add('chalkboard-theme');
        }
        localStorage.setItem('seating_theme', theme);
    }

    themeSelect.addEventListener('change', (e) => {
        setAppTheme(e.target.value);
    });

    btnSoundToggle.addEventListener('click', () => {
        audio.init();
        audio.enabled = !audio.enabled;
        localStorage.setItem('seating_sound_enabled', audio.enabled.toString());
        updateSoundButtonUI();
        showSeatingToast(audio.enabled ? "칠판 사운드 효과를 활성화했습니다." : "효과음을 비활성화했습니다.");
    });

    function updateSoundButtonUI() {
        const onIcon = btnSoundToggle.querySelector('.sound-on-icon');
        const offIcon = btnSoundToggle.querySelector('.sound-off-icon');
        const label = btnSoundToggle.querySelector('span');

        if (audio.enabled) {
            btnSoundToggle.classList.add('active');
            onIcon.style.display = 'block';
            offIcon.style.display = 'none';
            label.textContent = "소리 켬";
        } else {
            btnSoundToggle.classList.remove('active');
            onIcon.style.display = 'none';
            offIcon.style.display = 'block';
            label.textContent = "소리 끔";
        }
    }

    // --- Student Names Parsing & Sample Loading ---
    function parseStudentNames() {
        const text = studentNamesArea.value;
        localStorage.setItem('seating_student_names', text);

        // Split by commas, space or newline, clean up empty items
        students = text.split(/[\n,]+/)
            .map(name => name.trim())
            .filter(name => name.length > 0);

        studentCountEl.textContent = students.length;
    }

    studentNamesArea.addEventListener('input', () => {
        parseStudentNames();
        updateInfoPanel();
    });

    function loadSampleStudentNames() {
        const sampleList = [
            "강민준", "김서준", "이도윤", "박예준", "최시우", "정하준", "한주원", "유지호", "윤지후", "임준우",
            "정서아", "이이서", "박아윤", "최지아", "김하윤", "서아린", "한하린", "조하은", "송설아", "황수아",
            "김도현", "이동하", "박지안", "최다은", "유하랑", "정예인", "임서현", "서시현", "한도경", "신재민"
        ];
        studentNamesArea.value = sampleList.join(", ");
        parseStudentNames();
        showSeatingToast("30명의 샘플 학생 명단을 불러왔습니다.");
    }

    btnSampleNames.addEventListener('click', () => {
        if (isDrawing) return;
        loadSampleStudentNames();
        // Clear all non-blocked desk names since students modified
        desks.forEach(d => {
            if (!d.isLocked) d.studentName = '';
        });
        saveDesksState();
        updateInfoPanel();
        renderDesksBoard();
    });

    // --- Grid Setup / Dimensions Sizing ---
    function updateGridDimensions(newRows, newCols) {
        if (isDrawing) return;
        
        const oldRows = rows;
        const oldCols = cols;
        rows = newRows;
        cols = newCols;
        
        inputRows.value = rows;
        inputCols.value = cols;

        // Migrate current seating data to fit the new size grid
        const newDesks = Array.from({ length: rows * cols }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            
            // Try to map from the old position to keep configurations
            if (r < oldRows && c < oldCols) {
                const oldIndex = r * oldCols + c;
                return desks[oldIndex];
            }
            return {
                index: i,
                studentName: '',
                isLocked: false,
                isBlocked: false
            };
        });

        // re-index properly
        newDesks.forEach((d, idx) => d.index = idx);
        desks = newDesks;
        saveDesksState();
        updateInfoPanel();
        renderDesksBoard();
    }

    // Number Stepper button clicks
    btnRowDec.addEventListener('click', () => { if (rows > 2) updateGridDimensions(rows - 1, cols); });
    btnRowInc.addEventListener('click', () => { if (rows < 10) updateGridDimensions(rows + 1, cols); });
    btnColDec.addEventListener('click', () => { if (cols > 2) updateGridDimensions(rows, cols - 1); });
    btnColInc.addEventListener('click', () => { if (cols < 10) updateGridDimensions(rows, cols + 1); });

    // Mode select handlers
    btnModeAssign.addEventListener('click', () => {
        if (isDrawing) return;
        activeMode = 'assign';
        btnModeAssign.classList.add('active');
        btnModeBlock.classList.remove('active');
        modeTipEl.textContent = "책상 카드를 눌러 고정(Lock)하거나 배정 후 드래그하여 자리를 교환하세요.";
        renderDesksBoard();
    });

    btnModeBlock.addEventListener('click', () => {
        if (isDrawing) return;
        activeMode = 'block';
        btnModeBlock.classList.add('active');
        btnModeAssign.classList.remove('active');
        modeTipEl.textContent = "책상 카드를 눌러 빈자리/통로 지정(블록 처리)을 할 수 있습니다.";
        renderDesksBoard();
    });

    // --- Info panel calculations ---
    function updateInfoPanel() {
        const activeDesksCount = desks.filter(d => !d.isBlocked).length;
        
        // Vacant open seats
        const lockedCount = desks.filter(d => !d.isBlocked && d.isLocked && d.studentName).length;
        const assignedNames = desks.filter(d => !d.isBlocked && d.studentName).map(d => d.studentName);
        
        // Student unassigned count
        const unassigned = students.filter(name => !assignedNames.includes(name)).length;
        
        unassignedCountEl.textContent = unassigned;
        vacantCountEl.textContent = Math.max(0, activeDesksCount - assignedNames.length);
    }

    // --- Rendering Desks Grid ---
    function renderDesksBoard() {
        desksGridEl.innerHTML = '';
        // Set CSS Grid Variables
        desksGridEl.style.setProperty('--rows', rows);
        desksGridEl.style.setProperty('--cols', cols);

        desks.forEach((desk, idx) => {
            const card = document.createElement('div');
            
            // Build classes based on states
            let cardClasses = ['desk-card'];
            const hasStudent = desk.studentName && desk.studentName.trim() !== '';
            
            if (desk.isBlocked) {
                cardClasses.push('blocked');
            } else if (hasStudent) {
                cardClasses.push('is-flipped');
                if (desk.isLocked) cardClasses.push('locked');
            } else {
                cardClasses.push('vacant');
            }
            
            card.className = cardClasses.join(' ');
            card.dataset.index = idx;
            
            // Enable HTML5 drag only if student assigned & not blocked & not shuffling
            if (hasStudent && !desk.isBlocked && !isDrawing) {
                card.setAttribute('draggable', 'true');
            }

            const rowNum = Math.floor(idx / cols) + 1;
            const colNum = (idx % cols) + 1;

            card.innerHTML = `
                <div class="desk-card-inner">
                    <!-- Front face: Blank chalkboard desk placeholder -->
                    <div class="desk-face desk-front">
                        <span class="desk-front-index">${rowNum}-${colNum}</span>
                        <span class="desk-front-symbol">${desk.isBlocked ? '통로' : '?'}</span>
                    </div>

                    <!-- Back face: Flipped student card -->
                    <div class="desk-face desk-back">
                        <span class="desk-back-index">${rowNum}-${colNum}</span>
                        <span class="desk-student-name">${escapeHtml(desk.studentName || '빈자리')}</span>
                        
                        <!-- Lock state icons -->
                        <span class="desk-lock-badge">🔒</span>
                        ${activeMode === 'assign' && hasStudent ? `
                            <span class="desk-lock-trigger" title="자리 고정/해제">
                                ${desk.isLocked ? '🔒' : '🔓'}
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;

            // Card Click Events
            card.addEventListener('click', (e) => {
                if (isDrawing) return;
                audio.init();

                if (activeMode === 'block') {
                    // Block/Unblock toggle
                    toggleDeskBlocked(idx);
                } else {
                    // Handle clicking the lock button icon
                    const lockTrigger = e.target.closest('.desk-lock-trigger');
                    if (lockTrigger && hasStudent) {
                        e.stopPropagation();
                        toggleDeskLocked(idx);
                    }
                }
            });

            // Drag and Drop events (only active in Assign mode)
            if (activeMode === 'assign' && !isDrawing) {
                setupDragAndDropEvents(card, idx);
            }

            desksGridEl.appendChild(card);
        });
    }

    function toggleDeskBlocked(index) {
        const d = desks[index];
        d.isBlocked = !d.isBlocked;
        
        // If blocked, free the student and lock state
        if (d.isBlocked) {
            d.studentName = '';
            d.isLocked = false;
        }
        
        saveDesksState();
        updateInfoPanel();
        renderDesksBoard();
        showSeatingToast(`${Math.floor(index / cols) + 1}행 ${index % cols + 1}열을 ${d.isBlocked ? '통로로 지정' : '책상으로 복원'}했습니다.`);
    }

    function toggleDeskLocked(index) {
        const d = desks[index];
        d.isLocked = !d.isLocked;
        saveDesksState();
        renderDesksBoard();
        showSeatingToast(`${d.studentName} 학생 자리를 ${d.isLocked ? '고정석🔒으로 등록' : '고정석🔓 해제'}했습니다.`);
    }

    btnClearLocks.addEventListener('click', () => {
        if (isDrawing) return;
        desks.forEach(d => d.isLocked = false);
        saveDesksState();
        renderDesksBoard();
        showSeatingToast("모든 책상의 지정석 고정을 해제했습니다.");
    });

    // --- HTML5 Drag and Drop Seat Swap Logic ---
    let dragSrcIndex = null;

    function setupDragAndDropEvents(cardEl, index) {
        cardEl.addEventListener('dragstart', (e) => {
            dragSrcIndex = index;
            cardEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
        });

        cardEl.addEventListener('dragend', () => {
            cardEl.classList.remove('dragging');
            // Remove any leftover hover highlight
            const hoverCards = document.querySelectorAll('.desk-card.drag-over');
            hoverCards.forEach(c => c.classList.remove('drag-over'));
        });

        cardEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            return false;
        });

        cardEl.addEventListener('dragenter', (e) => {
            e.preventDefault();
            // Block dragging to corridor or self
            if (index !== dragSrcIndex && !desks[index].isBlocked) {
                cardEl.classList.add('drag-over');
            }
        });

        cardEl.addEventListener('dragleave', () => {
            cardEl.classList.remove('drag-over');
        });

        cardEl.addEventListener('drop', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const srcIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
            
            if (srcIdx !== index && !desks[index].isBlocked) {
                swapDesksSeating(srcIdx, index);
            }
        });
    }

    function swapDesksSeating(srcIdx, targetIdx) {
        const src = desks[srcIdx];
        const target = desks[targetIdx];
        
        // Swap Student name and lock status
        const tempName = src.studentName;
        const tempLock = src.isLocked;

        src.studentName = target.studentName;
        src.isLocked = target.isLocked;

        target.studentName = tempName;
        target.isLocked = tempLock;

        saveDesksState();
        updateInfoPanel();
        renderDesksBoard();
        
        // Trigger subtle click sound for feedback
        audio.playChalkScratch();
        
        const srcName = target.studentName || '빈자리';
        const targetName = src.studentName || '빈자리';
        showSeatingToast(`[${srcName}] ↔ [${targetName}] 자리를 맞교환했습니다.`);
    }

    // --- Toast Message Notification ---
    let toastTimeout = null;
    function showSeatingToast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 3000);
    }

    // --- Core Shuffle Seat Allocator Algorithm ---
    btnShuffle.addEventListener('click', (e) => {
        if (isDrawing) return;
        audio.init();

        // 1. Check if student names are filled
        if (students.length === 0) {
            showSeatingToast("학생 명단이 입력되지 않았습니다. 명단을 입력하거나 샘플을 등록하세요.");
            return;
        }

        // 2. Validate open desk seats
        const activeDesks = desks.filter(d => !d.isBlocked);
        if (activeDesks.length === 0) {
            showSeatingToast("배정 가능한 책상이 교실에 없습니다. 통로 블록을 확인해 주세요.");
            return;
        }

        if (activeDesks.length < students.length) {
            showSeatingToast(`배정할 책상 수(${activeDesks.length}석)가 전체 학생 수(${students.length}명)보다 적습니다.`);
            return;
        }

        // Trigger button ripple effect
        createSeatingRipple(e);

        isDrawing = true;
        disableSeatingConfigInputs(true);

        // --- Seating Allocation Algorithm Logic ---
        
        // 1. Check current locked desks
        // If a locked seat contains a student that is STILL in the student names area, pre-allocate them.
        // Otherwise, break/release the lock on that seat.
        const preAllocatedStudents = [];
        
        desks.forEach(d => {
            if (!d.isBlocked && d.isLocked && d.studentName) {
                if (students.includes(d.studentName)) {
                    preAllocatedStudents.push(d.studentName);
                } else {
                    // Student was removed from list, release lock and clear
                    d.isLocked = false;
                    d.studentName = '';
                }
            } else {
                // Not locked, clear current seating name to assign fresh
                d.studentName = '';
            }
        });

        // 2. Filter pool of remaining students
        const remainingStudentsPool = students.filter(name => !preAllocatedStudents.includes(name));

        // 3. Collect remaining vacant active desks
        const vacantDesksList = desks.filter(d => !d.isBlocked && !d.isLocked);

        // 4. Shuffle remaining students (Fisher-Yates)
        const shuffledStudents = [...remainingStudentsPool];
        for (let i = shuffledStudents.length - 1; i > 0; i--) {
            const rIdx = Math.floor(Math.random() * (i + 1));
            const temp = shuffledStudents[i];
            shuffledStudents[i] = shuffledStudents[rIdx];
            shuffledStudents[rIdx] = temp;
        }

        // 5. Allocate remaining students to vacant desks
        vacantDesksList.forEach((desk, idx) => {
            if (idx < shuffledStudents.length) {
                desk.studentName = shuffledStudents[idx];
            } else {
                desk.studentName = ''; // Leaves excess desks vacant
            }
        });

        saveDesksState();

        // --- Wave Reveal Card Flips Animation ---
        // Stagger cards flip sequentially for high drama.
        // Flip row-by-row or stagger card by card. Staggering card-by-card index is gorgeous.
        const totalCards = rows * cols;
        let completedFlips = 0;

        // Reset all active desks to closed card state for dramatic flip reveal
        desks.forEach((desk, idx) => {
            if (!desk.isBlocked) {
                const cardEl = desksGridEl.querySelector(`.desk-card[data-index="${idx}"]`);
                if (cardEl) {
                    cardEl.classList.remove('is-flipped', 'locked');
                    // Add temporary shuffling borders
                    cardEl.classList.add('shuffling');
                }
            }
        });

        // Loop over desks and set stagger timing to flip open
        desks.forEach((desk, idx) => {
            if (desk.isBlocked) return; // skip blocked aisles

            const cardEl = desksGridEl.querySelector(`.desk-card[data-index="${idx}"]`);
            if (!cardEl) return;

            // Stagger duration based on cell coordinates (creates a ripple diagonal wave!)
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const staggerDelay = (r + c) * 120 + 200;

            setTimeout(() => {
                // Trigger chalk scratch sound
                audio.playChalkScratch();

                // Swap in actual name data and flip
                cardEl.classList.remove('shuffling');
                
                const nameEl = cardEl.querySelector('.desk-student-name');
                if (nameEl) {
                    nameEl.textContent = desk.studentName || '빈자리';
                }

                if (desk.studentName) {
                    cardEl.classList.add('is-flipped');
                    if (desk.isLocked) cardEl.classList.add('locked');
                } else {
                    cardEl.classList.add('vacant');
                }

                completedFlips++;
                const activeTotal = desks.filter(d => !d.isBlocked).length;

                // When last card is flipped: finalize
                if (completedFlips === activeTotal) {
                    finalizeSeatingDraw();
                }

            }, staggerDelay);
        });
    });

    function finalizeSeatingDraw() {
        setTimeout(() => {
            audio.playSchoolBell();
            confetti.spawn(130);
        }, 200);

        isDrawing = false;
        disableSeatingConfigInputs(false);
        updateInfoPanel();
        renderDesksBoard(); // redraw stable interactive grid states
        showSeatingToast("새로운 교실 자리 배치가 완료되었습니다! 🔔🏫");
    }

    function disableSeatingConfigInputs(disabled) {
        btnShuffle.disabled = disabled;
        btnClearLocks.disabled = disabled;
        btnExportText.disabled = disabled;
        btnPrint.disabled = disabled;

        btnRowDec.disabled = disabled;
        btnRowInc.disabled = disabled;
        btnColDec.disabled = disabled;
        btnColInc.disabled = disabled;
        btnModeAssign.disabled = disabled;
        btnModeBlock.disabled = disabled;
        btnSampleNames.disabled = disabled;
        themeSelect.disabled = disabled;
        studentNamesArea.disabled = disabled;
    }

    // --- Export Result Options (Print & Copy) ---
    btnPrint.addEventListener('click', () => {
        if (isDrawing) return;
        window.print();
    });

    btnExportText.addEventListener('click', () => {
        if (isDrawing) return;

        // Build a beautiful textual layout diagram
        let exportStr = `🏫 [교실 자리 배치 결과] 🏫\n`;
        exportStr += `-------------------------------\n`;
        exportStr += `             칠 판\n`;
        exportStr += `-------------------------------\n`;

        for (let r = 0; r < rows; r++) {
            let rowNames = [];
            for (let c = 0; c < cols; c++) {
                const desk = desks[r * cols + c];
                if (desk.isBlocked) {
                    rowNames.push("[통 로]");
                } else {
                    const name = desk.studentName ? desk.studentName : "[빈자리]";
                    const lockStr = desk.isLocked ? "🔒" : "";
                    rowNames.push(`${name}${lockStr}`);
                }
            }
            exportStr += `${r + 1}분단: ${rowNames.join("  |  ")}\n`;
        }

        exportStr += `-------------------------------\n`;
        exportStr += `배치일자: ${new Date().toLocaleString('ko-KR')}\n`;

        // Copy to clipboard
        navigator.clipboard.writeText(exportStr)
            .then(() => {
                showSeatingToast("자리 배치도가 클립보드에 문자열로 복사되었습니다!");
            })
            .catch(err => {
                console.error("Copy failed:", err);
                showSeatingToast("클립보드 복사에 실패했습니다.");
            });
    });

    // Helper functions
    function createSeatingRipple(e) {
        const btn = e.currentTarget;
        const ripple = btn.querySelector('.btn-ripple');
        if (!ripple) return;

        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        ripple.classList.remove('animate');
        void ripple.offsetWidth; // trigger reflow
        ripple.style.transform = 'scale(0)';
        ripple.style.transform = '';
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initialize application execution
    initSeatingApp();
});
