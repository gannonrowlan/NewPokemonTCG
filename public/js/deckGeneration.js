'use strict';

/* deckGeneration.js — random-typing update
   - generatePlayerDeckV2() now randomizes two deck types by default
   - Add randomTypesForDeck() helper
   - Keeps your original generator + prize + hand logic intact
*/

// --- Constants ---
const START_HAND_SIZE = 7;
const TOTAL_DECK_SIZE = 40;

// Trainer ID ranges for Base Set
const COMMON_TRAINER_START = 91;
const UNCOMMON_TRAINER_START = 80;
const RARE_TRAINER_START = 70;
const COMMON_TRAINER_COUNT = 5;
const UNCOMMON_TRAINER_COUNT = 11;
const RARE_TRAINER_COUNT = 10;

// New V2 split (18 Pokémon / 22 Trainers)
const TRAINER_SPLIT_18_22 = { common: 7, uncommon: 11, rare: 4 };

// All supported types (must match your energy system order)
const ALL_TYPES = ['fighting', 'fire', 'grass', 'lightning', 'psychic', 'water', 'colorless'];

// --- Schema helpers (support old + new) ---
function getStageString(card) {
  if (!card) return 'base';
  if (Array.isArray(card.stage)) {
    const s = (card.stage[0] || 'base').toLowerCase();
    return s.replace(' ', '');
  }
  const s = String(card.stage || 'base').toLowerCase();
  return s.replace(' ', '');
}
function getEvolvesFromId(card) {
  if (!card) return null;
  if (typeof card.evolvesFrom === 'number') return card.evolvesFrom;           // new schema
  if (Array.isArray(card.stage) && typeof card.stage[1] === 'number') return card.stage[1]; // old schema
  return null;
}
function getStage1FromStage2Id(stage2Id) {
  const s2 = baseSet[stage2Id - 1];
  return getEvolvesFromId(s2);
}
function getBasicFromStage1Id(stage1Id) {
  const s1 = baseSet[stage1Id - 1];
  return getEvolvesFromId(s1);
}

// --- Utilities ---
function pickRandomInRange(min, max) {
  return Math.trunc(Math.random() * (max - min + 1)) + min;
}
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Shared opening-hand validator
function withOpeningHandGate(deck, minBasicsIn7) {
  let safety = 0;
  while (safety < 500) {
    const shuffled = shuffle([...deck]);
    const basicsInHand = shuffled.slice(0, START_HAND_SIZE).filter(id => baseBasic.includes(id)).length;
    if (basicsInHand >= minBasicsIn7) return shuffled;
    safety++;
  }
  return shuffle([...deck]);
}

// --- Type helpers for V2 ---
function _typesOf(card) {
  const raw = card?.types ?? card?.type ?? [];
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  return arr.map(_normalizeTypeName);
}

function _isType(id, type) {
  return _typesOf(baseSet[id - 1]).includes(String(type).toLowerCase());
}
function _pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function _trainerIdsFromRange(start, count) {
  const ids = [];
  for (let i = 0; i < count; i++) ids.push(start + i);
  return ids;
}
function _trainerPool(kind) {
  if (kind === 'rare')     return _trainerIdsFromRange(RARE_TRAINER_START,    RARE_TRAINER_COUNT);
  if (kind === 'uncommon') return _trainerIdsFromRange(UNCOMMON_TRAINER_START,UNCOMMON_TRAINER_COUNT);
  return _trainerIdsFromRange(COMMON_TRAINER_START, COMMON_TRAINER_COUNT);
}
function _pickMany(pool, n) {
  const out = [];
  const p = [...pool];
  while (out.length < n) {
    if (p.length === 0) out.push(_pick(pool));
    else out.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]);
  }
  return out;
}

