/* ════════════════════════════════════════════════════════════════
   EYE TRACKER — Operation Silent Sight
   • BOTH eyes blink simultaneously → click / shoot
   • Toggle button to enable / disable at any time
   • Works from file:// URL (no ES module imports)
   • MediaPipe loaded globally from vision_bundle CDN script tag
   ════════════════════════════════════════════════════════════════ */

window.EyeTracker = (function () {

    /* ── State ── */
    var faceLandmarker = null;
    var video, canvas, ctx;
    var running = false;
    var lastVideoTime = -1;

    /* ── Cursor (smoothed) ── */
    var cursorX = window.innerWidth / 2;
    var cursorY = window.innerHeight / 2;
    var targetX = cursorX;
    var targetY = cursorY;

    /* ── Blink state ── */
    var eyesClosed = false;   // are eyes currently closed?
    var closeStartMs = 0;       // when eyes closed
    var lastClickMs = 0;       // when last click fired
    var lastCloseEndMs = 0;       // when eyes last opened (for double-blink)
    var smoothL = 0;       // smoothed left-eye closedness 0..1
    var smoothR = 0;       // smoothed right-eye closedness 0..1

    /* ── Tunable thresholds ── */
    var CLOSE_THRESH = 0.20;   // average must reach this to count as "closed" (lowered and using average)
    var OPEN_THRESH = 0.15;   // average must drop below this to count as "open"
    var MIN_BLINK_MS = 15;     // ignore sub-15 ms flickers
    var MAX_BLINK_MS = 1200;   // ignore stalled readings
    var DOUBLE_GAP_MS = 500;    // max gap between two blinks to count as double

    /* ── Menu dwell ── */
    var dwellEl = null;
    var dwellStart = 0;
    var DWELL_MS = 1400;
    var lastMenuFireMs = 0;
    var MENU_COOL_MS = 700;

    /* ── Toggle cooldown: prevents eye-blink from immediately re-enabling after mouse-click disable ── */
    var lastToggleMs = 0;
    var TOGGLE_COOL_MS = 2000;  // 2 seconds lock after any toggle

    /* ══════════════════════════════════
       INIT — load model + start camera
       ══════════════════════════════════ */
    function init() {
        setStatus('LOADING MODEL…', 'var(--amber)');
        setToggleBtn(false);

        // MediaPipe is available via the global `vision` object from the CDN bundle
        var FaceLandmarker = vision.FaceLandmarker;
        var FilesetResolver = vision.FilesetResolver;

        FilesetResolver
            .forVisionTasks("./js/wasm")
            .then(function (vObj) {
                return FaceLandmarker.createFromOptions(vObj, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                });
            })
            .then(function (fl) {
                faceLandmarker = fl;
                startCamera();
            })
            .catch(function (err) {
                console.error("MediaPipe init failed:", err);
                setStatus("MODEL ERROR", "var(--red)");
            });
    }

    function startCamera() {
        video = document.getElementById("webcam");
        canvas = document.getElementById("tracker-canvas");
        ctx = canvas.getContext("2d");

        setStatus("STARTING CAMERA…", "var(--amber)");

        navigator.mediaDevices
            .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
            .then(function (stream) {
                video.srcObject = stream;
                video.onloadedmetadata = function () {
                    video.play();
                    running = true;
                    document.body.classList.add("tracking-active");

                    // Show webcam preview & canvas
                    video.style.display = "block";
                    canvas.style.display = "block";

                    setStatus("👁 EYE ACTIVE", "var(--green)");
                    setToggleBtn(true);
                    requestAnimationFrame(loop);
                };
            })
            .catch(function (err) {
                console.error("Camera error:", err);
                setStatus("CAMERA DENIED", "var(--red)");
            });
    }

    /* ══════════════════════════════════
       STOP — kill camera + loop
       ══════════════════════════════════ */
    function stop() {
        running = false;

        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(function (t) { t.stop(); });
            video.srcObject = null;
        }

        document.body.classList.remove("tracking-active");
        document.querySelectorAll(".fake-hover").forEach(function (el) {
            el.classList.remove("fake-hover");
        });
        clearDwell();

        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Hide preview
        if (video) video.style.display = "none";
        if (canvas) canvas.style.display = "none";

        eyesClosed = false;
        smoothL = 0;
        smoothR = 0;
        lastVideoTime = -1;
        lastCloseEndMs = 0;    // reset double-blink state so stop doesn't trigger reload
        closeStartMs = 0;

        setStatus("WEBCAM OFF", "var(--amber)");
        setToggleBtn(false);
    }

    /* ══════════════════════════════════
       TOGGLE — protected by cooldown so a blink can't immediately re-enable
       ══════════════════════════════════ */
    function toggle() {
        var now = performance.now();
        if (now - lastToggleMs < TOGGLE_COOL_MS) return;  // ignore rapid re-triggers
        lastToggleMs = now;

        if (running) {
            stop();
        } else {
            if (faceLandmarker) {
                startCamera();
            } else {
                init();
            }
        }
    }

    /* ══════════════════════════════════
       MAIN LOOP
       ══════════════════════════════════ */
    function loop() {
        if (!running) return;

        /* Run face detection only on new frames */
        if (video.videoWidth > 0 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            try {
                var res = faceLandmarker.detectForVideo(video, performance.now());
                processFrame(res);
            } catch (e) { /* skip bad frame */ }
        }

        /* Smooth cursor toward target */
        cursorX += (targetX - cursorX) * 0.72;
        cursorY += (targetY - cursorY) * 0.72;

        /* Update crosshair position */
        if (typeof UI !== "undefined" && UI.updateCrosshair) {
            UI.updateCrosshair(cursorX, cursorY);
        }

        /* Hover highlight + dwell on buttons */
        var hov = bestTarget();
        document.querySelectorAll(".fake-hover").forEach(function (el) {
            el.classList.remove("fake-hover");
        });
        if (isBtn(hov)) hov.classList.add("fake-hover");
        tickDwell(hov);

        /* Feed mouse-move to game engine */
        var gc = document.getElementById("gameCanvas");
        var mv = new MouseEvent("mousemove", { clientX: cursorX, clientY: cursorY, bubbles: true });
        if (gc) gc.dispatchEvent(mv);
        document.dispatchEvent(mv);

        requestAnimationFrame(loop);
    }

    /* ══════════════════════════════════
       PROCESS FRAME — blink detection
       ══════════════════════════════════ */
    function processFrame(res) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var hasFace = res.faceLandmarks && res.faceLandmarks.length > 0;

        if (hasFace) {
            var lm = res.faceLandmarks[0];
            var bs = res.faceBlendshapes[0].categories;

            /* ── Cursor from nose tip ── */
            var nose = lm[1];
            /* Tight 0.16 window → small head-tilt reaches screen edges */
            var nx = clamp01((nose.x - 0.42) / 0.16);
            var ny = clamp01((nose.y - 0.40) / 0.16);
            targetX = (1 - nx) * window.innerWidth;
            targetY = ny * window.innerHeight;

            /* ── Both-eye closedness metric ── */
            /* Blendshapes */
            var bsL = scoreOf(bs, "eyeBlinkLeft");
            var bsR = scoreOf(bs, "eyeBlinkRight");

            /* Eye Aspect Ratio (geometric backup) */
            var earL = eyeAR(lm, [33, 160, 158, 133, 153, 144]);
            var earR = eyeAR(lm, [362, 385, 387, 263, 373, 380]);
            /* Invert EAR: lower EAR = more closed → higher closedness */
            var earCloseL = clamp01((0.28 - earL) / 0.16);
            var earCloseR = clamp01((0.28 - earR) / 0.16);

            /* Fuse: take the max of blendshape and EAR for each eye */
            var rawL = Math.max(bsL, earCloseL);
            var rawR = Math.max(bsR, earCloseR);

            /* Smooth each eye independently (faster blend for snappier response) */
            smoothL = 0.3 * smoothL + 0.7 * rawL;
            smoothR = 0.3 * smoothR + 0.7 * rawR;

            /* Average closedness makes it much more reliable if one eye's reading is slightly off */
            var avgClose = (smoothL + smoothR) / 2;
            var bothClosed = avgClose >= CLOSE_THRESH;
            var bothOpen = avgClose < OPEN_THRESH;

            /* Draw face dots on preview */
            ctx.fillStyle = bothClosed ? "#ff3344" : "#00ff88";
            for (var i of [33, 133, 362, 263, 1, 4]) {
                if (!lm[i]) continue;
                ctx.beginPath();
                ctx.arc(lm[i].x * canvas.width, lm[i].y * canvas.height, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            /* Debug text on preview */
            ctx.fillStyle = "#00ff88";
            ctx.font = "8px monospace";
            ctx.fillText("L:" + smoothL.toFixed(2) + " R:" + smoothR.toFixed(2), 2, canvas.height - 3);

            /* ── Transition detection ── */
            var now = performance.now();

            if (!eyesClosed && bothClosed) {
                /* Eyes just closed */
                eyesClosed = true;
                closeStartMs = now;

            } else if (eyesClosed && bothOpen) {
                /* Eyes just opened — blink complete */
                eyesClosed = false;
                var dur = now - closeStartMs;

                if (dur >= MIN_BLINK_MS && dur <= MAX_BLINK_MS) {
                    handleBlink(dur, now);
                }
            }
        }
    }

    /* ══════════════════════════════════
       HANDLE BLINK → fire action
       ══════════════════════════════════ */
    function handleBlink(dur, now) {
        var el = bestTarget();
        var onMenu = isBtn(el);
        var gap = lastCloseEndMs > 0 ? now - lastCloseEndMs : -1;

        if (dur > 600) {
            /* Long blink → special (right-click / Q) */
            if (!onMenu) fireSpecial();
            lastCloseEndMs = now;

        } else {
            /* Any normal blink → ALWAYS click/shoot */
            if (onMenu) {
                if (now - lastMenuFireMs > MENU_COOL_MS) {
                    lastMenuFireMs = now;
                    fireClick(el);
                }
                lastCloseEndMs = now;
            } else {
                /* Game canvas — shoot fast */
                fireClick(el);

                /* Check if it's ALSO a double blink (to reload) */
                if (gap > 0 && gap < DOUBLE_GAP_MS) {
                    fireDoubleClick(el);
                    lastCloseEndMs = 0;  // reset so triple doesn't re-trigger
                } else {
                    lastCloseEndMs = now;
                }
            }
        }

        lastClickMs = now;
    }

    /* ══════════════════════════════════
       CLICK DISPATCHERS
       ══════════════════════════════════ */
    function fireClick(el) {
        if (!el) return;
        var opts = { clientX: cursorX, clientY: cursorY, bubbles: true, cancelable: true, button: 0, buttons: 1, view: window };

        // Buttons should just use click() so they don't get duplicate events
        if (el.tagName === "BUTTON" || el.tagName === "A") {
            el.click();
        } else {
            // Restore exact full-event dispatch needed for game listeners
            if (typeof el.click === "function") el.click();
            el.dispatchEvent(new MouseEvent("click", opts));
            var gc = document.getElementById("gameCanvas");
            if (gc && el !== gc) gc.dispatchEvent(new MouseEvent("click", opts));
            window.dispatchEvent(new MouseEvent("click", Object.assign({}, opts, { bubbles: false })));
        }
    }

    function fireDoubleClick(el) {
        if (!el) return;
        var opts = { clientX: cursorX, clientY: cursorY, bubbles: true, cancelable: true, button: 0, buttons: 1, view: window };
        el.dispatchEvent(new MouseEvent("dblclick", opts));
        var gc = document.getElementById("gameCanvas");
        if (gc && el !== gc) gc.dispatchEvent(new MouseEvent("dblclick", opts));
        window.dispatchEvent(new MouseEvent("dblclick", Object.assign({}, opts, { bubbles: false })));
        lastCloseEndMs = 0;
    }

    function fireSpecial() {
        var el = bestTarget();
        var opts = { clientX: cursorX, clientY: cursorY, bubbles: true, cancelable: true };
        el.dispatchEvent(new MouseEvent("contextmenu", opts));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
    }

    /* ══════════════════════════════════
       TARGET DETECTION
       ══════════════════════════════════ */
    function bestTarget() {
        var pts = document.elementsFromPoint(cursorX, cursorY);
        for (var i = 0; i < pts.length; i++) {
            var el = pts[i];
            if (el.id === "crosshair") continue;
            if (window.getComputedStyle(el).pointerEvents === "none") continue;
            if (el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "INPUT") return el;
            if (el.classList && el.classList.contains("menu-btn")) return el;
        }
        return document.getElementById("gameCanvas") || document.body;
    }

    function isBtn(el) {
        if (!el) return false;
        return el.tagName === "BUTTON" || (el.classList && el.classList.contains("menu-btn"));
    }

    /* ══════════════════════════════════
       DWELL (menus — look-and-hold)
       ══════════════════════════════════ */
    function clearDwell() {
        dwellEl = null;
        dwellStart = 0;
        document.querySelectorAll(".dwell-ring").forEach(function (r) { r.remove(); });
    }

    function tickDwell(hov) {
        if (!isBtn(hov) || hov.id === "eye-toggle-btn" || hov.id === "btnToggleMusic") {
            if (dwellEl) clearDwell();
            return;
        }
        var now = performance.now();
        if (hov !== dwellEl) { clearDwell(); dwellEl = hov; dwellStart = now; }
        var p = Math.min(1, (now - dwellStart) / DWELL_MS);
        drawDwellRing(hov, p);
        if (p >= 1) {
            clearDwell();
            if (now - lastMenuFireMs > MENU_COOL_MS) {
                lastMenuFireMs = now;
                fireClick(hov);
            }
        }
    }

    function drawDwellRing(btn, p) {
        var ring = btn.querySelector(".dwell-ring");
        if (!ring) {
            ring = document.createElement("div");
            ring.className = "dwell-ring";
            ring.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;pointer-events:none;z-index:9999;transition:opacity 0.1s;";
            btn.style.position = "relative";
            btn.appendChild(ring);
        }
        var deg = Math.round(p * 360);
        ring.style.background = "conic-gradient(var(--green) " + deg + "deg, transparent " + deg + "deg)";
        ring.style.opacity = p > 0.05 ? "1" : "0";
    }

    /* ══════════════════════════════════
       MATH HELPERS
       ══════════════════════════════════ */
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    function scoreOf(bs, name) {
        for (var i = 0; i < bs.length; i++) {
            if (bs[i].categoryName === name) return bs[i].score;
        }
        return 0;
    }

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    function eyeAR(lm, idx) {
        /* Eye Aspect Ratio — low value = closed */
        var w = dist(lm[idx[0]], lm[idx[3]]);
        var h = (dist(lm[idx[1]], lm[idx[5]]) + dist(lm[idx[2]], lm[idx[4]])) / 2;
        return w === 0 ? 0 : h / w;
    }

    /* ══════════════════════════════════
       UI HELPERS
       ══════════════════════════════════ */
    function setStatus(msg, color) {
        var el = document.getElementById("tracker-status");
        if (!el) return;
        el.textContent = msg;
        el.style.color = color;
    }

    function setToggleBtn(on) {
        var btn = document.getElementById("eye-toggle-btn");
        if (!btn) return;
        if (on) {
            btn.textContent = "👁 EYE CONTROL: ON  — click to disable";
            btn.style.color = "var(--green)";
            btn.style.borderColor = "var(--green)";
        } else {
            btn.textContent = "👁 EYE CONTROL: OFF — click to enable";
            btn.style.color = "var(--amber)";
            btn.style.borderColor = "var(--amber)";
        }
    }

    /* Public API */
    return { init: init, stop: stop, toggle: toggle };

}());

/* ═══════════════════════════════════════════════════════════════
   AUTO-START on page load
   ═══════════════════════════════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", function () {
    /* Dwell ring style */
    var s = document.createElement("style");
    s.textContent = ".menu-btn { position: relative !important; }";
    document.head.appendChild(s);

    /* Auto-start eye tracker */
    window.EyeTracker.init();
});
