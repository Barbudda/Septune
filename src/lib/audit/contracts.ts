import type { Severity } from "@/types";
import type { CrawledPage } from "./types";
import type { EngineIssue } from "./engine";
import { RULE_CATALOG } from "./catalog";

/**
 * Contrats SEO écrits par l'utilisateur (septune.yml). Le moteur sait ce qu'un
 * site « devrait » avoir en général ; un contrat dit ce que CETTE famille de
 * pages doit avoir, et casse le déploiement quand ce n'est plus vrai, comme un
 * test unitaire. Rien ici n'appelle le réseau : on évalue des pages déjà
 * crawlées, donc le même code sert la CLI, le serveur MCP et l'Action.
 */

export const CONFIG_FILES = ["septune.yml", ".septune.yml"] as const;
export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
export type FailOn = "critical" | "high" | "medium";
const FAIL_ON: FailOn[] = ["critical", "high", "medium"];

export interface Contract {
  match: string;
  line: number;
  severity: Severity;
  status?: number;
  indexable?: boolean;
  canonical?: string; // "self" ou une URL / un chemin
  h1?: string; // "present" ou un texte exact
  title?: "present";
  schema?: string[];
  minWords?: number;
  linksInMin?: number;
}

export interface IgnoreRule {
  match: string;
  rules: string[];
  reason: string;
  line: number;
}

export interface SeptuneConfig {
  failOn: FailOn;
  contracts: Contract[];
  ignore: IgnoreRule[];
}

export interface ConfigError {
  line: number;
  key: string;
  message: string;
}

export class ConfigParseError extends Error {
  constructor(public file: string, public errors: ConfigError[]) {
    super(formatConfigErrors(file, errors));
  }
}

export function formatConfigErrors(file: string, errors: ConfigError[]): string {
  return errors.map((e) => `${file}:${e.line}${e.key ? ` (${e.key})` : ""}: ${e.message}`).join("\n");
}

// ── mini-parseur YAML ────────────────────────────────────────────────
// Sous-ensemble volontaire : mappings, listes de mappings, listes de scalaires
// (blocs « - x » ou inline « [a, b] »), scalaires, commentaires. Pas d'ancres,
// pas de blocs multi-lignes : on préfère une erreur claire à une demi-lecture.

type Scalar = string | number | boolean | null;
type YNode =
  | { t: "s"; v: Scalar; line: number }
  | { t: "m"; m: Map<string, YNode>; line: number }
  | { t: "l"; l: YNode[]; line: number };

interface YLine {
  n: number;
  indent: number;
  text: string;
}

function stripComment(s: string): string {
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (q) {
      if (ch === q) q = null;
    } else if (ch === '"' || ch === "'") q = ch;
    else if (ch === "#" && (i === 0 || /\s/.test(s[i - 1]!))) return s.slice(0, i);
  }
  return s;
}

