// main.js — Ember Court boot and game loop.
//
// Owns the scene state the renderer draws: which screen we are on, the duel
// state from engine.js, the Duchess's telegraphed intent, the centre-table
// cards, damage floaters and the message line. Turns run like this: the
// player clicks cards (energy permitting), ends the turn, the Duchess acts
// after a short dramatic pause, her next intent is telegraphed, and play
// returns. A debug hook on window lets tests and screenshot staging drive
// the real game deterministically.

import { CARD_DEFS } from './cards.js';
import { newGame, playCard, beginPlayerTurn } from './engine.js';
import { chooseIntent, runDuchessTurn } from './duchess.js';
import { createRenderer } from './render.js';
import { bindInput, pointInRect } from './input.js';
import {
  unlockAudio, playDeal, playSelect, playCardSound, playHurt,
  playTurnChime, playWinFanfare, playLoseDirge,
} from './audio.js';

const canvas = document.getElementById('stage');
const renderer = createRenderer(canvas);

const scene = {
  screen: 'title',
  W: canvas.width,
  H: canvas.height,
  time: 0,
  state: null,
  intent: 'strike',
  selected: -1,
  hover: -1,
  busy: false,
  message: 'Your move.',
  centerCards: { player: null, duchess: null },
  floaters: [],
  sampleCards: ['ember', 'tide', 'thorn', 'moon'].map(
    (suit) => CARD_DEFS.find((d) => d.suit === suit && d.kind === 'attack'),
  ),
};

function now() {
  return scene.time;
}

function addFloater(x, y, text, color) {
  scene.floaters.push({ x, y, text, color, t0: now() });
  if (scene.floaters.length > 10) scene.floaters.shift();
}

function startGame(seed) {
  scene.state = newGame(seed === undefined ? (Math.random() * 1e9) | 0 : seed);
  scene.screen = 'table';
  scene.intent = chooseIntent(scene.state);
  scene.selected = -1;
  scene.hover = -1;
  scene.busy = false;
  scene.centerCards = { player: null, duchess: null };
  scene.floaters = [];
  scene.message = 'Your move — she means to ' + scene.intent.toUpperCase() + '.';
  playDeal();
}

function finishIfEnded() {
  const st = scene.state;
  if (st.phase === 'won' || st.phase === 'lost') {
    scene.screen = st.phase;
    if (st.phase === 'won') playWinFanfare();
    else playLoseDirge();
    return true;
  }
  return false;
}

function applyEvent(event, who) {
  const st = scene.state;
  playCardSound(event.kind, event.resonance);
  if (who === 'player') {
    scene.centerCards.player = { card: event.card, resonance: event.resonance, t0: now() };
  } else {
    scene.centerCards.duchess = { card: event.card, resonance: false, t0: now() };
  }
  // Floaters land beside the affected side's life bar: the Duchess's bar
  // sits top-centre (floaters go to its right), the player's bottom-left.
  const duchessSpot = { x: scene.W / 2 + 246, y: 198 };
  const playerSpot = { x: 210, y: scene.H - 316 };
  const foeSpot = who === 'player' ? duchessSpot : playerSpot;
  const selfSpot = who === 'player' ? playerSpot : duchessSpot;
  if (event.kind === 'attack') {
    addFloater(foeSpot.x, foeSpot.y, `-${event.amount}`, '#ff8a75');
    if (who === 'duchess') playHurt();
  } else if (event.kind === 'heal') {
    addFloater(selfSpot.x, selfSpot.y, `+${event.amount} life`, '#8dff7a');
  } else if (event.kind === 'block') {
    addFloater(selfSpot.x, selfSpot.y, `+${event.amount} shield`, '#9fd8ff');
  } else if (event.kind === 'poison') {
    addFloater(foeSpot.x, foeSpot.y, 'POISONED', '#8dff7a');
  }
}

function tryPlay(index) {
  const st = scene.state;
  if (scene.screen !== 'table' || scene.busy || !st || st.phase !== 'player') return;
  const card = st.player.hand[index];
  if (!card) return;
  if (card.def.cost > st.energy) {
    scene.message = `Not enough Ember — ${card.def.name} costs ${card.def.cost}.`;
    return;
  }
  st.energy -= card.def.cost;
  const event = playCard(st, st.player, st.duchess, index);
  if (!event) return;
  applyEvent(event, 'player');
  scene.selected = -1;
  scene.message = event.resonance
    ? `RESONANCE! ${card.def.name} chained off your last suit.`
    : `You played ${card.def.name}.`;
  finishIfEnded();
}

function endTurn() {
  const st = scene.state;
  if (scene.screen !== 'table' || scene.busy || !st || st.phase !== 'player') return;
  scene.busy = true;
  scene.message = 'The Duchess acts…';
  const intentUsed = scene.intent;
  setTimeout(() => {
    const events = runDuchessTurn(st, intentUsed);
    events.forEach((event, i) => {
      setTimeout(() => applyEvent(event, 'duchess'), i * 260);
    });
    setTimeout(() => {
      if (finishIfEnded()) {
        scene.busy = false;
        return;
      }
      beginPlayerTurn(st);
      if (finishIfEnded()) {
        scene.busy = false;
        return;
      }
      scene.intent = chooseIntent(st);
      scene.message = 'Your move — she means to ' + scene.intent.toUpperCase() + '.';
      scene.busy = false;
      playTurnChime();
    }, events.length * 260 + 320);
  }, 420);
}

const handlers = {
  onHover(p) {
    if (scene.screen !== 'table') return;
    const hitCard = renderer.hit.cards.find((r) => pointInRect(p, r));
    scene.hover = hitCard ? hitCard.index : -1;
  },
  onClick(p) {
    unlockAudio();
    if (scene.screen === 'title' || scene.screen === 'won' || scene.screen === 'lost') {
      startGame();
      return;
    }
    if (pointInRect(p, renderer.hit.endTurn)) {
      endTurn();
      return;
    }
    // Topmost (rightmost drawn last) card wins the click.
    const cards = [...renderer.hit.cards].reverse();
    const hitCard = cards.find((r) => pointInRect(p, r));
    if (hitCard) {
      if (scene.selected === hitCard.index) tryPlay(hitCard.index);
      else {
        scene.selected = hitCard.index;
        playSelect();
      }
    }
  },
  onNumber(i) {
    if (scene.screen !== 'table') return;
    if (scene.selected === i) tryPlay(i);
    else if (scene.state && i < scene.state.player.hand.length) {
      scene.selected = i;
      playSelect();
    }
  },
  onConfirm() {
    unlockAudio();
    if (scene.screen !== 'table') {
      startGame();
      return;
    }
    if (scene.selected >= 0) tryPlay(scene.selected);
    else endTurn();
  },
  onEndTurn() {
    endTurn();
  },
  onMoveSelection(dir) {
    if (scene.screen !== 'table' || !scene.state) return;
    const n = scene.state.player.hand.length;
    if (n === 0) return;
    scene.selected = ((scene.selected + dir) % n + n) % n;
    playSelect();
  },
};

bindInput(canvas, handlers);

// Debug / staging hook: lets a test driver start a seeded game, inspect the
// state and force outcomes through the game's own rules.
window.__emberCourt = {
  scene,
  startGame,
  tryPlay,
  endTurn,
  setLives(playerLife, duchessLife) {
    if (!scene.state) return;
    if (playerLife !== null) scene.state.player.life = playerLife;
    if (duchessLife !== null) scene.state.duchess.life = duchessLife;
  },
};

let lastTs = 0;
function frame(ts) {
  scene.time = ts / 1000;
  void lastTs;
  lastTs = ts;
  renderer.draw(scene);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
