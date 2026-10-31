"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { PrCheckCard } from "./pr-card";
import { FlowField } from "./dots/flow-field-layer";
import { TourVideo } from "./tour-video";

const FRAMEWORKS = ["Next.js", "Nuxt", "Astro", "SvelteKit", "Remix", "MDX"];

export function Hero() {
  const item = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <FlowField
        variant="hero"
        className="[mask-image:linear-gradient(to_bottom,transparent_15%,#000_60%)] lg:[mask-image:linear-gradient(to_right,transparent,#000_55%)]"
      />
      <div className="container-rf relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <motion.div
            initial={false}
            animate="show"
            transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
          >
            <motion.h1
              variants={item}
              initial={false}
              transition={{ duration: 0.6 }}
              className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl"
            >
              Ship fast.{" "}
              <span className="text-signal">Stay indexed.</span>
            </motion.h1>

            <motion.p
              variants={item}
              initial={false}
              transition={{ duration: 0.6 }}
              className="mt-6 max-w-xl text-lg text-fg-muted"
            >
              Septune reads your site the way Googlebot does and checks it
              where SEO breaks: in your editor, in every pull request, and in
              production. It fails the pull request that would drop pages from
              Google, and hands each fix to your AI editor.
            </motion.p>

            <motion.div
              variants={item}
              initial={false}
              transition={{ duration: 0.6 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/signup"
                className="lg lg-molten inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium transition-[filter] hover:brightness-110 active:brightness-95"
              >
                Start free
              </Link>
              <Link
                href="/audit"
                className="lg lg-thin inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium text-fg transition-[filter] hover:brightness-125"
              >
                Audit a URL, free, no signup
              </Link>
            </motion.div>

            <motion.div
              variants={item}
              initial={false}
              transition={{ duration: 0.6 }}
              className="mt-5"
            >
              <TourVideo className="-ml-1" />
            </motion.div>

            <motion.div
              variants={item}
              initial={false}
              transition={{ duration: 0.6 }}
              className="mt-8"
            >
              <p className="text-sm text-fg-subtle">
                Or straight from your terminal, nothing to install
              </p>
              <p className="mt-2 font-mono text-sm text-fg-muted">
                npx septune audit your-site.com
              </p>
              <p className="mt-4 font-mono text-xs text-fg-subtle">
                {FRAMEWORKS.join(" / ")}
              </p>
            </motion.div>
          </motion.div>

          {/* Right: the comment Septune posts on a pull request */}
          <div className="relative min-w-0">
            <PrCheckCard />
          </div>
        </div>
      </div>
    </section>
  );
}
