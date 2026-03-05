/* ──────────────────────────────────────────────────────────────
   MAIN ENTRY POINT
   Operation Silent Sight
   ────────────────────────────────────────────────────────────── */

; (function () {

    // ── BOOT SEQUENCE ──
    const BOOT_LINES = [
        'NCI v4.7.2 — Neural Combat Interface',
        '© Classification Level 5 — RESTRICTED',
        '',
        'Initializing biometric sensors...',
        'Calibrating ocular tracking array...',
        'Loading targeting algorithms...',
        'Verifying operator credentials...',
        'Applying threat assessment protocols...',
        'Loading engagement rules...',
        'Synchronizing mission data...',
        'Activating defensive grid...',
        '',
        '[ SYSTEM READY ]',
        'Welcome, Operator.',
    ];

    const STATUSES = [
        'INITIALIZING SYSTEM…',
        'LOADING TARGETING DATA…',
        'CALIBRATING EYE TRACKER…',
        'VERIFYING BIOMETRICS…',
        'SYNCHRONIZING MODULES…',
        'SYSTEM ONLINE ✓',
    ];

    const bootEl = document.getElementById('bootLines');
    const barEl = document.getElementById('bootBar');
    const statEl = document.getElementById('bootStatus');
    let lineIdx = 0, statIdx = 0;

    function bootTick() {
        if (lineIdx < BOOT_LINES.length) {
            bootEl.textContent += BOOT_LINES[lineIdx] + '\n';
            lineIdx++;
            const pct = Math.min(100, Math.round((lineIdx / BOOT_LINES.length) * 100));
            barEl.style.width = pct + '%';
            if (lineIdx % 2 === 0 && statIdx < STATUSES.length - 1) {
                statIdx++;
                statEl.textContent = STATUSES[statIdx];
            }
            setTimeout(bootTick, 100 + Math.random() * 80);
        } else {
            barEl.style.width = '100%';
            statEl.textContent = STATUSES[STATUSES.length - 1];
            setTimeout(() => UI.showScreen('screen-menu'), 700);
        }
    }

    // ── PROLOGUE HELPER ──
    function showPrologue(levelIndex, afterCb) {
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
                    afterCb();
                };
                return;
            }
            shown += lines[i] + '\n';
            document.getElementById('prologueText').textContent = shown;
            i++;
            setTimeout(tick, 70);
        };
        tick();
    }

    // ── OVERRIDE startNewGame to show prologue+intro first ──
    Game.startNewGame = function () {
        Audio.init();
        Audio.uiClick();
        showPrologue(0, () => {
            UI.showLevelIntro(LEVELS[0], () => {
                Game._startLevel(0);
            });
        });
    };

    // ── RETRY BUTTON ──
    document.getElementById('btnRetry').onclick = function () {
        Audio.uiClick();
        Game.retryLevel();
    };

    // ── CUSTOM CROSSHAIR CURSOR ──
    document.addEventListener('mousemove', e => {
        const ch = document.getElementById('crosshair');
        if (ch) { ch.style.left = e.clientX + 'px'; ch.style.top = e.clientY + 'px'; }
    });
    // Make crosshair always visible (game screen handles clicks natively)
    document.getElementById('crosshair').style.display = 'block';

    // ── INIT ENGINE & BOOT ──
    Game.init();
    bootTick();

    // Start music on first click or when booting ends
    window.addEventListener('click', () => {
        Audio.startMusic();
    }, { once: true });

})();
