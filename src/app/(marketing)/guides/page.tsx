import type { Metadata } from "next";
import { TopicHubIndex } from "@/components/marketing/topic-article";
import { HUBS, topicsIn } from "@/lib/seo/topics";

export const metadata: Metadata = {
  title: HUBS["guides"].title,
  description: HUBS["guides"].description,
  alternates: { canonical: "/guides" },
};

export default function Page() {
  return <TopicHubIndex hub="guides" topics={topicsIn("guides")} />;
}
