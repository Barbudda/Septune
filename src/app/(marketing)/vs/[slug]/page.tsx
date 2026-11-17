import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VsArticle } from "@/components/marketing/vs-article";
import { VS_PAGES, getVs, vsPath } from "@/lib/seo/vs";

export const dynamicParams = false;

export function generateStaticParams() {
  return VS_PAGES.map((p) => ({ slug: p.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = getVs((await params).slug);
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: { canonical: vsPath(page) } };
}

export default async function Page({ params }: { params: Params }) {
  const page = getVs((await params).slug);
  if (!page) notFound();
  return <VsArticle page={page} />;
}
