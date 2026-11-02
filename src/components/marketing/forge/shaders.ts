/**
 * GLSL for the forge field: a GPU particle cloud that draws the figure of
 * the step being read (structures.ts) and turns from one figure into the
 * next on a clock. Compiled by three's ShaderMaterial (WebGL2), which maps
 * texture2D / gl_FragColor.
 *
 * Light on the blue stage: the points add up their colour weighted by their
 * coverage, the tone pass divides it back out and rolls the coverage off, and
 * writes premultiplied colour the canvas composites over the page. It also
 * masks the picture to the stage regions, so nothing is ever drawn on the
 * page's paper or under its text.
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
 * acc.rgb is the sum of colour x coverage, acc.a the sum of coverage: their
 * ratio is the exact palette colour, and 1 - exp(-a) turns piled-up points
 * into solid light instead of clipping. Outside every region nothing is kept.
 */
export const TONE_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uExposure;
uniform vec2 uView;
uniform vec4 uRect[4];
uniform float uRadius[4];
uniform int uCount;
varying vec2 vUv;
float roundRect(vec2 p, vec4 r, float rad) {
  vec2 centre = (r.xy + r.zw) * 0.5;
  vec2 halfSize = (r.zw - r.xy) * 0.5;
  vec2 q = abs(p - centre) - halfSize + rad;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}
void main() {
  vec4 acc = texture2D(uTex, vUv);
  float a = 1.0 - exp(-acc.a * uExposure);
  vec3 c = acc.rgb / max(acc.a, 1e-4);
  vec2 px = vec2(vUv.x * uView.x, (1.0 - vUv.y) * uView.y);
  float m = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= uCount) break;
    m = max(m, clamp(0.5 - roundRect(px, uRect[i], uRadius[i]), 0.0, 1.0));
  }
  a *= m;
  gl_FragColor = vec4(c * a, a);
}`;

// Curl of a sine-sum potential: divergence-free drift for particles in transit.
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
 * Where a particle belongs right now in a figure (records a, b, c, see
 * structures.ts), and how far along its segment it is (f). Shared by the
 * simulation and the point shader so both agree.
 * Kinds as KIND in structures.ts. sid: 0 globe, 1 tree, 2 gate, 3 code,
 * 4 sites. st.x is the step's own story, played by a clock (0 -> 1).
 */
const HOME = /* glsl */ `
bool is(float kind, float k) { return abs(kind - k) < 0.5; }
// The height of the globe's scan ring on the unit sphere: a slow sweep pole to pole.
float scanHeight(float t) { return sin(t * 0.3) * 0.9; }
vec3 homeOf(vec4 a, vec4 b, vec4 c, float sid, vec4 st, vec4 rnd, float t, out float f) {
  float kind = c.y;
  vec3 p = a.xyz;
  f = 0.5;
  if (a.w > 0.0) {
    f = fract(b.w + t * a.w);
    p = mix(a.xyz, b.xyz, f);
  }
  if (sid < 0.5) {
    if (is(kind, 7.0)) {
      float h = scanHeight(t);
      float rr = sqrt(max(0.0, 1.0 - h * h));
      p = vec3(a.x * rr, h, a.z * rr) * c.w;
    }
    // About ninety seconds a turn.
    float ang = t * 0.07;
    float cs = cos(ang), sn = sin(ang);
    p = vec3(cs * p.x + sn * p.z, p.y, -sn * p.x + cs * p.z);
  } else if (sid > 1.5 && sid < 2.5) {
    // The held page comes down onto the check.
    if (is(kind, 8.0)) p.y += 1.7 * (1.0 - smoothstep(0.0, 0.55, st.x));
  } else if (sid > 2.5 && sid < 3.5) {
    // The noindex line slides out to the right, then the lines below close the gap.
    if (is(kind, 3.0)) p.x += 1.1 * smoothstep(0.08, 0.5, st.x);
    if (is(kind, 5.0)) p.y += c.w * smoothstep(0.45, 0.85, st.x);
  }
  if (is(kind, 2.0)) p += 0.05 * vec3(sin(t * 0.21 + rnd.x * 6.28), cos(t * 0.17 + rnd.y * 6.28), sin(t * 0.13 + rnd.z * 6.28));
  return p;
}
`;

/**
 * A transition in three beats on one clock (uMix, 0 -> 1): the figure on
 * screen fades where it stands, the particles cross to the next figure while
 * unseen, and the next figure draws itself from the top down. Two figures
 * are never on screen together (Hugo, 2026-11-01: "tout se mélange").
 */
const PHASES = /* glsl */ `
float crossing(float m) { return smoothstep(0.24, 0.58, m); }
float leaving(float m) { return 1.0 - smoothstep(0.0, 0.3, m); }
float arriving(float m, float order) {
  float t0 = 0.56 + order * 0.3;
  return smoothstep(t0, t0 + 0.14, m);
}
// Where a particle comes in the drawing of the next figure: top rows first.
float orderIn(vec3 h1, vec4 span, float r) {
  float xn = clamp((h1.x - span.x) / max(span.y, 1e-3), 0.0, 1.0);
  float yn = clamp((h1.y - span.z) / max(span.w, 1e-3), 0.0, 1.0);
  return (1.0 - yn) * 0.7 + xn * 0.18 + r * 0.12;
}
`;

/**
 * One simulation step per frame. Each particle has its two homes, one in the
 * figure on screen and one in the figure coming, and crosses from the first
 * to the second in the middle beat of the transition. It follows its home
 * with a fixed time constant, whatever the frame rate.
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
uniform float uDt;
uniform float uSnap;      // 1: land on the homes at once (reduced motion)
uniform vec4 uSpan;       // the coming figure: left edge, width, bottom edge, height
varying vec2 vUv;
${CURL}
${HOME}
${PHASES}
void main() {
  vec4 rnd = texture2D(uRandom, vUv);
  vec4 a0 = texture2D(uA0, vUv);
  vec4 a1 = texture2D(uA1, vUv);
  float f0, f1;
  vec3 h0 = homeOf(a0, texture2D(uB0, vUv), texture2D(uC0, vUv), uSid0, uSt0, rnd, uTime, f0);
  vec3 h1 = homeOf(a1, texture2D(uB1, vUv), texture2D(uC1, vUv), uSid1, uSt1, rnd, uTime, f1);
  float k = crossing(uMix);
  vec3 home = mix(h0, h1, k);
  vec3 drift = normalize(curlNoise(home * 1.3 + rnd.xyz * 4.0, uTime * 0.2) + 1e-5);
  home += sin(k * 3.14159265) * drift * 0.025;

  vec3 pos = texture2D(uPos, vUv).xyz;
  // A flow wrapping back to the start of its segment jumps there: it is faded out at both ends.
  bool flowing = (k < 0.5 ? a0.w : a1.w) > 0.0;
  if (flowing && (k < 0.5 ? f0 : f1) < 0.01) pos = home;
  // Unhurried between two figures; close behind its home the rest of the
  // time, so a page that slides or falls in a story stays sharp.
  float tau = (k > 0.001 && k < 0.999) ? 0.2 : 0.07;
  pos += (home - pos) * (1.0 - exp(-uDt / tau));
  if (uSnap > 0.5 || length(pos) > 14.0) pos = home;
  gl_FragColor = vec4(pos, k);
}`;

