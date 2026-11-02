import * as THREE from "three";
import { COPY_FRAG, LABEL_FRAG, LABEL_VERT, PASS_VERT, POINTS_FRAG, POINTS_VERT, SIM_FRAG, TONE_FRAG } from "./shaders";
import { FIGURE, GALAXY_SPIN, TREE_PAGES, buildFigures, crawlOrder, type Label, type Structure } from "./structures";

/** One of the two figures on screen, with its step's own story (st.x, 0 -> 1). */
export type ForgeSlot = { sid: number; state: [number, number, number, number] };

/** A part of the screen the picture may show in: a stage, in CSS pixels of the viewport. */
export type ForgeRegion = { x0: number; y0: number; x1: number; y1: number; r: number };

/** What the page asks the field to show on this frame. */
export type ForgeFrame = {
  from: ForgeSlot;
  to: ForgeSlot;
  /** Particles move from `from` to `to` as mix goes 0 -> 1 (a clock, see forge-field.tsx). */
  mix: number;
  /** 1: both figures share a stage and the points are seen reorganising; 0: fade, cross unseen, draw. */
  morph: number;
  /** How far the box's sizing has gone from `from`'s figure (0) to `to`'s (1). */
  fit: number;
  /** Where the picture sits, in CSS pixels of the viewport: it is fitted into this box. */
  box: { cx: number; cy: number; w: number; h: number };
  rotY: number;
  rotX: number;
  /** Where it may show. None: nothing to draw, the loop rests. */
  regions: ForgeRegion[];
  /** Where words stand over a stage: the picture is dimmed there. */
  holes: ForgeRegion[];
  /** The cursor over the hero, in CSS pixels of the viewport; null when it is elsewhere. */
  pointer: { x: number; y: number } | null;
};

export type ForgeOptions = {
  /** Particles per side of the simulation texture: side² particles. */
  side: number;
  dpr: number;
  /** false when the visitor asked for reduced motion: still figures, no sway. */
  motion: boolean;
  /** The CSS font-family the labels are drawn in (the page's monospace). */
  font: string;
};

export type Forge = { dispose(): void };

const CAMERA_Z = 6;
const HALF_FOV = THREE.MathUtils.degToRad(15);
const MAX_REGIONS = 4;
/** Seconds the galaxy spends reading each page, home first, outwards. */
const READ_EVERY = 1.3;

/** Lets the browser paint and take input between two pieces of start-up work. */
const breathe = () => new Promise<void>((done) => setTimeout(done, 0));

/** The figures, built in a worker; on the main thread only if workers are missing. */
function figuresFor(count: number): Promise<Structure[]> {
  if (typeof Worker === "undefined") return Promise.resolve(buildFigures(count));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./figures.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<Structure[]>) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(e);
    };
    worker.postMessage(count);
  });
}

/**
 * Starts the forge field on the canvas. Rejects when the browser can't run
 * it (no WebGL2 or no float render targets); the caller then shows nothing.
 * Start-up is cut in short pieces, off the main thread where it can be: the
 * figures are built in a worker and the shaders compile in parallel, so a
 * phone stays responsive while it starts (it blocked for six seconds on a
 * 4x-throttled phone before, 2026-11-02).
 */
