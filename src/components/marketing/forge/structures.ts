/**
 * The forge field's figures, generated once on the CPU. Each one draws the
 * nouns of its sentence with page cards, so a first-time visitor reads it
 * without a caption:
 *   0 globe: a site's pages around the globe, a scan ring passing (the hero)
 *   1 tree:  septune.dev's own 93 pages as a sitemap, read from the top
 *   2 gate:  pages falling through the pull-request check; the one that
 *            would leave Google stops on it
 *   3 code:  the page's file; the noindex line slides out, the file closes up
 *   4 sites: 25 sites in windows; as many light up as a plan watches
 *
 * Per particle and figure, three RGBA float records:
 *   a = start xyz, flow speed (fraction of its segment per second; 0 = still)
 *   b = end xyz, phase along the segment
 *   c = order (crawl order, tier, token tone), kind, size, extra
 *
 * Records are sorted along a Hilbert curve of their place in the figure, so
 * particle i sits in the same region of every figure and a morph moves each
 * particle a short way instead of across the stage.
 */

export const FIGURE = { globe: 0, tree: 1, gate: 2, code: 3, sites: 4 } as const;

export const KIND = { line: 0, text: 1, dust: 2, accent: 3, flow: 4, shift: 5, title: 6, scan: 7, held: 8, gate: 9 } as const;

export type Structure = {
  a: Float32Array;
  b: Float32Array;
  c: Float32Array;
  /** Extent in its own units, used to fit the figure in its stage. */
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

type Writer = ReturnType<typeof writer>;

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

// ---------------------------------------------------------------- drawing

/** A plane in space: origin, right and up unit vectors. Cards are drawn in it. */
type Plane = { o: V3; u: V3; v: V3 };
const FLAT = (x: number, y: number, z = 0): Plane => ({ o: [x, y, z], u: [1, 0, 0], v: [0, 1, 0] });
const on = (f: Plane, x: number, y: number): V3 => [
  f.o[0] + f.u[0] * x + f.v[0] * y,
  f.o[1] + f.u[1] * x + f.v[1] * y,
  f.o[2] + f.u[2] * x + f.v[2] * y,
];

/** What a particle carries besides its place: crawl order or tone, kind, size, extra. */
type Ink = { order: number; kind: number; size: number; extra?: number };

/**
 * n points along a rounded rectangle's outline, evenly spaced (stratified),
 * so the edge reads as a drawn line rather than a scatter.
 */
function outline(w: Writer, r: () => number, f: Plane, W: number, H: number, rad: number, n: number, ink: Ink, motion?: Motion) {
  const straightW = W - 2 * rad;
  const straightH = H - 2 * rad;
  const arc = (Math.PI / 2) * rad;
  const L = 2 * straightW + 2 * straightH + 4 * arc;
  for (let k = 0; k < n; k++) {
    let s = ((k + r()) / n) * L;
    let x = 0;
    let y = 0;
    // Top edge, right corner, right edge, ... clockwise from the top-left.
    const segs: [number, (t: number) => [number, number]][] = [
      [straightW, (t) => [-W / 2 + rad + t, H / 2]],
      [arc, (t) => corner(W / 2 - rad, H / 2 - rad, rad, Math.PI / 2 - t / rad)],
      [straightH, (t) => [W / 2, H / 2 - rad - t]],
      [arc, (t) => corner(W / 2 - rad, -H / 2 + rad, rad, -t / rad)],
      [straightW, (t) => [W / 2 - rad - t, -H / 2]],
      [arc, (t) => corner(-W / 2 + rad, -H / 2 + rad, rad, -Math.PI / 2 - t / rad)],
      [straightH, (t) => [-W / 2, -H / 2 + rad + t]],
      [arc, (t) => corner(-W / 2 + rad, H / 2 - rad, rad, Math.PI - t / rad)],
    ];
    for (const [len, at] of segs) {
      if (s <= len) {
        [x, y] = at(s);
        break;
      }
      s -= len;
    }
    put(w, r, on(f, x, y), ink, motion, 0.0025);
  }
}
const corner = (cx: number, cy: number, rad: number, ang: number): [number, number] => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];

