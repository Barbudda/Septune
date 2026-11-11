"use client";

import { useEffect, useRef, useState } from "react";
import { PRICING_TIERS } from "@/lib/pricing";
import { VIEWS, VIEW_LABELS, type View } from "./views";

/*
 * The product, shown as it looks in use (Hugo, 2026-11-11: the dot cloud
 * beside the steps "ne sert à rien", show the tool with data instead).
 * One window per feature, drawn in HTML so it stays sharp, light and
 * readable by crawlers. Crawl data is septune.dev's own run of 2026-11-02
 * (see own-report.tsx); the pull request, the editor, the monitors and the
 * AI-search rows are an illustrative scenario on "your-site.com", built from
 * the engine's real checks and wording (geo.ts, catalog.ts, the PR comment).
 *
 * Each window plays once, the first time it is shown, then stays in its end
 * state: replaying on the way back up is friction (Hugo, 2026-10-31). The
 * server HTML and reduced motion get the end state directly.
 */

type Play = "end" | "wait" | "on";

/**
 * Phases on a clock once playing: how many of `steps` (ms) have passed. A
 * window plays at most once in its life, so the count never needs a reset.
 */
function usePhases(play: Play, steps: number[]) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (play !== "on") return;
    const timers = steps.map((ms, i) => window.setTimeout(() => setN(i + 1), ms));
    return () => timers.forEach(clearTimeout);
    // The steps are constants of each view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);
  return play === "end" ? steps.length : play === "wait" ? 0 : n;
}

/** A number that counts up once playing. */
function useCount(play: Play, to: number, ms: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (play !== "on") return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, to, ms]);
  return play === "end" ? to : play === "wait" ? 0 : v;
}

