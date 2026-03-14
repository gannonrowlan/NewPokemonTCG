'use strict';

// --- Constants ---
const HAND_SIZE = 7;
const BENCH_SIZE = 4;
const PRIZE_CARDS = 4;
const ENERGY_TYPES = 6;
const MAX_PRIZES = 4;

// --- Game State ---
let activePlayer,
  playing,
  cardSelected = false,
  selectedCard,
  selectedCardCount,
  energySelected,
  tempHealth,
  tempDiv,
  cardChange = false,
  round,
  player1CardsRem,
  player2CardsRem,
  player1Energy,
  player2Energy,
  player1Deck = [],
  player2Deck = [],
  player1Hand = [],
  player2Hand = [],
  prizesRemaining = { player1: MAX_PRIZES, player2: MAX_PRIZES },
  player1ActiveHP = [null, null],
  player1BenchHP = [null, null, null, null],
  player2ActiveHP = [null, null],
  player2BenchHP = [null, null, null, null],
  lastAttackKO = false,
  trainerPlayedThisTurn = false,
  hasRetreatedThisTurn = false,
  koCount = { player1: 0, player2: 0 },
  discardPiles = { player1: [], player2: [] },
  prizePools = { player1: [], player2: [] };

// --- Core Game Functions ---

// Always use the "swap" logic for hand and energy menus!
function getMenuIndex(player) { return player === 0 ? 1 : 0; }
function getHandIndex(player) { return player === 0 ? 1 : 0; } // if you swap hands too

// Restricts first-turn bench placement until both actives are filled
function isPlayersOpeningTurn(pIdx) {
  return (pIdx === 0 && round === 1) || (pIdx === 1 && round === 2);
}

window.isPlayersOpeningTurn = isPlayersOpeningTurn;

function cardPlacement(card) {
  if (!cardSelected) return false;
  const selectedCardId = getCardIdFromImg(selectedCard);
  // First turn restriction
  const isFirstTurn = isPlayersOpeningTurn(activePlayer);
  const placingToBench = UI.benchPokemon.includes(card);
  if (placingToBench) {
    const pIdx = (activePlayer === 0) ? 0 : 1;
    if (hasEmptyActive(pIdx)) {
      alert("You must refill your empty Active slot before placing Pokémon on the bench.");
      return false;
    }
  }
  let activeSlot1 = UI.activePokemon[activePlayer === 0 ? 0 : 1];
  let activeSlot2 = UI.activePokemon[activePlayer === 0 ? 2 : 3];
  if (
    isFirstTurn &&
    UI.benchPokemon.includes(card) &&
    (activeSlot1.classList.contains('hidden') || activeSlot2.classList.contains('hidden'))
  ) {
    alert("Place two basic Pokémon in the active slots first!");
    return false;
  }
  if (card.classList.contains('hidden') && !baseEvo.includes(selectedCardId)) {
    card.src = selectedCard.src;
    card.classList.remove('hidden');
    card.dataset.playRound = String(round);
    delete card.dataset.lastEvolved;
    consumeSelectedHandCard();
    selectedCard.classList.add('hidden');
    cardSelected = false;
    return true;
  }
  return false;
}

// Handles Pokémon evolution (supports new evolvesFrom or old stage[1])
function cardEvolution(card, healthDiv, active) {
  if (!cardSelected) return;

  const selId = getCardIdFromImg(selectedCard);
  const baseId = getCardIdFromImg(card);
  if (!selId || !baseId) return;

  const selData = baseSet[selId - 1];
  const evolvesFromId = getEvolvesFromId(selData);

  // Gate by rules
  if (round <= 2) { alert("You can't evolve on the first turn of the game."); return; }
  if (String(round) === (card.dataset.playRound || '')) {
    alert("You can't evolve a Pokémon the same turn it was put into play.");
    return;
  }
  if (String(round) === (card.dataset.lastEvolved || '')) {
    alert("That Pokémon has already evolved this turn.");
    return;
  }

  const canEvolve = (evolvesFromId === baseId) && baseEvo.includes(selId);
  if (!canEvolve) return;

  // Carry damage forward: read old HP box
  const hpText = (healthDiv.textContent || '');
  const m = hpText.match(/(\d+)\s*\/\s*(\d+)/);
  let oldCur = 0, oldMax = 0;
  if (m) { oldCur = parseInt(m[1],10) || 0; oldMax = parseInt(m[2],10) || 0; }
  const oldDamage = Math.max(0, oldMax - oldCur);

  // Place evolved image
  card.src = selectedCard.src;
  consumeSelectedHandCard();
  selectedCard.classList.add('hidden');

  // New max HP and adjusted current HP
  const newMax = baseSet[selId - 1].HP | 0;
  const newCur = Math.max(0, newMax - oldDamage);
  healthDiv.textContent = active ? `${newCur} / ${newMax}` : `HP: ${newCur} / ${newMax}`;

  // Mark that this specific Pokémon evolved this turn
  card.dataset.lastEvolved = String(round);

  // Clear hand selection
  cardSelected = false;
}


function changeHealth(healthDiv, active, srcImg /* optional */) {
  // Prefer the image we just placed/evolved; else fall back to selectedCard
  const srcEl = srcImg || selectedCard;
  const cardId = getCardIdFromImg(srcEl);
  if (!cardId) return;

  const hp = baseSet[cardId - 1].HP;
  healthDiv.textContent = active ? `${hp} / ${hp}` : `HP: ${hp} / ${hp}`;
}

// --- Energy System ---

// Only allow assigning if you have energy left, and decrement energy as soon as assigned
for (let player = 0; player < 2; player++) {
  let playerKey = player === 0 ? 'player2' : 'player1'; // SWAPPED: player1 uses menu[1]
  for (let i = 0; i < ENERGY_TYPES; i++) {
    UI.energy.plusBtn[playerKey][i].addEventListener('click', function () {
      if (activePlayer === player) {
        let availableEnergy = player === 0 ? player1Energy : player2Energy;
        if (availableEnergy > 0) {
          energyCounts[playerKey][i]++;
          UI.energy.count[playerKey][i].textContent = energyCounts[playerKey][i];
          addEnergy(UI.energy.cards[playerKey][i]);
          if (player === 0) player1Energy--;
          else player2Energy--;
          UI.energyBtn.textContent = `Energy: ${player === 0 ? player1Energy : player2Energy}`;
        } else {
          alert("No energy left to assign this turn!");
        }
      }
    });
  }
}

// Clicking an energy card allows you to select it for attaching
for (let player of ['player1', 'player2']) {
  for (let i = 0; i < ENERGY_TYPES; i++) {
    UI.energy.cards[player][i].addEventListener('click', function () {
      useEnergy(UI.energy.cards[player][i], energyCounts[player][i]);
    });
  }
}

function openEnergy(energy, handBtn) {
  const opening = energy.classList.contains('hidden'); // true if about to open
  energy.classList.toggle('hidden');
  UI.newBtn.classList.toggle('hidden');
  handBtn.classList.toggle('hidden');
  cardSelected = false;
  if (round >= 3) UI.attackBtn.classList.toggle('hidden');

  // Hide while opening; recompute when closing
  if (opening) UI.endBtn.classList.add('hidden');
  else recomputeEndTurnVisibility();

  updateMenuOpenState();
}

