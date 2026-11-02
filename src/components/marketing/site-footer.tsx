import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { legalNoticeReady } from "@/lib/legal";
import { CONTACT_EMAIL } from "@/lib/contact";

export { CONTACT_EMAIL };

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#security", label: "Security" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Frameworks",
    links: [
      { href: "/frameworks/nextjs", label: "Next.js SEO" },
      { href: "/frameworks/nuxt", label: "Nuxt SEO" },
      { href: "/frameworks/astro", label: "Astro SEO" },
      { href: "/frameworks/sveltekit", label: "SvelteKit SEO" },
      { href: "/frameworks/vite-react", label: "Vite + React SEO" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/audit", label: "Free SEO audit" },
      { href: "/tools/noindex-checker", label: "Noindex checker" },
      { href: "/tools/llms-txt-generator", label: "llms.txt generator" },
      { href: "/docs", label: "Docs" },
      { href: "/docs/agent", label: "Agent in your editor" },
      { href: "/changelog", label: "Changelog" },
      { href: "/#faq", label: "FAQ" },
      { href: `mailto:${CONTACT_EMAIL}`, label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 overflow-hidden border-t border-border bg-bg-soft">
      <div className="container-rf relative py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-fg-muted">
              Technical SEO that survives your deploys. Septune checks your
              site in your editor, on every pull request, and in production.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-fg">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) =>
                  l.href.startsWith("mailto:") ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-sm text-fg-muted transition-colors hover:text-fg"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-fg-muted transition-colors hover:text-fg"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-fg-subtle md:flex-row">
          <nav className="flex items-center gap-4" aria-label="Legal">
            <p>© 2026 Septune</p>
            <Link href="/privacy" className="transition-colors hover:text-fg">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-fg">
              Terms
            </Link>
            {legalNoticeReady && (
              <Link href="/legal" className="transition-colors hover:text-fg">
                Legal notice
              </Link>
            )}
          </nav>
          <p>No ranking promises. Just better technical SEO, shipped as code.</p>
        </div>
      </div>
      {/* The name as material: set huge, cut by the bottom of the page, over the ember the hero rose from. */}
      <div aria-hidden className="footer-ember pointer-events-none relative h-[clamp(5rem,15vw,15rem)] select-none">
        <p className="absolute inset-x-0 top-0 text-center font-display text-[clamp(7rem,26vw,26rem)] leading-[0.8] italic text-verdigris/15 [font-variation-settings:'opsz'_144,'SOFT'_60,'WONK'_1]">
          Septune
        </p>
      </div>
    </footer>
  );
}
