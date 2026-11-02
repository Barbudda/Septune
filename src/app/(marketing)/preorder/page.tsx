import type { Metadata } from "next";
import { Suspense } from "react";
import { FlowField } from "@/components/marketing/dots/flow-field-layer";
import { PreorderFromQuery } from "@/components/marketing/preorder-from-query";
import { PreorderView } from "@/components/marketing/preorder-view";

export const metadata: Metadata = {
  title: "Pre-order Pro or Studio",
  description: "Pre-order Septune Pro or Studio: leave your email and we'll write once, the day the plan opens. Nothing is charged now.",
  alternates: { canonical: "/preorder" },
  // A form page that only matters to someone who chose a plan.
  robots: { index: false, follow: true },
};

export default function PreorderPage() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <FlowField
        variant="pricing"
        className="[mask-image:linear-gradient(to_bottom,transparent_10%,#000_50%,#000_85%,transparent)]"
      />
      <div className="container-rf relative z-10">
        {/* Static HTML shows Pro; the browser switches to the plan in the link. */}
        <Suspense fallback={<PreorderView plan="pro" source="pricing" />}>
          <PreorderFromQuery />
        </Suspense>
      </div>
    </section>
  );
}
