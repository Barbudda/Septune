import type { CrawledPage } from "./types";
import type { GeoCheck } from "./geo";

/**
 * Raw HTML vs rendered page: what a crawler that doesn't run JavaScript sees
 * compared with what a browser shows. The comparison itself is pure and
 * deterministic; the rendering is injected (the CLI's opt-in `--render`
 * launches the Chrome or Edge already on the machine), so the engine carries
 * no browser dependency and tests feed it fixtures.
 */

export interface RenderedPage {
  /** URL that was requested, matched to the crawled page by path. */
  url: string;
  /** Visible words once scripts have run. */
  wordCount: number;
  /** Absolute hrefs of the links in the rendered DOM. */
  links: string[];
  /** Number of application/ld+json blocks in the rendered DOM. */
  jsonLdBlocks: number;
}

export type RenderOutcome = { ok: true; pages: RenderedPage[] } | { ok: false; reason: string };

export interface PageParity {
  path: string;
  /** Share (0-1) of the rendered words already in the raw HTML. */
  words: number;
  rawWords: number;
  renderedWords: number;
  /** Internal links only the rendered DOM has. */
  linksMissing: number;
  renderedLinks: number;
  jsonLdMissing: number;
  flagged: boolean;
  problems: string[];
}

/** Under this share of the words, the page is mostly invisible to a crawler without JavaScript. */
export const WORD_SHARE_MIN = 0.5;
/** Too few words to judge a share (a login form, a redirect shell). */
const MIN_RENDERED_WORDS = 30;
const MIN_MISSING_LINKS = 3;

function pathOf(url: string, base?: string): string | null {
  try {
    const u = new URL(url, base);
    return (u.pathname.replace(/\/+$/, "") || "/") + u.search;
  } catch {
    return null;
  }
}

export function pageParity(raw: CrawledPage, rendered: RenderedPage): PageParity {
  const path = pathOf(raw.url) ?? raw.url;
  const origin = (() => {
    try {
      return new URL(raw.url).origin;
    } catch {
      return "";
    }
  })();
  const rawLinks = new Set(raw.links.filter((l) => l.internal).map((l) => pathOf(l.href, raw.url)).filter((p): p is string => p !== null));
  const renderedLinks = new Set(
    rendered.links
      .filter((h) => {
        try {
          return new URL(h, raw.url).origin === origin;
        } catch {
          return false;
        }
      })
      .map((h) => pathOf(h, raw.url))
      .filter((p): p is string => p !== null),
  );
  const linksMissing = [...renderedLinks].filter((l) => !rawLinks.has(l)).length;
  const words = rendered.wordCount > 0 ? Math.min(1, raw.wordCount / rendered.wordCount) : 1;
  const jsonLdMissing = Math.max(0, rendered.jsonLdBlocks - raw.jsonLd.length);

  const problems: string[] = [];
  if (rendered.wordCount >= MIN_RENDERED_WORDS && words < WORD_SHARE_MIN) {
    problems.push(`${Math.round(words * 100)}% of the words in the HTML (${raw.wordCount} of ${rendered.wordCount})`);
  }
  if (linksMissing >= MIN_MISSING_LINKS && linksMissing / renderedLinks.size > 0.5) {
    problems.push(`${linksMissing} of ${renderedLinks.size} internal links only after JavaScript`);
  }
  if (jsonLdMissing > 0) {
    problems.push(`${jsonLdMissing} JSON-LD block${jsonLdMissing > 1 ? "s" : ""} only after JavaScript`);
  }
  return {
    path,
    words,
    rawWords: raw.wordCount,
    renderedWords: rendered.wordCount,
    linksMissing,
    renderedLinks: renderedLinks.size,
    jsonLdMissing,
    flagged: problems.length > 0,
    problems,
  };
}

/** The geo check, or null when rendering wasn't asked for. */
export function renderParityCheck(pages: CrawledPage[], outcome: RenderOutcome | undefined): GeoCheck | null {
  if (!outcome) return null;
  const base: Pick<GeoCheck, "id" | "group" | "title" | "informational"> = {
    id: "geo-render-parity",
    group: "readable",
    title: "Raw HTML matches the rendered page",
    // Opt-in measure: shown, never scored, so a run without --render stays comparable.
    informational: true,
  };
  if (!outcome.ok) {
    return { ...base, status: "warn", detail: `Skipped: ${outcome.reason}` };
  }
  const byPath = new Map(pages.map((p) => [pathOf(p.url) ?? p.url, p]));
  const results: PageParity[] = [];
  for (const r of outcome.pages) {
    const raw = byPath.get(pathOf(r.url) ?? r.url);
    if (raw) results.push(pageParity(raw, r));
  }
  if (results.length === 0) return { ...base, status: "warn", detail: "Skipped: no page could be rendered." };
  const flagged = results.filter((r) => r.flagged);
  if (flagged.length === 0) {
    return {
      ...base,
      status: "pass",
      detail: `${results.length} rendered page(s): the text, internal links and JSON-LD a browser shows are all in the server HTML.`,
    };
  }
  return {
    ...base,
    status: flagged.length >= Math.ceil(results.length / 2) ? "fail" : "warn",
    detail: `${flagged.length} of ${results.length} rendered page(s) show more in a browser than in the HTML a crawler without JavaScript fetches: ${flagged
      .slice(0, 3)
      .map((f) => `${f.path} (${f.problems.join("; ")})`)
      .join(" · ")}${flagged.length > 3 ? " …" : ""}. Most AI crawlers don't run JavaScript.`,
    fix: "Server-render or prerender these routes (SSR/SSG) so the text, links and JSON-LD are in the initial HTML.",
    pages: flagged.map((f) => f.path),
  };
}
