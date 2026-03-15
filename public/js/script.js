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
  else {
    Game?.Energy?.clearSelectedEnergy?.();
    recomputeEndTurnVisibility();
  }

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
function getPendingTrainerId(p) {
  let id = getCardIdFromImg(UI.trainerCard[p]);
  if (!id && selectedCard) {
    const m = (selectedCard.src || '').match(/Base_(\d+)\.jpg$/);
    id = m ? parseInt(m[1], 10) : null;
  }
  return id;
}

function clearTrainerSelection(p) {
  UI.trainerCard[p].classList.add('hidden');
  UI.trainerCard[p].src = '';
  selectedCard = null;
  cardSelected = false;
}

function returnTrainerCardToHand(p) {
  // Only return a card that was actually moved into the trainer slot.
  // If the player hit Cancel before placing, the hand still owns that card.
  if (UI.trainerCard[p].classList.contains('hidden')) return;

  const id = getCardIdFromImg(UI.trainerCard[p]);
  if (id) {
    putCardIntoHand(p, id);
    sortHand(p);
  }
}
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
function getAvailableActives(pIdx, requireDamaged = false, requireEnergy = false) {
  return ownerActives(pIdx).filter((aIdx) => {
    const img = UI.activePokemon[aIdx];
    if (!img || img.classList.contains('hidden')) return false;
    if (requireEnergy && attachedEnergy[aIdx].reduce((a, b) => a + b, 0) <= 0) return false;
    if (!requireDamaged) return true;
    const hp = parseHpText(getHpElForActiveIndex(aIdx)?.textContent || '');
    return !!hp && hp.cur < hp.max;
  });
}

function hasAnyDamagedPokemon(pIdx) {
  const activeDamaged = ownerActives(pIdx).some((aIdx) => {
    if (UI.activePokemon[aIdx].classList.contains('hidden')) return false;
    const hp = parseHpText(getHpElForActiveIndex(aIdx)?.textContent || '');
    return !!hp && hp.cur < hp.max;
  });
  if (activeDamaged) return true;
  return ownerBenchRange(pIdx).some((bIdx) => {
    if (UI.benchPokemon[bIdx].classList.contains('hidden')) return false;
    const hpEl = UI.hitpoints[playerKeyOf(pIdx)][(bIdx % 4) + 2];
    const hp = parseHpText(hpEl?.textContent || '');
    return !!hp && hp.cur < hp.max;
  });
}

