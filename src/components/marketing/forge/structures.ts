/**
 * The forge field's structures, generated once on the CPU. Each one shows
 * what its chapter says:
 *   0 tree:   a site as a crawler reads it, a home page, sections, pages
 *   1 stream: deploys flowing through three checkpoints, with a defect
 *             caught at the pull request
 *   2 code:   a file seen as its lines; the line that breaks SEO lifts out
 *             and the file closes up
 *   3 sites:  25 small sites; as many light up as a plan watches (1, 5, 25)
 *
 * Per particle and structure, three RGBA float records:
 *   a = start point xyz, flow speed (fraction of its segment per second; 0 = still)
 *   b = end point xyz, phase along the segment
 *   c = order (crawl order or tier, 0..1), kind, size, extra
 */

import { CHILDREN, DEPTH } from "./shape";

export const KIND = { flow: 0, node: 1, dust: 2, defect: 3, shift: 5 } as const;

export type Structure = {
  a: Float32Array;
  b: Float32Array;
  c: Float32Array;
  /** Extent in its own units, used to fit the structure in its stage. */
  width: number;
  height: number;
};

type V3 = [number, number, number];

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function writer(count: number) {
  const a = new Float32Array(count * 4);
  const b = new Float32Array(count * 4);
  const c = new Float32Array(count * 4);
  let i = 0;
  return {
    a,
    b,
    c,
    get left() {
      return count - i;
    },
    put(p: V3, speed: number, q: V3, phase: number, order: number, kind: number, size: number, extra = 0) {
      if (i >= count) return;
      const k = i * 4;
      a[k] = p[0];
      a[k + 1] = p[1];
      a[k + 2] = p[2];
      a[k + 3] = speed;
      b[k] = q[0];
      b[k + 1] = q[1];
      b[k + 2] = q[2];
      b[k + 3] = phase;
      c[k] = order;
      c[k + 1] = kind;
      c[k + 2] = size;
      c[k + 3] = extra;
      i++;
    },
  };
}

const add = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const dist = (p: V3, q: V3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
/** Gaussian-ish point in a ball (sum of uniforms), radius r. */
const blob = (r: () => number, rad: number): V3 => [
  (r() + r() + r() - 1.5) * rad,
  (r() + r() + r() - 1.5) * rad,
  (r() + r() + r() - 1.5) * rad,
];

/** A segment that particles flow along at a given speed in units per second. */
function flowOn(w: ReturnType<typeof writer>, r: () => number, p: V3, q: V3, unitsPerSecond: number, thick: number, order: number, kind: number, size: number, extra = 0) {
  const j = blob(r, thick);
  const len = Math.max(0.05, dist(p, q));
  w.put(add(p, j), (unitsPerSecond * (0.7 + r() * 0.6)) / len, add(q, j), r(), order, kind, size, extra);
}

function dust(w: ReturnType<typeof writer>, r: () => number, sx: number, sy: number, sz: number, cy = 0) {
  while (w.left > 0) {
    const p: V3 = [(r() * 2 - 1) * sx, cy + (r() * 2 - 1) * sy, (r() * 2 - 1) * sz];
    w.put(p, 0, p, r(), r(), KIND.dust, 0.7);
  }
}

// ---------------------------------------------------------------- 0 · tree

/** a: the branch heading, in radians from vertical (negative left, positive right). */
type Node = { p: V3; depth: number; order: number; a: number };


/**
 * A wide canopy rising from one root: the home page at the bottom, its
 * sections fanning out left and right, pages at the tips. Side branches run
 * longer than the middle ones, so the crown is broad and low, like a tree
 * seen from a distance, and leaves room above it for the title.
 */
function makeTree(r: () => number) {
  const nodes: Node[] = [{ p: [0, 0, 0], depth: 0, order: 0, a: 0 }];
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (n.depth >= DEPTH) continue;
    const kids = CHILDREN[n.depth]!;
    for (let k = 0; k < kids; k++) {
      const spread = n.depth === 0 ? 2.7 : 0.95 * Math.pow(0.8, n.depth - 1);
      const a = n.a * (n.depth === 0 ? 1 : 1.04) + ((k + 0.5) / kids - 0.5) * spread + (r() - 0.5) * 0.2;
      const side = Math.min(1, Math.abs(Math.sin(a)) + 0.15);
      const len = (n.depth === 0 ? 0.7 : 0.72 * Math.pow(0.72, n.depth - 1)) * (0.62 + 0.45 * side) * (0.85 + r() * 0.3);
      const p = add(n.p, [Math.sin(a) * len * 1.1, Math.cos(a) * len * 0.85, (r() - 0.5) * len * 1.1]);
      nodes.push({ p, depth: n.depth + 1, order: (n.depth + 1 + r() * 0.6) / (DEPTH + 0.6), a });
      edges.push([i, nodes.length - 1]);
    }
  }
  return { nodes, edges };
}

