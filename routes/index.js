import express from 'express';
const router = express.Router();

const VIEW_MODEL = Object.freeze({
  title: 'Pokémon TCG+',
  players: Object.freeze(['Player 1', 'Player 2']),
  benchSlots: 4,
  handCards: 7,
  energySlots: 6,
  prizeCards: 11,
});

// Render the home page using EJS
router.get('/', (_req, res) => {
  res.render('index', { ...VIEW_MODEL });
});

export default router;