function toggleDiscardFor(pIdx) {
  const main = document.querySelector('main');
  const menu = document.getElementById(`discard-menu-${pIdx + 1}`);
  if (!menu) return;

  const btn = document.querySelector(`.btn--discard${pIdx + 1}`);
  const handBtn = UI.handBtn?.[pIdx];

  const nowHidden = menu.classList.toggle('hidden'); // false => just opened
  if (btn) btn.textContent = nowHidden ? 'Discard' : 'Close Discard';
  if (handBtn) handBtn.classList.toggle('hidden', !nowHidden);

  // ALWAYS hide End Turn while Discard is open; on close, recompute properly
  if (!nowHidden) {
    UI.endBtn.classList.add('hidden');      // opening
  } else {
    recomputeEndTurnVisibility();           // closing → recompute based on current board/menus
  }

  if (round >= 3) {
    UI.attackBtn.classList.toggle('hidden');
    UI.energyBtn.classList.toggle('hidden');
  }
  UI.newBtn.classList.toggle('hidden');

  const d1Open = !(document.getElementById('discard-menu-1')?.classList.contains('hidden') ?? true);
  const d2Open = !(document.getElementById('discard-menu-2')?.classList.contains('hidden') ?? true);
  const discardOpen = d1Open || d2Open;

  const anyOpen =
    !UI.playerHands[0].classList.contains('hidden') ||
    !UI.playerHands[1].classList.contains('hidden') ||
    !UI.energy.menus[0].classList.contains('hidden') ||
    !UI.energy.menus[1].classList.contains('hidden') ||
    !UI.prizeCardMenu.classList.contains('hidden') ||
    discardOpen;

  main.classList.toggle('menu-open', anyOpen);
  main.classList.toggle('discard-open', discardOpen);
}

const endTurn = function (top, bottom) {
  const pIdx = activePlayer;

  const topHidden    = top.classList.contains('hidden');
  const bottomHidden = bottom.classList.contains('hidden');
  const bothPresent  = !topHidden && !bottomHidden;
  const hasEmpty     = topHidden || bottomHidden;

  // On each player's opening turn, both Active slots are mandatory.
  if (isPlayersOpeningTurn(pIdx) && hasEmpty) {
    UI.endBtn.classList.add('hidden');
    return;
  }

  // If both Actives are present, we can always show End Turn (menus/round rules handled elsewhere)
  if (bothPresent) {
    UI.endBtn.classList.remove('hidden');
    return;
  }

  // If an Active is empty:
  // - If the player HAS a Benched Pokémon, they must refill → hide End Turn
  // - If the Bench is empty, allow them to end the turn → show End Turn
  if (hasEmpty) {
    if (hasAnyBenchPokemon(pIdx)) {
      UI.endBtn.classList.add('hidden');   // must refill, Bench has options
    } else {
      UI.endBtn.classList.remove('hidden'); // no Bench → not mandated to refill
    }
    return;
  }

  // Fallback (shouldn't be hit often)
  UI.endBtn.classList.add('hidden');
};

const closeTrainer = function (trainerMenu, handBtn, confirmBtn) {
  // Close the trainer UI
  trainerMenu.classList.add('hidden');
  confirmBtn.classList.add('hidden');
  handBtn.classList.remove('hidden');
  cardSelected = false;

  // Keep New Game consistent with the global menu state
  if (anyMenuOpen()) UI.newBtn.classList.add('hidden');
  else UI.newBtn.classList.remove('hidden');

  // Make sure End Turn visibility respects open menus & actives
  recomputeEndTurnVisibility();

  // Update the "menu-open" flag on <main>
  updateMenuOpenState();
};
const openTrainer = function (trainerMenu, handBtn) {
  trainerMenu.classList.remove('hidden');
  UI.newBtn.classList.add('hidden');
  handBtn.classList.add('hidden');
};
const openHand = function (hand) {
  const opening = hand.classList.contains('hidden'); // true if we're about to open it
  hand.classList.toggle('hidden');
  UI.newBtn.classList.toggle('hidden');
  if (round >= 3) {
    UI.attackBtn.classList.toggle('hidden');
    UI.energyBtn.classList.toggle('hidden');
  }
  if (opening) {
    UI.endBtn.classList.add('hidden');         // opening → force hide
  } else {
    recomputeEndTurnVisibility();              // closing → compute properly
  }
  cardSelected = false;
  updateMenuOpenState();
};


const drawCard = function () {
  // Deck-out check
  const myDeck = (activePlayer === 0) ? player1Deck : player2Deck;
  if (myDeck.length === 0) {
    endGame(activePlayer === 0 ? 1 : 0, `${activePlayer===0?'player1':'player2'} decked out (couldn't draw)`);
    return;
  }

  // Your rule: no draw until round 3
  if (round <= 2) return;

  // Take the top card and put into the active player's hand (no slot limit)
  const nextId = myDeck.shift();
  putCardIntoHand(activePlayer, nextId);

  // Update counters
  if (activePlayer === 0) {
    player1CardsRem--;
    document.querySelector('.remaining-cards1').textContent = `Cards Remaining In Deck: ${player1CardsRem}`;
  } else {
    player2CardsRem--;
    document.querySelector('.remaining-cards2').textContent = `Cards Remaining In Deck: ${player2CardsRem}`;
  }

  // Keep the hand sorted as requested
  sortHand(activePlayer);
};

function forceCloseAllMenus() {
  // Hands
  UI.playerHands[0].classList.add('hidden');
  UI.playerHands[1].classList.add('hidden');

  // Energy menus
  UI.energy.menus[0].classList.add('hidden');
  UI.energy.menus[1].classList.add('hidden');

  // Discard menus
  document.getElementById('discard-menu-1')?.classList.add('hidden');
  document.getElementById('discard-menu-2')?.classList.add('hidden');

  // Prize overlay + Take Prize button
  UI.prizeCardMenu.classList.add('hidden');
  document.querySelector('.btn--take-prize')?.classList.add('hidden');

  // Update the global "menu-open" flag
  updateMenuOpenState();
}

function switchPlayer() {
  sortHand();
  window.Game?.Attack?.onTurnEnd?.(activePlayer);
  round++;
  activePlayer = activePlayer === 0 ? 1 : 0;
  window.Game?.Attack?.onTurnStart?.(activePlayer);
  trainerPlayedThisTurn = false;
  forceCloseAllMenus();
  UI.players[0].classList.toggle('player--active', activePlayer === 0);
  UI.players[1].classList.toggle('player--active', activePlayer === 1);
  UI.handBtn[0].classList.toggle('hidden', activePlayer !== 0);
  UI.handBtn[1].classList.toggle('hidden', activePlayer !== 1);
  UI.remainingCards[0].classList.toggle('hidden', activePlayer !== 0);
  UI.remainingCards[1].classList.toggle('hidden', activePlayer !== 1);
  // Energy increment after turn 5
  if (round >= 5 && activePlayer === 0 && player1Energy < 3) player1Energy++;
  if (round >= 5 && activePlayer === 1 && player2Energy < 3) player2Energy++;
  if (round >= 3) {
    UI.energyBtn.textContent = `Energy: ${activePlayer === 0 ? player1Energy : player2Energy}`;
    UI.attackBtn.classList.remove('hidden');
    UI.energyBtn.classList.remove('hidden');
  }
  if (round === 2) UI.endBtn.classList.add('hidden');
  drawCard();
  // Always hide both energy menus after turn switch!
  UI.energy.menus[0].classList.add('hidden');
  UI.energy.menus[1].classList.add('hidden');
  hasRetreatedThisTurn = false;
  refreshRetreatButtons();
  refreshDiscardButtons();
  recomputeEndTurnVisibility();
}

