/* ──────────────────────────────────────────────────────────────
   ENEMY DEFINITIONS & RENDERING
   Operation Silent Sight
   ────────────────────────────────────────────────────────────── */

const EnemyTypes = {

    /* ── TRAINING DUMMY ── */
    DUMMY: {
        id: 'DUMMY', name: 'Target Dummy',
        hp: 1, points: 50,
        speed: 0, friendly: false, aerial: false,
        width: 38, height: 60,
        color: '#885533', headColor: '#cc9966',
        createMesh(e) {
            const group = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.2), new THREE.MeshPhongMaterial({ color: 0x885533 }));
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshPhongMaterial({ color: 0xcc9966 }));
            head.position.y = 0.6;
            group.add(body, head);
            return group;
        },
        draw(ctx, e, thermal, nightMode) {
            const pulse = Math.sin(Date.now() * 0.003) * 2;
            const col = thermal ? '#ff8800' : nightMode ? '#445544' : this.color;
            const hcol = thermal ? '#ffcc00' : nightMode ? '#667766' : this.headColor;
            // Body
            ctx.fillStyle = col;
            ctx.fillRect(e.x - 14, e.y - 10, 28, 40);
            // Head
            ctx.fillStyle = hcol;
            ctx.beginPath(); ctx.arc(e.x, e.y - 20, 14, 0, Math.PI * 2); ctx.fill();
            // Crosshair on dummy
            ctx.strokeStyle = 'rgba(255,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(e.x - 8, e.y + 10); ctx.lineTo(e.x + 8, e.y + 10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(e.x, e.y + 2); ctx.lineTo(e.x, e.y + 18); ctx.stroke();
            // Weak-spot highlight
            if (thermal) {
                ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1;
                ctx.strokeRect(e.x - 5, e.y - 27, 10, 14);
            }
        }
    },

    /* ── SOLDIER ── */
    SOLDIER: {
        id: 'SOLDIER', name: 'Hostile Soldier',
        hp: 2, points: 100,
        speed: 1.2, friendly: false, aerial: false,
        width: 32, height: 58,
        color: '#2d5a1b', headColor: '#c4956a',
        createMesh(e) {
            const group = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.3), new THREE.MeshPhongMaterial({ color: 0x2d5a1b }));
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshPhongMaterial({ color: 0xc4956a }));
            head.position.y = 0.5;
            const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), new THREE.MeshPhongMaterial({ color: 0x1d3a1b }));
            helmet.position.y = 0.65;
            group.add(body, head, helmet);
            return group;
        },
        draw(ctx, e, thermal, nightMode) {
            const col = thermal ? '#ff4400' : nightMode ? '#1a2e1a' : this.color;
            const hcol = thermal ? '#ffaa00' : nightMode ? '#334433' : this.headColor;
            // Legs
            ctx.fillStyle = col;
            ctx.fillRect(e.x - 10, e.y + 15, 8, 20);
            ctx.fillRect(e.x + 2, e.y + 15, 8, 20);
            // Body
            ctx.fillRect(e.x - 13, e.y - 8, 26, 26);
            // Weapon arm
            ctx.fillRect(e.x + 13, e.y - 2, 14, 5);
            // Head
            ctx.fillStyle = hcol;
            ctx.beginPath(); ctx.arc(e.x, e.y - 18, 12, 0, Math.PI * 2); ctx.fill();
            // Helmet
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y - 22, 14, 8, 0, Math.PI, 0); ctx.fill();
            // Headshot indicator (thermal)
            if (thermal || e.showWeakspot) {
                ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(e.x, e.y - 18, 14, 0, Math.PI * 2); ctx.stroke();
            }
            // HP bar
            if (e.hp < e.maxHp) {
                const bw = 30, bh = 4;
                ctx.fillStyle = 'rgba(0,0,0,.5)';
                ctx.fillRect(e.x - bw / 2, e.y - 38, bw, bh);
                ctx.fillStyle = '#ff3344';
                ctx.fillRect(e.x - bw / 2, e.y - 38, bw * (e.hp / e.maxHp), bh);
            }
        }
    },

    /* ── CIVILIAN ── */
    CIVILIAN: {
        id: 'CIVILIAN', name: 'Civilian',
        hp: 1, points: -300,
        speed: 0.8, friendly: true, aerial: false,
        width: 28, height: 54,
        color: '#7a6a55', headColor: '#d4a574',
        draw(ctx, e, thermal, nightMode) {
            const col = thermal ? '#00bbff' : nightMode ? '#3a3028' : this.color;
            const hcol = thermal ? '#00ffee' : nightMode ? '#5a4a3a' : this.headColor;
            // Skirt/pants
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(e.x - 12, e.y + 5);
            ctx.lineTo(e.x + 12, e.y + 5);
            ctx.lineTo(e.x + 9, e.y + 35);
            ctx.lineTo(e.x - 9, e.y + 35);
            ctx.closePath(); ctx.fill();
            // Body
            ctx.fillRect(e.x - 10, e.y - 12, 20, 20);
            // Head
            ctx.fillStyle = hcol;
            ctx.beginPath(); ctx.arc(e.x, e.y - 22, 11, 0, Math.PI * 2); ctx.fill();
            // Arms (raised = "don't shoot" pose)
            ctx.fillStyle = col;
            ctx.fillRect(e.x - 22, e.y - 10, 10, 4);
            ctx.fillRect(e.x + 12, e.y - 10, 10, 4);
            // CIVILIAN badge
            if (!nightMode || thermal) {
                ctx.fillStyle = '#00aaff';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('CIV', e.x, e.y - 38);
            }
        }
    },

    /* ── ARMORED SOLDIER ── */
    ARMORED: {
        id: 'ARMORED', name: 'Armored Soldier',
        hp: 5, points: 200,
        speed: 0.7, friendly: false, aerial: false,
        width: 40, height: 62,
        color: '#3a3a3a', headColor: '#555555',
        draw(ctx, e, thermal, nightMode) {
            const col = thermal ? '#ff5500' : nightMode ? '#1a1a1a' : this.color;
            // Legs
            ctx.fillStyle = col;
            ctx.fillRect(e.x - 13, e.y + 16, 12, 22);
            ctx.fillRect(e.x + 1, e.y + 16, 12, 22);
            // Body armor
            ctx.fillStyle = thermal ? '#ff3300' : '#222';
            ctx.fillRect(e.x - 17, e.y - 14, 34, 32);
            // Armor plates
            ctx.fillStyle = col;
            ctx.fillRect(e.x - 15, e.y - 12, 30, 28);
            // Weak spots highlight
            if (thermal || e.showWeakspot) {
                ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2;
                // Head weak spot
                ctx.beginPath(); ctx.arc(e.x, e.y - 26, 13, 0, Math.PI * 2); ctx.stroke();
                // Core weak spot
                ctx.strokeRect(e.x - 8, e.y - 5, 16, 16);
            }
            // Head
            ctx.fillStyle = thermal ? '#ffaa00' : '#444';
            ctx.beginPath(); ctx.arc(e.x, e.y - 26, 13, 0, Math.PI * 2); ctx.fill();
            // Visor
            ctx.fillStyle = thermal ? '#ff0000' : '#00aaff';
            ctx.fillRect(e.x - 8, e.y - 30, 16, 6);
            // HP bar
            if (e.hp < e.maxHp) {
                const bw = 36, bh = 5;
                ctx.fillStyle = 'rgba(0,0,0,.6)';
                ctx.fillRect(e.x - bw / 2, e.y - 46, bw, bh);
                ctx.fillStyle = '#ff3344';
                ctx.fillRect(e.x - bw / 2, e.y - 46, bw * (e.hp / e.maxHp), bh);
            }
        }
    },

    /* ── DRONE ── */
    DRONE: {
        id: 'DRONE', name: 'Military Drone',
        hp: 3, points: 150,
        speed: 1.8, friendly: false, aerial: true,
        width: 50, height: 30,
        color: '#445566', headColor: '#334455',
        createMesh(e) {
            const group = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 6), new THREE.MeshPhongMaterial({ color: 0x445566 }));
            body.rotation.x = Math.PI / 2;
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0x00aaff }));
            eye.position.set(0, 0, -0.3);
            group.add(body, eye);
            return group;
        },
        draw(ctx, e, thermal, nightMode) {
            const col = thermal ? '#ff6600' : nightMode ? '#1a2233' : this.color;
            const t = Date.now() * 0.005;
            const hov = Math.sin(t + e.seed) * 4;
            const y = e.y + hov;
            // Body
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.ellipse(e.x, y, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
            // Arms
            ctx.fillStyle = thermal ? '#ff4400' : '#334';
            ctx.fillRect(e.x - 36, y - 3, 16, 6);
            ctx.fillRect(e.x + 20, y - 3, 16, 6);
            // Rotors (spinning)
            const angle = (Date.now() * 0.02) % (Math.PI * 2);
            ctx.strokeStyle = thermal ? '#ffcc00' : 'rgba(100,180,255,0.6)';
            ctx.lineWidth = 2;
            [-38, 28].forEach(ox => {
                ctx.save();
                ctx.translate(e.x + ox, y);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
                ctx.restore();
            });
            // Eye/camera
            ctx.fillStyle = thermal ? '#ff0000' : '#00aaff';
            ctx.beginPath(); ctx.arc(e.x + 8, y + 2, 5, 0, Math.PI * 2); ctx.fill();
            // HP bar
            if (e.hp < e.maxHp) {
                const bw = 44, bh = 4;
                ctx.fillStyle = 'rgba(0,0,0,.6)';
                ctx.fillRect(e.x - bw / 2, y - 18, bw, bh);
                ctx.fillStyle = '#ff3344';
                ctx.fillRect(e.x - bw / 2, y - 18, bw * (e.hp / e.maxHp), bh);
            }
        }
    },

    /* ── BOSS DRONE TANK ── */
    BOSS: {
        id: 'BOSS', name: 'Armored Drone Tank',
        hp: 20, points: 2000,
        speed: 0.5, friendly: false, aerial: true,
        width: 100, height: 50,
        color: '#1a1a2e', headColor: '#16213e',
        draw(ctx, e, thermal, nightMode) {
            const t = Date.now() * 0.002;
            const hov = Math.sin(t) * 6;
            const y = e.y + hov;
            const col = thermal ? '#ff2200' : '#0d0d1a';
            const accent = thermal ? '#ff8800' : '#00aaff';
            // Main body
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.ellipse(e.x, y, 50, 20, 0, 0, Math.PI * 2); ctx.fill();
            // Armor plates
            ctx.fillStyle = thermal ? '#ff4400' : '#1a1a2e';
            ctx.fillRect(e.x - 45, y - 15, 90, 30);
            // Weapon pods
            ctx.fillStyle = thermal ? '#ff6600' : '#333355';
            ctx.fillRect(e.x - 60, y - 5, 16, 10);
            ctx.fillRect(e.x + 44, y - 5, 16, 10);
            // Laser eye
            const lockPct = e.lockProgress || 0;
            ctx.fillStyle = lockPct > 0 ? `hsl(${120 - lockPct * 120},100%,50%)` : accent;
            ctx.beginPath(); ctx.arc(e.x, y, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,.8)';
            ctx.beginPath(); ctx.arc(e.x, y, 8, 0, Math.PI * 2); ctx.fill();
            // Lock ring
            if (lockPct > 0) {
                ctx.strokeStyle = `hsl(${120 - lockPct * 120},100%,60%)`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(e.x, y, 20, -Math.PI / 2, -Math.PI / 2 + lockPct * Math.PI * 2);
                ctx.stroke();
            }
            // "BOSS" label
            ctx.fillStyle = '#ff0000';
            ctx.font = `bold 12px 'Orbitron', monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('⚠ BOSS', e.x, y - 35);
            // HP bar
            const bw = 100, bh = 8;
            ctx.fillStyle = 'rgba(0,0,0,.7)';
            ctx.fillRect(e.x - bw / 2, y - 52, bw, bh);
            ctx.fillStyle = e.hp < 5 ? '#ff3344' : '#ff6600';
            ctx.fillRect(e.x - bw / 2, y - 52, bw * (e.hp / e.maxHp), bh);
            ctx.strokeStyle = 'rgba(255,100,0,.5)'; ctx.lineWidth = 1;
            ctx.strokeRect(e.x - bw / 2, y - 52, bw, bh);
        }
    }
};

/* ──────────────────────────────────────────────────────────────
   ENEMY INSTANCE FACTORY
   ────────────────────────────────────────────────────────────── */
function createEnemy(typeId, x, y, overrides = {}) {
    const def = EnemyTypes[typeId];
    if (!def) throw new Error('Unknown enemy type: ' + typeId);
    return {
        ...def,
        x, y,
        startX: x,
        hp: def.hp,
        maxHp: def.hp,
        seed: Math.random() * Math.PI * 2,
        alive: true,
        dying: false,
        dyingTimer: 0,
        moveDir: Math.random() < 0.5 ? 1 : -1,
        moveClock: 0,
        shootTimer: Math.random() * 180,
        lockProgress: 0,
        showWeakspot: false,
        ...overrides
    };
}