/**
 * Each point reads its place from the simulation and its colour from what
 * it stands for in each of the two figures, mixed by its own progress.
 * Two tones on the blue, near-white and pale blue; the accent only where the
 * sentence puts the attention (the crawl front, the held page, the noindex
 * line, the check sweeping the watched sites, the globe's scan).
 */
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
uniform float uTime;
uniform float uSize;
uniform float uDPR;
uniform float uOpacity;
uniform float uMix;
uniform vec4 uSpan;
attribute vec2 ref;
attribute vec4 rnd;
varying vec4 vCol;
${HOME}
${PHASES}
float bell(float x) { return exp(-x * x); }
const vec3 INK = vec3(0.949, 0.961, 1.0);
const vec3 SOFT = vec3(0.659, 0.729, 1.0);
const vec3 ACCENT = vec3(0.843, 0.949, 0.235);

vec4 look(vec4 a, vec4 b, vec4 c, float sid, vec4 st, out vec3 p) {
  float f;
  p = homeOf(a, b, c, sid, st, rnd, uTime, f);
  float kind = c.y;
  float order = c.x;
  vec3 col = INK;
  float w = 1.0;
  if (is(kind, 1.0)) { col = SOFT; w = 0.62; }
  else if (is(kind, 6.0)) { w = 1.15; }
  else if (is(kind, 2.0)) { col = SOFT; w = 0.2; }
  if (sid < 0.5) {
    // Globe: the far side fades; the ring is the accent and lights the cards it passes.
    float face = smoothstep(-1.7, 1.5, p.z);
    w *= mix(0.22, 1.0, face);
    if (is(kind, 7.0)) {
      col = ACCENT;
      w = 1.4 * mix(0.25, 1.0, face);
    } else if (!is(kind, 2.0)) {
      float band = bell((c.w - scanHeight(uTime)) / 0.08);
      col = mix(col, ACCENT, band * 0.7);
      w *= 1.0 + band * 0.8;
    }
  } else if (sid < 1.5) {
    // Tree: pages ahead of the crawl are faint, read pages bright, the front in the accent.
    if (!is(kind, 2.0)) {
      float read = step(order, st.x);
      float front = bell((order - st.x) / 0.035) * step(0.0, st.x) * (1.0 - step(1.02, st.x));
      col = mix(SOFT, col, read);
      w *= mix(0.3, 1.0, read);
      col = mix(col, ACCENT, front);
      w *= 1.0 + front * 1.2;
    }
  } else if (sid < 2.5) {
    if (is(kind, 4.0)) {
      // Falling pages fade in at the top and out at the bottom.
      w *= smoothstep(0.0, 0.12, f) * (1.0 - smoothstep(0.86, 1.0, f));
      if (order > 0.25) { col = SOFT; w *= 0.7; }
    } else if (is(kind, 8.0)) {
      col = ACCENT;
      w *= order > 0.25 ? 1.3 : 1.9;
    } else if (is(kind, 9.0)) {
      // The check turns to the accent under the page it stops, once the page has landed.
      float hit = smoothstep(0.5, 0.65, st.x) * (1.0 - smoothstep(0.46, 0.8, abs(c.w)));
      col = mix(INK, ACCENT, hit);
      w *= 1.0 + hit * 0.7;
    }
  } else if (sid < 3.5) {
    // Code: two tones by token; the noindex line is the accent and fades as it leaves.
    if (is(kind, 0.0) || is(kind, 5.0)) {
      if (order > 1.5 && order < 2.5) { col = SOFT; w *= 0.6; }
      else if (order < 0.5) col = SOFT;
    }
    if (is(kind, 3.0)) {
      col = ACCENT;
      w *= 1.5 * (1.0 - smoothstep(0.15, 0.45, st.x));
    }
  } else {
    // Sites: the plan's sites lit, the others faint; a check sweeps across the lit ones.
    if (!is(kind, 2.0)) {
      float lit = step(order, st.x);
      col = mix(SOFT, col, lit);
      w *= mix(0.24, 1.0, lit);
      float sweep = -2.4 + mod(uTime * 0.55, 5.6);
      float band = bell((p.x - sweep) / 0.22) * lit;
      col = mix(col, ACCENT, band * 0.8);
      w *= 1.0 + band;
    }
  }
  return vec4(col, w);
}

