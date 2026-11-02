import { GALAXY_SPIN } from "./structures";

/**
 * GLSL for the forge field: a GPU particle cloud that draws the figure of
 * the step being read (structures.ts), with the words some of its cards
 * carry, and turns from one figure into the next on a clock.
 * Compiled by three's ShaderMaterial (WebGL2), which maps texture2D /
 * gl_FragColor.
 *
 * The figures are drawn in galaxy dust (Hugo, 2026-11-02, after the blue
 * tree of his reference video): each point keeps a place of its own around
 * the line it draws and turns slowly about it, most of them faint, a few
 * bright, one in thirty a star that glints.
 *
 * Two ways from one figure to the next. Within one stage (the four steps)
 * the points reorganise: each travels from its place in the old figure to
 * its place in the new one, top rows first (Hugo, 2026-11-02: "les points
 * qui se réorganisent"). From one stage to another (the hero to the steps)
 * the old figure fades, the points cross unseen and the new one draws in.
 *
 * Light on the blue stage: the points add up their colour weighted by their
 * coverage, the tone pass spreads a little of it around as a glow, divides
 * the colour back out, whitens it where the dust is thick and rolls the
 * coverage off, and writes premultiplied colour the canvas composites over
 * the page. It also masks the picture to the stage regions, and dims it
 * behind the hero's words, so nothing is ever drawn on the page's paper and
 * the text always stands on a quiet patch of sky.
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
 * into solid light instead of clipping. Eight taps around the pixel, read
 * with linear filtering, add a soft glow (four on phones). Outside every region nothing is
 * read or kept; inside a hole (the words over the hero) a tenth is kept.
 */
export const TONE_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uExposure;
uniform float uGlow;
uniform float uFar;       // 1: the wide ring of the glow too (large screens)
uniform vec2 uTexel;
uniform vec2 uView;
uniform vec4 uRect[4];
uniform float uRadius[4];
uniform int uCount;
uniform vec4 uHole[4];
uniform int uHoles;
varying vec2 vUv;
float roundRect(vec2 p, vec4 r, float rad) {
  vec2 centre = (r.xy + r.zw) * 0.5;
  vec2 halfSize = (r.zw - r.xy) * 0.5;
  vec2 q = abs(p - centre) - halfSize + rad;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}
void main() {
  vec2 px = vec2(vUv.x * uView.x, (1.0 - vUv.y) * uView.y);
  float m = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= uCount) break;
    m = max(m, clamp(0.5 - roundRect(px, uRect[i], uRadius[i]), 0.0, 1.0));
  }
  for (int i = 0; i < 4; i++) {
    if (i >= uHoles) break;
    m *= mix(0.1, 1.0, smoothstep(0.0, 72.0, roundRect(px, uHole[i], 24.0)));
  }
  if (m <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec4 acc = texture2D(uTex, vUv);
  vec2 n = uTexel * 2.5;
  vec2 f = uTexel * 7.0;
  vec4 glow = texture2D(uTex, vUv + vec2(n.x, n.y)) + texture2D(uTex, vUv + vec2(-n.x, n.y))
    + texture2D(uTex, vUv + vec2(n.x, -n.y)) + texture2D(uTex, vUv - n);
  if (uFar > 0.5) {
    glow += 0.6 * (texture2D(uTex, vUv + vec2(f.x, 0.0)) + texture2D(uTex, vUv - vec2(f.x, 0.0))
      + texture2D(uTex, vUv + vec2(0.0, f.y)) + texture2D(uTex, vUv - vec2(0.0, f.y)));
    glow *= 4.0 / 6.4;
  }
  acc += glow * (uGlow / 4.0);
  float a = 1.0 - exp(-acc.a * uExposure);
  vec3 c = acc.rgb / max(acc.a, 1e-4);
  // Where the dust is thick the light runs towards white, as in a nebula's core.
  c = mix(c, vec3(0.95, 0.97, 1.0), 0.45 * smoothstep(1.5, 6.0, acc.a));
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
 * simulation, the points and the labels so all three agree.
 * Kinds as KIND in structures.ts. sid: 0 galaxy, 1 tree, 2 gate, 3 code,
 * 4 sites. st.x is the step's own story, played by a clock (0 -> 1).
 * uLens: where the cursor meets the galaxy's disc (xyz, the group's space)
 * and how present it is (w).
 */
