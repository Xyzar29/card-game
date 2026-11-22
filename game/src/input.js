// input.js — Ember Court mouse and keyboard input.
//
// Mouse: hover raises a card, click selects it and a second click plays it,
// the END TURN button ends the turn, and a click anywhere starts or
// restarts a duel on the title and end screens. Keyboard: 1–7 select a
// card (press again to play it), Enter/Space play the selected card or end
// the turn when nothing is selected, E ends the turn, arrows move the
// selection.

export function bindInput(canvas, handlers) {
  function posOf(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((evt.clientX - rect.left) / rect.width) * canvas.width,
      y: ((evt.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener('mousemove', (evt) => {
    handlers.onHover(posOf(evt));
  });

  canvas.addEventListener('click', (evt) => {
    handlers.onClick(posOf(evt));
  });

  window.addEventListener('keydown', (evt) => {
    if (evt.key >= '1' && evt.key <= '7') {
      handlers.onNumber(parseInt(evt.key, 10) - 1);
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      handlers.onConfirm();
    } else if (evt.key === 'e' || evt.key === 'E') {
      handlers.onEndTurn();
    } else if (evt.key === 'ArrowRight') {
      handlers.onMoveSelection(1);
    } else if (evt.key === 'ArrowLeft') {
      handlers.onMoveSelection(-1);
    }
  });
}

export function pointInRect(p, r) {
  return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