/** n points along a thin horizontal bar (a line of text, a token, a rule). */
function bar(w: Writer, r: () => number, f: Plane, x0: number, y: number, len: number, n: number, ink: Ink, motion?: Motion, thick = 0.006) {
  for (let k = 0; k < n; k++) {
    const x = x0 + ((k + r()) / n) * len;
    put(w, r, on(f, x, y + (r() - 0.5) * thick), ink, motion, 0.0015);
  }
}

/** n still points along a segment between two points in space. */
function segment(w: Writer, r: () => number, p: V3, q: V3, n: number, ink: Ink) {
  for (let k = 0; k < n; k++) {
    const t = (k + r()) / n;
    const at: V3 = [
      p[0] + (q[0] - p[0]) * t + (r() - 0.5) * 0.002,
      p[1] + (q[1] - p[1]) * t + (r() - 0.5) * 0.002,
      p[2] + (q[2] - p[2]) * t,
    ];
    w.put(at, 0, at, r(), ink.order, ink.kind, ink.size, ink.extra ?? 0);
  }
}

/** How a card moves when it is not still: along a segment, at a speed, from a phase. */
type Motion = { by: V3; speed: number; phase: number };

/** Writes one point, still (end = start) or travelling by `motion.by`. */
function put(w: Writer, r: () => number, p: V3, ink: Ink, motion: Motion | undefined, jitter: number) {
  const j: V3 = [(r() - 0.5) * jitter, (r() - 0.5) * jitter, (r() - 0.5) * jitter];
  const at: V3 = [p[0] + j[0], p[1] + j[1], p[2] + j[2]];
  if (!motion) {
    w.put(at, 0, at, r(), ink.order, ink.kind, ink.size, ink.extra ?? 0);
    return;
  }
  const to: V3 = [at[0] + motion.by[0], at[1] + motion.by[1], at[2] + motion.by[2]];
  w.put(at, motion.speed, to, motion.phase, ink.order, ink.kind, ink.size, ink.extra ?? 0);
}

/**
 * A page card: outline, a title line and a few lines of text, inside a plane.
 * `lines` are the text lines' lengths as a fraction of the inner width.
 */
function card(
  w: Writer,
  r: () => number,
  f: Plane,
  W: number,
  H: number,
  n: number,
  opts: { ink: Ink; text?: Ink; title?: Ink; lines?: number[]; rad?: number; motion?: Motion; bars?: boolean },
) {
  const lines = opts.lines ?? [0.82, 0.64, 0.74];
  const rad = opts.rad ?? Math.min(W, H) * 0.09;
  const pad = W * 0.16;
  const inner = W - 2 * pad;
  const perimeter = 2 * (W + H);
  const textLen = inner * (0.55 + lines.reduce((s, x) => s + x, 0));
  const nOutline = Math.round((n * perimeter) / (perimeter + textLen * 1.25));
  outline(w, r, f, W, H, rad, nOutline, opts.ink, opts.motion);
  const rest = n - nOutline;
  const top = H / 2 - pad * 1.05;
  const pitch = Math.min((H - 2 * pad) / (lines.length + 1.6), H * 0.16);
  // The title: a shorter, denser line.
  const nTitle = Math.round(rest * 0.3);
  bar(w, r, f, -W / 2 + pad, top, inner * 0.55, nTitle, opts.title ?? opts.ink, opts.motion, 0.012);
  const per = lines.length ? Math.floor((rest - nTitle) / lines.length) : 0;
  lines.forEach((len, i) => {
    bar(w, r, f, -W / 2 + pad, top - pitch * (1.5 + i), inner * len, per, opts.text ?? opts.ink, opts.motion);
  });
}

function dust(w: Writer, r: () => number, n: number, sx: number, sy: number, sz: number) {
  for (let k = 0; k < n; k++) {
    const p: V3 = [(r() * 2 - 1) * sx, (r() * 2 - 1) * sy, (r() * 2 - 1) * sz];
    w.put(p, 0, p, r(), r(), KIND.dust, 0.6);
  }
}

