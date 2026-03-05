/* ──────────────────────────────────────────────────────────────
   GAME ENGINE
   Operation Silent Sight
   ────────────────────────────────────────────────────────────── */

const Game = (() => {

    // ── STATE ──
    let canvas, ctx;
    let state = {};
    let animFrame = null;
    let lastTime = 0;

    // ── INIT ──
    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);

        // Use window-level listeners so eye-tracker dispatched events always reach game
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onMouseClick);
        window.addEventListener('dblclick', onDoubleClick);
        window.addEventListener('contextmenu', e => { e.preventDefault(); activateSpecial(); });
        window.addEventListener('keydown', e => { if (e.key === 'q' || e.key === 'Q') activateSpecial(); });
    }

    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (state.levelData) state.groundY = getGroundY();
    }

    function getGroundY() {
        return Math.floor(canvas.height * 0.72);
    }

    // ── START NEW GAME ──
    function startNewGame() {
        Audio.init();
        Audio.uiClick();
        startLevel(0);
    }

    function retryLevel() {
        Audio.init();
        Audio.uiClick();
        startLevel(state.levelIndex || 0);
    }

    // ── PROLOGUE ──
    function showPrologue(levelIndex) {
        const ld = LEVELS[levelIndex];
        const lines = ld.prologue || [];
        let shown = '';
        let i = 0;
        UI.showScreen('screen-prologue');
        document.getElementById('prologueText').textContent = '';
        document.getElementById('prologueContinue').style.display = 'none';

        const tick = () => {
            if (i >= lines.length) {
                document.getElementById('prologueContinue').style.display = 'block';
                document.getElementById('btnStartLevel').onclick = () => {
                    Audio.uiClick();
                    launchLevelIntro(levelIndex);
                };
                return;
            }
            shown += lines[i] + '\n';
            document.getElementById('prologueText').textContent = shown;
            i++;
            setTimeout(tick, 80);
        };
        tick();
    }

    function launchLevelIntro(levelIndex) {
        const ld = LEVELS[levelIndex];
        UI.showLevelIntro(ld, () => {
            startLevel(levelIndex);
        });
    }

    // ── LOAD LEVEL ──
    function startLevel(levelIndex) {
        if (animFrame) cancelAnimationFrame(animFrame);

        const ld = LEVELS[levelIndex];

        state = {
            levelIndex,
            levelData: ld,
            score: 0,
            kills: 0,
            shots: 0,
            hits: 0,
            penalties: 0,
            combo: 0,
            comboTimer: 0,
            ammo: ld.maxAmmo,
            maxAmmo: ld.maxAmmo,
            reloading: false,
            reloadTimer: 0,
            panicTimer: 0,       // rapid-click penalty
            specialReady: ld.specialEnabled,
            specialActive: false,
            specialTimer: 0,
            specialCooldown: 0,
            bossLocking: false,
            bossLockTimer: 0,
            enemies: [],
            particles: [],
            waveIndex: 0,
            waveTimers: ld.spawnWaves.map(w => w.delay),
            groundY: getGroundY(),
            timeLeft: ld.hasTimer ? ld.timeLimit : null,
            mouseX: canvas.width / 2,
            mouseY: canvas.height / 2,
            running: true,
            won: false,
            bossKilled: false,
            lastShot: 0,
            nightMode: ld.nightMode,
            friendlyFire: ld.friendlyFire
        };

        UI.showScreen('screen-game');
        lastTime = performance.now();
        tick(lastTime);
    }

    // ── GAME LOOP ──
    function tick(now) {
        if (!state.running) return;
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = state.specialActive && state.levelData.specialType === 'slowmo'
            ? rawDt * 0.35 : rawDt;

        update(dt, rawDt);
        render();
        animFrame = requestAnimationFrame(tick);
    }

    // ── UPDATE ──
    function update(dt, rawDt) {
        const s = state;
        const ld = s.levelData;

        // Timer
        if (s.timeLeft !== null) {
            s.timeLeft -= rawDt;
            if (s.timeLeft <= 0) {
                s.timeLeft = 0;
                endLevel(false, 'Time expired. Defensive perimeter breached.');
                return;
            }
        }

        // Spawn waves
        for (let wi = 0; wi < ld.spawnWaves.length; wi++) {
            if (s.waveTimers[wi] !== null) {
                s.waveTimers[wi] -= rawDt * 1000;
                if (s.waveTimers[wi] <= 0) {
                    spawnWave(wi);
                    s.waveTimers[wi] = null;
                }
            }
        }

        // Panic timer decay
        if (s.panicTimer > 0) s.panicTimer -= rawDt;

        // Special cooldown
        if (s.specialCooldown > 0) {
            s.specialCooldown -= rawDt;
            if (s.specialCooldown <= 0) {
                s.specialCooldown = 0;
                s.specialReady = true;
            }
        }
        // Special active timer
        if (s.specialActive) {
            s.specialTimer -= rawDt;
            if (s.specialTimer <= 0) {
                s.specialActive = false;
                UI.setThermal(false);
                UI.setSlowMo(false);
                s.specialCooldown = 12;
                s.specialReady = false;
            }
        }

        // Combo timer
        if (s.comboTimer > 0) { s.comboTimer -= rawDt; }
        else { s.combo = 0; }

        // Reload timer
        if (s.reloading) {
            s.reloadTimer -= rawDt;
            if (s.reloadTimer <= 0) {
                s.reloading = false;
                s.ammo = s.maxAmmo;
                UI.showPopup('RELOADED', 'var(--green)', 800);
            }
        }

        // Update enemies
        for (const e of s.enemies) {
            if (!e.alive) {
                if (e.dying) {
                    e.dyingTimer -= rawDt;
                    if (e.dyingTimer <= 0) e.dying = false;
                }
                continue;
            }
            updateEnemy(e, dt);
        }

        // Remove dead enemies that finished dying
        s.enemies = s.enemies.filter(e => e.alive || e.dying);

        // Update particles
        for (const p of s.particles) {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy += 0.15;
            p.life -= rawDt;
        }
        s.particles = s.particles.filter(p => p.life > 0);

        // Win check
        if (!s.won) checkWin();

        // Update HUD
        const acc = s.shots > 0 ? Math.max(0, Math.min(100, Math.round((s.hits / s.shots) * 100))) : 100;
        UI.updateHUD({
            level: ld.index,
            score: s.score,
            ammo: s.reloading ? 0 : s.ammo,
            maxAmmo: s.maxAmmo,
            accuracy: acc,
            shots: s.shots,
            hits: s.hits,
            objective: ld.objective.split('.')[0],
            specialReady: s.specialReady,
            specialActive: s.specialActive,
            timeLeft: s.timeLeft
        });
    }

    function updateEnemy(e, dt) {
        const s = state;
        const speed = e.speed * 60 * dt * (s.specialActive && s.levelData.specialType === 'slowmo' ? 0.35 : 1);

        if (e.aerial) {
            // Drones move horizontally and drift
            e.moveClock += dt;
            if (e.moveClock > 2 + e.seed) { e.moveDir *= -1; e.moveClock = 0; }
            e.x += e.moveDir * speed * 0.8;
            // Keep in bounds
            if (e.x < 60) { e.x = 60; e.moveDir = 1; }
            if (e.x > canvas.width - 60) { e.x = canvas.width - 60; e.moveDir = -1; }
        } else {
            // Ground enemies: patrol & advance
            if (e.id === 'DUMMY') {
                if (e.mobile) {
                    e.moveClock += dt;
                    if (e.moveClock > 1.5 + Math.sin(e.seed) * 0.5) {
                        e.moveDir *= -1;
                        e.moveClock = 0;
                    }
                    e.x += e.moveDir * speed * 0.5;
                    if (e.x < 40) { e.x = 40; e.moveDir = 1; }
                    if (e.x > canvas.width - 40) { e.x = canvas.width - 40; e.moveDir = -1; }
                }
                e.y = s.groundY - 20;
            } else if (e.id === 'CIVILIAN') {
                // Civilians walk sideways
                e.moveClock += dt;
                if (e.moveClock > 2) { e.moveDir *= -1; e.moveClock = 0; }
                e.x += e.moveDir * speed * 0.4;
                if (e.x < 40) { e.x = 40; e.moveDir = 1; }
                if (e.x > canvas.width - 40) { e.x = canvas.width - 40; e.moveDir = -1; }
                e.y = s.groundY;
            } else {
                // Soldiers advance toward player
                e.x += (canvas.width / 2 - e.x > 0 ? 1 : -1) * speed * 0.3;
                e.y = s.groundY;
                // Shoot at player
                e.shootTimer -= dt;
                if (e.shootTimer <= 0 && !s.specialActive) {
                    e.shootTimer = 2 + Math.random() * 3;
                    spawnEnemyBullet(e.x, e.y - 20);
                }
            }
            // Boss special: lock-on mechanic
            if (e.id === 'BOSS') {
                e.x = canvas.width * 0.5 + Math.sin(Date.now() * 0.0005) * 120;
                e.y = 230;
            }
        }
    }

    function spawnEnemyBullet(x, y) {
        // Visual particle flying toward player position
        const angle = Math.atan2(canvas.height - y, canvas.width / 2 - x);
        const spd = 4 + Math.random() * 2;
        state.particles.push({
            x, y,
            vx: Math.cos(angle) * spd * 0.3,
            vy: Math.sin(angle) * spd * 0.3,
            life: 0.5, maxLife: 0.5,
            color: '#ffaa00', size: 3,
            isBullet: true
        });
    }

    function spawnWave(wi) {
        const s = state;
        const wave = s.levelData.spawnWaves[wi];
        for (const ed of wave.enemies) {
            const gY = s.groundY;
            const ey = ed.y || gY;
            const e = createEnemy(ed.type, ed.x, ey);
            if (ed.mobile) e.mobile = true;
            s.enemies.push(e);
        }
        UI.showPopup('⚠ NEW WAVE', 'var(--amber)', 1500);
    }

    // ── WIN CHECK ──
    function checkWin() {
        const s = state;
        const ld = s.levelData;

        const livingEnemies = s.enemies.filter(e => e.alive && !e.friendly);
        const allWavesDone = s.waveTimers.every(t => t === null);

        if (ld.winCondition === 'boss') {
            if (s.bossKilled) { endLevel(true); }
        } else {
            // kills mode: all enemies dead + all waves spawned
            if (allWavesDone && livingEnemies.length === 0) {
                const acc = s.shots > 0 ? Math.max(0, Math.min(100, Math.round((s.hits / s.shots) * 100))) : 100;
                if (acc < ld.accuracyRequired && ld.accuracyRequired > 0) {
                    endLevel(false, `Accuracy too low (${acc}% < ${ld.accuracyRequired}% required).`);
                } else {
                    endLevel(true);
                }
            }
        }
    }

    // ── END LEVEL ──
    function endLevel(success, reason = '') {
        const s = state;
        s.running = false;
        s.won = success;
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }

        const acc = s.shots > 0 ? Math.max(0, Math.min(100, Math.round((s.hits / s.shots) * 100))) : 100;
        const stats = {
            score: s.score,
            accuracy: acc,
            kills: s.kills,
            penalties: s.penalties
        };

        Save.addScore({ level: s.levelData.name, score: s.score, accuracy: acc });

        if (success) {
            Audio.levelUp();
            Save.unlockLevel(s.levelIndex + 2);
            const isLast = s.levelIndex >= LEVELS.length - 1;
            UI.showComplete(s.levelData.name, stats, isLast, () => {
                if (isLast) {
                    const totalStats = { score: s.score, kills: s.kills, accuracy: acc };
                    UI.showVictory(totalStats);
                } else {
                    launchLevelIntro(s.levelIndex + 1);
                }
            });
        } else {
            UI.showGameOver(reason || 'Mission failed.');
        }
    }

    // ── MOUSE ──
    function onMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        state.mouseX = e.clientX - rect.left;
        state.mouseY = e.clientY - rect.top;
        UI.updateCrosshair(e.clientX, e.clientY);
    }

    function onMouseClick(e) {
        // Only fire shoot if game is running AND the click target is the canvas or body/window
        // (prevents HUD buttons from accidentally triggering a shot)
        if (!state.running) return;
        const tag = e.target ? e.target.tagName : '';
        if (tag === 'BUTTON' || (e.target && e.target.classList && e.target.classList.contains('menu-btn'))) return;
        if (isBossLocking()) return;
        shoot();
    }

    function onDoubleClick(e) {
        if (!state.running) return;
        reload();
    }

    function activateSpecial() {
        const s = state;
        if (!s.running || !s.specialReady || s.specialActive) return;
        s.specialActive = true;
        s.specialTimer = 5;
        s.specialReady = false;
        Audio.special();

        if (s.levelData.specialType === 'thermal') {
            UI.setThermal(true);
            // Reveal weak spots on all enemies
            for (const e of s.enemies) e.showWeakspot = true;
            setTimeout(() => {
                for (const e of s.enemies) e.showWeakspot = false;
            }, 5000);
        } else {
            UI.setSlowMo(true);
        }
        UI.showPopup('THERMAL ACTIVE', 'var(--green)', 1000);
    }

    // ── SHOOT ──
    function shoot() {
        const s = state;
        if (s.reloading) { UI.showPopup('RELOADING…', 'var(--amber)', 600); return; }
        if (s.ammo <= 0) { UI.showPopup('EMPTY — DOUBLE CLICK TO RELOAD', 'var(--red)', 1000); return; }

        const now = performance.now();
        // Panic mechanic: rapid-fire degrades accuracy
        const timeSince = now - s.lastShot;
        if (timeSince < 300) s.panicTimer = Math.min(s.panicTimer + 0.5, 3);
        s.lastShot = now;

        s.ammo--;
        s.shots++;
        Audio.gunshot();
        UI.fireCrosshair();
        spawnMuzzleFlash(s.mouseX, s.mouseY);

        // Determine actual aim point with panic scatter
        const scatter = s.panicTimer > 0 ? s.panicTimer * 30 : 0;
        const aimX = s.mouseX + (Math.random() - 0.5) * scatter;
        const aimY = s.mouseY + (Math.random() - 0.5) * scatter;

        // Hit detection
        let hitSomething = false;
        for (const e of s.enemies) {
            if (!e.alive || e.dying) continue;
            if (hitTest(aimX, aimY, e)) {
                hitSomething = true;
                processHit(e, aimX, aimY);
                break;
            }
        }
        if (!hitSomething) {
            Audio.miss();
            spawnImpact(aimX, aimY, '#888');
        }

        if (s.ammo <= 0) {
            UI.showPopup('AUTO RELOADING…', 'var(--amber)', 1200);
            reload();
        }
    }

    function hitTest(ax, ay, e) {
        // Canvas coords: enemy x,y is center. Adjust for aerial vs ground.
        const hw = (e.width || 32) / 2;
        const hh = (e.height || 60) / 2;

        let ex, ey;
        if (e.aerial) {
            // Need to account for canvas-to-viewport mapping
            const scaleX = canvas.width / window.innerWidth;
            const scaleY = canvas.height / window.innerHeight;
            ex = e.x / scaleX;
            ey = e.y / scaleY + Math.sin(Date.now() * 0.005 + e.seed) * 4 / scaleY;
        } else {
            const scaleX = canvas.width / window.innerWidth;
            const scaleY = canvas.height / window.innerHeight;
            ex = e.x / scaleX;
            ey = e.y / scaleY;
        }

        return ax >= ex - hw && ax <= ex + hw &&
            ay >= ey - hh && ay <= ey + hh;
    }

    function processHit(e, aimX, aimY) {
        const s = state;

        if (e.friendly) {
            // Civilian hit — BIG penalty
            e.alive = false; e.dying = true; e.dyingTimer = 0.5;
            s.penalties++;
            s.score = Math.max(0, s.score - 300);
            s.combo = 0;
            Audio.friendly();
            UI.showPopup('⚠ FRIENDLY FIRE!', 'var(--red)', 1500);
            UI.addKillFeed('CIVILIAN HIT – 300pts', true);
            UI.flashFriendly();
            spawnImpact(aimX, aimY, '#ff3344');
            return;
        }

        // Headshot detection (top 30% of hitbox)
        const scaleY = canvas.height / window.innerHeight;
        const eTopY = (e.y - (e.height || 60) / 2) / scaleY;
        const eMidY = (e.y - (e.height || 60) / 2 + (e.height || 60) * 0.32) / scaleY;
        const isHeadshot = aimY < eMidY && e.id !== 'DRONE' && e.id !== 'BOSS';
        const dmg = isHeadshot ? (e.id === 'ARMORED' ? 2 : 999) : 1;

        // Boss: separate logic
        if (e.id === 'BOSS') {
            // Boss requires lock-on — handled by bossShot()
            e.hp = Math.max(0, e.hp - 1);
            spawnParticles(aimX, aimY, '#ff4400', 8);
            Audio.hit();
            UI.flashHit();
            s.hits++;
            if (e.hp <= 0) {
                killEnemy(e, aimX, aimY);
                s.bossKilled = true;
            }
            return;
        }

        e.hp = Math.max(0, e.hp - dmg);
        s.hits++;

        if (e.hp <= 0) {
            killEnemy(e, aimX, aimY);
            let pts = e.points;
            if (isHeadshot) { pts *= 3; UI.addKillFeed(`HEADSHOT ×3 — ${e.name}`, false); }
            else { UI.addKillFeed(`ELIMINATED — ${e.name}`, false); }

            // Combo
            s.combo++;
            s.comboTimer = 2.5;
            pts = Math.round(pts * (1 + (s.combo - 1) * 0.5));
            s.score += pts;
            s.kills++;
            if (s.combo >= 2) UI.showCombo(s.combo);
        } else {
            Audio.hit();
            UI.flashHit();
            spawnImpact(aimX, aimY, '#ff6600');
        }
    }

    function killEnemy(e, ax, ay) {
        e.alive = false; e.dying = true; e.dyingTimer = 0.4;
        Audio.enemyDie();
        UI.flashHit();
        spawnParticles(ax, ay, e.friendly ? '#ffaaaa' : '#ff4400', 16);
        UI.showPopup('+' + e.points, 'var(--green)', 700);
        if (e.id === 'BOSS') { Audio.boss(); UI.showPopup('BOSS DESTROYED!', 'var(--amber)', 2500); }
    }

    // ── BOSS LOCK-ON ──
    function isBossLocking() {
        const boss = state.enemies.find(e => e.id === 'BOSS' && e.alive);
        if (!boss) return false;
        return false; // Boss lock handled via hold (right-click / special)
    }

    function tryBossLock(dt) {
        const s = state;
        const boss = s.enemies.find(e => e.id === 'BOSS' && e.alive);
        if (!boss) { s.bossLocking = false; s.bossLockTimer = 0; return; }

        const scaleX = canvas.width / window.innerWidth;
        const scaleY = canvas.height / window.innerHeight;
        const bx = boss.x / scaleX;
        const by = boss.y / scaleY;
        const dist = Math.hypot(s.mouseX - bx, s.mouseY - by);

        if (dist < 80) {
            s.bossLockTimer += dt;
            boss.lockProgress = Math.min(1, s.bossLockTimer / 2);
            if (s.bossLockTimer >= 2) {
                // FIRE LASER
                boss.hp = Math.max(0, boss.hp - 5);
                Audio.laser();
                s.bossLockTimer = 0;
                boss.lockProgress = 0;
                UI.showPopup('LASER FIRED!', 'var(--blue-hud)', 1200);
                spawnParticles(s.mouseX, s.mouseY, '#00d4ff', 20);
                UI.flashHit();
                s.hits += 5; s.shots += 5; s.score += 500;
                if (boss.hp <= 0) {
                    killEnemy(boss, bx, by);
                    s.bossKilled = true;
                }
            }
        } else {
            s.bossLockTimer = Math.max(0, s.bossLockTimer - dt * 2);
            boss.lockProgress = Math.min(1, s.bossLockTimer / 2);
        }
    }

    // ── RELOAD ──
    function reload() {
        const s = state;
        if (s.reloading) return;
        if (s.ammo === s.maxAmmo) return;
        s.reloading = true;
        s.reloadTimer = 1.8;
        Audio.reload();
        UI.showPopup('RELOADING…', 'var(--amber)', 1800);
    }

    // ── PARTICLES ──
    function spawnMuzzleFlash(x, y) {
        const s = state;
        for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 2 + Math.random() * 4;
            s.particles.push({
                x: x, y: y,
                vx: Math.cos(a) * v * 0.3,
                vy: Math.sin(a) * v * 0.3,
                life: 0.12, maxLife: 0.12,
                color: '#ffffaa', size: 3 + Math.random() * 3,
                isMuzzle: true
            });
        }
    }

    function spawnImpact(x, y, color) {
        const s = state;
        for (let i = 0; i < 5; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 1 + Math.random() * 3;
            s.particles.push({
                x, y,
                vx: Math.cos(a) * v * 0.3,
                vy: Math.sin(a) * v * 0.3,
                life: 0.25, maxLife: 0.25,
                color, size: 2 + Math.random() * 2
            });
        }
    }

    function spawnParticles(x, y, color, count) {
        const s = state;
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 2 + Math.random() * 5;
            s.particles.push({
                x, y,
                vx: Math.cos(a) * v * 0.25,
                vy: Math.sin(a) * v * 0.25 - 2,
                life: 0.4 + Math.random() * 0.4, maxLife: 0.8,
                color, size: 2 + Math.random() * 4
            });
        }
    }

    // ── RENDER ──
    function render() {
        const s = state;
        const w = canvas.width;
        const h = canvas.height;
        const ld = s.levelData;
        const tx = s.specialActive && ld.specialType === 'thermal';
        const nm = s.nightMode && !tx;

        ctx.clearRect(0, 0, w, h);

        // ── BACKGROUND ──
        drawBackground(ld.bgType, tx, nm, w, h, s.groundY);

        // ── SCENE ELEMENTS ──
        drawSceneDecorations(ld.bgType, tx, nm, w, h, s.groundY);

        // ── ENEMIES ──
        for (const e of s.enemies) {
            if (!e.alive && !e.dying) continue;
            ctx.save();
            if (e.dying) {
                ctx.globalAlpha = e.dyingTimer * 2.5;
                ctx.translate(e.x, e.y);
                ctx.rotate((0.8 - e.dyingTimer) * 8);
                ctx.translate(-e.x, -e.y);
            }
            EnemyTypes[e.id] && EnemyTypes[e.id].draw(ctx, e, tx, nm);
            ctx.restore();
        }

        // ── PARTICLES ──
        for (const p of s.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // ── BOSS LOCK LASER LINE ──
        const boss = s.enemies.find(e => e.id === 'BOSS' && e.alive);
        if (boss && boss.lockProgress > 0) {
            const scaleX = canvas.width / window.innerWidth;
            const scaleY = canvas.height / window.innerHeight;
            ctx.save();
            ctx.globalAlpha = boss.lockProgress * 0.8;
            ctx.strokeStyle = `hsl(${180 - boss.lockProgress * 180},100%,60%)`;
            ctx.lineWidth = 2 + boss.lockProgress * 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.beginPath();
            ctx.moveTo(s.mouseX, s.mouseY);
            ctx.lineTo(boss.x / scaleX, boss.y / scaleY);
            ctx.stroke();
            ctx.restore();
        }

        // ── BOSS LOCK HINT ──
        if (boss && s.levelIndex === 4) {
            ctx.fillStyle = 'rgba(0,212,255,0.7)';
            ctx.font = "12px 'Orbitron', monospace";
            ctx.textAlign = 'center';
            const scaleX = canvas.width / window.innerWidth;
            const scaleY = canvas.height / window.innerHeight;
            ctx.fillText('HOLD GAZE ON BOSS (2 sec) → LASER', boss.x / scaleX, boss.y / scaleY - 70);
        }

        // Level-specific bar at bottom
        if (s.levelIndex === 0) drawAccuracyGoalBar(w, h, s);

        // Boss lock update
        if (boss) tryBossLock(1 / 60);
    }

    function drawBackground(bgType, thermal, night, w, h, groundY) {
        // Sky
        let sky1, sky2, gnd1, gnd2;
        if (thermal) {
            sky1 = '#001a00'; sky2 = '#002200';
            gnd1 = '#001800'; gnd2 = '#000a00';
        } else if (night) {
            sky1 = '#020408'; sky2 = '#0a0d14';
            gnd1 = '#060808'; gnd2 = '#030505';
        } else if (bgType === 'sky') {
            sky1 = '#030810'; sky2 = '#050d1a';
            gnd1 = '#0a1008'; gnd2 = '#060a06';
        } else if (bgType === 'base') {
            sky1 = '#0a0a0a'; sky2 = '#141414';
            gnd1 = '#0d1209'; gnd2 = '#0a0e07';
        } else {
            sky1 = '#0a1a0a'; sky2 = '#0d200d';
            gnd1 = '#101a0a'; gnd2 = '#0a1208';
        }

        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
        skyGrad.addColorStop(0, sky1);
        skyGrad.addColorStop(1, sky2);
        ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, groundY);

        const gndGrad = ctx.createLinearGradient(0, groundY, 0, h);
        gndGrad.addColorStop(0, gnd1);
        gndGrad.addColorStop(1, gnd2);
        ctx.fillStyle = gndGrad; ctx.fillRect(0, groundY, w, h - groundY);
    }

    function drawSceneDecorations(bgType, thermal, night, w, h, gY) {
        const c = thermal ? 'rgba(0,200,80,0.12)' :
            night ? 'rgba(0,255,136,0.04)' : 'rgba(0,255,136,0.07)';

        // Ground line
        ctx.strokeStyle = thermal ? 'rgba(0,255,100,0.4)' :
            night ? 'rgba(0,255,136,0.15)' : 'rgba(0,255,136,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(w, gY); ctx.stroke();

        // Stars (night)
        if (night && !thermal) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            for (let i = 0; i < 60; i++) {
                const sx = (i * 137.5) % w;
                const sy = (i * 73.1) % (gY * 0.8);
                const ss = 0.5 + (i % 3) * 0.5;
                ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Range targets backdrop (level 1)
        if (bgType === 'range') {
            ctx.fillStyle = thermal ? 'rgba(0,255,100,0.1)' : 'rgba(0,255,136,0.05)';
            for (let i = 0; i < 5; i++) {
                const rx = 150 + i * 180;
                ctx.fillRect(rx - 20, gY - 80, 40, 80);
            }
        }

        // Barricades (checkpoint)
        if (bgType === 'night') {
            ctx.fillStyle = thermal ? 'rgba(100,200,100,0.2)' : 'rgba(30,50,30,0.8)';
            const positions = [120, 340, 560, 780, 1000];
            positions.forEach(px => {
                if (px < w) {
                    ctx.fillRect(px, gY - 30, 60, 30);
                    ctx.fillStyle = thermal ? 'rgba(0,255,100,0.3)' : 'rgba(0,100,40,0.9)';
                    ctx.fillRect(px - 15, gY - 50, 90, 10);
                    ctx.fillStyle = thermal ? 'rgba(100,200,100,0.2)' : 'rgba(30,50,30,0.8)';
                }
            });
        }

        // HUD grid lines
        ctx.strokeStyle = c;
        ctx.lineWidth = 0.5;
        const step = 60;
        for (let x = 0; x < w; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Floodlight spot (night mode)
        if (night && !thermal) {
            const cx = w / 2, cy = 0;
            const r = Math.max(w, h) * 0.6;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0, 'rgba(0,60,20,0.18)');
            grad.addColorStop(0.4, 'rgba(0,30,10,0.08)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }
    }

    function drawAccuracyGoalBar(w, h, s) {
        const acc = s.shots > 0 ? Math.round((s.hits / s.shots) * 100) : 100;
        const goal = s.levelData.accuracyRequired;
        const bar = { x: w / 2 - 150, y: h - 55, w: 300, h: 14 };
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
        const col = acc >= goal ? '#00ff88' : acc >= goal * 0.7 ? '#ffaa00' : '#ff3344';
        ctx.fillStyle = col;
        ctx.fillRect(bar.x, bar.y, bar.w * acc / 100, bar.h);
        // Goal marker
        const gx = bar.x + bar.w * goal / 100;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(gx, bar.y - 4); ctx.lineTo(gx, bar.y + bar.h + 4); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = "10px 'Orbitron'";
        ctx.textAlign = 'center';
        ctx.fillText(`GOAL: ${goal}%`, gx, bar.y - 8);
        ctx.fillText(`ACC: ${acc}%`, bar.x + bar.w * acc / 100 / 2, bar.y + bar.h + 12);
    }

    function quitToMenu() {
        Audio.uiClick();
        state.running = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        UI.showScreen('screen-menu');
    }

    return { init, startNewGame, retryLevel, _startLevel: startLevel, quitToMenu };
})();
