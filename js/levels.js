/* ──────────────────────────────────────────────────────────────
   LEVEL DEFINITIONS
   Operation Silent Sight – 5 Levels
   ────────────────────────────────────────────────────────────── */

const LEVELS = [

    /* ══════════════════════════════════════════
       LEVEL 1 — TRAINING FACILITY
       ══════════════════════════════════════════ */
    {
        index: 1,
        name: 'TRAINING FACILITY',
        objective: 'Shoot all targets.',
        newMechanics: [
            'Move your head/eyes to aim',
            'Blink both eyes to fire',
            'Double-blink to reload'
        ],
        maxAmmo: 30,
        winCondition: 'kills', // kill all enemies to win
        killTarget: 8,
        accuracyRequired: 20,
        hasTimer: false,
        nightMode: false,
        friendlyFire: false,
        specialEnabled: false,
        bgColor: '#0a1a0a',
        bgType: 'range',
        spawnWaves: [
            {
                delay: 500,
                enemies: [
                    { type: 'DUMMY', x: 250 }, { type: 'DUMMY', x: 450 },
                    { type: 'DUMMY', x: 650 }, { type: 'DUMMY', x: 850 }
                ]
            },
            {
                delay: 5000,
                enemies: [
                    { type: 'DUMMY', x: 300 }, { type: 'DUMMY', x: 500 },
                    { type: 'DUMMY', x: 700 }, { type: 'DUMMY', x: 900 }
                ]
            }
        ],
        prologue: [
            '> NEURAL COMBAT INTERFACE — BOOT SEQUENCE',
            '> OPERATOR ID: [REDACTED]',
            '',
            'You have been selected for Project NCI.',
            'The Neural Combat Interface allows soldiers to',
            'aim and engage targets using only eye movement.',
            '',
            'Today is your first calibration session.',
            'Targets are training dummies.',
            'No live fire. No casualties.',
            '',
            '> WARNING: Enemy drone activity detected.',
            '> TRAINING SESSION CONVERTED TO:',
            '> ⚡ LIVE DEFENSE MODE ⚡',
            '',
            'Good luck, operator.',
        ]
    },

    /* ══════════════════════════════════════════
       LEVEL 2 — CHECKPOINT DEFENSE
       ══════════════════════════════════════════ */
    {
        index: 2,
        name: 'CHECKPOINT DEFENSE',
        objective: 'Eliminate hostiles. Protect civilians. Reach 30% accuracy.',
        newMechanics: [
            'Friend-or-Foe recognition — CIVILIANS now present',
            'Shooting a civilian = -300 pts + accuracy penalty',
            'Double Blink to Reload'
        ],
        maxAmmo: 30,
        winCondition: 'kills',
        killTarget: 11, // fixed from 16, as there are only 11 soldiers!
        accuracyRequired: 30,
        hasTimer: true,
        timeLimit: 120,
        nightMode: true,
        friendlyFire: true,
        specialEnabled: false,
        bgColor: '#050a08',
        bgType: 'night',
        spawnWaves: [
            {
                delay: 500,
                enemies: [
                    { type: 'SOLDIER', x: 200 }, { type: 'CIVILIAN', x: 350 }, { type: 'SOLDIER', x: 500 },
                    { type: 'SOLDIER', x: 700 }, { type: 'CIVILIAN', x: 850 }
                ]
            },
            {
                delay: 12000,
                enemies: [
                    { type: 'SOLDIER', x: 150 }, { type: 'SOLDIER', x: 280 }, { type: 'CIVILIAN', x: 430 },
                    { type: 'SOLDIER', x: 580 }, { type: 'SOLDIER', x: 730 }, { type: 'CIVILIAN', x: 900 }
                ]
            },
            {
                delay: 25000,
                enemies: [
                    { type: 'SOLDIER', x: 200 }, { type: 'SOLDIER', x: 350 }, { type: 'SOLDIER', x: 500 },
                    { type: 'CIVILIAN', x: 600 }, { type: 'SOLDIER', x: 750 }
                ]
            }
        ]
    },

    /* ══════════════════════════════════════════
       LEVEL 3 — DRONE ASSAULT
       ══════════════════════════════════════════ */
    {
        index: 3,
        name: 'DRONE ASSAULT',
        objective: 'Track and destroy all aerial drones. Use Thermal Vision.',
        newMechanics: [
            'Aerial targets — require tracking moving enemies',
            'Right Click / Hold Q: Thermal Vision (Long Blink)',
            'Thermal Vision reveals drone weak spots',
            'Panic blink mechanic — rapid clicking reduces accuracy'
        ],
        maxAmmo: 10,
        winCondition: 'kills',
        killTarget: 14,
        accuracyRequired: 60,
        hasTimer: true,
        timeLimit: 80,
        nightMode: true,
        friendlyFire: false,
        specialEnabled: true,
        specialType: 'thermal',
        bgColor: '#030810',
        bgType: 'sky',
        spawnWaves: [
            {
                delay: 500,
                enemies: [
                    { type: 'DRONE', x: 200, y: 200 }, { type: 'DRONE', x: 500, y: 180 }, { type: 'DRONE', x: 800, y: 220 }
                ]
            },
            {
                delay: 10000,
                enemies: [
                    { type: 'DRONE', x: 150, y: 160 }, { type: 'DRONE', x: 400, y: 200 }, { type: 'DRONE', x: 650, y: 180 },
                    { type: 'DRONE', x: 900, y: 210 }
                ]
            },
            {
                delay: 22000,
                enemies: [
                    { type: 'DRONE', x: 200, y: 150 }, { type: 'DRONE', x: 350, y: 190 },
                    { type: 'DRONE', x: 600, y: 170 }, { type: 'DRONE', x: 750, y: 200 },
                    { type: 'DRONE', x: 950, y: 160 }, { type: 'SOLDIER', x: 400, y: 380 },
                    { type: 'SOLDIER', x: 650, y: 380 }
                ]
            }
        ]
    },

    /* ══════════════════════════════════════════
       LEVEL 4 — BASE BREACH
       ══════════════════════════════════════════ */
    {
        index: 4,
        name: 'BASE BREACH',
        objective: 'Repel enemy waves. Target weak spots for bonus damage.',
        newMechanics: [
            'Armored enemies — require headshots or core hits',
            'Headshot multiplier: 3×',
            'Combo system: chain kills for bonus points',
            'Thermal Vision still available'
        ],
        maxAmmo: 10,
        winCondition: 'kills',
        killTarget: 18,
        accuracyRequired: 60,
        hasTimer: true,
        timeLimit: 120,
        nightMode: false,
        friendlyFire: true,
        specialEnabled: true,
        specialType: 'thermal',
        bgColor: '#0a0a0a',
        bgType: 'base',
        spawnWaves: [
            {
                delay: 500,
                enemies: [
                    { type: 'SOLDIER', x: 200 }, { type: 'ARMORED', x: 400 },
                    { type: 'CIVILIAN', x: 550 }, { type: 'SOLDIER', x: 700 }, { type: 'SOLDIER', x: 850 }
                ]
            },
            {
                delay: 15000,
                enemies: [
                    { type: 'ARMORED', x: 200 }, { type: 'ARMORED', x: 400 },
                    { type: 'SOLDIER', x: 550 }, { type: 'CIVILIAN', x: 650 }, { type: 'ARMORED', x: 800 }
                ]
            },
            {
                delay: 35000,
                enemies: [
                    { type: 'ARMORED', x: 150 }, { type: 'SOLDIER', x: 280 }, { type: 'ARMORED', x: 420 },
                    { type: 'SOLDIER', x: 560 }, { type: 'ARMORED', x: 700 }, { type: 'CIVILIAN', x: 830 },
                    { type: 'DRONE', x: 400, y: 180 }, { type: 'DRONE', x: 700, y: 190 }
                ]
            }
        ]
    },

    /* ══════════════════════════════════════════
       LEVEL 5 — NIGHT OPERATION + BOSS
       ══════════════════════════════════════════ */
    {
        index: 5,
        name: 'NIGHT OPERATION',
        objective: 'Survive the night. Hold gaze to defeat the Drone Boss.',
        newMechanics: [
            'Limited visibility — enemies hide in shadows',
            'BOSS: Armored Drone Tank — hold gaze 2 seconds to fire laser',
            'All mechanics combined',
            'Thermal Vision critical for target ID'
        ],
        maxAmmo: 10,
        winCondition: 'boss',
        killTarget: 0,
        accuracyRequired: 55,
        hasTimer: true,
        timeLimit: 180,
        nightMode: true,
        friendlyFire: true,
        specialEnabled: true,
        specialType: 'thermal',
        bgColor: '#020408',
        bgType: 'night',
        spawnWaves: [
            {
                delay: 500,
                enemies: [
                    { type: 'SOLDIER', x: 200 }, { type: 'SOLDIER', x: 450 }, { type: 'CIVILIAN', x: 600 },
                    { type: 'ARMORED', x: 800 }
                ]
            },
            {
                delay: 12000,
                enemies: [
                    { type: 'DRONE', x: 200, y: 180 }, { type: 'DRONE', x: 500, y: 200 }, { type: 'DRONE', x: 800, y: 170 },
                    { type: 'SOLDIER', x: 350 }, { type: 'SOLDIER', x: 650 }, { type: 'CIVILIAN', x: 500 }
                ]
            },
            {
                delay: 28000,
                enemies: [
                    { type: 'ARMORED', x: 200 }, { type: 'ARMORED', x: 800 },
                    { type: 'SOLDIER', x: 350 }, { type: 'SOLDIER', x: 650 }
                ]
            },
            {
                // Boss wave
                delay: 45000,
                enemies: [
                    { type: 'BOSS', x: 550, y: 230 }
                ]
            }
        ]
    }
];
