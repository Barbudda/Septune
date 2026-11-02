"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/audit", label: "audit" },
  { href: "/docs", label: "docs" },
  { href: "/pricing", label: "pricing" },
];

const LINK =
  "font-mono text-[13px] text-fg-muted transition-colors duration-200 hover:text-fg aria-[current=page]:text-fg";

/**
 * A thin monospace line over the page: the mark, three links, sign in, and
 * a pill with the number of checks (it opens the docs that list them). Over the homepage's blue hero it turns light and has no bar; on the
 * paper, a fade at the top of the page, then a solid bar once the page
 * moves, so no line of text ever runs under the links.
 */
export function SiteNav({ checks }: { checks: number }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // Over the hero, kept per page: the server renders the homepage with the
  // hero under the nav, so its first paint is already light.
  const [hero, setHero] = useState({ path: pathname, over: pathname === "/" });
  const overHero = hero.path === pathname ? hero.over : pathname === "/";

  // Observers, never a scroll listener: reading the scroll position while the
  // page changes forced a layout on every event (trace of 2026-11-01).
  // Scrolled once the 8 px marker at the top of the page (marketing layout)
  // has left the screen; over the hero while its bottom is below the bar (72 px).
  useEffect(() => {
    const marker = document.querySelector<HTMLElement>("[data-nav-top]");
    const scrolledIo = marker ? new IntersectionObserver(([e]) => setScrolled(!e?.isIntersecting)) : null;
    if (marker) scrolledIo?.observe(marker);
    const heroEl = document.querySelector<HTMLElement>("[data-nav-hero]");
    const heroIo = heroEl
      ? new IntersectionObserver(([e]) => setHero({ path: pathname, over: !!e?.isIntersecting }), {
          rootMargin: "-72px 0px 0px 0px",
        })
      : null;
    if (heroEl) heroIo?.observe(heroEl);
    return () => {
      scrolledIo?.disconnect();
      heroIo?.disconnect();
    };
  }, [pathname]);

  // The menu closes on Escape, and on any link (onClick below).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50", overHero && !open && "on-blue")}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-bg via-bg/75 to-transparent transition-opacity duration-300",
          (scrolled || overHero) && "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-18 border-b border-border bg-bg transition-opacity duration-300",
          !scrolled && !open && "opacity-0",
          open && "transition-none",
        )}
      />
      <nav aria-label="Main" className="container-rf relative flex h-18 items-center gap-7">
        <Link href="/" aria-label="Septune home" className="rounded-full">
          <Logo />
        </Link>

        <div className="ml-auto hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={current(l.href)} className={LINK}>
              {l.label}
            </Link>
          ))}
          <Link href="/login" className={LINK}>
            sign in
          </Link>
        </div>

        <Link
          href="/docs"
          aria-label={`${checks} checks: see what Septune measures`}
          className="ml-auto inline-flex h-10 shrink-0 items-center rounded-full border border-border bg-bg px-4 font-mono text-[13px] text-fg transition-colors duration-200 hover:border-molten-bright md:ml-0"
        >
          {checks} checks
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          className={cn(LINK, "rounded-full py-2 md:hidden")}
        >
          {open ? "close" : "menu"}
        </button>
      </nav>

      {open && (
        <div id="site-menu" className="container-rf relative border-b border-border bg-bg pb-6 md:hidden">
          <ul className="border-t border-border">
            {[...LINKS, { href: "/login", label: "sign in" }, { href: "/signup", label: "start free" }].map((l) => (
              <li key={l.href} className="border-b border-border">
                <Link
                  href={l.href}
                  aria-current={current(l.href)}
                  onClick={() => setOpen(false)}
                  className={cn(LINK, "block py-4 text-base")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
