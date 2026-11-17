import type { Metadata } from "next";
import { VsIndex } from "@/components/marketing/vs-article";

export const metadata: Metadata = {
  title: "Septune vs SEO Radar, Screaming Frog, Little Warden",
  description: "Fair, dated comparisons of Septune with SEO Radar, Screaming Frog and Little Warden: who each tool is for, features, prices and when to pick the other.",
  alternates: { canonical: "/vs" },
};

export default function Page() {
  return <VsIndex />;
}
