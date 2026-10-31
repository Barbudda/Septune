/**
 * GLSL for the forge field: a GPU particle cloud that settles on one
 * sculpture per homepage chapter and is stirred by a small fluid simulation
 * driven by the cursor. Compiled by three's ShaderMaterial (WebGL2), which
 * maps texture2D / gl_FragColor for us.
 */

/** Full-screen pass: every simulation step renders one quad. */
export const PASS_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/**
 * The points are summed in a half-float buffer, then rolled off here:
 * where hundreds of them stack (a node, a joint) the light saturates softly
 * instead of clipping to a white blot. Composited on the page background.
 */
export const TONE_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec3 uBg;
uniform float uExposure;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  vec3 m = 1.0 - exp(-c * uExposure);
  gl_FragColor = vec4(uBg + (1.0 - uBg) * m, 1.0);
}`;

export const COPY_FRAG = /* glsl */ `
uniform sampler2D uSource;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(uSource, vUv); }`;

// ---------------------------------------------------------------- shapes
// Signed distance functions of the sculptures, about 0.85 units across.
// 0 = the Septune mark (chevrons around a point, in the logo's square),
// 1 = a pull request (a branch leaving main and merging back),
// 2 = a site (root page, sections, pages),
// 3 = a fix (a check inside a ring).
const SHAPES = /* glsl */ `
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float sdTorus(vec3 p, float R, float r) {
  vec2 q = vec2(length(p.xy) - R, p.z);
  return length(q) - r;
}
// Outline of a rounded square in the xy plane, as a tube of radius th.
// ("half" is a reserved word in GLSL ES, hence hs.)
float sdFrame(vec3 p, float hs, float rad, float th) {
  vec2 q = abs(p.xy) - hs + rad;
  float d2 = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
  return length(vec2(d2, p.z)) - th;
}

float sMark(vec3 p) {
  float r = 0.072;
  float d = sdCapsule(p, vec3(-0.22, 0.38, 0.0), vec3(-0.52, 0.0, 0.0), r);
  d = min(d, sdCapsule(p, vec3(-0.52, 0.0, 0.0), vec3(-0.22, -0.38, 0.0), r));
  d = min(d, sdCapsule(p, vec3(0.22, 0.38, 0.0), vec3(0.52, 0.0, 0.0), r * 0.8));
  d = min(d, sdCapsule(p, vec3(0.52, 0.0, 0.0), vec3(0.22, -0.38, 0.0), r * 0.8));
  d = min(d, length(p) - 0.12);
  d = min(d, sdFrame(p, 0.84, 0.22, 0.03));
  return d;
}

float sBranch(vec3 p) {
  float d = sdCapsule(p, vec3(-0.3, -0.8, 0.0), vec3(-0.3, 0.8, 0.0), 0.05);
  d = min(d, sdCapsule(p, vec3(-0.3, -0.45, 0.0), vec3(0.04, -0.27, 0.14), 0.042));
  d = min(d, sdCapsule(p, vec3(0.04, -0.27, 0.14), vec3(0.32, 0.02, 0.2), 0.042));
  d = min(d, sdCapsule(p, vec3(0.32, 0.02, 0.2), vec3(0.12, 0.33, 0.12), 0.042));
  d = min(d, sdCapsule(p, vec3(0.12, 0.33, 0.12), vec3(-0.3, 0.5, 0.0), 0.042));
  d = min(d, length(p - vec3(-0.3, -0.64, 0.0)) - 0.075);
  d = min(d, length(p - vec3(-0.3, 0.66, 0.0)) - 0.075);
  d = min(d, length(p - vec3(0.32, 0.02, 0.2)) - 0.085);
  return d;
}

float sTree(vec3 p) {
  vec3 root = vec3(0.0, 0.62, 0.0);
  float d = length(p - root) - 0.11;
  for (int i = 0; i < 3; i++) {
    float a = float(i) * 2.0944 + 0.5;
    vec3 c = vec3(cos(a) * 0.42, 0.06, sin(a) * 0.42);
    d = min(d, sdCapsule(p, root, c, 0.024));
    d = min(d, length(p - c) - 0.08);
    for (int j = 0; j < 3; j++) {
      float b = a + (float(j) - 1.0) * 0.62;
      vec3 g = vec3(cos(b) * 0.74, -0.56, sin(b) * 0.74);
      d = min(d, sdCapsule(p, c, g, 0.018));
      d = min(d, length(p - g) - 0.055);
    }
  }
  return d;
}

