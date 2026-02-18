class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicEnabled = true;
    this.musicTimer = null;
    this.musicNotes = [261.63, 329.63, 392, 523.25, 392, 329.63];
    this.musicIndex = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.sfxGain.gain.value = 0.25;
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusicLoop();
    } else {
      this.startMusicLoop();
    }
    return this.musicEnabled;
  }

  startMusicLoop() {
    if (!this.musicEnabled) return;
    this.ensureContext();
    if (this.musicTimer) return;

    const step = () => {
      if (!this.musicEnabled) return;
      const note = this.musicNotes[this.musicIndex % this.musicNotes.length];
      this.playTone(note, 0.26, "triangle", this.musicGain, 0.05);
      this.musicIndex += 1;
      this.musicTimer = setTimeout(step, 320);
    };

    step();
  }

  stopMusicLoop() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playTone(freq, duration, type, gainNode, volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(volume, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSfx(name) {
    this.ensureContext();
    switch (name) {
      case "grow":
        this.playTone(220, 0.08, "sawtooth", this.sfxGain, 0.1);
        break;
      case "drop":
        this.playTone(180, 0.2, "square", this.sfxGain, 0.12);
        break;
      case "walk":
        this.playTone(400, 0.08, "triangle", this.sfxGain, 0.06);
        break;
      case "fall":
        this.playTone(120, 0.5, "sine", this.sfxGain, 0.16);
        break;
      case "level":
        this.playTone(523.25, 0.12, "triangle", this.sfxGain, 0.1);
        setTimeout(() => this.playTone(659.25, 0.12, "triangle", this.sfxGain, 0.1), 90);
        setTimeout(() => this.playTone(783.99, 0.16, "triangle", this.sfxGain, 0.1), 180);
        break;
      default:
        break;
    }
  }
}

class Platform {
  constructor(x, width, height = 180) {
    this.x = x;
    this.width = width;
    this.height = height;
  }

  draw(ctx, cameraX, groundY) {
    const top = groundY - this.height;
    const left = this.x - cameraX;

    ctx.fillStyle = "#1e374f";
    ctx.fillRect(left, top, this.width, this.height);
    ctx.fillStyle = "#2e5a85";
    ctx.fillRect(left, top, this.width, 12);
  }
}

class Stick {
  constructor(x, groundY) {
    this.x = x;
    this.groundY = groundY;
    this.length = 0;
    this.angle = 0;
    this.maxLength = 430;
  }

  reset(x, groundY) {
    this.x = x;
    this.groundY = groundY;
    this.length = 0;
    this.angle = 0;
  }

  grow(amount) {
    this.length = Math.min(this.maxLength, this.length + amount);
  }

  draw(ctx, cameraX) {
    ctx.save();
    ctx.translate(this.x - cameraX, this.groundY);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -this.length);
    ctx.stroke();
    ctx.restore();
  }
}

class Player {
  constructor(x, groundY) {
    this.x = x;
    this.y = groundY;
    this.radius = 14;
    this.walkSpeed = 3;
    this.fallVelocity = 0;
  }

  reset(x, groundY) {
    this.x = x;
    this.y = groundY;
    this.fallVelocity = 0;
  }

