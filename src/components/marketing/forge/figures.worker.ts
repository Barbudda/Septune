/// <reference lib="webworker" />
import { buildFigures } from "./structures";

/**
 * Builds the forge's figures off the main thread: on a phone the 25 600
 * points of five figures, sorted along their Hilbert curves, took 1.6 s of a
 * 4x-throttled main thread (measured 2026-11-02). The arrays are handed back
 * without a copy.
 */
self.onmessage = (e: MessageEvent<number>) => {
  const figures = buildFigures(e.data);
  const buffers = figures.flatMap((f) => [f.a.buffer, f.b.buffer, f.c.buffer]);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(figures, buffers);
};
