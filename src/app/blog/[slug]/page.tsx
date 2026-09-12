import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { absoluteUrl, truncateMeta } from "@/lib/site-url";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug, published: true },
      select: {
        title: true,
        excerpt: true,
        content: true,
        coverImage: true,
        updatedAt: true,
        createdAt: true,
        slug: true,
      },
    });

    if (!post) {
      return {
        title: "Post not found",
        robots: { index: false, follow: false },
      };
    }

    const url = absoluteUrl(`/blog/${post.slug}`);
    const description =
      truncateMeta(post.excerpt || post.content, 160) ||
      `Read ${post.title} on Global Job Matching.`;
    const image =
      post.coverImage && /^https:\/\//i.test(post.coverImage)
        ? post.coverImage
        : absoluteUrl("/og-image.png");

    return {
      title: post.title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        url,
        title: post.title,
        description,
        siteName: "Global Job Matching",
        publishedTime: post.createdAt.toISOString(),
        modifiedTime: (post.updatedAt || post.createdAt).toISOString(),
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
  const articleUrl = absoluteUrl(`/blog/${post.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: truncateMeta(post.excerpt || post.content, 200) || undefined,
    datePublished: post.createdAt.toISOString(),
    dateModified: (post.updatedAt || post.createdAt).toISOString(),
    mainEntityOfPage: articleUrl,
    image:
      post.coverImage && /^https:\/\//i.test(post.coverImage)
        ? post.coverImage
        : undefined,
    author: {
      "@type": "Organization",
      name: "Global Job Matching",
    },
    publisher: {
      "@type": "Organization",
      name: "Global Job Matching",
      url: absoluteUrl("/"),
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />{" "}
          {t(dict, "Blog.back", "Back to Blog")}
        </Link>

        <article className="glass rounded-2xl p-8 sm:p-10 border border-white/10">
          {post.coverImage && /^https:\/\//i.test(post.coverImage) && (
            <div
              className="h-64 rounded-xl bg-cover bg-center mb-8"
              style={{ backgroundImage: `url(${post.coverImage})` }}
            />
          )}

          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Calendar className="w-4 h-4" />
            {new Date(post.createdAt).toLocaleDateString(locale)}
          </div>

          <h1 className="text-3xl font-bold text-white mb-6">{post.title}</h1>

          {post.excerpt && (
            <p className="text-lg text-slate-300 mb-8 leading-relaxed border-l-4 border-indigo-500/30 pl-4">
              {post.excerpt}
            </p>
          )}

          <div
            className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </article>
      </div>
    </div>
  );
}
