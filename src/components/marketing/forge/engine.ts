import * as THREE from "three";
import {
  ADVECT_FRAG,
  COPY_FRAG,
  CURL_FRAG,
  DIVERGENCE_FRAG,
  GRADIENT_FRAG,
  PASS_VERT,
  POINTS_FRAG,
  POINTS_VERT,
  PRESSURE_FRAG,
  SCALE_FRAG,
  SIM_FRAG,
  SPLAT_FRAG,
  TONE_FRAG,
  VORTICITY_FRAG,
} from "./shaders";
import { buildStructures } from "./structures";

/** One of the two structures on screen, with its chapter's own progress. */
export type ForgeSlot = { sid: number; state: [number, number, number, number] };

/** What the page asks the field to show on this frame. */
export type ForgeFrame = {
  from: ForgeSlot;
  to: ForgeSlot;
  /** Particles move from `from` to `to` as mix goes 0 -> 1. */
  mix: number;
  /** Where the picture sits, in CSS pixels of the viewport: it is fitted into this box. */
  box: { cx: number; cy: number; w: number; h: number };
  rotY: number;
  rotX: number;
  opacity: number;
};

export type ForgeOptions = {
  /** Particles per side of the simulation texture: side² particles. */
  side: number;
  dpr: number;
  /** false when the visitor asked for reduced motion: no flow, no fluid, no sway. */
  motion: boolean;
};

export type Forge = { dispose(): void };

