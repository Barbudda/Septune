import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArticle } from "@/components/marketing/topic-article";
import { getTopic, topicPath, topicsIn } from "@/lib/seo/topics";

export const dynamicParams = false;

export function generateStaticParams() {
  return topicsIn("ai-crawlers").map((t) => ({ slug: t.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const topic = getTopic("ai-crawlers", (await params).slug);
  if (!topic) return {};
  return { title: topic.title, description: topic.description, alternates: { canonical: topicPath(topic) } };
}

export default async function Page({ params }: { params: Params }) {
  const topic = getTopic("ai-crawlers", (await params).slug);
  if (!topic) notFound();
  return <TopicArticle topic={topic} />;
}
