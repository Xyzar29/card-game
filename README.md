# Ember Court

An original turn-based card duel that plays offline in a desktop browser.
You face **the Duchess** of the Ashen Throne: 30 life each, an Ember energy
pool that grows every round, and four suits — Ember, Tide, Thorn and Moon —
each told apart by colour *and* shape.

![make.fun bounty](https://make.fun/badge/best-card-game-20261122-1826.svg)
![rank](https://make.fun/badge/best-card-game-20261122-1826/Xyzar29/card-game/rank.svg)
![reward](https://make.fun/badge/best-card-game-20261122-1826/Xyzar29/card-game/reward.svg)

Entered in make.fun's [Make the best card game](https://make.fun/bounty/best-card-game-20261122-1826) bounty.

## Play

Serve the `game/` folder with any static file server and open `index.html`
in desktop Chrome — no build step, no network requests:

```
node -e "const http=require('http'),fs=require('fs'),path=require('path');const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};http.createServer((req,res)=>{const p=path.join('game',req.url==='/'?'index.html':req.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(d)})}).listen(8080)"
```

Then visit http://localhost:8080.

## How it plays

- **Click a card** to select it, click again (or press Enter) to play it.
  Keys **1–7** select, **E** or the END TURN button ends your turn.
- Cards cost **Ember energy**; your pool grows by 1 each round (max 6) and
  refills every turn. Unaffordable cards are dimmed.
- Five card kinds: **attack**, **shield**, **poison** (damage over turns,
  slips past shields as it ticks), **heal** and **draw**.
- **Resonance:** playing a card of the same suit as your previous card
  triggers a bonus — more damage, more shield, longer poison, more healing
  or an extra card. Ordering your hand is the game.
- **The Duchess telegraphs her intent** — STRIKE, GUARD or SCHEME — in the
  badge at the top right. Shield up before a strike, poison her while she
  guards, and finish her before her own resonance chains finish you.
- Shields halve at the start of their owner's turn, so turtling decays.
- Win by reducing her to 0 life; lose if she reduces you first. Sounds are
  synthesized WebAudio — no audio files, nothing loads from the network.

## Layout

- `game/` — the game as static files (`index.html`, `css/court.css`, and
  `src/` modules: `cards.js` deck definitions, `engine.js` turn rules,
  `duchess.js` the AI, `render.js` drawing, `audio.js` sounds, `input.js`,
  `main.js` boot and game loop).
- `screenshots/` — real renders of the game, taken by its maker.
- `main.ts` — the Node 22 hand-in program: copies `game/` and `screenshots/`
  to the output directory and writes `dossier.json` with the vendored
  `vendor/makefun-game.ts` library.

## License

MIT — see `LICENSE`.