function _stagePoolsForType(type) {
  type = _normalizeTypeName(type);

  const s2 = [], s1 = [], b = [];
  const s1WithStage2 = new Set();
  const basicsWithStage1 = new Set();

  // Collect by stage for this type
  for (let id = 1; id <= 96; id++) {
    if (!_isType(id, type)) continue;
    const st = getStageString(baseSet[id - 1]);
    if (st === 'stage2') s2.push(id);
    else if (st === 'stage1') s1.push(id);
    else if (st === 'base') b.push(id);
  }

  // Mark Stage1s that have a Stage2 above
  for (const s2id of s2) {
    const s1id = getStage1FromStage2Id(s2id);
    if (s1id) s1WithStage2.add(s1id);
  }

  // Mark Basics that have a Stage1 above
  for (const s1id of s1) {
    const bid = getBasicFromStage1Id(s1id);
    if (bid) basicsWithStage1.add(bid);
  }

  const s1Pure = s1.filter(id => !s1WithStage2.has(id));          // Stage1 with no Stage2 above (prefer)
  const s1FromS2 = s1.filter(id =>  s1WithStage2.has(id));         // Stage1 that lead to Stage2
  const basicsStandalone = b.filter(id => !basicsWithStage1.has(id)); // Basics with no Stage1 above (prefer)
  const basicsFromLines = b.filter(id =>  basicsWithStage1.has(id));

  return { s2, s1, b, s1Pure, s1FromS2, basicsStandalone, basicsFromLines };
}


// Build one full S2 line: 1× S2 + 2× S1 + 3× Basic
function _buildS2Line(type, used = new Set()) {
  const { s2 } = _stagePoolsForType(type);
  const tries = [...s2];
  while (tries.length) {
    const s2id = tries.splice(Math.floor(Math.random() * tries.length), 1)[0];
    const s1id = getStage1FromStage2Id(s2id);
    const bid  = s1id ? getBasicFromStage1Id(s1id) : null;
    if (!s1id || !bid) continue;
    used.add(s2id); used.add(s1id); used.add(bid);
    return [s2id, s1id, s1id, bid, bid, bid];
  }
  return [];
}

// Build one S1 mini-line: 1× S1 + 2× Basic
function _buildS1Line(type, used = new Set()) {
  const pools = _stagePoolsForType(type);
  const candidates = [...pools.s1Pure, ...pools.s1FromS2]; // prefer pure S1
  const tries = [...candidates];

  while (tries.length) {
    const s1id = tries.splice(Math.floor(Math.random() * tries.length), 1)[0];
    const bid = getBasicFromStage1Id(s1id);
    if (!bid) continue;
    used.add(s1id); used.add(bid);
    return [s1id, bid, bid];
  }
  return [];
}

// Pick N basics of a type (allowing duplicates, soft cap 4 copies)
function _pickBasics(type, n, used = new Map()) {
  const pools = _stagePoolsForType(type);
  const pref = [...pools.basicsStandalone, ...pools.b]; // prefer standalone basics
  const out = [];
  const cap = 4;
  const copyCount = id => used.get(id) || 0;

  if (!pref.length) return out;

  while (out.length < n) {
    const id = _pick(pref);
    if (copyCount(id) >= cap) continue;
    out.push(id);
    used.set(id, copyCount(id) + 1);
  }
  return out;
}

// ---- Random type selection ----
function _viableTypes() {
  // Keep types with enough basics and at least a Stage1 or Stage2 present
  return ALL_TYPES.filter(t => {
    const { b, s1, s2 } = _stagePoolsForType(t);
    return b.length >= 4 && (s1.length >= 1 || s2.length >= 1);
  });
}
function _sampleTypes(k = 2) {
  const viable = _viableTypes();
  const pool = viable.length >= k ? viable : ALL_TYPES.slice();
  return shuffle([...pool]).slice(0, k);
}

function _normalizeTypeName(t) {
  const x = String(t || '').toLowerCase();
  if (x === 'normal' || x === 'colourless') return 'colorless';
  return x;
}

