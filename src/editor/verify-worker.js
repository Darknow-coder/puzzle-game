// Runs the exhaustive solver away from the main thread for the level editor.
import { parseLevel, simulate } from '../engine/core.js';
import { solve } from '../engine/solver.js';
import { verifyDef } from './verify.js';

self.onmessage = (e) => {
  const { id, def, timeLimitMs } = e.data;
  self.postMessage({ id, ...verifyDef(def, timeLimitMs, { parseLevel, simulate, solve }) });
};
