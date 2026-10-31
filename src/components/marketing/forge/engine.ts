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
  PROJECT_FRAG,
  SCALE_FRAG,
  SIM_FRAG,
  SPLAT_FRAG,
  TONE_FRAG,
  VORTICITY_FRAG,
} from "./shaders";

/** What the page asks the field to show on this frame. */
export type ForgeFrame = {
  /** Particles move from sculpture A to B as mix goes 0 -> 1 (-1 = loose cloud). */
  shapeA: number;
  shapeB: number;
  mix: number;
  /** Sculpture centre, as a fraction of the viewport from its centre (x right, y up). */
  x: number;
  y: number;
  /** Sculpture height as a fraction of the viewport height. */
  size: number;
  opacity: number;
};

export type ForgeOptions = {
  /** Particles per side of the simulation texture: side² particles. */
  side: number;
  dpr: number;
  /** false when the visitor asked for reduced motion: no drift, no fluid, no travel. */
  motion: boolean;
};

export type Forge = { dispose(): void };

const BG = 0x0a0908; // --color-bg
const SHAPE_SPAN = 1.7; // sculptures are about 1.7 units tall in their own space
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
  // Every pass overwrites its whole target; the points are summed on black
  // and the tone pass paints the page background itself.
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
  const target = (size: number, type: THREE.TextureDataType, filter: THREE.MagnificationTextureFilter) => {
    const t = new THREE.WebGLRenderTarget(size, size, {
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

  // ---- particles: start as a loose cloud, each with its own random vector
  const count = N * N;
  const origin = new Float32Array(count * 4);
  const random = new Float32Array(count * 4);
  const ref = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    origin[i * 4] = (Math.random() * 2 - 1) * 1.6;
    origin[i * 4 + 1] = (Math.random() * 2 - 1) * 1.1;
    origin[i * 4 + 2] = (Math.random() * 2 - 1) * 1.1;
    origin[i * 4 + 3] = 1;
    for (let k = 0; k < 4; k++) random[i * 4 + k] = Math.random();
    ref[i * 2] = ((i % N) + 0.5) / N;
    ref[i * 2 + 1] = (Math.floor(i / N) + 0.5) / N;
  }
  const dataTexture = (data: Float32Array) => {
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType);
    t.needsUpdate = true;
    return t;
  };
  const originTex = dataTexture(origin);
  const randomTex = dataTexture(random);

  let pos = target(N, THREE.FloatType, THREE.NearestFilter);
  let posNext = target(N, THREE.FloatType, THREE.NearestFilter);
  const copy = material(COPY_FRAG, { uSource: tex(originTex) });
  pass(copy, pos);

  // Each particle's own place on each sculpture, computed once.
  const SHAPES = 4;
  const project = material(PROJECT_FRAG, { uOrigin: tex(originTex), uRandom: tex(randomTex), uShape: { value: 0 } });
  const homes = Array.from({ length: SHAPES }, (_, shape) => {
    const home = target(N, THREE.FloatType, THREE.NearestFilter);
    project.u.uShape.value = shape;
    pass(project, home);
    return home;
  });
  const homeOf = (shape: number) => homes[Math.round(shape)] ?? null;

  // ---- fluid
  const half = THREE.HalfFloatType;
  let vel = target(SIM, half, THREE.LinearFilter);
  let velNext = target(SIM, half, THREE.LinearFilter);
  let dye = target(DYE, half, THREE.LinearFilter);
  let dyeNext = target(DYE, half, THREE.LinearFilter);
  let pressure = target(SIM, half, THREE.NearestFilter);
  let pressureNext = target(SIM, half, THREE.NearestFilter);
  const divergence = target(SIM, half, THREE.NearestFilter);
  const curl = target(SIM, half, THREE.NearestFilter);
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
  const pressureM = material(PRESSURE_FRAG, {
    uPressure: tex(),
    uDivergence: tex(divergence.texture),
    uTexel: { value: texel },
  });
  const gradient = material(GRADIENT_FRAG, { uPressure: tex(), uVelocity: tex(), uTexel: { value: texel } });
  const advect = material(ADVECT_FRAG, {
    uVelocity: tex(),
    uSource: tex(),
    uTexel: { value: texel },
    uDt: { value: 1 / 60 },
    uDissipation: { value: 0.98 },
  });

  // ---- simulation
  const sim = material(SIM_FRAG, {
    uPos: tex(),
    uOrigin: tex(originTex),
    uRandom: tex(randomTex),
    uVel: tex(),
    uDye: tex(),
    uTime: { value: 0 },
    uHZ: { value: 1 },
    uHomeA: tex(),
    uHomeB: tex(),
    uHasA: { value: 0 },
    uHasB: { value: 0 },
    uMix: { value: 0 },
    uMotion: { value: opts.motion ? 1 : 0 },
    uStrength: { value: 0.55 },
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
  const pointsU = {
      uPos: tex(pos.texture),
      uSize: { value: mobile ? 3.4 : 2.3 },
      uDPR: { value: opts.dpr },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uAccent: { value: new THREE.Vector3(1, 0.48, 0.18) }, // molten
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
  const hdr = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  targets.push(hdr);
  // Raw sRGB components: the tone pass writes display values, so a THREE.Color
  // (converted to linear by colour management) would come out too dark.
  const tone = material(TONE_FRAG, {
    uTex: tex(hdr.texture),
    uBg: { value: new THREE.Vector3(((BG >> 16) & 255) / 255, ((BG >> 8) & 255) / 255, (BG & 255) / 255) },
    uExposure: { value: 1.15 },
  });
  const points = new THREE.Points(geometry, pointsMat);
  points.frustumCulled = false;
  group.add(points);

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
    hdr.setSize(Math.max(1, Math.floor(W * opts.dpr)), Math.max(1, Math.floor(H * opts.dpr)));
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    splat.u.uAspect.value = W / H;
  };
  resize();
  window.addEventListener("resize", resize);

  const clampMap = (v: number, a: number, b: number, c: number, d: number) =>
    c + (d - c) * Math.min(1, Math.max(0, (v - a) / (b - a)));

  function splatAt(out: () => THREE.WebGLRenderTarget, into: () => THREE.WebGLRenderTarget, color: THREE.Vector3Like, swap: () => void) {
    splat.u.uTarget.value = out().texture;
    splat.u.uColor.value.copy(color);
    pass(splat, into());
    swap();
  }

  function fluidStep() {
    if (pointer.moved) {
      const dx = pointer.x - pointer.px;
      const dy = pointer.y - pointer.py;
      const len = Math.hypot(dx, dy);
      if (len > 0.01) {
        const now = performance.now();
        const fresh = now - pointer.last > 50;
        pointer.last = now;
        // After a pause the stroke starts where the cursor is, not where it was.
        const ax = fresh ? pointer.x : pointer.px;
        const ay = fresh ? pointer.y : pointer.py;
        splat.u.uA.value.set(ax / W, 1 - ay / H);
        splat.u.uB.value.set(pointer.x / W, 1 - pointer.y / H);
        splat.u.uRadius.value = (clampMap(len, 0, 5, 0.01, 0.06) * (mobile ? 0.8 : 1));
        const force = clampMap(len, 0, 15, 0.4, 2.2);
        // Mouse px per frame -> fluid texels per second.
        const v = { x: (dx / W) * SIM * 60 * force, y: (-dy / H) * SIM * 60 * force, z: 0 };
        splatAt(() => vel, () => velNext, v, () => ([vel, velNext] = [velNext, vel]));
        splatAt(() => dye, () => dyeNext, { x: 1, y: 1, z: 1 }, () => ([dye, dyeNext] = [dyeNext, dye]));
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

  const inverse = new THREE.Matrix4();
  function simStep(f: ForgeFrame, hz: number, time: number) {
    const u = sim.u;
    const halfH = Math.tan(HALF_FOV) * CAMERA_Z;
    u.uPos.value = pos.texture;
    u.uVel.value = vel.texture;
    u.uDye.value = dye.texture;
    u.uTime.value = time;
    u.uHZ.value = hz;
    const a = homeOf(f.shapeA);
    const b = homeOf(f.shapeB);
    u.uHomeA.value = a ? a.texture : null;
    u.uHomeB.value = b ? b.texture : null;
    u.uHasA.value = a ? 1 : 0;
    u.uHasB.value = b ? 1 : 0;
    u.uMix.value = f.mix;
    u.uProj.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    u.uModel.value.copy(group.matrixWorld);
    u.uInvModel.value.setFromMatrix4(inverse.copy(group.matrixWorld).invert());
    u.uFlowScale.value.set((2 * halfH * camera.aspect) / SIM, (2 * halfH) / SIM);
    pass(sim, posNext);
    [pos, posNext] = [posNext, pos];
  }

  function place(f: ForgeFrame, time: number) {
    const halfH = Math.tan(HALF_FOV) * CAMERA_Z;
    const halfW = halfH * camera.aspect;
    group.position.set(f.x * 2 * halfW, f.y * 2 * halfH, 0);
    group.scale.setScalar((f.size * 2 * halfH) / SHAPE_SPAN);
    const sway = opts.motion ? 1 : 0;
    group.rotation.set(-0.08 + Math.sin(time * 0.21) * 0.05 * sway, Math.sin(time * 0.27) * 0.32 * sway, 0);
    // Gaze: the camera leans a little towards the cursor.
    const gx = pointer.seen && opts.motion ? (pointer.x / W) * 2 - 1 : 0;
    const gy = pointer.seen && opts.motion ? (pointer.y / H) * 2 - 1 : 0;
    camera.position.x += (-gx * 0.35 - camera.position.x) * 0.05;
    camera.position.y += (gy * 0.25 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
    group.updateMatrixWorld();
    camera.updateMatrixWorld();
  }

  function draw(f: ForgeFrame, time: number) {
    pointsU.uPos.value = pos.texture;
    pointsU.uTime.value = time;
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
    time += dt;
    const f = next(dt, time);
    place(f, time);
    if (opts.motion) {
      fluidStep();
      simStep(f, dt * 60, time);
      draw(f, time);
      return;
    }
    // Reduced motion: no travel to watch. When the requested state changes,
    // settle the particles in one go and draw a single still frame.
    const key = `${f.shapeA}|${f.shapeB}|${f.mix.toFixed(2)}|${f.x.toFixed(3)}|${f.y.toFixed(3)}|${f.size.toFixed(3)}|${f.opacity.toFixed(2)}|${W}x${H}`;
    if (key === lastKey) return;
    lastKey = key;
    for (let i = 0; i < 160; i++) simStep(f, 2, 0);
    draw(f, 0);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", resize);
      targets.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      originTex.dispose();
      randomTex.dispose();
      geometry.dispose();
      quad.geometry.dispose();
      renderer.dispose();
    },
  };
}
