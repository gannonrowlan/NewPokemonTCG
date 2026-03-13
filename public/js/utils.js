// utils.js
(function (global) {
  'use strict';

  // ---------- Generic helpers (UI safe) ----------
  function resetArrayValues(arr) { for (let i = 0; i < arr.length; i++) arr[i] = 0; }
  function batchToggleHidden(arr, show = false) {
    if (!arr) return;
    // Accept NodeList, Array, or a single element
    const list = (Array.isArray(arr) || (arr.forEach && typeof arr.length === 'number')) ? arr : [arr];
    list.forEach(el => {
      if (!el) return;
      if (Array.isArray(el) || (el.forEach && typeof el.length === 'number')) {
        batchToggleHidden(el, show);
      } else if (el.classList) {
        el.classList[show ? 'remove' : 'add']('hidden');
      }
    });
  }

  // ---------- Card / id helpers ----------
  function cardIdToSrc(id) { return `/Pokemon/Base_${id}.jpg`; }

  function getCardIdFromImg(img) {
    if (!img || !img.src) return null;
    if (img.classList && img.classList.contains('hidden')) return null;
    const m = img.src.match(/Base_(\d+)\.jpg$/);
    return m ? parseInt(m[1], 10) : null;
  }

  // ---------- Player / board helpers ----------
  function playerKeyOf(pIdx) { return pIdx === 0 ? 'player1' : 'player2'; }
  function ownerOfActiveIdx(activeIdx) { return (activeIdx === 0 || activeIdx === 2) ? 0 : 1; }
  function getActiveIdxFromEl(pokemonEl) { return UI.activePokemon.findIndex(el => el === pokemonEl); }

  function hasEmptyActive(pIdx) {
    const actives = pIdx === 0 ? [0, 2] : [1, 3];
    return actives.some(i => UI.activePokemon[i].classList.contains('hidden'));
  }
  function hasAnyBenchPokemon(pIdx) {
    const base = pIdx === 0 ? 0 : 4;
    for (let i = 0; i < 4; i++) {
      if (!UI.benchPokemon[base + i].classList.contains('hidden')) return true;
    }
    return false;
  }
  function firstEmptyActiveIdx(pIdx) {
    const actives = pIdx === 0 ? [0, 2] : [1, 3];
    return actives.find(i => UI.activePokemon[i].classList.contains('hidden'));
  }

  // Board: map activeIdx → HP element
  function getHpElForActiveIndex(activeIdx) {
    if (activeIdx === 0) return UI.hitpoints.player1[0];
    if (activeIdx === 2) return UI.hitpoints.player1[1];
    if (activeIdx === 1) return UI.hitpoints.player2[0];
    if (activeIdx === 3) return UI.hitpoints.player2[1];
    return null;
  }

  // ---------- Drag helpers ----------
  function allowDropIfPokemon(e) {
    const id = getCardIdFromImg(global.selectedCard); // reuses your global selection
    if (global.selectedCard && Number.isInteger(id) && id >= 1 && id <= 69) e.preventDefault();
  }

  // ---------- Energy schema helpers ----------
  function getEnergyIndex(type) {
    switch (type) {
      case 'fighting': return 0;
      case 'fire': return 1;
      case 'grass': return 2;
      case 'lightning': return 3;
      case 'psychic': return 4;
      case 'water': return 5;
      default: return -1;
    }
  }

  // ---------- Attacks / schema adapters ----------
  function readAttackName(card, attackIdx, attackObjMaybe) {
    if (attackObjMaybe && typeof attackObjMaybe.name === 'string') return attackObjMaybe.name;
    if (card.attackNames && card.attackNames[attackIdx]) {
      const n = card.attackNames[attackIdx];
      return typeof n === 'string' ? n : (n && n.name) || `Attack ${attackIdx + 1}`;
    }
    return `Attack ${attackIdx + 1}`;
  }

  function toAttackObj(card, atk, attackIdx) {
    if (atk && typeof atk === 'object' && !Array.isArray(atk)) {
      return {
        kind: atk.kind || 'move',
        name: atk.name || readAttackName(card, attackIdx, atk),
        cost: atk.cost ?? 0,
        types: Array.isArray(atk.types) ? atk.types : [],
        damage: atk.damage ?? 0,
      };
    }
    if (Array.isArray(atk) && typeof atk[0] === 'string') {
      return { kind: 'power', name: readAttackName(card, attackIdx, null), cost: 0, types: [], damage: 0 };
    }
    if (Array.isArray(atk)) {
      const [cost, types, damage] = atk;
      return { kind: 'move', name: readAttackName(card, attackIdx, null), cost: Number(cost) || 0, types: Array.isArray(types) ? types : [], damage: Number(damage) || 0 };
    }
    return { kind: 'move', name: readAttackName(card, attackIdx, null), cost: 0, types: [], damage: 0 };
  }

  function getEvolvesFromId(card) {
    if (!card) return null;
    if (typeof card.evolvesFrom === 'number') return card.evolvesFrom;
    if (Array.isArray(card.stage) && typeof card.stage[1] === 'number') return card.stage[1];
    return null;
  }

  // Who is currently active based on the DOM (0 = top / player1, 1 = bottom / player2)
  function whoIsActive() {
    return UI.players[0].classList.contains('player--active') ? 0 : 1;
  }

  // ---------- Exports ----------
  const Utils = {
    resetArrayValues, batchToggleHidden,
    cardIdToSrc, getCardIdFromImg,
    playerKeyOf, ownerOfActiveIdx, getActiveIdxFromEl, getHpElForActiveIndex,
    hasEmptyActive, hasAnyBenchPokemon, firstEmptyActiveIdx,
    allowDropIfPokemon, getEnergyIndex,
    readAttackName, toAttackObj, getEvolvesFromId,
    whoIsActive,
  };

  global.Game = global.Game || {};
  global.Game.Utils = Utils;

  // Back-compat globals used in your existing script.js
  global.resetArrayValues = resetArrayValues;
  global.batchToggleHidden = batchToggleHidden;
  global.cardIdToSrc = cardIdToSrc;
  global.getCardIdFromImg = getCardIdFromImg;
  global.playerKeyOf = playerKeyOf;
  global.ownerOfActiveIdx = ownerOfActiveIdx;
  global.getActiveIdxFromEl = getActiveIdxFromEl;
  global.getHpElForActiveIndex = getHpElForActiveIndex;
  global.hasEmptyActive = hasEmptyActive;
  global.hasAnyBenchPokemon = hasAnyBenchPokemon;
  global.firstEmptyActiveIdx = firstEmptyActiveIdx;
  global.allowDropIfPokemon = allowDropIfPokemon;
  global.getEnergyIndex = getEnergyIndex;
  global.readAttackName = readAttackName;
  global.toAttackObj = toAttackObj;
  global.getEvolvesFromId = getEvolvesFromId;
  global.whoIsActive = whoIsActive;
})(window);