/** Whatever budget is left goes to the last element drawn, so no particle is unplaced. */
function fill(w: Writer, r: () => number, sx: number, sy: number, sz: number) {
  if (w.left > 0) dust(w, r, w.left, sx, sy, sz);
}

// ---------------------------------------------------------------- 0 · globe

/**
 * 64 page cards set tangent to a sphere, a few links between neighbours, and
 * a ring that sweeps the latitudes: a site's pages, out in the web, checked.
 * The spin and the ring's sweep are computed in the shader.
 */
function globe(count: number): Structure {
  const r = rng(7);
  const w = writer(count);
  const R = 1.6;
  const CARDS = 64;
  const ringN = Math.floor(count * 0.05);
  const linkN = Math.floor(count * 0.06);
  const dustN = Math.floor(count * 0.03);
  const per = Math.floor((count - ringN - linkN - dustN) / CARDS);

  const normals: V3[] = [];
  for (let i = 0; i < CARDS; i++) {
    const y = 1 - (2 * (i + 0.5)) / CARDS;
    const rad = Math.sqrt(1 - y * y);
    const th = i * Math.PI * (3 - Math.sqrt(5));
    normals.push([Math.cos(th) * rad, y, Math.sin(th) * rad]);
  }
  normals.forEach((n, i) => {
    const len = Math.hypot(n[2], n[0]) || 1;
    const u: V3 = [n[2] / len, 0, -n[0] / len];
    const v: V3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    const plane: Plane = { o: [n[0] * R, n[1] * R, n[2] * R], u, v };
    // extra = the card's height on the sphere, so the scan ring lights it as it passes.
    card(w, r, plane, 0.34, 0.44, per, {
      ink: { order: i / CARDS, kind: KIND.line, size: 1, extra: n[1] },
      title: { order: i / CARDS, kind: KIND.title, size: 1.1, extra: n[1] },
      text: { order: i / CARDS, kind: KIND.text, size: 0.9, extra: n[1] },
      lines: i % 3 === 0 ? [0.86, 0.6] : [0.8, 0.66, 0.72],
    });
  });

  // Links: a short arc from each card to its nearest neighbour, on the sphere.
  const perLink = Math.max(1, Math.floor(linkN / CARDS));
  normals.forEach((n, i) => {
    let best = -1;
    let bestD = Infinity;
    normals.forEach((m, j) => {
      if (j === i) return;
      const d = Math.hypot(n[0] - m[0], n[1] - m[1], n[2] - m[2]);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    const m = normals[best]!;
    for (let k = 0; k < perLink; k++) {
      const t = (k + r()) / perLink;
      const p: V3 = [n[0] + (m[0] - n[0]) * t, n[1] + (m[1] - n[1]) * t, n[2] + (m[2] - n[2]) * t];
      const l = Math.hypot(p[0], p[1], p[2]) || 1;
      const q: V3 = [(p[0] / l) * R * 1.01, (p[1] / l) * R * 1.01, (p[2] / l) * R * 1.01];
      w.put(q, 0, q, r(), i / CARDS, KIND.text, 0.7, p[1] / l);
    }
  });

  // The scan ring: unit directions around the vertical axis; the shader sets its latitude.
  for (let k = 0; k < ringN; k++) {
    const t = ((k + r()) / ringN) * Math.PI * 2;
    const p: V3 = [Math.cos(t), 0, Math.sin(t)];
    w.put(p, 0, p, r(), 0, KIND.scan, 1.05, R * 1.06);
  }
  dust(w, r, dustN, 2.6, 2.1, 1.4);
  fill(w, r, 2.6, 2.1, 1.4);
  return { ...w, width: 0, height: 0 };
}

// ---------------------------------------------------------------- 1 · tree

/**
 * septune.dev as Septune crawled it on 2026-11-01: 93 pages. The home page;
 * the 16 pages it links to (audit, pricing, changelog, the docs, the five
 * framework pages, the two tools, the legal and account pages); then the 76
 * pages one step deeper (the agent guide and the 69 check pages under the
 * docs, the six framework guides). Crawl order is breadth first, which is the
 * order the front reads them in the shader.
 */
export const TREE_PAGES = 93;
const ROW1 = 16;
const GRID = TREE_PAGES - 1 - ROW1;
const COLS = 11;

function tree(count: number): Structure {
  const r = rng(11);
  const w = writer(count);
  const dustN = Math.floor(count * 0.02);
  const wireN = Math.floor(count * 0.1);
  const cardsN = count - dustN - wireN;
  // Bigger cards get more particles; weights by perimeter.
  const homeW = 0.5;
  const homeH = 0.36;
  const r1W = 0.17;
  const r1H = 0.23;
  const gW = 0.2;
  const gH = 0.27;
  const weight = (W: number, H: number) => W + H;
  const total = weight(homeW, homeH) + ROW1 * weight(r1W, r1H) + GRID * weight(gW, gH);
  const share = (W: number, H: number) => Math.floor((cardsN * weight(W, H)) / total);

  const homeY = 1.45;
  const row1Y = 0.78;
  const r1Pitch = 0.215;
  const gPitchX = 0.29;
  const gPitchY = 0.4;
  const gTop = 0.15;
  const r1x = (i: number) => (i - (ROW1 - 1) / 2) * r1Pitch;
  const gx = (j: number) => (j - (COLS - 1) / 2) * gPitchX;
  const gy = (row: number) => gTop - row * gPitchY;
  const DOCS = 7;

  // Crawl order: the home page, then the pages it links to left to right, then row by row.
  const orderHome = 0;
  const orderRow1 = (i: number) => 0.04 + (i / ROW1) * 0.16;
  const orderGrid = (k: number) => 0.24 + (k / GRID) * 0.76;

  const ink = (order: number, kind: number, size: number): Ink => ({ order, kind, size });
  const draw = (x: number, y: number, W: number, H: number, order: number, lines: number[]) =>
    card(w, r, FLAT(x, y, (r() - 0.5) * 0.04), W, H, share(W, H), {
      ink: ink(order, KIND.line, 1),
      title: ink(order, KIND.title, 1.1),
      text: ink(order, KIND.text, 0.9),
      lines,
    });

  draw(0, homeY, homeW, homeH, orderHome, [0.84, 0.7, 0.78]);
  for (let i = 0; i < ROW1; i++) draw(r1x(i), row1Y, r1W, r1H, orderRow1(i), [0.8, 0.62]);
  for (let k = 0; k < GRID; k++) draw(gx(k % COLS), gy(Math.floor(k / COLS)), gW, gH, orderGrid(k), [0.78, 0.58]);

  // Wires: home to a bus, the bus to each linked page; the docs to a second
  // bus over the deeper pages, then down each column. A wire lights with the
  // page it leads to.
  const wires: [V3, V3, number][] = [];
  const bus1 = homeY - homeH / 2 - 0.15;
  wires.push([[0, homeY - homeH / 2, 0], [0, bus1, 0], orderRow1(0)]);
  wires.push([[r1x(0), bus1, 0], [r1x(ROW1 - 1), bus1, 0], orderRow1(0)]);
  for (let i = 0; i < ROW1; i++) wires.push([[r1x(i), bus1, 0], [r1x(i), row1Y + r1H / 2, 0], orderRow1(i)]);
  const bus2 = gTop + gH / 2 + 0.13;
  wires.push([[r1x(DOCS), row1Y - r1H / 2, 0], [r1x(DOCS), bus2, 0], orderGrid(0)]);
  wires.push([[gx(0), bus2, 0], [gx(COLS - 1), bus2, 0], orderGrid(0)]);
  for (let j = 0; j < COLS; j++) {
    wires.push([[gx(j), bus2, 0], [gx(j), gTop + gH / 2, 0], orderGrid(j)]);
    for (let row = 0; (row + 1) * COLS + j < GRID; row++) {
      wires.push([[gx(j), gy(row) - gH / 2, 0], [gx(j), gy(row + 1) + gH / 2, 0], orderGrid((row + 1) * COLS + j)]);
    }
  }
  const wireLen = wires.reduce((s, [p, q]) => s + Math.hypot(q[0] - p[0], q[1] - p[1]), 0);
  for (const [p, q, order] of wires) {
    const n = Math.round((wireN * Math.hypot(q[0] - p[0], q[1] - p[1])) / wireLen);
    segment(w, r, p, q, n, { order, kind: KIND.line, size: 0.8 });
  }

  dust(w, r, dustN, 2.1, 2.5, 0.8);
  fill(w, r, 2.1, 2.5, 0.8);
  return { ...w, width: 0, height: 0 };
}

// ---------------------------------------------------------------- 2 · gate

/** Where the check sits, and where the page it stops comes to rest. */
export const GATE_Y = 0;
const LANES = [-1.12, 1.12];

/**
 * Pages fall from the preview (top) to production (bottom) through the
 * pull-request check, a slot across the figure. Two lanes keep flowing; in
 * the middle one the page that would leave Google comes down and stops on
 * the check, which turns to the accent under it (the shader, from st.x).
 */
function gate(count: number): Structure {
  const r = rng(23);
  const w = writer(count);
  const dustN = Math.floor(count * 0.025);
  const gateN = Math.floor(count * 0.16);
  const heldN = Math.floor(count * 0.12);
  const flowN = count - dustN - gateN - heldN;
  const W = 0.78;
  const H = 1;
  const top = 2.25;
  const fall = 4.5;
  const PER_LANE = 3;
  // About fifteen seconds from the preview to production: calm, readable.
  const speed = 1 / 15;
  const perCard = Math.floor(flowN / (LANES.length * PER_LANE));
  LANES.forEach((x, lane) => {
    for (let k = 0; k < PER_LANE; k++) {
      const motion: Motion = { by: [0, -fall, 0], speed, phase: (k + lane * 0.5) / PER_LANE };
      card(w, r, FLAT(x, top, 0), W, H, perCard, {
        ink: { order: 0, kind: KIND.flow, size: 1 },
        title: { order: 0, kind: KIND.flow, size: 1.1 },
        text: { order: 0.5, kind: KIND.flow, size: 0.9 },
        lines: [0.82, 0.6, 0.72],
        motion,
      });
    }
  });

  // The held page starts above the frame; the shader brings it down onto the check.
  card(w, r, FLAT(0, GATE_Y + 0.69, 0), W, H, heldN, {
    ink: { order: 0, kind: KIND.held, size: 1.1 },
    title: { order: 0, kind: KIND.held, size: 1.2 },
    text: { order: 0.5, kind: KIND.held, size: 0.95 },
    lines: [0.82, 0.6, 0.72],
  });

  // The check: a long slot, two rails and their ends. extra = x, so the shader lights the middle.
  const half = 1.78;
  const slot = 0.13;
  const railN = Math.floor(gateN * 0.44);
  for (const y of [GATE_Y + slot, GATE_Y - slot]) {
    for (let k = 0; k < railN; k++) {
      const x = -half + ((k + r()) / railN) * half * 2;
      const p: V3 = [x, y + (r() - 0.5) * 0.008, 0];
      w.put(p, 0, p, r(), 0, KIND.gate, 1.15, x);
    }
  }
  const capN = Math.floor((gateN - railN * 2) / 2);
  for (const x of [-half, half]) {
    for (let k = 0; k < capN; k++) {
      const p: V3 = [x, GATE_Y - slot + ((k + r()) / capN) * slot * 2, 0];
      w.put(p, 0, p, r(), 0, KIND.gate, 1.15, x);
    }
  }
  dust(w, r, dustN, 1.9, 2.4, 0.7);
  fill(w, r, 1.9, 2.4, 0.7);
  return { ...w, width: 0, height: 0 };
}

// ---------------------------------------------------------------- 3 · code

/**
 * The page's file, the one the patch on the page shows. Token widths follow
 * the real characters, at a fixed advance, so it reads as code.
 */
const SOURCE: [indent: number, tokens: [text: string, tone: number][]][] = [
  [0, [["export", 0], ["const", 0], ["metadata", 1], ["= {", 2]]],
  [1, [["title:", 1], ['"Pricing",', 3]]],
  [1, [["description:", 1], ['"Plans and limits",', 3]]],
  [1, [["robots:", 1], ["{ index:", 2], ["false", 0], ["},", 2]]],
  [1, [["alternates:", 1], ["{", 2]]],
  [2, [["canonical:", 1], ['"/pricing",', 3]]],
  [1, [["},", 2]]],
  [0, [["};", 2]]],
  [0, []],
  [0, [["export", 0], ["default", 0], ["function", 0], ["Page()", 1], ["{", 2]]],
  [1, [["return", 0], ["<Pricing />;", 1]]],
  [0, [["}", 2]]],
];
/** The line that sets noindex. */
const BAD = 3;
const ADVANCE = 0.058;
const PITCH = 0.17;

function code(count: number): Structure {
  const r = rng(37);
  const w = writer(count);
  const dustN = Math.floor(count * 0.02);
  const frameN = Math.floor(count * 0.14);
  const gutterN = Math.floor(count * 0.06);
  const tokensN = count - dustN - frameN - gutterN;
  const FW = 3.0;
  const FH = 2.7;
  const top = FH / 2 - 0.62;
  const left = -FW / 2 + 0.52;

  // The window: outline, a rule under the file name, the file name itself.
  outline(w, r, FLAT(0, 0), FW, FH, 0.1, Math.floor(frameN * 0.62), { order: 2, kind: KIND.line, size: 0.95 });
  bar(w, r, FLAT(0, 0), -FW / 2, FH / 2 - 0.36, FW, Math.floor(frameN * 0.2), { order: 2, kind: KIND.text, size: 0.8 });
  bar(w, r, FLAT(0, 0), -FW / 2 + 0.2, FH / 2 - 0.18, "app/pricing/page.tsx".length * ADVANCE, frameN - Math.floor(frameN * 0.62) - Math.floor(frameN * 0.2), {
    order: 1,
    kind: KIND.title,
    size: 1,
  }, undefined, 0.02);

  const chars = SOURCE.reduce((s, [, tokens]) => s + tokens.reduce((t, [txt]) => t + txt.length, 0), 0);
  SOURCE.forEach(([indent, tokens], li) => {
    const y = top - li * PITCH;
    const kind = li === BAD ? KIND.accent : li > BAD ? KIND.shift : KIND.line;
    // extra: how far the line rises when the bad line has left.
    const extra = li > BAD ? PITCH : 0;
    // The line number in the gutter: a short mark, moving with its line.
    bar(w, r, FLAT(0, 0), -FW / 2 + 0.16, y, 0.1, Math.floor(gutterN / SOURCE.length), { order: 2, kind: li === BAD ? KIND.accent : kind, size: 0.75, extra }, undefined, 0.02);
    let x = left + indent * ADVANCE * 2;
    for (const [txt, tone] of tokens) {
      const len = txt.length * ADVANCE;
      const n = Math.round((tokensN * txt.length) / chars);
      // tone in order: 0 keyword, 1 name, 2 punctuation, 3 string
      bar(w, r, FLAT(0, 0), x, y, len, n, { order: tone, kind, size: 1, extra }, undefined, 0.03);
      x += len + ADVANCE;
    }
  });
  dust(w, r, dustN, 2, 1.7, 0.6);
  fill(w, r, 2, 1.7, 0.6);
  return { ...w, width: 0, height: 0 };
}

// ---------------------------------------------------------------- 4 · sites

/**
 * 25 sites, each a small browser window. Their order is how far they are
 * from the middle: 1 for Free, the 4 around it for Pro, all 25 for Studio.
 * The shader lights those whose order is under st.x and sweeps a check
 * across the lit ones.
 */
export const SITE_TIERS = [0.05, 0.2, 1.01];

function sites(count: number): Structure {
  const r = rng(53);
  const w = writer(count);
  const dustN = Math.floor(count * 0.025);
  const per = Math.floor((count - dustN) / 25);
  const W = 0.56;
  const H = 0.42;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const dx = col - 2;
      const dy = row - 2;
      const ring = Math.abs(dx) + Math.abs(dy);
      const order = ring === 0 ? 0 : ring === 1 ? 0.12 : 0.3 + (Math.hypot(dx, dy) / 3) * 0.6 + r() * 0.02;
      const x = dx * 0.68;
      const y = -dy * 0.56;
      // A shallow curve, like a wall of screens.
      const z = -0.16 * x * x;
      card(w, r, FLAT(x, y, z), W, H, per, {
        ink: { order, kind: KIND.line, size: 1 },
        title: { order, kind: KIND.title, size: 1.05 },
        text: { order, kind: KIND.text, size: 0.9 },
        lines: [0.8, 0.6],
        rad: 0.035,
      });
    }
  }
  dust(w, r, dustN, 2.1, 1.7, 0.8);
  fill(w, r, 2.1, 1.7, 0.8);
  return { ...w, width: 0, height: 0 };
}

