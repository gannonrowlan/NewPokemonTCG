// attack.js
(function (global) {
  'use strict';

  const U = (global.Game && global.Game.Utils) || {};
  const E = (global.Game && global.Game.Energy) || {};

  let selectedAttackInfo = null;
  global.lastAttackKO = false; // preserved for back-compat with your code

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

      (card.attacks || []).forEach((atk, attackIdx) => {
        const atkObj = U.toAttackObj(card, atk, attackIdx);
        if (atkObj.kind === 'power') return;

        const ok = checkEnergyForAttack(global.attachedEnergy[slotIdx], atkObj);
        const btn = document.createElement('button');
        btn.className = 'btn attack-move-btn';
        btn.disabled = !ok;
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

    let damage = Number(attack.damage) || 0;
    if (defenderCard.weakness === attackerCard.type) damage *= 2;
    if (defenderCard.resistance === attackerCard.type) damage = Math.max(0, damage - 30);

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
    }
  }

  // Optional hook for your main script; keep idempotent
  function initUI(){ /* no-op on purpose */ }

  // ---------- Exports ----------
  const Attack = {
    beginAttackSelection, renderAttackOptions,
    enterTargetSelect, cancelAttackFlow, finalizeAttackFlow,
    checkEnergyForAttack, resolveAttack,
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