function chooseActiveIndex(pIdx, opts = {}) {
  const list = getAvailableActives(pIdx, !!opts.requireDamaged, !!opts.requireEnergy);
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

function getOwnedPokemonIndices(pIdx) {
  return [...ownerActives(pIdx), ...ownerBenchRange(pIdx)].filter((idx) => {
    if (idx <= 3) return !UI.activePokemon[idx].classList.contains('hidden');
    return !UI.benchPokemon[idx].classList.contains('hidden');
  });
}

function getPokemonImageByIndex(idx) {
  return idx <= 3 ? UI.activePokemon[idx] : UI.benchPokemon[idx];
}

function getHpElForBoardIndex(pIdx, idx) {
  if (idx <= 3) return getHpElForActiveIndex(idx);
  return UI.hitpoints[playerKeyOf(pIdx)][(idx % 4) + 2];
}

function chooseOwnedPokemonIndex(pIdx, opts = {}) {
  const list = getOwnedPokemonIndices(pIdx).filter((idx) => {
    const id = getCardIdFromImg(getPokemonImageByIndex(idx));
    if (!id) return false;
    if (opts.requireEvolved && !getEvolvesFromId(baseSet[id - 1])) return false;
    if (opts.requireBasic && !baseBasic.includes(id)) return false;
    return true;
  });
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const labels = list.map((idx) => {
    const id = getCardIdFromImg(getPokemonImageByIndex(idx));
    return `${idx}: ${formatCardName(id)} (#${id})`;
  }).join('\n');
  const pick = Number.parseInt(prompt(`${opts.message || 'Choose one of your Pokémon:'}\n${labels}`), 10);
  return list.includes(pick) ? pick : null;
}

function clearPokemonAtBoardIndex(pIdx, idx) {
  const img = getPokemonImageByIndex(idx);
  if (!img) return;
  img.classList.add('hidden');
  img.src = '';
  delete img.dataset.playRound;
  delete img.dataset.lastEvolved;
  const hpEl = getHpElForBoardIndex(pIdx, idx);
  if (hpEl) hpEl.textContent = idx <= 3 ? '- / -' : 'HP: - / -';
  if (idx <= 3) {
    window.Game?.Energy?.clearEnergyForActiveIndex?.(idx);
    window.Game?.Attack?.clearStatus?.(idx);
  } else {
    window.Game?.Energy?.clearEnergyForBenchIndex?.(idx);
  }
}

function discardOneEnergyFromActive(activeIdx, count = 1, reason = 'Choose Energy type to discard') {
  return window.Game?.Energy?.discardEnergyFromActive?.(activeIdx, count, { reason, redraw: true }) || 0;
}

function formatCardName(cardId) {
  return baseSet[cardId - 1]?.name || `#${cardId}`;
}

function chooseCardIdFromList(cardIds, promptTitle) {
  const unique = [...new Set(cardIds)];
  if (!unique.length) return null;
  if (unique.length === 1) return unique[0];
  const labels = unique
    .map(id => `${id}: ${formatCardName(id)}`)
    .join('\n');
  const picked = Number.parseInt(prompt(`${promptTitle}\n${labels}`), 10);
  return unique.includes(picked) ? picked : null;
}

function chooseTwoCardIndicesFromHand(pIdx, promptTitle) {
  const hand = getHandArr(pIdx);
  if (hand.length < 2) return null;
  const labels = hand.map((id, idx) => `${idx + 1}. ${formatCardName(id)} (#${id})`).join('\n');
  const raw = prompt(`${promptTitle}
${labels}

Enter 2 hand positions separated by comma (example: 1,3):`);
  if (raw == null || raw.trim() === '') return null;
  const picks = raw.split(',').map(v => Number.parseInt(v.trim(), 10));
  const valid = picks.length === 2 &&
    picks.every(n => Number.isInteger(n) && n >= 1 && n <= hand.length) &&
    picks[0] !== picks[1];
  if (!valid) return null;
  return picks.map(n => n - 1).sort((a, b) => b - a);
}

function chooseHandCardIndex(pIdx, promptTitle) {
  const hand = getHandArr(pIdx);
  if (!hand.length) return null;
  if (hand.length === 1) return 0;
  const labels = hand.map((id, idx) => `${idx + 1}. ${formatCardName(id)} (#${id})`).join('\n');
  const raw = prompt(`${promptTitle}
${labels}`);
  const pick = Number.parseInt(raw, 10);
  if (!Number.isInteger(pick) || pick < 1 || pick > hand.length) return null;
  return pick - 1;
}

function chooseDeckOrder(topCards, promptTitle) {
  if (topCards.length <= 1) return topCards;
  const labels = topCards
    .map((id, idx) => `${idx + 1}. ${formatCardName(id)} (#${id})`)
    .join('\n');
  const raw = prompt(`${promptTitle}\n${labels}\n\nEnter new top-to-bottom order using positions (example: 3,1,2,4,5):`);
  if (raw == null || raw.trim() === '') return topCards;

  const picks = raw.split(',').map(s => Number.parseInt(s.trim(), 10));
  const isValid = picks.length === topCards.length &&
    picks.every(n => Number.isInteger(n) && n >= 1 && n <= topCards.length) &&
    (new Set(picks)).size === topCards.length;
  if (!isValid) {
    alert('Invalid order entered. Keeping original top-deck order.');
    return topCards;
  }
  return picks.map(pos => topCards[pos - 1]);
}

function canPlayTrainerCard(cardId, pIdx) {
  const opp = 1 - pIdx;
  switch (cardId) {
    case 70:
      return ownerBenchRange(pIdx).some(i => UI.benchPokemon[i].classList.contains('hidden'));
    case 71:
      return getHandArr(pIdx).length >= 3 && (pIdx === 0 ? player1Deck.length : player2Deck.length) > 0;
    case 72:
      return getOwnedPokemonIndices(pIdx).some((idx) => {
        const id = getCardIdFromImg(getPokemonImageByIndex(idx));
        return !!getEvolvesFromId(baseSet[id - 1]);
      });
    case 73:
      return getHandArr(opp).length > 0;
    case 74:
      return getHandArr(pIdx).length >= 3 && discardPiles[playerKeyOf(pIdx)].some(id => id >= 70 && id <= 95);
    case 75:
      return getHandArr(pIdx).some(id => id >= 70 && id <= 95) || getHandArr(opp).some(id => id >= 70 && id <= 95);
    case 76: {
      const hand = getHandArr(pIdx);
      const hasStage2 = hand.some((id) => {
        const card = baseSet[id - 1];
        const from1 = getEvolvesFromId(card);
        return !!(from1 && getEvolvesFromId(baseSet[from1 - 1]));
      });
      if (!hasStage2) return false;
      return getOwnedPokemonIndices(pIdx).some((idx) => {
        const id = getCardIdFromImg(getPokemonImageByIndex(idx));
        return baseBasic.includes(id);
      });
    }
    case 77:
      return getHandArr(pIdx).some(id => id >= 1 && id <= 69) && (pIdx === 0 ? player1Deck : player2Deck).some(id => id >= 1 && id <= 69);
    case 78:
      return getOwnedPokemonIndices(pIdx).length > 0;
    case 79:
      return getAvailableActives(pIdx).some(i => attachedEnergy[i].reduce((a, b) => a + b, 0) > 0) &&
        getAvailableActives(opp).some(i => attachedEnergy[i].reduce((a, b) => a + b, 0) > 0);
    case 80:
      return getAvailableActives(pIdx).length > 0;
    case 81:
      return hasAnyDamagedPokemon(pIdx);
    case 82:
      return getAvailableActives(pIdx).some(i => window.Game?.Attack?.hasStatusCondition?.(i));
    case 83:
      return getHandArr(pIdx).length >= 3 && (pIdx === 0 ? player1Deck.length : player2Deck.length) > 0;
    case 84:
      return getAvailableActives(pIdx).length > 0;
    case 85:
      return getHandArr(pIdx).length > 0 && discardPiles[playerKeyOf(pIdx)].some(id => id >= 96 && id <= 101);
    case 86:
      return ownerBenchRange(opp).some(i => UI.benchPokemon[i].classList.contains('hidden')) &&
        discardPiles[playerKeyOf(opp)].some(id => baseBasic.includes(id));
    case 87:
      return (pIdx === 0 ? player1Deck.length : player2Deck.length) > 0;
    case 88: case 91:
      return true;
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
    case 70: {
      const benchIdx = ownerBenchRange(pIdx).find(i => UI.benchPokemon[i].classList.contains('hidden'));
      if (benchIdx == null) return false;
      UI.benchPokemon[benchIdx].src = cardIdToSrc(70);
      UI.benchPokemon[benchIdx].classList.remove('hidden');
      UI.benchPokemon[benchIdx].dataset.playRound = String(round);
      UI.hitpoints[playerKeyOf(pIdx)][(benchIdx % 4) + 2].textContent = 'HP: 10 / 10';
      return true;
    }
    case 71: {
      const handIndexes = chooseTwoCardIndicesFromHand(pIdx, 'Computer Search: Choose 2 cards from your hand to discard');
      if (!handIndexes) return false;
      const hand = getHandArr(pIdx);
      const [a, b] = handIndexes;
      const first = hand.splice(a, 1)[0];
      const second = hand.splice(b, 1)[0];
      if (first == null || second == null) return false;
      addToDiscard(pIdx, first);
      addToDiscard(pIdx, second);
      renderHandFor(pIdx);
      const deck = pIdx === 0 ? player1Deck : player2Deck;
      const chosen = chooseCardIdFromList(deck, 'Computer Search: Choose any card from your deck');
      if (chosen == null) return false;
      const pos = deck.indexOf(chosen);
      if (pos === -1) return false;
      deck.splice(pos, 1);
      hand.push(chosen);
      renderHandFor(pIdx);
      return true;
    }
    case 72: {
      const idx = chooseOwnedPokemonIndex(pIdx, { message: 'Choose one of your evolved Pokémon to devolve:', requireEvolved: true });
      if (idx == null) return false;
      const img = getPokemonImageByIndex(idx);
      const id = getCardIdFromImg(img);
      const devolveTo = getEvolvesFromId(baseSet[id - 1]);
      if (!devolveTo) return false;
      img.src = cardIdToSrc(devolveTo);
      getHandArr(pIdx).push(id);
      renderHandFor(pIdx);
      const hpEl = getHpElForBoardIndex(pIdx, idx);
      const hp = parseHpText(hpEl?.textContent || '');
      if (hp && hp.max > 0) {
        const damage = Math.max(0, hp.max - hp.cur);
        const newMax = baseSet[devolveTo - 1]?.HP | 0;
        const newCur = Math.max(0, newMax - damage);
        hpEl.textContent = idx <= 3 ? `${newCur} / ${newMax}` : `HP: ${newCur} / ${newMax}`;
        if (newCur <= 0) {
          addToDiscard(pIdx, devolveTo);
          clearPokemonAtBoardIndex(pIdx, idx);
          if (idx <= 3) {
            if (checkNoActiveLoss(pIdx)) return true;
            checkNoPokemonLoss(pIdx);
          }
        }
      }
      return true;
    }
    case 73: {
      const oppHand = getHandArr(opp);
      const deck = opp === 0 ? player1Deck : player2Deck;
      while (oppHand.length) deck.push(oppHand.pop());
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      renderHandFor(opp);
      for (let i = 0; i < 7 && deck.length; i++) getHandArr(opp).push(deck.shift());
      renderHandFor(opp);
      return true;
    }
    case 74: {
      const handIndexes = chooseTwoCardIndicesFromHand(pIdx, 'Item Finder: Choose 2 cards from your hand to discard');
      if (!handIndexes) return false;
      const hand = getHandArr(pIdx);
      const [a, b] = handIndexes;
      const first = hand.splice(a, 1)[0];
      const second = hand.splice(b, 1)[0];
      if (first == null || second == null) return false;
      addToDiscard(pIdx, first);
      addToDiscard(pIdx, second);
      renderHandFor(pIdx);
      const discard = discardPiles[playerKeyOf(pIdx)];
      const trainers = discard.filter(id => id >= 70 && id <= 95);
      const chosen = chooseCardIdFromList(trainers, 'Item Finder: Choose a Trainer from your discard to put into your hand');
      if (chosen == null) return false;
      const pos = discard.indexOf(chosen);
      if (pos === -1) return false;
      discard.splice(pos, 1);
      hand.push(chosen);
      renderDiscardFor(pIdx);
      renderHandFor(pIdx);
      return true;
    }
    case 75: {
      [pIdx, opp].forEach((owner) => {
        const hand = getHandArr(owner);
        const deck = owner === 0 ? player1Deck : player2Deck;
        for (let i = hand.length - 1; i >= 0; i--) {
          if (hand[i] >= 70 && hand[i] <= 95) deck.push(hand.splice(i, 1)[0]);
        }
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        renderHandFor(owner);
      });
      return true;
    }
    case 76: {
      const hand = getHandArr(pIdx);
      const stage2s = hand.filter((id) => {
        const stage1 = getEvolvesFromId(baseSet[id - 1]);
        return !!(stage1 && getEvolvesFromId(baseSet[stage1 - 1]));
      });
      const stage2Id = chooseCardIdFromList(stage2s, 'Pokémon Breeder: Choose a Stage 2 Pokémon from your hand');
      if (stage2Id == null) return false;
      const stage1Id = getEvolvesFromId(baseSet[stage2Id - 1]);
      const basicId = getEvolvesFromId(baseSet[stage1Id - 1]);
      const idx = chooseOwnedPokemonIndex(pIdx, { message: 'Pokémon Breeder: Choose matching Basic Pokémon in play', requireBasic: true });
      if (idx == null) return false;
      const img = getPokemonImageByIndex(idx);
      const curId = getCardIdFromImg(img);
      if (curId !== basicId) return false;
      const hpEl = getHpElForBoardIndex(pIdx, idx);
      const hp = parseHpText(hpEl?.textContent || '');
      img.src = cardIdToSrc(stage2Id);
      img.dataset.lastEvolved = String(round);
      const handPos = hand.indexOf(stage2Id);
      if (handPos === -1) return false;
      hand.splice(handPos, 1);
      renderHandFor(pIdx);
      if (hp) {
        const damage = Math.max(0, hp.max - hp.cur);
        const newMax = baseSet[stage2Id - 1]?.HP | 0;
        const newCur = Math.max(0, newMax - damage);
        hpEl.textContent = idx <= 3 ? `${newCur} / ${newMax}` : `HP: ${newCur} / ${newMax}`;
      }
      return true;
    }
    case 77: {
      const hand = getHandArr(pIdx);
      const pokemonInHand = hand.filter(id => id >= 1 && id <= 69);
      const giveId = chooseCardIdFromList(pokemonInHand, 'Pokémon Trader: Choose a Pokémon from your hand to shuffle into deck');
      if (giveId == null) return false;
      const deck = pIdx === 0 ? player1Deck : player2Deck;
      const pokemonInDeck = deck.filter(id => id >= 1 && id <= 69);
      const takeId = chooseCardIdFromList(pokemonInDeck, 'Pokémon Trader: Choose a Pokémon from your deck to put into your hand');
      if (takeId == null) return false;
      const handPos = hand.indexOf(giveId);
      const deckPos = deck.indexOf(takeId);
      if (handPos === -1 || deckPos === -1) return false;
      hand.splice(handPos, 1);
      deck.splice(deckPos, 1);
      deck.push(giveId);
      hand.push(takeId);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      renderHandFor(pIdx);
      return true;
    }
    case 78: {
      const idx = chooseOwnedPokemonIndex(pIdx, { message: 'Scoop Up: Choose one of your Pokémon to return to hand' });
      if (idx == null) return false;
      const img = getPokemonImageByIndex(idx);
      const id = getCardIdFromImg(img);
      if (!id) return false;
      getHandArr(pIdx).push(id);
      renderHandFor(pIdx);
      clearPokemonAtBoardIndex(pIdx, idx);
      if (idx <= 3) {
        if (checkNoActiveLoss(pIdx)) return true;
        checkNoPokemonLoss(pIdx);
      }
      return true;
    }
    case 79: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose your Active to discard 1 Energy from:', requireEnergy: true });
      const foe = chooseActiveIndex(opp, { message: 'Choose opponent Active to remove up to 2 Energy from:', requireEnergy: true });
      if (own == null || foe == null) return false;
      if (discardOneEnergyFromActive(own, 1, 'Choose 1 Energy to discard from your Active Pokémon') < 1) return false;
      discardOneEnergyFromActive(foe, 2, "Choose up to 2 Energy to discard from opponent's Active Pokémon");
      return true;
    }
    case 80: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose your Active for Defender:' });
      if (own == null) return false;
      window.Game?.Attack?.applyDefenderShield?.(own);
      return true;
    }
    case 81: {
      let healedAny = false;
      ownerActives(pIdx).forEach((aIdx) => {
        if (UI.activePokemon[aIdx].classList.contains('hidden')) return;
        const hpEl = getHpElForActiveIndex(aIdx);
        const hp = parseHpText(hpEl?.textContent || '');
        if (!hp) return;
        if (hp.cur < hp.max) {
          healedAny = true;
          hpEl.textContent = `${Math.min(hp.max, hp.cur + 20)} / ${hp.max}`;
        }
        const total = attachedEnergy[aIdx].reduce((a, b) => a + b, 0);
        if (total > 0) window.Game?.Energy?.discardEnergyFromActive?.(aIdx, total, { reason: 'Pokémon Center: choose Energy to discard', redraw: true });
      });
      ownerBenchRange(pIdx).forEach((bIdx) => {
        if (UI.benchPokemon[bIdx].classList.contains('hidden')) return;
        const hpEl = UI.hitpoints[playerKeyOf(pIdx)][(bIdx % 4) + 2];
        const hp = parseHpText(hpEl?.textContent || '');
        if (!hp) return;
        if (hp.cur < hp.max) {
          healedAny = true;
          hpEl.textContent = `HP: ${Math.min(hp.max, hp.cur + 20)} / ${hp.max}`;
        }
        window.Game?.Energy?.clearEnergyForBenchIndex?.(bIdx);
      });
      return healedAny;
    }
    case 82: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose your Active for Full Heal:' });
      if (own == null || !window.Game?.Attack?.hasStatusCondition?.(own)) return false;
      window.Game?.Attack?.clearStatus?.(own);
      return true;
    }
    case 83: {
      const handIndexes = chooseTwoCardIndicesFromHand(pIdx, 'Maintenance: Choose 2 cards from your hand to shuffle into your deck');
      if (!handIndexes) return false;
      const hand = getHandArr(pIdx);
      const deck = pIdx === 0 ? player1Deck : player2Deck;
      const [a, b] = handIndexes;
      const cardA = hand[a];
      const cardB = hand[b];
      if (!cardA || !cardB) return false;
      hand.splice(a, 1);
      hand.splice(b, 1);
      renderHandFor(pIdx);
      deck.push(cardA, cardB);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      drawCard();
      return true;
    }
    case 84: {
      const own = chooseActiveIndex(pIdx, { message: 'Choose your Active for PlusPower:' });
      if (own == null) return false;
      window.Game?.Attack?.addPlusPowerForActive?.(own, 1);
      return true;
    }
    case 85: {
      const hand = getHandArr(pIdx);
      const discardFromHand = chooseHandCardIndex(pIdx, 'Energy Retrieval: Choose 1 card from your hand to discard');
      if (discardFromHand == null) return false;
      const thrown = hand.splice(discardFromHand, 1)[0];
      addToDiscard(pIdx, thrown);
      renderHandFor(pIdx);

      const discard = discardPiles[playerKeyOf(pIdx)];
      const energyInDiscard = discard.filter(id => id >= 96 && id <= 101);
      if (!energyInDiscard.length) return true;

      const first = chooseCardIdFromList(energyInDiscard, 'Energy Retrieval: Choose first basic Energy from discard:');
      if (first == null) return true;
      const firstPos = discard.indexOf(first);
      if (firstPos !== -1) {
        discard.splice(firstPos, 1);
        hand.push(first);
      }

      const remaining = discard.filter(id => id >= 96 && id <= 101);
      if (remaining.length) {
        const second = chooseCardIdFromList(remaining, 'Energy Retrieval: Choose second basic Energy from discard (optional):');
        if (second != null) {
          const secondPos = discard.indexOf(second);
          if (secondPos !== -1) {
            discard.splice(secondPos, 1);
            hand.push(second);
          }
        }
      }

      renderDiscardFor(pIdx);
      renderHandFor(pIdx);
      return true;
    }
    case 86: {
      const oppDiscard = discardPiles[playerKeyOf(opp)];
      const candidates = oppDiscard.filter(id => baseBasic.includes(id));
      const chosen = chooseCardIdFromList(candidates, 'Choose a Basic Pokémon from opponent discard for Pokémon Flute:');
      if (!baseBasic.includes(chosen)) return false;

      const benchIdx = ownerBenchRange(opp).find(i => UI.benchPokemon[i].classList.contains('hidden'));
      const pos = oppDiscard.indexOf(chosen);
      if (benchIdx == null || pos === -1) return false;

      oppDiscard.splice(pos, 1);
      renderDiscardFor(opp);
      UI.benchPokemon[benchIdx].src = cardIdToSrc(chosen);
      UI.benchPokemon[benchIdx].classList.remove('hidden');
      const max = baseSet[chosen - 1]?.HP | 0;
      UI.hitpoints[playerKeyOf(opp)][(benchIdx % 4) + 2].textContent = `HP: ${max} / ${max}`;
      return true;
    }
    case 87: {
      const deck = pIdx === 0 ? player1Deck : player2Deck;
      if (!deck.length) return false;
      const count = Math.min(5, deck.length);
      const topCards = deck.slice(0, count);
      const reordered = chooseDeckOrder(topCards, 'Pokédex: Reorder the top cards of your deck');
      deck.splice(0, count, ...reordered);
      return true;
    }
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
      const chosen = chooseCardIdFromList(candidates, 'Choose Basic Pokémon to Revive:');
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
      const own = chooseActiveIndex(pIdx, { message: 'Choose damaged Active for Super Potion:', requireDamaged: true, requireEnergy: true });
      if (own == null || discardOneEnergyFromActive(own, 1, 'Choose 1 Energy to discard for Super Potion') < 1) return false;
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
      const foe = chooseActiveIndex(opp, { message: 'Choose opponent Active to remove 1 Energy from:', requireEnergy: true });
      return foe != null && discardOneEnergyFromActive(foe, 1, "Choose 1 Energy to discard from opponent's Active Pokémon") > 0;
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
    if (cardChange) {
      changeHealth(UI.hitpoints.player1[i + 2], false, UI.benchPokemon[i]);
      Game?.Energy?.clearEnergyForBenchIndex?.(i);
    }
    refreshRetreatButtons();
  });
  UI.benchSlots.player2[i].addEventListener('click', function () {
    cardChange = cardPlacement(UI.benchPokemon[i + 4]);
    if (cardChange) {
      changeHealth(UI.hitpoints.player2[i + 2], false, UI.benchPokemon[i + 4]);
      Game?.Energy?.clearEnergyForBenchIndex?.(i + 4);
    }
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
        Game?.Energy?.moveBenchEnergyToActive?.(targetActive, i);
        UI.benchPokemon[i].classList.add('hidden');
        UI.benchPokemon[i].src = '';
        recomputeEndTurnVisibility();
        return; // promotion done; no evolution
      }
    }
    // otherwise, allow evolution
    cardEvolution(UI.benchPokemon[i], UI.hitpoints.player1[i + 2], false);
    attachEnergy(UI.benchPokemon[i]);
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
        Game?.Energy?.moveBenchEnergyToActive?.(targetActive, i + 4);
        UI.benchPokemon[i + 4].classList.add('hidden');
        UI.benchPokemon[i + 4].src = '';
        recomputeEndTurnVisibility();
        return;
      }
    }
    cardEvolution(UI.benchPokemon[i + 4], UI.hitpoints.player2[i + 2], false);
    attachEnergy(UI.benchPokemon[i + 4]);
  });
}

// --- Trainer menu buttons ---
[0, 1].forEach(p => {
  UI.trainerBtn.confirm[p].addEventListener('click', function () {
    // Read ID from the VISIBLE big trainer card (hand thumbnail is hidden by cardPlacement)
    const id = getPendingTrainerId(p);

    if (id && resolveTrainerCard(id, activePlayer)) {
      addToDiscard(activePlayer, id);   // push into the active player's discard + re-render grid
      trainerPlayedThisTurn = true;
    } else if (id) {
      alert('Trainer card was not played (requirements were not met).');
      returnTrainerCardToHand(p);
    }

    // Clear the big trainer card and close the menu
    clearTrainerSelection(p);

    closeTrainer(UI.trainerMenu[p], UI.handBtn[p], UI.trainerBtn.confirm[p]);
  });

    // The hand removal already happened in cardPlacement(); just clear selection state
     UI.trainerBtn.cancel[p].addEventListener('click', function () {
    returnTrainerCardToHand(p);
    clearTrainerSelection(p);
    closeTrainer(UI.trainerMenu[p], UI.handBtn[p], UI.trainerBtn.confirm[p]);
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
