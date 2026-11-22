// Verification of a player-made level: is it solvable, with how many pieces,
// and what is the perfect layout (for stars and hints)?
import { parseLevel, simulate, PIECE } from '../engine/core.js';
import { solve } from '../engine/solver.js';

export function verifyDef(def, timeLimitMs = 15000, lib = { parseLevel, simulate, solve }) {
  try {
    const L = lib.parseLevel(def);
    if (lib.simulate(L, []).result === 'win') return { status: 'trivial' };
    const t0 = Date.now();
    const one = lib.solve(L, { countCap: 1, timeLimitMs });
    if (one.timedOut) return { status: 'timeout' };
    if (one.min === null) return { status: 'impossible' };
    const left = Math.max(1000, timeLimitMs - (Date.now() - t0));
    const best = lib.solve(L, { fireflies: true, countCap: 6, timeLimitMs: left });
    if (best.timedOut) return { status: 'partial', min: one.min, sol: enc(one.solutions[0]) };
    if (best.min === null) return { status: 'nofireflies', min: one.min, sol: enc(one.solutions[0]) };
    return {
      status: 'ok',
      min: one.min,
      par: best.min,
      n: best.solutions.length,
      sol: enc(best.solutions[0]),
      alt: best.solutions.slice(1).map(enc),
    };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

const enc = (list) => (list || []).map((p) => [p.idx, p.type, p.type === PIECE.ARROW ? p.dir : 0]);

/** Runs a verification in a Web Worker when possible, else on this thread. */
export function verifyAsync(def, timeLimitMs = 15000) {
  return new Promise((resolve) => {
    let worker = null;
    try {
      worker = new Worker(new URL('./verify-worker.js', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    if (!worker) {
      setTimeout(() => resolve(verifyDef(def, Math.min(timeLimitMs, 6000))), 30);
      return;
    }
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      worker.terminate();
      resolve(r);
    };
    worker.onmessage = (e) => finish(e.data);
    worker.onerror = () => {
      // Module workers unsupported: fall back to the main thread.
      done = true;
      worker.terminate();
      setTimeout(() => resolve(verifyDef(def, Math.min(timeLimitMs, 6000))), 30);
    };
    setTimeout(() => finish({ status: 'timeout' }), timeLimitMs + 3000);
    worker.postMessage({ id: 1, def, timeLimitMs });
  });
}
