/**
 * GLSL for the forge field: a GPU particle cloud that takes the shape of
 * what each homepage chapter says (structures.ts), keeps flowing along it,
 * and is stirred by a small fluid simulation driven by the cursor. Compiled
 * by three's ShaderMaterial (WebGL2), which maps texture2D / gl_FragColor.
 */

/** Full-screen pass: every simulation step renders one quad. */
export const PASS_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const COPY_FRAG = /* glsl */ `
uniform sampler2D uSource;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(uSource, vUv); }`;

/**
 * The points are summed in a half-float buffer, then rolled off: where
 * hundreds stack (a node, a joint) the light saturates softly instead of
 * clipping. The canvas is blended onto the page with mix-blend-mode: screen,
 * so this writes light only, never a background.
 */
export const TONE_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uExposure;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  gl_FragColor = vec4(1.0 - exp(-c * uExposure), 1.0);
}`;

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
 * Where a particle belongs right now in a structure (records a, b, c, see
 * structures.ts), and how far along its segment it is (f). Shared by the
 * simulation and the point shader so both agree on the flow.
 * kinds: 0 flow, 1 node, 2 dust, 3 defect, 5 flow that moves up when the fix closes the gap.
 * sid: 0 tree, 1 stream, 2 code, 3 sites. st.x is the chapter's own progress.
 */
const HOME = /* glsl */ `
vec3 homeOf(vec4 a, vec4 b, vec4 c, float sid, vec4 st, vec4 rnd, float t, out float f) {
  float kind = c.y;
  vec3 p = a.xyz;
  f = 0.5;
  if (a.w > 0.0) {
    f = fract(b.w + t * a.w);
    // Stream: pages that would leave Google pile up at the pull request.
    if (kind > 2.5 && kind < 3.5 && sid > 0.5 && sid < 1.5) f = min(1.0, f * 1.35);
    p = mix(a.xyz, b.xyz, f);
  }
  if (kind > 1.5 && kind < 2.5) {
    p += 0.14 * vec3(sin(t * 0.31 + rnd.x * 6.28), cos(t * 0.27 + rnd.y * 6.28), sin(t * 0.23 + rnd.z * 6.28));
  } else if (a.w == 0.0) {
    p += 0.008 * vec3(sin(t * 1.3 + rnd.x * 6.28), cos(t * 1.1 + rnd.y * 6.28), sin(t * 0.9 + rnd.z * 6.28));
  }
  if (sid > 1.5 && sid < 2.5) {
    // Code: the line that sets noindex lifts out, the lines below close the gap.
    float lift = smoothstep(0.05, 0.6, st.x);
    if (kind > 2.5 && kind < 3.5) p += vec3((rnd.x - 0.5) * 1.6, 0.45 + rnd.y * 0.9, (rnd.z - 0.5) * 1.2) * lift;
    if (kind > 4.5) p.y += c.w * smoothstep(0.35, 0.8, st.x);
  }
  return p;
}
`;

/**
 * One simulation step per frame. Each particle belongs to structure 0 or 1
 * (the two chapters the scroll is between): it switches to structure 1 once
 * uMix passes its own random threshold, so one picture turns into the next a
 * few particles at a time, both ways, following the scroll.
 */
export const SIM_FRAG = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uRandom;
uniform sampler2D uA0;
uniform sampler2D uB0;
uniform sampler2D uC0;
uniform sampler2D uA1;
uniform sampler2D uB1;
uniform sampler2D uC1;
uniform float uSid0;
uniform float uSid1;
uniform vec4 uSt0;
uniform vec4 uSt1;
uniform float uMix;
uniform float uTime;
uniform float uHZ;
uniform float uMotion;     // 0 when the visitor asked for reduced motion
uniform float uStrength;   // how hard the fluid pushes
uniform sampler2D uVel;
uniform sampler2D uDye;
uniform mat4 uProj;        // projection * view
uniform mat4 uModel;       // structure group, world matrix
uniform mat3 uInvModel;    // world direction -> structure space
uniform vec2 uFlowScale;   // world units per fluid texel, x and y
varying vec2 vUv;
${CURL}
${HOME}
void main() {
  vec4 rnd = texture2D(uRandom, vUv);
  bool one = rnd.w < uMix;
  vec4 a = one ? texture2D(uA1, vUv) : texture2D(uA0, vUv);
  vec4 b = one ? texture2D(uB1, vUv) : texture2D(uB0, vUv);
  vec4 c = one ? texture2D(uC1, vUv) : texture2D(uC0, vUv);
  float f;
  vec3 home = homeOf(a, b, c, one ? uSid1 : uSid0, one ? uSt1 : uSt0, rnd, uTime, f);

  vec3 pos = texture2D(uPos, vUv).xyz;
  // A flow that wraps from the end of its segment back to the start jumps
  // there instead of travelling back across the picture (it is faded out
  // at both ends by the point shader).
  if (a.w > 0.0 && f < 0.012) pos = home;

  vec3 to = home - pos;
  float travel = length(to);
  pos += to / max(travel, 1e-5) * min(travel * 0.1, 0.045) * uHZ;
  // On a long trip each particle drifts on its own noise: the change reads
  // as dust resettling, not as particles queuing on the same path.
  vec3 dust = normalize(curlNoise(pos * 2.3 + rnd.xyz * 6.0, uTime * 0.3) + 1e-5);
  pos += dust * 0.006 * smoothstep(0.05, 0.5, travel) * uHZ * uMotion;

  // The fluid only pushes where the cursor has been (dye mask).
  vec4 clip = uProj * (uModel * vec4(pos, 1.0));
  vec2 suv = clip.xy / clip.w * 0.5 + 0.5;
  if (uMotion > 0.5 && suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
    vec2 vel = texture2D(uVel, suv).xy;
    float dye = texture2D(uDye, suv).r;
    vec3 push = uInvModel * vec3(vel * uFlowScale, 0.0);
    pos += push * (1.0 / 60.0) * uHZ * uStrength * min(dye, 1.0);
  }

  if (length(pos) > 8.0) pos = home;
  gl_FragColor = vec4(pos, travel);
}`;