function tree(count: number): Structure {
  const r = rng(11);
  const w = writer(count);
  const { nodes, edges } = makeTree(r);
  const edgeBudget = Math.floor(count * 0.54);
  const nodeBudget = Math.floor(count * 0.3);

  // The home page's links carry the most particles: thick near the root, fine at the tips.
  const weight = (d: number) => 1 + Math.pow(DEPTH - d, 1.7) * 0.45;
  const edgeW = edges.map(([p, q]) => dist(nodes[p]!.p, nodes[q]!.p) * weight(nodes[q]!.depth));
  const edgeSum = edgeW.reduce((s, x) => s + x, 0);
  edges.forEach(([p, q], e) => {
    const n = Math.round((edgeBudget * edgeW[e]!) / edgeSum);
    const child = nodes[q]!;
    const thick = 0.01 + (DEPTH - child.depth) * 0.009;
    // Crawler flow: from the parent page to the page it links to.
    for (let k = 0; k < n; k++) flowOn(w, r, nodes[p]!.p, child.p, 0.32, thick, child.order, KIND.flow, 1);
  });

  const nodeW = nodes.map((n) => 1 + (DEPTH - n.depth) * 0.5);
  const nodeSum = nodeW.reduce((s, x) => s + x, 0);
  nodes.forEach((n, i) => {
    const m = Math.round((nodeBudget * nodeW[i]!) / nodeSum);
    const rad = 0.022 + (DEPTH - n.depth) * 0.012;
    for (let k = 0; k < m; k++) {
      const p = add(n.p, blob(r, rad));
      w.put(p, 0, p, r(), n.order, KIND.node, 1.25);
    }
  });

  dust(w, r, 3, 1.3, 1.5, -0.1);
  return { ...w, width: 5.6, height: 2.3 };
}

// ---------------------------------------------------------------- 1 · stream

/** Gate positions: a third of the width apart, so each sits over one of the chapter's three columns. */
export const GATES = [-2.47, 0, 2.47];

function stream(count: number): Structure {
  const r = rng(23);
  const w = writer(count);
  const L = 3.6;
  // The deploys: a wide current across the frame.
  for (let k = 0, n = Math.floor(count * 0.52); k < n; k++) {
    const y = (r() + r() + r() - 1.5) * 0.17;
    const z = (r() + r() + r() - 1.5) * 0.2;
    const p: V3 = [-L, y, z];
    const q: V3 = [L, y + (r() - 0.5) * 0.04, z];
    w.put(p, (0.42 * (0.7 + r() * 0.6)) / (2 * L), q, r(), r(), KIND.flow, 0.95);
  }
  // Three checkpoints: rings the current runs through. The middle one is the pull request.
  GATES.forEach((x, g) => {
    for (let k = 0, n = Math.floor(count * 0.05); k < n; k++) {
      const t = r() * Math.PI * 2;
      const p: V3 = [x + (r() - 0.5) * 0.03, Math.cos(t) * 0.5 + (r() - 0.5) * 0.02, Math.sin(t) * 0.5 + (r() - 0.5) * 0.02];
      w.put(p, 0, p, r(), g / 2, KIND.node, 1.2, g === 1 ? 1 : 0);
    }
  });
  // The defect: pages that would leave Google ride the current and pile up at the pull request.
  for (let k = 0, n = Math.floor(count * 0.06); k < n; k++) {
    const y = (r() - 0.5) * 0.22;
    const z = (r() - 0.5) * 0.22;
    w.put([-L, y, z], (0.55 * (0.7 + r() * 0.6)) / L, [GATES[1]! - 0.05 - r() * 0.12, y * 0.6, z * 0.6], r(), r(), KIND.defect, 1.15);
  }
  dust(w, r, 3.7, 0.75, 0.7);
  return { ...w, width: 7.4, height: 1.3 };
}

// ---------------------------------------------------------------- 2 · code

const LINES = [
  [0, 2.1], [1, 1.5], [1, 1.9], [2, 1.0], [2, 2.3], [2, 1.65], [1, 1.25], [1, 2.0], [2, 0.95], [1, 1.45], [0, 0.6],
] as const;
/** The line that sets noindex. */
const BAD = 5;
const LINE_H = 0.15;