const HOME = /* glsl */ `
uniform vec4 uLens;
bool is(float kind, float k) { return abs(kind - k) < 0.5; }
float bell(float x) { return exp(-x * x); }
// More numbers per point than rnd holds: a hash of its four.
float hash(float n) { return fract(sin(n) * 43758.5453); }
float seedOf(vec4 rnd) { return rnd.x * 12.9898 + rnd.y * 78.233 + rnd.z * 37.719 + rnd.w * 4.581; }
// Galaxy dust: how far a point keeps from the line it draws. Half of them
// within a hair of it, one in ten out in the haze.
float spreadOf(float s) {
  float u = hash(s);
  return 0.004 + 0.06 * u * u * u * u;
}
// Its place around the line: it turns slowly about it, in depth too.
vec3 haze(float s, float t) {
  float w = 0.25 + 0.35 * hash(s + 4.0);
  vec3 ph = 6.2832 * vec3(hash(s + 1.0), hash(s + 2.0), hash(s + 3.0));
  return spreadOf(s) * vec3(sin(t * w + ph.x), sin(t * w * 0.83 + ph.y), sin(t * w * 0.71 + ph.z));
}
vec3 homeOf(vec4 a, vec4 b, vec4 c, float sid, vec4 st, vec4 rnd, float t, out float f) {
  float kind = c.y;
  vec3 p = a.xyz;
  f = 0.5;
  if (a.w > 0.0) {
    f = fract(b.w + t * a.w);
    p = mix(a.xyz, b.xyz, f);
  }
  if (sid < 0.5) {
    // The galaxy turns slowly about its axis (GALAXY_SPIN in structures.ts).
    float ang = t * ${GALAXY_SPIN.toFixed(4)};
    float cs = cos(ang), sn = sin(ang);
    p = vec3(cs * p.x + sn * p.z, p.y, -sn * p.x + cs * p.z);
    // A dome rises under the cursor: the pages there lift towards the viewer.
    p.y += 0.2 * uLens.w * bell(length(p.xz - uLens.xz) / 0.5);
  } else if (sid > 1.5 && sid < 2.5) {
    // The held page comes down onto the check.
    if (is(kind, 8.0)) p.y += 1.7 * (1.0 - smoothstep(0.0, 0.55, st.x));
  } else if (sid > 2.5 && sid < 3.5) {
    // The noindex line slides out to the right, then the lines below close the gap.
    if (is(kind, 3.0)) p.x += 1.1 * smoothstep(0.08, 0.5, st.x);
    if (is(kind, 5.0)) p.y += c.w * smoothstep(0.45, 0.85, st.x);
  }
  if (is(kind, 2.0)) p += 0.05 * vec3(sin(t * 0.21 + rnd.x * 6.28), cos(t * 0.17 + rnd.y * 6.28), sin(t * 0.13 + rnd.z * 6.28));
  else p += haze(seedOf(rnd), t);
  return p;
}
`;

/**
 * The clock of a transition (uMix, 0 -> 1). uMorph 1: within one stage,
 * every point travels to its new place, top rows of the new figure first,
 * each on its own stretch of the clock. uMorph 0: between two stages, three
 * beats: the figure fades where it stands, the points cross unseen, the next
 * figure draws itself from the top down. Two figures are never on screen
 * together that way (Hugo, 2026-11-01: "tout se mélange").
 */
const PHASES = /* glsl */ `
uniform float uMorph;
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
// How far a point is on its way to the next figure.
float progress(float m, vec3 h1, vec4 span, float r) {
  if (uMorph < 0.5) return crossing(m);
  float d = orderIn(h1, span, r) * 0.42;
  return smoothstep(d, d + 0.58, m);
}
`;

