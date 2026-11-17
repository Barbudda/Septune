import type { Metadata } from "next";
import { ProsePage, ProseBlock } from "@/components/marketing/prose-page";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Status: what is watched and how incidents are reported",
  description:
    "Septune is in early access, run by one founder, on a best-effort basis. What it depends on and how to report a problem.",
  alternates: { canonical: "/status" },
};

export default function StatusPage() {
  const link = "text-molten-bright underline decoration-molten-bright/40 underline-offset-2 hover:decoration-molten-bright";
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Status", path: "/status" },
        ])}
      />
      <ProsePage
        title="Status"
        intro="Septune is in early access, built and run by one founder. Support and incident response are best effort: no uptime figure is published and no service level is promised."
      >
        <ProseBlock heading="What Septune depends on">
          {/* TODO(Hugo): préciser quel outil de supervision tourne (Vercel, sonde externe ?) et à quelle fréquence ; le code ne le dit pas. */}
          <ul className="mt-2 list-inside list-disc space-y-2">
            <li>The website and the free public audit on septune.dev, hosted on Vercel.</li>
            <li>The hosted app, sign-in and database, on Supabase.</li>
            <li>The scheduled monitoring checks and their alert emails, sent through Resend.</li>
          </ul>
          <p className="mt-3">
            The CLI, the local MCP server and the GitHub Action run on your machine or in your CI, so they keep
            working when the website is down.
          </p>
        </ProseBlock>
        <ProseBlock heading="Reporting an incident">
          <p>
            If something is down or wrong, email{" "}
            <a className={link} href={`mailto:${LEGAL.email}`}>
              {LEGAL.email}
            </a>{" "}
            with the page or the audit URL and what you saw. One person reads that address, with no guaranteed
            reply time.
          </p>
        </ProseBlock>
      </ProsePage>
    </>
  );
}