  draw(ctx, cameraX) {
    ctx.save();
    const drawX = this.x - cameraX;
    const drawY = this.y;

    ctx.fillStyle = "#1b1f29";
    ctx.fillRect(drawX - 9, drawY - 32, 18, 24);

    ctx.beginPath();
    ctx.fillStyle = "#ffe8cc";
    ctx.arc(drawX, drawY - 42, this.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1b1f29";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(drawX - 7, drawY - 20);
    ctx.lineTo(drawX + 7, drawY - 20);
    ctx.stroke();

    ctx.restore();
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundY = this.height - 64;
    this.state = "menu";

    this.levels = [
      { gapMin: 100, gapMax: 170, widthMin: 95, widthMax: 140, speed: 2.7 },
      { gapMin: 130, gapMax: 210, widthMin: 85, widthMax: 125, speed: 3.1 },
      { gapMin: 150, gapMax: 230, widthMin: 75, widthMax: 115, speed: 3.35 },
      { gapMin: 175, gapMax: 260, widthMin: 62, widthMax: 102, speed: 3.7 },
      { gapMin: 195, gapMax: 290, widthMin: 52, widthMax: 92, speed: 4.1 }
    ];

    this.selectedLevel = 0;
    this.currentLevel = 0;
    this.score = 0;

    this.platforms = [];
    this.currentPlatformIndex = 0;
    this.player = new Player(0, this.groundY);
    this.stick = new Stick(0, this.groundY);
    this.cameraX = 0;
    this.cameraTargetX = 0;

    this.growing = false;
    this.stickDropping = false;
    this.walking = false;
    this.falling = false;
    this.walkTargetX = 0;
    this.failureTriggered = false;
    this.lastTime = 0;
    this.walkTick = 0;

    this.audio = new AudioManager();

    this.bindInput();
    this.setupUi();
    this.buildLevelSelect();
    this.showPanel("main-menu");
    this.updateHud();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  levelConfig(levelIndex) {
    return this.levels[Math.min(levelIndex, this.levels.length - 1)];
  }

  setupLevel(levelIndex) {
    this.currentLevel = levelIndex;
    this.score = 0;
    this.cameraX = 0;
    this.cameraTargetX = 0;
    this.platforms = [];
    this.currentPlatformIndex = 0;
    this.resetFlags();

    const start = new Platform(80, 130);
    this.platforms.push(start);

    let x = start.x + start.width;
    const cfg = this.levelConfig(this.currentLevel);
    for (let i = 0; i < 8; i += 1) {
      const gap = this.randomRange(cfg.gapMin, cfg.gapMax);
      const width = this.randomRange(cfg.widthMin, cfg.widthMax);
      x += gap;
      this.platforms.push(new Platform(x, width));
      x += width;
    }

    this.player.reset(start.x + start.width - 15, this.groundY);
    this.player.walkSpeed = cfg.speed;
    this.stick.reset(this.player.x, this.groundY);
    this.updateHud();
  }

  extendPlatformsIfNeeded() {
    const last = this.platforms[this.platforms.length - 1];
    if (last.x - this.cameraX < this.width * 1.6) {
      let x = last.x + last.width;
      const cfg = this.levelConfig(this.currentLevel);
      for (let i = 0; i < 4; i += 1) {
        const gap = this.randomRange(cfg.gapMin, cfg.gapMax);
        const width = this.randomRange(cfg.widthMin, cfg.widthMax);
        x += gap;
        this.platforms.push(new Platform(x, width));
        x += width;
      }
    }
  }

  resetFlags() {
    this.growing = false;
    this.stickDropping = false;
    this.walking = false;
    this.falling = false;
    this.failureTriggered = false;
    this.walkTargetX = 0;
    this.walkTick = 0;
  }

  bindInput() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        this.beginGrow();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        this.releaseGrow();
      }
    });

    this.canvas.addEventListener("mousedown", () => this.beginGrow());
    this.canvas.addEventListener("mouseup", () => this.releaseGrow());
    this.canvas.addEventListener("mouseleave", () => this.releaseGrow());
  }

  setupUi() {
    const levelDisplay = document.getElementById("hud-level");
    const scoreDisplay = document.getElementById("hud-score");
    const overlay = document.getElementById("overlay");
    const mainMenu = document.getElementById("main-menu");
    const levelSelect = document.getElementById("level-select");
    const gameOver = document.getElementById("game-over");
    const finalScore = document.getElementById("final-score");

    this.ui = {
      levelDisplay,
      scoreDisplay,
      overlay,
      mainMenu,
      levelSelect,
      gameOver,
      finalScore,
      backBtn: document.getElementById("back-btn")
    };

    document.getElementById("start-btn").addEventListener("click", () => {
      this.startGame(this.selectedLevel);
    });

    document.getElementById("level-select-btn").addEventListener("click", () => {
      this.showPanel("level-select");
    });

    document.getElementById("back-from-levels-btn").addEventListener("click", () => {
      this.showPanel("main-menu");
    });

    document.getElementById("menu-btn").addEventListener("click", () => {
      this.toMenu();
    });

    document.getElementById("restart-btn").addEventListener("click", () => {
      this.startGame(this.currentLevel);
    });

    document.getElementById("back-btn").addEventListener("click", () => {
      this.toMenu();
    });

    document.getElementById("music-toggle-btn").addEventListener("click", (e) => {
      const enabled = this.audio.toggleMusic();
      e.currentTarget.textContent = `Music: ${enabled ? "ON" : "OFF"}`;
    });
  }

  buildLevelSelect() {
    const grid = document.getElementById("level-grid");
    grid.innerHTML = "";

    this.levels.forEach((_, index) => {
      const btn = document.createElement("button");
      btn.textContent = `Level ${index + 1}`;
      if (index === this.selectedLevel) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        this.selectedLevel = index;
        [...grid.children].forEach((c) => c.classList.remove("selected"));
        btn.classList.add("selected");
      });
      grid.appendChild(btn);
    });
  }

  showPanel(id) {
    ["main-menu", "level-select", "game-over"].forEach((panelId) => {
      const panel = document.getElementById(panelId);
      panel.classList.toggle("active", panelId === id);
    });

    this.ui.overlay.style.display = id ? "grid" : "none";
  }

  updateHud() {
    this.ui.levelDisplay.textContent = `Level: ${this.currentLevel + 1}`;
    this.ui.scoreDisplay.textContent = `Score: ${this.score}`;
  }

  startGame(levelIndex) {
    this.audio.startMusicLoop();
    this.state = "playing";
    this.setupLevel(levelIndex);
    this.showPanel(null);
  }

  toMenu() {
    this.state = "menu";
    this.showPanel("main-menu");
  }

  beginGrow() {
    if (this.state !== "playing") return;
    if (this.walking || this.stickDropping || this.falling) return;
    this.audio.ensureContext();
    this.growing = true;
  }

  releaseGrow() {
    if (this.state !== "playing") return;
    if (!this.growing) return;
    this.growing = false;
    this.stickDropping = true;
    this.audio.playSfx("drop");
  }

  evaluateLanding() {
    const current = this.platforms[this.currentPlatformIndex];
    const next = this.platforms[this.currentPlatformIndex + 1];
    const endX = current.x + current.width + this.stick.length;

    if (endX >= next.x && endX <= next.x + next.width) {
      this.walkTargetX = endX;
      this.walking = true;
      this.failureTriggered = false;
      return;
    }

    this.walkTargetX = endX;
    this.walking = true;
    this.failureTriggered = true;
  }

  update(dt) {
    if (this.state !== "playing") return;

    const growthRate = 220;
    if (this.growing) {
      this.stick.grow(growthRate * dt);
      this.audio.playSfx("grow");
    }

    if (this.stickDropping) {
      this.stick.angle = Math.min(Math.PI / 2, this.stick.angle + 5.4 * dt);
      if (this.stick.angle >= Math.PI / 2) {
        this.stickDropping = false;
        this.evaluateLanding();
      }
    }

    if (this.walking) {
      const moveSpeed = this.player.walkSpeed * 100 * dt;
      if (this.player.x < this.walkTargetX) {
        this.player.x += moveSpeed;
        this.walkTick += dt;
        if (this.walkTick >= 0.18) {
          this.walkTick = 0;
          this.audio.playSfx("walk");
        }
      } else {
        this.walking = false;
        if (this.failureTriggered) {
          this.falling = true;
          this.audio.playSfx("fall");
        } else {
          this.score += 1;
          this.audio.playSfx("level");
          this.currentPlatformIndex += 1;
          const next = this.platforms[this.currentPlatformIndex];
          this.player.x = next.x + next.width - 15;
          this.stick.reset(this.player.x, this.groundY);
          this.extendPlatformsIfNeeded();
          this.updateHud();
        }
      }
    }

    if (this.falling) {
      this.player.fallVelocity += 520 * dt;
      this.player.y += this.player.fallVelocity * dt;
      if (this.player.y > this.height + 80) {
        this.endGame();
      }
    }

    const viewportCenter = this.player.x - this.width * 0.35;
    this.cameraTargetX = Math.max(0, viewportCenter);
    this.cameraX += (this.cameraTargetX - this.cameraX) * Math.min(1, dt * 4);
  }

  endGame() {
    this.state = "gameover";
    this.ui.finalScore.textContent = `Final Score: ${this.score}`;
    this.showPanel("game-over");
  }

  drawBackground() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 230 - this.cameraX * 0.25) % (this.width + 220)) - 100;
      const y = 70 + (i % 3) * 30;
      ctx.beginPath();
      ctx.ellipse(x, y, 56, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#50b36f";
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
  }

  draw() {
    this.drawBackground();
    this.platforms.forEach((platform) => platform.draw(this.ctx, this.cameraX, this.groundY));
    if (this.state === "playing") {
      this.stick.draw(this.ctx, this.cameraX);
      this.player.draw(this.ctx, this.cameraX);
    }
  }

  loop(timestamp) {
    const dt = Math.min(0.03, (timestamp - this.lastTime) / 1000 || 0);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  }
}

const canvas = document.getElementById("gameCanvas");
new Game(canvas);
