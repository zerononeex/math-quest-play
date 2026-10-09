// ALL numbers live here (docs/SPEC.md "Appendix: CONFIG table"). Tune here only.
function deepFreeze(o) {
  Object.values(o).forEach((v) => { if (v && typeof v === 'object') deepFreeze(v); });
  return Object.freeze(o);
}

export const CONFIG = deepFreeze({
  VIEW: { H: 480, W_MIN: 640, W_MAX: 720, ROOM_W: 640, TILE: 16, RENDER_SCALE: 2, RENDER_SCALE_FALLBACK: 1, CANVAS_MAX_PX: 4096, TAP_MIN_LOGICAL_PX: 30, HERO_ART_H: 50, HERO_SCREEN_DIV: 8.5 }, // [A2] world zoom: engine/render.js worldZoom() — hero (≈50 art px) ≈ 1/8.5 of the screen height, whole device px per art px
  TUTORIAL: { DUMMY_DX: 56, DUMMY_DY: -6, MOVE_PX: 40, SWING_PX: 34, AP_S: 3.5, CHEER_S: 1.2 }, // [A8e] pad tutorial (game/tutorial.js)
  CELL: { FILL: '#2a62c8', EDGE: '#8cc4ff', SEL_FILL: '#3f7fe8', SEL_EDGE: '#ffd040', DARK: '#1c3c80', R: 10 }, // [R1-7/17] the one clean button/cell style
  UI: { MAP_MINI: 0.25, SHOP_TALK: 44, SHOP: { LEFT: 150, TOP: 96, COLS: 4, ROWS: 2, GAP: 12, CARD_H: 130, ICON: 48 }, ATTACK: { BIG: 68, SMALL: 56, PAD: 8, GAP: 6, ICON: 0.62, ART: 0.9, GHOST: { SCALE: 0.62, MAIN: 0.8, DX: 0.2, DY: 0.2, ALPHA: 0.45 } }, // [R3-16] GHOST: the next ammo/special behind the current one // [HUD-ATTACK] the 3 big bottom-right attack buttons (logical px; ICON / ART = code / art icon size ÷ button)
    HUD_RESERVED_H: 84, HUD_SCALE: 1.5, // [R3-5] the top bar 1.5x taller, its left group drawn at 1.5x
    FONT_TIMEOUT_MS: 1500, DIALOGUE_LINES: 2, DIALOGUE_PAD: 10, TOAST_S: 2, MIN_FONT_PX: 6 },
  FONTS: { DISPLAY: "'PressStart2P', monospace", BODY: "'PixelifySans', monospace", UI: "Arial, Helvetica, 'Helvetica Neue', sans-serif" }, // [R1-6] UI = built-in sans (iPad has it): math + all buttons
  LOOP: { TICK_HZ: 60, MAX_FRAME_MS: 250, STATS_RING: 600 },
  HERO: { SPEED: 100, PASS_SYNTH: { milo: { legFrac: 0.27, squeeze: 0.55, lift: 1 } } }, // PASS_SYNTH [R3c]: synthetic legs-together side frame (Milo's sheet has only strides)
  MATH: {
    ANSWER_BUTTONS: 4,
    AP_PER_Q: { little: 12, adventurer: 10, master: 9 }, // [D34]
    AP_PER_Q_WORLD_MULT: [1, 1, 1, 1, 1, 1, 1, 1], // [D36] by world band 0–7; ≤ 1, non-increasing; audit tunes if later worlds are too slow
    STREAK_STEP: 5, STREAK_MAX_BONUS: 3,
    ADAPT_DROP_WRONG: 3, ADAPT_CLIMB_RIGHT: 10,
    TIER_FLOOR: { little: 0, adventurer: 0, master: 2 },
    WORLD_BAND: [0, 1, 2, 3, 4, 5, 6, 7],
    DISTRACTOR_OFFSETS: [3, 6, 10, 15], DISTRACTOR_OFFSETS_SMALL: [1, 2, 3], SMALL_ANSWER: 20,
    POPUP_RIGHT_S: 0, POPUP_WRONG_S: 1.2, AP_FLOAT_DY: 34, AP_FLOAT_COLOR: '#80e0ff', // [R3d] '+N AP' over the hero on a first-try right answer
    // [R3-1] a right answer closes at once (0 = no hold)
    AUTO_REOPEN_GAP: 2.0, // [V3] one question per opening: result shown, then close; auto-open waits the gap
  },
  AP: { START: 20, CAP_BASE: 50, PER_BOOTS_TIER: 3, EMPTY_Q_DELAY: 1.0 },
  XP: {
    BASE: 20, EXP: 1.8,
    LEVEL_CAPS: [10, 18, 26, 34, 42, 50, 60, 99],
    AT_CAP_MULT: 0.05,
    // G09: kill XP = enemy data xp × KILL_MULT[world]; boss XP per world (tuned by tools/audit.js so a full clear lands at cap−2 … cap).
    KILL_MULT: [5, 26, 50, 103, 150, 220, 300, 4000],
    BOSS_SUB: [150, 1500, 3000, 6000, 9000, 13000, 18000, 3000],
    BOSS_MAIN: [1100, 4500, 10000, 16000, 24000, 34000, 46000, 550000],
    ELITE_MULT: 2,
    TIER_MULT: { little: 1.30, adventurer: 1.15, master: 1.0 },
  },
  HEARTS: { START: 3, CAP: 20, PER_BOSS: 1, BOSS_WORLDS: 6, EVERY_LEVELS: 8, PER_ROW: 10, ROWS: 2, PIECES_PER_HEART: 4 }, // [D52] heart pieces: 4 = +1 heart (cap 20 kept)
  STATS: {
    AUTO_ORDER: ['str', 'def', 'str', 'def', 'luck'], // [R3-4] auto-spend: strength and defense before luck
    POINTS_PER_LEVEL: 1, STAR_SEEDS_TOTAL: 35,
    DEF_MAX_CUT: 0.6,
    LUCK_DROP_PER_PT: 0.02, LUCK_DROP_MAX: 0.60,
    LUCK_CRIT_PER_PT: 0.01, LUCK_CRIT_MAX: 0.25, CRIT_MULT: 2,
    BOSS_HIT_CLAMP: [0.6, 1.6],
  },
  TIER_MODS: {
    little: { enemyDmg: 1, bossHits: 0.8, windup: 1.5, hitsDealOne: true, finalSpeed: 0.8 },
    adventurer: { enemyDmg: 1, bossHits: 1, windup: 1 },
    master: { enemyDmg: 1.25, bossHits: 1.25, windup: 1 },
  },
  COMBAT: {
    MELEE_CD: 0.30, CHARGE_BONK_S: 0.7, HERO_IFRAMES: 1.0, // [R3-fix] a charge that hits a wall leaves the foe dazed (hittable) this long
     ENEMY_IFRAMES: 0.2, KNOCKBACK: 24, PROJ_SPEED: 220,
    TAP_ATTACK_RADIUS: 64, AUTOWALK_MAX: 200, TAP_TARGET_RADIUS: 24, TELEGRAPH_MIN: 0.5, TELEGRAPH_LITTLE_MULT: 1.5,
    // [D35] touch assist: melee facing snap radius, keyboard ranged auto-aim cone (full angle) + range, door tap margin (tiles), magnet px.
    MELEE_ASSIST_R: 40, FACE_HOLD: 0.4, AIM_CONE_DEG: 45, AIM_RANGE: 220, ARC_RANGE: 160, // [D37] arcing shots land on the aimed point, clamped to ARC_RANGE px
    DOOR_TAP_MARGIN: 1.5, DOOR_MAGNET_PX: 10,
    MELEE_REACH: 26, MELEE_RANGE: 18, KB_TIME: 0.12, COMBAT_RADIUS: 220, ENEMY_BOX: 14,
    // [D34] every AP cost halved; AP moves in 0.5 steps (halves are exact binary fractions — stored rounded to 0.5, no drift).
    MELEE_AP: 0.5, RANGED_AP: 0.5,
    SPECIAL_AP: { spin: 1.5, spinDash: 1.5, capeSwipe: 1, inkGatling: 2, splatBomb: 1, shellToss: 1, starfall: 5 },
  },
  ENEMY: {
    HITS: { melee: 2, hopper: 2, flyer: 2, burrower: 2, roller: 2, ranged: 2, shielded: 3, turret: 3 },
    ELITE_MULT: 2,
    WORLD_DMG: [1, 2, 3, 4, 5, 6, 7, 8], BOSS_DMG_BONUS: 1,
  },
  BOSS: { BIG_MIN_Y: 17, SUB_HITS: 12, MAIN_HITS: 20, FINAL_HITS: 28, PHASE2_AT: 0.5, TRIES: 3, BEAT_BPM: 150,
    // [D46] two-form final bosses: transformation length (skippable after the first time), form-2 bar = FORM2_HP_MULT × form 1,
    // Supernova Countdown (NOVA_S s clock, ×TIMING_LITTLE_MULT on Little Hero; NOVA_STAGGERS staggers of NOVA_HITS hits shatter it)
    TRANSFORM_S: 4, FORM2_HP_MULT: 2, BONUS_AP: 10, STAR_SHIELD: 2, NOVA_S: 30, NOVA_HITS: 3, NOVA_STAGGERS: 3, ECHOES_AT: [0.66, 0.33] }, // BEAT_BPM = the synth boss tempo (beat-synced patterns without audio)
  SHIP: { W: 22, H: 16, PROP_SCALE: 1, DOOR_TX: 10, LABEL_PX: 6, LABEL_EDGE: 1.5 }, // LABEL_EDGE [R3e]: dark edge (px) round the plain white station names
  // [R1-16/24/25] the Wayfarer interior: a cosy room; props are true-pixel 2x art; plaque text size (world px)
  PADKIT: { SCALE: 2, PLANTER_DEPTH: 3, GLOW: { ALPHA: 0.45, PULSE: 0.25, SPEED: 3 }, PILOT_TALK_R: 40 }, // GLOW [R3-12]: pad rings after the boss; PILOT_TALK_R: Juno greets you once this close // [R1-18] landing-pad props at 2x (user: everything around the pad was too small)
  OVERWORLD: { SLOTS_PER_REGION: 3, LANDMARK_SCALE: 3, BIG_TREE_W: 110 }, // BIG_TREE_W: target width (px) of the hollow tree; picks each big-trees sheet's whole-number scale // [A4] signature landmark drawn at a whole-number 3x (user 2026-10-02: ≈18×18 tiles for W1's castle)
  AUDIO_KEYS: { CREDITS_AFTER_S: 6 }, // [A6] victory fanfare length before the credits track
  TREASURE: { GOLD_PER_WORLD: 25, SHOW_S: 1.6, ROYAL_CHEST_W: 40, ROYAL_DOOR_W: 46 }, // ROYAL_*: [R3-15] the vault's chest and doors (px)
  // [D53] treasure room: medallion + full hearts + gold; the prize shows over the hero's head
  MAZE: { PRIZE_FRAC: 0.4, // [R1-13] top share of the pedestal frame that is the heart piece
    TIME_S: 50, LITTLE_MULT: 1.5, WARN_S: 10 }, // [D52] one timed maze mini-game per world (game/maze.js): beat the clock → a heart piece; retry forever, no cost
  AMBIENT: { HENS: 6, BUTTERFLIES: 16, FROGS: 6, FISH: 6, DRAGONFLIES: 5, RABBITS: 5, SQUIRRELS: 5, BIRDS: 10, SPACING: 10, ACTIVE_R: 420, FLEE_R: 44, HOP_SPEED: 70, BIRD_AWAY_S: 3, FISH_EVERY_S: 5 }, // [A4f] cosmetic critters (game/ambient.js)
  BUDDY: { MAX: 3, SPEED: 150, GAP: 14, SEND_R: 170, NEST_R: 28, HOLD_S: 999, TAP_R: 26 }, // [W6] Sproutling buddies (G27)
  PUZZLE: { GEAR_TIME: 6, TIMING_LITTLE_MULT: 1.5 }, // [W5] gear-timing window (s); timed puzzle windows ×1.5 on Little Hero
  // tools/audit.js thresholds. RELIC_CYCLE = D09 tool per world's relic gate; OVERWORLD_PASSES = expected sweeps of each region in a full clear.
  AUDIT: { XP_BAND: 2, OVERWORLD_PASSES: 3, ATTACKS_PER_QUESTION: 2, QUESTIONS_PER_MIN_MIN: 0.25, QUESTIONS_PER_MIN_MAX: 1.25, RELIC_CYCLE: ['bombBag', 'vineHook', 'shrinkCap', 'fireBloom', 'iceBloom', 'powerGlove', null, null] },
  QUEST: { MARK_GAP: 12, PICK_R: 14 }, // [S55] side-quest marks: min tile spacing, pickup radius (px)
  SECRET: { GOLD_COINS: 6, POTIONS: 1 }, // [S55] secret nook rewards: gold = COIN_VALUE × GOLD_COINS; potion nooks give POTIONS
  DROPS: { COIN: 0.35, HEART: 0.08, GOLD_CLEAR_RATIO: 1.1, GOLD_CLEAR_MIN: 1.0, COIN_VALUE: [12, 16, 22, 32, 46, 68, 100, 145], PICKUP_LIFE: 10, ICON_PX: 12, PICKUP_REACH: 10 }, // [R3-2] the hero's pickup box grows this many px on every side // [R1-2] pickup icon size (world px)
  GEAR: {
    WEAPON_STR: [1, 2, 3, 4, 5, 6, 7, 8],
    HELMET_DEF: [1, 2, 3, 4, 5, 6, 7, 8],
    CHEST_HEARTS: [1, 1, 2, 2, 3, 3, 4, 4], CHEST_DEF: [0, 1, 1, 2, 2, 3, 3, 4],
    BOOTS_AP: [3, 6, 9, 12, 15, 18, 21, 24], BOOTS_LUCK: [1, 2, 3, 4, 5, 6, 7, 8],
    SET_BONUS: { str: 2, luck: 2 },
    PRICES: [
      { weapon: 40, helmet: 30, chest: 35, boots: 30 },
      { weapon: 70, helmet: 50, chest: 60, boots: 50 },
      { weapon: 110, helmet: 80, chest: 95, boots: 80 },
      { weapon: 170, helmet: 125, chest: 145, boots: 125 },
      { weapon: 260, helmet: 190, chest: 220, boots: 190 },
      { weapon: 400, helmet: 290, chest: 340, boots: 290 },
      { weapon: 600, helmet: 440, chest: 520, boots: 440 },
      { weapon: 900, helmet: 660, chest: 780, boots: 660 },
    ],
    DAWNBREAKER: { tier: 9, str: 10, hearts: 4, starfallAp: 5, relics: 6, starfallR: 48, starfallRange: 160, starfallHits: 2 },
    GOLDEN_STAR_TUNIC: { tier: 9, str: 5, hearts: 5 },
  },
  ITEMS: {
    POTION: { hearts: 3, carry: 5, pricePerWorld: 10 },
    BOMBS: { carry: 20, pack: 5, pricePerWorld: 8 },
    HOOK: { range: 7, zip: 0.35 }, // Vine Hook: grabs a hook post up to `range` tiles ahead, zips the hero across in `zip` s
  },
  LIVES: { REVIVES_PER_VISIT: 5, REVIVE_HEARTS: 3, REVIVE_IFRAMES: 3 },
  RUSH: { HEAL_HEARTS: 5, BREATHER: 5, REVIVES: 1, HITS_CAP: 1.5 }, // [S62] in a rush a boss needs at most HITS_CAP × its Adventurer hits (8 chained fights, one revive)
  SURVIVAL: { BASE: 3, MAX_ALIVE: 16, HP_PER_WAVE: 0.25, SPEED_PER_WAVE: 0.03, SPEED_CAP: 0.60, DMG_EVERY: 3, ELITE_FROM: 10, ELITE_CHANCE: 0.2, GAP: 3, DMG_WORLD_CAP: 3 }, // [S61] base hit = min(home world, W3) strength; waves add the rest
  BUSH: { COIN: 0.30, HEART: 0.15, HURT_HEART_MULT: 1.6, REGROW_TILES: 24, REGROW_MIN_S: 4, TAP_REACH: 30 }, // [BUSHES] cut drops (rest = nothing), grow back off-screen
  PUZZLE_HELP: { BANNER_S: 3, BUBBLE_S: 2.6, CARD_S: 4, IDLE_S: 25, NEAR_PX: 40, REARM_PX: 80, TAP_HINTS: 3, USE_REACH: 28, USE_TIMEOUT_S: 6, SLIDE_S: 0.2, BLOCK_NEAR_PX: 30 }, // [DUNGEON-LIFE C] hints, bubbles, item cards
  TREES: { SCALE: 2, STEP_X: 4, STEP_Y: 2, CANOPY_DX: 2, CANOPY_UP: 4, EDGE_COVER_UP: 3 }, // [TREES 2x] big forest trees: lattice step (tiles), canopy footprint that must be forest
  SHOT_FX: { ARROW: 22, BOOMERANG: 18, FLOWER: 16, SHELL: 16, BLOB: 14, BOMB: 16, GUST: 18, DROP: 7, SPIN: 14, FRAME_HZ: 12, ARC_H: 14, BURST: 40, BURST_S: 0.35, METEOR: 36, METEOR_S: 0.4, METEOR_FALL: 120, DASH_RING: 34, CAPE: 40, CAPE_S: 0.25 }, // [HERO-SHOTS] on-screen sizes (world px) of the fx-hero art
  DUNGEON_LIFE: { FOE_MIN_TILES: 6, FOE_WAKE_S: 1.6, FIREFLIES: 3, MOTES: 18, POT_REACH: 20, POT_HEART: 0.25, POT_COIN: 0.35, MOUSE_SPEED: 40, DRIP_S: 2.6 }, // [DUNGEON-LIFE] W1 dungeon decor + little life
  DUNGEON: { ROOMS_MIN: 6, ROOMS_MAX: 9, ROOM_TILES_W: 40, ROOM_TILES_H: 30, RELIC_ROOMS: 5, COMPACT_W: 24, COMPACT_H: 18, EXIT_TAP_W: 4 }, // [R1-5/22] normal rooms ≈ one screen
  PERF: { P95_MS: 12, MAX_FRAME_MS: 33, FRAMES: 600, CPU_THROTTLE: 4 },
  SAVE: { SLOT_KEY: 'mq8.slot.', RECORDS_KEY: 'mq8.records.', SETTINGS_KEY: 'mq8.settings', SLOTS: 3 },
  SIZE_BUDGET_MB: 40,
});