function clearActiveAtIndex(activeIdx) {
  // hide Pokémon image
  const img = UI.activePokemon[activeIdx];
  img.classList.add('hidden');
  img.src = ''; // optional but nice

  // reset HP box
  const hp = getHpElForActiveIndex(activeIdx);
  if (hp) hp.textContent = '- / -';

  // clear energy badges
  clearEnergyForActiveIndex(activeIdx);

  // remove KO style
  img.classList.remove('knocked-out');
  refreshRetreatButtons();
  delete img.dataset.playRound;
  delete img.dataset.lastEvolved;
}

function checkNoPokemonLoss(pIdx) {
  const actives = pIdx === 0 ? [0,2] : [1,3];
  const benchBase = pIdx === 0 ? 0 : 4;
  const anyActive = actives.some(i => !UI.activePokemon[i].classList.contains('hidden'));
  const anyBench  = [0,1,2,3].some(bi => !UI.benchPokemon[benchBase + bi].classList.contains('hidden'));
  if (!anyActive && !anyBench) {
    endGame(1 - pIdx, `${playerKeyOf(pIdx)} has no Pokémon left.`);
    return true;
  }
  return false;
}

function tryPromoteBenchToEmptyActive(pIdx) {
  const emptyActive = firstEmptyActiveIdx(pIdx);
  if (emptyActive == null) return false;
  const benchBase = pIdx === 0 ? 0 : 4;

  // Pick the first benched Pokémon to promote (simple rule; you can later add UI to choose)
  const benchIdx = [0,1,2,3].find(i => !UI.benchPokemon[benchBase + i].classList.contains('hidden'));
  if (benchIdx == null) return false;

  // Move image
  const from = UI.benchPokemon[benchBase + benchIdx];
  const to   = UI.activePokemon[emptyActive];
  to.src = from.src;
  to.classList.remove('hidden');
  to.dataset.playRound = from.dataset.playRound || String(round);
  to.dataset.lastEvolved = from.dataset.lastEvolved || '';
  delete from.dataset.playRound;
  delete from.dataset.lastEvolved;

  // Set HP for the promoted Pokémon
  const hpEl = getHpElForActiveIndex(emptyActive);
  changeHealth(hpEl, true, to);

  // Clear the bench spot
  from.classList.add('hidden');
  from.src = '';

  recomputeEndTurnVisibility();
  return true;
}

function _trainerBucket(cardId) {
  // Base Set ranges
  if (cardId >= 91 && cardId <= 95) return 3; // common trainers
  if (cardId >= 80 && cardId <= 90) return 4; // uncommon trainers
  if (cardId >= 70 && cardId <= 79) return 5; // rare trainers
  return 6; // energy/unknown/etc.
}
function handSortBucket(cardId) {
  if (!cardId) return 999;
  if (baseBasic.includes(cardId))  return 0;
  if (baseStage1.includes(cardId)) return 1;
  if (baseStage2.includes(cardId)) return 2;
  return _trainerBucket(cardId);
}

// Only treat Pokémon (Base_1..Base_69) as draggable from hand
function isPokemonId(id) { return Number.isInteger(id) && id >= 1 && id <= 69; }

// Bench HP lookup for evolution call (your bench click code uses the same mapping)
function getBenchHpForEl(benchImgEl) {
  const idx = UI.benchPokemon.findIndex(el => el === benchImgEl);
  if (idx === -1) return { hpGroup: null, hpIdx: null };
  const hpGroup = (idx < 4) ? 'player1' : 'player2';
  const hpIdx   = (idx % 4) + 2; // bench HP indices are +2 in your arrays
  return { hpGroup, hpIdx };
}

// Small helper to route a drop to place-or-evolve using your existing functions
function handleDropOnPokemonImg(targetImgEl, isActive) {
  // If slot is empty -> place, then update HP
  if (targetImgEl.classList.contains('hidden')) {
    const placed = cardPlacement(targetImgEl);
    if (placed) {
      if (isActive) {
        const aIdx = getActiveIdxFromEl(targetImgEl);
        const hpEl = getHpElForActiveIndex(aIdx);
        changeHealth(hpEl, true, targetImgEl);
        clearEnergyForActiveIndex(aIdx);
        refreshRetreatButtons();
        recomputeEndTurnVisibility();
      } else {
        const { hpGroup, hpIdx } = getBenchHpForEl(targetImgEl);
        if (hpGroup) changeHealth(UI.hitpoints[hpGroup][hpIdx], false, targetImgEl);
        refreshRetreatButtons();
      }
    }
    return;
  }

  // Else slot has a Pokémon already -> try to evolve
  if (isActive) {
    const aIdx = getActiveIdxFromEl(targetImgEl);
    const hpEl = getHpElForActiveIndex(aIdx);
    cardEvolution(targetImgEl, hpEl, true);
  } else {
    const { hpGroup, hpIdx } = getBenchHpForEl(targetImgEl);
    if (hpGroup) cardEvolution(targetImgEl, UI.hitpoints[hpGroup][hpIdx], false);
  }
}


function enableDragForHand() {
  ['player1','player2'].forEach((key) => {
    UI.handCards[key].forEach((img) => {
      img.draggable = true;
      img.addEventListener('dragstart', (e) => {
        const id = getCardIdFromImg(img);
        // Only drag Pokémon from hand
        if (!isPokemonId(id)) { e.preventDefault(); return; }
        selectedCard = img;     // reuse your existing state
        cardSelected = true;
        // make it a proper drag payload
        e.dataTransfer.setData('text/plain', String(id));
        e.dataTransfer.effectAllowed = 'move';
        img.classList.add('dragging');
      });
      img.addEventListener('dragend', () => {
        img.classList.remove('dragging');
      });
    });
  });
}

function wireSlotDropZones() {
  // Player 1 actives map to active indices [0, 2]
  const p1ActiveSlots = document.querySelectorAll('.player--0 .card-slot-active');
  const p2ActiveSlots = document.querySelectorAll('.player--1 .card-slot-active');
  const p1BenchSlots  = document.querySelectorAll('.player--0 .card-slot-bench');
  const p2BenchSlots  = document.querySelectorAll('.player--1 .card-slot-bench');

  // Helper to bind a slot to a specific target image index in UI.activePokemon/UI.benchPokemon
  function bindSlot(slotEl, targetImgEl, isActive) {
    slotEl.addEventListener('dragover', allowDropIfPokemon);
    slotEl.addEventListener('drop', (e) => {
      e.preventDefault();
      handleDropOnPokemonImg(targetImgEl, isActive);
    });
  }

  // Actives
  if (p1ActiveSlots[0]) bindSlot(p1ActiveSlots[0], UI.activePokemon[0], true);
  if (p1ActiveSlots[1]) bindSlot(p1ActiveSlots[1], UI.activePokemon[2], true);
  if (p2ActiveSlots[0]) bindSlot(p2ActiveSlots[0], UI.activePokemon[1], true);
  if (p2ActiveSlots[1]) bindSlot(p2ActiveSlots[1], UI.activePokemon[3], true);

  // Bench (4 each)
  p1BenchSlots.forEach((slotEl, i) => bindSlot(slotEl, UI.benchPokemon[i], false));
  p2BenchSlots.forEach((slotEl, i) => bindSlot(slotEl, UI.benchPokemon[i + 4], false));
}