void main() {
  vec4 state = texture2D(uPos, ref);
  vec4 c0 = texture2D(uC0, ref);
  vec4 c1 = texture2D(uC1, ref);
  vec3 p0, p1;
  vec4 l0 = look(texture2D(uA0, ref), texture2D(uB0, ref), c0, uSid0, uSt0, p0);
  vec4 l1 = look(texture2D(uA1, ref), texture2D(uB1, ref), c1, uSid1, uSt1, p1);
  float k = state.w;
  // It wears the colours of the figure it belongs to: in between it is unseen.
  vec4 l = k < 0.5 ? l0 : l1;
  float shown = max(leaving(uMix), arriving(uMix, orderIn(p1, uSpan, rnd.w)));
  // A straggler still on its way stays dim until it lands.
  float away = length(state.xyz - mix(p0, p1, k));
  l.a *= shown * mix(1.0, 0.12, smoothstep(0.02, 0.25, away));
  vCol = vec4(l.rgb, l.a * uOpacity);

  vec4 mv = modelViewMatrix * vec4(state.xyz, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uDPR * mix(c0.z, c1.z, k) * mix(0.75, 1.0, rnd.z) * (6.0 / -mv.z);
}`;

/** A small round sprite, denser at its centre. */
export const POINTS_FRAG = /* glsl */ `
uniform float uDensity;
varying vec4 vCol;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  float d = pow(1.0 - r2, 1.6) * vCol.a * uDensity;
  gl_FragColor = vec4(vCol.rgb * d, d);
}`;