function code(count: number): Structure {
  const r = rng(37);
  const w = writer(count);
  const total = LINES.reduce((s, [, len]) => s + len, 0);
  const budget = Math.floor(count * 0.72);
  LINES.forEach(([indent, len], li) => {
    const y = 0.75 - li * LINE_H;
    const x0 = -1.55 + indent * 0.22;
    const kind = li === BAD ? KIND.defect : li > BAD ? KIND.shift : KIND.flow;
    // A line is a few tokens with spaces between them; each token gets a tone
    // (c.x), so the file reads as highlighted code rather than bars.
    const tokens: [number, number, number][] = [];
    for (let x = x0; x < x0 + len - 0.05; ) {
      const tl = Math.min(x0 + len - x, 0.12 + r() * 0.42);
      tokens.push([x, tl, r()]);
      x += tl + 0.07;
    }
    const tokenLen = tokens.reduce((s, [, tl]) => s + tl, 0);
    for (const [tx, tl, tone] of tokens) {
      for (let k = 0, n = Math.round(((budget * len) / total) * (tl / tokenLen)); k < n; k++) {
        const dy = (r() - 0.5) * 0.04;
        const z = (r() - 0.5) * 0.06;
        // Read left to right, slowly, like a cursor going over the file.
        w.put([tx, y + dy, z], (0.08 * (0.7 + r() * 0.6)) / tl, [tx + tl, y + dy, z], r(), tone, kind, 1, li > BAD ? LINE_H : 0);
      }
    }
  });
  dust(w, r, 2, 1.1, 0.6);
  return { ...w, width: 3.6, height: 1.9 };
}

// ---------------------------------------------------------------- 3 · sites

function sites(count: number): Structure {
  const r = rng(53);
  const w = writer(count);
  const centres: { c: V3; s: number; order: number }[] = [{ c: [0, 0, 0], s: 1.45, order: 0 }];
  for (let k = 0; k < 4; k++) {
    const t = Math.PI / 4 + (k * Math.PI) / 2;
    centres.push({ c: [Math.cos(t) * 0.82, Math.sin(t) * 0.52, (r() - 0.5) * 0.3], s: 1.05, order: 0.12 });
  }
  for (let k = 0; k < 20; k++) {
    const t = (k / 20) * Math.PI * 2 + (r() - 0.5) * 0.15;
    const rad = 1.42 + (r() - 0.5) * 0.25;
    centres.push({ c: [Math.cos(t) * rad * 1.22, Math.sin(t) * rad * 0.64, (r() - 0.5) * 0.6], s: 0.82, order: 0.5 + k * 0.01 });
  }
  const per = Math.floor((count * 0.88) / centres.length);
  centres.forEach(({ c, s, order }) => {
    // A small site: a home page, one section, three pages.
    const root = add(c, [0, -0.2 * s, 0]);
    const mid = add(c, [0, 0.02 * s, 0]);
    const leaves: V3[] = [add(c, [-0.17 * s, 0.17 * s, 0.03]), add(c, [0, 0.21 * s, -0.04]), add(c, [0.17 * s, 0.17 * s, 0.02])];
    const segs: [V3, V3][] = [[root, mid], ...leaves.map((l) => [mid, l] as [V3, V3])];
    for (let k = 0; k < per; k++) {
      if (k % 5 < 3) {
        const [p, q] = segs[k % segs.length]!;
        flowOn(w, r, p, q, 0.12, 0.008, order, KIND.flow, 0.9);
      } else {
        const n = [root, mid, ...leaves][k % 5 === 3 ? 0 : 2 + (k % 3)]!;
        const p = add(n, blob(r, 0.035 * s));
        w.put(p, 0, p, r(), order, KIND.node, 1.1);
      }
    }
  });
  dust(w, r, 2.1, 1.2, 0.8);
  return { ...w, width: 4.1, height: 2.2 };
}

/**
 * Centres a structure on its own bounding box (dust excluded) and measures
 * it, so the page can fit any picture into any box: a tree grows from its
 * root, and would otherwise sit low in its stage.
 */
function centred(s: Structure): Structure {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let k = 0; k < s.a.length; k += 4) {
    if (s.c[k + 1] === KIND.dust) continue;
    for (const arr of [s.a, s.b]) {
      x0 = Math.min(x0, arr[k]!);
      x1 = Math.max(x1, arr[k]!);
      y0 = Math.min(y0, arr[k + 1]!);
      y1 = Math.max(y1, arr[k + 1]!);
      z0 = Math.min(z0, arr[k + 2]!);
      z1 = Math.max(z1, arr[k + 2]!);
    }
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  for (let k = 0; k < s.a.length; k += 4) {
    for (const arr of [s.a, s.b]) {
      arr[k] = arr[k]! - cx;
      arr[k + 1] = arr[k + 1]! - cy;
      arr[k + 2] = arr[k + 2]! - cz;
    }
  }
  return { ...s, width: (x1 - x0) * 1.04, height: (y1 - y0) * 1.04 };
}

/** All structures for side² particles, in sculpture-id order. */
export function buildStructures(count: number): Structure[] {
  return [tree(count), stream(count), code(count), sites(count)].map(centred);
}