function updateMenuOpenState() {
  const anyOpen =
    !UI.playerHands[0].classList.contains('hidden') ||
    !UI.playerHands[1].classList.contains('hidden') ||
    !UI.energy.menus[0].classList.contains('hidden') ||
    !UI.energy.menus[1].classList.contains('hidden') ||
    !UI.prizeCardMenu.classList.contains('hidden') ||
    !(document.getElementById('discard-menu-1')?.classList.contains('hidden') ?? true) ||
    !(document.getElementById('discard-menu-2')?.classList.contains('hidden') ?? true);

  document.querySelector('main').classList.toggle('menu-open', anyOpen);
}

// End the game, show winner box, and make New Game clickable at the top
function endGame(winnerIdx, reason) {
  playing = false;
  const winnerKey = winnerIdx === 0 ? 'player1' : 'player2';

  // Close any open menus
  try { UI.prizeCardMenu?.classList.add('hidden'); } catch {}
  updateMenuOpenState?.();

  // Dim and lock the board, but keep New Game clickable
  document.querySelector('main')?.classList.add('board-inert');
  if (UI.boardOverlay) {
    UI.boardOverlay.classList.remove('hidden');
    UI.boardOverlay.style.pointerEvents = 'none'; // let the top New Game button be clickable
    UI.boardOverlay.innerHTML = `
      <div style="
        position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        background:#111;border:2px solid #fff;border-radius:14px;
        padding:22px 26px;max-width:520px;text-align:center;
        box-shadow:0 10px 30px rgba(0,0,0,.5);z-index:1200;
      ">
        <div style="font-size:28px;font-weight:800;letter-spacing:.08em;margin-bottom:10px;">
          ${winnerKey.toUpperCase()} WINS!
        </div>
        <div style="opacity:.85;margin-bottom:14px;">${reason}</div>
        <div style="font-size:14px;opacity:.8">Tap the <b>New Game</b> button at the top to restart.</div>
      </div>`;
  }

  // Disable other controls so nothing else can happen
  [UI.endBtn, UI.attackBtn, UI.energyBtn, UI.handBtn?.[0], UI.handBtn?.[1]]
    .forEach(btn => btn && (btn.disabled = true));

  // Make sure New Game is visible
  UI.newBtn?.classList.remove('hidden');
}
window.endGame = endGame;

// Extra condition: if a player has *no* Active Pokémon (both Active slots empty), they immediately lose.
function checkNoActiveLoss(pIdx) {
  const actives = pIdx === 0 ? [0, 2] : [1, 3];
  const anyActive = actives.some(i => !UI.activePokemon[i].classList.contains('hidden'));
  if (!anyActive) {
    endGame(1 - pIdx, `${(pIdx===0?'player1':'player2')} has no Active Pokémon`);
    return true;
  }
  return false;
}


function renderDiscardFor(pIdx) {
  const key  = playerKeyOf(pIdx);
  const grid = document.getElementById(`discard-grid-${pIdx + 1}`);
  if (!grid) return;
  grid.innerHTML = '';
  for (const id of discardPiles[key]) {
    const img = document.createElement('img');
    img.className = 'discard-card';
    img.src = cardIdToSrc(id);
    grid.appendChild(img);
  }
}

function addToDiscard(pIdx, cardId) {
  if (!cardId) return;
  const key = playerKeyOf(pIdx);
  discardPiles[key].push(cardId);
  renderDiscardFor(pIdx);
}

function ownerActives(pIdx) { return pIdx === 0 ? [0, 2] : [1, 3]; }
function ownerBenchRange(pIdx) { return pIdx === 0 ? [0, 1, 2, 3] : [4, 5, 6, 7]; }
function parseHpText(hpText) {
  const m = String(hpText || '').match(/(\d+)\s*\/\s*(\d+)/);
  return m ? { cur: parseInt(m[1], 10), max: parseInt(m[2], 10) } : null;
}
function getAvailableActives(pIdx, requireDamaged = false) {
  return ownerActives(pIdx).filter((aIdx) => {
    const img = UI.activePokemon[aIdx];
    if (!img || img.classList.contains('hidden')) return false;
    if (!requireDamaged) return true;
    const hp = parseHpText(getHpElForActiveIndex(aIdx)?.textContent || '');
    return !!hp && hp.cur < hp.max;
  });
}
function chooseActiveIndex(pIdx, opts = {}) {
  const list = getAvailableActives(pIdx, !!opts.requireDamaged);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const labels = list.map(i => {
    const id = getCardIdFromImg(UI.activePokemon[i]);
    return `${i}: ${baseSet[id - 1]?.name || `#${id}`}`;
  }).join('\n');
  const pick = prompt(`${opts.message || 'Choose Active index:'}\n${labels}`);
  const idx = Number.parseInt(pick, 10);
  return list.includes(idx) ? idx : null;
}
function chooseBenchIndex(pIdx, msg = 'Choose Benched index:') {
  const list = ownerBenchRange(pIdx).filter(i => !UI.benchPokemon[i].classList.contains('hidden'));
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const labels = list.map(i => {
    const id = getCardIdFromImg(UI.benchPokemon[i]);
    return `${i}: ${baseSet[id - 1]?.name || `#${id}`}`;
  }).join('\n');
  const pick = prompt(`${msg}\n${labels}`);
  const idx = Number.parseInt(pick, 10);
  return list.includes(idx) ? idx : null;
}
function discardOneEnergyFromActive(activeIdx, count = 1) {
  let toRemove = count;
  for (let i = 0; i < attachedEnergy[activeIdx].length && toRemove > 0; i++) {
    const used = Math.min(attachedEnergy[activeIdx][i], toRemove);
    attachedEnergy[activeIdx][i] -= used;
    toRemove -= used;
  }
  redrawEnergyForActiveIndex(activeIdx);
  return count - toRemove;
}

function canPlayTrainerCard(cardId, pIdx) {
  const opp = 1 - pIdx;
  switch (cardId) {
    case 79:
      return getAvailableActives(pIdx).some(i => attachedEnergy[i].reduce((a, b) => a + b, 0) > 0) &&
        getAvailableActives(opp).some(i => attachedEnergy[i].reduce((a, b) => a + b, 0) > 0);
    case 80: case 82: return getAvailableActives(pIdx).length > 0;
    case 84: case 88: case 91: return true;
    case 89:
      return ownerBenchRange(pIdx).some(i => UI.benchPokemon[i].classList.contains('hidden')) &&
        discardPiles[playerKeyOf(pIdx)].some(id => baseBasic.includes(id));
    case 90:
      return getAvailableActives(pIdx, true).some(i => attachedEnergy[i].reduce((a, b) => a + b, 0) > 0);
    case 92:
      return getAvailableActives(opp).some(i => attachedEnergy[i].reduce((a, b) => a + b, 0) > 0);
    case 93:
      return getAvailableActives(opp).length > 0 && ownerBenchRange(opp).some(i => !UI.benchPokemon[i].classList.contains('hidden'));
    case 94:
      return getAvailableActives(pIdx, true).length > 0;
    case 95:
      return getAvailableActives(pIdx).length > 0 && ownerBenchRange(pIdx).some(i => !UI.benchPokemon[i].classList.contains('hidden'));
    default:
      return false;
  }
}

