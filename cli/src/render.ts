import type { CrawledPage } from "@/lib/audit/types";
import type { RenderedPage, RenderOutcome } from "@/lib/audit/render-parity";

/**
 * Opt-in rendering for `--render`. Uses `playwright-core` (an optional
 * dependency, loaded only here) to drive the Chrome or Edge already installed:
 * no browser download. Every failure becomes a skipped check, never a failed
 * audit. Lives in the CLI, never in the web app.
 */

export const RENDER_MAX_PAGES = 25;
const PAGE_TIMEOUT_MS = 10_000;

// Evaluated in the page: words of the visible text, links, JSON-LD blocks.
const EXTRACT = `(() => ({
  text: document.body ? document.body.innerText : "",
  links: Array.from(document.querySelectorAll("a[href]")).map((a) => a.href),
  jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
}))()`;

// Minimal shape of the playwright-core API used, so no type package is needed.
interface PwPage {
  goto(url: string, o: { timeout: number; waitUntil: string }): Promise<unknown>;
  waitForLoadState(state: string, o: { timeout: number }): Promise<unknown>;
  evaluate(expr: string): Promise<{ text: string; links: string[]; jsonLd: number }>;
  close(): Promise<unknown>;
}
interface PwBrowser {
  newPage(): Promise<PwPage>;
  close(): Promise<unknown>;
}
interface PwModule {
  chromium: { launch(o: { channel: string; headless: boolean }): Promise<PwBrowser> };
}
export type Launcher = () => Promise<PwModule>;

const loadPlaywright: Launcher = async () => {
  // A variable specifier keeps the bundler from resolving the optional package.
  const name = "playwright-core";
  return (await import(name)) as PwModule;
};

export function pagesToRender(pages: CrawledPage[]): string[] {
  return pages
    .filter((p) => p.statusCode >= 200 && p.statusCode < 300 && !/\b(noindex|none)\b/.test(p.metaRobots ?? ""))
    .slice(0, RENDER_MAX_PAGES)
    .map((p) => p.requestedUrl ?? p.url);
}

export async function renderPages(pages: CrawledPage[], load: Launcher = loadPlaywright): Promise<RenderOutcome> {
  let pw: PwModule;
  try {
    pw = await load();
  } catch {
    return { ok: false, reason: "--render needs the optional package playwright-core (npm i playwright-core) and Chrome or Edge on this machine." };
  }
  let browser: PwBrowser | null = null;
  for (const channel of ["chrome", "msedge"]) {
    try {
      browser = await pw.chromium.launch({ channel, headless: true });
      break;
    } catch {
      /* try the next channel */
    }
  }
  if (!browser) return { ok: false, reason: "--render found no Chrome or Edge to launch." };
  const out: RenderedPage[] = [];
  try {
    for (const url of pagesToRender(pages)) {
      let page: PwPage | null = null;
      try {
        page = await browser.newPage();
        await page.goto(url, { timeout: PAGE_TIMEOUT_MS, waitUntil: "load" });
        await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => undefined);
        const r = await page.evaluate(EXTRACT);
        out.push({ url, wordCount: r.text.split(/\s+/).filter(Boolean).length, links: r.links, jsonLdBlocks: r.jsonLd });
      } catch {
        /* a page that won't render is left out, not a failure */
      } finally {
        await page?.close().catch(() => undefined);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
  return out.length ? { ok: true, pages: out } : { ok: false, reason: "no page could be rendered." };
}
