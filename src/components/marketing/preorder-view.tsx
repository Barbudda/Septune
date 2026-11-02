import Link from "next/link";
import { Check } from "lucide-react";
import { PreorderForm } from "@/components/marketing/preorder-form";
import { PRICING_TIERS } from "@/lib/pricing";
import type { PreorderPlan } from "@/lib/preorder/core";

/** The pre-order form and the plan it is for: rendered for Pro on the server, for the chosen plan in the browser. */
export function PreorderView({ plan, source }: { plan: PreorderPlan; source: string }) {
  const tier = PRICING_TIERS.find((t) => t.id === plan)!;
  const other = PRICING_TIERS.find((t) => t.id === (plan === "pro" ? "studio" : "pro"))!;
  const link = "text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright";

  return (
  <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
    <div>
      <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
        Pre-order Septune {tier.name}
      </h1>
      <p className="mt-5 max-w-xl text-lg text-fg-muted">
        Payments open soon. Leave your email and we&apos;ll write once, the day {tier.name} opens, with a link to
        start. Nothing is charged now, and you can still say no then.
      </p>
      <div className="mt-8 max-w-xl">
        <PreorderForm plan={plan} planName={tier.name} source={source} />
      </div>
      <p className="mt-4 max-w-xl text-xs text-fg-subtle">
        We use this address only to tell you when {tier.name} opens. Ask us to delete it anytime; see the{" "}
        <Link href="/privacy" className={link}>
          privacy policy
        </Link>
        .
      </p>
      <p className="mt-8 max-w-xl text-sm text-fg-muted">
        Meanwhile the free plan works today: unlimited audits from the CLI and your editor, the pull-request
        check, and one site watched every week.{" "}
        <Link href="/signup" className={link}>
          Start free
        </Link>
        .
      </p>
    </div>

    <div className="lg rounded-2xl p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">{tier.name}</h2>
        <p className="text-2xl font-semibold text-fg">
          €{tier.priceMonthly}
          <span className="text-sm font-normal text-fg-subtle">/mo</span>
        </p>
      </div>
      <p className="mt-2 text-sm text-fg-muted">{tier.tagline}</p>
      <ul className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm text-fg-muted">
        {tier.features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-signal" />
            {f}
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-border pt-4 text-xs text-fg-subtle">
        Looking for {other.name.toLowerCase() === "studio" ? "more sites" : "fewer sites"}?{" "}
        <Link href={`/preorder?plan=${other.id}&source=${encodeURIComponent(source)}`} className={link}>
          Pre-order {other.name} (€{other.priceMonthly}/mo)
        </Link>
      </p>
    </div>
  </div>
  );
}