function scalar(raw: string, line: number): Scalar {
  const s = raw.trim();
  if (s.startsWith('"') || s.startsWith("'")) {
    const q = s[0]!;
    if (s.length < 2 || s[s.length - 1] !== q) throw { line, key: "", message: `guillemet ${q} non fermé` } satisfies ConfigError;
    const inner = s.slice(1, -1);
    return q === '"' ? inner.replace(/\\(["\\nt])/g, (_, c: string) => (c === "n" ? "\n" : c === "t" ? "\t" : c)) : inner.replace(/''/g, "'");
  }
  if (s === "" || s === "~" || s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function splitFlow(inner: string, line: number): YNode[] {
  const out: YNode[] = [];
  let cur = "";
  let q: string | null = null;
  for (const ch of inner) {
    if (q) {
      cur += ch;
      if (ch === q) q = null;
    } else if (ch === '"' || ch === "'") {
      q = ch;
      cur += ch;
    } else if (ch === ",") {
      out.push({ t: "s", v: scalar(cur, line), line });
      cur = "";
    } else cur += ch;
  }
  if (cur.trim() !== "" || out.length) out.push({ t: "s", v: scalar(cur, line), line });
  return out;
}

function value(raw: string, line: number): YNode {
  const s = raw.trim();
  if (s.startsWith("[")) {
    if (!s.endsWith("]")) throw { line, key: "", message: "liste inline non fermée (il manque « ] »)" } satisfies ConfigError;
    const inner = s.slice(1, -1);
    return { t: "l", l: inner.trim() ? splitFlow(inner, line) : [], line };
  }
  if (s.startsWith("{")) throw { line, key: "", message: "les mappings inline { } ne sont pas pris en charge, utilise des lignes « clé: valeur »" } satisfies ConfigError;
  return { t: "s", v: scalar(s, line), line };
}

const KEY_RE = /^([A-Za-z0-9_./*-]+|"[^"]*"|'[^']*')\s*:(?:\s+(.*))?$/;

function parseYaml(src: string): YNode {
  const lines: YLine[] = [];
  src.split(/\r?\n/).forEach((raw, i) => {
    const n = i + 1;
    if (/^\s*\t/.test(raw)) throw { line: n, key: "", message: "tabulation en début de ligne : YAML veut des espaces" } satisfies ConfigError;
    const text = stripComment(raw).replace(/\s+$/, "");
    if (!text.trim()) return;
    lines.push({ n, indent: text.length - text.trimStart().length, text: text.trim() });
  });
  let pos = 0;

  const isItem = (l: YLine) => l.text === "-" || l.text.startsWith("- ");

  function block(indent: number): YNode {
    const l = lines[pos]!;
    return isItem(l) ? list(indent) : map(indent);
  }

  function map(indent: number): YNode {
    const first = lines[pos]!;
    const m = new Map<string, YNode>();
    while (pos < lines.length && lines[pos]!.indent === indent && !isItem(lines[pos]!)) {
      const l = lines[pos]!;
      const k = KEY_RE.exec(l.text);
      if (!k) throw { line: l.n, key: "", message: `je attends « clé: valeur », j'ai lu « ${l.text} »` } satisfies ConfigError;
      const key = k[1]!.replace(/^["']|["']$/g, "");
      if (m.has(key)) throw { line: l.n, key, message: `clé « ${key} » en double` } satisfies ConfigError;
      pos++;
      const rest = k[2]?.trim();
      if (rest) m.set(key, value(rest, l.n));
      else {
        const nx = lines[pos];
        if (nx && (nx.indent > indent || (nx.indent === indent && isItem(nx)))) m.set(key, block(nx.indent));
        else m.set(key, { t: "s", v: null, line: l.n });
      }
    }
    const stray = lines[pos];
    if (stray && stray.indent > indent) throw { line: stray.n, key: "", message: "indentation inattendue" } satisfies ConfigError;
    return { t: "m", m, line: first.n };
  }

  function list(indent: number): YNode {
    const first = lines[pos]!;
    const items: YNode[] = [];
    while (pos < lines.length && lines[pos]!.indent === indent && isItem(lines[pos]!)) {
      const l = lines[pos]!;
      const rest = l.text.slice(1).trim();
      if (!rest) {
        pos++;
        const nx = lines[pos];
        if (nx && nx.indent > indent) items.push(block(nx.indent));
        else items.push({ t: "s", v: null, line: l.n });
      } else if (KEY_RE.test(rest) && !rest.startsWith('"') && !rest.startsWith("'")) {
        // « - clé: valeur » : l'élément est un mapping dont les autres clés
        // sont alignées sur la première.
        const off = l.text.length - l.text.slice(1).trimStart().length;
        lines[pos] = { n: l.n, indent: indent + off, text: rest };
        items.push(map(indent + off));
      } else {
        pos++;
        items.push(value(rest, l.n));
      }
    }
    const stray = lines[pos];
    if (stray && stray.indent > indent) throw { line: stray.n, key: "", message: "indentation inattendue" } satisfies ConfigError;
    return { t: "l", l: items, line: first.n };
  }

  if (!lines.length) return { t: "m", m: new Map(), line: 1 };
  const root = block(lines[0]!.indent);
  if (pos < lines.length) throw { line: lines[pos]!.n, key: "", message: "indentation inattendue" } satisfies ConfigError;
  return root;
}

// ── validation ───────────────────────────────────────────────────────

const CONTRACT_KEYS = ["match", "severity", "status", "indexable", "canonical", "h1", "title", "schema", "min_words", "links_in_min"];
const IGNORE_KEYS = ["match", "rules", "reason"];
const TOP_KEYS = ["fail_on", "contracts", "ignore"];

/** Identifiants de règle valides pour `ignore` : le catalogue du moteur + les règles de contrat. */
export const CONTRACT_RULE_IDS = [
  "contract-status",
  "contract-indexable",
  "contract-canonical",
  "contract-h1",
  "contract-title",
  "contract-schema",
  "contract-min-words",
  "contract-links-in-min",
] as const;
const KNOWN_RULES = new Set<string>([...RULE_CATALOG.map((r) => r.id), ...CONTRACT_RULE_IDS]);

export function parseConfig(src: string, file = "septune.yml"): SeptuneConfig {
  let root: YNode;
  try {
    root = parseYaml(src);
  } catch (e) {
    if (e && typeof e === "object" && "line" in e) throw new ConfigParseError(file, [e as ConfigError]);
    throw e;
  }
  const errors: ConfigError[] = [];
  const err = (line: number, key: string, message: string) => errors.push({ line, key, message });
  const cfg: SeptuneConfig = { failOn: "high", contracts: [], ignore: [] };

  if (root.t !== "m") {
    err(root.line, "", "le fichier doit être un mapping (fail_on, contracts, ignore)");
    throw new ConfigParseError(file, errors);
  }
  const unknown = (m: Map<string, YNode>, allowed: string[], path: string) => {
    for (const [k, n] of m) if (!allowed.includes(k)) err(n.line, path ? `${path}.${k}` : k, `clé inconnue. Clés admises : ${allowed.join(", ")}`);
  };
  unknown(root.m, TOP_KEYS, "");

  const fo = root.m.get("fail_on");
  if (fo) {
    if (fo.t === "s" && typeof fo.v === "string" && FAIL_ON.includes(fo.v as FailOn)) cfg.failOn = fo.v as FailOn;
    else err(fo.line, "fail_on", `doit valoir ${FAIL_ON.join(", ")}`);
  }

  const isEmpty = (n: YNode | undefined) => n === undefined || (n.t === "s" && n.v === null);
  const cs = root.m.get("contracts");
  if (cs && !isEmpty(cs)) {
    if (cs.t !== "l") err(cs.line, "contracts", "doit être une liste de contrats (« - match: /products/* »)");
    else
      cs.l.forEach((item, i) => {
        const p = `contracts[${i}]`;
        if (item.t !== "m") return err(item.line, p, "un contrat est un mapping avec au moins « match »");
        unknown(item.m, CONTRACT_KEYS, p);
        const c: Contract = { match: "", line: item.line, severity: "high" };
        const get = (k: string) => item.m.get(k);
        const str = (k: string): string | undefined => {
          const n = get(k);
          if (!n) return undefined;
          if (n.t === "s" && typeof n.v === "string" && n.v.trim()) return n.v;
          err(n.line, `${p}.${k}`, "doit être un texte non vide");
          return undefined;
        };
        const m = get("match");
        const ms = str("match");
        if (!m) err(item.line, `${p}.match`, "« match » est obligatoire (un motif de chemin comme /products/*)");
        else if (ms !== undefined) {
          if (!ms.startsWith("/")) err(m.line, `${p}.match`, `le motif doit commencer par « / » (reçu « ${ms} »)`);
          else c.match = ms;
        }
        const sev = get("severity");
        if (sev) {
          if (sev.t === "s" && typeof sev.v === "string" && SEVERITIES.includes(sev.v as Severity)) c.severity = sev.v as Severity;
          else err(sev.line, `${p}.severity`, `doit valoir ${SEVERITIES.join(", ")}`);
        }
        const st = get("status");
        if (st) {
          if (st.t === "s" && typeof st.v === "number" && Number.isInteger(st.v) && st.v >= 100 && st.v < 600) c.status = st.v;
          else err(st.line, `${p}.status`, "doit être un code HTTP (200, 301…)");
        }
        const ix = get("indexable");
        if (ix) {
          if (ix.t === "s" && typeof ix.v === "boolean") c.indexable = ix.v;
          else err(ix.line, `${p}.indexable`, "doit valoir true ou false");
        }
        const ca = str("canonical");
        if (ca !== undefined) c.canonical = ca;
        const h1 = get("h1");
        if (h1) {
          if (h1.t === "s" && typeof h1.v === "string" && h1.v.trim()) c.h1 = h1.v;
          else err(h1.line, `${p}.h1`, "doit valoir « present » ou le texte exact attendu");
        }
        const ti = get("title");
        if (ti) {
          if (ti.t === "s" && ti.v === "present") c.title = "present";
          else err(ti.line, `${p}.title`, "seule la valeur « present » existe");
        }
        const sc = get("schema");
        if (sc) {
          const names = sc.t === "l" ? sc.l : sc.t === "s" && typeof sc.v === "string" ? [sc] : null;
          if (!names || !names.length || names.some((n) => n.t !== "s" || typeof n.v !== "string" || !n.v)) {
            err(sc.line, `${p}.schema`, "doit être une liste de types JSON-LD, par exemple [Product, Offer]");
          } else c.schema = names.map((n) => (n as { v: string }).v);
        }
        for (const [k, field] of [["min_words", "minWords"], ["links_in_min", "linksInMin"]] as const) {
          const n = get(k);
          if (!n) continue;
          if (n.t === "s" && typeof n.v === "number" && Number.isInteger(n.v) && n.v >= 0) c[field] = n.v;
          else err(n.line, `${p}.${k}`, "doit être un entier positif");
        }
        if (!CONTRACT_KEYS.slice(2).some((k) => get(k))) err(item.line, p, "aucune assertion : ajoute status, indexable, canonical, h1, title, schema, min_words ou links_in_min");
        if (c.match) cfg.contracts.push(c);
      });
  }

  const ig = root.m.get("ignore");
  if (ig && !isEmpty(ig)) {
    if (ig.t !== "l") err(ig.line, "ignore", "doit être une liste (« - match: … / rules: [...] / reason: … »)");
    else
      ig.l.forEach((item, i) => {
        const p = `ignore[${i}]`;
        if (item.t !== "m") return err(item.line, p, "une exception est un mapping avec match, rules et reason");
        unknown(item.m, IGNORE_KEYS, p);
        const r: IgnoreRule = { match: "", rules: [], reason: "", line: item.line };
        const m = item.m.get("match");
        if (!m || m.t !== "s" || typeof m.v !== "string" || !m.v.startsWith("/")) err(m?.line ?? item.line, `${p}.match`, "« match » est obligatoire et commence par « / »");
        else r.match = m.v;
        const rl = item.m.get("rules");
        const names = rl ? (rl.t === "l" ? rl.l : rl.t === "s" && typeof rl.v === "string" ? [rl] : null) : null;
        if (!names || !names.length) err(rl?.line ?? item.line, `${p}.rules`, "« rules » est obligatoire : une liste d'identifiants de règle");
        else
          for (const n of names) {
            if (n.t !== "s" || typeof n.v !== "string") err(n.line, `${p}.rules`, "un identifiant de règle est un texte");
            else if (!KNOWN_RULES.has(n.v)) err(n.line, `${p}.rules`, `règle inconnue « ${n.v} » (voir septune rules)`);
            else r.rules.push(n.v);
          }
        const re = item.m.get("reason");
        if (!re || re.t !== "s" || typeof re.v !== "string" || !re.v.trim()) err(re?.line ?? item.line, `${p}.reason`, "« reason » est obligatoire : une exception sans raison finit oubliée");
        else r.reason = re.v.trim();
        if (r.match && r.rules.length && r.reason) cfg.ignore.push(r);
      });
  }

  if (errors.length) throw new ConfigParseError(file, errors.sort((a, b) => a.line - b.line));
  return cfg;
}

// ── motifs de chemin ─────────────────────────────────────────────────

/** `*` = un segment, `**` = plusieurs segments. Le chemin sans slash final et le chemin avec slash final sont équivalents. */
export function globToRegExp(glob: string): RegExp {
  const g = glob.length > 1 ? glob.replace(/\/+$/, "") : glob;
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const ch = g[i]!;
    if (ch === "*") {
      if (g[i + 1] === "*") {
        re += ".*";
        i++;
      } else re += "[^/]*";
    } else re += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}/?$`);
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url.startsWith("/") ? url.split(/[?#]/)[0]! : url;
  }
}

export const pathMatches = (glob: string, urlOrPath: string) => globToRegExp(glob).test(pathOf(urlOrPath));

const normUrl = (u: string) => {
  try {
    const x = new URL(u);
    x.hash = "";
    return (x.origin + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase();
  } catch {
    return u.replace(/\/+$/, "").toLowerCase();
  }
};

// ── évaluation ───────────────────────────────────────────────────────

const NOINDEX = /\b(noindex|none)\b/;

function jsonLdTypes(nodes: unknown[]): Set<string> {
  const out = new Set<string>();
  const walk = (n: unknown, depth: number) => {
    if (!n || typeof n !== "object" || depth > 6) return;
    if (Array.isArray(n)) return n.forEach((x) => walk(x, depth + 1));
    const o = n as Record<string, unknown>;
    const t = o["@type"];
    for (const x of Array.isArray(t) ? t : t ? [t] : []) if (typeof x === "string") out.add(x.replace(/^.*[/#]/, ""));
    for (const v of Object.values(o)) if (v && typeof v === "object") walk(v, depth + 1);
  };
  walk(nodes, 0);
  return out;
}

/** Combien de pages crawlées pointent vers chacune (liens internes, hors elle-même). */
function inboundCounts(pages: CrawledPage[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of pages) {
    const seen = new Set<string>();
    for (const l of p.links) {
      if (!l.internal) continue;
      let target: string;
      try {
        target = normUrl(new URL(l.href, p.url).href);
      } catch {
        continue;
      }
      if (target === normUrl(p.url) || seen.has(target)) continue;
      seen.add(target);
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }
  }
  return counts;
}

export interface ContractResult {
  issues: EngineIssue[];
  /** Contrats dont le motif ne correspond à aucune page crawlée : ils passent à vide. */
  unmatched: { match: string; line: number }[];
  /** Pages vérifiées, tous contrats confondus. */
  checked: number;
  /** Assertions évaluées (pages × assertions). */
  assertions: number;
}

const RULE_TITLE: Record<string, string> = {
  status: "status",
  indexable: "indexable",
  canonical: "canonical",
  h1: "h1",
  title: "title",
  schema: "schema",
  "min-words": "min_words",
  "links-in-min": "links_in_min",
};

export function evaluateContracts(cfg: SeptuneConfig, pages: CrawledPage[]): ContractResult {
  const inbound = inboundCounts(pages);
  const issues: EngineIssue[] = [];
  const unmatched: ContractResult["unmatched"] = [];
  let assertions = 0;
  const checkedUrls = new Set<string>();

  for (const c of cfg.contracts) {
    const matched = pages.filter((p) => pathMatches(c.match, p.url));
    if (!matched.length) unmatched.push({ match: c.match, line: c.line });
    // assertion → pages en échec
    const fails = new Map<string, { url: string; note: string }[]>();
    const fail = (a: string, p: CrawledPage, expected: string, found: string) => {
      const arr = fails.get(a) ?? [];
      arr.push({ url: p.url, note: `expected ${expected}, found ${found}` });
      fails.set(a, arr);
    };
    for (const p of matched) {
      checkedUrls.add(p.url);
      const path = pathOf(p.url);
      if (c.status !== undefined) {
        assertions++;
        if (p.statusCode !== c.status) fail("status", p, String(c.status), String(p.statusCode));
      }
      if (c.indexable !== undefined) {
        assertions++;
        const reasons: string[] = [];
        if (p.statusCode >= 400) reasons.push(`HTTP ${p.statusCode}`);
        if (p.metaRobots && NOINDEX.test(p.metaRobots)) reasons.push(`robots meta "${p.metaRobots}"`);
        if (p.metaGooglebot && NOINDEX.test(p.metaGooglebot)) reasons.push(`googlebot meta "${p.metaGooglebot}"`);
        if (p.xRobotsTag && NOINDEX.test(p.xRobotsTag)) reasons.push(`X-Robots-Tag "${p.xRobotsTag}"`);
        const indexable = reasons.length === 0;
        if (indexable !== c.indexable) fail("indexable", p, c.indexable ? "indexable" : "noindex", indexable ? "indexable" : `not indexable (${reasons.join(", ")})`);
      }
      if (c.canonical !== undefined) {
        assertions++;
        let want: string;
        try {
          want = c.canonical === "self" ? p.url : new URL(c.canonical, p.url).href;
        } catch {
          want = c.canonical;
        }
        const label = c.canonical === "self" ? `self (${path})` : c.canonical;
        if (!p.canonical) fail("canonical", p, label, "no canonical tag");
        else if (normUrl(new URL(p.canonical, p.url).href) !== normUrl(want)) fail("canonical", p, label, p.canonical);
      }
      if (c.h1 !== undefined) {
        assertions++;
        const h1s = p.h1s.map((h) => h.trim()).filter(Boolean);
        if (c.h1 === "present") {
          if (!h1s.length) fail("h1", p, "an H1", "no H1");
        } else if (!h1s.some((h) => h.toLowerCase() === c.h1!.trim().toLowerCase())) {
          fail("h1", p, `H1 "${c.h1}"`, h1s.length ? `H1 "${h1s[0]}"` : "no H1");
        }
      }
      if (c.title) {
        assertions++;
        if (!p.title?.trim()) fail("title", p, "a <title>", "no <title>");
      }
      if (c.schema) {
        assertions++;
        const have = jsonLdTypes(p.jsonLd);
        const missing = c.schema.filter((t) => !have.has(t));
        if (missing.length) fail("schema", p, `JSON-LD ${c.schema.join(", ")}`, have.size ? `${[...have].join(", ")} (missing ${missing.join(", ")})` : "no JSON-LD");
      }
      if (c.minWords !== undefined) {
        assertions++;
        if (p.wordCount < c.minWords) fail("min-words", p, `at least ${c.minWords} words`, `${p.wordCount} words`);
      }
      if (c.linksInMin !== undefined) {
        assertions++;
        const n = inbound.get(normUrl(p.url)) ?? 0;
        if (n < c.linksInMin) fail("links-in-min", p, `at least ${c.linksInMin} internal links in`, `${n} (among ${pages.length} crawled pages)`);
      }
    }
    for (const [a, list] of fails) {
      issues.push({
        ruleId: `contract-${a}`,
        category: "structure",
        title: `Contract ${c.match}: ${RULE_TITLE[a]} failed on ${list.length} page${list.length > 1 ? "s" : ""}`,
        description: `septune.yml line ${c.line}: pages matching ${c.match} must satisfy the ${a} assertion.`,
        impact: c.severity,
        effort: "low",
        risk: "low",
        confidence: 1,
        evidence: list.slice(0, 5).map((f) => `${pathOf(f.url)}: ${f.note}`).join("; ") + (list.length > 5 ? `; and ${list.length - 5} more` : ""),
        affectedUrls: list,
        files: [],
        canAutoFix: false,
      });
    }
  }
  return { issues, unmatched, checked: checkedUrls.size, assertions };
}

// ── exceptions ───────────────────────────────────────────────────────

export interface IgnoredFinding {
  ruleId: string;
  url: string;
  match: string;
  reason: string;
}

/**
 * Retire des findings les pages couvertes par une exception. Un finding sans
 * URL (site entier) n'est ignoré que par un motif « /** ». Ce qui est retiré
 * est rendu, pas jeté : le rapport l'affiche pour que l'exception reste visible.
 */
export function applyIgnores<T extends { ruleId: string; affectedUrls: { url: string; note?: string }[] }>(
  issues: T[],
  rules: IgnoreRule[],
): { kept: T[]; ignored: IgnoredFinding[] } {
  const kept: T[] = [];
  const ignored: IgnoredFinding[] = [];
  for (const issue of issues) {
    const rs = rules.filter((r) => r.rules.includes(issue.ruleId));
    if (!rs.length) {
      kept.push(issue);
      continue;
    }
    if (!issue.affectedUrls.length) {
      const hit = rs.find((r) => r.match === "/**");
      if (hit) ignored.push({ ruleId: issue.ruleId, url: "(whole site)", match: hit.match, reason: hit.reason });
      else kept.push(issue);
      continue;
    }
    const left = issue.affectedUrls.filter((u) => {
      const hit = rs.find((r) => pathMatches(r.match, u.url));
      if (hit) ignored.push({ ruleId: issue.ruleId, url: u.url, match: hit.match, reason: hit.reason });
      return !hit;
    });
    if (left.length) kept.push({ ...issue, affectedUrls: left });
  }
  return { kept, ignored };
}

/** Exceptions appliquées à un diff : les issues nouvelles ou aggravées d'une règle ignorée sur ces chemins disparaissent. */
export function ignoreInDiff<D extends { newIssues: { ruleId: string; paths: string[]; impact: Severity }[]; worsenedIssues: { ruleId: string; paths: string[]; impact: Severity }[]; changes: { kind: string; path?: string; paths?: string[]; title: string; level: string }[] }>(
  d: D,
  rules: IgnoreRule[],
): { diff: D; ignored: IgnoredFinding[] } {
  const ignored: IgnoredFinding[] = [];
  const keepIssues = <I extends { ruleId: string; paths: string[] }>(list: I[]) =>
    list.flatMap((i) => {
      const rs = rules.filter((r) => r.rules.includes(i.ruleId));
      if (!rs.length) return [i];
      const left = i.paths.filter((p) => {
        const hit = rs.find((r) => pathMatches(r.match, p));
        if (hit) ignored.push({ ruleId: i.ruleId, url: p, match: hit.match, reason: hit.reason });
        return !hit;
      });
      return left.length ? [{ ...i, paths: left }] : [];
    });
  const newIssues = keepIssues(d.newIssues);
  const worsenedIssues = keepIssues(d.worsenedIssues);
  // Les changes « new-issue » / « worsened-issue » sont dérivés de ces listes : on retire ceux dont l'issue a entièrement disparu.
  const gone = new Set(
    [...d.newIssues, ...d.worsenedIssues]
      .filter((i) => ![...newIssues, ...worsenedIssues].some((k) => k.ruleId === i.ruleId))
      .map((i) => `${i.ruleId}|${i.paths[0]}`),
  );
  const changes = d.changes.filter((c) => !((c.kind === "new-issue" || c.kind === "worsened-issue") && [...gone].some((g) => g.endsWith(`|${c.path}`))));
  return { diff: { ...d, newIssues, worsenedIssues, changes }, ignored };
}

// ── seuil de blocage ─────────────────────────────────────────────────

const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
export const atOrAbove = (impact: Severity, threshold: FailOn) => RANK[impact] <= RANK[threshold];

/** Le test échoue-t-il ? Un finding non ignoré au niveau du seuil ou au-dessus. */
export function contractsFail(issues: { impact: Severity }[], failOn: FailOn): boolean {
  return issues.some((i) => atOrAbove(i.impact, failOn));
}

/**
 * Seuil d'un diff. Un changement critique (page en erreur, noindex, robots
 * qui bloque Google) échoue toujours ; ensuite `fail_on` décide quelles
 * issues nouvelles ou aggravées bloquent : critical = aucune de plus, high =
 * critical + high, medium = jusqu'à medium.
 */
export function diffFailsOn(
  d: { changes: { level: string }[]; newIssues: { impact: Severity }[]; worsenedIssues: { impact: Severity }[] },
  failOn: FailOn,
): boolean {
  if (d.changes.some((c) => c.level === "critical")) return true;
  return [...d.newIssues, ...d.worsenedIssues].some((i) => atOrAbove(i.impact, failOn));
}

export const STARTER_CONFIG = `# septune.yml : contrats SEO testés à chaque déploiement.
# Lancer : septune test <url>      (seulement les contrats, rapide, pour la CI)
# Doc : https://www.septune.dev/docs/tests

# Seuil qui fait échouer la CI (septune diff et septune test) :
# critical, high ou medium. Défaut : high.
fail_on: high

contracts:
  # Chaque contrat vise un motif de chemin. * = un segment, ** = plusieurs.
  - match: /products/*
    severity: high            # critical | high | medium | low (défaut high)
    status: 200
    indexable: true
    canonical: self           # ou une URL / un chemin
    title: present
    h1: present               # ou le texte exact attendu
    schema: [Product, Offer]  # types JSON-LD présents
    min_words: 150
    links_in_min: 2           # liens internes entrants (pages crawlées)

  # - match: /blog/*
  #   status: 200
  #   canonical: self
  #   schema: [Article]
  #   min_words: 400

# Exceptions : une règle précise, sur un motif précis, avec une raison.
# Elles sont affichées dans le rapport (« ignored by septune.yml »).
ignore:
  # - match: /legal/*
  #   rules: [structure-thin-content]
  #   reason: Les pages légales sont courtes par nature.
`;

/** Pour les tests et les messages : retrouve le fichier de config en remontant depuis un dossier. */
export function configNames(): readonly string[] {
  return CONFIG_FILES;
}