// ---------------------------------------------------------------- finishing

/**
 * Centres a figure on its bounding box (dust excluded) and measures it, so
 * the page can fit any figure into any box. Flows count at both ends.
 */
function centred(s: Structure, sid: number): Structure {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let k = 0; k < s.a.length; k += 4) {
    const kind = s.c[k + 1];
    if (kind === KIND.dust || kind === KIND.scan) continue;
    for (const arr of [s.a, s.b]) {
      x0 = Math.min(x0, arr[k]!);
      x1 = Math.max(x1, arr[k]!);
      y0 = Math.min(y0, arr[k + 1]!);
      y1 = Math.max(y1, arr[k + 1]!);
      z0 = Math.min(z0, arr[k + 2]!);
      z1 = Math.max(z1, arr[k + 2]!);
    }
  }
  // The globe turns about its own centre: keep it at the origin.
  const cx = sid === FIGURE.globe ? 0 : (x0 + x1) / 2;
  const cy = sid === FIGURE.globe ? 0 : (y0 + y1) / 2;
  const cz = sid === FIGURE.globe ? 0 : (z0 + z1) / 2;
  for (let k = 0; k < s.a.length; k += 4) {
    if (s.c[k + 1] === KIND.scan) continue;
    for (const arr of [s.a, s.b]) {
      arr[k] = arr[k]! - cx;
      arr[k + 1] = arr[k + 1]! - cy;
      arr[k + 2] = arr[k + 2]! - cz;
    }
  }
  return { ...s, width: (x1 - x0) * 1.02, height: (y1 - y0) * 1.02 };
}