function resolveTrainerCard(cardId, pIdx) {
  if (!canPlayTrainerCard(cardId, pIdx)) return false;
  const opp = 1 - pIdx;
  switch (cardId) {
    case 79: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose your Active to discard 1 Energy from:' });
      const foe = chooseActiveIndex(opp, { message: 'Choose opponent Active to remove up to 2 Energy from:' });
      if (own == null || foe == null) return false;
      if (discardOneEnergyFromActive(own, 1) < 1) return false;
      discardOneEnergyFromActive(foe, 2);
      return true;
    }
    case 80: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose your Active for Defender:' });
      if (own == null) return false;
      window.Game?.Attack?.applyDefenderShield?.(own);
      return true;
    }
    case 82: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose your Active for Full Heal:' });
      if (own == null) return false;
      window.Game?.Attack?.clearStatus?.(own);
      return true;
    }
    case 84:
      window.Game?.Attack?.addPlusPowerForOwner?.(pIdx, 1);
      return true;
    case 88: {
      const hand = getHandArr(pIdx);
      while (hand.length) addToDiscard(pIdx, hand.pop());
      renderHandFor(pIdx);
      for (let i = 0; i < 7; i++) drawCard();
      return true;
    }
    case 89: {
      const discard = discardPiles[playerKeyOf(pIdx)];
      const candidates = discard.filter(id => baseBasic.includes(id));
      const chosen = candidates.length === 1 ? candidates[0] : Number.parseInt(prompt(`Choose Basic Pokémon id to Revive:\n${[...new Set(candidates)].join(', ')}`), 10);
      if (!baseBasic.includes(chosen)) return false;
      const benchIdx = ownerBenchRange(pIdx).find(i => UI.benchPokemon[i].classList.contains('hidden'));
      const pos = discard.indexOf(chosen);
      if (benchIdx == null || pos === -1) return false;
      discard.splice(pos, 1);
      renderDiscardFor(pIdx);
      UI.benchPokemon[benchIdx].src = cardIdToSrc(chosen);
      UI.benchPokemon[benchIdx].classList.remove('hidden');
      const max = baseSet[chosen - 1]?.HP | 0;
      const cur = Math.ceil(max / 2);
      UI.hitpoints[playerKeyOf(pIdx)][(benchIdx % 4) + 2].textContent = `HP: ${cur} / ${max}`;
      return true;
    }
    case 90: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose damaged Active for Super Potion:', requireDamaged: true });
      if (own == null || discardOneEnergyFromActive(own, 1) < 1) return false;
      const hpEl = getHpElForActiveIndex(own);
      const hp = parseHpText(hpEl?.textContent || '');
      if (!hp) return false;
      hpEl.textContent = `${Math.min(hp.max, hp.cur + 40)} / ${hp.max}`;
      return true;
    }
    case 91:
      drawCard(); drawCard();
      return true;
    case 92: {
      const foe = chooseActiveIndex(opp, { message: 'Choose opponent Active to remove 1 Energy from:' });
      return foe != null && discardOneEnergyFromActive(foe, 1) > 0;
    }
    case 93: {
      const foeActive = chooseActiveIndex(opp, { message: 'Choose opponent Active to switch out:' });
      const foeBench = chooseBenchIndex(opp, 'Choose opponent Bench to switch in:');
      if (foeActive == null || foeBench == null) return false;
      const beforeRetreat = hasRetreatedThisTurn;
      window.Game?.Energy?.swapActiveWithBench?.(foeActive, foeBench);
      hasRetreatedThisTurn = beforeRetreat;
      refreshRetreatButtons();
      return true;
    }
    case 94: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose damaged Active to heal 20:', requireDamaged: true });
      if (own == null) return false;
      const hpEl = getHpElForActiveIndex(own);
      const hp = parseHpText(hpEl?.textContent || '');
      if (!hp) return false;
      hpEl.textContent = `${Math.min(hp.max, hp.cur + 20)} / ${hp.max}`;
      return true;
    }
    case 95: {
      const ownActive = chooseActiveIndex(pIdx, { message: 'Choose your Active to switch out:' });
      const ownBench = chooseBenchIndex(pIdx, 'Choose your Bench to switch in:');
      if (ownActive == null || ownBench == null) return false;
      const beforeRetreat = hasRetreatedThisTurn;
      window.Game?.Energy?.swapActiveWithBench?.(ownActive, ownBench);
      hasRetreatedThisTurn = beforeRetreat;
      refreshRetreatButtons();
      return true;
    }
    default:
      alert('That Base Set Trainer is not implemented yet.');
      return false;
  }
}

function getHandArr(pIdx) { return pIdx === 0 ? player1Hand : player2Hand; }

function bindHandCardEvents(imgEl) {
  // Click selects (trainers open the trainer UI as before)
  imgEl.addEventListener('click', () => {
    cardSelected = true;
    selectedCard = imgEl;

    const id = getCardIdFromImg(imgEl);
    if (typeof baseTrainers !== 'undefined' && baseTrainers.includes(id)) {
      if (trainerPlayedThisTurn) {
        alert('Base Set rule: only 1 Trainer card may be played each turn.');
        cardSelected = false;
        return;
      }
      if (!canPlayTrainerCard(id, activePlayer)) {
        alert('You cannot legally play this Trainer right now.');
        cardSelected = false;
        return;
      }
      if (activePlayer === 0 && round > 1) openTrainer(UI.trainerMenu[0], UI.handBtn[0]);
      else if (activePlayer === 1 && round > 2) openTrainer(UI.trainerMenu[1], UI.handBtn[1]);
      else cardSelected = false;
    }
  });

  // Drag to place/evolve (only Pokémon are draggable)
  imgEl.draggable = true;
  imgEl.addEventListener('dragstart', (e) => {
    const id = getCardIdFromImg(imgEl);
    if (!isPokemonId(id)) { e.preventDefault(); return; }
    selectedCard = imgEl;
    cardSelected = true;
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
    imgEl.classList.add('dragging');
  });
  imgEl.addEventListener('dragend', () => {
    imgEl.classList.remove('dragging');
  });
}

function renderHandFor(pIdx) {
  const grid = UI.handGrids[pIdx];
  if (!grid) return;
  grid.innerHTML = '';
  const arr = getHandArr(pIdx);
  arr.forEach((id) => {
    const img = document.createElement('img');
    img.className = 'hand-card';
    img.src = cardIdToSrc(id);
    bindHandCardEvents(img);
    grid.appendChild(img);
  });
}

/* Sort by your existing categories (Basic→Stage1→Stage2→Trainers rarity) and id */
function sortHand(pIdx = activePlayer) {
  const arr = getHandArr(pIdx);
  arr.sort((a, b) => {
    const ba = handSortBucket(a), bb = handSortBucket(b);
    return (ba - bb) || (a - b);
  });
  renderHandFor(pIdx);
}

/* Push a card into hand, re-render, and return its index (never -1 now) */
function putCardIntoHand(pIdx, srcOrId) {
  let id = typeof srcOrId === 'number' ? srcOrId : null;
  if (!id && typeof srcOrId === 'string') {
    const m = srcOrId.match(/Base_(\d+)\.jpg$/);
    id = m ? parseInt(m[1], 10) : 0;
  }
  if (!id) return -1;
  const arr = getHandArr(pIdx);
  arr.push(id);
  renderHandFor(pIdx);
  return arr.length - 1;
}

function removeCardFromHandArray(pIdx, cardId) {
  const arr = getHandArr(pIdx);
  const i = arr.indexOf(cardId);
  if (i !== -1) {
    arr.splice(i, 1);
    renderHandFor(pIdx);
  }
}

