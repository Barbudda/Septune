import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDay } from "@/lib/utils";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/schema";
import { RULE_CATALOG } from "@/lib/audit/catalog";

export const metadata: Metadata = {
  title: "Use the Septune agent in your editor (MCP)",
  description:
    "Connect Septune to Claude Code, Cursor or VS Code over MCP: your coding assistant audits your site with Septune's engine and fixes the code in your repo.",
  alternates: { canonical: "/docs/agent" },
};

// Dates of the first and the last commit that changed this page.
const PUBLISHED = "2026-07-06";
const UPDATED = "2026-10-27";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-code p-4 font-mono text-xs leading-relaxed text-fg-muted">
      <code>{children}</code>
    </pre>
  );
}

export default function AgentDocsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Docs", path: "/docs" },
          { name: "Agent in your editor", path: "/docs/agent" },
        ])}
      />
      <JsonLd
        data={techArticleSchema({
          headline: "The Septune agent, inside your editor",
          description: "Connect Septune to Claude Code, Cursor or VS Code over MCP and let your coding assistant audit and fix your site.",
          path: "/docs/agent",
          datePublished: PUBLISHED,
          dateModified: UPDATED,
        })}
      />
      <ProsePage
        title="The Septune agent, inside your editor"
        intro="Septune ships as an MCP server. Connect it to Claude Code, Cursor, VS Code, Windsurf or any MCP-capable assistant: the assistant measures your site with Septune's deterministic engine, then fixes the code right in the repository it already has open."
      >
        <p className="text-xs text-fg-subtle">
          Published <time dateTime={PUBLISHED}>{formatDay(PUBLISHED)}</time> · updated <time dateTime={UPDATED}>{formatDay(UPDATED)}</time>
        </p>
        <ProseBlock heading="Why this beats a dashboard">
          <p>
            An audit report tells you what&apos;s wrong; your coding assistant can
            actually change the code. With Septune connected over MCP, one
            prompt (<em>&ldquo;audit my dev server and fix what you find&rdquo;</em>)
            runs the full technical-SEO audit against{" "}
            <span className="font-mono text-xs">localhost</span>, walks the
            findings, patches your files, and re-audits to verify. The
            measurements are deterministic (no AI guessing); the reasoning is
            your assistant&apos;s.
          </p>
        </ProseBlock>

        <ProseBlock heading="Connect from Claude Code">
          <p>Install the plugin. It brings the MCP tools and two skills:</p>
          <CodeBlock>{`/plugin marketplace add Barbudda/septune
/plugin install septune@septune`}</CodeBlock>
          <p className="mt-3">
            <span className="font-mono text-xs">/septune:seo</span> audits the
            site in your repository and fixes what it can;{" "}
            <span className="font-mono text-xs">/septune:check</span> compares
            your local or preview version with production before you ship. Or add
            the bare MCP server:
          </p>
          <CodeBlock>{`claude mcp add septune -- npx -y septune mcp`}</CodeBlock>
          <p className="mt-3">
            On native Windows, use{" "}
            <span className="font-mono text-xs">cmd /c npx -y septune mcp</span>{" "}
            after the <span className="font-mono text-xs">--</span>. Then ask:{" "}
            <em>&ldquo;Use septune to audit http://localhost:3000 and fix the
            issues you can.&rdquo;</em>
          </p>
        </ProseBlock>

        <ProseBlock heading="Connect from Cursor / VS Code / Windsurf">
          <p>
            Add a stdio server to your client&apos;s configuration (e.g.{" "}
            <span className="font-mono text-xs">.cursor/mcp.json</span>; VS Code&apos;s{" "}
            <span className="font-mono text-xs">.vscode/mcp.json</span> uses a{" "}
            <span className="font-mono text-xs">servers</span> key instead):
          </p>
          <CodeBlock>{`{
  "mcpServers": {
    "septune": { "command": "npx", "args": ["-y", "septune", "mcp"] }
  }
}`}</CodeBlock>
          <p className="mt-3">
            It needs Node.js 18 or later. The{" "}
            <a
              href="https://github.com/Barbudda/rankforge-cli#2-in-your-ai-editor-the-agent"
              className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright"
            >
              README
            </a>{" "}
            has the exact file for each editor.
          </p>
        </ProseBlock>

        <ProseBlock heading="What the agent can do">
          <ul className="mt-2 list-inside list-disc space-y-2">
            <li>
              <span className="font-mono text-xs">audit_site</span>: a full
              deterministic audit with category scores, every issue with evidence,
              orphan pages, click depth, duplicate-content clusters, semantic
              internal-link suggestions, measured image weights and broken
              links. Works on localhost.
            </li>
            <li>
              <span className="font-mono text-xs">compare_sites</span>: production
              against your dev server or a preview deployment, page by page. It
              reports what would drop pages from search (new noindex, pages that
              start failing, robots.txt blocking Google) and keeps differences
              that come from the preview environment apart.
            </li>
            <li>
              <span className="font-mono text-xs">audit_page</span>: an instant
              single-page check while you iterate.
            </li>
            <li>
              <span className="font-mono text-xs">geo_audit</span> and{" "}
              <span className="font-mono text-xs">generate_llms_txt</span>:
              whether AI search engines can reach, read and cite the site, and an
              llms.txt built from your pages.
            </li>
            <li>
              <span className="font-mono text-xs">get_fix_template</span>: a
              framework-idiomatic patch (unified diff) for mechanical issues:
              robots, sitemap, viewport, lang, canonical, structured data,
              OpenGraph image.
            </li>
            <li>
              <span className="font-mono text-xs">seo_docs</span>: grounded
              answers from the{" "}
              <Link href="/docs" className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright">
                Septune knowledge base
              </Link>
              , so the assistant explains issues accurately.
            </li>
            <li>
              <span className="font-mono text-xs">list_rules</span>: the {RULE_CATALOG.length} checks,
              under the same rule ids the audits return.
            </li>
          </ul>
        </ProseBlock>

        <ProseBlock heading="Runs on your machine">
          <p>
            The MCP server is the open-source CLI, started by your editor. It runs
            on your machine, so it audits{" "}
            <span className="font-mono text-xs">localhost</span> and you see issues
            as you build, before deploying. It needs no account and no key, and it
            sends nothing anywhere: the only outside call is the optional Core Web
            Vitals lookup, which asks Google about the URL when you request it.
          </p>
        </ProseBlock>

        <ProseBlock heading="Security model">
          <p>
            The tools only read rendered pages, the same thing any crawler sees.
            Septune never writes to your repository: your assistant edits the
            files, and you review them as you would any change. The crawler
            identifies itself as SeptuneBot and honours robots.txt unless you
            pass <span className="font-mono text-xs">ignoreRobots</span> for your
            own site. The hosted endpoint at{" "}
            <span className="font-mono text-xs">/api/mcp</span> is closed by
            default and, when opened, refuses private and internal addresses,
            checking every resolved IP, redirects included.
          </p>
        </ProseBlock>
      </ProsePage>
    </>
  );
}
