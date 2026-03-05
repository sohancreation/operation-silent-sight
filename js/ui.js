/* ──────────────────────────────────────────────────────────────
   UI MANAGER
   Operation Silent Sight
   ────────────────────────────────────────────────────────────── */

const UI = (() => {

    let currentScreen = null;

    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = '';
        });
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'flex';
            el.classList.add('active');
            currentScreen = id;
        }
    }

    function showScoreboard() {
        const scores = Save.getScores();
        const list = document.getElementById('scoresList');
        if (!scores.length) {
            list.innerHTML = '<div class="no-scores">NO MISSION DATA ON RECORD</div>';
        } else {
            list.innerHTML = scores.map((s, i) => `
        <div class="score-row">
          <span class="score-level">${String(i + 1).padStart(2, '0')} — ${s.level}</span>
          <span class="score-acc">${s.accuracy}% ACC</span>
          <span class="score-pts">${s.score} PTS</span>
        </div>
      `).join('');
        }
        showScreen('screen-scores');
    }

    // ── HUD UPDATES ──
    function updateHUD(state) {
        const { level, score, ammo, maxAmmo, accuracy, shots, hits,
            objective, specialReady, specialActive, timeLeft } = state;

        document.getElementById('hudLevel').textContent = `LVL ${level}`;
        document.getElementById('hudScore').textContent = score;
        document.getElementById('hudObj').textContent = objective;

        // Ammo pips
        const pips = document.getElementById('ammoPips');
        pips.innerHTML = '';
        for (let i = 0; i < maxAmmo; i++) {
            const d = document.createElement('div');
            d.className = 'ammo-pip' + (i >= ammo ? ' spent' : '');
            pips.appendChild(d);
        }

        // Accuracy
        const acc = shots > 0 ? Math.round((hits / shots) * 100) : 100;
        document.getElementById('hudAcc').textContent = acc + '%';
        const bar = document.getElementById('accBar');
        bar.style.width = acc + '%';
        bar.style.background = acc >= 70 ? 'var(--green)' :
            acc >= 40 ? 'var(--amber)' : 'var(--red)';

        // Special
        const sp = document.getElementById('hudSpecialStatus');
        sp.textContent = specialActive ? 'ACTIVE' : (specialReady ? 'READY' : 'LOADING');
        sp.style.color = specialActive ? 'var(--amber)' :
            specialReady ? 'var(--blue-hud)' : 'rgba(0,212,255,0.35)';

        // Time
        const t = document.getElementById('hudTime');
        if (timeLeft !== undefined && timeLeft !== null) {
            const mins = Math.floor(timeLeft / 60);
            const secs = String(Math.floor(timeLeft % 60)).padStart(2, '0');
            t.textContent = `${mins}:${secs}`;
            t.style.color = timeLeft < 10 ? 'var(--red)' : 'var(--amber)';
        } else {
            t.textContent = '--';
        }
    }

    // ── POPUP MESSAGE ──
    let popupTimer = null;
    function showPopup(msg, color = 'var(--green)', duration = 1200) {
        const el = document.getElementById('gamePopup');
        el.textContent = msg;
        el.style.color = color;
        el.classList.add('show');
        if (popupTimer) clearTimeout(popupTimer);
        popupTimer = setTimeout(() => el.classList.remove('show'), duration);
    }

    // ── KILL FEED ──
    function addKillFeed(msg, penalty = false) {
        const feed = document.getElementById('killFeed');
        const entry = document.createElement('div');
        entry.className = 'kf-entry' + (penalty ? ' penalty' : '');
        entry.textContent = msg;
        feed.appendChild(entry);
        setTimeout(() => entry.remove(), 2500);
    }

    // ── COMBO ──
    let comboTimer = null;
    function showCombo(combo) {
        if (combo < 2) return;
        const el = document.getElementById('comboDisplay');
        el.textContent = `${combo}× COMBO`;
        el.classList.add('show');
        if (comboTimer) clearTimeout(comboTimer);
        comboTimer = setTimeout(() => el.classList.remove('show'), 1500);
    }

    // ── HIT/FF FLASH ──
    function flashHit() {
        const el = document.getElementById('hitFlash');
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 80);
    }
    function flashFriendly() {
        const el = document.getElementById('ffFlash');
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 200);
    }

    // ── THERMAL / SLOW-MO ──
    function setThermal(on) {
        document.getElementById('thermalOverlay').classList.toggle('active', on);
    }
    function setSlowMo(active) {
        const el = document.getElementById('slowmoOverlay');
        if (active) el.classList.add('active');
        else el.classList.remove('active');
    }

    function toggleMusic() {
        Audio.init();                        // ensure audio context exists before toggling
        const muted = Audio.toggleMusic();   // true = now muted (music OFF)
        // HUD mini button (top-right)
        const hudBtn = document.getElementById('btnToggleMusic');
        if (hudBtn) hudBtn.textContent = muted ? '🎵 MUSIC: OFF' : '🎵 MUSIC: ON';
        // Main menu button
        const menuBtn = document.getElementById('btnMenuMusicToggle');
        if (menuBtn) menuBtn.textContent = muted ? '🎵 MUSIC: OFF' : '🎵 MUSIC: ON';
        Audio.uiClick();
    }

    function quitGame() {
        if (confirm('Are you sure you want to exit the simulation?')) {
            window.close();
            // Fallback if browser blocks window.close
            window.location.href = 'about:blank';
        }
    }

    // ── CROSSHAIR ──
    function updateCrosshair(x, y) {
        const c = document.getElementById('crosshair');
        c.style.left = x + 'px';
        c.style.top = y + 'px';
    }
    function fireCrosshair() {
        const c = document.getElementById('crosshair');
        c.classList.add('firing');
        setTimeout(() => c.classList.remove('firing'), 150);
    }

    // ── LEVEL INTRO ──
    function showLevelIntro(levelData, callback) {
        document.getElementById('introTag').textContent = `LEVEL ${levelData.index}`;
        document.getElementById('introName').textContent = levelData.name;
        document.getElementById('introObj').textContent = levelData.objective;
        document.getElementById('introNew').innerHTML = levelData.newMechanics
            .map(m => `<div>▸ ${m}</div>`).join('');
        showScreen('screen-level-intro');
        document.getElementById('btnDeployNow').onclick = () => {
            Audio.uiClick();
            callback();
        };
    }

    // ── MISSION COMPLETE ──
    function showComplete(levelName, stats, isLast, nextCallback) {
        document.getElementById('completeLevel').textContent = levelName;
        document.getElementById('completeStats').innerHTML = `
      <div class="stat-block fade-in"><div class="stat-label">SCORE</div><div class="stat-value">${stats.score}</div></div>
      <div class="stat-block fade-in" style="animation-delay:.1s"><div class="stat-label">ACCURACY</div><div class="stat-value">${stats.accuracy}%</div></div>
      <div class="stat-block fade-in" style="animation-delay:.2s"><div class="stat-label">KILLS</div><div class="stat-value">${stats.kills}</div></div>
      <div class="stat-block fade-in" style="animation-delay:.3s"><div class="stat-label">PENALTIES</div><div class="stat-value">${stats.penalties}</div></div>
    `;
        const btn = document.getElementById('btnNextLevel');
        btn.textContent = isLast ? '★ VIEW FINAL REPORT' : '▶ NEXT MISSION';
        btn.onclick = () => { Audio.uiClick(); nextCallback(); };
        showScreen('screen-complete');
    }

    // ── GAME OVER ──
    function showGameOver(reason) {
        document.getElementById('gameoverReason').textContent = reason;
        showScreen('screen-gameover');
    }

    // ── FINAL VICTORY ──
    function showVictory(totalStats) {
        document.getElementById('victoryStats').innerHTML = `
      <div class="stat-block"><div class="stat-label">TOTAL SCORE</div><div class="stat-value">${totalStats.score}</div></div>
      <div class="stat-block"><div class="stat-label">TOTAL KILLS</div><div class="stat-value">${totalStats.kills}</div></div>
      <div class="stat-block"><div class="stat-label">FINAL ACCURACY</div><div class="stat-value">${totalStats.accuracy}%</div></div>
    `;
        showScreen('screen-victory');
        Audio.levelUp();
    }

    return {
        showScreen,
        showLevelIntro,
        updateHUD,
        showPopup,
        addKillFeed,
        showCombo,
        showScoreboard,
        showComplete,
        showGameOver,
        showVictory,
        setThermal,
        setSlowMo,
        flashHit,
        flashFriendly,
        updateCrosshair,
        fireCrosshair,
        toggleMusic,
        quitGame
    };
})();

/* ──────────────────────────────────────────────────────────────
   SAVE / PERSISTENCE
   ────────────────────────────────────────────────────────────── */
const Save = (() => {
    const KEY_SCORES = 'oss_scores';
    const KEY_UNLOCKED = 'oss_unlocked';

    function getScores() {
        try { return JSON.parse(localStorage.getItem(KEY_SCORES)) || []; }
        catch { return []; }
    }
    function addScore(entry) {
        const scores = getScores();
        scores.unshift(entry);
        if (scores.length > 20) scores.length = 20;
        localStorage.setItem(KEY_SCORES, JSON.stringify(scores));
    }
    function getUnlocked() {
        try { return JSON.parse(localStorage.getItem(KEY_UNLOCKED)) || 1; }
        catch { return 1; }
    }
    function unlockLevel(n) {
        const cur = getUnlocked();
        if (n > cur) localStorage.setItem(KEY_UNLOCKED, n);
    }

    return { getScores, addScore, getUnlocked, unlockLevel };
})();
