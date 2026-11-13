// Audio & Animation Controller for PPMC Swat Explainer

class PPMCExplainerApp {
  constructor() {
    this.currentChapterIndex = 0;
    this.isPlaying = false;
    this.audio = new Audio();
    this.metadata = [];
    this.playbackRate = 1.0;
    this.audioContext = null;
    this.soundEnabled = true;
    this.animFrameId = null;

    this.initElements();
    this.initAudioContext();
    this.loadMetadata();
    this.bindEvents();
  }

  initElements() {
    this.chapterListEl = document.getElementById("chapterList");
    this.sceneTitleEl = document.getElementById("sceneTitle");
    this.sceneSubtitleEl = document.getElementById("sceneSubtitle");
    this.stageSvg = document.getElementById("stageSvg");
    this.captionTextEl = document.getElementById("captionText");
    this.playBtn = document.getElementById("playBtn");
    this.prevBtn = document.getElementById("prevBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.progressBarFill = document.getElementById("progressBarFill");
    this.progressContainer = document.getElementById("progressContainer");
    this.currentTimeEl = document.getElementById("currentTime");
    this.totalTimeEl = document.getElementById("totalTime");
    this.speedSelect = document.getElementById("speedSelect");
    this.audioToggle = document.getElementById("audioToggle");
    this.currentPill = document.getElementById("currentPill");
  }

  initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  // Synthesize Sound Effects
  playSfx(type) {
    if (!this.soundEnabled || !this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const t = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    if (type === "whoosh") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.3);
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === "gavel") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    } else if (type === "chime") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, t + 0.2); // G5
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
    } else if (type === "alert") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(880, t + 0.12);
      osc.frequency.setValueAtTime(440, t + 0.24);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === "water") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(450, t + 0.4);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }

  async loadMetadata() {
    try {
      const res = await fetch("audio/metadata.json");
      this.metadata = await res.json();
      this.renderSidebar();
      this.selectChapter(0, false);
    } catch (err) {
      console.error("Failed to load metadata.json", err);
    }
  }

  renderSidebar() {
    this.chapterListEl.innerHTML = "";
    this.metadata.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = `chapter-item ${index === this.currentChapterIndex ? "active" : ""}`;
      li.innerHTML = `
        <div class="chapter-num">${index === 0 ? "★" : index}</div>
        <div class="chapter-info">
          <div class="chapter-name">${index === 0 ? "Project Profile" : "Chapter " + index}</div>
          <div class="chapter-desc">${item.title.replace(/^Chapter \d+:\s*/, "")}</div>
        </div>
      `;
      li.addEventListener("click", () => this.selectChapter(index, true));
      this.chapterListEl.appendChild(li);
    });
  }

  selectChapter(index, autoPlay = true) {
    if (index < 0 || index >= this.metadata.length) return;
    this.currentChapterIndex = index;
    const cur = this.metadata[index];

    // Update active class in sidebar
    Array.from(this.chapterListEl.children).forEach((li, idx) => {
      li.classList.toggle("active", idx === index);
    });

    this.sceneTitleEl.textContent = cur.title;
    this.sceneSubtitleEl.textContent = cur.subtitle;
    this.currentPill.textContent = index === 0 ? "Overview Profile" : `Chapter ${index} of 9`;
    this.captionTextEl.innerHTML = cur.text;

    this.playSfx("whoosh");

    // Audio setup
    this.audio.src = cur.audio_file;
    this.audio.playbackRate = this.playbackRate;
    this.audio.currentTime = 0;

    this.totalTimeEl.textContent = this.formatTime(cur.duration);
    this.currentTimeEl.textContent = "00:00";
    this.progressBarFill.style.width = "0%";

    this.renderSceneVisuals(index, 0);

    if (autoPlay) {
      this.playAudio();
    } else {
      this.pauseAudio();
    }
  }

  playAudio() {
    this.isPlaying = true;
    this.playBtn.innerHTML = "❚❚";
    this.audio.play().catch((e) => console.log("Audio autoplay prevented", e));
    this.startAnimationLoop();
  }

  pauseAudio() {
    this.isPlaying = false;
    this.playBtn.innerHTML = "▶";
    this.audio.pause();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      this.playAudio();
    }
  }

  prevChapter() {
    if (this.currentChapterIndex > 0) {
      this.selectChapter(this.currentChapterIndex - 1, true);
    }
  }

  nextChapter() {
    if (this.currentChapterIndex < this.metadata.length - 1) {
      this.selectChapter(this.currentChapterIndex + 1, true);
    }
  }

  formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  bindEvents() {
    this.playBtn.addEventListener("click", () => this.togglePlay());
    this.prevBtn.addEventListener("click", () => this.prevChapter());
    this.nextBtn.addEventListener("click", () => this.nextChapter());

    this.speedSelect.addEventListener("change", (e) => {
      this.playbackRate = parseFloat(e.target.value);
      this.audio.playbackRate = this.playbackRate;
    });

    this.audioToggle.addEventListener("click", () => {
      this.soundEnabled = !this.soundEnabled;
      this.audio.muted = !this.soundEnabled;
      this.audioToggle.classList.toggle("active", this.soundEnabled);
      this.audioToggle.innerHTML = this.soundEnabled ? "🔊 Narration: ON" : "🔇 Narration: OFF";
    });

    this.audio.addEventListener("ended", () => {
      if (this.currentChapterIndex < this.metadata.length - 1) {
        this.nextChapter();
      } else {
        this.pauseAudio();
      }
    });

    this.progressContainer.addEventListener("click", (e) => {
      const rect = this.progressContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      if (this.audio.duration) {
        this.audio.currentTime = ratio * this.audio.duration;
      }
    });

    // Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === "ArrowRight") {
        this.nextChapter();
      } else if (e.code === "ArrowLeft") {
        this.prevChapter();
      }
    });
  }

  startAnimationLoop() {
    const update = () => {
      if (!this.isPlaying) return;
      const ct = this.audio.currentTime;
      const dur = this.audio.duration || this.metadata[this.currentChapterIndex].duration || 1;
      const progress = Math.min(1, ct / dur);

      this.progressBarFill.style.width = `${progress * 100}%`;
      this.currentTimeEl.textContent = this.formatTime(ct);

      this.renderSceneVisuals(this.currentChapterIndex, progress, ct);

      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }

  // Procedural SVG Generation for Each Chapter
  renderSceneVisuals(chapterIdx, progress, ct = 0) {
    const svg = this.stageSvg;
    svg.setAttribute("viewBox", "0 0 1000 500");

    let content = "";
    switch (chapterIdx) {
      case 0:
        content = this.getScene0Svg(progress, ct);
        break;
      case 1:
        content = this.getScene1Svg(progress, ct);
        break;
      case 2:
        content = this.getScene2Svg(progress, ct);
        break;
      case 3:
        content = this.getScene3Svg(progress, ct);
        break;
      case 4:
        content = this.getScene4Svg(progress, ct);
        break;
      case 5:
        content = this.getScene5Svg(progress, ct);
        break;
      case 6:
        content = this.getScene6Svg(progress, ct);
        break;
      case 7:
        content = this.getScene7Svg(progress, ct);
        break;
      case 8:
        content = this.getScene8Svg(progress, ct);
        break;
      case 9:
        content = this.getScene9Svg(progress, ct);
        break;
      default:
        content = this.getScene0Svg(progress, ct);
    }
    svg.innerHTML = content;
  }

  // STICK FIGURE BUILDER HELPER
  createStickFigure(x, y, scale = 1, options = {}) {
    const {
      role = "planner", // planner, engineer, judge, villager, woman, inspector
      walk = false,
      gesture = "point", // point, wave, hold, write, observe
      talking = false,
      flip = false,
    } = options;

    const flipAttr = flip ? `transform="translate(${x}, ${y}) scale(${-scale}, ${scale})"` : `transform="translate(${x}, ${y}) scale(${scale})"`;
    const walkBob = walk ? `style="animation: walkBob 0.6s infinite ease-in-out;"` : "";
    const leg1Anim = walk ? `style="animation: legSwing1 0.6s infinite ease-in-out; transform-origin: 0 45px;"` : "";
    const leg2Anim = walk ? `style="animation: legSwing2 0.6s infinite ease-in-out; transform-origin: 0 45px;"` : "";

    let hatOrHair = "";
    let accessory = "";

    if (role === "engineer") {
      hatOrHair = `
        <!-- Yellow Safety Helmet -->
        <path d="M-15 -35 Q 0 -50 15 -35 L 18 -30 L -18 -30 Z" fill="#ffd600" stroke="#f57f17" stroke-width="2"/>
        <line x1="-20" y1="-30" x2="20" y2="-30" stroke="#ffd600" stroke-width="4" stroke-linecap="round"/>
      `;
      accessory = `
        <!-- Blueprint roll / clipboard -->
        <rect x="18" y="-10" width="10" height="26" rx="2" fill="#2979ff" transform="rotate(15 18 -10)"/>
        <line x1="20" y1="-6" x2="26" y2="-6" stroke="#fff" stroke-width="1.5"/>
        <line x1="20" y1="-1" x2="26" y2="-1" stroke="#fff" stroke-width="1.5"/>
      `;
    } else if (role === "judge" || role === "officer") {
      hatOrHair = `
        <!-- Professional hair -->
        <path d="M-13 -36 Q 0 -48 13 -36 Q 0 -40 -13 -36" fill="#37474f"/>
        <!-- Tie -->
        <polygon points="0,-12 -3,-8 0,15 3,-8" fill="#d50000"/>
      `;
      accessory = `
        <!-- Legal Gavel or File -->
        <rect x="18" y="-5" width="14" height="20" rx="2" fill="#eceff1" stroke="#b0bec5"/>
        <line x1="21" y1="0" x2="29" y2="0" stroke="#90a4ae" stroke-width="1.5"/>
        <line x1="21" y1="5" x2="29" y2="5" stroke="#90a4ae" stroke-width="1.5"/>
      `;
    } else if (role === "woman") {
      hatOrHair = `
        <!-- Traditional Swati Shawl/Dupatta -->
        <path d="M-14 -35 Q 0 -45 14 -35 Q 18 10 12 40 Q 0 45 -12 40 Q -18 10 -14 -35" fill="none" stroke="#e91e63" stroke-width="3" stroke-dasharray="2 1"/>
      `;
      accessory = `
        <!-- Water Vessel (Kooza / Ghara) -->
        <ellipse cx="22" cy="10" rx="9" ry="12" fill="#d7ccc8" stroke="#8d6e63" stroke-width="2"/>
        <rect x="18" y="-4" width="8" height="4" rx="1" fill="#8d6e63"/>
      `;
    } else if (role === "inspector") {
      hatOrHair = `
        <!-- Inspector Hard Hat & Badge -->
        <path d="M-14 -34 Q 0 -46 14 -34 Z" fill="#00e676" stroke="#00b0ff" stroke-width="1.5"/>
      `;
      accessory = `
        <!-- Magnifying glass / GPS tablet -->
        <circle cx="25" cy="-2" r="8" fill="none" stroke="#00e5ff" stroke-width="2.5"/>
        <line x1="31" y1="4" x2="40" y2="15" stroke="#00e5ff" stroke-width="3" stroke-linecap="round"/>
      `;
    }

    return `
      <g ${flipAttr} class="stick-figure">
        <g ${walkBob}>
          <!-- Head -->
          <circle cx="0" cy="-26" r="14" fill="#ffecb3" stroke="#ffb300" stroke-width="3"/>
          <!-- Eyes & Smile -->
          <circle cx="4" cy="-28" r="2" fill="#37474f"/>
          <path d="M 0 -22 Q 4 -18 8 -22" fill="none" stroke="#37474f" stroke-width="1.8" stroke-linecap="round"/>
          ${hatOrHair}

          <!-- Torso -->
          <line x1="0" y1="-12" x2="0" y2="45" stroke="#eceff1" stroke-width="4.5" stroke-linecap="round"/>

          <!-- Arms -->
          ${
            gesture === "point"
              ? `
            <line x1="0" y1="-2" x2="28" y2="-18" stroke="#eceff1" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="0" y1="-2" x2="-14" y2="15" stroke="#eceff1" stroke-width="3.5" stroke-linecap="round"/>
          `
              : gesture === "hold"
              ? `
            <line x1="0" y1="-2" x2="16" y2="12" stroke="#eceff1" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="0" y1="-2" x2="-16" y2="12" stroke="#eceff1" stroke-width="3.5" stroke-linecap="round"/>
          `
              : `
            <line x1="0" y1="-2" x2="18" y2="18" stroke="#eceff1" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="0" y1="-2" x2="-18" y2="18" stroke="#eceff1" stroke-width="3.5" stroke-linecap="round"/>
          `
          }

          ${accessory}

          <!-- Legs -->
          <g ${leg1Anim}>
            <line x1="0" y1="45" x2="14" y2="90" stroke="#eceff1" stroke-width="4" stroke-linecap="round"/>
          </g>
          <g ${leg2Anim}>
            <line x1="0" y1="45" x2="-14" y2="90" stroke="#eceff1" stroke-width="4" stroke-linecap="round"/>
          </g>

          <!-- Speech bubble if talking -->
          ${
            talking
              ? `
            <g transform="translate(18, -60)">
              <rect x="0" y="0" width="55" height="26" rx="8" fill="#1e293b" stroke="#00e5ff" stroke-width="1.5"/>
              <polygon points="6,26 14,26 4,34" fill="#1e293b"/>
              <text x="8" y="16" fill="#00e5ff" font-size="10" font-weight="700">PPMC</text>
              <circle cx="44" cy="13" r="3" fill="#00e676" class="pulse-circle"/>
            </g>
          `
              : ""
          }
        </g>
      </g>
    `;
  }

  // SCENE 0: PROJECT PROFILE & OVERVIEW
  getScene0Svg(p, ct) {
    const stationCount = Math.min(42, Math.floor(p * 45));
    const peopleCount = Math.min(150, Math.floor(p * 160));

    return `
      <!-- Mountain Sky Background -->
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0a192f"/>
          <stop offset="100%" stop-color="#112240"/>
        </linearGradient>
        <linearGradient id="mountGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#233554"/>
          <stop offset="100%" stop-color="#0d1b2a"/>
        </linearGradient>
      </defs>

      <rect width="1000" height="500" fill="url(#skyGrad)"/>

      <!-- Swat Mountains -->
      <polygon points="0,320 180,140 380,320" fill="url(#mountGrad1)" opacity="0.8"/>
      <polygon points="180,140 220,180 140,180" fill="#ffffff" opacity="0.85"/> <!-- Snow peak -->
      
      <polygon points="260,340 480,110 720,340" fill="url(#mountGrad1)" opacity="0.9"/>
      <polygon points="480,110 530,160 430,160" fill="#ffffff" opacity="0.9"/>

      <polygon points="600,350 820,160 1000,350" fill="url(#mountGrad1)" opacity="0.8"/>
      <polygon points="820,160 860,200 780,200" fill="#ffffff" opacity="0.85"/>

      <!-- River Swat Valley -->
      <path d="M 120 400 Q 300 370 500 420 T 900 400" fill="none" stroke="#00b4d8" stroke-width="18" opacity="0.75"/>
      <path d="M 120 400 Q 300 370 500 420 T 900 400" fill="none" stroke="#90e0ef" stroke-width="4" class="animated-water"/>

      <!-- Solar Panel Array on Hill -->
      <g transform="translate(620, 220)">
        <rect x="0" y="0" width="80" height="40" rx="3" fill="#1565c0" stroke="#64b5f6" stroke-width="2" transform="skewX(-15)"/>
        <line x1="26" y1="0" x2="26" y2="40" stroke="#90caf9" stroke-width="1.5" transform="skewX(-15)"/>
        <line x1="53" y1="0" x2="53" y2="40" stroke="#90caf9" stroke-width="1.5" transform="skewX(-15)"/>
        <line x1="0" y1="20" x2="80" y2="20" stroke="#90caf9" stroke-width="1.5" transform="skewX(-15)"/>
        <!-- Sun Rays -->
        <circle cx="110" cy="-30" r="18" fill="#ffd600" class="pulse-circle"/>
        <line x1="85" y1="-10" x2="70" y2="5" stroke="#ffeb3b" stroke-width="2"/>
        <line x1="95" y1="0" x2="85" y2="15" stroke="#ffeb3b" stroke-width="2"/>
      </g>

      <!-- Water Filtration Tower -->
      <g transform="translate(480, 240)">
        <rect x="0" y="0" width="50" height="70" rx="4" fill="#37474f" stroke="#00e5ff" stroke-width="2"/>
        <text x="25" y="24" fill="#00e5ff" font-size="11" font-weight="700" text-anchor="middle">PHED</text>
        <circle cx="25" cy="45" r="12" fill="#00b4d8"/>
        <text x="25" y="49" fill="#fff" font-size="10" font-weight="800" text-anchor="middle">H₂O</text>
        <!-- Gravity Piped Outflow -->
        <path d="M 25 70 L 25 110 L 150 110" fill="none" stroke="#00e5ff" stroke-width="5" class="animated-water"/>
      </g>

      <!-- Ground Horizon -->
      <rect x="0" y="380" width="1000" height="120" fill="#0f172a"/>
      <line x1="0" y1="380" x2="1000" y2="380" stroke="#1e293b" stroke-width="3"/>

      <!-- Stick Figures in Foreground -->
      ${this.createStickFigure(140, 310, 1.1, { role: "engineer", walk: true, gesture: "point", talking: true })}
      ${this.createStickFigure(260, 310, 1.0, { role: "planner", walk: false, gesture: "hold" })}
      ${this.createStickFigure(780, 310, 1.0, { role: "woman", walk: false, gesture: "hold" })}
      ${this.createStickFigure(840, 320, 0.9, { role: "villager", walk: false, gesture: "point", flip: true })}

      <!-- Central Information HUD Cards -->
      <g transform="translate(60, 40)">
        <!-- Project Title Badge -->
        <rect x="0" y="0" width="460" height="65" rx="10" fill="rgba(15, 23, 42, 0.92)" stroke="#00e5ff" stroke-width="1.5"/>
        <text x="20" y="26" fill="#00e5ff" font-size="13" font-weight="800" letter-spacing="1">PROJECT PROFILE (UPPER SWAT)</text>
        <text x="20" y="48" fill="#ffffff" font-size="14" font-weight="700">Rural Gravity-Solar Drinking Water & Watershed Scheme</text>

        <!-- KPI 1: Capital Cost -->
        <g transform="translate(0, 80)">
          <rect x="0" y="0" width="145" height="60" rx="8" fill="rgba(18, 24, 38, 0.9)" stroke="#ffb300" stroke-width="1.2"/>
          <text x="14" y="22" fill="#8e9db7" font-size="10" font-weight="600">ESTIMATED COST</text>
          <text x="14" y="46" fill="#ffb300" font-size="18" font-weight="800">Rs. 1,200 M</text>
        </g>

        <!-- KPI 2: Target Population -->
        <g transform="translate(155, 80)">
          <rect x="0" y="0" width="145" height="60" rx="8" fill="rgba(18, 24, 38, 0.9)" stroke="#00e676" stroke-width="1.2"/>
          <text x="14" y="22" fill="#8e9db7" font-size="10" font-weight="600">BENEFICIARIES</text>
          <text x="14" y="46" fill="#00e676" font-size="18" font-weight="800">${peopleCount},000 Pop</text>
        </g>

        <!-- KPI 3: Filtration Stations -->
        <g transform="translate(310, 80)">
          <rect x="0" y="0" width="150" height="60" rx="8" fill="rgba(18, 24, 38, 0.9)" stroke="#00b4d8" stroke-width="1.2"/>
          <text x="14" y="22" fill="#8e9db7" font-size="10" font-weight="600">TARGET STATIONS</text>
          <text x="14" y="46" fill="#00b4d8" font-size="18" font-weight="800">${stationCount} Units</text>
        </g>
      </g>
    `;
  }

  // SCENE 1: CONSTITUTIONAL & PFM ACT FOUNDATIONS
  getScene1Svg(p, ct) {
    const gateOpen = p > 0.6;
    return `
      <!-- Background -->
      <rect width="1000" height="500" fill="#0c101b"/>
      
      <!-- Architectural Pillars of State -->
      <g stroke="#1e293b" stroke-width="3">
        <line x1="80" y1="60" x2="80" y2="400"/>
        <line x1="100" y1="60" x2="100" y2="400"/>
        <line x1="900" y1="60" x2="900" y2="400"/>
        <line x1="920" y1="60" x2="920" y2="400"/>
      </g>
      <rect x="0" y="400" width="1000" height="100" fill="#070a12"/>

      <!-- Centerpiece: Constitution of Pakistan -->
      <g transform="translate(180, 70)">
        <rect x="0" y="0" width="280" height="300" rx="12" fill="#1e293b" stroke="#ffd600" stroke-width="2.5"/>
        <rect x="15" y="15" width="250" height="270" rx="8" fill="#0f172a" stroke="#334155"/>
        <!-- Islamic Crescent & Star Emblem -->
        <circle cx="140" cy="65" r="24" fill="#ffd600"/>
        <circle cx="148" cy="65" r="20" fill="#0f172a"/>
        <polygon points="144,52 147,60 156,60 149,65 152,73 144,68 136,73 139,65 132,60 141,60" fill="#ffd600"/>

        <text x="140" y="115" fill="#ffd600" font-size="14" font-weight="800" text-anchor="middle">CONSTITUTION OF PAKISTAN</text>
        <text x="140" y="135" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">Principles of Policy</text>

        <!-- Article 37 & 38 Badges -->
        <rect x="30" y="155" width="220" height="50" rx="6" fill="rgba(0, 229, 255, 0.12)" stroke="#00e5ff" stroke-width="1.2"/>
        <text x="40" y="176" fill="#00e5ff" font-size="12" font-weight="800">ARTICLE 37</text>
        <text x="40" y="194" fill="#e2e8f0" font-size="11">Promotion of Social Justice</text>

        <rect x="30" y="215" width="220" height="55" rx="6" fill="rgba(0, 230, 118, 0.12)" stroke="#00e676" stroke-width="1.2"/>
        <text x="40" y="236" fill="#00e676" font-size="12" font-weight="800">ARTICLE 38</text>
        <text x="40" y="254" fill="#e2e8f0" font-size="11">Eradication of Regional Disparity</text>
      </g>

      <!-- PFM Act 2019 Gatekeeper Section -->
      <g transform="translate(540, 70)">
        <rect x="0" y="0" width="380" height="300" rx="12" fill="#1e293b" stroke="#00b0ff" stroke-width="2"/>
        <text x="24" y="34" fill="#00b0ff" font-size="15" font-weight="800">KP PFM ACT 2019 COMPLIANCE</text>
        <text x="24" y="54" fill="#94a3b8" font-size="12">Section 14: Project Life Cycle Rules</text>

        <!-- Section 14(1): No Shortcuts -->
        <g transform="translate(20, 75)">
          <rect x="0" y="0" width="340" height="85" rx="8" fill="#0f172a" stroke="#ff3d00" stroke-width="1.5"/>
          <text x="16" y="26" fill="#ff3d00" font-size="13" font-weight="800">SECTION 14(1): FORMAL PROJECT CYCLE</text>
          <text x="16" y="48" fill="#e2e8f0" font-size="11">Prohibits arbitrary shortcuts or un-vetted approvals.</text>
          <text x="16" y="68" fill="#64748b" font-size="11">Must traverse identification → appraisal → sanction.</text>
          <circle cx="310" cy="42" r="16" fill="rgba(255, 61, 0, 0.2)" stroke="#ff3d00" stroke-width="2"/>
          <text x="310" y="47" fill="#ff3d00" font-size="14" font-weight="900" text-anchor="middle">✕</text>
        </g>

        <!-- Section 14(2): Mandatory Cost-Benefit Analysis -->
        <g transform="translate(20, 180)">
          <rect x="0" y="0" width="340" height="95" rx="8" fill="#0f172a" stroke="#00e676" stroke-width="1.5"/>
          <text x="16" y="24" fill="#00e676" font-size="13" font-weight="800">SECTION 14(2): STATUTORY THRESHOLD</text>
          <text x="16" y="44" fill="#e2e8f0" font-size="11">Capital cost exceeds provincial threshold (Rs. 1.2B).</text>
          <text x="16" y="64" fill="#ffd600" font-size="11" font-weight="700">MANDATORY: Socio-Economic Cost-Benefit Analysis</text>
          <circle cx="310" cy="45" r="16" fill="rgba(0, 230, 118, 0.2)" stroke="#00e676" stroke-width="2"/>
          <text x="310" y="50" fill="#00e676" font-size="14" font-weight="900" text-anchor="middle">✓</text>
        </g>
      </g>

      <!-- Stick Figure Legal Auditor / Planner -->
      ${this.createStickFigure(110, 310, 1.15, { role: "judge", walk: false, gesture: "point", talking: true })}
    `;
  }

  // SCENE 2: PLANNING MACHINERY & SANCTIONING ROUTE
  getScene2Svg(p, ct) {
    const isPdwpHit = p > 0.45;
    const isIpasIssued = p > 0.75;

    return `
      <rect width="1000" height="500" fill="#090d16"/>
      <rect x="0" y="420" width="1000" height="80" fill="#04060a"/>

      <!-- Multi-tier Ladder of Approval Hierarchy -->
      <g transform="translate(70, 40)">
        <text x="0" y="24" fill="#00e5ff" font-size="16" font-weight="800">MULTI-TIER SANCTIONING ELEVATOR</text>

        <!-- Tier 1: TDC (Tehsil Matta & Bahrain) -->
        <g transform="translate(0, 50)">
          <rect x="0" y="0" width="380" height="55" rx="8" fill="#131d2e" stroke="#475569" stroke-width="1.5"/>
          <circle cx="30" cy="27" r="14" fill="#1e293b"/>
          <text x="30" y="32" fill="#94a3b8" font-size="12" font-weight="800" text-anchor="middle">1</text>
          <text x="60" y="24" fill="#e2e8f0" font-size="12" font-weight="700">Tehsil Dev Committees (TDCs)</text>
          <text x="60" y="42" fill="#64748b" font-size="10">Identified rural deficit in Matta & Bahrain valleys</text>
          <text x="350" y="32" fill="#00e676" font-size="14" font-weight="900">✓</text>
        </g>

        <!-- Tier 2: DDC (District Dev Committee - DC Swat) -->
        <g transform="translate(0, 120)">
          <rect x="0" y="0" width="380" height="60" rx="8" fill="#131d2e" stroke="#ef4444" stroke-width="1.5"/>
          <circle cx="30" cy="30" r="14" fill="#1e293b"/>
          <text x="30" y="35" fill="#ef4444" font-size="12" font-weight="800" text-anchor="middle">2</text>
          <text x="60" y="24" fill="#e2e8f0" font-size="12" font-weight="700">District Dev Committee (DDC - DC Swat)</text>
          <text x="60" y="42" fill="#f87171" font-size="10">Sanction Limit: Rs. 50M | Project: Rs. 1,200M (EXCEEDED!)</text>
          <text x="350" y="35" fill="#ef4444" font-size="11" font-weight="800">ESCALATE ↑</text>
        </g>

        <!-- Tier 3: DDWP (Departmental DWP) -->
        <g transform="translate(0, 195)">
          <rect x="0" y="0" width="380" height="60" rx="8" fill="#131d2e" stroke="#ef4444" stroke-width="1.5"/>
          <circle cx="30" cy="30" r="14" fill="#1e293b"/>
          <text x="30" y="35" fill="#ef4444" font-size="12" font-weight="800" text-anchor="middle">3</text>
          <text x="60" y="24" fill="#e2e8f0" font-size="12" font-weight="700">Departmental DWP (DDWP - PHED)</text>
          <text x="60" y="42" fill="#f87171" font-size="10">Sanction Limit: Rs. 200M | Cost: Rs. 1,200M (EXCEEDED!)</text>
          <text x="350" y="35" fill="#ef4444" font-size="11" font-weight="800">ESCALATE ↑</text>
        </g>

        <!-- Tier 4: PDWP (Provincial Dev Working Party) -->
        <g transform="translate(0, 270)">
          <rect x="0" y="0" width="380" height="85" rx="10" fill="${isPdwpHit ? "rgba(0, 230, 118, 0.15)" : "#131d2e"}" stroke="${isPdwpHit ? "#00e676" : "#00b0ff"}" stroke-width="2.5"/>
          <circle cx="30" cy="35" r="16" fill="${isPdwpHit ? "#00e676" : "#00b0ff"}"/>
          <text x="30" y="41" fill="#000" font-size="13" font-weight="900" text-anchor="middle">4</text>
          <text x="60" y="26" fill="#00e676" font-size="13" font-weight="800">PDWP (Chair: ACS Development KP)</text>
          <text x="60" y="46" fill="#e2e8f0" font-size="11" font-weight="600">Competent Sanctioning Authority: Rs. 1,200 Million</text>
          <text x="60" y="66" fill="#94a3b8" font-size="10">Full Provincial ADP Allocation Jurisdiction</text>
          ${isPdwpHit ? `<text x="320" y="55" fill="#00e676" font-size="18" font-weight="900">SANCTION</text>` : ""}
        </g>
      </g>

      <!-- Right Side: Federal Check & Digital Registration (i-PAS) -->
      <g transform="translate(520, 60)">
        <!-- Federal Decision Tree Box -->
        <rect x="0" y="0" width="410" height="150" rx="10" fill="#131d2e" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="28" fill="#ffd600" font-size="13" font-weight="800">FEDERAL / PROVINCIAL FINANCING RULE</text>
        
        <path d="M 40 50 L 180 50 L 180 80" fill="none" stroke="#64748b" stroke-width="2"/>
        <path d="M 180 50 L 330 50 L 330 80" fill="none" stroke="#64748b" stroke-width="2"/>

        <g transform="translate(20, 80)">
          <rect x="0" y="0" width="160" height="55" rx="6" fill="#0f172a" stroke="#00e676"/>
          <text x="12" y="22" fill="#00e676" font-size="11" font-weight="700">100% Provincial ADP</text>
          <text x="12" y="40" fill="#e2e8f0" font-size="10">PDWP Final Sanction</text>
        </g>

        <g transform="translate(210, 80)">
          <rect x="0" y="0" width="180" height="55" rx="6" fill="#0f172a" stroke="#64748b"/>
          <text x="12" y="22" fill="#94a3b8" font-size="11" font-weight="700">Federal/Foreign Share</text>
          <text x="12" y="40" fill="#cbd5e1" font-size="10">Recommends to CDWP/ECNEC</text>
        </g>

        <!-- Digital i-PAS Registration Card -->
        <g transform="translate(0, 180)">
          <rect x="0" y="0" width="410" height="155" rx="10" fill="#0f172a" stroke="${isIpasIssued ? "#00e5ff" : "#334155"}" stroke-width="2"/>
          <text x="24" y="32" fill="#00e5ff" font-size="14" font-weight="800">DIGITAL REGISTRATION: i-PAS SYSTEM</text>
          <text x="24" y="52" fill="#94a3b8" font-size="11">Intelligent Project Automation System (Government of KP)</text>

          <!-- QR & Barcode Symbol -->
          <g transform="translate(24, 70)">
            <rect x="0" y="0" width="60" height="60" fill="#1e293b" stroke="#00e5ff" stroke-width="1.5"/>
            <rect x="6" y="6" width="18" height="18" fill="#00e5ff"/>
            <rect x="36" y="6" width="18" height="18" fill="#00e5ff"/>
            <rect x="6" y="36" width="18" height="18" fill="#00e5ff"/>
            <rect x="36" y="36" width="8" height="8" fill="#00e5ff"/>
          </g>

          <g transform="translate(100, 75)">
            <text x="0" y="16" fill="#94a3b8" font-size="10">UNIQUE TRACKING ID:</text>
            <text x="0" y="38" fill="#00e5ff" font-size="16" font-weight="800" font-family="monospace">KP-2022-PHED-SWAT-042</text>
            <text x="0" y="55" fill="#00e676" font-size="10" font-weight="600">✓ Digital Life-Cycle Tracking Activated</text>
          </g>
        </g>
      </g>

      <!-- Additional Chief Secretary Figure at Desk -->
      ${this.createStickFigure(440, 310, 1.2, { role: "judge", gesture: "point", talking: true })}
    `;
  }

  // SCENE 3: PROJECT IDENTIFICATION & CONCEPT CLEARANCE
  getScene3Svg(p, ct) {
    const isPcccCleared = p > 0.65;

    return `
      <rect width="1000" height="500" fill="#0a0f1d"/>
      <rect x="0" y="410" width="1000" height="90" fill="#050811"/>

      <!-- Left Column: Diagnostic Studies & SDG Scorecard -->
      <g transform="translate(60, 50)">
        <text x="0" y="22" fill="#00e5ff" font-size="15" font-weight="800">1. EVIDENCE-BASED IDENTIFICATION</text>

        <!-- Card 1: Diagnostic Survey -->
        <g transform="translate(0, 45)">
          <rect x="0" y="0" width="390" height="110" rx="8" fill="#131b2e" stroke="#00e5ff" stroke-width="1.5"/>
          <text x="18" y="28" fill="#00e5ff" font-size="13" font-weight="700">Sector Diagnostic Studies (PHED)</text>
          <text x="18" y="52" fill="#e2e8f0" font-size="11">Lab testing of valley natural springs & dug wells:</text>
          <text x="18" y="74" fill="#ff3d00" font-size="12" font-weight="800">⚠ Severe E-Coli & Waterborne Pathogen Contamination</text>
          <text x="18" y="94" fill="#94a3b8" font-size="10">68% of existing rural sources unfit for human consumption</text>
        </g>

        <!-- Card 2: Swat SDG Scorecard -->
        <g transform="translate(0, 175)">
          <rect x="0" y="0" width="390" height="110" rx="8" fill="#131b2e" stroke="#ffd600" stroke-width="1.5"/>
          <text x="18" y="28" fill="#ffd600" font-size="13" font-weight="700">District Swat SDG Scorecard</text>
          <text x="18" y="52" fill="#e2e8f0" font-size="11">Planning & Development Dept Empirical Metrics:</text>
          <text x="18" y="74" fill="#ffb300" font-size="12" font-weight="800">Child Stunting Rate: 41% (Critical Health Deficit)</text>
          <text x="18" y="94" fill="#94a3b8" font-size="10">Target Valleys: Matta & Bahrain lack piped clean water grid</text>
        </g>
      </g>

      <!-- Right Column: PCCC Gate & Annexure 3-C -->
      <g transform="translate(510, 50)">
        <text x="0" y="22" fill="#00e676" font-size="15" font-weight="800">2. PROVINCIAL CONCEPT CLEARANCE (PCCC)</text>

        <rect x="0" y="45" width="430" height="240" rx="10" fill="#131b2e" stroke="${isPcccCleared ? "#00e676" : "#00b0ff"}" stroke-width="2"/>
        <text x="24" y="76" fill="#ffffff" font-size="14" font-weight="700">Annexure 3-C: Project Concept Form</text>
        <text x="24" y="96" fill="#94a3b8" font-size="11">Pre-investment gate before hiring consultants or spending funds</text>

        <!-- Three PCCC Evaluation Filters -->
        <g transform="translate(24, 115)">
          <!-- Filter 1 -->
          <circle cx="10" cy="10" r="10" fill="#00e676"/>
          <text x="10" y="14" fill="#000" font-size="11" font-weight="900" text-anchor="middle">✓</text>
          <text x="32" y="14" fill="#e2e8f0" font-size="12" font-weight="600">Alignment with Provincial PAMframe</text>

          <!-- Filter 2 -->
          <circle cx="10" cy="40" r="10" fill="#00e676"/>
          <text x="10" y="44" fill="#000" font-size="11" font-weight="900" text-anchor="middle">✓</text>
          <text x="32" y="44" fill="#e2e8f0" font-size="12" font-weight="600">Zero Duplication with Irrigation Projects</text>

          <!-- Filter 3 -->
          <circle cx="10" cy="70" r="10" fill="#00e676"/>
          <text x="10" y="74" fill="#000" font-size="11" font-weight="900" text-anchor="middle">✓</text>
          <text x="32" y="74" fill="#e2e8f0" font-size="12" font-weight="600">Long-term O&M Financing Feasibility Assured</text>
        </g>

        <!-- PCCC Clearance Stamp -->
        ${
          isPcccCleared
            ? `
          <g transform="translate(190, 210)" class="stamp-effect">
            <rect x="0" y="0" width="210" height="55" rx="6" fill="rgba(0, 230, 118, 0.25)" stroke="#00e676" stroke-width="3" stroke-dasharray="4 2"/>
            <text x="105" y="26" fill="#00e676" font-size="13" font-weight="900" text-anchor="middle">PCCC CLEARED</text>
            <text x="105" y="44" fill="#ffffff" font-size="10" font-weight="700" text-anchor="middle">Greenlight PC-II Feasibility</text>
          </g>
        `
            : `
          <g transform="translate(190, 215)">
            <text x="105" y="26" fill="#ffd600" font-size="12" font-weight="700" text-anchor="middle">Under PCCC Scrutiny...</text>
          </g>
        `
        }
      </g>

      <!-- Stick Figure Scientist & Lead Planner -->
      ${this.createStickFigure(180, 310, 1.1, { role: "engineer", walk: false, gesture: "point" })}
      ${this.createStickFigure(440, 310, 1.15, { role: "planner", walk: false, gesture: "point", talking: true })}
    `;
  }

  // SCENE 4: PROJECT PREPARATION, FEASIBILITY & COSTING STANDARDS
  getScene4Svg(p, ct) {
    const isCostingComplete = p > 0.5;

    return `
      <rect width="1000" height="500" fill="#0c1222"/>
      <rect x="0" y="420" width="1000" height="80" fill="#060913"/>

      <!-- Feasibility PC-II Gate Banner -->
      <g transform="translate(60, 30)">
        <rect x="0" y="0" width="880" height="45" rx="8" fill="#1e293b" stroke="#00e5ff" stroke-width="1.5"/>
        <text x="20" y="28" fill="#00e5ff" font-size="12" font-weight="800">STAGE A: PC-II MANDATORY FEASIBILITY</text>
        <text x="320" y="28" fill="#e2e8f0" font-size="12">Cost (Rs. 1.2B) exceeds statutory threshold of Rs. 500M</text>
        <rect x="740" y="8" width="120" height="28" rx="14" fill="rgba(0, 230, 118, 0.2)" stroke="#00e676"/>
        <text x="800" y="26" fill="#00e676" font-size="11" font-weight="800" text-anchor="middle">KPPRA Firm Hired</text>
      </g>

      <!-- Cost Formula Pipeline Box -->
      <g transform="translate(60, 95)">
        <rect x="0" y="0" width="880" height="160" rx="12" fill="#131c31" stroke="#00b0ff" stroke-width="2"/>
        <text x="24" y="30" fill="#ffffff" font-size="14" font-weight="800">RIGID COSTING FORMULA (MANUAL CHAPTER 4)</text>
        <text x="24" y="52" fill="#00e5ff" font-size="13" font-family="monospace">Total Capital Cost = Base Cost + Physical Contingency (3%) + Price Contingency</text>

        <!-- Base Cost Box -->
        <g transform="translate(24, 70)">
          <rect x="0" y="0" width="220" height="70" rx="8" fill="#0f172a" stroke="#2979ff" stroke-width="1.5"/>
          <text x="14" y="24" fill="#2979ff" font-size="11" font-weight="700">BASE CIVIL & EQUIPMENT</text>
          <text x="14" y="48" fill="#ffffff" font-size="16" font-weight="800">Rs. 1,070.0 M</text>
          <text x="14" y="62" fill="#64748b" font-size="9">Market Rate System (MRS)</text>
        </g>

        <text x="260" y="112" fill="#00e5ff" font-size="22" font-weight="900">+</text>

        <!-- Physical Contingency Box -->
        <g transform="translate(285, 70)">
          <rect x="0" y="0" width="260" height="70" rx="8" fill="#0f172a" stroke="#ffb300" stroke-width="1.5"/>
          <text x="14" y="24" fill="#ffb300" font-size="11" font-weight="700">PHYSICAL CONTINGENCY (3%)</text>
          <text x="14" y="48" fill="#ffffff" font-size="16" font-weight="800">Rs. 32.1 M</text>
          <text x="14" y="62" fill="#ffb300" font-size="9">Underground rock strata only (No new buildings!)</text>
        </g>

        <text x="560" y="112" fill="#00e5ff" font-size="22" font-weight="900">+</text>

        <!-- Financial Price Contingency Box -->
        <g transform="translate(585, 70)">
          <rect x="0" y="0" width="270" height="70" rx="8" fill="#0f172a" stroke="#d500f9" stroke-width="1.5"/>
          <text x="14" y="24" fill="#d500f9" font-size="11" font-weight="700">PRICE CONTINGENCY (INFLATION)</text>
          <text x="14" y="48" fill="#ffffff" font-size="16" font-weight="800">Rs. 97.9 M</text>
          <text x="14" y="62" fill="#d500f9" font-size="9">6-8% compounded inflation over 3 years</text>
        </g>
      </g>

      <!-- 3-Year Financial Phasing Bar Chart -->
      <g transform="translate(60, 275)">
        <rect x="0" y="0" width="560" height="130" rx="10" fill="#131c31" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="26" fill="#00e676" font-size="13" font-weight="800">3-YEAR FINANCIAL PHASING</text>

        <!-- Year 1 Bar -->
        <g transform="translate(20, 42)">
          <text x="0" y="15" fill="#94a3b8" font-size="11">Year 1: Land & Intake</text>
          <rect x="150" y="2" width="116" height="18" rx="4" fill="#2979ff"/>
          <text x="275" y="15" fill="#ffffff" font-size="11" font-weight="700">Rs. 350 M</text>
        </g>

        <!-- Year 2 Bar -->
        <g transform="translate(20, 68)">
          <text x="0" y="15" fill="#94a3b8" font-size="11">Year 2: Mains & Solar</text>
          <rect x="150" y="2" width="183" height="18" rx="4" fill="#00e5ff"/>
          <text x="345" y="15" fill="#ffffff" font-size="11" font-weight="700">Rs. 550 M</text>
        </g>

        <!-- Year 3 Bar -->
        <g transform="translate(20, 94)">
          <text x="0" y="15" fill="#94a3b8" font-size="11">Year 3: Metering & Testing</text>
          <rect x="150" y="2" width="100" height="18" rx="4" fill="#00e676"/>
          <text x="260" y="15" fill="#ffffff" font-size="11" font-weight="700">Rs. 300 M</text>
        </g>
      </g>

      <!-- Right Seal: Statutory Certification -->
      <g transform="translate(640, 275)">
        <rect x="0" y="0" width="300" height="130" rx="10" fill="#0f172a" stroke="#ffd600" stroke-width="1.5"/>
        <text x="20" y="26" fill="#ffd600" font-size="12" font-weight="800">STATUTORY CERTIFICATION</text>
        <text x="20" y="46" fill="#e2e8f0" font-size="10">Certified field verified & realistic costing:</text>
        
        <g transform="translate(20, 60)">
          <text x="0" y="16" fill="#94a3b8" font-size="10">Executive Engineer, PHED Swat</text>
          <text x="0" y="32" fill="#00e5ff" font-size="11" font-weight="700">✓ Signed & Verified</text>
          <text x="0" y="50" fill="#94a3b8" font-size="10">Administrative Secretary PHED</text>
          <text x="0" y="66" fill="#00e676" font-size="11" font-weight="700">✓ Signed & Countersigned</text>
        </g>
      </g>
    `;
  }

  // SCENE 5: PROJECT APPRAISAL & ECONOMIC CONVERSION
  getScene5Svg(p, ct) {
    const isApproved = p > 0.7;

    return `
      <rect width="1000" height="500" fill="#0b101c"/>
      <rect x="0" y="420" width="1000" height="80" fill="#050810"/>

      <!-- Header: 6 Appraisal Dimensions Hexagons -->
      <g transform="translate(60, 25)">
        <text x="0" y="20" fill="#00e5ff" font-size="14" font-weight="800">THE 6 APPRAISAL DIMENSIONS (P&D DEPARTMENT)</text>
        
        <g transform="translate(0, 32)">
          ${["Technical", "Institutional", "Environmental", "Financial", "Social", "Economic"]
            .map(
              (dim, i) => `
            <g transform="translate(${i * 148}, 0)">
              <rect x="0" y="0" width="138" height="34" rx="6" fill="#17223b" stroke="#00e5ff" stroke-width="1.2"/>
              <text x="69" y="21" fill="#e2e8f0" font-size="11" font-weight="700" text-anchor="middle">${dim}</text>
            </g>
          `
            )
            .join("")}
        </g>
      </g>

      <!-- Center Left: Shadow Pricing Economic Conversion -->
      <g transform="translate(60, 110)">
        <rect x="0" y="0" width="450" height="290" rx="10" fill="#131c31" stroke="#3b82f6" stroke-width="2"/>
        <text x="24" y="30" fill="#3b82f6" font-size="14" font-weight="800">ECONOMIC CONVERSION (SHADOW PRICES)</text>
        <text x="24" y="50" fill="#94a3b8" font-size="11">Market prices include distortionary taxes and subsidies</text>

        <!-- Standard Conversion Factor (SCF = 0.90) -->
        <g transform="translate(20, 68)">
          <rect x="0" y="0" width="410" height="95" rx="8" fill="#0f172a" stroke="#00e5ff" stroke-width="1.2"/>
          <text x="16" y="24" fill="#00e5ff" font-size="12" font-weight="800">STANDARD CONVERSION FACTOR (SCF = 0.90)</text>
          <text x="16" y="44" fill="#cbd5e1" font-size="11">Domestic Materials (Cement, PVC): Market = Rs. 600M</text>
          <text x="16" y="66" fill="#ffffff" font-size="14" font-weight="800">Economic Cost: Rs. 600M × 0.90 = Rs. 540 Million</text>
          <text x="16" y="84" fill="#00e676" font-size="10">Deducts 10% indirect taxes and markups</text>
        </g>

        <!-- Shadow Wage Rate Factor (SWRF = 0.80) -->
        <g transform="translate(20, 175)">
          <rect x="0" y="0" width="410" height="95" rx="8" fill="#0f172a" stroke="#ffd600" stroke-width="1.2"/>
          <text x="16" y="24" fill="#ffd600" font-size="12" font-weight="800">SHADOW WAGE RATE FACTOR (SWRF = 0.80)</text>
          <text x="16" y="44" fill="#cbd5e1" font-size="11">Unskilled Rural Labor: Market Wage = Rs. 100M</text>
          <text x="16" y="66" fill="#ffffff" font-size="14" font-weight="800">Economic Cost: Rs. 100M × 0.80 = Rs. 80 Million</text>
          <text x="16" y="84" fill="#00e676" font-size="10">Accounts for true rural underemployment</text>
        </g>
      </g>

      <!-- Center Right: Economic Return vs Decision Rule -->
      <g transform="translate(530, 110)">
        <rect x="0" y="0" width="410" height="290" rx="10" fill="#131c31" stroke="${isApproved ? "#00e676" : "#ffb300"}" stroke-width="2"/>
        <text x="24" y="30" fill="#00e676" font-size="14" font-weight="800">APPRAISAL DECISION RULE (10% DISCOUNT RATE)</text>

        <!-- FIRR vs EIRR Gauge -->
        <g transform="translate(24, 60)">
          <rect x="0" y="0" width="170" height="75" rx="8" fill="#0f172a" stroke="#ff3d00"/>
          <text x="14" y="24" fill="#ff3d00" font-size="11" font-weight="700">FINANCIAL IRR (FIRR)</text>
          <text x="14" y="52" fill="#ff3d00" font-size="22" font-weight="900">4.2 %</text>
          <text x="14" y="68" fill="#94a3b8" font-size="9">Low (subsidized tap tariffs)</text>
        </g>

        <g transform="translate(210, 60)">
          <rect x="0" y="0" width="175" height="75" rx="8" fill="#0f172a" stroke="#00e676" stroke-width="2"/>
          <text x="14" y="24" fill="#00e676" font-size="11" font-weight="700">ECONOMIC IRR (EIRR)</text>
          <text x="14" y="52" fill="#00e676" font-size="22" font-weight="900">15.8 %</text>
          <text x="14" y="68" fill="#00e676" font-size="9">Clears 10% Hurdle Rate!</text>
        </g>

        <!-- Social Valuation Cards -->
        <g transform="translate(24, 150)">
          <rect x="0" y="0" width="362" height="65" rx="6" fill="#0f172a" stroke="#64748b"/>
          <text x="12" y="20" fill="#ffd600" font-size="11" font-weight="700">SOCIETAL WELFARE GAINS CALCULATED:</text>
          <text x="12" y="38" fill="#e2e8f0" font-size="10">• Reduced typhoid/diarrhea hospital bills: Rs. 140M saved</text>
          <text x="12" y="54" fill="#e2e8f0" font-size="10">• Women save 2.5 hrs/day: Monetized time value to economy</text>
        </g>

        <!-- Final Verdict -->
        ${
          isApproved
            ? `
          <g transform="translate(24, 225)" class="stamp-effect">
            <rect x="0" y="0" width="362" height="50" rx="8" fill="rgba(0, 230, 118, 0.2)" stroke="#00e676" stroke-width="2.5"/>
            <text x="181" y="24" fill="#00e676" font-size="13" font-weight="900" text-anchor="middle">VERDICT: APPROVED BY PDWP</text>
            <text x="181" y="40" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">Net Present Value (NPV) = +Rs. 240 Million (> 0)</text>
          </g>
        `
            : `
          <g transform="translate(24, 235)">
            <text x="181" y="24" fill="#ffd600" font-size="12" font-weight="700" text-anchor="middle">Calculating Social Net Benefit...</text>
          </g>
        `
        }
      </g>
    `;
  }

  // SCENE 6: PROJECT IMPLEMENTATION, GOVERNANCE & 15% RULE
  getScene6Svg(p, ct) {
    const isYear2Hit = p > 0.35;
    const isYear3Hit = p > 0.7;

    return `
      <rect width="1000" height="500" fill="#090e1a"/>
      <rect x="0" y="420" width="1000" height="80" fill="#04070d"/>

      <!-- Top Row: AA, ASAAN Account & Project Director -->
      <g transform="translate(60, 25)">
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="280" height="80" rx="8" fill="#131d2e" stroke="#00e5ff" stroke-width="1.5"/>
          <text x="16" y="24" fill="#00e5ff" font-size="12" font-weight="800">ADMINISTRATIVE APPROVAL (AA)</text>
          <text x="16" y="44" fill="#e2e8f0" font-size="11">Issued by Administrative Dept</text>
          <text x="16" y="62" fill="#00e676" font-size="10" font-weight="700">✓ Formal Spending Sanction</text>
        </g>

        <g transform="translate(300, 0)">
          <rect x="0" y="0" width="280" height="80" rx="8" fill="#131d2e" stroke="#2979ff" stroke-width="1.5"/>
          <text x="16" y="24" fill="#2979ff" font-size="12" font-weight="800">ASAAN ASSIGNMENT ACCOUNT</text>
          <text x="16" y="44" fill="#e2e8f0" font-size="11">100% Year 1 Released: Rs. 350M</text>
          <text x="16" y="62" fill="#ffd600" font-size="10">Dedicated Account at NBP</text>
        </g>

        <g transform="translate(600, 0)">
          <rect x="0" y="0" width="280" height="80" rx="8" fill="#131d2e" stroke="#00e676" stroke-width="1.5"/>
          <text x="16" y="24" fill="#00e676" font-size="12" font-weight="800">PROJECT DIRECTOR (PPS-9)</text>
          <text x="16" y="44" fill="#e2e8f0" font-size="11">Recruited under Project Policy</text>
          <text x="16" y="62" fill="#00e676" font-size="10">Tenders via KPPRA Rules 2014</text>
        </g>
      </g>

      <!-- Centerpiece: The Non-Resetting 15% Revisions Rule -->
      <g transform="translate(60, 120)">
        <rect x="0" y="0" width="880" height="280" rx="12" fill="#131c31" stroke="${isYear3Hit ? "#ff3d00" : "#ffd600"}" stroke-width="2"/>
        <text x="24" y="32" fill="${isYear3Hit ? "#ff3d00" : "#ffd600"}" font-size="16" font-weight="800">THE NON-RESETTING 15% REVISION RULE (ANNEXURE 6-CD)</text>
        <text x="24" y="54" fill="#cbd5e1" font-size="12">Original Approved Baseline = Rs. 1,200 Million (Baseline NEVER Resets!)</text>

        <!-- Cumulative Gauge Bar -->
        <g transform="translate(24, 75)">
          <rect x="0" y="0" width="830" height="34" rx="6" fill="#0f172a" stroke="#334155"/>
          <!-- 15% Threshold Marker Line -->
          <line x1="622" y1="-8" x2="622" y2="42" stroke="#ff3d00" stroke-width="3" stroke-dasharray="4 2"/>
          <text x="622" y="-12" fill="#ff3d00" font-size="11" font-weight="900" text-anchor="middle">15% STATUTORY LIMIT</text>

          <!-- Dynamic Fill -->
          <rect x="0" y="0" width="${isYear3Hit ? 664 : isYear2Hit ? 332 : 0}" height="34" rx="6" fill="${isYear3Hit ? "#ff3d00" : "#00e5ff"}" opacity="0.85"/>
          <text x="${isYear3Hit ? 675 : 340}" y="22" fill="#ffffff" font-size="13" font-weight="800">${isYear3Hit ? "16% CUMULATIVE" : isYear2Hit ? "8% CUMULATIVE" : "0%"}</text>
        </g>

        <!-- Year 2 Escalation Card -->
        <g transform="translate(24, 130)">
          <rect x="0" y="0" width="395" height="120" rx="8" fill="#0f172a" stroke="${isYear2Hit ? "#00e676" : "#475569"}" stroke-width="1.5"/>
          <text x="16" y="26" fill="#00e676" font-size="13" font-weight="800">YEAR 2: FLASH FLOOD DAMAGE</text>
          <text x="16" y="48" fill="#e2e8f0" font-size="11">Damaged valve station in Bahrain tehsil</text>
          <text x="16" y="70" fill="#ffd600" font-size="13" font-weight="700">Cost Increase: +Rs. 96 Million (+8%)</text>
          <text x="16" y="96" fill="#00e676" font-size="11" font-weight="700">✓ DDWP Sanctioned (Within 15% margin)</text>
        </g>

        <!-- Year 3 Escalation Card -->
        <g transform="translate(450, 130)">
          <rect x="0" y="0" width="404" height="120" rx="8" fill="#0f172a" stroke="${isYear3Hit ? "#ff3d00" : "#475569"}" stroke-width="2"/>
          <text x="16" y="26" fill="#ff3d00" font-size="13" font-weight="800">YEAR 3: GLOBAL STEEL & SOLAR SURGE</text>
          <text x="16" y="48" fill="#e2e8f0" font-size="11">Requested Inflation Revision: +Rs. 96M (+8%)</text>
          <text x="16" y="70" fill="#ff3d00" font-size="13" font-weight="800">RULE APPLIED: 8% + 8% = 16% (> 15% Limit!)</text>
          <text x="16" y="96" fill="${isYear3Hit ? "#ff3d00" : "#94a3b8"}" font-size="11" font-weight="800">🛑 DDWP Jurisdiction Void! Moves to PDWP Revised PC-I</text>
        </g>
      </g>
    `;
  }

  // SCENE 7: RESULTS-BASED MONITORING & DG M&E
  getScene7Svg(p, ct) {
    return `
      <rect width="1000" height="500" fill="#0a0f1c"/>
      <rect x="0" y="410" width="1000" height="90" fill="#04070d"/>

      <!-- Left Column: CREAM Indicators & PC-III Digital -->
      <g transform="translate(60, 40)">
        <text x="0" y="20" fill="#00e5ff" font-size="15" font-weight="800">RESULTS-BASED MONITORING (RBM)</text>

        <!-- CREAM Criteria Box -->
        <g transform="translate(0, 40)">
          <rect x="0" y="0" width="410" height="130" rx="10" fill="#131c31" stroke="#00e5ff" stroke-width="1.5"/>
          <text x="18" y="28" fill="#00e5ff" font-size="13" font-weight="700">CREAM Performance Indicators</text>
          
          <g transform="translate(18, 48)">
            <text x="0" y="14" fill="#e2e8f0" font-size="11"><tspan fill="#00e676" font-weight="800">C</tspan>lear: Precise definition of target water output</text>
            <text x="0" y="32" fill="#e2e8f0" font-size="11"><tspan fill="#00e676" font-weight="800">R</tspan>elevant: Directly tracks clean drinking water</text>
            <text x="0" y="50" fill="#e2e8f0" font-size="11"><tspan fill="#00e676" font-weight="800">E</tspan>conomic: Efficient data collection in valleys</text>
            <text x="0" y="68" fill="#e2e8f0" font-size="11"><tspan fill="#00e676" font-weight="800">A</tspan>dequate: Measures quality & quantity</text>
            <text x="210" y="14" fill="#e2e8f0" font-size="11"><tspan fill="#00e676" font-weight="800">M</tspan>onitorable: Verifiable lab tests</text>
          </g>
        </g>

        <!-- Form PC-III Progress Card -->
        <g transform="translate(0, 190)">
          <rect x="0" y="0" width="410" height="120" rx="10" fill="#131c31" stroke="#2979ff" stroke-width="1.5"/>
          <text x="18" y="28" fill="#2979ff" font-size="13" font-weight="700">Periodic Tracking: Form PC-III (i-PAS)</text>
          <text x="18" y="50" fill="#94a3b8" font-size="11">Quarterly physical vs financial tracking:</text>

          <g transform="translate(18, 65)">
            <text x="0" y="14" fill="#e2e8f0" font-size="11">Pipes Laid (Physical):</text>
            <rect x="140" y="2" width="130" height="14" rx="4" fill="#00e676"/>
            <text x="280" y="14" fill="#00e676" font-size="11" font-weight="700">65%</text>

            <text x="0" y="38" fill="#e2e8f0" font-size="11">Funds Disbursed:</text>
            <rect x="140" y="26" width="120" height="14" rx="4" fill="#00b0ff"/>
            <text x="270" y="38" fill="#00b0ff" font-size="11" font-weight="700">60%</text>
          </g>
        </g>
      </g>

      <!-- Right Column: DG M&E Unannounced Field Inspection -->
      <g transform="translate(520, 40)">
        <text x="0" y="20" fill="#00e676" font-size="15" font-weight="800">DIRECTORATE GENERAL OF M&E (DG M&E)</text>

        <rect x="0" y="40" width="420" height="270" rx="10" fill="#131c31" stroke="#00e676" stroke-width="2"/>
        <text x="24" y="30" fill="#00e676" font-size="13" font-weight="800">Unannounced Site Audits & Verification</text>

        <g transform="translate(24, 55)">
          <!-- Audit 1: Concrete Core Testing -->
          <rect x="0" y="0" width="372" height="60" rx="6" fill="#0f172a" stroke="#334155"/>
          <text x="14" y="24" fill="#ffd600" font-size="11" font-weight="700">Concrete Core Cylinder Stress Tests</text>
          <text x="14" y="44" fill="#cbd5e1" font-size="10">Laboratory compression check on reservoir tanks</text>
          <circle cx="340" cy="30" r="12" fill="rgba(0, 230, 118, 0.2)" stroke="#00e676"/>
          <text x="340" y="34" fill="#00e676" font-size="12" font-weight="900" text-anchor="middle">✓</text>
        </g>

        <g transform="translate(24, 125)">
          <!-- Audit 2: GPS Photographic Coordinates -->
          <rect x="0" y="0" width="372" height="60" rx="6" fill="#0f172a" stroke="#334155"/>
          <text x="14" y="24" fill="#00e5ff" font-size="11" font-weight="700">Geo-Tagged Aerial & Ground Photos</text>
          <text x="14" y="44" fill="#cbd5e1" font-size="10">GPS coordinates timestamped into i-PAS database</text>
          <circle cx="340" cy="30" r="12" fill="rgba(0, 230, 118, 0.2)" stroke="#00e676"/>
          <text x="340" y="34" fill="#00e676" font-size="12" font-weight="900" text-anchor="middle">✓</text>
        </g>

        <g transform="translate(24, 195)">
          <!-- Audit 3: Anti-Fictitious Billing Guard -->
          <rect x="0" y="0" width="372" height="60" rx="6" fill="#0f172a" stroke="#ff3d00"/>
          <text x="14" y="24" fill="#ff3d00" font-size="11" font-weight="700">Anti-Ghost / Anti-Fictitious Billing</text>
          <text x="14" y="44" fill="#cbd5e1" font-size="10">Zero payment disbursed without third-party physical certification</text>
        </g>
      </g>

      <!-- Inspector Figure -->
      ${this.createStickFigure(470, 310, 1.2, { role: "inspector", gesture: "observe", talking: true })}
    `;
  }

  // SCENE 8: PROJECT CLOSURE & ASSET HANDOVER
  getScene8Svg(p, ct) {
    const isHandedOver = p > 0.6;

    return `
      <rect width="1000" height="500" fill="#0c1220"/>
      <rect x="0" y="410" width="1000" height="90" fill="#060910"/>

      <!-- Surrender of Savings & Closeout Ledger -->
      <g transform="translate(60, 40)">
        <text x="0" y="20" fill="#ffd600" font-size="15" font-weight="800">1. FINANCIAL CLOSEOUT & SURRENDER</text>

        <rect x="0" y="35" width="410" height="240" rx="10" fill="#131c31" stroke="#ffd600" stroke-width="2"/>
        <text x="20" y="32" fill="#ffffff" font-size="14" font-weight="700">Final Audited Accounts Reconciliation</text>

        <g transform="translate(20, 55)">
          <rect x="0" y="0" width="370" height="45" rx="6" fill="#0f172a"/>
          <text x="14" y="28" fill="#94a3b8" font-size="11">Actual Audited Expenditure:</text>
          <text x="240" y="28" fill="#00e5ff" font-size="15" font-weight="800">Rs. 1,180.0 M</text>
        </g>

        <!-- Surrendered Contingency Box -->
        <g transform="translate(20, 110)">
          <rect x="0" y="0" width="370" height="65" rx="6" fill="#0f172a" stroke="#ff3d00" stroke-width="1.5"/>
          <text x="14" y="22" fill="#ff3d00" font-size="12" font-weight="800">UNSPENT CONTINGENCY: Rs. 20.0 M</text>
          <text x="14" y="40" fill="#e2e8f0" font-size="10">Cannot be diverted or repurposed locally!</text>
          <text x="14" y="56" fill="#00e676" font-size="11" font-weight="700">✓ Surrendered to Provincial Consolidated Fund</text>
        </g>

        <!-- ASAAN Account Closure -->
        <g transform="translate(20, 185)">
          <rect x="0" y="0" width="370" height="42" rx="6" fill="#0f172a" stroke="#64748b"/>
          <text x="14" y="26" fill="#ffd600" font-size="11" font-weight="700">ASAAN Assignment Account: Officially Closed at NBP</text>
        </g>
      </g>

      <!-- Right Column: PC-IV Handover & PC-V Evaluation -->
      <g transform="translate(520, 40)">
        <text x="0" y="20" fill="#00e676" font-size="15" font-weight="800">2. ASSET HANDOVER & REVENUE BUDGET</text>

        <!-- Handover to Non-Development -->
        <rect x="0" y="35" width="420" height="140" rx="10" fill="#131c31" stroke="${isHandedOver ? "#00e676" : "#00b0ff"}" stroke-width="2"/>
        <text x="24" y="30" fill="#00e676" font-size="13" font-weight="800">Transition from Development to Recurrent Budget</text>
        
        <g transform="translate(24, 45)">
          <text x="0" y="16" fill="#e2e8f0" font-size="11">• Form PC-IV (Project Completion Report) approved</text>
          <text x="0" y="34" fill="#e2e8f0" font-size="11">• 42 Water stations shifted to PHED Regular Revenue Budget</text>
          <text x="0" y="52" fill="#ffd600" font-size="11" font-weight="700">• Committed O&M Allocations: Chlorine, solar parts, mechanics</text>
          <text x="0" y="70" fill="#94a3b8" font-size="10">• As-built engineering GIS drawings permanently archived</text>
        </g>

        <!-- Form PC-V 3-Year Post-Completion Evaluation -->
        <g transform="translate(0, 190)">
          <rect x="0" y="0" width="420" height="90" rx="10" fill="#131c31" stroke="#d500f9" stroke-width="1.5"/>
          <text x="24" y="26" fill="#d500f9" font-size="13" font-weight="800">Post-Completion Evaluation: Form PC-V</text>
          <text x="24" y="46" fill="#e2e8f0" font-size="11">Conducted annually for 3 years post-handover:</text>
          <text x="24" y="68" fill="#00e676" font-size="11" font-weight="700">✓ Verifies hospital clinic data confirms drop in diarrhea & typhoid</text>
        </g>
      </g>

      <!-- Finance Official & Community Figure Handover -->
      ${this.createStickFigure(450, 310, 1.15, { role: "officer", gesture: "hold", talking: true })}
      ${this.createStickFigure(840, 310, 1.0, { role: "villager", gesture: "wave" })}
    `;
  }

  // SCENE 9: EMERGING INITIATIVES MAINSTREAMED
  getScene9Svg(p, ct) {
    return `
      <rect width="1000" height="500" fill="#090e1b"/>
      <rect x="0" y="410" width="1000" height="90" fill="#04060c"/>

      <!-- Title Header -->
      <g transform="translate(60, 30)">
        <text x="0" y="20" fill="#00e5ff" font-size="16" font-weight="800">EMERGING PLANNING INITIATIVES MAINSTREAMED (CHAPTER 9)</text>
      </g>

      <!-- Grid of Modern Markers -->
      <g transform="translate(60, 75)">
        <!-- Marker 1: Gender Equality Marker (GEM Tier-3) -->
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="280" height="150" rx="10" fill="#131c31" stroke="#e91e63" stroke-width="2"/>
          <text x="20" y="28" fill="#e91e63" font-size="13" font-weight="800">GENDER EQUALITY MARKER</text>
          <rect x="20" y="38" width="80" height="22" rx="4" fill="rgba(233, 30, 99, 0.2)"/>
          <text x="60" y="53" fill="#e91e63" font-size="11" font-weight="800" text-anchor="middle">TIER-3 SCORE</text>
          
          <text x="20" y="85" fill="#e2e8f0" font-size="10.5">• Women directly consulted on tap</text>
          <text x="20" y="102" fill="#e2e8f0" font-size="10.5">  stands & safe collection routes.</text>
          <text x="20" y="122" fill="#00e676" font-size="10.5" font-weight="700">• Enables girls to attend school!</text>
        </g>

        <!-- Marker 2: Nutrition Sensitive Tagging -->
        <g transform="translate(300, 0)">
          <rect x="0" y="0" width="280" height="150" rx="10" fill="#131c31" stroke="#00e676" stroke-width="2"/>
          <text x="20" y="28" fill="#00e676" font-size="13" font-weight="800">NUTRITION MARKER</text>
          <rect x="20" y="38" width="135" height="22" rx="4" fill="rgba(0, 230, 118, 0.2)"/>
          <text x="87" y="53" fill="#00e676" font-size="11" font-weight="800" text-anchor="middle">NUTRITION-SENSITIVE</text>
          
          <text x="20" y="85" fill="#e2e8f0" font-size="10.5">• Eliminates waterborne pathogens</text>
          <text x="20" y="102" fill="#e2e8f0" font-size="10.5">  preventing chronic malabsorption.</text>
          <text x="20" y="122" fill="#ffd600" font-size="10.5" font-weight="700">• Directly curbs child stunting.</text>
        </g>

        <!-- Marker 3: SDG Mainstreaming -->
        <g transform="translate(600, 0)">
          <rect x="0" y="0" width="280" height="150" rx="10" fill="#131c31" stroke="#00b4d8" stroke-width="2"/>
          <text x="20" y="28" fill="#00b4d8" font-size="13" font-weight="800">GLOBAL SDG ALIGNMENT</text>
          
          <g transform="translate(20, 42)">
            <rect x="0" y="0" width="70" height="26" rx="4" fill="#00b4d8"/>
            <text x="35" y="18" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">SDG 6.1</text>
            <text x="80" y="18" fill="#e2e8f0" font-size="11">Clean Water & San.</text>
          </g>

          <g transform="translate(20, 75)">
            <rect x="0" y="0" width="70" height="26" rx="4" fill="#4caf50"/>
            <text x="35" y="18" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">SDG 3</text>
            <text x="80" y="18" fill="#e2e8f0" font-size="11">Good Health</text>
          </g>

          <g transform="translate(20, 108)">
            <rect x="0" y="0" width="70" height="26" rx="4" fill="#ff5722"/>
            <text x="35" y="18" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">SDG 5</text>
            <text x="80" y="18" fill="#e2e8f0" font-size="11">Gender Equality</text>
          </g>
        </g>
      </g>

      <!-- Bottom Impact Summary: Swat SDG Scorecard Feedback -->
      <g transform="translate(60, 245)">
        <rect x="0" y="0" width="880" height="135" rx="12" fill="#0f172a" stroke="#ffd600" stroke-width="2"/>
        <text x="24" y="30" fill="#ffd600" font-size="14" font-weight="800">DISTRICT SWAT SDG SCORECARD: DIRECT EMPIRICAL FEEDBACK</text>
        
        <g transform="translate(24, 50)">
          <text x="0" y="18" fill="#cbd5e1" font-size="12">150,000 residents transitioned from contaminated stream water to 45 L/capita/day potable WHO tap water.</text>
          <text x="0" y="40" fill="#00e676" font-size="13" font-weight="700">✓ Swat District Water Index upgraded from Red Deficit to Green Exemplary.</text>
          <text x="0" y="62" fill="#00e5ff" font-size="13" font-weight="700">✓ The complete 9-Chapter Manual for Development Projects Khyber Pakhtunkhwa (2022) cycle fulfilled!</text>
        </g>
      </g>

      <!-- Happy Community Figures with Water Stand -->
      ${this.createStickFigure(180, 310, 1.1, { role: "woman", gesture: "wave" })}
      ${this.createStickFigure(260, 310, 1.05, { role: "villager", gesture: "wave" })}
      ${this.createStickFigure(780, 310, 1.15, { role: "engineer", gesture: "point" })}
      ${this.createStickFigure(860, 310, 1.2, { role: "planner", gesture: "hold" })}
    `;
  }
}

// Instantiate on DOM load
window.addEventListener("DOMContentLoaded", () => {
  window.app = new PPMCExplainerApp();
});