/** If the current selectedCard came from the hand grid, remove it from that hand array */
function consumeSelectedHandCard() {
  const el = selectedCard;
  if (!el || !el.classList || !el.classList.contains('hand-card')) return;

  // read id directly from src so it still works even if the element later gets .hidden
  const m = (el.src || '').match(/Base_(\d+)\.jpg$/);
  const id = m ? parseInt(m[1], 10) : null;
  if (!id) return;

  // the card being played always belongs to the active player's hand
  removeCardFromHandArray(activePlayer, id);
}

function anyMenuOpen() {
  return (
    !UI.playerHands[0].classList.contains('hidden') ||
    !UI.playerHands[1].classList.contains('hidden') ||
    !UI.energy.menus[0].classList.contains('hidden') ||
    !UI.energy.menus[1].classList.contains('hidden') ||
    !UI.prizeCardMenu.classList.contains('hidden') ||
    !(document.getElementById('discard-menu-1')?.classList.contains('hidden') ?? true) ||
    !(document.getElementById('discard-menu-2')?.classList.contains('hidden') ?? true)
  );
}

function recomputeEndTurnVisibility() {
  // If ANY overlay/menu is open, End Turn should be hidden
  if (anyMenuOpen()) {
    UI.endBtn.classList.add('hidden');
    return;
  }
  // Be extra-robust: read the active player from the DOM if available
  const p = (Game?.Utils?.whoIsActive?.() ?? activePlayer);

  // Need both of THIS player's actives visible
  const top    = UI.activePokemon[p === 0 ? 0 : 1];
  const bottom = UI.activePokemon[p === 0 ? 2 : 3];
  endTurn(top, bottom);
}

function refreshDiscardButtons() {
  const b1 = document.querySelector('.btn--discard1');
  const b2 = document.querySelector('.btn--discard2');
  if (!b1 || !b2) return;

  // Hide both in rounds 1–2
  if (round <= 2) {
    b1.classList.add('hidden');
    b2.classList.add('hidden');
    return;
  }
  // From round 3: show only the active player's discard button
  b1.classList.toggle('hidden', activePlayer !== 0);
  b2.classList.toggle('hidden', activePlayer !== 1);
}

function renderFaceDownPrizes(forKey){
  const n = Math.min(PRIZE_CARDS, prizePools[forKey].length);
  UI.prizeCards.forEach((img, i) => {
    if (i < PRIZE_CARDS) {
      img.classList.toggle('hidden', i >= n);
      img.classList.remove('revealed', 'is-flipping');
      img.src = '/Pokemon/facedown.jpg';
      img.style.cursor = 'pointer';
      img.style.outline = '';
      img.style.outlineOffset = '';
      img.style.transform = 'rotateY(0deg)';
    } else {
      img.classList.add('hidden');
      img.src = '';
    }
  });
}

function revealPrizeThenClaim(forKey, imgEl) {
  if (!playing) return;
  const pool = prizePools[forKey];
  const takeBtn = document.querySelector('.btn--take-prize');

  if (!pool || pool.length === 0 || !takeBtn) {
    // no prizes left: just close and pass
    UI.prizeCardMenu.classList.add('hidden');
    UI.newBtn.classList.remove('hidden');
    updateMenuOpenState();
    switchPlayer();
    recomputeEndTurnVisibility();
    return;
  }

  // Draw a random prize (position is just a UI shell)
  const idx = Math.floor(Math.random() * pool.length);
  const id  = pool.splice(idx, 1)[0];

  // Lock further selection: keep other three on screen FACEDOWN (no hiding)
  UI.prizeCards.forEach(card => {
    if (card !== imgEl) {
      card.classList.add('locked-others'); // keep visible, just disable click
      card.style.cursor = 'not-allowed';
    } else {
      card.style.cursor = 'default';
    }
  });

  // Half flip: to 90°, swap image, then back to 0°
  imgEl.classList.add('is-flipping');
  setTimeout(() => {
    imgEl.src = cardIdToSrc(id);
    imgEl.classList.remove('is-flipping');
    imgEl.classList.add('revealed');
    imgEl.style.transform = 'rotateY(0deg)';
  }, 160);

  // Show Take Prize and wire a one-shot handler
  takeBtn.classList.remove('hidden');
  takeBtn.onclick = () => {
    const claimantIdx = (forKey === 'player1') ? 0 : 1;
    putCardIntoHand(claimantIdx, id);
    prizesRemaining[forKey] -= 1;

    // Win if all 4 prizes are gone
    if (prizesRemaining[forKey] <= 0) {
      // Close overlay BEFORE endGame/switch to keep End Turn logic clean
      UI.prizeCardMenu.classList.add('hidden');
      takeBtn.classList.add('hidden');
      updateMenuOpenState();
      endGame(claimantIdx, `${forKey} took all prizes`);
      return;
    }

    // Reset button/state, close overlay, and pass the turn
    takeBtn.classList.add('hidden');
    takeBtn.onclick = null;

    // Clear the temporary cursor/lock styling ready for next time
    UI.prizeCards.forEach(card => {
      card.classList.remove('locked-others', 'revealed', 'is-flipping');
      card.style.cursor = 'pointer';
      card.style.transform = 'rotateY(0deg)';
    });

    UI.prizeCardMenu.classList.add('hidden');
    UI.newBtn.classList.remove('hidden');
    updateMenuOpenState();

    // Switch player, then recompute End Turn visibility
    switchPlayer();
    recomputeEndTurnVisibility();
  };
}

function takeRandomPrize(forKey){
  const pool = prizePools[forKey];
  if (!pool || pool.length === 0) return;

  const idx = Math.floor(Math.random() * pool.length);
  const id  = pool.splice(idx, 1)[0];
  const claimantIdx = (forKey === 'player1') ? 0 : 1;

  putCardIntoHand(claimantIdx, id);
  prizesRemaining[forKey] -= 1;

  // Win if a player takes all 4 prizes (your custom rule)
  if (prizesRemaining[forKey] <= 0) {
    endGame(claimantIdx, `${forKey} took all prizes`);
    return;
  }

  // Close and pass the turn
  UI.prizeCardMenu.classList.add('hidden');
  UI.newBtn.classList.remove('hidden');
  updateMenuOpenState();
  switchPlayer();
}

function openPrizeChoiceFor(forKey){
  if (!playing) {
    UI.prizeCardMenu.classList.add('hidden');
    updateMenuOpenState();
    return;
  }
  if (!prizePools[forKey] || prizePools[forKey].length === 0) {
    switchPlayer();
    recomputeEndTurnVisibility();
    return;
  }

  // Open overlay, keep other menus hidden
  UI.prizeCardMenu.classList.remove('hidden');
  UI.newBtn.classList.add('hidden');
  if (UI.handBtn && UI.handBtn[0]) UI.handBtn[0].classList.add('hidden');
  if (UI.handBtn && UI.handBtn[1]) UI.handBtn[1].classList.add('hidden');

  // Reset all four to facedown backs
  renderFaceDownPrizes(forKey);
  updateMenuOpenState();

  // Prepare click listeners for a single selection+reveal
  let locked = false;
  const handlers = [];
  UI.prizeCards.slice(0, PRIZE_CARDS).forEach(img => {
    if (img.classList.contains('hidden')) return;
    const h = () => {
      if (locked) return;
      locked = true;
      handlers.forEach(off => off());   // remove all listeners
      revealPrizeThenClaim(forKey, img);
    };
    img.addEventListener('click', h);
    handlers.push(() => img.removeEventListener('click', h));
  });

  // If overlay is closed by any other means later, make sure handlers are gone
  UI.prizeCardMenu._cleanupPrize = () => { handlers.forEach(off => off()); };
}

