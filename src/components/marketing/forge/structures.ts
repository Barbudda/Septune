import { DEEP_PAGES, HOME_PAGE, LINKED_PAGES, NOINDEX_PAGES } from "./site-pages";

/**
 * The forge field's figures, generated once on the CPU. Each one draws the
 * nouns of its sentence with page cards, and some cards carry their words
 * (labels, drawn by the engine in the same space), so a first-time visitor
 * reads it without a caption:
 *   0 galaxy: septune.dev's 94 pages as a turning galaxy (the hero)
 *   1 tree:   the same 94 pages as a sitemap, read from the top
 *   2 gate:   pages falling through the pull-request check; the one that
 *             would leave Google stops on it
 *   3 code:   the page's file; the noindex line slides out, the file closes up
 *   4 sites:  25 sites in windows; as many light up as a plan watches
 *
 * Per particle and figure, three RGBA float records:
 *   a = start xyz, flow speed (fraction of its segment per second; 0 = still)
 *   b = end xyz, phase along the segment
 *   c = order (crawl order, tier, token tone), kind, size, extra
 * A kind with a quarter added (FACE) marks the faint dust that fills a page
 * card: it behaves as its kind and the shader dims it.
 *
 * Records are sorted along a Hilbert curve of their place in the figure, so
 * particle i sits in the same region of every figure and a morph moves each
 * particle a short way instead of across the stage.
 */

export const FIGURE = { galaxy: 0, tree: 1, gate: 2, code: 3, sites: 4 } as const;

export const KIND = { line: 0, text: 1, dust: 2, accent: 3, flow: 4, shift: 5, title: 6, scan: 7, held: 8, gate: 9, arm: 10 } as const;
export const FACE = 0.25;

/** How far the galaxy leans towards the viewer (radians about x), shared with scenes.ts. */
export const GALAXY_TILT = 0.4;
/** The galaxy's spin, radians per second: about four minutes a turn. The shader and the engine agree on it. */
export const GALAXY_SPIN = 0.026;

/** A line of words drawn with a figure, anchored in its space. */
export type Label = {
  text: string;
  /** The left end of the text (align 0) or its middle (0.5), at mid-height. */
  at: V3;
  /** Font size, in figure units. */
  size: number;
  align: number;
  /** 0 ink, 1 soft, 2 accent, 3 cyan. */
  tone: number;
  /** Its card's crawl order, kind and extra, so it follows and lights with the card. */
  ink: Ink;
  motion?: Motion;
};

