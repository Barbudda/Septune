"use client";

import { useActionState } from "react";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import { preorderAction, type PreorderState } from "@/lib/preorder/actions";

export function PreorderForm({ plan, planName, source }: { plan: "pro" | "studio"; planName: string; source: string }) {
  const [state, action, pending] = useActionState<PreorderState, FormData>(preorderAction, { status: "idle" });

  if (state.status === "done") {
    return (
      <div role="status" className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-5">
        <p className="flex items-center gap-2 font-semibold text-signal">
          <Check className="size-4" /> {state.already ? "You were already on the list" : "You're on the list"}
        </p>
        <p className="mt-1 text-fg-muted">
          We&apos;ll email <span className="text-fg">{state.email}</span> once, the day {planName} opens. Nothing is
          charged before you check out.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="source" value={source} />
      {/* Honeypot: hidden from people and screen readers, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="lg lg-thin flex h-12 items-center gap-2.5 rounded-full px-5 sm:flex-1 focus-within:ring-2 focus-within:ring-molten-bright">
          <Mail className="size-4 shrink-0 text-fg-subtle" />
          <span className="sr-only">Your email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="h-full w-full bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="lg lg-molten inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          Pre-order {planName}
        </button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
          {state.contact && (
            <>
              {" "}Write to{" "}
              <a href={`mailto:${state.contact}`} className="underline underline-offset-2">
                {state.contact}
              </a>{" "}
              and we&apos;ll add you by hand.
            </>
          )}
        </p>
      )}
    </form>
  );
}