/** Each point reads its position from the simulation and its colour from what it stands for. */
export const POINTS_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uA0;
uniform sampler2D uB0;
uniform sampler2D uC0;
uniform sampler2D uA1;
uniform sampler2D uB1;
uniform sampler2D uC1;
uniform float uSid0;
uniform float uSid1;
uniform vec4 uSt0;
uniform vec4 uSt1;
uniform float uMix;
uniform float uTime;
uniform float uSize;
uniform float uDPR;
attribute vec2 ref;
attribute vec4 rnd;
varying vec3 vCol;
${HOME}
const vec3 BONE = vec3(0.95, 0.92, 0.86);
const vec3 VERD = vec3(0.33, 0.8, 0.71);
const vec3 MOLT = vec3(1.0, 0.42, 0.17);
void main() {
  vec4 state = texture2D(uPos, ref);
  bool one = rnd.w < uMix;
  vec4 a = one ? texture2D(uA1, ref) : texture2D(uA0, ref);
  vec4 b = one ? texture2D(uB1, ref) : texture2D(uB0, ref);
  vec4 c = one ? texture2D(uC1, ref) : texture2D(uC0, ref);
  float sid = one ? uSid1 : uSid0;
  vec4 st = one ? uSt1 : uSt0;
  float f;
  homeOf(a, b, c, sid, st, rnd, uTime, f);
  float kind = c.y;
  float order = c.x;

  // Two dominant tones in the particles themselves, bone and verdigris.
  vec3 col = mix(BONE, VERD, smoothstep(0.35, 0.8, rnd.x));
  float bright = (kind > 0.5 && kind < 1.5) ? 1.0 : 0.62;
  if (kind > 1.5 && kind < 2.5) bright = 0.3;
  // A few molten packets ride every flow: the crawler at work.
  bool packet = kind < 0.5 && rnd.z > 0.968;
  if (packet) { col = MOLT; bright = 2.2; }

  if (sid < 0.5) {
    // Tree: the crawl front. Pages behind it are read (greener, brighter), ahead still dim.
    if (st.x > -0.5) {
      float band = exp(-pow((order - st.x) / 0.045, 2.0));
      float done = step(order, st.x);
      col = mix(col, VERD, done * 0.6);
      bright *= mix(0.5, 1.15, done);
      col = mix(col, MOLT, band);
      bright += band * 0.9;
    }
  } else if (sid < 1.5) {
    if (kind > 2.5 && kind < 3.5) { col = MOLT; bright = 1.25; }
    if (c.w > 0.5) { col = mix(BONE, MOLT, 0.3 + 0.7 * st.x); bright = 1.25; }
  } else if (sid < 2.5) {
    // Code: tokens in two tones (c.x), like highlighted source.
    if (kind < 1.5 || kind > 4.5) col = order > 0.62 ? VERD : order < 0.2 ? BONE * 0.6 : BONE;
    if (kind > 2.5 && kind < 3.5) { col = MOLT; bright = 1.25 * (1.0 - smoothstep(0.35, 0.7, st.x)); }
    else if (kind < 1.5 || kind > 4.5) col = mix(col, VERD, smoothstep(0.7, 1.0, st.x) * 0.7);
  } else {
    // Sites: as many light up as the plan watches.
    float lit = step(order, st.x);
    col = mix(BONE * 0.7, VERD, lit);
    bright *= mix(0.28, 1.15, lit);
  }

  // Fade at both ends of a segment so the jump back to its start is never seen;
  // stream defects stay lit at the gate where they pile up.
  float ends = 1.0;
  if (a.w > 0.0) {
    ends = smoothstep(0.0, 0.06, f);
    if (!(kind > 2.5 && kind < 3.5 && sid > 0.5 && sid < 1.5)) ends *= 1.0 - smoothstep(0.94, 1.0, f);
  }
  // Travellers between two pictures are dust; they light up once they arrive.
  float settled = mix(1.0, 0.3, smoothstep(0.04, 0.4, state.w));
  vCol = col * bright * ends * settled;

  vec4 mv = modelViewMatrix * vec4(state.xyz, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uDPR * c.z * mix(0.6, 1.0, rnd.z) * (packet ? 1.7 : 1.0) * (6.0 / -mv.z);
}`;

/** Soft shaded sprite. */
export const POINTS_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec3 vCol;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
  float light = 0.4 + 0.6 * clamp(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0, 1.0);
  gl_FragColor = vec4(vCol * light * (1.0 - 0.45 * r2) * 0.27 * uOpacity, 1.0);
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
