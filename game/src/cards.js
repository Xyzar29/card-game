// cards.js — Ember Court card and suit definitions.
//
// Four suits, each told apart by colour AND shape, never by text alone:
//   Ember — orange-red, a flame teardrop
//   Tide  — blue, a wave droplet
//   Thorn — green, a pointed leaf
//   Moon  — violet, a crescent
//
// Card kinds: attack (damage), block (shield), poison (damage over turns),
// heal (restore life), draw (take more cards).

export const SUITS = {
  ember: { name: 'Ember', color: '#ff7a3c', dark: '#a83c12', glyph: 'ember' },
  tide: { name: 'Tide', color: '#3ca9ff', dark: '#125aa8', glyph: 'tide' },
  thorn: { name: 'Thorn', color: '#57d977', dark: '#1d7a35', glyph: 'thorn' },
  moon: { name: 'Moon', color: '#c99aff', dark: '#6d34b8', glyph: 'moon' },
};

export const SUIT_KEYS = Object.keys(SUITS);

// Draws a suit glyph as a filled path on a 24x24 grid, centred at (cx, cy)
// with the given radius. Shapes are deliberately unlike one another.
export function suitPath(ctx, suit, cx, cy, r) {
  ctx.beginPath();
  if (suit === 'ember') {
    // Flame: teardrop with a wavy tip.
    ctx.moveTo(cx, cy - r);
    ctx.bezierCurveTo(cx + r * 0.85, cy - r * 0.1, cx + r * 0.62, cy + r * 0.55, cx, cy + r);
    ctx.bezierCurveTo(cx - r * 0.62, cy + r * 0.55, cx - r * 0.85, cy - r * 0.1, cx, cy - r);
  } else if (suit === 'tide') {
    // Droplet: round bottom, single point at top, offset curve.
    ctx.moveTo(cx, cy - r);
    ctx.bezierCurveTo(cx + r * 0.9, cy + r * 0.25, cx + r * 0.55, cy + r, cx, cy + r);
    ctx.bezierCurveTo(cx - r * 0.55, cy + r, cx - r * 0.9, cy + r * 0.25, cx, cy - r);
  } else if (suit === 'thorn') {
    // Leaf: two arcs meeting at sharp points top and bottom.
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx - r, cy, cx, cy - r);
  } else {
    // Moon: crescent made of two arcs.
    ctx.arc(cx, cy, r, Math.PI * 0.32, Math.PI * 1.68, false);
    ctx.arc(cx + r * 0.48, cy - r * 0.12, r * 0.78, Math.PI * 1.55, Math.PI * 0.45, true);
  }
  ctx.closePath();
}

// The full card catalogue. `amount` is the headline number on the card face;
// `turns` is used by poison. Costs are paid in Ember energy.
export const CARD_DEFS = [
  { id: 'spark-strike', name: 'Spark Strike', suit: 'ember', kind: 'attack', cost: 1, amount: 6, text: 'Deal 6 damage.' },
  { id: 'inferno-lance', name: 'Inferno Lance', suit: 'ember', kind: 'attack', cost: 3, amount: 14, text: 'Deal 14 damage.' },
  { id: 'cinder-fan', name: 'Cinder Fan', suit: 'ember', kind: 'attack', cost: 2, amount: 9, text: 'Deal 9 damage.' },
  { id: 'ash-ward', name: 'Ash Ward', suit: 'ember', kind: 'block', cost: 1, amount: 7, text: 'Gain 7 shield.' },
  { id: 'wave-slam', name: 'Wave Slam', suit: 'tide', kind: 'attack', cost: 2, amount: 10, text: 'Deal 10 damage.' },
  { id: 'frost-shell', name: 'Frost Shell', suit: 'tide', kind: 'block', cost: 2, amount: 12, text: 'Gain 12 shield.' },
  { id: 'deep-well', name: 'Deep Well', suit: 'tide', kind: 'draw', cost: 1, amount: 2, text: 'Draw 2 cards.' },
  { id: 'mending-rain', name: 'Mending Rain', suit: 'tide', kind: 'heal', cost: 2, amount: 8, text: 'Heal 8 life.' },
  { id: 'vine-whip', name: 'Vine Whip', suit: 'thorn', kind: 'attack', cost: 1, amount: 5, text: 'Deal 5 damage.' },
  { id: 'nightshade', name: 'Nightshade', suit: 'thorn', kind: 'poison', cost: 2, amount: 3, turns: 3, text: 'Poison: 3 dmg for 3 turns.' },
  { id: 'briar-wall', name: 'Briar Wall', suit: 'thorn', kind: 'block', cost: 1, amount: 6, text: 'Gain 6 shield.' },
  { id: 'spore-bloom', name: 'Spore Bloom', suit: 'thorn', kind: 'poison', cost: 1, amount: 2, turns: 2, text: 'Poison: 2 dmg for 2 turns.' },
  { id: 'moon-dagger', name: 'Moon Dagger', suit: 'moon', kind: 'attack', cost: 1, amount: 7, text: 'Deal 7 damage.' },
  { id: 'lunar-aegis', name: 'Lunar Aegis', suit: 'moon', kind: 'block', cost: 2, amount: 11, text: 'Gain 11 shield.' },
  { id: 'starlight', name: 'Starlight', suit: 'moon', kind: 'heal', cost: 1, amount: 5, text: 'Heal 5 life.' },
  { id: 'eclipse-draw', name: 'Eclipse Draw', suit: 'moon', kind: 'draw', cost: 2, amount: 3, text: 'Draw 3 cards.' },
];

export const KIND_LABEL = {
  attack: 'ATTACK',
  block: 'SHIELD',
  poison: 'POISON',
  heal: 'HEAL',
  draw: 'DRAW',
};

// Builds a shuffled deck of card instances from the catalogue.
// `rng` is a function returning [0,1); the engine passes a seeded one so
// staged games are reproducible.
export function buildDeck(rng) {
  const deck = [];
  for (const def of CARD_DEFS) {
    const copies = def.cost >= 3 ? 1 : 2;
    for (let i = 0; i < copies; i += 1) {
      deck.push({ uid: `${def.id}-${deck.length}`, def });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}