export async function createForge(
  canvas: HTMLCanvasElement,
  opts: ForgeOptions,
  next: (dt: number, time: number) => ForgeFrame,
): Promise<Forge> {
  const count = opts.side * opts.side;
  const building = figuresFor(count);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  // Positions need 32-bit floats: per-frame steps are smaller than half-float precision.
  if (!renderer.extensions.has("EXT_color_buffer_float")) {
    renderer.dispose();
    throw new Error("forge: float render targets unsupported");
  }
  renderer.setPixelRatio(opts.dpr);
  // Transparent: the canvas only adds the figure over the stages, in premultiplied colour.
  renderer.setClearColor(0x000000, 0);

  const N = opts.side;
  const mobile = N < 256;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, CAMERA_Z);
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);

  // ---- full-screen pass rig
  const passCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const passScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  passScene.add(quad);
  const materials: THREE.ShaderMaterial[] = [];
  // Returns the material and its uniforms, typed, so passes can set them.
  const material = <U extends Record<string, THREE.IUniform>>(fragmentShader: string, u: U) => {
    const m = new THREE.ShaderMaterial({ vertexShader: PASS_VERT, fragmentShader, uniforms: u, depthTest: false, depthWrite: false });
    materials.push(m);
    return { m, u };
  };
  const tex = (t: THREE.Texture | null = null): THREE.IUniform<THREE.Texture | null> => ({ value: t });
  const targets: THREE.WebGLRenderTarget[] = [];
  const target = (w: number, h: number, type: THREE.TextureDataType, filter: THREE.MagnificationTextureFilter) => {
    const t = new THREE.WebGLRenderTarget(w, h, {
      type,
      format: THREE.RGBAFormat,
      minFilter: filter,
      magFilter: filter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    });
    targets.push(t);
    return t;
  };
  const pass = (p: { m: THREE.ShaderMaterial }, out: THREE.WebGLRenderTarget | null) => {
    quad.material = p.m;
    renderer.setRenderTarget(out);
    renderer.render(passScene, passCam);
  };

  // ---- particle data: one random vector each, and their places in every figure
  const random = new Float32Array(count * 4);
  const ref = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) random[i * 4 + k] = Math.random();
    ref[i * 2] = ((i % N) + 0.5) / N;
    ref[i * 2 + 1] = (Math.floor(i / N) + 0.5) / N;
  }
  const textures: THREE.Texture[] = [];
  const dataTexture = (data: Float32Array) => {
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType);
    t.needsUpdate = true;
    textures.push(t);
    return t;
  };
  const randomTex = dataTexture(random);
  const built = await building;
  await breathe();
  const figures = built.map((s) => ({
    a: dataTexture(s.a),
    b: dataTexture(s.b),
    c: dataTexture(s.c),
    width: s.width,
    height: s.height,
  }));
  // Upload every figure now, at start-up, rather than on its first transition:
  // with 102 400 points that is about 25 MB, a visible hitch mid-scroll.
  textures.forEach((t) => renderer.initTexture(t));
  await breathe();

  // Particles start as the first figure blown wide open; it gathers on load.
  const first = built[0]!;
  const open = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const k = i * 4;
    const spread = 2.2 + Math.random() * 1.6;
    open[k] = first.a[k]! * spread + (Math.random() - 0.5) * 1.5;
    open[k + 1] = first.a[k + 1]! * spread + (Math.random() - 0.5) * 1.5;
    open[k + 2] = first.a[k + 2]! * spread;
    open[k + 3] = 0;
  }
  let pos = target(N, N, THREE.FloatType, THREE.NearestFilter);
  let posNext = target(N, N, THREE.FloatType, THREE.NearestFilter);
  const copy = material(COPY_FRAG, { uSource: tex(dataTexture(open)) });
  pass(copy, pos);

  // Uniforms shared by the simulation, the points and the labels: the two figures on screen.
  const slots = {
    uA0: tex(),
    uB0: tex(),
    uC0: tex(),
    uA1: tex(),
    uB1: tex(),
    uC1: tex(),
    uSid0: { value: 0 },
    uSid1: { value: 0 },
    uSt0: { value: new THREE.Vector4(0, 0, 0, 0) },
    uSt1: { value: new THREE.Vector4(0, 0, 0, 0) },
    uTime: { value: 0 },
    uMix: { value: 0 },
    uMorph: { value: 0 },
    uLens: { value: new THREE.Vector4(0, 0, 0, 0) },
    uSpan: { value: new THREE.Vector4(-1, 2, -1, 2) },
  };

  const sim = material(SIM_FRAG, {
    ...slots,
    uPos: tex(),
    uRandom: tex(randomTex),
    uDt: { value: 1 / 60 },
    uSnap: { value: opts.motion ? 0 : 1 },
  });

  // ---- points
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("ref", new THREE.BufferAttribute(ref, 2));
  geometry.setAttribute("rnd", new THREE.BufferAttribute(random, 4));
  // The same uniform objects as the simulation: one update serves both.
  const pointsU = {
    ...slots,
    uPos: tex(pos.texture),
    uSize: { value: mobile ? 2.4 : 1.9 },
    uDPR: { value: opts.dpr },
    uOpacity: { value: 1 },
    uDensity: { value: mobile ? 0.85 : 0.74 },
    uFront: { value: 0 },
  };
  // Premultiplied additive: colour x coverage and coverage add up (ONE, ONE); the tone pass divides.
  const pointsMat = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    uniforms: pointsU,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  materials.push(pointsMat);
  const points = new THREE.Points(geometry, pointsMat);
  points.frustumCulled = false;
  group.add(points);

  // ---- labels: the words on the cards, from one atlas drawn once
  const labelled = built.flatMap((s, fig) => s.labels.map((l) => ({ fig, l })));
  const atlas = drawAtlas(
    labelled.map(({ l }) => l.text),
    opts.font,
    mobile ? 34 : 44,
  );
  textures.push(atlas.texture);
  const labelGeometry = labelMesh(labelled, atlas);
  await breathe();
  const galU = Array.from({ length: 24 }, () => new THREE.Vector4());
  const labelU = {
    ...slots,
    uGal: { value: galU },
    uPxScale: { value: 1 },
    uAtlas: tex(atlas.texture),
    uGain: { value: 2.6 },
  };
  const labelMat = new THREE.ShaderMaterial({
    vertexShader: LABEL_VERT,
    fragmentShader: LABEL_FRAG,
    uniforms: labelU,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  materials.push(labelMat);
  const labels = new THREE.Mesh(labelGeometry, labelMat);
  labels.frustumCulled = false;
  labels.renderOrder = 1;
  group.add(labels);

  const hdr = target(1, 1, THREE.HalfFloatType, THREE.LinearFilter);
  const rects = Array.from({ length: MAX_REGIONS }, () => new THREE.Vector4());
  const holeRects = Array.from({ length: MAX_REGIONS }, () => new THREE.Vector4());
  const tone = material(TONE_FRAG, {
    uTex: tex(hdr.texture),
    uExposure: { value: 1.25 },
    uGlow: { value: 0.8 },
    uFar: { value: mobile ? 0 : 1 },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uView: { value: new THREE.Vector2(1, 1) },
    uRect: { value: rects },
    uRadius: { value: [0, 0, 0, 0] },
    uCount: { value: 0 },
    uHole: { value: holeRects },
    uHoles: { value: 0 },
  });

  let W = 1;
  let H = 1;
  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    tone.u.uView.value.set(W, H);
    const hw = Math.max(1, Math.floor(W * opts.dpr));
    const hh = Math.max(1, Math.floor(H * opts.dpr));
    hdr.setSize(hw, hh);
    tone.u.uTexel.value.set(1 / hw, 1 / hh);
    labelU.uPxScale.value = H / 2 / Math.tan(HALF_FOV);
  };
  resize();
  window.addEventListener("resize", resize);

  function setSlots(f: ForgeFrame, time: number) {
    const s0 = figures[f.from.sid] ?? figures[0]!;
    const s1 = figures[f.to.sid] ?? figures[0]!;
    slots.uA0.value = s0.a;
    slots.uB0.value = s0.b;
    slots.uC0.value = s0.c;
    slots.uA1.value = s1.a;
    slots.uB1.value = s1.b;
    slots.uC1.value = s1.c;
    slots.uSid0.value = f.from.sid;
    slots.uSid1.value = f.to.sid;
    slots.uSt0.value.set(...f.from.state);
    slots.uSt1.value.set(...f.to.state);
    slots.uTime.value = time;
    slots.uMix.value = f.mix;
    slots.uMorph.value = f.morph;
    slots.uSpan.value.set(-s1.width / 2, s1.width, -s1.height / 2, s1.height);
    return { s0, s1 };
  }

  const setRects = (list: ForgeRegion[], into: THREE.Vector4[], radius?: number[]) => {
    const n = Math.min(MAX_REGIONS, list.length);
    for (let i = 0; i < n; i++) {
      const r = list[i]!;
      into[i]!.set(r.x0, r.y0, r.x1, r.y1);
      if (radius) radius[i] = r.r;
    }
    return n;
  };

  /** Fits the figures into the box the page gives, in viewport pixels; the size eases from one to the other. */
  function place(f: ForgeFrame, s0: { width: number; height: number }, s1: { width: number; height: number }, time: number) {
    const halfH = Math.tan(HALF_FOV) * CAMERA_Z;
    const perPx = (2 * halfH) / H;
    const fitOf = (s: { width: number; height: number }) => Math.min((f.box.w * perPx) / s.width, (f.box.h * perPx) / s.height);
    const fit = fitOf(s0) + (fitOf(s1) - fitOf(s0)) * f.fit;
    group.position.set((f.box.cx - W / 2) * perPx, (H / 2 - f.box.cy) * perPx, 0);
    group.scale.setScalar(Math.max(0.01, fit));
    // A breath of sway, never more than about two degrees.
    const sway = opts.motion ? 1 : 0;
    group.rotation.set(f.rotX + Math.sin(time * 0.19) * 0.012 * sway, f.rotY + Math.sin(time * 0.23) * 0.035 * sway, 0);
    group.updateMatrixWorld();
  }

  // ---- the galaxy: the cursor's lens, the page being read, the paths shown
  const galaxyLabels = built[FIGURE.galaxy]!.labels;
  const galAlpha = new Float32Array(galU.length * 4);
  const lens = new THREE.Vector4(0, 0, 0, 0);
  const lensAt = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const inverse = new THREE.Matrix4();
  const localRay = new THREE.Ray();
  const onScreen = new THREE.Vector3();
  let lensOn = false;
  /** A label's place on screen, in CSS pixels, from its place in the group. */
  const project = (x: number, y: number, z: number) => {
    onScreen.set(x, y, z).applyMatrix4(group.matrixWorld).project(camera);
    return { x: (onScreen.x + 1) * 0.5 * W, y: (1 - onScreen.y) * 0.5 * H };
  };

  /** Where the cursor's ray meets the galaxy's disc, in the group's space; false when it misses. */
  function aimLens(pointer: { x: number; y: number }) {
    ndc.set((pointer.x / W) * 2 - 1, 1 - (pointer.y / H) * 2);
    ray.setFromCamera(ndc, camera);
    inverse.copy(group.matrixWorld).invert();
    localRay.copy(ray.ray).applyMatrix4(inverse);
    const d = localRay.direction.y;
    if (Math.abs(d) < 1e-4) return false;
    const t = -localRay.origin.y / d;
    if (t < 0) return false;
    localRay.at(t, lensAt);
    return Math.hypot(lensAt.x, lensAt.z) < 3.6;
  }

  function galaxy(f: ForgeFrame, dt: number, time: number) {
    const shown = f.from.sid === FIGURE.galaxy || f.to.sid === FIGURE.galaxy;
    const ease = (tau: number) => 1 - Math.exp(-dt / tau);
    // The lens follows the cursor closely and comes and goes gently.
    const aimed = shown && opts.motion && f.pointer !== null && aimLens(f.pointer);
    if (aimed) {
      if (!lensOn) lens.set(lensAt.x, 0, lensAt.z, lens.w);
      else {
        lens.x += (lensAt.x - lens.x) * ease(0.08);
        lens.z += (lensAt.z - lens.z) * ease(0.08);
      }
    }
    lensOn = aimed;
    lens.w += ((aimed ? 1 : 0) - lens.w) * ease(0.25);
    slots.uLens.value.copy(lens);

    // One page read at a time, home first, outwards; it loops.
    const reading = Math.floor(time / READ_EVERY) % TREE_PAGES;
    pointsU.uFront.value = crawlOrder(reading);

    // The paths shown: the home page's, the page being read, and the three
    // nearest the cursor.
    const ang = time * GALAXY_SPIN;
    const cs = Math.cos(ang);
    const sn = Math.sin(ang);
    const near: [number, number][] = [];
    if (lens.w > 0.3) {
      galaxyLabels.forEach((l, i) => {
        const x = cs * l.at[0] + sn * l.at[2];
        const z = -sn * l.at[0] + cs * l.at[2];
        const d = Math.hypot(x - lens.x, z - lens.z);
        if (d < 0.5) near.push([d, i]);
      });
      near.sort((p, q) => p[0] - q[0]);
    }
    // Up to three near the cursor, never one over another: a path is shown
    // only if its box on screen stands clear of the home page's, the one
    // being read, those still fading out, and those shown before it. The
    // ones already shown keep their place, so the words don't flicker.
    // Galaxy labels are numbered in crawl order: label i is page i.
    const pxPerUnit = (group.scale.x * H) / (2 * Math.tan(HALF_FOV) * CAMERA_Z);
    const boxOf = (i: number) => {
      const l = galaxyLabels[i]!;
      const at = project(cs * l.at[0] + sn * l.at[2], l.at[1], -sn * l.at[0] + cs * l.at[2]);
      const fs = l.size * pxPerUnit;
      return { x: at.x, y: at.y, w: l.text.length * 0.6 * fs + 16, h: fs * 1.7 };
    };
    type Box = ReturnType<typeof boxOf>;
    const clash = (a: Box, b: Box) => Math.abs(a.y - b.y) < (a.h + b.h) / 2 && Math.abs(a.x - b.x) < (a.w + b.w) / 2;
    const fixed = (i: number) => i === 0 || i === reading;
    const nearby = near.map(([, i]) => i).filter((i) => !fixed(i));
    const taken: Box[] = [0, reading].map(boxOf);
    galAlpha.forEach((a, i) => {
      if (i < galaxyLabels.length && a > 0.08 && !fixed(i) && !nearby.includes(i)) taken.push(boxOf(i));
    });
    const lit = new Set<number>();
    for (const i of [...nearby.filter((i) => galAlpha[i]! > 0.5), ...nearby.filter((i) => galAlpha[i]! <= 0.5)]) {
      if (lit.size >= 3) break;
      const b = boxOf(i);
      if (taken.some((q) => clash(q, b))) continue;
      taken.push(b);
      lit.add(i);
    }
    galaxyLabels.forEach((_, i) => {
      const want = fixed(i) || lit.has(i) ? 1 : 0;
      const k = galAlpha[i]!;
      galAlpha[i] = opts.motion ? k + (want - k) * ease(0.18) : want;
    });
    for (let i = 0; i < galU.length; i++) galU[i]!.fromArray(galAlpha, i * 4);
  }

  function simStep(dt: number) {
    sim.u.uPos.value = pos.texture;
    sim.u.uDt.value = dt;
    pass(sim, posNext);
    [pos, posNext] = [posNext, pos];
  }

  function draw() {
    pointsU.uPos.value = pos.texture;
    // render() clears the target first, to the transparent clear colour.
    renderer.setRenderTarget(hdr);
    renderer.render(scene, camera);
    pass(tone, null);
  }

  // Compile every program before the first frame, in parallel where the
  // browser can (KHR_parallel_shader_compile): the passes on quads of their own.
  const warm = new THREE.Scene();
  for (const p of [sim, tone]) {
    const m = new THREE.Mesh(quad.geometry, p.m);
    m.frustumCulled = false;
    warm.add(m);
  }
  await Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(warm, passCam)]);

  let prev = performance.now();
  let time = 0;
  let resting = false;
  let lastKey = "";
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (opts.motion) time += dt;
    const f = next(dt, time);
    // No stage on screen: clear once and rest until one comes back.
    if (!f.regions.length) {
      if (!resting) {
        renderer.setRenderTarget(null);
        renderer.clear();
        resting = true;
        lastKey = "";
      }
      return;
    }
    resting = false;
    const { s0, s1 } = setSlots(f, time);
    place(f, s0, s1, time);
    galaxy(f, dt, time);
    tone.u.uCount.value = setRects(f.regions, rects, tone.u.uRadius.value);
    tone.u.uHoles.value = setRects(f.holes, holeRects);
    if (opts.motion) {
      simStep(dt);
      draw();
      return;
    }
    // Reduced motion: nothing moves on its own. The figures land in place and
    // the canvas is drawn again only when the page asks for something else.
    const key = `${f.from.sid}|${f.to.sid}|${f.mix.toFixed(2)}|${f.from.state.join()}|${f.to.state.join()}|${Math.round(f.box.cx)}|${Math.round(f.box.cy)}|${Math.round(f.box.w)}|${[...f.regions, ...f.holes].map((r) => `${Math.round(r.x0)},${Math.round(r.y0)},${Math.round(r.x1)},${Math.round(r.y1)}`).join(";")}|${W}x${H}`;
    if (key === lastKey) return;
    lastKey = key;
    simStep(1);
    draw();
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      targets.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      geometry.dispose();
      labelGeometry.dispose();
      quad.geometry.dispose();
      renderer.dispose();
    },
  };
}

