import type { Metadata } from "next";
import { TopicHubIndex } from "@/components/marketing/topic-article";
import { HUBS, topicsIn } from "@/lib/seo/topics";

export const metadata: Metadata = {
  title: HUBS["search-console"].title,
  description: HUBS["search-console"].description,
  alternates: { canonical: "/search-console" },
};

export default function Page() {
  return <TopicHubIndex hub="search-console" topics={topicsIn("search-console")} />;
}
