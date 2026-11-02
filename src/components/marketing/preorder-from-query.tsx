"use client";

import { useSearchParams } from "next/navigation";
import { isPreorderPlan } from "@/lib/preorder/core";
import { PreorderView } from "./preorder-view";

/**
 * Reads ?plan and ?source in the browser, so /preorder stays a static page:
 * rendered on each request it answered in 1.2 s in production (Septune's
 * TTFB check, 2026-11-01).
 */
export function PreorderFromQuery() {
  const params = useSearchParams();
  const plan = params.get("plan");
  return <PreorderView plan={isPreorderPlan(plan) ? plan : "pro"} source={params.get("source") ?? "pricing"} />;
}
