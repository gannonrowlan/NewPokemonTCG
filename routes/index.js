import express from 'express';
const router = express.Router();

// Render the home page using EJS
router.get('/', (req, res) => {
  res.render('index', {
    title: "Pokémon TCG+",
    players: ['Player 1', 'Player 2'],
    benchSlots: 4,
    handCards: 7,
    energySlots: 6,
    prizeCards: 11
  });
});

export default router;
