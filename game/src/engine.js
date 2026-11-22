// engine.js — Ember Court turn rules: state, energy, poison, resonance.
//
// A duel state holds two sides (player and duchess). Each side has life,
// shield, poison stacks, a hand, a deck and a discard pile. On your turn you
// gain Ember energy (1 more each round, capped) and play cards from hand.
// Resonance: playing a card whose suit matches the suit of the last card you
// played this duel triggers a bonus — +3 damage, +3 shield, +1 poison turn,
// +3 heal, or +1 card drawn, by kind. The bonus is what makes ordering a
// hand a real decision.

import { buildDeck } from './cards.js';

export const MAX_LIFE = 30;
export const HAND_LIMIT = 7;
export const ENERGY_CAP = 6;

// Small deterministic PRNG (mulberry32) so staged games replay exactly.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newSide(deck) {
  return {
    life: MAX_LIFE,
    shield: 0,
    poison: [], // list of { amount, turns }
    hand: [],
    deck,
    discard: [],
    lastSuit: null,
  };
}

export function newGame(seed) {
  const rng = makeRng(seed);
  const state = {
    rng,
    round: 1,
    energyMax: 1,
    energy: 1,
    phase: 'player', // 'player' | 'duchess' | 'won' | 'lost'
    player: newSide(buildDeck(rng)),
    duchess: newSide(buildDeck(rng)),
    log: [],
    lastEvent: null,
  };
  drawCards(state, state.player, 5);
  drawCards(state, state.duchess, 4);
  return state;
}

export function drawCards(state, side, count) {
  for (let i = 0; i < count; i += 1) {
    if (side.deck.length === 0) {
      side.deck = side.discard;
      side.discard = [];
      for (let k = side.deck.length - 1; k > 0; k -= 1) {
        const j = Math.floor(state.rng() * (k + 1));
        const tmp = side.deck[k];
        side.deck[k] = side.deck[j];
        side.deck[j] = tmp;
      }
    }
    if (side.deck.length === 0 || side.hand.length >= HAND_LIMIT) return;
    side.hand.push(side.deck.pop());
  }
}

export function poisonTotal(side) {
  return side.poison.reduce((sum, p) => sum + p.amount, 0);
}

// Applies damage through shield first. Returns the life damage dealt.
export function dealDamage(target, amount) {
  const blocked = Math.min(target.shield, amount);
  target.shield -= blocked;
  const through = amount - blocked;
  target.life = Math.max(0, target.life - through);
  return through;
}

// Ticks poison at the start of a side's turn; returns damage suffered.
export function tickPoison(side) {
  let total = 0;
  for (const p of side.poison) {
    total += dealDamage(side, p.amount);
    p.turns -= 1;
  }
  side.poison = side.poison.filter((p) => p.turns > 0);
  return total;
}

function checkEnd(state) {
  if (state.duchess.life <= 0) state.phase = 'won';
  else if (state.player.life <= 0) state.phase = 'lost';
}

// Plays hand[index] for `side` against `foe`. Returns an event describing
// what happened (used for animation, sound and the log), or null if illegal.
export function playCard(state, side, foe, index) {
  if (index < 0 || index >= side.hand.length) return null;
  const card = side.hand[index];
  const def = card.def;
  const resonance = side.lastSuit === def.suit;
  const event = { card, resonance, kind: def.kind, amount: def.amount, damage: 0, who: side === state.player ? 'player' : 'duchess' };

  if (def.kind === 'attack') {
    event.amount = def.amount + (resonance ? 3 : 0);
    event.damage = dealDamage(foe, event.amount);
  } else if (def.kind === 'block') {
    event.amount = def.amount + (resonance ? 3 : 0);
    side.shield += event.amount;
  } else if (def.kind === 'poison') {
    foe.poison.push({ amount: def.amount, turns: def.turns + (resonance ? 1 : 0) });
    event.amount = def.amount;
  } else if (def.kind === 'heal') {
    event.amount = def.amount + (resonance ? 3 : 0);
    side.life = Math.min(MAX_LIFE, side.life + event.amount);
  } else if (def.kind === 'draw') {
    event.amount = def.amount + (resonance ? 1 : 0);
    drawCards(state, side, event.amount);
  }

  side.hand.splice(index, 1);
  side.discard.push(card);
  side.lastSuit = def.suit;
  state.lastEvent = event;
  checkEnd(state);
  return event;
}

// Starts the player's turn: round and energy grow, poison ticks, draw 1.
export function beginPlayerTurn(state) {
  state.round += 1;
  state.energyMax = Math.min(ENERGY_CAP, state.energyMax + 1);
  state.energy = state.energyMax;
  state.player.shield = Math.floor(state.player.shield / 2);
  const hurt = tickPoison(state.player);
  if (hurt > 0) state.log.push(`Poison bites you for ${hurt}.`);
  checkEnd(state);
  if (state.phase === 'player') drawCards(state, state.player, 1);
}
