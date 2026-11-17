import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { PLAN_LIMITS } from "@/lib/pricing";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy policy: your email address and what we keep",
  description:
    "What Septune stores, why, who processes it and how to get it deleted. Written in plain language.",
  alternates: { canonical: "/privacy" },
};

const CONTACT = "hugopoene74@gmail.com";

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy", path: "/privacy" },
        ])}
      />
      <ProsePage
        title="Privacy policy"
        intro="Septune is an early-stage product run by a solo founder. This page says exactly what is stored, why, and who processes it, in plain language. Last updated: November 2026."
      >
        <ProseBlock heading="What we store">
          <p>
            When you create an account: your email address and a password hash,
            both handled by Supabase Auth (we never see your plain password).
            When you connect a repository: its name, the production URL you
            provide, and the audits, issues and pull-request metadata Septune
            generates for it.
          </p>
          <p className="mt-3">
            When you turn on monitoring: the alert email address and webhook URL
            you enter, and a record of each check: the score, what changed, and a
            snapshot of the public pages it read (status codes, titles,
            canonicals, the issues found). History is kept for{" "}
            {PLAN_LIMITS.free.historyMonths} months on Free,{" "}
            {PLAN_LIMITS.pro.historyMonths} on Pro and{" "}
            {PLAN_LIMITS.studio.historyMonths} on Studio; older checks are deleted
            automatically. Removing a site deletes its monitor and every check.
          </p>
          <p className="mt-3">
            When you pre-order a plan: your email address and the plan, used
            only to tell you when it opens, then deleted on request.
          </p>
          <p className="mt-3">
            When you subscribe to a paid plan: your Stripe customer id, the
            subscription&apos;s status, renewal and cancellation dates. Invoices
            are kept by Stripe, as accounting law requires.
          </p>
        </ProseBlock>
        <ProseBlock heading="What we don't do">
          <p>
            No advertising trackers, no analytics resale, no selling of your
            data. It goes only to the services listed below, and only for what
            they do to run Septune. Septune reads your site&apos;s rendered
            HTML and your repository structure; it never reads your environment
            secrets.
          </p>
        </ProseBlock>
        <ProseBlock heading="Local audits, hosted audits and AI explanations">
          {/* TODO(Hugo): confirmer la durée de conservation des audits publics (3 pages) : le code ne dit pas s'ils sont stockés. */}
          <p>
            <strong>CLI, local MCP server and GitHub Action.</strong> These run
            on your machine or in your CI. The pages they read go from your site
            to your machine; nothing is sent to Septune.
          </p>
          <p className="mt-3">
            <strong>Hosted audits on septune.dev.</strong> The free public audit,
            the audits in the app and the hosted MCP server fetch the pages you
            point them at from our servers, on Vercel. Audits run in the app
            are stored in Supabase with your account (the audit, its issues and
            what the audit measured and the issues found); monitoring
            checks are stored as described above.
          </p>
          <p className="mt-3">
            <strong>Optional AI explanations.</strong> Some features can call
            Anthropic&apos;s API to explain findings or answer support
            questions, but only on a deployment where an Anthropic API key is
            set. Septune&apos;s production runs without one, so today nothing
            from your pages or findings is sent to Anthropic by septune.dev. If
            that changes, this page will say so before it happens, and what
            would be sent is the crawled page content and the detected issues,
            never your credentials. If you use Septune through an AI assistant
            such as Claude Code or Cursor, that assistant has its own policy for
            what it sends to its provider.
          </p>
        </ProseBlock>
        <ProseBlock heading="Who processes it">
          <ul className="mt-2 list-inside list-disc space-y-2">
            <li>
              <strong>Supabase</strong> stores the data in a PostgreSQL project
              with row-level security, so each account can only ever read its own
              rows. It also handles sign-in.
            </li>
            <li>
              <strong>Vercel</strong> hosts the app and keeps the request logs any
              web host keeps.
            </li>
            <li>
              <strong>Resend</strong> delivers the monitoring emails: the alert
              address, the site name and what changed.
            </li>
            <li>
              <strong>Stripe</strong> processes payments for Pro and Studio. It
              holds your card and billing details; Septune only keeps your
              Stripe customer id, the subscription&apos;s status and its renewal
              date, and never sees your card.
            </li>
            <li>
              <strong>Google</strong>: when Core Web Vitals are turned on, the
              monitored site&apos;s URL is sent to the Chrome UX Report API to
              read its public field data. Nothing else is sent.
            </li>
          </ul>
          <p className="mt-3">
            Alerts you route to Slack, Discord or your own webhook are delivered
            to the URL you entered, and that service&apos;s own policy applies to
            them.
          </p>
        </ProseBlock>
        <ProseBlock heading="Deletion & contact">
          <p>
            The data controller is {LEGAL.name}, {LEGAL.status}, SIREN {LEGAL.siren}, {LEGAL.address} (see the{" "}
            <Link className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright" href="/legal">
              legal notice
            </Link>
            ).
          </p>
          <p className="mt-3">
            Email <a className="text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright" href={`mailto:${CONTACT}`}>{CONTACT}</a>{" "}
            from your account address and your account and all associated data
            will be deleted. GDPR requests (access, rectification, erasure) go
            to the same address.
          </p>
        </ProseBlock>
      </ProsePage>
    </>
  );
}