export type Structure = {
  a: Float32Array;
  b: Float32Array;
  c: Float32Array;
  labels: Label[];
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

/** A normal deviate from two uniform ones (Box-Muller). */
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

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

/**
 * The crawl order of page i of septune.dev (0 the home page, 1-16 the pages
 * it links to, 17-92 the deeper ones), as the front reads them in the tree
 * and the galaxy, and as the read step's counter counts them.
 */
export const TREE_PAGES = 1 + LINKED_PAGES.length + DEEP_PAGES.length;
export const crawlOrder = (i: number) =>
  i === 0 ? 0 : i <= LINKED_PAGES.length ? 0.04 + ((i - 1) / LINKED_PAGES.length) * 0.16 : 0.24 + ((i - 1 - LINKED_PAGES.length) / DEEP_PAGES.length) * 0.76;

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
 * A page card: a haze of dust over its face, outline, a title line and a few
 * lines of text, inside a plane. `lines` are the text lines' lengths as a
 * fraction of the inner width. A `titled` card leaves its title line out:
 * a label stands there instead.
 */
function card(
  w: Writer,
  r: () => number,
  f: Plane,
  W: number,
  H: number,
  total: number,
  opts: { ink: Ink; text?: Ink; title?: Ink; lines?: number[]; rad?: number; motion?: Motion; titled?: boolean },
) {
  const lines = opts.lines ?? [0.82, 0.64, 0.74];
  // The face: a quarter of the card's points, spread evenly inside its edge
  // (galaxy dust, Hugo 2026-11-02: the page reads as a lit tile, not a sketch).
  const nFace = Math.round(total * 0.26);
  const faceInk = { ...opts.ink, kind: opts.ink.kind + FACE, size: opts.ink.size * 0.85 };
  for (let k = 0; k < nFace; k++) put(w, r, on(f, (r() - 0.5) * W * 0.94, (r() - 0.5) * H * 0.94), faceInk, opts.motion, 0.004);
  const n = total - nFace;
  const rad = opts.rad ?? Math.min(W, H) * 0.09;
  const pad = Math.min(W, H) * 0.16;
  const inner = W - 2 * pad;
  const perimeter = 2 * (W + H);
  const textLen = inner * ((opts.titled ? 0 : 0.55) + lines.reduce((s, x) => s + x, 0));
  const nOutline = textLen > 0 ? Math.round((n * perimeter) / (perimeter + textLen * 1.25)) : n;
  outline(w, r, f, W, H, rad, nOutline, opts.ink, opts.motion);
  const rest = n - nOutline;
  const top = H / 2 - pad * 1.05;
  const pitch = Math.min((H - 2 * pad) / (lines.length + 1.6), H * 0.16);
  // The title: a shorter, denser line, unless a label takes its place.
  const nTitle = opts.titled ? 0 : Math.round(rest * 0.3);
  if (nTitle) bar(w, r, f, -W / 2 + pad, top, inner * 0.55, nTitle, opts.title ?? opts.ink, opts.motion, 0.012);
  const per = lines.length ? Math.floor((rest - nTitle) / lines.length) : 0;
  lines.forEach((len, i) => {
    bar(w, r, f, -W / 2 + pad, top - pitch * (1.5 + i), inner * len, per, opts.text ?? opts.ink, opts.motion);
  });
}

/** Where a card's title stands, for its label: the card's top-left, inside its padding. */
const titleAt = (f: Plane, W: number, H: number): V3 => {
  const pad = Math.min(W, H) * 0.16;
  return on(f, -W / 2 + pad, H / 2 - pad * 1.05);
};

/** Monospaced width of a label: JetBrains Mono advances 0.6 em per character. */
const textWidth = (text: string, size: number) => text.length * 0.6 * size;

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

// ---------------------------------------------------------------- 0 · galaxy

/** The radius the deeper pages' arms reach, and where they start. */
const ARM_IN = 1.42;
const ARM_STEP = 0.07;
const ARM_WIND = 1.7;
const armAngle = (arm: number, rho: number) => arm * (Math.PI / 2) + 0.35 + ARM_WIND * (rho - ARM_IN);

/**
 * septune.dev as a galaxy, the hero: its 94 pages as tiles lying on a disc,
 * the home page at the core, the 17 pages it links to on a ring around it,
 * the 76 deeper pages along four arms, outwards in crawl order. Dust follows
 * the arms, a bulge lights the core, a few stars float around. The shader
 * spins it and lifts a dome under the cursor; the engine lights the page
 * being read and shows the paths near the cursor.
 */
function galaxy(count: number): Structure {
  const r = rng(7);
  const w = writer(count);
  const labels: Label[] = [];
  const armN = Math.floor(count * 0.36);
  const bulgeN = Math.floor(count * 0.1);
  const haloN = Math.floor(count * 0.03);
  const tilesN = count - armN - bulgeN - haloN;
  const HOME = [0.56, 0.4] as const;
  const RING = [0.27, 0.2] as const;
  const ARM = [0.15, 0.12] as const;
  const weight = (s: readonly [number, number]) => s[0] + s[1];
  const total = weight(HOME) + LINKED_PAGES.length * weight(RING) + DEEP_PAGES.length * weight(ARM);
  const share = (s: readonly [number, number]) => Math.floor((tilesN * weight(s)) / total);

  // A tile lying on the disc at radius rho and angle th: its width along the
  // orbit, its title towards the rim.
  const tile = (rho: number, th: number, size: readonly [number, number], i: number, path: string) => {
    const radial: V3 = [Math.cos(th), 0, Math.sin(th)];
    const plane: Plane = rho === 0 ? { o: [0, 0.02, 0], u: [1, 0, 0], v: [0, 0, -1] } : { o: [rho * radial[0], 0, rho * radial[2]], u: [-radial[2], 0, radial[0]], v: radial };
    const order = crawlOrder(i);
    card(w, r, plane, size[0], size[1], share(size), {
      ink: { order, kind: KIND.line, size: 1 },
      title: { order, kind: KIND.title, size: 1.1 },
      text: { order, kind: KIND.text, size: 0.9 },
      lines: i === 0 ? [0.84, 0.66, 0.76] : [0.8, 0.62],
    });
    // Its path floats just above it, facing the viewer; the engine says when.
    labels.push({
      text: path,
      at: [plane.o[0], 0.07 + size[1] * 0.12, plane.o[2]],
      size: i === 0 ? 0.11 : 0.072,
      align: 0.5,
      tone: NOINDEX_PAGES.has(path) ? 2 : 0,
      ink: { order, kind: KIND.line, size: 1, extra: i },
    });
  };

  tile(0, 0, HOME, 0, HOME_PAGE);
  LINKED_PAGES.forEach((path, i) => tile(0.9, (i / LINKED_PAGES.length) * Math.PI * 2 + 0.2, RING, i + 1, path));
  DEEP_PAGES.forEach((path, k) => {
    const arm = k % 4;
    const rho = ARM_IN + Math.floor(k / 4) * ARM_STEP;
    tile(rho, armAngle(arm, rho), ARM, k + 1 + LINKED_PAGES.length, path);
  });

  // The arms: dust along each spiral, wider and fainter outwards. order = radius.
  for (let k = 0; k < armN; k++) {
    const arm = k % 4;
    const rho = 0.45 + 2.6 * Math.pow(r(), 0.85);
    const th = armAngle(arm, rho) + (gauss(r) * (0.1 + 0.05 * rho)) / Math.max(rho, 0.4);
    const rr = rho + gauss(r) * 0.05;
    const p: V3 = [Math.cos(th) * rr, gauss(r) * 0.03 * (1 + 0.4 * rho), Math.sin(th) * rr];
    w.put(p, 0, p, r(), rr, KIND.arm, 1);
  }
  // The bulge: a flattened glow round the home page.
  for (let k = 0; k < bulgeN; k++) {
    const p: V3 = [gauss(r) * 0.36, gauss(r) * 0.11 + 0.03, gauss(r) * 0.36];
    w.put(p, 0, p, r(), Math.hypot(p[0], p[2]), KIND.arm, 1.1);
  }
  // A few stars around it.
  for (let k = 0; k < haloN; k++) {
    const rho = 3.4 * Math.sqrt(r());
    const th = r() * Math.PI * 2;
    const p: V3 = [Math.cos(th) * rho, gauss(r) * 0.3, Math.sin(th) * rho];
    w.put(p, 0, p, r(), r(), KIND.dust, 0.6);
  }
  fill(w, r, 3, 0.3, 3);
  // Its size as the viewer sees it, leaning by GALAXY_TILT: the disc's depth
  // foreshortened, plus its thickness.
  const R = 2.9;
  return { ...w, labels, width: 2 * R, height: 2 * R * Math.sin(GALAXY_TILT) + 0.35 };
}

// ---------------------------------------------------------------- 1 · tree

/**
 * septune.dev as Septune crawled it on 2026-11-02: 94 pages. The home page;
 * the 17 pages it links to, each card as wide as its name, in two rows by
 * kind (pages and frameworks, then tools, legal and account); then the 76
 * pages one step deeper (the agent guide, the 69 check pages, the six
 * framework guides) as small tiles. Crawl order is breadth first, which is
 * the order the front reads them in the shader; a page's name lights as it
 * is read.
 */
const TREE_FONT = 0.062;
const TREE_ROWS: { group?: string; pages: string[] }[][] = [
  [
    { pages: ["/audit", "/pricing", "/changelog", "/docs"] },
    { group: "/frameworks/", pages: ["/frameworks/nextjs", "/frameworks/nuxt", "/frameworks/astro", "/frameworks/sveltekit", "/frameworks/vite-react"] },
  ],
  [
    { group: "/tools/", pages: ["/tools/noindex-checker", "/tools/llms-txt-generator"] },
    { pages: ["/privacy", "/terms", "/legal"] },
    { group: "noindex, on purpose", pages: ["/login", "/signup", "/preorder"] },
  ],
];

function tree(count: number): Structure {
  const r = rng(11);
  const w = writer(count);
  const labels: Label[] = [];
  const dustN = Math.floor(count * 0.02);
  const wireN = Math.floor(count * 0.08);
  const cardsN = count - dustN - wireN;

  const FS = TREE_FONT;
  const PAD = 0.05;
  const GAP = 0.06;
  const GROUP_GAP = 0.16;
  const ROW_H = 0.26;
  const homeW = 0.78;
  const homeH = 0.42;
  const gW = 0.15;
  const gH = 0.19;
  const COLS = 19;
  const GRID = DEEP_PAGES.length;
  // In a group the card shows the name after the group's prefix.
  const nameOf = (path: string, group?: string) => (group?.startsWith("/") ? path.slice(group.length) : path);

  // Lay the two rows out: card widths from their names, centred.
  type Placed = { path: string; name: string; x: number; y: number; W: number };
  const homeY = 1.42;
  const rowY = [0.72, 0.28];
  const placed: Placed[] = [];
  const groups: { text: string; x: number; y: number }[] = [];
  TREE_ROWS.forEach((row, ri) => {
    const items = row.map((g) => g.pages.map((p) => ({ p, name: nameOf(p, g.group), W: textWidth(nameOf(p, g.group), FS) + 2 * PAD })));
    const rowW = items.reduce((s, g) => s + g.reduce((t, c) => t + c.W, 0) + (g.length - 1) * GAP, 0) + (row.length - 1) * GROUP_GAP;
    let x = -rowW / 2;
    row.forEach((g, gi) => {
      if (g.group) groups.push({ text: g.group, x, y: rowY[ri]! + ROW_H / 2 + 0.07 });
      items[gi]!.forEach((c) => {
        placed.push({ path: c.p, name: c.name, x: x + c.W / 2, y: rowY[ri]!, W: c.W });
        x += c.W + GAP;
      });
      x += GROUP_GAP - GAP;
    });
  });
  const pageIndex = (path: string) => 1 + LINKED_PAGES.indexOf(path as (typeof LINKED_PAGES)[number]);

  // Particles by perimeter, so every card's edge reads the same.
  const gPitchX = 0.18;
  const gPitchY = 0.235;
  const gTop = -0.42;
  const gx = (j: number) => (j - (COLS - 1) / 2) * gPitchX;
  const gy = (row: number) => gTop - row * gPitchY;
  const perimeter = (W: number, H: number) => W + H;
  const total = perimeter(homeW, homeH) + placed.reduce((s, c) => s + perimeter(c.W, ROW_H), 0) + GRID * perimeter(gW, gH);
  const share = (W: number, H: number) => Math.floor((cardsN * perimeter(W, H)) / total);
  const ink = (order: number, kind: number, size: number): Ink => ({ order, kind, size });

  // The home page.
  card(w, r, FLAT(0, homeY), homeW, homeH, share(homeW, homeH), {
    ink: ink(0, KIND.line, 1),
    text: ink(0, KIND.text, 0.9),
    lines: [0.84, 0.66],
    titled: true,
  });
  labels.push({ text: HOME_PAGE, at: titleAt(FLAT(0, homeY), homeW, homeH), size: 0.085, align: 0, tone: 0, ink: ink(0, KIND.line, 1) });

  // The 16 linked pages, each named.
  for (const c of placed) {
    const order = crawlOrder(pageIndex(c.path));
    const plane = FLAT(c.x, c.y, (r() - 0.5) * 0.03);
    card(w, r, plane, c.W, ROW_H, share(c.W, ROW_H), {
      ink: ink(order, KIND.line, 1),
      text: ink(order, KIND.text, 0.9),
      lines: [0.7],
      rad: 0.035,
      titled: true,
    });
    labels.push({
      text: c.name,
      at: [c.x - c.W / 2 + PAD, c.y + ROW_H / 2 - PAD - FS * 0.55, 0],
      size: FS,
      align: 0,
      tone: NOINDEX_PAGES.has(c.path) ? 1 : 0,
      ink: ink(order, KIND.line, 1),
    });
  }
  for (const g of groups) {
    const first = placed.find((c) => c.x > g.x)!;
    labels.push({ text: g.text, at: [g.x, g.y, 0], size: 0.05, align: 0, tone: 1, ink: ink(crawlOrder(pageIndex(first.path)), KIND.line, 1) });
  }

  // The 76 deeper pages, row by row.
  for (let k = 0; k < GRID; k++) {
    card(w, r, FLAT(gx(k % COLS), gy(Math.floor(k / COLS)), (r() - 0.5) * 0.03), gW, gH, share(gW, gH), {
      ink: ink(crawlOrder(k + 1 + LINKED_PAGES.length), KIND.line, 1),
      title: ink(crawlOrder(k + 1 + LINKED_PAGES.length), KIND.title, 1.1),
      text: ink(crawlOrder(k + 1 + LINKED_PAGES.length), KIND.text, 0.9),
      lines: [0.7],
      rad: 0.025,
    });
  }
  const bus3 = gTop + gH / 2 + 0.1;
  labels.push({
    text: "one link deeper: /docs/agent, 69 pages under /docs/issues/, 6 framework guides",
    at: [gx(0) - gW / 2, bus3 + 0.075, 0],
    size: 0.05,
    align: 0,
    tone: 1,
    ink: ink(crawlOrder(1 + LINKED_PAGES.length), KIND.line, 1),
  });

  // Wires: home to a bus over the first row, down its ends to a bus over the
  // second, and from there to a bus over the deeper pages, down each column.
  // A wire lights with the page it leads to.
  const wires: [V3, V3, number][] = [];
  const rowAx = placed.filter((c) => c.y === rowY[0]).map((c) => c.x);
  const rowBx = placed.filter((c) => c.y === rowY[1]).map((c) => c.x);
  const bus1 = rowY[0]! + ROW_H / 2 + 0.16;
  const bus2 = rowY[1]! + ROW_H / 2 + 0.035;
  const first1 = crawlOrder(1);
  wires.push([[0, homeY - homeH / 2, 0], [0, bus1, 0], first1]);
  wires.push([[Math.min(...rowAx), bus1, 0], [Math.max(...rowAx), bus1, 0], first1]);
  for (const x of rowAx) wires.push([[x, bus1, 0], [x, rowY[0]! + ROW_H / 2, 0], first1]);
  const left = Math.min(...rowAx, ...rowBx) - 0.12;
  wires.push([[Math.min(...rowAx), bus1, 0], [left, bus1, 0], first1]);
  wires.push([[left, bus1, 0], [left, bus2, 0], first1]);
  wires.push([[left, bus2, 0], [Math.max(...rowBx), bus2, 0], first1]);
  for (const x of rowBx) wires.push([[x, bus2, 0], [x, rowY[1]! + ROW_H / 2, 0], first1]);
  const deep = crawlOrder(1 + LINKED_PAGES.length);
  wires.push([[left, bus2, 0], [left, bus3, 0], deep]);
  wires.push([[left, bus3, 0], [gx(COLS - 1), bus3, 0], deep]);
  for (let j = 0; j < COLS; j++) {
    wires.push([[gx(j), bus3, 0], [gx(j), gTop + gH / 2, 0], crawlOrder(1 + LINKED_PAGES.length + j)]);
    for (let row = 0; (row + 1) * COLS + j < GRID; row++) {
      wires.push([[gx(j), gy(row) - gH / 2, 0], [gx(j), gy(row + 1) + gH / 2, 0], crawlOrder(1 + LINKED_PAGES.length + (row + 1) * COLS + j)]);
    }
  }
  const wireLen = wires.reduce((s, [p, q]) => s + Math.hypot(q[0] - p[0], q[1] - p[1]), 0);
  for (const [p, q, order] of wires) {
    const n = Math.round((wireN * Math.hypot(q[0] - p[0], q[1] - p[1])) / wireLen);
    segment(w, r, p, q, n, { order, kind: KIND.line, size: 0.8 });
  }

  dust(w, r, dustN, 2.2, 1.9, 0.8);
  fill(w, r, 2.2, 1.9, 0.8);
  return { ...w, labels, width: 0, height: 0 };
}

// ---------------------------------------------------------------- 2 · gate

/** Where the check sits, and where the page it stops comes to rest. */
export const GATE_Y = 0;
const LANES = [-1.15, 1.15];
/** The pages that keep flowing in each lane, real paths of septune.dev. */
const LANE_PAGES = [
  ["/changelog", "/docs/agent", "/audit"],
  ["/terms", "/docs", "/privacy"],
];

/**
 * Pages fall from the preview (top) to production (bottom) through the
 * pull-request check, a slot across the figure. Two lanes keep flowing; in
 * the middle one the page that would leave Google comes down and stops on
 * the check, which turns to the accent under it (the shader, from st.x).
 * Each page carries its path and its status; the figure says where the
 * preview, the check and production are.
 */
function gate(count: number): Structure {
  const r = rng(23);
  const w = writer(count);
  const labels: Label[] = [];
  const dustN = Math.floor(count * 0.025);
  const gateN = Math.floor(count * 0.16);
  const heldN = Math.floor(count * 0.12);
  const flowN = count - dustN - gateN - heldN;
  const W = 0.9;
  const H = 1;
  const top = 1.95;
  const fall = 3.9;
  const PER_LANE = 3;
  const FS = 0.085;
  // About fifteen seconds from the preview to production: calm, readable.
  const speed = 1 / 15;
  const perCard = Math.floor(flowN / (LANES.length * PER_LANE));
  const say = (plane: Plane, title: string, status: string, ink: Ink, tone: number, motion?: Motion) => {
    const at = titleAt(plane, W, H);
    labels.push({ text: title, at, size: FS, align: 0, tone, ink, motion });
    labels.push({ text: status, at: [at[0], at[1] - FS * 1.35, at[2]], size: FS * 0.68, align: 0, tone: tone === 2 ? 2 : 1, ink, motion });
  };
  LANES.forEach((x, lane) => {
    for (let k = 0; k < PER_LANE; k++) {
      const motion: Motion = { by: [0, -fall, 0], speed, phase: (k + lane * 0.5) / PER_LANE };
      const plane = FLAT(x, top, 0);
      const flow = { order: 0, kind: KIND.flow, size: 1 };
      card(w, r, plane, W, H, perCard, {
        ink: flow,
        text: { order: 0.5, kind: KIND.flow, size: 0.9 },
        lines: [0.6, 0.72],
        motion,
        titled: true,
      });
      say(plane, LANE_PAGES[lane]![k]!, "200 · indexable", flow, 0, motion);
    }
  });

  // The held page starts above the frame; the shader brings it down onto the check.
  const heldPlane = FLAT(0, GATE_Y + 0.69, 0);
  const held = { order: 0, kind: KIND.held, size: 1.1 };
  card(w, r, heldPlane, W, H, heldN, {
    ink: held,
    text: { order: 0.5, kind: KIND.held, size: 0.95 },
    lines: [0.6, 0.72],
    titled: true,
  });
  say(heldPlane, "/pricing", "noindex: would leave Google", held, 2);

  // The check: a long slot, two rails and their ends. extra = x, so the shader lights the middle.
  const half = 1.86;
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
  // Where things are: the preview above, the check, production below.
  const still = { order: 0, kind: KIND.line, size: 1 };
  labels.push({ text: "preview", at: [-half, top + H / 2 + 0.12, 0], size: 0.06, align: 0, tone: 1, ink: still });
  labels.push({ text: "pull request check", at: [-half, GATE_Y + slot + 0.1, 0], size: 0.06, align: 0, tone: 1, ink: still });
  labels.push({ text: "production", at: [-half, top - fall - H / 2 - 0.12, 0], size: 0.06, align: 0, tone: 1, ink: still });
  dust(w, r, dustN, 1.9, 2.2, 0.7);
  fill(w, r, 1.9, 2.2, 0.7);
  return { ...w, labels, width: 0, height: 0 };
}

// ---------------------------------------------------------------- 3 · code

/**
 * The page's file, the one the patch on the page shows. Token widths follow
 * the real characters, at a fixed advance, and the engine writes the real
 * code over them, so it reads as code.
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
/** Token tone (keyword, name, punctuation, string) to label tone (cyan, ink, soft, ink). */
const TOKEN_TONE = [3, 0, 1, 0];

function code(count: number): Structure {
  const r = rng(37);
  const w = writer(count);
  const labels: Label[] = [];
  const dustN = Math.floor(count * 0.02);
  const frameN = Math.floor(count * 0.14);
  const gutterN = Math.floor(count * 0.06);
  const tokensN = count - dustN - frameN - gutterN;
  const FW = 3.0;
  const FH = 2.7;
  const top = FH / 2 - 0.62;
  const left = -FW / 2 + 0.52;
  // The font whose advance is the token grid's: 0.6 em per character.
  const FS = ADVANCE / 0.6;

  // The window: outline, a rule under the file name, the file name itself.
  outline(w, r, FLAT(0, 0), FW, FH, 0.1, Math.floor(frameN * 0.72), { order: 2, kind: KIND.line, size: 0.95 });
  bar(w, r, FLAT(0, 0), -FW / 2, FH / 2 - 0.36, FW, frameN - Math.floor(frameN * 0.72), { order: 2, kind: KIND.text, size: 0.8 });
  labels.push({ text: "app/pricing/page.tsx", at: [-FW / 2 + 0.2, FH / 2 - 0.18, 0], size: FS * 0.85, align: 0, tone: 1, ink: { order: 1, kind: KIND.line, size: 1 } });

  const chars = SOURCE.reduce((s, [, tokens]) => s + tokens.reduce((t, [txt]) => t + txt.length, 0), 0);
  SOURCE.forEach(([indent, tokens], li) => {
    const y = top - li * PITCH;
    const kind = li === BAD ? KIND.accent : li > BAD ? KIND.shift : KIND.line;
    // extra: how far the line rises when the bad line has left.
    const extra = li > BAD ? PITCH : 0;
    const lineInk = { order: 2, kind, size: 0.75, extra };
    // The line number in the gutter, moving with its line.
    bar(w, r, FLAT(0, 0), -FW / 2 + 0.16, y, 0.1, Math.floor(gutterN / SOURCE.length), { ...lineInk, kind: li === BAD ? KIND.accent : kind }, undefined, 0.02);
    labels.push({ text: String(li + 1).padStart(2, " "), at: [-FW / 2 + 0.12, y, 0], size: FS * 0.8, align: 0, tone: 1, ink: lineInk });
    let x = left + indent * ADVANCE * 2;
    for (const [txt, tone] of tokens) {
      const len = txt.length * ADVANCE;
      const n = Math.round((tokensN * txt.length) / chars);
      // tone in order: 0 keyword, 1 name, 2 punctuation, 3 string
      bar(w, r, FLAT(0, 0), x, y, len, n, { order: tone, kind, size: 1, extra }, undefined, 0.03);
      labels.push({ text: txt, at: [x, y, 0], size: FS, align: 0, tone: li === BAD ? 2 : TOKEN_TONE[tone]!, ink: { order: tone, kind, size: 1, extra } });
      x += len + ADVANCE;
    }
  });
  dust(w, r, dustN, 2, 1.7, 0.6);
  fill(w, r, 2, 1.7, 0.6);
  return { ...w, labels, width: 0, height: 0 };
}

// ---------------------------------------------------------------- 4 · sites

/**
 * 25 sites, each a small browser window. Their order is how far they are
 * from the middle: 1 for Free, the 4 around it for Pro, all 25 for Studio.
 * The shader lights those whose order is under st.x and sweeps a check
 * across the lit ones; a lit window shows its name.
 */
export const SITE_TIERS = [0.05, 0.2, 1.01];

function sites(count: number): Structure {
  const r = rng(53);
  const w = writer(count);
  const labels: Label[] = [];
  const dustN = Math.floor(count * 0.025);
  const per = Math.floor((count - dustN) / 25);
  const W = 0.56;
  const H = 0.42;
  const cells: { order: number; x: number; y: number }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const dx = col - 2;
      const dy = row - 2;
      const ring = Math.abs(dx) + Math.abs(dy);
      const order = ring === 0 ? 0 : ring === 1 ? 0.12 : 0.3 + (Math.hypot(dx, dy) / 3) * 0.6 + r() * 0.02;
      // Flat, with a 0.12 gap between windows: the three-quarter view comes from
      // the scene's rotation, and no two windows ever touch.
      cells.push({ order, x: dx * 0.68, y: -dy * 0.56 });
    }
  }
  // Named in the order they light: yours first, then the plan's others.
  const byOrder = [...cells].sort((p, q) => p.order - q.order);
  for (const c of cells) {
    const plane = FLAT(c.x, c.y, 0);
    card(w, r, plane, W, H, per, {
      ink: { order: c.order, kind: KIND.line, size: 1 },
      text: { order: c.order, kind: KIND.text, size: 0.9 },
      lines: [0.8, 0.6],
      rad: 0.035,
      titled: true,
    });
    const n = byOrder.indexOf(c);
    labels.push({
      text: n === 0 ? "your-site.com" : `site ${String(n + 1).padStart(2, "0")}`,
      at: titleAt(plane, W, H),
      size: 0.052,
      align: 0,
      tone: 0,
      ink: { order: c.order, kind: KIND.line, size: 1 },
    });
  }
  dust(w, r, dustN, 2.1, 1.7, 0.8);
  fill(w, r, 2.1, 1.7, 0.8);
  return { ...w, labels, width: 0, height: 0 };
}

