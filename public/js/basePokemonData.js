'use strict';

/**
 * basePokemon.js
 * Normalized Base Set data for your TCG project.
 *
 * - Attacks are objects:
 *   { kind: 'power', name: 'Damage Swap' }
 *   { kind: 'move',  name: 'Jab', cost: 1, types: ['fighting'], damage: 20 }
 * - Stage is string: 'base' | 'stage1' | 'stage2'
 * - evolvesFrom: number | null
 * - retreatCost: number (renamed from 'retreat cost')
 * - name injected from namesByNumber
 * - window.cardsById is built for fast lookup
 *
 * NOTE: This file preserves your original arrays (baseBasic, etc.)
 *       and original baseSet entries, then normalizes them once at load.
 */

// === Original slot/group metadata ===
window.baseBasic = [
  3, 5, 7, 10, 16, 20, 26, 27, 28, 31, 35, 36, 39, 41, 43, 44, 45, 46, 47, 48,
  49, 50, 51, 52, 53, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65, 66, 67, 68, 69,
];
window.baseStage1 = [
  6, 9, 12, 14, 18, 19, 21, 22, 23, 24, 25, 29, 30, 32, 33, 34, 37, 38, 40, 42,
  54, 64,
];
window.baseStage2 = [1, 2, 4, 8, 11, 13, 15, 17];
window.baseEvo = [
  1, 2, 4, 8, 11, 13, 15, 17, 6, 9, 12, 14, 18, 19, 21, 22, 23, 24, 25, 29, 30,
  32, 33, 34, 37, 38, 40, 42, 54, 64,
];
window.baseTrainers = [
  70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 90, 91, 92, 93, 94, 95,
];

