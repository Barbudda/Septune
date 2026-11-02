import * as THREE from "three";
import { COPY_FRAG, PASS_VERT, POINTS_FRAG, POINTS_VERT, SIM_FRAG, TONE_FRAG } from "./shaders";
import { buildFigures } from "./structures";

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
  /** Which figure the box is sized for: 0 `from`, 1 `to` (it switches while the picture is unseen). */
  fit: number;
  /** Where the picture sits, in CSS pixels of the viewport: it is fitted into this box. */
  box: { cx: number; cy: number; w: number; h: number };
  rotY: number;
  rotX: number;
  /** Where it may show. None: nothing to draw, the loop rests. */
  regions: ForgeRegion[];
};

export type ForgeOptions = {
  /** Particles per side of the simulation texture: side² particles. */
  side: number;
  dpr: number;
  /** false when the visitor asked for reduced motion: still figures, no sway. */
  motion: boolean;
};

export type Forge = { dispose(): void };

const CAMERA_Z = 6;
const HALF_FOV = THREE.MathUtils.degToRad(15);
const MAX_REGIONS = 4;

/**
 * Starts the forge field on the canvas. Throws when the browser can't run
 * it (no WebGL2 or no float render targets); the caller then shows nothing.
 */
export function createForge(
  canvas: HTMLCanvasElement,
  opts: ForgeOptions,
  next: (dt: number, time: number) => ForgeFrame,
): Forge {
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
  const count = N * N;
  const random = new Float32Array(count * 4);
  const ref = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) random[i * 4 + k] = Math.random();
    ref[i * 2] = ((i % N) + 0.5) / N;
    ref[i * 2 + 1] = (Math.floor(i / N) + 0.5) / N;
  }
  const textures: THREE.DataTexture[] = [];
  const dataTexture = (data: Float32Array) => {
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType);
    t.needsUpdate = true;
    textures.push(t);
    return t;
  };
  const randomTex = dataTexture(random);
  const built = buildFigures(count);
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

  // Uniforms shared by the simulation and the points: the two figures on screen.
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

  const hdr = target(1, 1, THREE.HalfFloatType, THREE.LinearFilter);
  const rects = Array.from({ length: MAX_REGIONS }, () => new THREE.Vector4());
  const tone = material(TONE_FRAG, {
    uTex: tex(hdr.texture),
    uExposure: { value: 1.25 },
    uGlow: { value: 0.8 },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uView: { value: new THREE.Vector2(1, 1) },
    uRect: { value: rects },
    uRadius: { value: [0, 0, 0, 0] },
    uCount: { value: 0 },
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
    slots.uSpan.value.set(-s1.width / 2, s1.width, -s1.height / 2, s1.height);
    return { s0, s1 };
  }

  function setRegions(regions: ForgeRegion[]) {
    const n = Math.min(MAX_REGIONS, regions.length);
    for (let i = 0; i < n; i++) {
      const r = regions[i]!;
      rects[i]!.set(r.x0, r.y0, r.x1, r.y1);
      tone.u.uRadius.value[i] = r.r;
    }
    tone.u.uCount.value = n;
  }

  /** Fits the blend of the two figures into the box the page gives, in viewport pixels. */
  function place(f: ForgeFrame, s0: { width: number; height: number }, s1: { width: number; height: number }, time: number) {
    const halfH = Math.tan(HALF_FOV) * CAMERA_Z;
    const perPx = (2 * halfH) / H;
    const w = f.fit ? s1.width : s0.width;
    const h = f.fit ? s1.height : s0.height;
    const fit = Math.min((f.box.w * perPx) / w, (f.box.h * perPx) / h);
    group.position.set((f.box.cx - W / 2) * perPx, (H / 2 - f.box.cy) * perPx, 0);
    group.scale.setScalar(Math.max(0.01, fit));
    // A breath of sway, never more than about two degrees.
    const sway = opts.motion ? 1 : 0;
    group.rotation.set(f.rotX + Math.sin(time * 0.19) * 0.012 * sway, f.rotY + Math.sin(time * 0.23) * 0.035 * sway, 0);
    group.updateMatrixWorld();
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
    setRegions(f.regions);
    if (opts.motion) {
      simStep(dt);
      draw();
      return;
    }
    // Reduced motion: nothing moves on its own. The figures land in place and
    // the canvas is drawn again only when the page asks for something else.
    const key = `${f.from.sid}|${f.to.sid}|${f.mix.toFixed(2)}|${f.from.state.join()}|${f.to.state.join()}|${Math.round(f.box.cx)}|${Math.round(f.box.cy)}|${Math.round(f.box.w)}|${f.regions.map((r) => `${Math.round(r.x0)},${Math.round(r.y0)},${Math.round(r.x1)},${Math.round(r.y1)}`).join(";")}|${W}x${H}`;
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
      quad.geometry.dispose();
      renderer.dispose();
    },
  };
}