/** Index along a Hilbert curve on an n x n grid (n a power of two). */
function hilbert(n: number, x: number, y: number) {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0;
    const ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        x = n - 1 - x;
        y = n - 1 - y;
      }
      const t = x;
      x = y;
      y = t;
    }
  }
  return d;
}

/**
 * Sorts a figure's records by where they sit on a Hilbert curve across its
 * own box: particle i then lands in the same part of every figure, and each
 * one travels a short way when a figure turns into the next.
 */
function paired(s: Structure): Structure {
  const n = s.a.length / 4;
  const G = 1024;
  const keys = new Float64Array(n);
  const half = { w: s.width / 2 || 1, h: s.height / 2 || 1 };
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    // Where the particle mostly is: the middle of its segment for flows.
    const x = (s.a[k]! + s.b[k]!) / 2;
    const y = (s.a[k + 1]! + s.b[k + 1]!) / 2;
    const gx = Math.min(G - 1, Math.max(0, Math.floor(((x / half.w + 1) / 2) * G)));
    const gy = Math.min(G - 1, Math.max(0, Math.floor(((y / half.h + 1) / 2) * G)));
    keys[i] = hilbert(G, gx, gy) + i / n;
  }
  const idx = Array.from({ length: n }, (_, i) => i).sort((p, q) => keys[p]! - keys[q]!);
  const permute = (src: Float32Array) => {
    const out = new Float32Array(src.length);
    idx.forEach((from, to) => out.set(src.subarray(from * 4, from * 4 + 4), to * 4));
    return out;
  };
  return { a: permute(s.a), b: permute(s.b), c: permute(s.c), width: s.width, height: s.height };
}

/** All figures for `count` particles, in FIGURE order. */
export function buildFigures(count: number): Structure[] {
  return [globe(count), tree(count), gate(count), code(count), sites(count)].map((s, sid) => paired(centred(s, sid)));
}
