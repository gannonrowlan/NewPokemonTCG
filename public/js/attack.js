// attack.js
(function (global) {
  'use strict';

  const U = (global.Game && global.Game.Utils) || {};
  const E = (global.Game && global.Game.Energy) || {};
  const STATUS = Object.freeze({ NONE: 'none', ASLEEP: 'asleep', CONFUSED: 'confused', PARALYZED: 'paralyzed', POISONED: 'poisoned' });

  let selectedAttackInfo = null;
  global.lastAttackKO = false; // preserved for back-compat with your code
  const battleState = {
    statusByActiveIdx: [STATUS.NONE, STATUS.NONE, STATUS.NONE, STATUS.NONE],
    defendShieldByActiveIdx: [0, 0, 0, 0],
    plusPowerByActiveIdx: [0, 0, 0, 0],
  };

  function flipCoin() { return Math.random() < 0.5; }
  function ownerActives(ownerIdx) { return ownerIdx === 0 ? [0, 2] : [1, 3]; }
  function parseHp(hpEl) {
    const m = (hpEl?.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
    if (!m) return null;
    return { cur: parseInt(m[1], 10), max: parseInt(m[2], 10) };
  }
  function setHp(hpEl, cur, max) { hpEl.textContent = `${Math.max(0, cur)} / ${max}`; }
  function damageActiveByIdx(activeIdx, amount) {
    const hpEl = U.getHpElForActiveIndex(activeIdx);
    const hp = parseHp(hpEl);
    if (!hp || amount <= 0) return;
    setHp(hpEl, hp.cur - amount, hp.max);
  }
  function healActiveByIdx(activeIdx, amount) {
    const hpEl = U.getHpElForActiveIndex(activeIdx);
    const hp = parseHp(hpEl);
    if (!hp || amount <= 0) return;
    setHp(hpEl, Math.min(hp.max, hp.cur + amount), hp.max);
  }
  function hasStatusBlock(activeIdx) {
    const s = battleState.statusByActiveIdx[activeIdx];
    return s === STATUS.ASLEEP || s === STATUS.PARALYZED;
  }
  function clearStatus(activeIdx) { battleState.statusByActiveIdx[activeIdx] = STATUS.NONE; }
  function hasStatusCondition(activeIdx) {
    return battleState.statusByActiveIdx[activeIdx] && battleState.statusByActiveIdx[activeIdx] !== STATUS.NONE;
  }
  function addPlusPowerForActive(activeIdx, amount = 1) {
    if (activeIdx == null || activeIdx < 0 || activeIdx > 3) return;
    battleState.plusPowerByActiveIdx[activeIdx] += Math.max(0, amount | 0);
  }
  function getPlusPowerForActive(activeIdx) {
    if (activeIdx == null || activeIdx < 0 || activeIdx > 3) return 0;
    return battleState.plusPowerByActiveIdx[activeIdx] || 0;
  }
  function applyDefenderShield(activeIdx) {
    if (activeIdx == null || activeIdx < 0 || activeIdx > 3) return;
    battleState.defendShieldByActiveIdx[activeIdx] += 1;
  }
  function setStatus(activeIdx, status) {
    if (activeIdx == null || activeIdx < 0) return;
    battleState.statusByActiveIdx[activeIdx] = status;
  }
  function discardAttachedEnergy(activeIdx, count, preferredTypeIdx = -1, reason = 'Choose Energy type to discard') {
    E.discardEnergyFromActive?.(activeIdx, count, { preferredTypeIdx, reason, redraw: true });
  }

  function elevateHpBoxForIndex(activeIdx, on) {
    const hp = U.getHpElForActiveIndex(activeIdx);
    if (!hp) return;
    const box = hp.classList?.contains('health') ? hp : hp.closest?.('.health') || hp;
    box.classList.toggle('elevate', !!on);
  }

  // ---------- Attack UI flow ----------
  function beginAttackSelection() {
    selectedAttackInfo = null;
    global.lastAttackKO = false;

    UI.boardOverlay.classList.remove('hidden');
    document.querySelector('main').classList.add('board-inert');
    UI.newBtn.classList.add('hidden');

    const me = (U.whoIsActive ? U.whoIsActive() : (UI.players[0].classList.contains('player--active') ? 0 : 1));
    const yourActives = me === 0 ? [0, 2] : [1, 3];
    const oppActives  = me === 0 ? [1, 3] : [0, 2];

    [...yourActives, ...oppActives].forEach(idx => {
      UI.activePokemon[idx].classList.add('elevate');
      elevateHpBoxForIndex(idx, true);
      E.elevateEnergyForIndex(idx, true);
    });

    if (UI.boardOverlay) {
      UI.boardOverlay.dataset.prevZ = UI.boardOverlay.style.zIndex || '';
      UI.boardOverlay.style.zIndex = '1000';
    }
    [0,1,2,3].forEach(i => {
      const hp = U.getHpElForActiveIndex(i);
      if (hp) { hp.dataset.prevZ = hp.style.zIndex || ''; hp.style.zIndex = '1002'; }
    });

    oppActives.forEach(idx => {
      UI.activePokemon[idx].classList.add('no-pointer');
      const hp = U.getHpElForActiveIndex(idx);
      if (hp) hp.classList.add('no-pointer');
    });

    UI.attackPanel.classList.remove('hidden');
    UI.attackPanelTitle.textContent = 'Choose an attack';
    renderAttackOptions(yourActives);
    UI.cancelAttackBtn.onclick = cancelAttackFlow;
  }

  function renderAttackOptions(yourActiveIdxs) {
    UI.attackPanelOptions.innerHTML = '';
    yourActiveIdxs.forEach((slotIdx) => {
      const img = UI.activePokemon[slotIdx];
      const cardId = U.getCardIdFromImg(img);
      if (!cardId) return;

      const card = baseSet[cardId - 1];

      const row = document.createElement('div');
      row.className = 'attack-row';

      const title = document.createElement('div');
      title.className = 'attack-pokemon-name';
      title.textContent = card?.name || `Pokémon #${cardId}`;
      row.appendChild(title);

      const plusPowerCount = getPlusPowerForActive(slotIdx);
      if (plusPowerCount > 0) {
        const note = document.createElement('div');
        note.className = 'attack-pokemon-name';
        note.textContent = `PlusPower attached: +${plusPowerCount * 10} damage this turn`;
        row.appendChild(note);
      }

      (card.attacks || []).forEach((atk, attackIdx) => {
        const atkObj = U.toAttackObj(card, atk, attackIdx);
        if (atkObj.kind === 'power') return;

        const ok = checkEnergyForAttack(global.attachedEnergy[slotIdx], atkObj);
        const statusBlocked = hasStatusBlock(slotIdx);
        const btn = document.createElement('button');
        btn.className = 'btn attack-move-btn';
        btn.disabled = !ok || statusBlocked;
        btn.textContent = `${atkObj.name} — ${atkObj.damage} dmg`;

        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          selectedAttackInfo = { slotIdx, cardId, attackIdx, atk: atkObj };
          enterTargetSelect();
        });

        row.appendChild(btn);
      });

      UI.attackPanelOptions.appendChild(row);
    });
  }

  function enterTargetSelect() {
    const me = (U.whoIsActive ? U.whoIsActive() : (UI.players[0].classList.contains('player--active') ? 0 : 1));
    const oppActives = me === 0 ? [1, 3] : [0, 2];
    UI.attackPanelTitle.textContent = 'Choose a target';
    UI.attackPanelOptions.innerHTML = '<div>Click one of the defending Pokémon.</div>';

    oppActives.forEach(idx => {
      UI.activePokemon[idx].classList.remove('no-pointer');
      const hp = U.getHpElForActiveIndex(idx);
      if (hp) hp.classList.remove('no-pointer');
    });


    const removeHandlers = [];
    oppActives.forEach((defIdx) => {
      const handler = () => {
        // remove listeners immediately so they can't fire again
        removeHandlers.forEach(fn => fn());

        if (!selectedAttackInfo) return; // extra guard
        resolveAttack(selectedAttackInfo, defIdx);
        finalizeAttackFlow();
        if (!global.lastAttackKO) global.switchPlayer();
      };
      UI.activePokemon[defIdx].addEventListener('click', handler);
      removeHandlers.push(() => UI.activePokemon[defIdx].removeEventListener('click', handler));
    });

    // store a one-shot cleaner we can invoke from finalize/cancel
    UI.attackPanelOptions._cleanup = () => removeHandlers.forEach(fn => fn());
  }

  function cancelAttackFlow() {
    if (UI.attackPanelOptions._cleanup) { UI.attackPanelOptions._cleanup(); UI.attackPanelOptions._cleanup = null; }
    finalizeAttackFlow();
  }

  function finalizeAttackFlow() {
    // ⬇️ If a win just happened during resolveAttack/endGame, leave the overlay alone.
    if (window.playing === false) { 
      selectedAttackInfo = null; 
      return; 
    }

    if (UI.attackPanelOptions._cleanup) { UI.attackPanelOptions._cleanup(); UI.attackPanelOptions._cleanup = null; }
    UI.attackPanel.classList.add('hidden');
    UI.boardOverlay.classList.add('hidden');
    document.querySelector('main').classList.remove('board-inert');
    UI.newBtn.classList.remove('hidden');

    [0,1,2,3].forEach(i => {
      UI.activePokemon[i].classList.remove('elevate', 'no-pointer');
      E.elevateEnergyForIndex(i, false);
    });

    if (UI.boardOverlay) {
      UI.boardOverlay.style.zIndex = UI.boardOverlay.dataset.prevZ || '';
      delete UI.boardOverlay.dataset.prevZ;
    }
    selectedAttackInfo = null;
  }
  
  // ---------- Rules ----------
  function checkEnergyForAttack(attachedArr, attack) {
    const atk = (attack && typeof attack === 'object' && !Array.isArray(attack))
      ? attack
      : U.toAttackObj({ attackNames: [] }, attack, 0);

    if (atk.kind === 'power') return false;

    const reqTypes = Array.isArray(atk.types) ? atk.types : [];
    let colorless = 0;
    const needTyped = {};
    for (const t of reqTypes) {
      if (t === 'normal') colorless++;
      else {
        const idx = U.getEnergyIndex(t);
        if (idx < 0) return false;
        needTyped[idx] = (needTyped[idx] || 0) + 1;
      }
    }

    const have = attachedArr.slice();
    for (const [idxStr, cnt] of Object.entries(needTyped)) {
      const idx = Number(idxStr);
      if (have[idx] < cnt) return false;
      have[idx] -= cnt;
    }
    const leftover = have.reduce((a, b) => a + b, 0);
    return leftover >= colorless;
  }

  function resolveAttack(info, defenderIdx) {
    if (!info) return; // guard stale clicks
    const { slotIdx: attackerIdx, cardId, attackIdx, atk } = info;
    const attackerCard = baseSet[cardId - 1];
    const attack = (atk && typeof atk === 'object' && !Array.isArray(atk))
      ? atk
      : U.toAttackObj(attackerCard, atk, attackIdx);

    if (attack.kind === 'power') { finalizeAttackFlow(); return; }

    const defenderImg = UI.activePokemon[defenderIdx];
    const defenderCardId = U.getCardIdFromImg(defenderImg);
    if (!defenderCardId) return;
    const defenderCard = baseSet[defenderCardId - 1];

    if (battleState.statusByActiveIdx[attackerIdx] === STATUS.CONFUSED) {
      if (!flipCoin()) {
        damageActiveByIdx(attackerIdx, 20);
        clearStatus(attackerIdx);
        return;
      }
      clearStatus(attackerIdx);
    }

    let damage = Number(attack.damage) || 0;
    const attackName = attack.name;
    const attackerEnergy = global.attachedEnergy[attackerIdx]?.reduce((a, b) => a + b, 0) || 0;
    const defenderEnergy = global.attachedEnergy[defenderIdx]?.reduce((a, b) => a + b, 0) || 0;

    if (attackName === 'Psychic') damage += 10 * defenderEnergy;
    if (attackName === 'Water Gun' || attackName === 'Hydro Pump') {
      const extra = Math.max(0, attackerEnergy - 3);
      damage += Math.min(20, extra * 10);
    }
    if (attackName === 'Thunderpunch') {
      damage += flipCoin() ? 10 : 0;
      if (damage === Number(attack.damage || 0)) damageActiveByIdx(attackerIdx, 10);
    }
    if (attackName === 'Twineedle') damage = (flipCoin() ? 30 : 0) + (flipCoin() ? 30 : 0);
    if (attackName === 'Double Kick') damage = (flipCoin() ? 30 : 0) + (flipCoin() ? 30 : 0);
    if (attackName === 'Doubleslap' || attackName === 'Fury Attack' || attackName === 'Slam') {
      const perHit = attackName === 'Slam' ? 30 : 10;
      const flips = attackName === 'Slam' ? 2 : (attackName === 'Doubleslap' ? 4 : 3);
      let heads = 0;
      for (let i = 0; i < flips; i++) if (flipCoin()) heads++;
      damage = heads * perHit;
    }

    if (battleState.defendShieldByActiveIdx[defenderIdx] > 0) {
      damage = Math.max(0, damage - (20 * battleState.defendShieldByActiveIdx[defenderIdx]));
    }
    if (defenderCard.weakness === attackerCard.type) damage *= 2;
    if (defenderCard.resistance === attackerCard.type) damage = Math.max(0, damage - 30);
    damage += (battleState.plusPowerByActiveIdx[attackerIdx] || 0) * 10;

    const hpEl = U.getHpElForActiveIndex(defenderIdx);
    if (!hpEl) return;
    const m = (hpEl.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
    if (!m) return;

    const curHP  = parseInt(m[1], 10);
    const baseHP = parseInt(m[2], 10);
    const newHP = Math.max(0, curHP - damage);
    hpEl.textContent = `${newHP} / ${baseHP}`;

    global.lastAttackKO = newHP <= 0;

    if (global.lastAttackKO) {
      defenderImg.classList.add('knocked-out');

      const defenderOwner  = U.ownerOfActiveIdx(defenderIdx);
      const attackerOwner  = 1 - defenderOwner;
      const atkKey         = U.playerKeyOf(attackerOwner);

      // Discard KO’d Pokémon & clear slot
      global.addToDiscard(defenderOwner, defenderCardId);
      const img = UI.activePokemon[defenderIdx];
      img.classList.add('hidden');
      img.src = '';
      const hp = U.getHpElForActiveIndex(defenderIdx);
      if (hp) hp.textContent = '- / -';
      E.clearEnergyForActiveIndex(defenderIdx);
      img.classList.remove('knocked-out');
      global.refreshRetreatButtons?.();
      delete img.dataset.playRound;
      delete img.dataset.lastEvolved;

      // KO count → 4 KOs to win (your new rule)
      global.koCount[atkKey] = (global.koCount[atkKey] || 0) + 1;
      if (global.koCount[atkKey] >= 4) {
        global.endGame(attackerOwner, `${atkKey} knocked out 4 Pokémon`);
        return; 
      }

      // Open the (facedown) prize picker for the attacker; must choose exactly one
      setTimeout(() => window.openPrizeChoiceFor?.(atkKey), 0);

      if (global.checkNoActiveLoss(defenderOwner)) return;
      global.checkNoPokemonLoss(defenderOwner);
      return;
    }

    if (attackName === 'Poison Sting' || attackName === 'Poisonpowder') setStatus(defenderIdx, STATUS.POISONED);
    if (attackName === 'Toxic') setStatus(defenderIdx, STATUS.POISONED);
    if (attackName === 'Sing' || attackName === 'Sleeping Gas') setStatus(defenderIdx, STATUS.ASLEEP);
    if (attackName === 'Confuse Ray') setStatus(defenderIdx, STATUS.CONFUSED);
    if (attackName === 'Thunder Wave' || attackName === 'Stun Spore' || attackName === 'Psyshock' || attackName === 'Ice Beam') {
      if (flipCoin()) setStatus(defenderIdx, STATUS.PARALYZED);
    }
    if (attackName === 'Agility' || attackName === 'Barrier' || attackName === 'Scrunch' || attackName === 'Withdraw' || attackName === 'Stiffen') {
      if (flipCoin() || attackName === 'Barrier') battleState.defendShieldByActiveIdx[attackerIdx] += 1;
    }
    if (attackName === 'Leech Seed') healActiveByIdx(attackerIdx, 10);
    if (attackName === 'Recover') {
      discardAttachedEnergy(attackerIdx, 1, U.getEnergyIndex(attackerCard.type), 'Choose an Energy to discard for Recover');
      const attackerHpEl = U.getHpElForActiveIndex(attackerIdx);
      const hp = parseHp(attackerHpEl);
      if (hp) setHp(attackerHpEl, hp.max, hp.max);
    }
    if (attackName === 'Fire Spin') discardAttachedEnergy(attackerIdx, 2, -1, 'Choose Energy to discard for Fire Spin');
    if (attackName === 'Flamethrower' || attackName === 'Fire Blast') discardAttachedEnergy(attackerIdx, 1, U.getEnergyIndex('fire'), 'Choose an Energy to discard for this attack');
    if (attackName === 'Thunderbolt') discardAttachedEnergy(attackerIdx, 99, U.getEnergyIndex('lightning'), 'Choose Energy to discard for Thunderbolt');
    if (attackName === 'Hyper Beam' || attackName === 'Whirlpool') discardAttachedEnergy(defenderIdx, 1, -1, 'Choose an Energy to discard from the Defending Pokémon');

    if (attackName === 'Double-Edge') damageActiveByIdx(attackerIdx, 80);
    if (attackName === 'Submission') damageActiveByIdx(attackerIdx, 20);
    if (attackName === 'Take Down') damageActiveByIdx(attackerIdx, 30);
    if (attackName === 'Thunder') if (!flipCoin()) damageActiveByIdx(attackerIdx, 30);
    if (attackName === 'Thunder Jolt') if (!flipCoin()) damageActiveByIdx(attackerIdx, 10);
    if (attackName === 'Selfdestruct') {
      damageActiveByIdx(attackerIdx, 100);
      const attackerOwner = U.ownerOfActiveIdx(attackerIdx);
      const defenderOwner = 1 - attackerOwner;
      ownerActives(attackerOwner).forEach(i => { if (i !== attackerIdx) damageActiveByIdx(i, 0); });
      const ownBenchBase = attackerOwner === 0 ? 0 : 4;
      const oppBenchBase = defenderOwner === 0 ? 0 : 4;
      for (let i = 0; i < 4; i++) {
        if (!UI.benchPokemon[ownBenchBase + i].classList.contains('hidden')) {
          const hpEl = UI.hitpoints[attackerOwner === 0 ? 'player1' : 'player2'][2 + i];
          const hp = parseHp(hpEl);
          if (hp) hpEl.textContent = `HP: ${Math.max(0, hp.cur - 10)} / ${hp.max}`;
        }
        if (!UI.benchPokemon[oppBenchBase + i].classList.contains('hidden')) {
          const hpEl = UI.hitpoints[defenderOwner === 0 ? 'player1' : 'player2'][2 + i];
          const hp = parseHp(hpEl);
          if (hp) hpEl.textContent = `HP: ${Math.max(0, hp.cur - 10)} / ${hp.max}`;
        }
      }
    }
  }



  function resetBattleState() {
    for (let i = 0; i < 4; i++) {
      battleState.statusByActiveIdx[i] = STATUS.NONE;
      battleState.defendShieldByActiveIdx[i] = 0;
      battleState.plusPowerByActiveIdx[i] = 0;
    }
  }

  function onTurnStart(activePlayerIdx) {
    ownerActives(activePlayerIdx).forEach((idx) => {
      if (battleState.statusByActiveIdx[idx] === STATUS.POISONED) damageActiveByIdx(idx, 10);
      if (battleState.statusByActiveIdx[idx] === STATUS.ASLEEP && flipCoin()) clearStatus(idx);
    });
  }

  function onTurnEnd(activePlayerIdx) {
    ownerActives(activePlayerIdx).forEach((idx) => {
      if (battleState.statusByActiveIdx[idx] === STATUS.PARALYZED) clearStatus(idx);
    });
    ownerActives(activePlayerIdx).forEach((idx) => {
      battleState.plusPowerByActiveIdx[idx] = 0;
    });
    ownerActives(1 - activePlayerIdx).forEach((idx) => {
      battleState.defendShieldByActiveIdx[idx] = 0;
    });
  }

  // Optional hook for your main script; keep idempotent
  function initUI(){ /* no-op on purpose */ }

  // ---------- Exports ----------
  const Attack = {
    beginAttackSelection, renderAttackOptions,
    enterTargetSelect, cancelAttackFlow, finalizeAttackFlow,
    checkEnergyForAttack, resolveAttack,
    onTurnStart, onTurnEnd,
    clearStatus, hasStatusCondition, addPlusPowerForActive, getPlusPowerForActive, applyDefenderShield,
    resetBattleState,
    initUI,
  };

  global.Game = global.Game || {};
  global.Game.Attack = Attack;

  // Back-compat globals your existing script references
  global.beginAttackSelection = beginAttackSelection;
  global.renderAttackOptions  = renderAttackOptions;
  global.enterTargetSelect    = enterTargetSelect;
  global.cancelAttackFlow     = cancelAttackFlow;
  global.finalizeAttackFlow   = finalizeAttackFlow;
  global.checkEnergyForAttack = checkEnergyForAttack;
  global.resolveAttack        = resolveAttack;
})(window);
