// Ember Court — hand-in program (Node 22, standard library only).
//
// The deliverable is the static game under game/ (open game/index.html in a
// browser and play; no build step, no network). This program packages that
// game for the make.fun scorer: it empties the output directory's contents,
// copies game/ and screenshots/ across, and writes dossier.json using
// buildDossier from the vendored library in vendor/makefun-game.ts, so the
// dossier the scorer rebuilds from the same files matches byte for byte.
//
// Where the output goes: MAKEFUN_OUTPUT_DIR when set (local runs), else
// /output (the grader). The directory itself is never removed — the grader
// mounts it, so only its contents are cleared.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function emptyContents(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function copyTree(from: string, to: string): void {
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

emptyContents(outDir);
copyTree(join(here, 'game'), join(outDir, 'game'));
copyTree(join(here, 'screenshots'), join(outDir, 'screenshots'));

// Limits mirror the gate: 4 screenshots of at most 256 KiB each, at most
// 993 entries / 48 MiB under game/, paths at most 1000 bytes, and the
// dossier's source text capped at 160 KiB.
const dossierText = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossierText);
