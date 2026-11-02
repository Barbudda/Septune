import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { CrawlerSwarm } from "./dots/crawler-swarm";

/**
 * Slim mid-page conversion row — catches readers right after the
 * pull-request payoff, and gives mobile (where the nav CTA is hidden) a
 * reachable CTA before the pricing section.
 */
export function MidCta() {
  return (
    <section className="relative py-4">
      <div className="container-rf flex flex-wrap items-center gap-4">
        <Link
          href="/signup"
          className="lg lg-thin inline-flex h-12 items-center justify-center gap-2 px-6 font-medium text-fg rounded-full transition-[filter] hover:brightness-125"
        >
          Start free
          <ArrowRight className="size-4" />
        </Link>
        <p className="text-sm text-fg-subtle">
          One site watched for free. No credit card.
        </p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <CrawlerSwarm
        variant="finalcta"
        className="[mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]"
      />
      <div className="container-rf relative z-10">
        <Reveal className="relative overflow-hidden lg rounded-2xl p-10 text-center md:p-16">
          <div className="absolute inset-x-0 top-0 h-64 spotlight" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
              Make your next deploy{" "}
              <em>SEO-safe</em>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-fg-muted">
              Run a free audit, add the pull-request check in two minutes,
              and let Septune watch production. Free for one site, no credit
              card.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="lg lg-molten inline-flex h-12 items-center justify-center gap-2 px-6 font-medium rounded-full transition-[filter] hover:brightness-110"
              >
                Start free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/pricing"
                className="lg lg-thin inline-flex h-12 items-center justify-center px-6 font-medium text-fg rounded-full transition-[filter] hover:brightness-125"
              >
                See pricing
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
