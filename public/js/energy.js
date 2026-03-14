// energy.js
(function (global) {
  'use strict';

  const U = (global.Game && global.Game.Utils) || {};
  const ENERGY_TYPES = 6; // Base Set (fighting, fire, grass, lightning, psychic, water)

  // Public state (kept here; reset from your init)
  const attachedEnergy = [
    Array(ENERGY_TYPES).fill(0),
    Array(ENERGY_TYPES).fill(0),
    Array(ENERGY_TYPES).fill(0),
    Array(ENERGY_TYPES).fill(0),
  ];
  const energyCounts = {
    player1: Array(ENERGY_TYPES).fill(0),
    player2: Array(ENERGY_TYPES).fill(0),
  };
  const benchAttachedEnergy = Array.from({ length: 8 }, () => Array(ENERGY_TYPES).fill(0));

  // ---- Utilities specific to energy badges/slots ----
  function getEnergyBadgesForActiveIndex(activeIdx) {
    if (activeIdx === 0) return UI.energyBadges.TopActive1;
    if (activeIdx === 1) return UI.energyBadges.TopActive2;
    if (activeIdx === 2) return UI.energyBadges.BottomActive1;
    if (activeIdx === 3) return UI.energyBadges.BottomActive2;
    return [];
  }
  function getEnergySlotsForActiveIndex(activeIdx) {
    if (activeIdx === 0) return UI.energySlots.TopActive1;
    if (activeIdx === 1) return UI.energySlots.TopActive2;
    if (activeIdx === 2) return UI.energySlots.BottomActive1;
    if (activeIdx === 3) return UI.energySlots.BottomActive2;
    return [];
  }

  function getEnergyBadgesForBenchIdx(benchIdx) {
    if (benchIdx === 0) return UI.energyBadges.BenchSlot1_1;
    if (benchIdx === 1) return UI.energyBadges.BenchSlot2_1;
    if (benchIdx === 2) return UI.energyBadges.BenchSlot3_1;
    if (benchIdx === 3) return UI.energyBadges.BenchSlot4_1;
    if (benchIdx === 4) return UI.energyBadges.BenchSlot1_2;
    if (benchIdx === 5) return UI.energyBadges.BenchSlot2_2;
    if (benchIdx === 6) return UI.energyBadges.BenchSlot3_2;
    if (benchIdx === 7) return UI.energyBadges.BenchSlot4_2;
    return [];
  }

  function getEnergySlotsForBenchIdx(benchIdx) {
    if (benchIdx === 0) return UI.energySlots.BenchSlot1_1;
    if (benchIdx === 1) return UI.energySlots.BenchSlot2_1;
    if (benchIdx === 2) return UI.energySlots.BenchSlot3_1;
    if (benchIdx === 3) return UI.energySlots.BenchSlot4_1;
    if (benchIdx === 4) return UI.energySlots.BenchSlot1_2;
    if (benchIdx === 5) return UI.energySlots.BenchSlot2_2;
    if (benchIdx === 6) return UI.energySlots.BenchSlot3_2;
    if (benchIdx === 7) return UI.energySlots.BenchSlot4_2;
    return [];
  }

  function elevateEnergyForIndex(activeIdx, on) {
    const els = [...getEnergyBadgesForActiveIndex(activeIdx), ...getEnergySlotsForActiveIndex(activeIdx)];
    els.forEach(el => {
      if (!el) return;
      if (on) {
        el.dataset.prevZ = el.style.zIndex || '';
        el.classList.add('elevate');
        el.style.zIndex = '1002';
      } else {
        el.classList.remove('elevate');
        if ('prevZ' in el.dataset) {
          el.style.zIndex = el.dataset.prevZ;
          delete el.dataset.prevZ;
        } else el.style.zIndex = '';
      }
    });
  }

  function clearEnergyForActiveIndex(activeIdx) {
    attachedEnergy[activeIdx] = Array(ENERGY_TYPES).fill(0);
    const badges = getEnergyBadgesForActiveIndex(activeIdx);
    const slots  = getEnergySlotsForActiveIndex(activeIdx);
    [...badges, ...slots].forEach(el => {
      if (!el) return;
      el.classList.add('hidden');
      if (el.tagName === 'IMG') el.src = '';
    });
  }

  function clearEnergyForBenchIndex(benchIdx) {
    if (benchIdx < 0 || benchIdx >= benchAttachedEnergy.length) return;
    benchAttachedEnergy[benchIdx] = Array(ENERGY_TYPES).fill(0);
    const badges = getEnergyBadgesForBenchIdx(benchIdx);
    const slots = getEnergySlotsForBenchIdx(benchIdx);
    [...badges, ...slots].forEach(el => {
      if (!el) return;
      el.classList.add('hidden');
      if (el.tagName === 'IMG') el.src = '';
    });
  }

  function clearSelectedEnergy() {
    global.energySelected = false;
    global.selectedCard = null;
  }

  function ownerOfBenchIdx(benchIdx) { return benchIdx >= 0 && benchIdx < 4 ? 0 : 1; }
  function getBenchIdxFromEl(pokemonEl) { return UI.benchPokemon.findIndex(el => el === pokemonEl); }
  function currentPlayerIdx() {
    if (U.whoIsActive) return U.whoIsActive();
    if (Number.isInteger(global.activePlayer)) return global.activePlayer;
    return UI.players[0].classList.contains('player--active') ? 0 : 1;
  }
  function canAttachToPokemon(pokemonEl) {
    if (!pokemonEl || pokemonEl.classList.contains('hidden')) return false;

    const activePlayerIdx = currentPlayerIdx();

    const activeIdx = U.getActiveIdxFromEl(pokemonEl);
    if (activeIdx !== -1) return U.ownerOfActiveIdx(activeIdx) === activePlayerIdx;

    const benchIdx = getBenchIdxFromEl(pokemonEl);
    if (benchIdx !== -1) return ownerOfBenchIdx(benchIdx) === activePlayerIdx;

    return false;
  }

  // ---- Attach flow ----
  function addEnergy(energyCard) { energyCard.classList.remove('unused-energy'); }

  function useEnergy(energyCard, energyCount) {
    if (energyCount > 0) {
      global.energySelected = true;
      global.selectedCard = energyCard;
    }
  }

  function getSelectedEnergyTypeIdx() {
    for (const p of ['player1', 'player2']) {
      for (let i = 0; i < ENERGY_TYPES; i++) {
        if (global.selectedCard === UI.energy.cards[p][i]) return i;
      }
    }
    return -1;
  }

  function decreaseEnergy() {
    let playerKey = null;
    let energyIndex = null;

    for (const p of ['player1', 'player2']) {
      for (let i = 0; i < ENERGY_TYPES; i++) {
        if (global.selectedCard === UI.energy.cards[p][i]) {
          playerKey = p;
          energyIndex = i;
          break;
        }
        if (playerKey) break;
      }
    }
    if (playerKey === null || energyIndex === null) return;

    energyCounts[playerKey][energyIndex] = Math.max(0, energyCounts[playerKey][energyIndex] - 1);
    UI.energy.count[playerKey][energyIndex].textContent = energyCounts[playerKey][energyIndex];
    if (energyCounts[playerKey][energyIndex] === 0) global.selectedCard.classList.add('unused-energy');
  }

  function changeEnergyBadgeImg(selectedBadge) {
    const badgeSrcs = [
      `Energy/fighting_energy_badge.png`,
      `Energy/fire_energy_badge.png`,
      `Energy/grass_energy_badge.png`,
      `Energy/lightning_energy_badge.png`,
      `Energy/psychic_energy_badge.png`,
      `Energy/water_energy_badge.png`,
    ];
    for (let p of ['player1', 'player2']) {
      for (let i = 0; i < ENERGY_TYPES; i++) {
        if (global.selectedCard === UI.energy.cards[p][i]) {
          selectedBadge.src = badgeSrcs[i];
          return;
        }
      }
    }
  }

  function getNextBadge(selectedPokemonSlots, selectedPokemonBadges) {
    for (let i = 0; i < ENERGY_TYPES; i++) {
      if (selectedPokemonSlots[i].classList.contains('hidden')) {
        selectedPokemonSlots[i].classList.remove('hidden');
        changeEnergyBadgeImg(selectedPokemonBadges[i]);
        selectedPokemonBadges[i].classList.remove('hidden');
        break;
      }
    }
  }

  function displayEnergy(pokemon) {
    switch (pokemon) {
      case UI.activePokemon[0]: getNextBadge(UI.energySlots.TopActive1, UI.energyBadges.TopActive1); break;
      case UI.activePokemon[1]: getNextBadge(UI.energySlots.TopActive2, UI.energyBadges.TopActive2); break;
      case UI.activePokemon[2]: getNextBadge(UI.energySlots.BottomActive1, UI.energyBadges.BottomActive1); break;
      case UI.activePokemon[3]: getNextBadge(UI.energySlots.BottomActive2, UI.energyBadges.BottomActive2); break;
      case UI.benchPokemon[0]: getNextBadge(UI.energySlots.BenchSlot1_1, UI.energyBadges.BenchSlot1_1); break;
      case UI.benchPokemon[1]: getNextBadge(UI.energySlots.BenchSlot2_1, UI.energyBadges.BenchSlot2_1); break;
      case UI.benchPokemon[2]: getNextBadge(UI.energySlots.BenchSlot3_1, UI.energyBadges.BenchSlot3_1); break;
      case UI.benchPokemon[3]: getNextBadge(UI.energySlots.BenchSlot4_1, UI.energyBadges.BenchSlot4_1); break;
      case UI.benchPokemon[4]: getNextBadge(UI.energySlots.BenchSlot1_2, UI.energyBadges.BenchSlot1_2); break;
      case UI.benchPokemon[5]: getNextBadge(UI.energySlots.BenchSlot2_2, UI.energyBadges.BenchSlot2_2); break;
      case UI.benchPokemon[6]: getNextBadge(UI.energySlots.BenchSlot3_2, UI.energyBadges.BenchSlot3_2); break;
      case UI.benchPokemon[7]: getNextBadge(UI.energySlots.BenchSlot4_2, UI.energyBadges.BenchSlot4_2); break;
    }
  }

  function attachEnergy(pokemon) {
    if (!global.energySelected) return;
    if (!canAttachToPokemon(pokemon)) return;

    const activeIdx = U.getActiveIdxFromEl(pokemon);
    const benchIdx  = getBenchIdxFromEl(pokemon);
    const typeIdx   = getSelectedEnergyTypeIdx();

    if (typeIdx === -1) return;

    if (activeIdx !== -1 && typeIdx !== -1) {
      decreaseEnergy();
      displayEnergy(pokemon);
      attachedEnergy[activeIdx][typeIdx]++;
      clearSelectedEnergy();
      refreshRetreatButtons();
      return;
    }

    if (benchIdx !== -1) {
      decreaseEnergy();
      displayEnergy(pokemon);
      benchAttachedEnergy[benchIdx][typeIdx]++;
      clearSelectedEnergy();
    }
  }

  function redrawEnergyForBenchIndex(benchIdx){
    const slots = getEnergySlotsForBenchIdx(benchIdx);
    const badges = getEnergyBadgesForBenchIdx(benchIdx);
    const badgeSrc = [
      `Energy/fighting_energy_badge.png`,
      `Energy/fire_energy_badge.png`,
      `Energy/grass_energy_badge.png`,
      `Energy/lightning_energy_badge.png`,
      `Energy/psychic_energy_badge.png`,
      `Energy/water_energy_badge.png`,
    ];
    [...slots, ...badges].forEach(el => {
      el.classList.add('hidden');
      if (el.tagName === 'IMG') el.src = '';
    });
    let k = 0;
    for (let type = 0; type < ENERGY_TYPES; type++) {
      for (let c = 0; c < benchAttachedEnergy[benchIdx][type]; c++) {
        if (!slots[k] || !badges[k]) return;
        slots[k].classList.remove('hidden');
        badges[k].src = badgeSrc[type];
        badges[k].classList.remove('hidden');
        k++;
      }
    }
  }

  // ---- Retreating ----
  function totalEnergyOnActive(activeIdx){ return attachedEnergy[activeIdx].reduce((a,b)=>a+b,0); }

  function canRetreatFrom(activeIdx){
    if (global.hasRetreatedThisTurn) return false;

    const pIdx = U.ownerOfActiveIdx(activeIdx);
    if (typeof global.isPlayersOpeningTurn === 'function' && global.isPlayersOpeningTurn(pIdx)) return false;
    const me = (U.whoIsActive ? U.whoIsActive() : (UI.players[0].classList.contains('player--active') ? 0 : 1));
    if (pIdx !== me) return false;

    const img = UI.activePokemon[activeIdx];
    if (!img || img.classList.contains('hidden')) return false;

    const cardId = U.getCardIdFromImg(img);
    if (!cardId) return false;
    const cost = (baseSet[cardId - 1]?.retreatCost | 0);

    // free retreat if you have any benched Pokémon
    if (cost === 0) return U.hasAnyBenchPokemon(pIdx);

    // negative/invalid retreat cost is still a no
    if (cost < 0) return false;

    // otherwise need enough energy and a bench target
    return totalEnergyOnActive(activeIdx) >= cost && U.hasAnyBenchPokemon(pIdx);
  }

  function payRetreatCost(activeIdx){
    const cardId = U.getCardIdFromImg(UI.activePokemon[activeIdx]);
    let toPay = (baseSet[cardId-1]?.retreatCost|0);
    if (toPay <= 0) return;

    for (let t = 0; t < ENERGY_TYPES && toPay > 0; t++){
      const used = Math.min(attachedEnergy[activeIdx][t], toPay);
      attachedEnergy[activeIdx][t] -= used;
      toPay -= used;
    }
    redrawEnergyForActiveIndex(activeIdx);
  }

  function redrawEnergyForActiveIndex(activeIdx){
    const slots  = getEnergySlotsForActiveIndex(activeIdx);
    const badges = getEnergyBadgesForActiveIndex(activeIdx);
    const badgeSrc = [
      `Energy/fighting_energy_badge.png`,
      `Energy/fire_energy_badge.png`,
      `Energy/grass_energy_badge.png`,
      `Energy/lightning_energy_badge.png`,
      `Energy/psychic_energy_badge.png`,
      `Energy/water_energy_badge.png`,
    ];
    [...slots, ...badges].forEach(el=>{
      el.classList.add('hidden');
      if (el.tagName === 'IMG') el.src = '';
    });
    let k = 0;
    for (let type = 0; type < ENERGY_TYPES; type++){
      for (let c = 0; c < attachedEnergy[activeIdx][type]; c++){
        if (!slots[k] || !badges[k]) return;
        slots[k].classList.remove('hidden');
        badges[k].src = badgeSrc[type];
        badges[k].classList.remove('hidden');
        k++;
      }
    }
  }

  function getBenchHpEl(pIdx, benchLocalIdx){
    const key = pIdx === 0 ? 'player1' : 'player2';
    return UI.hitpoints[key][2 + benchLocalIdx];
  }

  function swapActiveWithBench(activeIdx, benchGlobalIdx){
    const pIdx = U.ownerOfActiveIdx(activeIdx);
    const benchLocalIdx = benchGlobalIdx % 4;

    const activeImg = UI.activePokemon[activeIdx];
    const benchImg  = UI.benchPokemon[benchGlobalIdx];

    const activeHpEl = U.getHpElForActiveIndex(activeIdx);
    const oldActiveHP = (activeHpEl?.textContent || '').trim();
    const benchHpEl   = getBenchHpEl(pIdx, benchLocalIdx);
    const oldBenchHP  = (benchHpEl?.textContent || '').trim();

    const tmpSrc = activeImg.src;
    activeImg.src = benchImg.src;  activeImg.classList.remove('hidden');
    benchImg.src  = tmpSrc;         benchImg.classList.remove('hidden');

    const aPlay = activeImg.dataset.playRound || '';
    const aEvo  = activeImg.dataset.lastEvolved || '';
    activeImg.dataset.playRound   = benchImg.dataset.playRound || '';
    activeImg.dataset.lastEvolved = benchImg.dataset.lastEvolved || '';
    benchImg.dataset.playRound    = aPlay;
    benchImg.dataset.lastEvolved  = aEvo;

    const benchMatch  = oldBenchHP.match(/(\d+)\s*\/\s*(\d+)/);
    const activeMatch = oldActiveHP.match(/(\d+)\s*\/\s*(\d+)/);

    if (benchMatch) {
      activeHpEl.textContent = `${benchMatch[1]} / ${benchMatch[2]}`;
    } else {
      // default to full if bench had no HP yet
      const hp = baseSet[U.getCardIdFromImg(activeImg) - 1]?.HP | 0;
      activeHpEl.textContent = `${hp} / ${hp}`;
    }
    if (benchHpEl){
      if (activeMatch) benchHpEl.textContent = `HP: ${activeMatch[1]} / ${activeMatch[2]}`;
      else {
        const hp = baseSet[U.getCardIdFromImg(benchImg) - 1]?.HP | 0;
        benchHpEl.textContent = `HP: ${hp} / ${hp}`;
      }
    }

    // Swap energy ownership as Pokémon switch between active and bench.
    const prevActiveEnergy = [...attachedEnergy[activeIdx]];
    attachedEnergy[activeIdx] = [...benchAttachedEnergy[benchGlobalIdx]];
    benchAttachedEnergy[benchGlobalIdx] = prevActiveEnergy;
    redrawEnergyForActiveIndex(activeIdx);
    redrawEnergyForBenchIndex(benchGlobalIdx);

    global.hasRetreatedThisTurn = true;
    refreshRetreatButtons();

    // After swap, refresh the attack list if the panel is open
    const yourActives = currentPlayerIdx() === 0 ? [0,2] : [1,3];
    global.Game?.Attack?.renderAttackOptions?.(yourActives);
    const title = document.getElementById('attack-panel-title');
    if (title) title.textContent = 'Choose an attack';
  }

  function beginRetreatSelection(fromActiveIdx){
    const pIdx = U.ownerOfActiveIdx(fromActiveIdx);
    const base = pIdx === 0 ? 0 : 4;
    const titleEl = document.getElementById('attack-panel-title');
    if (titleEl) titleEl.textContent = 'Choose a benched Pokémon to switch with';

    const cleaners = [];
    for (let i = 0; i < 4; i++){
      const el = UI.benchPokemon[base + i];
      if (el.classList.contains('hidden')) continue;
      const handle = () => {
        swapActiveWithBench(fromActiveIdx, base + i);
        cleaners.forEach(f=>f());
      };
      el.classList.add('retreat-target');
      el.style.outline = '2px dashed #7aa2ff';
      el.style.outlineOffset = '3px';
      el.addEventListener('click', handle);
      cleaners.push(()=>{
        el.classList.remove('retreat-target');
        el.style.outline = ''; el.style.outlineOffset = '';
        el.removeEventListener('click', handle);
      });
    }
  }

  function refreshRetreatButtons(){
    const cfg = [
      { btnId: 'retreat-btn-1-1', activeIdx: 0 },
      { btnId: 'retreat-btn-2-1', activeIdx: 2 },
      { btnId: 'retreat-btn-1-2', activeIdx: 1 },
      { btnId: 'retreat-btn-2-2', activeIdx: 3 },
    ];
    cfg.forEach(({btnId, activeIdx}) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const img = UI.activePokemon[activeIdx];
      const cardId = U.getCardIdFromImg(img);
      if (!cardId) { btn.classList.add('hidden'); btn.disabled = true; return; }
      btn.classList.remove('hidden');
      const cost = (baseSet[cardId - 1]?.retreatCost | 0);
      btn.textContent = cost > 0 ? `Retreat (↩︎ ${cost})` : 'Retreat';
      btn.disabled = !canRetreatFrom(activeIdx);
    });
  }

  function moveBenchEnergyToActive(activeIdx, benchIdx) {
    if (activeIdx < 0 || activeIdx >= attachedEnergy.length) return;
    if (benchIdx < 0 || benchIdx >= benchAttachedEnergy.length) return;

    attachedEnergy[activeIdx] = [...benchAttachedEnergy[benchIdx]];
    clearEnergyForBenchIndex(benchIdx);
    redrawEnergyForActiveIndex(activeIdx);
    refreshRetreatButtons();
  }

  // Optional hook for your main script; keep idempotent
  function initUI(){ /* no-op on purpose */ }

  // ---------- Exports ----------
  const Energy = {
    attachedEnergy, benchAttachedEnergy, energyCounts,
    addEnergy, useEnergy, attachEnergy,
    getSelectedEnergyTypeIdx, decreaseEnergy,
    getEnergyBadgesForActiveIndex, getEnergySlotsForActiveIndex,
    clearEnergyForActiveIndex, elevateEnergyForIndex, redrawEnergyForActiveIndex,
    totalEnergyOnActive, canRetreatFrom, payRetreatCost,
    beginRetreatSelection, refreshRetreatButtons, swapActiveWithBench,
    clearEnergyForBenchIndex, moveBenchEnergyToActive, clearSelectedEnergy,
    initUI,
  };

  global.Game = global.Game || {};
  global.Game.Energy = Energy;

  // Back-compat globals your existing script references
  global.attachedEnergy = attachedEnergy;
  global.benchAttachedEnergy = benchAttachedEnergy;
  global.energyCounts = energyCounts;
  global.addEnergy = addEnergy;
  global.useEnergy = useEnergy;
  global.attachEnergy = attachEnergy;
  global.getSelectedEnergyTypeIdx = getSelectedEnergyTypeIdx;
  global.decreaseEnergy = decreaseEnergy;
  global.clearEnergyForActiveIndex = clearEnergyForActiveIndex;
  global.getEnergyBadgesForActiveIndex = getEnergyBadgesForActiveIndex;
  global.getEnergySlotsForActiveIndex = getEnergySlotsForActiveIndex;
  global.elevateEnergyForIndex = elevateEnergyForIndex;
  global.redrawEnergyForActiveIndex = redrawEnergyForActiveIndex;
  global.totalEnergyOnActive = totalEnergyOnActive;
  global.canRetreatFrom = canRetreatFrom;
  global.payRetreatCost = payRetreatCost;
  global.beginRetreatSelection = beginRetreatSelection;
  global.refreshRetreatButtons = refreshRetreatButtons;
})(window);