function Window({ title, meta, children, play }: { title: string; meta?: string; children: React.ReactNode; play: Play }) {
  return (
    <div className="pv-window" data-play={play}>
      <div className="pv-bar">
        <span aria-hidden className="pv-lights">
          <i />
          <i />
          <i />
        </span>
        <span className="truncate">{title}</span>
        {meta && <span className="ml-auto shrink-0 text-fg-subtle">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

const Dot = ({ tone }: { tone: "ok" | "bad" | "warn" | "idle" }) => <span aria-hidden className={`pv-dot pv-dot--${tone}`} />;

/* ── 01 Crawl: septune.dev as Septune read it ── */
const CRAWL_ROWS: [path: string, depth: number, index: string, tone: "ok" | "idle"][] = [
  ["/", 0, "indexable", "ok"],
  ["/pricing", 1, "indexable", "ok"],
  ["/docs", 1, "indexable", "ok"],
  ["/frameworks/nextjs", 1, "indexable", "ok"],
  ["/tools/llms-txt-generator", 1, "indexable", "ok"],
  ["/login", 1, "noindex, on purpose", "idle"],
  ["/docs/issues/meta-title-missing", 2, "indexable", "ok"],
];
const FAMILIES = ["Indexing", "Metadata", "Performance", "Linking", "Structure", "Images", "Schema", "Framework"];

function CrawlView({ play }: { play: Play }) {
  const pages = useCount(play, 94, 1800);
  return (
    <Window play={play} title="septune audit https://www.septune.dev" meta="2 Nov 2026">
      <div className="flex items-center gap-4 border-b border-border px-4 py-3.5">
        <span className="report-score report-score-sm" style={{ "--score": 100 } as React.CSSProperties}>
          <span className="text-[15px] font-semibold text-fg">100</span>
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-fg">septune.dev</p>
          <p className="font-mono text-[12px] text-fg-muted">
            <span className="tabular-nums">{pages}</span> of 94 pages read · 69 checks each
          </p>
        </div>
      </div>
      <table className="pv-table">
        <thead>
          <tr>
            <th>page</th>
            <th className="w-12">depth</th>
            <th>index</th>
          </tr>
        </thead>
        <tbody>
          {CRAWL_ROWS.map(([path, depth, index, tone], i) => (
            <tr key={path} className="pv-in" style={{ "--i": i } as React.CSSProperties}>
              <td className="truncate text-fg">{path}</td>
              <td className="tabular-nums">{depth}</td>
              <td>
                <Dot tone={tone} /> {index}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-2 border-t border-border px-4 py-3.5 sm:grid-cols-4" aria-label="Score by family">
        {FAMILIES.map((f, i) => (
          <li key={f} className="font-mono text-[11.5px] text-fg-muted">
            <span className="flex justify-between">
              {f} <span className="text-fg">100</span>
            </span>
            <span className="pv-meter">
              <i style={{ "--i": i } as React.CSSProperties} />
            </span>
          </li>
        ))}
      </ul>
    </Window>
  );
}

/* ── 02 PR check: the preview against production ── */
function PrView({ play }: { play: Play }) {
  const phase = usePhases(play, [1500, 1900]);
  const failed = phase >= 1;
  return (
    <Window play={play} title="github.com / your-org / your-site / pull / 128">
      <div className="border-b border-border px-4 py-3.5">
        <p className="text-[15px] font-semibold text-fg">
          Redesign the pricing page <span className="font-normal text-fg-subtle">#128</span>
        </p>
        <p className="mt-1 font-mono text-[11.5px] text-fg-muted">feat/pricing-v2 into main</p>
      </div>
      <ul className="border-b border-border font-mono text-[12px]">
        <li className="flex items-center gap-2.5 border-b border-border-soft px-4 py-2.5">
          <Dot tone="ok" />
          <span className="text-fg">Preview deployment</span>
          <span className="ml-auto text-fg-subtle">ready</span>
        </li>
        <li className="flex items-center gap-2.5 px-4 py-2.5">
          {failed ? <Dot tone="bad" /> : <span aria-hidden className="pv-spin" />}
          <span className="font-semibold text-fg">Septune SEO check</span>
          <span className={`ml-auto ${failed ? "font-semibold text-danger" : "text-fg-subtle"}`}>
            {failed ? "failing" : "comparing with production"}
          </span>
        </li>
      </ul>
      <div className={`pv-reveal ${phase >= 2 ? "is-on" : ""} px-4 py-3.5`}>
        <p className="font-mono text-[11.5px] text-fg-subtle">github-actions commented</p>
        <p className="mt-1.5 text-[13.5px] text-fg">Septune: preview vs production, 2 changes</p>
        <table className="pv-table pv-table--flush mt-2">
          <tbody>
            <tr>
              <td className="text-fg">/pricing</td>
              <td>indexable → noindex</td>
              <td className="text-right font-semibold text-danger">critical</td>
            </tr>
            <tr>
              <td className="text-fg">/docs</td>
              <td>canonical moved</td>
              <td className="text-right text-amber">warning</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 font-mono text-[12px] text-fg-muted">score 91 → 84</p>
      </div>
      <div className="flex items-center gap-3 border-t border-border bg-bg-soft px-4 py-3">
        <span className="pv-merge" data-blocked={failed || undefined}>
          Merge pull request
        </span>
        <span className="font-mono text-[11.5px] text-fg-muted">{failed ? "a required check failed" : "checks running"}</span>
      </div>
    </Window>
  );
}

/* ── 03 Fix: the finding reaches the AI editor ── */
function FixView({ play }: { play: Play }) {
  const phase = usePhases(play, [1300, 2400]);
  return (
    <Window play={play} title="your-site · Claude Code" meta="septune MCP">
      <div className="border-b border-border px-4 py-3.5 font-mono text-[12px] leading-relaxed">
        <p className="text-fg-subtle">septune found 1 critical issue</p>
        <p className="mt-1 text-[13px] text-fg">/pricing is set to noindex</p>
        <p className="mt-1 text-fg-muted">
          evidence <span className="text-fg">&lt;meta name=&quot;robots&quot; content=&quot;noindex&quot;&gt;</span>
        </p>
        <p className="text-fg-muted">
          look at <span className="text-ultramarine">app/pricing/page.tsx</span>
        </p>
      </div>
      <pre className="pv-code">
        <span className="text-fg-subtle">app/pricing/page.tsx</span>
        {"\n"}
        {"export const metadata = {\n  title: \"Pricing\",\n"}
        <span className={`pv-del ${phase >= 1 ? "is-gone" : ""}`}>{"  robots: { index: false },\n"}</span>
        {"};"}
      </pre>
      <div className={`pv-term pv-reveal ${phase >= 2 ? "is-on" : ""}`}>
        <p className="text-on-blue-muted">$ npx septune audit localhost:3000</p>
        <p className="mt-1 text-lime">✓ /pricing indexable · 0 critical · score 100</p>
      </div>
    </Window>
  );
}

/* ── 04 Monitor: production, on a schedule ── */
const SITES: [host: string, score: number, spark: string][] = [
  ["your-site.com", 98, "0,9 10,8 20,9 30,7 40,8 50,6 60,7 70,6 80,6 90,5 100,5"],
  ["blog.your-site.com", 81, "0,6 10,6 20,5 30,6 40,5 50,5 60,6 70,5 80,5 90,6 100,17"],
  ["docs.your-site.com", 100, "0,8 10,7 20,7 30,6 40,5 50,5 60,4 70,4 80,3 90,3 100,3"],
  ["shop.your-site.com", 94, "0,10 10,9 20,9 30,8 40,8 50,8 60,7 70,7 80,7 90,6 100,6"],
  ["app.your-site.com", 96, "0,6 10,7 20,6 30,6 40,5 50,6 60,5 70,5 80,5 90,4 100,4"],
];

function MonitorView({ play, tier = 0 }: { play: Play; tier?: number }) {
  const phase = usePhases(play, [1600]);
  const plan = PRICING_TIERS[tier] ?? PRICING_TIERS[0]!;
  const { sites, frequency } = plan.limits;
  return (
    <Window play={play} title="Septune · Monitors" meta={`${plan.name}: ${sites} ${sites === 1 ? "site" : "sites"}, ${frequency}`}>
      <ul className="font-mono text-[12px]">
        {SITES.map(([host, score, spark], i) => {
          const live = i < sites;
          const alert = host.startsWith("blog");
          return (
            <li
              key={host}
              data-live={live || undefined}
              className="pv-site pv-in flex items-center gap-3 border-b border-border-soft px-4 py-2.5"
              style={{ "--i": i } as React.CSSProperties}
            >
              <Dot tone={!live ? "idle" : alert && phase >= 1 ? "bad" : "ok"} />
              <span className="min-w-0 flex-1 truncate text-fg">{live ? host : "add a site"}</span>
              {live && (
                <>
                  <svg aria-hidden viewBox="0 0 100 20" className="pv-spark" preserveAspectRatio="none">
                    <polyline points={spark} />
                  </svg>
                  <span className={`w-7 text-right tabular-nums ${alert && phase >= 1 ? "font-semibold text-danger" : "text-fg"}`}>
                    {score}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {sites > SITES.length && (
        <p className="border-b border-border-soft px-4 py-2 font-mono text-[11.5px] text-fg-subtle">
          + {sites - SITES.length} more sites
        </p>
      )}
      <div className={`pv-reveal ${phase >= 1 ? "is-on" : ""} px-4 py-3.5`}>
        <div className="pv-alert">
          <p className="font-mono text-[11.5px] text-fg-subtle">#seo-alerts · Slack</p>
          <p className="mt-1 text-[13px] leading-snug text-fg">
            <span className="font-semibold">blog.your-site.com</span> dropped from 98 to 81.{" "}
            <span className="font-mono text-[12px]">/blog/pricing-guide</span> became noindex in the last deploy.
          </p>
        </div>
      </div>
    </Window>
  );
}

/* ── 05 AI search: who may fetch the site, and what they read ── */
const BOTS: [bot: string, who: string, ok: boolean, note: string][] = [
  ["Googlebot", "AI Overviews, AI Mode", true, "allowed"],
  ["OAI-SearchBot", "ChatGPT search", true, "allowed"],
  ["Claude-SearchBot", "Claude search", true, "allowed"],
  ["PerplexityBot", "Perplexity", false, "blocked, line 12"],
  ["GPTBot", "OpenAI training", false, "off, by choice"],
];

function AiView({ play }: { play: Play }) {
  const phase = usePhases(play, [1500]);
  return (
    <Window play={play} title="septune geo https://your-site.com" meta="21 crawlers">
      <table className="pv-table">
        <thead>
          <tr>
            <th>crawler</th>
            <th className="max-sm:hidden">answers in</th>
            <th>robots.txt</th>
          </tr>
        </thead>
        <tbody>
          {BOTS.map(([bot, who, ok, note], i) => (
            <tr key={bot} className="pv-in" style={{ "--i": i } as React.CSSProperties}>
              <td className="text-fg">{bot}</td>
              <td className="max-sm:hidden">{who}</td>
              <td>
                <Dot tone={ok ? "ok" : bot === "GPTBot" ? "idle" : "bad"} /> {note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`pv-reveal ${phase >= 1 ? "is-on" : ""} border-t border-border px-4 py-3.5`}>
        <p className="font-mono text-[11.5px] text-fg-subtle">what they read, without running JavaScript</p>
        <ul className="mt-2 space-y-1.5 font-mono text-[12px]">
          <li className="flex items-center gap-2.5">
            <Dot tone="ok" />
            <span className="text-fg">/docs</span>
            <span className="ml-auto text-fg-muted">1 240 words in the HTML</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Dot tone="bad" />
            <span className="text-fg">/pricing</span>
            <span className="ml-auto font-semibold text-danger">14 words, the rest is JS</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Dot tone="ok" />
            <span className="text-fg">/llms.txt</span>
            <span className="ml-auto text-fg-muted">found, 38 links</span>
          </li>
        </ul>
      </div>
    </Window>
  );
}

function ViewBody({ view, play, tier }: { view: View; play: Play; tier?: number }) {
  switch (view) {
    case "crawl":
      return <CrawlView play={play} />;
    case "pr":
      return <PrView play={play} />;
    case "fix":
      return <FixView play={play} />;
    case "monitor":
      return <MonitorView play={play} tier={tier} />;
    case "ai":
      return <AiView play={play} />;
  }
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A step's window inline, under its text: small screens only. It plays the
 * first time it is well into view.
 */
export function InlineView({ view }: { view: View }) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState<Play>("end");
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || window.matchMedia("(min-width: 1024px)").matches) return;
    const hide = requestAnimationFrame(() => setPlay((p) => (p === "end" ? "wait" : p)));
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setPlay("on");
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(hide);
      io.disconnect();
    };
  }, []);
  return (
    <div ref={ref} aria-hidden className="pv-inline lg:hidden">
      <ViewBody view={view} play={play} />
    </div>
  );
}

/** On large screens a step takes over when its top passes this fraction of the viewport. */
const ACTIVE_AT = 0.55;
/**
 * The panel beside the steps on large screens: one window at a time, the
 * one for the step being read, and the chips to jump between them.
 */
export function StoryPanel() {
  // active: the step being read, null until the first one reaches the line
  // (nothing plays off screen). playing: the window on its first, only run.
  const [state, setState] = useState<{ active: View | null; playing: View | null; seen: View[]; motion: boolean }>({
    active: null,
    playing: null,
    seen: [],
    motion: false,
  });
  const [tier, setTier] = useState(0);

  useEffect(() => {
    const steps = VIEWS.map((v) => document.querySelector<HTMLElement>(`[data-story-step="${v}"]`));
    const motion = !reduced();
    let raf = 0;
    const pick = () => {
      raf = 0;
      const line = window.innerHeight * ACTIVE_AT;
      let i = -1;
      steps.forEach((el, k) => {
        if (el && el.getBoundingClientRect().top <= line) i = k;
      });
      const next = i < 0 ? null : VIEWS[i]!;
      setState((s) => {
        if (s.active === next && s.motion === motion) return s;
        if (!next) return { ...s, active: null, playing: null, motion };
        const fresh = !s.seen.includes(next);
        return {
          active: next,
          playing: fresh ? next : s.playing === next ? next : null,
          seen: fresh ? [...s.seen, next] : s.seen,
          motion,
        };
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // The plan the visitor points at in the monitor step lights its sites.
    const watch = steps[VIEWS.indexOf("monitor")];
    const point = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tier]")?.dataset.tier;
      setTier(t ? Number(t) : 0);
    };
    const drop = () => setTier(0);
    watch?.addEventListener("pointerover", point);
    watch?.addEventListener("focusin", point);
    watch?.addEventListener("pointerleave", drop);
    watch?.addEventListener("focusout", drop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      watch?.removeEventListener("pointerover", point);
      watch?.removeEventListener("focusin", point);
      watch?.removeEventListener("pointerleave", drop);
      watch?.removeEventListener("focusout", drop);
    };
  }, []);

  const { active, playing, seen, motion } = state;
  const shown = active ?? "crawl";
  const playOf = (v: View): Play => {
    if (!motion) return "end";
    if (v === playing) return "on";
    return seen.includes(v) ? "end" : "wait";
  };

  return (
    <div className="stage-col" data-active={shown}>
      <div aria-hidden className="sky-field sky-field--panel" />
      <div aria-hidden className="stage-figure">
        {VIEWS.map((v) => (
          <div key={v} className="pv-slot" data-shown={v === shown || undefined}>
            <ViewBody view={v} play={playOf(v)} tier={v === "monitor" ? tier : 0} />
          </div>
        ))}
      </div>
      <nav aria-label="Features" className="stage-chips">
        {VIEWS.map((v, i) => (
          <a key={v} href={`#${v}`} data-chip={v} aria-current={v === shown ? "step" : undefined}>
            <span>0{i + 1}</span> {VIEW_LABELS[v]}
          </a>
        ))}
      </nav>
    </div>
  );
}
