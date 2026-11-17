/**
 * Metering for the HOSTED MCP endpoint. Tools that crawl a site run on our
 * servers, so each address gets a budget of them per hour; the other tools
 * (docs, rules, fix templates) cost nothing and stay unmetered. The local
 * server (`npx -y septune mcp`) runs on the caller's machine and has no limit.
 */

export const CRAWLS_PER_HOUR = 20;

export const CRAWLING_TOOLS: ReadonlySet<string> = new Set([
  "audit_site",
  "audit_page",
  "compare_sites",
  "run_contracts",
  "geo_audit",
  "generate_llms_txt",
]);

/** True for a JSON-RPC `tools/call` that would crawl a site. */
export function isCrawlCall(msg: unknown): boolean {
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) return false;
  const { method, params } = msg as { method?: unknown; params?: { name?: unknown } | null };
  return method === "tools/call" && typeof params?.name === "string" && CRAWLING_TOOLS.has(params.name);
}

export const CRAWL_LIMIT_MESSAGE =
  `The hosted Septune server runs ${CRAWLS_PER_HOUR} site crawls per hour for each address. ` +
  "Run the same audits with no limit on your own machine: claude mcp add septune -- npx -y septune mcp";
