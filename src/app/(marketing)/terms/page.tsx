import type { Metadata } from "next";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BILLING_OPEN } from "@/lib/pricing";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/*
 * TO REVIEW before billing opens (asked on 2026-10-25): whether paid plans
 * are sold to consumers or to professionals only (consumers bring the EU
 * withdrawal right below and a mandatory consumer mediator in France). The
 * publisher's details are in src/lib/legal.ts since 2026-11-02. Have these
 * terms read by someone qualified; nothing here is legal advice.
 */

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The short, honest terms for using Septune: the service, paid plans, cancellation and refunds.",
  alternates: { canonical: "/terms" },
};

const CONTACT = "hugopoene74@gmail.com";

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Terms", path: "/terms" },
        ])}
      />
      <ProsePage
        title="Terms of service"
        intro="Short version: use Septune honestly, review every change before you merge it, and understand it is an early-stage product. Last updated: October 2026."
      >
        <ProseBlock heading="The service">
          <p>
            Septune audits websites you control: from your machine and your
            CI through the open-source CLI, and on a schedule through hosted
            monitoring. It reads public pages and never writes to your
            repositories; any change to your code is yours to make and merge.
            Only audit URLs you are authorized to audit.
          </p>
        </ProseBlock>
        <ProseBlock heading="No guarantees on outcomes">
          <p>
            Septune fixes technical SEO issues. It does not and cannot
            promise search-ranking improvements, and nothing on this site
            should be read as such a promise.
          </p>
        </ProseBlock>
        <ProseBlock heading="Paid plans">
          {!BILLING_OPEN && (
            <p>
              Payments aren&apos;t open yet: Pro and Studio can be
              pre-ordered, which only leaves an email address. A pre-order
              costs nothing and commits you to nothing; we write once, the day
              the plan opens, and nothing is charged without your checkout.
            </p>
          )}
          <p>
            Pro and Studio are monthly subscriptions, paid in advance by card
            through Stripe, our payment processor, at the price in euros shown
            on the pricing page when you subscribe. Septune never sees or
            stores your card details.
          </p>
          <p>
            A subscription renews every month until you cancel it. You can
            cancel at any time from the billing portal: the plan stays active
            until the end of the month already paid, then the account returns
            to Free. Months already started aren&apos;t refunded, except where
            the law requires it. Moving between Pro and Studio takes effect at
            once, and Stripe prorates the difference.
          </p>
          <p>
            If a renewal payment fails, Stripe retries it over the following
            days and the plan stays active meanwhile. If it still fails, the
            account returns to Free; your sites and history stay, within the
            Free plan&apos;s limits.
          </p>
          <p>
            Prices can change. A new price applies to an existing subscription
            only after an email notice at least 30 days ahead, and you can
            cancel before it takes effect.
          </p>
          <p>
            If you subscribe as a consumer in the European Union, you can
            withdraw within 14 days of subscribing by writing to the address
            below. Because the service starts as soon as you subscribe, you
            then pay only for the days already used, and the rest is refunded.
          </p>
        </ProseBlock>
        <ProseBlock heading="Service status">
          <p>
            Septune is an early-stage product run by a solo founder.
            Features may change and the service may be interrupted. Monitoring
            runs on a schedule and alerts are sent on a best-effort basis: a
            missed or late alert doesn&apos;t replace your own checks. Review
            every change before merging; you remain responsible for your
            codebase.
          </p>
        </ProseBlock>
        <ProseBlock heading="Liability & contact">
          <p>
            Septune is published by {LEGAL.name}, {LEGAL.status}, SIREN {LEGAL.siren}, {LEGAL.address}. Full
            details are in the{" "}
            <Link className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright" href="/legal">
              legal notice
            </Link>
            .
          </p>
          <p className="mt-3">
            The service is provided &quot;as is&quot; without warranty of any
            kind, to the maximum extent permitted by law. Questions:{" "}
            <a className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </ProseBlock>
      </ProsePage>
    </>
  );
}