float sCheck(vec3 p) {
  float d = sdTorus(p, 0.72, 0.04);
  d = min(d, sdCapsule(p, vec3(-0.34, 0.02, 0.0), vec3(-0.1, -0.24, 0.0), 0.075));
  d = min(d, sdCapsule(p, vec3(-0.1, -0.24, 0.0), vec3(0.37, 0.3, 0.0), 0.075));
  return d;
}

float shapeSDF(float id, vec3 p) {
  if (id < 0.5) return sMark(p);
  if (id < 1.5) return sBranch(p);
  if (id < 2.5) return sTree(p);
  return sCheck(p);
}
// Tetrahedral gradient: four evaluations instead of six.
vec3 shapeNormal(float id, vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.002;
  return normalize(
    k.xyy * shapeSDF(id, p + k.xyy * e) + k.yyx * shapeSDF(id, p + k.yyx * e) +
    k.yxy * shapeSDF(id, p + k.yxy * e) + k.xxx * shapeSDF(id, p + k.xxx * e));
}
`;

// Curl of a sine-sum potential: divergence-free drift, so the cloud swirls
// instead of clumping.
const CURL = /* glsl */ `
vec3 potential(vec3 p, float t) {
  return vec3(
    sin(p.y * 1.7 + t) + sin(p.z * 2.3 - t * 0.7),
    sin(p.z * 1.3 + t * 0.9) + sin(p.x * 2.1 + t * 0.3),
    sin(p.x * 1.9 - t * 0.6) + sin(p.y * 2.7 + t * 0.5));
}
vec3 curlNoise(vec3 p, float t) {
  const float e = 0.01;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 x0 = potential(p - dx, t), x1 = potential(p + dx, t);
  vec3 y0 = potential(p - dy, t), y1 = potential(p + dy, t);
  vec3 z0 = potential(p - dz, t), z1 = potential(p + dz, t);
  vec3 c = vec3((y1.z - y0.z) - (z1.y - z0.y), (z1.x - z0.x) - (x1.z - x0.z), (x1.y - x0.y) - (y1.x - y0.x));
  return c / (2.0 * e);
}
`;

/**
 * Runs once per sculpture at start-up: gives every particle its own place on
 * the surface (its start position projected onto the shape, plus a little
 * thickness). Particles then travel to that place. Pulling them onto the
 * nearest surface instead made particles that met follow the same path for
 * ever, and the sculptures broke into bright clumps after a few changes.
 */
export const PROJECT_FRAG = /* glsl */ `
uniform sampler2D uOrigin;
uniform sampler2D uRandom;
uniform float uShape;
varying vec2 vUv;
${SHAPES}
void main() {
  vec3 p = texture2D(uOrigin, vUv).xyz * 0.75;
  vec4 rnd = texture2D(uRandom, vUv);
  for (int i = 0; i < 24; i++) p -= shapeNormal(uShape, p) * shapeSDF(uShape, p);
  p += shapeNormal(uShape, p) * (rnd.y - 0.5) * 0.035;
  gl_FragColor = vec4(p, 1.0);
}`;

/**
 * One simulation step per frame. Each particle belongs to sculpture A or B:
 * it switches to B once uMix passes its own random threshold, so a sculpture
 * is built (or rebuilt into the next one) a few particles at a time. A
 * sculpture that is "none" (uHasA/uHasB = 0) is the loose starting cloud.
 */
export const SIM_FRAG = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uOrigin;
uniform sampler2D uRandom;
uniform sampler2D uHomeA;   // each particle's place on sculpture A
uniform sampler2D uHomeB;
uniform float uHasA;
uniform float uHasB;
uniform sampler2D uVel;
uniform sampler2D uDye;
uniform float uTime;
uniform float uHZ;
uniform float uMix;
uniform float uMotion;     // 0 when the visitor asked for reduced motion
uniform float uStrength;   // how hard the fluid pushes
uniform mat4 uProj;        // projection * view
uniform mat4 uModel;       // sculpture group, world matrix
uniform mat3 uInvModel;    // world direction -> sculpture space
uniform vec2 uFlowScale;   // world units per fluid texel, x and y
varying vec2 vUv;
${CURL}
void main() {
  vec3 pos = texture2D(uPos, vUv).xyz;
  vec4 rnd = texture2D(uRandom, vUv);
  bool onB = rnd.w < uMix;
  float has = onB ? uHasB : uHasA;
  vec3 home = has > 0.5
    ? (onB ? texture2D(uHomeB, vUv).xyz : texture2D(uHomeA, vUv).xyz)
    : texture2D(uOrigin, vUv).xyz;

  pos += normalize(curlNoise(pos * 0.9, uTime * 0.05) + 1e-5) * 0.0007 * uHZ * uMotion;

  // Travel home at a capped speed, slowing at the end. The distance left is
  // written to .w so the renderer dims travellers into dust.
  vec3 to = home - pos;
  float travel = length(to);
  pos += to / max(travel, 1e-5) * min(travel * 0.07, 0.028) * uHZ;
  // Far from home each particle drifts on its own noise: the trip reads as
  // dust settling, not as particles queuing on the same path.
  vec3 dust = normalize(curlNoise(pos * 2.3 + rnd.xyz * 6.0, uTime * 0.3) + 1e-5);
  pos += dust * 0.006 * smoothstep(0.04, 0.45, travel) * uHZ * uMotion;
  if (has < 0.5) travel = 0.6;

  // The fluid only pushes where the cursor has been (dye mask).
  vec4 clip = uProj * (uModel * vec4(pos, 1.0));
  vec2 suv = clip.xy / clip.w * 0.5 + 0.5;
  if (uMotion > 0.5 && suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
    vec2 vel = texture2D(uVel, suv).xy;
    float dye = texture2D(uDye, suv).r;
    vec3 push = uInvModel * vec3(vel * uFlowScale, 0.0);
    pos += push * (1.0 / 60.0) * uHZ * uStrength * min(dye, 1.0);
  }

  if (length(pos) > 3.0) pos *= 0.5;
  gl_FragColor = vec4(pos, travel);
}`;

