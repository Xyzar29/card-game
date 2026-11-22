// render.js — Ember Court drawing: the court table, card faces, animation.
//
// Everything is drawn on one canvas. Cards are big (118x168 in hand) with a
// large cost gem, a large headline number and a large suit glyph, so a hand
// stays readable when a screenshot is shrunk to a thumbnail. Hand cards
// glide toward their layout slots each frame (lerped positions), which is
// what makes a dealt hand feel like it has weight; played cards snap to the
// centre of the table and floaters carry the damage numbers.

import { SUITS, KIND_LABEL, suitPath } from './cards.js';
import { MAX_LIFE, poisonTotal } from './engine.js';
import { INTENTS } from './duchess.js';

export const CARD_W = 118;
export const CARD_H = 168;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}

// Draws one card face centred at (cx, cy). `opts`: { scale, dim, resonate }.
export function drawCardFace(ctx, def, cx, cy, opts = {}) {
  const scale = opts.scale || 1;
  const w = CARD_W * scale;
  const h = CARD_H * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const suit = SUITS[def.suit];

  ctx.save();
  if (opts.dim) ctx.globalAlpha = 0.45;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 14 * scale;
  ctx.shadowOffsetY = 5 * scale;
  roundRect(ctx, x, y, w, h, 12 * scale);
  ctx.fillStyle = '#f7efdc';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = opts.resonate ? 5 * scale : 3 * scale;
  ctx.strokeStyle = opts.resonate ? '#ffd94d' : suit.color;
  ctx.stroke();

  // Header band in the suit colour.
  roundRect(ctx, x + 3 * scale, y + 3 * scale, w - 6 * scale, 34 * scale, 9 * scale);
  ctx.fillStyle = suit.color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${14 * scale}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(def.name.toUpperCase().slice(0, 16), cx, y + 25 * scale);

  // Cost gem: a filled circle, top-left, with the energy cost.
  ctx.beginPath();
  ctx.arc(x + 20 * scale, y + 56 * scale, 14 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#ff9d2e';
  ctx.fill();
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = '#a85a00';
  ctx.stroke();
  ctx.fillStyle = '#402400';
  ctx.font = `bold ${17 * scale}px Georgia, serif`;
  ctx.fillText(String(def.cost), x + 20 * scale, y + 62 * scale);
  ctx.font = `bold ${9 * scale}px Georgia, serif`;
  ctx.fillText('COST', x + 20 * scale, y + 84 * scale);

  // Big suit glyph, centre.
  ctx.fillStyle = suit.color;
  suitPath(ctx, def.suit, cx + 14 * scale, cy - 8 * scale, 26 * scale);
  ctx.fill();

  // Headline number and kind. Two-digit numbers sit further left so they
  // never crowd the kind label.
  ctx.fillStyle = '#2a1c10';
  ctx.font = `bold ${40 * scale}px Georgia, serif`;
  const numX = cx - (def.amount >= 10 ? 33 : 26) * scale;
  ctx.fillText(String(def.amount), numX, cy + 26 * scale);
  ctx.font = `bold ${12 * scale}px Georgia, serif`;
  ctx.fillStyle = suit.dark;
  ctx.fillText(KIND_LABEL[def.kind], cx + 16 * scale, cy + 24 * scale);

  // Effect text.
  ctx.fillStyle = '#4a3826';
  ctx.font = `${12.5 * scale}px Georgia, serif`;
  wrapText(ctx, def.text, cx, y + h - 30 * scale, w - 18 * scale, 15 * scale);

  if (opts.resonate) {
    ctx.fillStyle = '#8a6d00';
    ctx.font = `bold ${10.5 * scale}px Georgia, serif`;
    ctx.fillText('★ RESONANCE BONUS', cx, y + h - 10 * scale);
  }
  ctx.restore();
}

export function drawCardBack(ctx, cx, cy, scale = 1) {
  const w = CARD_W * scale;
  const h = CARD_H * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10 * scale;
  ctx.shadowOffsetY = 4 * scale;
  roundRect(ctx, x, y, w, h, 12 * scale);
  ctx.fillStyle = '#3b2358';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = '#c99aff';
  ctx.stroke();
  roundRect(ctx, x + 8 * scale, y + 8 * scale, w - 16 * scale, h - 16 * scale, 8 * scale);
  ctx.strokeStyle = 'rgba(201,154,255,0.5)';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
  ctx.fillStyle = '#c99aff';
  suitPath(ctx, 'moon', cx, cy, 24 * scale);
  ctx.fill();
  ctx.restore();
}

function drawLifeBar(ctx, x, y, w, life, label, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x - 4, y - 22, w + 8, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${label}  ${life} / ${MAX_LIFE}`, x, y - 6);
  roundRect(ctx, x, y, w, 14, 7);
  ctx.fillStyle = '#40160f';
  ctx.fill();
  roundRect(ctx, x, y, Math.max(14, (w * life) / MAX_LIFE), 14, 7);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawStatusChips(ctx, x, y, side) {
  ctx.save();
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'left';
  let cx = x;
  if (side.shield > 0) {
    ctx.fillStyle = '#9fd8ff';
    ctx.fillText(`🛡 Shield ${side.shield}`, cx, y);
    cx += 110;
  }
  const poison = poisonTotal(side);
  if (poison > 0) {
    ctx.fillStyle = '#8dff7a';
    ctx.fillText(`☠ Poison ${poison}/turn`, cx, y);
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const sprites = new Map(); // card uid -> { x, y, rot }
  const hit = { cards: [], endTurn: null, anywhere: null };

  function layoutHand(count, W, H) {
    const slots = [];
    const gap = Math.min(126, (W - 240) / Math.max(1, count));
    const startX = W / 2 - ((count - 1) * gap) / 2;
    for (let i = 0; i < count; i += 1) {
      slots.push({ x: startX + i * gap, y: H - 108, rot: (i - (count - 1) / 2) * 0.045 });
    }
    return slots;
  }

  function drawBackground(W, H, time) {
    const grad = ctx.createRadialGradient(W / 2, H * 0.42, 80, W / 2, H / 2, W * 0.75);
    grad.addColorStop(0, '#4a2440');
    grad.addColorStop(0.55, '#33182e');
    grad.addColorStop(1, '#180b18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Table ellipse.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(W / 2, H / 2 + 16, W * 0.44, H * 0.36, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#274d33';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#6d4423';
    ctx.stroke();
    ctx.restore();
    // Drifting embers.
    ctx.save();
    for (let i = 0; i < 26; i += 1) {
      const px = ((i * 173 + time * (12 + (i % 5) * 4)) % (W + 40)) - 20;
      const py = H * 0.85 - ((i * 97 + time * 22) % (H * 0.8));
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 2 + i);
      ctx.fillStyle = '#ffb35c';
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTitle(scene) {
    const { W, H, time } = scene;
    drawBackground(W, H, time);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.shadowColor = 'rgba(255,120,40,0.8)';
    ctx.shadowBlur = 34;
    ctx.fillText('EMBER COURT', W / 2, 150);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f3e6cf';
    ctx.font = '26px Georgia, serif';
    ctx.fillText('A card duel against the Duchess of the Ashen Throne', W / 2, 196);
    ctx.font = '19px Georgia, serif';
    ctx.fillStyle = '#d9c39a';
    ctx.fillText('30 life each · Ember energy grows each turn · Chain a suit for RESONANCE bonuses', W / 2, 232);
    ctx.fillText('She telegraphs her intent — read it, counter it, burn her down.', W / 2, 260);
    ctx.restore();

    // A fanned sample hand: one card of each suit.
    const samples = scene.sampleCards;
    samples.forEach((def, i) => {
      const cx = W / 2 + (i - 1.5) * 150;
      const cy = 420 + Math.sin(time * 1.6 + i) * 5;
      drawCardFace(ctx, def, cx, cy, { scale: 1.05, resonate: i === 1 });
    });

    ctx.save();
    ctx.textAlign = 'center';
    const pulse = 0.75 + 0.25 * Math.sin(time * 3.2);
    ctx.globalAlpha = pulse;
    roundRect(ctx, W / 2 - 190, 566, 380, 62, 14);
    ctx.fillStyle = '#ff7a3c';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 27px Georgia, serif';
    ctx.fillText('▶  CLICK TO DUEL', W / 2, 606);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#bfa87e';
    ctx.font = '16px Georgia, serif';
    ctx.fillText('Mouse: click a card to play it · Keys 1–7 select · Enter ends your turn', W / 2, 668);
    ctx.restore();
    hit.anywhere = { x: 0, y: 0, w: W, h: H };
  }

  function drawTable(scene) {
    const { W, H, time, state } = scene;
    drawBackground(W, H, time);
    hit.cards = [];

    // --- The Duchess (top) ---
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8b7ff';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('👑 THE DUCHESS', W / 2, 40);
    ctx.restore();
    drawLifeBar(ctx, W / 2 - 190, 66, 380, state.duchess.life, 'DUCHESS LIFE', '#c65bff');
    drawStatusChips(ctx, W / 2 - 190, 108, state.duchess);

    // Her hand: card backs.
    const herCount = state.duchess.hand.length;
    for (let i = 0; i < herCount; i += 1) {
      const cx = W / 2 + (i - (herCount - 1) / 2) * 62;
      drawCardBack(ctx, cx, 168, 0.52);
    }
    ctx.save();
    ctx.fillStyle = '#d9c39a';
    ctx.font = '15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Her hand: ${herCount} cards · Deck ${state.duchess.deck.length}`, W / 2, 226);
    ctx.restore();

    // Intent badge — big, top-right, impossible to miss.
    const intent = INTENTS[scene.intent];
    ctx.save();
    roundRect(ctx, W - 316, 44, 272, 96, 12);
    ctx.fillStyle = scene.intent === 'strike' ? '#7a1d12' : scene.intent === 'guard' ? '#123c5e' : '#3c125e';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd94d';
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ HER INTENT', W - 180, 70);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(intent.label, W - 180, 104);
    ctx.fillStyle = '#f3e6cf';
    ctx.font = '13.5px Georgia, serif';
    wrapText(ctx, intent.hint, W - 180, 126, 250, 16);
    ctx.restore();

    // Round + message banner, top-left.
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, 44, 44, 250, 96, 12);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 21px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ROUND ${state.round}`, 62, 76);
    ctx.fillStyle = '#f3e6cf';
    ctx.font = '15px Georgia, serif';
    ctx.textAlign = 'left';
    wrapText(ctx, scene.message, 62, 104, 216, 18);
    ctx.restore();

    // --- Centre: the last cards played ---
    if (scene.centerCards.duchess) {
      const c = scene.centerCards.duchess;
      const pop = Math.min(1, (time - c.t0) * 4);
      drawCardFace(ctx, c.card.def, W / 2 - 96, 330, { scale: 0.72 * (0.6 + 0.4 * pop) });
      ctx.save();
      ctx.fillStyle = '#e8b7ff';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHE PLAYED', W / 2 - 96, 330 - 74);
      ctx.restore();
    }
    if (scene.centerCards.player) {
      const c = scene.centerCards.player;
      const pop = Math.min(1, (time - c.t0) * 4);
      drawCardFace(ctx, c.card.def, W / 2 + 96, 330, { scale: 0.72 * (0.6 + 0.4 * pop), resonate: c.resonance });
      ctx.save();
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('YOU PLAYED', W / 2 + 96, 330 - 74);
      ctx.restore();
    }

    // --- Player (bottom) ---
    drawLifeBar(ctx, 44, H - 196, 300, state.player.life, 'YOUR LIFE', '#ff5c47');
    drawStatusChips(ctx, 48, H - 168, state.player);

    // Energy pips.
    ctx.save();
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillStyle = '#ffb35c';
    ctx.textAlign = 'left';
    ctx.fillText('EMBER ENERGY', 44, H - 268);
    for (let i = 0; i < state.energyMax; i += 1) {
      ctx.beginPath();
      ctx.arc(56 + i * 30, H - 246, 11, 0, Math.PI * 2);
      ctx.fillStyle = i < state.energy ? '#ff9d2e' : 'rgba(255,157,46,0.22)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#a85a00';
      ctx.stroke();
    }
    ctx.fillStyle = '#f3e6cf';
    ctx.font = '16px Georgia, serif';
    ctx.fillText(`${state.energy} / ${state.energyMax}`, 56 + state.energyMax * 30 + 8, H - 240);
    ctx.fillText(`Deck ${state.player.deck.length} · Discard ${state.player.discard.length}`, 44, H - 140);
    ctx.restore();

    // End Turn button.
    const btn = { x: W - 224, y: H - 250, w: 180, h: 56 };
    hit.endTurn = btn;
    ctx.save();
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
    ctx.fillStyle = scene.busy ? '#6b5136' : '#ff7a3c';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd94d';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 21px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('END TURN ⏎', btn.x + btn.w / 2, btn.y + 37);
    ctx.restore();

    // Player hand: sprites glide to their slots.
    const slots = layoutHand(state.player.hand.length, W, H);
    const seen = new Set();
    state.player.hand.forEach((card, i) => {
      seen.add(card.uid);
      let s = sprites.get(card.uid);
      if (!s) {
        s = { x: W - 90, y: H - 320, rot: 0.4 };
        sprites.set(card.uid, s);
      }
      const slot = slots[i];
      const raised = scene.selected === i || scene.hover === i;
      const targetY = slot.y - (raised ? 26 : 0);
      s.x += (slot.x - s.x) * 0.22;
      s.y += (targetY - s.y) * 0.22;
      s.rot += (slot.rot - s.rot) * 0.22;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      const affordable = card.def.cost <= state.energy;
      drawCardFace(ctx, card.def, 0, 0, {
        scale: raised ? 1.06 : 1,
        dim: !affordable,
        resonate: state.player.lastSuit === card.def.suit,
      });
      ctx.restore();
      hit.cards.push({ x: s.x - CARD_W / 2, y: s.y - CARD_H / 2 - (raised ? 10 : 0), w: CARD_W, h: CARD_H + 10, index: i });
    });
    for (const uid of [...sprites.keys()]) {
      if (!seen.has(uid)) sprites.delete(uid);
    }

    // Floaters: damage / heal numbers rising and fading.
    ctx.save();
    ctx.textAlign = 'center';
    for (const f of scene.floaters) {
      const age = time - f.t0;
      if (age > 1.4) continue;
      ctx.globalAlpha = 1 - age / 1.4;
      ctx.fillStyle = f.color;
      ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText(f.text, f.x, f.y - age * 46);
    }
    ctx.restore();
  }

  function drawEnd(scene, won) {
    drawTable(scene);
    const { W, H, time } = scene;
    ctx.save();
    ctx.fillStyle = won ? 'rgba(24,10,2,0.78)' : 'rgba(6,4,16,0.82)';
    ctx.fillRect(0, 0, W, H);
    if (won) {
      // Rising ember flourish.
      for (let i = 0; i < 60; i += 1) {
        const px = (i * 211) % W;
        const py = H - ((time * 90 + i * 61) % (H + 80)) + 40;
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 3 + i * 1.7);
        ctx.fillStyle = i % 3 ? '#ffb35c' : '#ffd94d';
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? '#ffd94d' : '#b9a8d9';
    ctx.font = 'bold 76px Georgia, serif';
    ctx.shadowColor = won ? 'rgba(255,140,40,0.9)' : 'rgba(90,60,160,0.9)';
    ctx.shadowBlur = 30;
    ctx.fillText(won ? 'VICTORY!' : 'DEFEAT', W / 2, 268);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f3e6cf';
    ctx.font = '27px Georgia, serif';
    ctx.fillText(
      won ? 'The Duchess bows — the Ember Court is yours.' : 'The Duchess keeps her throne… this time.',
      W / 2, 322,
    );
    ctx.font = '21px Georgia, serif';
    ctx.fillStyle = '#d9c39a';
    const st = scene.state;
    ctx.fillText(
      `Rounds: ${st.round} · Your life: ${st.player.life} · Duchess life: ${st.duchess.life}`,
      W / 2, 366,
    );
    const pulse = 0.75 + 0.25 * Math.sin(time * 3.2);
    ctx.globalAlpha = pulse;
    roundRect(ctx, W / 2 - 170, 420, 340, 58, 14);
    ctx.fillStyle = won ? '#ff7a3c' : '#5b3fa8';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('↻  PLAY AGAIN', W / 2, 457);
    ctx.restore();
    hit.anywhere = { x: 0, y: 0, w: W, h: H };
  }

  function draw(scene) {
    hit.anywhere = null;
    hit.endTurn = null;
    if (scene.screen === 'title') drawTitle(scene);
    else if (scene.screen === 'won') drawEnd(scene, true);
    else if (scene.screen === 'lost') drawEnd(scene, false);
    else drawTable(scene);
    return hit;
  }

  return { draw, hit };
}
