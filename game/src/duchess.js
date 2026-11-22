// duchess.js — the Duchess, Ember Court's AI opponent.
//
// She is readable on purpose: before her turn she telegraphs an intent —
// STRIKE (she will attack), GUARD (she will raise shield) or SCHEME (poison,
// heal or draw) — and the player can answer it with blocks or pressure.
// Her choices react to the table: she heals when hurt, guards when the
// player is building a big resonant attack, and presses lethal when she can.

import { playCard, tickPoison, poisonTotal } from './engine.js';

export const INTENTS = {
  strike: { label: 'STRIKE', hint: 'She will attack — raise a shield!' },
  guard: { label: 'GUARD', hint: 'She will defend — poison slips past shields.' },
  scheme: { label: 'SCHEME', hint: 'Poison, healing or drawing is coming.' },
};

// Picks the Duchess's intent for her next turn from the visible table.
export function chooseIntent(state) {
  const her = state.duchess;
  const you = state.player;
  if (her.life <= 10 && her.hand.some((c) => c.def.kind === 'heal')) return 'scheme';
  if (you.lastSuit && you.hand.length >= 4 && her.hand.some((c) => c.def.kind === 'block')) return 'guard';
  if (her.hand.some((c) => c.def.kind === 'attack')) return 'strike';
  return 'scheme';
}

function cardScore(state, card, intent) {
  const def = card.def;
  const her = state.duchess;
  const you = state.player;
  let score = def.amount;
  if (intent === 'strike' && def.kind === 'attack') score += 20;
  if (intent === 'guard' && def.kind === 'block') score += 20;
  if (intent === 'scheme' && def.kind !== 'attack' && def.kind !== 'block') score += 20;
  if (def.kind === 'heal' && her.life <= 12) score += 25;
  if (def.kind === 'heal' && her.life > 24) score -= 30;
  if (def.kind === 'attack' && def.amount + (her.lastSuit === def.suit ? 3 : 0) >= you.life + you.shield) score += 60; // lethal
  if (def.kind === 'poison' && poisonTotal(you) === 0) score += 6;
  if (her.lastSuit === def.suit) score += 5; // she likes resonance too
  return score;
}

// Runs her whole turn with a simple energy budget that grows like the
// player's. Returns the list of events she produced, in order.
export function runDuchessTurn(state, intent) {
  const events = [];
  const hurt = tickPoison(state.duchess);
  if (hurt > 0) {
    state.log.push(`Poison bites the Duchess for ${hurt}.`);
    if (state.duchess.life <= 0) {
      state.phase = 'won';
      return events;
    }
  }
  state.duchess.shield = Math.floor(state.duchess.shield / 2);
  // She is the boss of the court: her ember pool runs one deeper than the
  // player's, which keeps a damage race honest — turtling loses.
  let budget = Math.min(7, state.energyMax + 2);
  let guard = 0;
  while (guard < 12) {
    guard += 1;
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < state.duchess.hand.length; i += 1) {
      const card = state.duchess.hand[i];
      if (card.def.cost > budget) continue;
      const s = cardScore(state, card, intent) + state.rng() * 2;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    if (best < 0) break;
    budget -= state.duchess.hand[best].def.cost;
    const event = playCard(state, state.duchess, state.player, best);
    if (event) events.push(event);
    if (state.phase !== 'player' && state.phase !== 'duchess') break;
    if (state.player.life <= 0) break;
  }
  return events;
}
