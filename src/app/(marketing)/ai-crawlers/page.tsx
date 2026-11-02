import type { Metadata } from "next";
import { TopicHubIndex } from "@/components/marketing/topic-article";
import { HUBS, topicsIn } from "@/lib/seo/topics";

export const metadata: Metadata = {
  title: HUBS["ai-crawlers"].title,
  description: HUBS["ai-crawlers"].description,
  alternates: { canonical: "/ai-crawlers" },
};

export default function Page() {
  return <TopicHubIndex hub="ai-crawlers" topics={topicsIn("ai-crawlers")} />;
}