/**
 * One simulation step per frame. Each particle has its two homes, one in the
 * figure on screen and one in the figure coming, and goes from the first to
 * the second as its progress runs, on a slight arc towards the viewer when
 * it is seen travelling. It follows its home with a fixed time constant,
 * whatever the frame rate.
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
  float k = progress(uMix, h1, uSpan, rnd.w);
  vec3 home = mix(h0, h1, k);
  float flight = sin(k * 3.14159265);
  home.z += 0.35 * flight * uMorph;
  vec3 drift = normalize(curlNoise(home * 1.3 + rnd.xyz * 4.0, uTime * 0.2) + 1e-5);
  home += flight * drift * mix(0.025, 0.04, uMorph);

  vec3 pos = texture2D(uPos, vUv).xyz;
  // A flow wrapping back to the start of its segment jumps there: it is faded out at both ends.
  bool flowing = (k < 0.5 ? a0.w : a1.w) > 0.0;
  if (flowing && (k < 0.5 ? f0 : f1) < 0.01) pos = home;
  // Unhurried while crossing unseen; close behind its home the rest of the
  // time, so a page that slides or falls in a story, or a point seen
  // travelling, stays sharp.
  float tau = (k > 0.001 && k < 0.999 && uMorph < 0.5) ? 0.2 : 0.06;
  pos += (home - pos) * (1.0 - exp(-uDt / tau));
  if (uSnap > 0.5 || length(pos) > 14.0) pos = home;
  gl_FragColor = vec4(pos, k);
}`;

/**
 * Each point reads its place from the simulation and its colour from what
 * it stands for in the figure it belongs to. Two tones on the blue, a white
 * running to cyan and an electric blue, each point a little different; the
 * accent only where the sentence puts the attention (the page being read,
 * the crawl front, the held page, the noindex line, the check sweeping the
 * watched sites). Its brightness is its own, as in a star field.
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
uniform float uFront;     // the crawl order of the galaxy page being read
attribute vec2 ref;
attribute vec4 rnd;
varying vec4 vCol;
${HOME}
${PHASES}
// The two tones, set per point in main(): a white running to cyan, an electric blue.
vec3 INK;
vec3 SOFT;
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
  else if (is(kind, 2.0)) { col = SOFT; w = 0.28; }
  if (sid < 0.5) {
    // Galaxy: the far side of the disc is fainter.
    float near = smoothstep(-3.0, 1.6, p.z);
    float lens = uLens.w * bell(length(p.xz - uLens.xz) / 0.55);
    if (is(kind, 10.0)) {
      // Arm dust: whiter and brighter towards the core.
      float core = 1.0 - smoothstep(0.2, 2.6, order);
      col = mix(SOFT, INK, core);
      w = 0.85 * (0.5 + 1.3 * core);
    } else if (!is(kind, 2.0)) {
      // Pages: the one being read in the accent, those read just before
      // still bright, the others waiting their turn.
      float ago = uFront - order;
      float cur = 1.0 - step(0.003, abs(ago));
      float trail = smoothstep(-0.002, 0.004, ago) * (1.0 - smoothstep(0.08, 0.3, ago));
      col = mix(SOFT, col, 0.45 + 0.55 * trail);
      w *= 0.62 + 0.6 * trail;
      col = mix(col, ACCENT, cur);
      w *= 1.0 + cur * 1.4;
    }
    w *= mix(0.4, 1.0, near) * (1.0 + 1.6 * lens);
    col = mix(col, INK, lens * 0.5);
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
    // Code: the words are written over the tokens (labels); the tokens are
    // their glow. The noindex line is the accent and fades as it leaves.
    if (is(kind, 0.0) || is(kind, 5.0)) {
      if (order > 1.5 && order < 2.5) { col = SOFT; w *= 0.6; }
      else if (order < 0.5) col = SOFT;
    }
    if (is(kind, 3.0)) {
      col = ACCENT;
      w *= 1.5 * (1.0 - smoothstep(0.15, 0.45, st.x));
    }
    if (abs(c.z - 1.0) < 0.01) w *= 0.34;
  } else {
    // Sites: the plan's sites lit, the others faint; a check sweeps across the lit ones.
    if (!is(kind, 2.0)) {
      float lit = step(order, st.x);
      col = mix(SOFT, col, lit);
      w *= mix(0.34, 1.0, lit);
      float sweep = -2.4 + mod(uTime * 0.55, 5.6);
      float band = bell((p.x - sweep) / 0.22) * lit;
      col = mix(col, ACCENT, band * 0.8);
      w *= 1.0 + band;
    }
  }
  return vec4(col, w);
}

void main() {
  float s = seedOf(rnd);
  float hue = hash(s + 5.0);
  INK = hue < 0.45 ? mix(vec3(0.94, 0.97, 1.0), vec3(0.7, 0.9, 1.0), hue * 2.2) : mix(vec3(0.5, 0.82, 1.0), vec3(0.42, 0.6, 1.0), (hue - 0.45) * 1.8);
  SOFT = mix(vec3(0.3, 0.45, 1.0), vec3(0.4, 0.72, 1.0), hue * 0.7);
  vec4 state = texture2D(uPos, ref);
  vec4 c0 = texture2D(uC0, ref);
  vec4 c1 = texture2D(uC1, ref);
  vec3 p0, p1;
  vec4 l0 = look(texture2D(uA0, ref), texture2D(uB0, ref), c0, uSid0, uSt0, p0);
  vec4 l1 = look(texture2D(uA1, ref), texture2D(uB1, ref), c1, uSid1, uSt1, p1);
  float k = state.w;
  vec4 l;
  if (uMorph > 0.5) {
    // Seen travelling: it changes colour on the way, a little brighter in flight.
    l = mix(l0, l1, smoothstep(0.3, 0.7, k));
    l.a *= 1.0 + 0.25 * sin(k * 3.14159265);
  } else {
    // It wears the colours of the figure it belongs to: in between it is unseen.
    l = k < 0.5 ? l0 : l1;
    float shown = max(leaving(uMix), arriving(uMix, orderIn(p1, uSpan, rnd.w)));
    // A straggler still on its way stays dim until it lands.
    float away = length(state.xyz - mix(p0, p1, k));
    l.a *= shown * mix(1.0, 0.12, smoothstep(0.02, 0.25, away));
  }
  // The dust filling a page card (a kind with a quarter added) is a faint haze.
  float face = step(0.1, fract(k < 0.5 ? c0.y : c1.y));
  l.a *= mix(1.0, 0.45, face);
  // The haze is fainter than the line it hangs around; most points are dim,
  // a few bright, and the stars glint.
  l.a *= mix(1.0, 0.4, smoothstep(0.008, 0.035, spreadOf(s)));
  float g = hash(s + 6.0);
  l.a *= 0.5 + 0.95 * g * g;
  float star = step(0.967, hash(s + 7.0));
  l.a *= 1.0 + star * (1.3 + 0.9 * sin(uTime * (1.1 + 2.2 * g) + g * 40.0));
  vCol = vec4(l.rgb, l.a * uOpacity);

  vec4 mv = modelViewMatrix * vec4(state.xyz, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uDPR * mix(c0.z, c1.z, k) * mix(0.7, 1.05, rnd.z) * (1.0 + star * 1.5) * (6.0 / -mv.z);
}`;

/** A small round sprite: a bright core in a soft falloff, like a star. */
export const POINTS_FRAG = /* glsl */ `
uniform float uDensity;
varying vec4 vCol;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  float d = (0.55 * exp(-r2 * 7.0) + 0.45 * (1.0 - r2) * (1.0 - r2)) * vCol.a * uDensity;
  gl_FragColor = vec4(vCol.rgb * d, d);
}`;

