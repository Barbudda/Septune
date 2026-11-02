import type { Metadata } from "next";
import { TopicHubIndex } from "@/components/marketing/topic-article";
import { HUBS, topicsIn } from "@/lib/seo/topics";

export const metadata: Metadata = {
  title: HUBS["hosting"].title,
  description: HUBS["hosting"].description,
  alternates: { canonical: "/hosting" },
};

export default function Page() {
  return <TopicHubIndex hub="hosting" topics={topicsIn("hosting")} />;
}