// expose for attack.js
window.openPrizeChoiceFor = openPrizeChoiceFor;

const init = function () {
  activePlayer = 0;
  round = 1;
  playing = true;
  player1Energy = 1;
  player2Energy = 1;
  cardSelected = false;
  energySelected = false;
  cardChange = false;
  trainerPlayedThisTurn = false;
  prizesRemaining.player1 = MAX_PRIZES;
  prizesRemaining.player2 = MAX_PRIZES;
  const { p1, p2 } = window.randomTypesForTwoPlayers();
  player1Deck = generatePlayerDeckV2(p1);
  player2Deck = generatePlayerDeckV2(p2);
  player1Hand = generatePlayerHand(player1Deck);
  player2Hand = generatePlayerHand(player2Deck);
  resetArrayValues(energyCounts.player1);
  resetArrayValues(energyCounts.player2);
  for (let i = 0; i < 4; i++) attachedEnergy[i] = Array(ENERGY_TYPES).fill(0);
  koCount.player1 = 0;
  koCount.player2 = 0;
  discardPiles.player1 = [];
  discardPiles.player2 = [];
  renderDiscardFor(0);
  renderDiscardFor(1);

  // Reset UI
  UI.energyBtn.textContent = "Energy: 1";
  UI.players[1].classList.remove('player--active');
  UI.players[0].classList.add('player--active');
  batchToggleHidden(UI.activePokemon, false);
  batchToggleHidden(UI.benchPokemon, false);
  batchToggleHidden(UI.prizeCards, true);

  // reset health
  UI.hitpoints.player1[0].textContent = '- / -';
  UI.hitpoints.player1[1].textContent = '- / -';
  UI.hitpoints.player1[2].textContent = 'HP: - / -';
  UI.hitpoints.player1[3].textContent = 'HP: - / -';
  UI.hitpoints.player1[4].textContent = 'HP: - / -';
  UI.hitpoints.player1[5].textContent = 'HP: - / -';
  UI.hitpoints.player2[0].textContent = '- / -';
  UI.hitpoints.player2[1].textContent = '- / -';
  UI.hitpoints.player2[2].textContent = 'HP: - / -';
  UI.hitpoints.player2[3].textContent = 'HP: - / -';
  UI.hitpoints.player2[4].textContent = 'HP: - / -';
  UI.hitpoints.player2[5].textContent = 'HP: - / -';

  // Reset all energies
  for (const p of ['player1', 'player2']) {
    for (let i = 0; i < ENERGY_TYPES; i++) {
      UI.energy.cards[p][i].classList.add('unused-energy');
      UI.energy.count[p][i].textContent = 0;
    }
  }

  // Hide all badge slots/images
  const allBadgeGroups = [...Object.values(UI.energyBadges), ...Object.values(UI.energySlots)];
  allBadgeGroups.forEach(group => {
    group.forEach(badge => {
      badge.classList.add('hidden');
      if (badge.tagName === 'IMG') badge.src = '';
    });
  });
  
  player1Deck.splice(0, HAND_SIZE);
  player2Deck.splice(0, HAND_SIZE);
  // Draw 4 prizes per player from the remaining deck (random)
  const r1 = drawPrizesFromDeck(player1Deck, PRIZE_CARDS);
  const r2 = drawPrizesFromDeck(player2Deck, PRIZE_CARDS);
  prizePools.player1 = r1.prizes;
  prizePools.player2 = r2.prizes;
  player1Deck = r1.deck;
  player2Deck = r2.deck;

  // Counters must reflect *post-prize* deck size
  player1CardsRem = player1Deck.length;
  player2CardsRem = player2Deck.length;
  document.querySelector('.remaining-cards1').textContent = `Cards Remaining In Deck: ${player1CardsRem}`;
  document.querySelector('.remaining-cards2').textContent = `Cards Remaining In Deck: ${player2CardsRem}`;
  renderHandFor(0);
  renderHandFor(1);
  sortHand(0);
  sortHand(1);

  // Hide both energy menus at game start
  UI.energy.menus[0].classList.add('hidden');
  UI.energy.menus[1].classList.add('hidden');
  UI.attackBtn.classList.add('hidden');
  UI.energyBtn.classList.add('hidden');
  UI.energyBtn.classList.add('btn--energy--available');
  UI.endBtn.classList.add('hidden');
  UI.handBtn[0].classList.remove('hidden');
  UI.remainingCards[0].classList.remove('hidden');
  UI.remainingCards[1].classList.add('hidden');
  UI.handBtn[1].classList.add('hidden');
  UI.handBtn[0].textContent = 'Hand';
  UI.handBtn[1].textContent = 'Hand';
  UI.playerHands[0].classList.add('hidden');
  UI.playerHands[1].classList.add('hidden');
  document.getElementById('win-modal')?.classList.add('hidden');
  UI.newBtn.classList.remove('on-overlay');
  document.querySelector('.btn--discard1')?.classList.add('hidden');
  document.querySelector('.btn--discard2')?.classList.add('hidden');
  refreshDiscardButtons();
  document.getElementById('discard-menu-1')?.classList.add('hidden');
  document.getElementById('discard-menu-2')?.classList.add('hidden');
  wireSlotDropZones();
  refreshRetreatButtons();

  [UI.endBtn, UI.attackBtn, UI.energyBtn, UI.handBtn[0], UI.handBtn[1]]
    .forEach(btn => { if (btn) btn.disabled = false; });
  if (UI.boardOverlay) {
    UI.boardOverlay.classList.add('hidden');
    UI.boardOverlay.innerHTML = '';
    UI.boardOverlay.style.pointerEvents = 'none'; // restore default
  }
  document.querySelector('main')?.classList.remove('board-inert');
};

window.koCount = koCount;
window.addToDiscard = addToDiscard;
window.checkNoActiveLoss = checkNoActiveLoss;
window.checkNoPokemonLoss = checkNoPokemonLoss;
window.switchPlayer = switchPlayer;

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !UI.playerHands[0].classList.contains('hidden')) {
    openHand(UI.playerHands[0]);
    UI.handBtn[0].textContent = 'Hand';
    recomputeEndTurnVisibility();
  }
  if (e.key === 'Escape' && !UI.playerHands[1].classList.contains('hidden')) {
    openHand(UI.playerHands[1]);
    UI.handBtn[1].textContent = 'Hand';
    recomputeEndTurnVisibility();
  }
  if (e.key === 'Escape' && !UI.energy.menus[0].classList.contains('hidden')) {
    openEnergy(UI.energy.menus[0], UI.handBtn[0]);
  }
  if (e.key === 'Escape' && !UI.energy.menus[1].classList.contains('hidden')) {
    openEnergy(UI.energy.menus[1], UI.handBtn[1]);
  }
  if (e.key === 'Escape' && UI.boardOverlay && !UI.boardOverlay.classList.contains('hidden')) {
    cancelAttackFlow();
  }
  if (e.key === 'Escape') {
    const d1 = document.getElementById('discard-menu-1');
    const d2 = document.getElementById('discard-menu-2');
    if (d1 && !d1.classList.contains('hidden')) toggleDiscardFor(0);
    if (d2 && !d2.classList.contains('hidden')) toggleDiscardFor(1);
  }
});
UI.newBtn.addEventListener('click', init);
UI.endBtn.addEventListener('click', switchPlayer);