/**
 * The words some cards carry (structures.ts, labels): one quad per line of
 * text, its glyphs read from an atlas the engine draws once. A label stands
 * where its card is (homeOf, so it falls, slides and turns with it), faces
 * the viewer, and lights when its card does. The galaxy's are lit by the
 * engine (uGal: the home page, the page being read, those near the cursor).
 * Too small to read on this screen, a label is left out.
 */
export const LABEL_VERT = /* glsl */ `
uniform float uSid0;
uniform float uSid1;
uniform vec4 uSt0;
uniform vec4 uSt1;
uniform float uTime;
uniform float uMix;
uniform vec4 uSpan;
uniform vec4 uGal[24];
uniform float uPxScale;   // CSS pixels per view unit at distance 1
attribute vec2 corner;    // 0..1 across the quad
attribute vec4 uvRect;
attribute vec4 la;
attribute vec4 lb;
attribute vec4 lc;
attribute vec4 info;      // figure, font size, width / height, align
attribute vec4 info2;     // tone, galaxy id
varying vec2 vUv;
varying vec4 vCol;
${HOME}
${PHASES}
const vec3 ACCENT = vec3(0.843, 0.949, 0.235);
vec3 toneOf(float t) {
  if (t < 0.5) return vec3(0.95, 0.97, 1.0);
  if (t < 1.5) return vec3(0.68, 0.78, 1.0);
  if (t < 2.5) return ACCENT;
  return vec3(0.6, 0.9, 1.0);
}
float galAlpha(float id) {
  int i = int(id + 0.5);
  vec4 v = uGal[i / 4];
  int j = i - (i / 4) * 4;
  return j == 0 ? v.x : j == 1 ? v.y : j == 2 ? v.z : v.w;
}
void main() {
  float fig = info.x;
  bool in0 = abs(fig - uSid0) < 0.5;
  bool in1 = abs(fig - uSid1) < 0.5;
  vec4 st = in0 ? uSt0 : uSt1;
  float f;
  vec3 p = homeOf(la, lb, lc, fig, st, vec4(0.0), uTime, f);
  float kind = lc.y;
  float order = lc.x;
  float vis = 1.0;
  if (fig < 0.5) vis = galAlpha(info2.y);
  else if (fig < 1.5) vis = step(order, st.x);
  else if (fig < 2.5) { if (is(kind, 4.0)) vis = smoothstep(0.0, 0.12, f) * (1.0 - smoothstep(0.86, 1.0, f)); }
  else if (fig < 3.5) { if (is(kind, 3.0)) vis = 1.0 - smoothstep(0.15, 0.45, st.x); }
  else vis = step(order, st.x);
  // In a transition the leaving figure's words go first, the coming one's
  // once their card has formed.
  float d = orderIn(p, uSpan, 0.5);
  float come = uMorph > 0.5 ? smoothstep(0.42 * d + 0.5, 0.42 * d + 0.62, uMix) : arriving(uMix, d);
  float phase = (in0 && in1) ? 1.0 : in0 ? 1.0 - smoothstep(0.0, 0.14, uMix) : in1 ? come : 0.0;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float unit = length(modelViewMatrix[0].xyz);
  float px = info.y * unit * uPxScale / max(-mv.z, 0.1);
  float alpha = vis * phase * smoothstep(5.5, 7.5, px);
  if (alpha < 0.01) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vCol = vec4(0.0);
    vUv = vec2(0.0);
    return;
  }
  float h = info.y * 1.3 * unit;
  mv.xy += vec2((corner.x - info.w) * h * info.z, (corner.y - 0.5) * h);
  gl_Position = projectionMatrix * mv;
  vUv = mix(uvRect.xy, uvRect.zw, corner);
  vCol = vec4(toneOf(info2.x), alpha);
}`;

export const LABEL_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uGain;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  float a = texture2D(uAtlas, vUv).r * vCol.a * uGain;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol.rgb * a, a);
}`;