function _sampleTypePairWithPrimaryConstraint() {
  const viable = _viableTypes(); // your existing viability check
  const s2Capable = viable.filter(t => _stagePoolsForType(t).s2.length > 0);

  // Primary (A) must have Stage2 available
  const A = s2Capable.length ? _pick(s2Capable) : _pick(viable);

  // Secondary (B) can be any viable type ≠ A (including lightning/colorless)
  const rest = viable.filter(t => t !== A);
  const B = rest.length ? _pick(rest) : A;

  return [A, B];
}

/** Optional public helper if you ever want to peek or pre-pick */
window.randomTypesForDeck = function(k = 2) { return _sampleTypes(k); };

// Returns two type pairs for P1 and P2.
// Prefers completely disjoint pairs; falls back to any non-identical pair.
window.randomTypesForTwoPlayers = function () {
  const p1 = _sampleTypePairWithPrimaryConstraint();

  // Try to give P2 two types disjoint from P1 while keeping primary s2-capable
  const allV = _viableTypes();
  const fallbackPool = allV.length ? allV : ALL_TYPES;
  const s2Capable = fallbackPool.filter(t => _stagePoolsForType(t).s2.length > 0 && !p1.includes(t));
  const A = s2Capable.length
    ? _pick(s2Capable)
    : (_pick(fallbackPool.filter(t => _stagePoolsForType(t).s2.length > 0)) || _pick(fallbackPool));
  const rest = fallbackPool.filter(t => !p1.includes(t) && t !== A);
  const B = rest.length ? _pick(rest) : (_pick(fallbackPool.filter(t => t !== A)) || A);

  return { p1, p2: [A, B] };
};

/**
 * New generator: 18 Pokémon / 22 Trainers for two anchor types.
 * If 'types' omitted, we pick 2 random viable types.
 * @param {string[]} [types] - e.g., ['fighting','fire']
 * @returns {number[]} deck of 40 Base_# ids
 */
window.generatePlayerDeckV2 = function(types) {
  const chosen = (Array.isArray(types) && types.length >= 2)
  ? types
  : _sampleTypePairWithPrimaryConstraint();
  const [A, B] = chosen.map(_normalizeTypeName);
  // Expose last-chosen types for debugging/UX if wanted
  if (!window._lastTypesChosenP1) window._lastTypesChosenP1 = chosen;
  else window._lastTypesChosenP2 = chosen;

  const deck = [];
  const usedBasics = new Map();
  const usedIds = new Set();

  // --- Pokémon (18) ---
  deck.push(..._buildS2Line(A, usedIds));        // 1× full S2 line (type A)
  deck.push(..._buildS1Line(A, usedIds));        // 1× S1 line (type A)
  deck.push(..._buildS1Line(B, usedIds));        // 1× S1 line (type B)

  // Ensure we got enough evo cards; if short, pad with A basics
  while (deck.length < 12) deck.push(..._pickBasics(A, 1, usedBasics));

  // 6 flex basics (3 per type)
  deck.push(..._pickBasics(A, 3, usedBasics));
  deck.push(..._pickBasics(B, 3, usedBasics));

  while (deck.length < 18) deck.push(..._pickBasics(A, 1, usedBasics));

  // --- Trainers (22) ---
  const T = TRAINER_SPLIT_18_22;
  deck.push(..._pickMany(_trainerPool('common'),   T.common));
  deck.push(..._pickMany(_trainerPool('uncommon'), T.uncommon));
  deck.push(..._pickMany(_trainerPool('rare'),     T.rare));

  // --- Opening hand gate: ≥3 basics ---
  const gated = withOpeningHandGate(deck, 3);
  return gated.slice(0, TOTAL_DECK_SIZE);
};

window.generatePlayerHand = function (playerDeck) {
  return playerDeck.slice(0, START_HAND_SIZE);
};

window.drawPrizesFromDeck = function(deck, count = 4){
  const d = [...deck];
  const out = [];
  for (let i = 0; i < count && d.length > 0; i++){
    const idx = Math.floor(Math.random() * d.length);
    out.push(d.splice(idx, 1)[0]);
  }
  return { prizes: out, deck: d };
};