/** Each point looks up its position in the simulation texture. */
export const POINTS_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform float uSize;
uniform float uDPR;
attribute vec2 ref;
attribute vec4 rnd;
varying vec4 vRnd;
varying float vTravel;
void main() {
  vec4 state = texture2D(uPos, ref);
  vec3 pos = state.xyz;
  vTravel = state.w;
  pos *= mix(1.0, 1.4, pow(rnd.y, 150.0));
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uDPR * mix(0.55, 1.0, rnd.z) * (6.0 / -mv.z);
  vRnd = rnd;
}`;

/** Soft shaded sprite, mostly warm grey, a few molten points that glint. */
export const POINTS_FRAG = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uAccent;
varying vec4 vRnd;
varying float vTravel;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
  float light = 0.35 + 0.65 * clamp(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0, 1.0);
  vec3 base = vec3(1.0, 0.94, 0.88) * mix(0.05, 0.24, vRnd.x);
  vec3 col = mix(base, uAccent, pow(vRnd.z, 40.0));
  float glint = 1.0 + (0.4 + sin(uTime * 4.0 + vRnd.y * 20.0)) * pow(vRnd.z, 10.0) * 1.6;
  // Travelling particles are dust; they light up once they reach the sculpture.
  float settled = mix(1.0, 0.28, smoothstep(0.03, 0.35, vTravel));
  gl_FragColor = vec4(col * light * glint * settled * uOpacity, 1.0);
}`;

// ---------------------------------------------------------------- fluid
// A small stable-fluids solver (curl, vorticity, divergence, pressure,
// projection, advection). Velocity is in fluid texels per second.

export const SPLAT_FRAG = /* glsl */ `
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uA;
uniform vec2 uB;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec2 p = vUv, a = uA, b = uB;
  p.x *= uAspect; a.x *= uAspect; b.x *= uAspect;
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  float d = length(pa - ba * h);
  vec3 splat = exp(-d * d / (uRadius * uRadius)) * uColor;
  gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
}`;

export const CURL_FRAG = /* glsl */ `
uniform sampler2D uVelocity;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

export const VORTICITY_FRAG = /* glsl */ `
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform float uCurlStrength;
uniform float uDt;
varying vec2 vUv;
void main() {
  float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 1e-4;
  force *= uCurlStrength * C;
  force.y *= -1.0;
  vec2 vel = texture2D(uVelocity, vUv).xy + force * uDt;
  gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
}`;

export const DIVERGENCE_FRAG = /* glsl */ `
uniform sampler2D uVelocity;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec2 C = texture2D(uVelocity, vUv).xy;
  float L = vUv.x - uTexel.x < 0.0 ? -C.x : texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float R = vUv.x + uTexel.x > 1.0 ? -C.x : texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float T = vUv.y + uTexel.y > 1.0 ? -C.y : texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  float B = vUv.y - uTexel.y < 0.0 ? -C.y : texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

export const SCALE_FRAG = /* glsl */ `
uniform sampler2D uSource;
uniform float uValue;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(uSource, vUv) * uValue; }`;

export const PRESSURE_FRAG = /* glsl */ `
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float div = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}`;

export const GRADIENT_FRAG = /* glsl */ `
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}`;

export const ADVECT_FRAG = /* glsl */ `
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;
varying vec2 vUv;
void main() {
  vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;
  gl_FragColor = uDissipation * texture2D(uSource, coord);
}`;