UI.handBtn[0].addEventListener('click', function () {
  openHand(UI.playerHands[0]);
  UI.handBtn[0].textContent = !UI.playerHands[0].classList.contains('hidden') ? 'Close Hand' : 'Hand';
  recomputeEndTurnVisibility();
});

UI.handBtn[1].addEventListener('click', function () {
  openHand(UI.playerHands[1]);
  UI.handBtn[1].textContent = !UI.playerHands[1].classList.contains('hidden') ? 'Close Hand' : 'Hand';
  recomputeEndTurnVisibility();
});

UI.energyBtn.addEventListener('click', function () {
  if (activePlayer === 0) openEnergy(UI.energy.menus[0], UI.handBtn[0]);
  else openEnergy(UI.energy.menus[1], UI.handBtn[1]);
});

// --- Active slots: place cards & update health ---
[
  [0, 0, 'player1', 0],
  [1, 2, 'player1', 1],
  [2, 1, 'player2', 0],
  [3, 3, 'player2', 1],
].forEach(([slotIdx, activeIdx, hpGroup, hpIdx]) => {
  UI.activeSlots[slotIdx].addEventListener('click', function () {
    const placed = cardPlacement(UI.activePokemon[activeIdx]);
    if (placed) {                              // ⬅️ only if placed
      changeHealth(UI.hitpoints[hpGroup][hpIdx], true, UI.activePokemon[activeIdx]);
      clearEnergyForActiveIndex(activeIdx);
      refreshRetreatButtons();
      recomputeEndTurnVisibility();
    }
  });
});

// --- Bench slots: place cards & update health ---
for (let i = 0; i < 4; i++) {
  UI.benchSlots.player1[i].addEventListener('click', function () {
    cardChange = cardPlacement(UI.benchPokemon[i]);
    changeHealth(UI.hitpoints.player1[i + 2], false, UI.benchPokemon[i]);
    refreshRetreatButtons();
  });
  UI.benchSlots.player2[i].addEventListener('click', function () {
    cardChange = cardPlacement(UI.benchPokemon[i + 4]);
    changeHealth(UI.hitpoints.player2[i + 2], false, UI.benchPokemon[i + 4]);
    refreshRetreatButtons();
  });
}

// --- Active Pokémon: evolution & attach energy ---
[
  [0, 'player1', 0],
  [2, 'player1', 1],
  [1, 'player2', 0],
  [3, 'player2', 1],
].forEach(([pokeIdx, hpGroup, hpIdx]) => {
  UI.activePokemon[pokeIdx].addEventListener('click', function () {
    cardEvolution(UI.activePokemon[pokeIdx], UI.hitpoints[hpGroup][hpIdx], true);
    attachEnergy(UI.activePokemon[pokeIdx]);
  });
});

// --- Bench Pokémon: evolution only ---
for (let i = 0; i < 4; i++) {
  // player1 bench
  UI.benchPokemon[i].addEventListener('click', function () {
    // If an active is empty, promote this benched Pokémon there
    const pIdx = 0;
    if (hasEmptyActive(pIdx) && !UI.benchPokemon[i].classList.contains('hidden')) {
      const targetActive = firstEmptyActiveIdx(pIdx);
      if (targetActive != null) {
        const to = UI.activePokemon[targetActive];
        to.src = UI.benchPokemon[i].src;
        to.classList.remove('hidden');
        changeHealth(getHpElForActiveIndex(targetActive), true, to);
        UI.benchPokemon[i].classList.add('hidden');
        UI.benchPokemon[i].src = '';
        recomputeEndTurnVisibility();
        return; // promotion done; no evolution
      }
    }
    // otherwise, allow evolution
    cardEvolution(UI.benchPokemon[i], UI.hitpoints.player1[i + 2], false);
  });

  // player2 bench
  UI.benchPokemon[i + 4].addEventListener('click', function () {
    const pIdx = 1;
    if (hasEmptyActive(pIdx) && !UI.benchPokemon[i + 4].classList.contains('hidden')) {
      const targetActive = firstEmptyActiveIdx(pIdx);
      if (targetActive != null) {
        const to = UI.activePokemon[targetActive];
        to.src = UI.benchPokemon[i + 4].src;
        to.classList.remove('hidden');
        changeHealth(getHpElForActiveIndex(targetActive), true, to);
        UI.benchPokemon[i + 4].classList.add('hidden');
        UI.benchPokemon[i + 4].src = '';
        recomputeEndTurnVisibility();
        return;
      }
    }
    cardEvolution(UI.benchPokemon[i + 4], UI.hitpoints.player2[i + 2], false);
  });
}

// --- Trainer menu buttons ---
[0, 1].forEach(p => {
  UI.trainerBtn.confirm[p].addEventListener('click', function () {
    // Read ID from the VISIBLE big trainer card (hand thumbnail is hidden by cardPlacement)
    let id = getCardIdFromImg(UI.trainerCard[p]);
    if (!id && selectedCard) {
      // fallback: parse from the old hand element's src if present
      const m = (selectedCard.src || '').match(/Base_(\d+)\.jpg$/);
      id = m ? parseInt(m[1], 10) : null;
    }

    if (id && resolveTrainerCard(id, activePlayer)) {
      addToDiscard(activePlayer, id);   // push into the active player's discard + re-render grid
      trainerPlayedThisTurn = true;
    } else if (id) {
      alert('Trainer card was not played (requirements were not met).');
    }

    // Clear the big trainer card and close the menu
    UI.trainerCard[p].classList.add('hidden');
    UI.trainerCard[p].src = '';

    closeTrainer(UI.trainerMenu[p], UI.handBtn[p], UI.trainerBtn.confirm[p]);

    // The hand removal already happened in cardPlacement(); just clear selection state
    selectedCard = null;
    cardSelected = false;
  });
});

// --- Trainer slot click: handle active player logic ---
document.querySelectorAll('.trainer-slot').forEach((item, idx) => {
  item.addEventListener('click', event => {
    const p = activePlayer;
    cardPlacement(UI.trainerCard[p]);
    if (!UI.trainerCard[p].classList.contains('hidden')) {
      UI.trainerBtn.confirm[p].classList.remove('hidden');
    }
  });
});

UI.attackBtn.addEventListener('click', beginAttackSelection);

UI.activePokemon.forEach((img) => {
  img.addEventListener('dragover', allowDropIfPokemon);
  img.addEventListener('drop', (e) => {
    e.preventDefault();
    handleDropOnPokemonImg(img, /*isActive=*/true);
  });
});

UI.benchPokemon.forEach((img) => {
  img.addEventListener('dragover', allowDropIfPokemon);
  img.addEventListener('drop', (e) => {
    e.preventDefault();
    handleDropOnPokemonImg(img, /*isActive=*/false);
  });
});

['retreat-btn-1-1','retreat-btn-2-1','retreat-btn-1-2','retreat-btn-2-2'].forEach((id, i) => {
  const btn = document.getElementById(id);
  if (!btn) return;
  const activeIdx = [0,2,1,3][i]; // map in same order as ids above
  btn.addEventListener('click', () => {
    if (!canRetreatFrom(activeIdx)) return;
    payRetreatCost(activeIdx);
    beginRetreatSelection(activeIdx);
    refreshRetreatButtons();
  });
});

const discardBtns = [
  document.querySelector('.btn--discard1'),
  document.querySelector('.btn--discard2'),
];

if (discardBtns[0]) discardBtns[0].addEventListener('click', () => toggleDiscardFor(0));
if (discardBtns[1]) discardBtns[1].addEventListener('click', () => toggleDiscardFor(1));