const CAMERA_Z = 6;
const HALF_FOV = THREE.MathUtils.degToRad(15);

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
    alpha: false,
    powerPreference: "high-performance",
  });
  // Positions need 32-bit floats: per-frame steps are smaller than half-float precision.
  if (!renderer.extensions.has("EXT_color_buffer_float")) {
    renderer.dispose();
    throw new Error("forge: float render targets unsupported");
  }
  renderer.setPixelRatio(opts.dpr);
  // Light on black: the canvas is screen-blended onto the page, black adds nothing.
  renderer.setClearColor(0x000000, 1);

  const N = opts.side;
  const SIM = N >= 256 ? 128 : 64;
  const DYE = SIM * 2;
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

  // ---- particle data: one random vector each, and their places in every structure
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
  const structures = buildStructures(count).map((s) => ({
    a: dataTexture(s.a),
    b: dataTexture(s.b),
    c: dataTexture(s.c),
    width: s.width,
    height: s.height,
  }));

  // Particles start as a wide loose cloud; the first picture forms out of it.
  const cloud = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    cloud[i * 4] = (Math.random() * 2 - 1) * 4;
    cloud[i * 4 + 1] = (Math.random() * 2 - 1) * 2.4;
    cloud[i * 4 + 2] = (Math.random() * 2 - 1) * 2;
    cloud[i * 4 + 3] = 1;
  }
  let pos = target(N, N, THREE.FloatType, THREE.NearestFilter);
  let posNext = target(N, N, THREE.FloatType, THREE.NearestFilter);
  const copy = material(COPY_FRAG, { uSource: tex(dataTexture(cloud)) });
  pass(copy, pos);

  // ---- fluid
  const half = THREE.HalfFloatType;
  let vel = target(SIM, SIM, half, THREE.LinearFilter);
  let velNext = target(SIM, SIM, half, THREE.LinearFilter);
  let dye = target(DYE, DYE, half, THREE.LinearFilter);
  let dyeNext = target(DYE, DYE, half, THREE.LinearFilter);
  let pressure = target(SIM, SIM, half, THREE.NearestFilter);
  let pressureNext = target(SIM, SIM, half, THREE.NearestFilter);
  const divergence = target(SIM, SIM, half, THREE.NearestFilter);
  const curl = target(SIM, SIM, half, THREE.NearestFilter);
  const texel = new THREE.Vector2(1 / SIM, 1 / SIM);

  const splat = material(SPLAT_FRAG, {
    uTarget: tex(),
    uAspect: { value: 1 },
    uColor: { value: new THREE.Vector3() },
    uA: { value: new THREE.Vector2() },
    uB: { value: new THREE.Vector2() },
    uRadius: { value: 0.04 },
  });
  const curlM = material(CURL_FRAG, { uVelocity: tex(), uTexel: { value: texel } });
  const vorticity = material(VORTICITY_FRAG, {
    uVelocity: tex(),
    uCurl: tex(curl.texture),
    uTexel: { value: texel },
    uCurlStrength: { value: 30 },
    uDt: { value: 1 / 60 },
  });
  const divergenceM = material(DIVERGENCE_FRAG, { uVelocity: tex(), uTexel: { value: texel } });
  const scale = material(SCALE_FRAG, { uSource: tex(), uValue: { value: 0.95 } });
  const pressureM = material(PRESSURE_FRAG, { uPressure: tex(), uDivergence: tex(divergence.texture), uTexel: { value: texel } });
  const gradient = material(GRADIENT_FRAG, { uPressure: tex(), uVelocity: tex(), uTexel: { value: texel } });
  const advect = material(ADVECT_FRAG, {
    uVelocity: tex(),
    uSource: tex(),
    uTexel: { value: texel },
    uDt: { value: 1 / 60 },
    uDissipation: { value: 0.98 },
  });

  // Uniforms shared by the simulation and the points: the two structures on screen.
  const slots = {
    uA0: tex(),
    uB0: tex(),
    uC0: tex(),
    uA1: tex(),
    uB1: tex(),
    uC1: tex(),
    uSid0: { value: 0 },
    uSid1: { value: 0 },
    uSt0: { value: new THREE.Vector4(-1, 0, 0, 0) },
    uSt1: { value: new THREE.Vector4(-1, 0, 0, 0) },
    uMix: { value: 0 },
    uTime: { value: 0 },
  };

  const sim = material(SIM_FRAG, {
    ...slots,
    uPos: tex(),
    uRandom: tex(randomTex),
    uVel: tex(),
    uDye: tex(),
    uHZ: { value: 1 },
    uMotion: { value: opts.motion ? 1 : 0 },
    uStrength: { value: 0.5 },
    uProj: { value: new THREE.Matrix4() },
    uModel: { value: new THREE.Matrix4() },
    uInvModel: { value: new THREE.Matrix3() },
    uFlowScale: { value: new THREE.Vector2() },
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
    uSize: { value: mobile ? 3.2 : 2.4 },
    uDPR: { value: opts.dpr },
    uOpacity: { value: 1 },
  };
  const pointsMat = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    uniforms: pointsU,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  materials.push(pointsMat);
  const points = new THREE.Points(geometry, pointsMat);
  points.frustumCulled = false;
  group.add(points);

  const hdr = target(1, 1, THREE.HalfFloatType, THREE.LinearFilter);
  const tone = material(TONE_FRAG, { uTex: tex(hdr.texture), uExposure: { value: 1.1 } });

  // ---- pointer: the cursor stirs the fluid and turns the camera a little
  const pointer = { x: 0, y: 0, px: 0, py: 0, moved: false, seen: false, last: 0 };
  const move = (x: number, y: number) => {
    if (!pointer.seen) {
      pointer.px = x;
      pointer.py = y;
      pointer.seen = true;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.moved = true;
  };
  const onPointer = (e: PointerEvent) => move(e.clientX, e.clientY);
  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) move(t.clientX, t.clientY);
  };
  if (opts.motion) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
  }

  let W = 1;
  let H = 1;
  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    splat.u.uAspect.value = W / H;
    hdr.setSize(Math.max(1, Math.floor(W * opts.dpr)), Math.max(1, Math.floor(H * opts.dpr)));
  };
  resize();
  window.addEventListener("resize", resize);

  const clampMap = (v: number, a: number, b: number, c: number, d: number) =>
    c + (d - c) * Math.min(1, Math.max(0, (v - a) / (b - a)));

  function splatInto(source: THREE.WebGLRenderTarget, out: THREE.WebGLRenderTarget, color: THREE.Vector3Like) {
    splat.u.uTarget.value = source.texture;
    splat.u.uColor.value.copy(color);
    pass(splat, out);
  }

  function fluidStep() {
    if (pointer.moved) {
      const dx = pointer.x - pointer.px;
      const dy = pointer.y - pointer.py;
      const len = Math.hypot(dx, dy);
      if (len > 0.01) {
        const now = performance.now();
        // After a pause the stroke starts where the cursor is, not where it was.
        const fresh = now - pointer.last > 50;
        pointer.last = now;
        const ax = fresh ? pointer.x : pointer.px;
        const ay = fresh ? pointer.y : pointer.py;
        splat.u.uA.value.set(ax / W, 1 - ay / H);
        splat.u.uB.value.set(pointer.x / W, 1 - pointer.y / H);
        splat.u.uRadius.value = clampMap(len, 0, 5, 0.01, 0.06) * (mobile ? 0.8 : 1);
        const force = clampMap(len, 0, 15, 0.4, 2.2);
        // Mouse px per frame -> fluid texels per second.
        splatInto(vel, velNext, { x: (dx / W) * SIM * 60 * force, y: (-dy / H) * SIM * 60 * force, z: 0 });
        [vel, velNext] = [velNext, vel];
        splatInto(dye, dyeNext, { x: 1, y: 1, z: 1 });
        [dye, dyeNext] = [dyeNext, dye];
      }
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.moved = false;
    }

    curlM.u.uVelocity.value = vel.texture;
    pass(curlM, curl);
    vorticity.u.uVelocity.value = vel.texture;
    pass(vorticity, velNext);
    [vel, velNext] = [velNext, vel];
    divergenceM.u.uVelocity.value = vel.texture;
    pass(divergenceM, divergence);
    scale.u.uSource.value = pressure.texture;
    pass(scale, pressureNext);
    [pressure, pressureNext] = [pressureNext, pressure];
    for (let i = 0; i < 5; i++) {
      pressureM.u.uPressure.value = pressure.texture;
      pass(pressureM, pressureNext);
      [pressure, pressureNext] = [pressureNext, pressure];
    }
    gradient.u.uPressure.value = pressure.texture;
    gradient.u.uVelocity.value = vel.texture;
    pass(gradient, velNext);
    [vel, velNext] = [velNext, vel];
    advect.u.uVelocity.value = vel.texture;
    advect.u.uSource.value = vel.texture;
    advect.u.uDissipation.value = 0.98;
    pass(advect, velNext);
    [vel, velNext] = [velNext, vel];
    advect.u.uVelocity.value = vel.texture;
    advect.u.uSource.value = dye.texture;
    advect.u.uDissipation.value = 0.97;
    pass(advect, dyeNext);
    [dye, dyeNext] = [dyeNext, dye];
  }

  function setSlots(f: ForgeFrame, time: number) {
    const s0 = structures[f.from.sid] ?? structures[0]!;
    const s1 = structures[f.to.sid] ?? structures[0]!;
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
    slots.uMix.value = f.mix;
    slots.uTime.value = time;
    return { s0, s1 };
  }

  const inverse = new THREE.Matrix4();
  function simStep(hz: number) {
    const u = sim.u;
    const halfH = Math.tan(HALF_FOV) * CAMERA_Z;
    u.uPos.value = pos.texture;
    u.uVel.value = vel.texture;
    u.uDye.value = dye.texture;
    u.uHZ.value = hz;
    u.uProj.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    u.uModel.value.copy(group.matrixWorld);
    u.uInvModel.value.setFromMatrix4(inverse.copy(group.matrixWorld).invert());
    u.uFlowScale.value.set((2 * halfH * camera.aspect) / SIM, (2 * halfH) / SIM);
    pass(sim, posNext);
    [pos, posNext] = [posNext, pos];
  }

  /** Fits the blend of the two structures into the box the page gives, in viewport pixels. */
  function place(f: ForgeFrame, s0: { width: number; height: number }, s1: { width: number; height: number }, time: number) {
    const halfH = Math.tan(HALF_FOV) * CAMERA_Z;
    const perPx = (2 * halfH) / H;
    const w = s0.width + (s1.width - s0.width) * f.mix;
    const h = s0.height + (s1.height - s0.height) * f.mix;
    const fit = Math.min((f.box.w * perPx) / w, (f.box.h * perPx) / h);
    group.position.set((f.box.cx - W / 2) * perPx, (H / 2 - f.box.cy) * perPx, 0);
    group.scale.setScalar(Math.max(0.01, fit));
    const sway = opts.motion ? 1 : 0;
    group.rotation.set(f.rotX + Math.sin(time * 0.19) * 0.04 * sway, f.rotY + Math.sin(time * 0.23) * 0.14 * sway, 0);
    // Gaze: the camera leans a little towards the cursor.
    const gx = pointer.seen && opts.motion ? (pointer.x / W) * 2 - 1 : 0;
    const gy = pointer.seen && opts.motion ? (pointer.y / H) * 2 - 1 : 0;
    camera.position.x += (-gx * 0.25 - camera.position.x) * 0.05;
    camera.position.y += (gy * 0.18 - camera.position.y) * 0.05;
    camera.lookAt(camera.position.x * 0.6, camera.position.y * 0.6, 0);
    group.updateMatrixWorld();
    camera.updateMatrixWorld();
  }

  function draw(f: ForgeFrame) {
    pointsU.uPos.value = pos.texture;
    pointsU.uOpacity.value = f.opacity;
    renderer.setRenderTarget(hdr);
    renderer.render(scene, camera);
    pass(tone, null);
  }

  let prev = performance.now();
  let time = 0;
  let lastKey = "";
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (opts.motion) time += dt;
    const f = next(dt, time);
    const { s0, s1 } = setSlots(f, time);
    place(f, s0, s1, time);
    if (opts.motion) {
      fluidStep();
      simStep(dt * 60);
      draw(f);
      return;
    }
    // Reduced motion: nothing flows. When the requested picture changes,
    // settle the particles in one go and draw a single still frame.
    const key = `${f.from.sid}|${f.to.sid}|${f.mix.toFixed(2)}|${f.from.state.join()}|${f.to.state.join()}|${Math.round(f.box.cx)}|${Math.round(f.box.cy)}|${Math.round(f.box.w)}|${f.opacity.toFixed(2)}|${W}x${H}`;
    if (key === lastKey) return;
    lastKey = key;
    for (let i = 0; i < 90; i++) simStep(3);
    draw(f);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
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