// ---------------------------------------------------------------- finishing

/**
 * Centres a figure on its bounding box (dust excluded) and measures it, so
 * the page can fit any figure into any box. Flows count at both ends; the
 * labels move with their figure. The galaxy keeps its own centre and size.
 */
function centred(s: Structure, sid: number): Structure {
  if (sid === FIGURE.galaxy) return s;
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
  // Labels reach past the dust on the right (long names): count their ends.
  for (const l of s.labels) {
    const w = textWidth(l.text, l.size);
    x0 = Math.min(x0, l.at[0] - w * l.align);
    x1 = Math.max(x1, l.at[0] + w * (1 - l.align));
    y0 = Math.min(y0, l.at[1] - l.size);
    y1 = Math.max(y1, l.at[1] + l.size);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const cz = (z0 + z1) / 2;
  for (let k = 0; k < s.a.length; k += 4) {
    for (const arr of [s.a, s.b]) {
      arr[k] = arr[k]! - cx;
      arr[k + 1] = arr[k + 1]! - cy;
      arr[k + 2] = arr[k + 2]! - cz;
    }
  }
  const labels = s.labels.map((l) => ({ ...l, at: [l.at[0] - cx, l.at[1] - cy, l.at[2] - cz] as V3 }));
  return { ...s, labels, width: (x1 - x0) * 1.02, height: (y1 - y0) * 1.02 };
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
 * one travels a short way when a figure turns into the next. The galaxy is
 * sorted as the viewer sees it: across, and from far to near.
 */
function paired(s: Structure, sid: number): Structure {
  const n = s.a.length / 4;
  const G = 1024;
  const keys = new Float64Array(n);
  const half = { w: s.width / 2 || 1, h: s.height / 2 || 1 };
  const deep = sid === FIGURE.galaxy;
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    // Where the particle mostly is: the middle of its segment for flows.
    const x = (s.a[k]! + s.b[k]!) / 2;
    const y = deep ? -s.a[k + 2]! * Math.sin(GALAXY_TILT) : (s.a[k + 1]! + s.b[k + 1]!) / 2;
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
  return { a: permute(s.a), b: permute(s.b), c: permute(s.c), labels: s.labels, width: s.width, height: s.height };
}

/** All figures for `count` particles, in FIGURE order. */
export function buildFigures(count: number): Structure[] {
  return [galaxy(count), tree(count), gate(count), code(count), sites(count)].map((s, sid) => paired(centred(s, sid), sid));
}