type Atlas = { texture: THREE.Texture; rects: Map<string, { u0: number; v0: number; u1: number; v1: number; aspect: number }> };

/**
 * Draws every label's text once into a single-channel texture: white glyphs,
 * rows of `px` pixels, mipmapped so small words stay smooth.
 */
function drawAtlas(texts: string[], font: string, px: number): Atlas {
  const uniq = [...new Set(texts)];
  const rowH = Math.ceil(px * 1.3);
  const width = 2048;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const style = `500 ${px}px ${font}`;
  ctx.font = style;
  const spots = new Map<string, { x: number; y: number; w: number }>();
  let x = 0;
  let y = 0;
  for (const t of uniq) {
    const w = Math.ceil(ctx.measureText(t).width) + 6;
    if (x + w > width) {
      x = 0;
      y += rowH;
    }
    spots.set(t, { x, y, w });
    x += w;
  }
  const height = Math.max(64, 2 ** Math.ceil(Math.log2(y + rowH)));
  canvas.width = width;
  canvas.height = height;
  // White on black, so the red channel is the glyphs' coverage: the canvas
  // is uploaded as it is, nothing is read back (that cost 0.7 s on a phone).
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  // Resizing resets the context: set the font again.
  ctx.font = style;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  for (const [t, s] of spots) ctx.fillText(t, s.x + 2, s.y + rowH / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.format = THREE.RedFormat;
  texture.flipY = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  const rects = new Map<string, { u0: number; v0: number; u1: number; v1: number; aspect: number }>();
  // Data row 0 is the canvas's top row: v grows downwards here.
  for (const [t, s] of spots) {
    rects.set(t, { u0: (s.x + 2) / width, v0: (s.y + rowH) / height, u1: (s.x + s.w - 2) / width, v1: s.y / height, aspect: (s.w - 4) / rowH });
  }
  return { texture, rects };
}

/** One quad per label, with its card's records so the shader moves it with the card. */
function labelMesh(list: { fig: number; l: Label }[], atlas: Atlas) {
  const n = list.length;
  const corner = new Float32Array(n * 8);
  const uv = new Float32Array(n * 16);
  const la = new Float32Array(n * 16);
  const lb = new Float32Array(n * 16);
  const lc = new Float32Array(n * 16);
  const info = new Float32Array(n * 16);
  const info2 = new Float32Array(n * 16);
  const index: number[] = [];
  const CORNERS = [0, 0, 1, 0, 0, 1, 1, 1];
  list.forEach(({ fig, l }, i) => {
    const r = atlas.rects.get(l.text)!;
    const m = l.motion;
    const a = [l.at[0], l.at[1], l.at[2], m ? m.speed : 0];
    const b = m ? [l.at[0] + m.by[0], l.at[1] + m.by[1], l.at[2] + m.by[2], m.phase] : [l.at[0], l.at[1], l.at[2], 0];
    const c = [l.ink.order, l.ink.kind, l.ink.size, l.ink.extra ?? 0];
    for (let v = 0; v < 4; v++) {
      const k = i * 4 + v;
      corner.set([CORNERS[v * 2]!, CORNERS[v * 2 + 1]!], k * 2);
      uv.set([r.u0, r.v0, r.u1, r.v1], k * 4);
      la.set(a, k * 4);
      lb.set(b, k * 4);
      lc.set(c, k * 4);
      info.set([fig, l.size, r.aspect, l.align], k * 4);
      info2.set([l.tone, fig === FIGURE.galaxy ? (l.ink.extra ?? 0) : 0, 0, 0], k * 4);
    }
    const o = i * 4;
    index.push(o, o + 1, o + 2, o + 2, o + 1, o + 3);
  });
  const g = new THREE.BufferGeometry();
  // three wants a position attribute to count vertices; the shader places them itself.
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 12), 3));
  g.setAttribute("corner", new THREE.BufferAttribute(corner, 2));
  g.setAttribute("uvRect", new THREE.BufferAttribute(uv, 4));
  g.setAttribute("la", new THREE.BufferAttribute(la, 4));
  g.setAttribute("lb", new THREE.BufferAttribute(lb, 4));
  g.setAttribute("lc", new THREE.BufferAttribute(lc, 4));
  g.setAttribute("info", new THREE.BufferAttribute(info, 4));
  g.setAttribute("info2", new THREE.BufferAttribute(info2, 4));
  g.setIndex(index);
  return g;
}