// === Original raw card entries (unchanged) ===
window.baseSet = [
  {
    number: 1,
    type: 'psychic',
    HP: 80,
    stage: ['stage 2', 32],
    attacks: [['pokemonPower'], [3, ['psychic', 'psychic', 'psychic'], 30]],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 2,
    type: 'water',
    HP: 100,
    stage: ['stage 2', 42],
    attacks: [['pokemonPower'], [3, ['water', 'water', 'water'], 40]],
    weakness: 'lightning',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 3,
    type: 'normal',
    HP: 120,
    stage: ['base'],
    attacks: [
      [2, ['normal', 'normal'], 0],
      [4, ['normal', 'normal', 'normal', 'normal'], 80],
    ],
    weakness: 'fighting',
    resistance: 'psychic',
    'retreat cost': 1,
  },
  {
    number: 4,
    type: 'fire',
    HP: 120,
    stage: ['stage 2', 24],
    attacks: [['pokemonPower'], [4, ['fire', 'fire', 'fire', 'fire'], 100]],
    weakness: 'water',
    resistance: 'fighting',
    'retreat cost': 3,
  },
  {
    number: 5,
    type: 'normal',
    HP: 40,
    stage: ['base'],
    attacks: [
      [1, ['normal'], 0],
      [3, ['normal', 'normal', 'normal'], 0],
    ],
    weakness: 'fighting',
    resistance: 'psychic',
    'retreat cost': 1,
  },
  {
    number: 6,
    type: 'water',
    HP: 100,
    stage: ['stage 1', 35],
    attacks: [
      [3, ['water', 'water', 'water'], 50],
      [4, ['water', 'water', 'water', 'water'], 40],
    ],
    weakness: 'grass',
    resistance: 'fighting',
    'retreat cost': 3,
  },
  {
    number: 7,
    type: 'fighting',
    HP: 70,
    stage: ['base'],
    attacks: [
      [1, ['fighting'], 20],
      [3, ['fighting', 'fighting', 'normal'], 40],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 2,
  },
  {
    number: 8,
    type: 'fighting',
    HP: 100,
    stage: ['stage 2', 34],
    attacks: [
      ['pokemonPower'],
      [4, ['fighting', 'fighting', 'fighting', 'normal'], 60],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 9,
    type: 'lightning',
    HP: 60,
    stage: ['stage 1', 53],
    attacks: [
      [3, ['lightning', 'lightning', 'normal'], 30],
      [4, ['lightning', 'lightning', 'normal', 'normal'], 80],
    ],
    weakness: 'fighting',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 10,
    type: 'psychic',
    HP: 60,
    stage: ['base'],
    attacks: [
      [2, ['psychic', 'normal'], 10],
      [2, ['psychic', 'psychic'], 0],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 11,
    type: 'grass',
    HP: 90,
    stage: ['stage 2', 37],
    attacks: [
      [3, ['grass', 'normal', 'normal'], 30],
      [3, ['grass', 'grass', 'grass'], 20],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 12,
    type: 'fire',
    HP: 80,
    stage: ['stage 1', 68],
    attacks: [
      [2, ['normal', 'normal'], 0],
      [4, ['fire', 'fire', 'fire', 'fire'], 80],
    ],
    weakness: 'water',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 13,
    type: 'water',
    HP: 90,
    stage: ['stage 2', 38],
    attacks: [
      [3, ['water', 'water', 'normal'], 30],
      [4, ['water', 'water', 'normal', 'normal'], 40],
    ],
    weakness: 'grass',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 14,
    type: 'lightning',
    HP: 80,
    stage: ['stage 1', 58],
    attacks: [
      [3, ['lightning', 'normal', 'normal'], 20],
      [4, ['lightning', 'lightning', 'lightning', 'normal'], 60],
    ],
    weakness: 'fighting',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 15,
    type: 'grass',
    HP: 100,
    stage: ['stage 2', 30],
    attacks: [['pokemonPower'], [4, ['grass', 'grass', 'grass', 'grass'], 60]],
    weakness: 'fire',
    resistance: 'none',
    'retreat cost': 2,
  },
  {
    number: 16,
    type: 'lightning',
    HP: 90,
    stage: ['base'],
    attacks: [
      [4, ['lightning', 'lightning', 'lightning', 'normal'], 60],
      [4, ['lightning', 'lightning', 'lightning', 'lightning'], 100],
    ],
    weakness: 'none',
    resistance: 'fighting',
    'retreat cost': 3,
  },
  {
    number: 17,
    type: 'grass',
    HP: 80,
    stage: ['stage 2', 33],
    attacks: [
      [3, ['normal', 'normal', 'normal'], 30],
      [3, ['grass', 'grass', 'grass'], 40],
    ],
    weakness: 'fire',
    resistance: 'fighting',
    'retreat cost': 0,
  },
  {
    number: 18,
    type: 'normal',
    HP: 80,
    stage: ['stage 1', 26],
    attacks: [
      [3, ['normal', 'normal', 'normal'], 30],
      [4, ['normal', 'normal', 'normal', 'normal'], 20],
    ],
    weakness: 'none',
    resistance: 'psychic',
    'retreat cost': 2,
  },
  {
    number: 19,
    type: 'fighting',
    HP: 70,
    stage: ['stage 1', 47],
    attacks: [
      [3, ['fighting', 'fighting', 'normal'], 40],
      [4, ['fighting', 'fighting', 'fighting', 'fighting'], 70],
    ],
    weakness: 'grass',
    resistance: 'lightning',
    'retreat cost': 2,
  },
  {
    number: 20,
    type: 'lightning',
    HP: 70,
    stage: ['base'],
    attacks: [
      [1, ['lightning'], 10],
      [2, ['lightning', 'lightning'], 30],
    ],
    weakness: 'fighting',
    resistance: 'none',
    'retreat cost': 2,
  },
  {
    number: 21,
    type: 'lightning',
    HP: 80,
    stage: ['stage 1', 67],
    attacks: [
      ['pokemonPower'],
      [3, ['lightning', 'lightning', 'lightning'], 50],
    ],
    weakness: 'fighting',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 22,
    type: 'normal',
    HP: 60,
    stage: ['stage 1', 57],
    attacks: [
      [2, ['normal', 'normal'], 20],
      [3, ['normal', 'normal', 'normal'], 0],
    ],
    weakness: 'lightning',
    resistance: 'fighting',
    'retreat cost': 1,
  },
  {
    number: 23,
    type: 'fire',
    HP: 100,
    stage: ['stage 1', 28],
    attacks: [
      [3, ['fire', 'fire', 'normal'], 50],
      [4, ['fire', 'fire', 'normal', 'normal'], 80],
    ],
    weakness: 'water',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 24,
    type: 'fire',
    HP: 80,
    stage: ['stage 1', 46],
    attacks: [
      [3, ['normal', 'normal', 'normal'], 30],
      [3, ['fire', 'fire', 'normal'], 50],
    ],
    weakness: 'water',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 25,
    type: 'water',
    HP: 80,
    stage: ['stage 1', 41],
    attacks: [
      [3, ['water', 'water', 'normal'], 50],
      [4, ['water', 'water', 'normal', 'normal'], 30],
    ],
    weakness: 'lightning',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 26,
    type: 'normal',
    HP: 40,
    stage: ['base'],
    attacks: [[1, ['normal'], 10]],
    weakness: 'none',
    resistance: 'psychic',
    'retreat cost': 1,
  },
  {
    number: 27,
    type: 'normal',
    HP: 50,
    stage: ['base'],
    attacks: [
      [1, ['normal'], 30],
      [3, ['normal', 'normal', 'normal'], 30],
    ],
    weakness: 'lightning',
    resistance: 'fighting',
    'retreat cost': 1,
  },
  {
    number: 28,
    type: 'fire',
    HP: 60,
    stage: ['base'],
    attacks: [[2, ['fire', 'normal'], 20]],
    weakness: 'water',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 29,
    type: 'psychic',
    HP: 60,
    stage: ['stage 1', 50],
    attacks: [
      [1, ['psychic'], 0],
      [2, ['psychic', 'psychic'], 50],
    ],
    weakness: 'none',
    resistance: 'fighting',
    'retreat cost': 1,
  },
  {
    number: 30,
    type: 'grass',
    HP: 60,
    stage: ['stage 1', 44],
    attacks: [
      [3, ['grass', 'normal', 'normal'], 30],
      [3, ['grass', 'grass', 'grass'], 20],
    ],
    weakness: 'fire',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 31,
    type: 'psychic',
    HP: 70,
    stage: ['base'],
    attacks: [
      [1, ['psychic'], 10],
      [3, ['psychic', 'psychic', 'normal'], 20],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 2,
  },
  {
    number: 32,
    type: 'psychic',
    HP: 60,
    stage: ['stage 1', 43],
    attacks: [
      [2, ['psychic', 'psychic'], 0],
      [3, ['psychic', 'psychic', 'normal'], 50],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 33,
    type: 'grass',
    HP: 80,
    stage: ['stage 1', 69],
    attacks: [
      [2, ['normal', 'normal'], 0],
      [2, ['grass', 'grass'], 20],
    ],
    weakness: 'fire',
    resistance: 'none',
    'retreat cost': 2,
  },
  {
    number: 34,
    type: 'fighting',
    HP: 80,
    stage: ['stage 1', 52],
    attacks: [
      [3, ['fighting', 'fighting', 'normal'], 50],
      [4, ['fighting', 'fighting', 'normal', 'normal'], 60],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 35,
    type: 'water',
    HP: 30,
    stage: ['base'],
    attacks: [
      [1, ['normal'], 10],
      [1, ['water'], 10],
    ],
    weakness: 'lightning',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 36,
    type: 'fire',
    HP: 50,
    stage: ['base'],
    attacks: [
      [2, ['fire', 'fire'], 30],
      [3, ['fire', 'fire', 'normal'], 50],
    ],
    weakness: 'water',
    resistance: 'none',
    'retreat cost': 2,
  },
  {
    number: 37,
    type: 'grass',
    HP: 60,
    stage: ['stage 1', 55],
    attacks: [
      [3, ['grass', 'normal', 'normal'], 30],
      [4, ['grass', 'grass', 'normal', 'normal'], 50],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 38,
    type: 'water',
    HP: 60,
    stage: ['stage 1', 59],
    attacks: [
      [2, ['water', 'water'], 0],
      [3, ['water', 'water', 'normal'], 30],
    ],
    weakness: 'grass',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 39,
    type: 'normal',
    HP: 30,
    stage: ['base'],
    attacks: [
      [1, ['normal'], 0],
      [1, ['normal'], 0],
    ],
    weakness: 'fighting',
    resistance: 'psychic',
    'retreat cost': 1,
  },
  {
    number: 40,
    type: 'normal',
    HP: 60,
    stage: ['stage 1', 61],
    attacks: [
      [1, ['normal'], 20],
      [3, ['normal', 'normal', 'normal'], 0],
    ],
    weakness: 'fighting',
    resistance: 'psychic',
    'retreat cost': 1,
  },
  {
    number: 41,
    type: 'water',
    HP: 60,
    stage: ['base'],
    attacks: [[1, ['water'], 10]],
    weakness: 'lightning',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 42,
    type: 'water',
    HP: 70,
    stage: ['stage 1', 63],
    attacks: [
      [2, ['water', 'normal'], 0],
      [3, ['water', 'normal', 'normal'], 40],
    ],
    weakness: 'lightning',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 43,
    type: 'psychic',
    HP: 30,
    stage: ['base'],
    attacks: [[1, ['psychic'], 10]],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 0,
  },
  {
    number: 44,
    type: 'grass',
    HP: 40,
    stage: ['base'],
    attacks: [[2, ['grass', 'grass'], 20]],
    weakness: 'fire',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 45,
    type: 'grass',
    HP: 40,
    stage: ['base'],
    attacks: [[1, ['grass'], 10]],
    weakness: 'fire',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 46,
    type: 'fire',
    HP: 50,
    stage: ['base'],
    attacks: [
      [1, ['normal'], 10],
      [2, ['fire', 'normal'], 30],
    ],
    weakness: 'water',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 47,
    type: 'fighting',
    HP: 30,
    stage: ['base'],
    attacks: [
      [1, ['fighting'], 10],
      [2, ['fighting', 'fighting'], 30],
    ],
    weakness: 'grass',
    resistance: 'lightning',
    'retreat cost': 0,
  },
  {
    number: 48,
    type: 'normal',
    HP: 50,
    stage: ['base'],
    attacks: [[1, ['normal'], 10]],
    weakness: 'lightning',
    resistance: 'fighting',
    'retreat cost': 0,
  },
  {
    number: 49,
    type: 'psychic',
    HP: 50,
    stage: ['base'],
    attacks: [
      [1, ['normal'], 10],
      [2, ['psychic', 'psychic'], 10],
    ],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 50,
    type: 'psychic',
    HP: 30,
    stage: ['base'],
    attacks: [
      [1, ['psychic'], 0],
      [2, ['psychic', 'normal'], 0],
    ],
    weakness: 'none',
    resistance: 'fighting',
    'retreat cost': 0,
  },
  {
    number: 51,
    type: 'grass',
    HP: 50,
    stage: ['base'],
    attacks: [[2, ['grass', 'grass'], 10]],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 52,
    type: 'fighting',
    HP: 50,
    stage: ['base'],
    attacks: [[1, ['fighting'], 20]],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 53,
    type: 'lightning',
    HP: 40,
    stage: ['base'],
    attacks: [
      [1, ['lightning'], 10],
      [2, ['lightning', 'normal'], 40],
    ],
    weakness: 'fighting',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 54,
    type: 'grass',
    HP: 70,
    stage: ['stage 1', 45],
    attacks: [
      [2, ['normal', 'normal'], 0],
      [2, ['grass', 'grass'], 20],
    ],
    weakness: 'fire',
    resistance: 'none',
    'retreat cost': 2,
  },
  {
    number: 55,
    type: 'grass',
    HP: 40,
    stage: ['base'],
    attacks: [[1, ['grass'], 30]],
    weakness: 'psychic',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 56,
    type: 'fighting',
    HP: 90,
    stage: ['base'],
    attacks: [
      [1, ['fighting'], 10],
      [2, ['fighting', 'fighting'], 0],
    ],
    weakness: 'grass',
    resistance: 'none',
    'retreat cost': 3,
  },
  {
    number: 57,
    type: 'normal',
    HP: 40,
    stage: ['base'],
    attacks: [[2, ['normal', 'normal'], 10]],
    weakness: 'lightning',
    resistance: 'fighting',
    'retreat cost': 1,
  },
  {
    number: 58,
    type: 'lightning',
    HP: 40,
    stage: ['base'],
    attacks: [
      [1, ['normal'], 10],
      [2, ['lightning', 'normal'], 30],
    ],
    weakness: 'fighting',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 59,
    type: 'water',
    HP: 40,
    stage: ['base'],
    attacks: [[1, ['water'], 10]],
    weakness: 'grass',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 60,
    type: 'fire',
    HP: 40,
    stage: ['base'],
    attacks: [
      [2, ['normal', 'normal'], 20],
      [2, ['fire', 'fire'], 30],
    ],
    weakness: 'water',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 61,
    type: 'normal',
    HP: 30,
    stage: ['base'],
    attacks: [[1, ['normal'], 20]],
    weakness: 'fighting',
    resistance: 'psychic',
    'retreat cost': 0,
  },
  {
    number: 62,
    type: 'fighting',
    HP: 40,
    stage: ['base'],
    attacks: [[1, ['fighting'], 10]],
    weakness: 'grass',
    resistance: 'lightning',
    'retreat cost': 1,
  },
  {
    number: 63,
    type: 'water',
    HP: 40,
    stage: ['base'],
    attacks: [
      [1, ['water'], 10],
      [2, ['water', 'normal'], 0],
    ],
    weakness: 'lightning',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 64,
    type: 'water',
    HP: 60,
    stage: ['stage 1', 65],
    attacks: [
      [2, ['water', 'water'], 0],
      [3, ['water', 'normal', 'normal'], 20],
    ],
    weakness: 'lightning',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 65,
    type: 'water',
    HP: 40,
    stage: ['base'],
    attacks: [[1, ['water'], 20]],
    weakness: 'lightning',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 66,
    type: 'grass',
    HP: 50,
    stage: ['base'],
    attacks: [
      [2, ['grass', 'normal'], 20],
      [3, ['grass', 'grass', 'grass'], 20],
    ],
    weakness: 'fire',
    resistance: 'none',
    'retreat cost': 2,
  },
  {
    number: 67,
    type: 'lightning',
    HP: 40,
    stage: ['base'],
    attacks: [[1, ['normal'], 10]],
    weakness: 'fighting',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 68,
    type: 'fire',
    HP: 50,
    stage: ['base'],
    attacks: [[2, ['fire', 'fire'], 10]],
    weakness: 'water',
    resistance: 'none',
    'retreat cost': 1,
  },
  {
    number: 69,
    type: 'grass',
    HP: 40,
    stage: ['base'],
    attacks: [[1, ['grass'], 10]],
    weakness: 'fire',
    resistance: 'none',
    'retreat cost': 1,
  },
];

// === Names & attack names (used during normalization only) ===
const namesByNumber = {
  1:'Alakazam',  2:'Blastoise', 3:'Chansey',   4:'Charizard',
  5:'Clefairy',  6:'Gyarados',  7:'Hitmonchan',8:'Machamp',
  9:'Magneton', 10:'Mewtwo',   11:'Nidoking', 12:'Ninetales',
 13:'Poliwrath',14:'Raichu',  15:'Venusaur', 16:'Zapdos',
 17:'Beedrill', 18:'Dragonair',19:'Dugtrio', 20:'Electabuzz',
 21:'Electrode',22:'Pidgeotto',23:'Arcanine',24:'Charmeleon',
 25:'Dewgong',  26:'Dratini', 27:'Farfetch’d',28:'Growlithe',
 29:'Haunter',  30:'Ivysaur', 31:'Jynx',     32:'Kadabra',
 33:'Kakuna',   34:'Machoke', 35:'Magikarp', 36:'Magmar',
 37:'Nidorino',  38:'Poliwhirl',39:'Porygon', 40:'Raticate',
 41:'Seel',  42:'Wartortle',
 43:'Abra',     44:'Bulbasaur',45:'Caterpie',46:'Charmander',
 47:'Diglett',  48:'Doduo',    49:'Drowzee', 50:'Gastly',
 51:'Koffing',  52:'Machop',   53:'Magnemite',54:'Metapod',
 55:'Nidoran♂', 56:'Onix',     57:'Pidgey',  58:'Pikachu',
 59:'Poliwag',  60:'Ponyta',   61:'Rattata', 62:'Sandshrew',
 63:'Squirtle', 64:'Starmie',   65:'Staryu', 66:'Tangela',
 67:'Voltorb',   68:'Vulpix',   // keep 68 aligned to evolve into #12 in your data
 69:'Weedle',
};

// Attack names for 1–69. Strings or {name:'...'} both supported here.
// We'll extract final .name in the normalize pass.
const attackNamesByNumber = {
   1: ['Damage Swap', {name:'Confuse Ray'}],
   2: ['Rain Dance',  {name:'Hydro Pump'}],
   3: [{name:'Scrunch'}, {name:'Double-Edge'}],
   4: ['Energy Burn', {name:'Fire Spin'}],
   5: [{name:'Sing'}, {name:'Metronome'}],
   6: [{name:'Dragon Rage'}, {name:'Bubblebeam'}],
   7: [{name:'Jab'}, {name:'Special Punch'}],
   8: ['Strikes Back', {name:'Seismic Toss'}],
   9: [{name:'Thunder Wave'}, {name:'Selfdestruct'}],
  10: [{name:'Psychic'}, {name:'Barrier'}],
  11: [{name:'Thrash'}, {name:'Toxic'}],
  12: [{name:'Lure'}, {name:'Fire Blast'}],
  13: [{name:'Water Gun'}, {name:'Whirlpool'}],
  14: [{name:'Agility'}, {name:'Thunder'}],
  15: ['Energy Trans', {name:'Solarbeam'}],
  16: [{name:'Thunder'}, {name:'Thunderbolt'}],
  17: [{name:'Twineedle'}, {name:'Poison Sting'}],
  18: [{name:'Slam'}, {name:'Hyper Beam'}],
  19: [{name:'Slash'}, {name:'Earthquake'}],
  20: [{name:'Thundershock'}, {name:'Thunderpunch'}],
  21: ['Buzzap', {name:'Electric Shock'}],
  22: [{name:'Whirlwind'}, {name:'Mirror Move'}],
  23: [{name:'Flamethrower'}, {name:'Take Down'}],
  24: [{name:'Slash'}, {name:'Flamethrower'}],
  25: [{name:'Aurora Beam'}, {name:'Ice Beam'}],
  26: [{name:'Pound'}],
  27: [{name:'Leek Slap'}, {name:'Pot Smash'}],
  28: [{name:'Flare'}],
  29: [{name:'Hypnosis'}, {name:'Dream Eater'}],
  30: [{name:'Vine Whip'}, {name:'Poisonpowder'}],
  31: [{name:'Doubleslap'}, {name:'Meditate'}],
  32: [{name:'Recover'}, {name:'Super Psy'}],
  33: [{name:'Stiffen'}, {name:'Poisonpowder'}],
  34: [{name:'Karate Chop'}, {name:'Submission'}],
  35: [{name:'Tackle'}, {name:'Flail'}],
  36: [{name:'Fire Punch'}, {name:'Flamethrower'}],
  37: [{name:'Double Kick'}, {name:'Horn Drill'}],
  38: [{name:'Amnesia'}, {name:'Doubleslap'}],
  39: [{name:'Conversion 1'}, {name:'Conversion 2'}],
  40: [{name:'Bite'}, {name:'Super Fang'}],
  41: [{name:'Headbutt'}],
  42: [{name:'Withdraw'}, {name:'Bite'}],
  43: [{name:'Psyshock'}],
  44: [{name:'Leech Seed'}],
  45: [{name:'String Shot'}],
  46: [{name:'Scratch'}, {name:'Ember'}],
  47: [{name:'Dig'}, {name:'Mud Slap'}],
  48: [{name:'Fury Attack'}],
  49: [{name:'Pound'}, {name:'Confuse Ray'}],
  50: [{name:'Sleeping Gas'}, {name:'Destiny Bond'}],
  51: [{name:'Foul Gas'}],
  52: [{name:'Low Kick'}],
  53: [{name:'Thunder Wave'}, {name:'Selfdestruct'}],
  54: [{name:'Stiffen'}, {name:'Stun Spore'}],
  55: [{name:'Horn Hazard'}],
  56: [{name:'Rock Throw'}, {name:'Harden'}],
  57: [{name:'Whirlwind'}],
  58: [{name:'Gnaw'}, {name:'Thunder Jolt'}],
  59: [{name:'Water Gun'}],
  60: [{name:'Smash Kick'}, {name:'Flame Tail'}],
  61: [{name:'Bite'}],
  62: [{name:'Sand-attack'}],
  63: [{name:'Bubble'}, {name:'Withdraw'}],
  64: [{name:'Recover'}, {name:'Star Freeze'}],
  65: [{name:'Slap'}],
  66: [{name:'Bind'}, {name:'Poisonpowder'}],
  67: [{name:'Tackle'}],
  68: [{name:'Confuse Ray'}],
  69: [{name:'Poison Sting'}],
};

// === Normalization pass: unify schema & build indexes ===
(() => {
  const stageRankMap = { base: 0, 'stage 1': 1, 'stage 2': 2 };

  function asStageString(stage) {
    if (!stage) return 'base';
    if (Array.isArray(stage)) return (stage[0] || 'base').toLowerCase(); // 'stage 1'
    return String(stage).toLowerCase();
  }

  function toStage(stage) {
    // -> 'base' | 'stage1' | 'stage2'
    const s = asStageString(stage);
    return s.replace(' ', ''); // "stage 1" -> "stage1"
  }

  function stageRank(stage) {
    const s = asStageString(stage);
    return stageRankMap[s] ?? 0;
  }

  function evolvesFrom(stage) {
    if (Array.isArray(stage) && typeof stage[1] === 'number') return stage[1];
    return null;
  }

  function attackNameFor(cardNo, idx, isPower) {
    const list = attackNamesByNumber[cardNo];
    const fallback = isPower ? 'Pokémon Power' : `Attack ${idx + 1}`;
    if (!list || list[idx] == null) return fallback;
    const entry = list[idx];
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object' && entry.name) return entry.name;
    return fallback;
  }

  window.baseSet = window.baseSet.map((raw) => {
    const normalized = {
      id: raw.number,
      number: raw.number,
      name: namesByNumber[raw.number] || raw.name || `Card #${raw.number}`,
      type: raw.type,
      HP: raw.HP,
      stage: toStage(raw.stage),             // 'base' | 'stage1' | 'stage2'
      stageRank: stageRank(raw.stage),       // 0 | 1 | 2
      evolvesFrom: evolvesFrom(raw.stage),   // number | null
      weakness: raw.weakness,
      resistance: raw.resistance,
      retreatCost: raw['retreat cost'] != null ? raw['retreat cost'] : raw.retreatCost ?? 0,
      attacks: [],
    };

    // Normalize attacks
    const srcAttacks = Array.isArray(raw.attacks) ? raw.attacks : [];
    normalized.attacks = srcAttacks.map((atk, i) => {
      if (!Array.isArray(atk)) {
        // ['pokemonPower']
        return {
          kind: 'power',
          name: attackNameFor(raw.number, i, true),
        };
      }
      const [cost, types, damage] = atk;
      return {
        kind: 'move',
        name: attackNameFor(raw.number, i, false),
        cost,
        types,
        damage,
      };
    });

    return normalized;
  });

  // Fast index by id
  window.cardsById = Object.fromEntries(window.baseSet.map(c => [c.id, c]));

  // (Optional) Deep freeze in dev to catch accidental mutations
  // function deepFreeze(obj){ Object.getOwnPropertyNames(obj).forEach(p=>{ const v=obj[p]; if(v && typeof v==='object') deepFreeze(v); }); return Object.freeze(obj); }
  // window.baseSet.forEach(deepFreeze);
  // deepFreeze(window.cardsById);
})();

// Done. Your UI code can now rely on:
// card.attacks[i].name, kind, cost, types, damage
// card.retreatCost
// card.stage ('base'|'stage1'|'stage2')
// card.evolvesFrom (number|null)
// window.cardsById[id]

