import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { absoluteUrl, truncateMeta } from "@/lib/site-url";
import {
  jsonLdScript,
  stripHtml,
  DEFAULT_OG_PATH,
} from "@/lib/seo/core";
import { buildHreflangLanguages } from "@/lib/seo/hreflang";
import { blogPostingJsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { blogBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug, published: true },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      return {
        title: "Article not found",
        robots: { index: false, follow: false },
      };
    }

    const description = truncateMeta(
      stripHtml(post.excerpt || post.content) || post.title,
      160
    );
    const path = `/blog/${post.slug}`;
    const url = absoluteUrl(path);
    const image =
      post.coverImage && /^https:\/\//i.test(post.coverImage)
        ? post.coverImage
        : absoluteUrl(DEFAULT_OG_PATH);

    return {
      title: post.title,
      description,
      alternates: {
        canonical: url,
        languages: buildHreflangLanguages(path),
      },
      openGraph: {
        type: "article",
        url,
        title: post.title,
        description,
        images: [{ url: image, width: 1200, height: 630, alt: post.title }],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description,
        images: [image],
      },
      robots: { index: true, follow: true },
    };
  } catch (error) {
    console.error("Blog generateMetadata failed:", error);
    return {
      title: "Blog",
      description: "Career insights on Global Job Matching.",
    };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });

  if (!post) return notFound();

  const safeHtml = sanitizeBlogHtml(post.content || "");
  const jsonLd = blogPostingJsonLd({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  });
  const crumbs = breadcrumbJsonLd(
    blogBreadcrumbs({ title: post.title, slug: post.slug })
  );

  return (
    <div className="gjm-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbs) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />{" "}
          {t(dict, "Blog.back", "Back to Blog")}
        </Link>

        <article className="glass rounded-2xl p-8 sm:p-10 border border-[var(--border)]">
          {post.coverImage && /^https:\/\//i.test(post.coverImage) && (
            <div
              className="h-64 rounded-xl bg-cover bg-center mb-8"
              style={{ backgroundImage: `url(${post.coverImage})` }}
            />
          )}

          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4">
            <Calendar className="w-4 h-4" />
            {new Date(post.createdAt).toLocaleDateString(locale)}
          </div>

          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">{post.title}</h1>

          {post.excerpt && (
            <p className="text-lg text-[var(--text-body)] mb-8 leading-relaxed border-l-4 border-[var(--brand-accent)] ps-4">
              {post.excerpt}
            </p>
          )}

          <div
            className="prose prose-invert prose-lg max-w-none text-[var(--text-body)] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

          <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-wrap gap-4 text-sm">
            <Link href="/jobs" className="text-[var(--brand-accent)] hover:underline">
              Browse jobs
            </Link>
            <Link
              href="/career-risk"
              className="text-[var(--brand-accent)] hover:underline"
            >
              AI Career Risk
            </Link>
            <Link
              href="/locations"
              className="text-[var(--brand-accent)] hover:underline"
            >
              Jobs by location
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
