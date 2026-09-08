import Link from "next/link";
import { ArrowRight, Calendar, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

export const revalidate = 60;

export default async function BlogPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  let posts: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    coverImage: string | null;
    createdAt: Date;
  }[] = [];

  try {
    posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("Blog fetch error:", error);
  }

  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <BookOpen className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-3">
            {t(dict, "Blog.title", "Career Blog")}
          </h1>
          <p className="text-slate-400">
            {t(
              dict,
              "Blog.subtitle",
              "Tips, guides, and insights for your career journey"
            )}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center border border-white/10">
            <p className="text-slate-400">
              {t(
                dict,
                "Blog.noArticles",
                "No articles yet. Check back soon!"
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="glass rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-500/30 transition-all group"
              >
                {post.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-indigo-500/20 to-slate-800 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-indigo-400/50" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <time dateTime={post.createdAt.toISOString()}>
                      {new Intl.DateTimeFormat(
                        locale,
                        dateFormatOptions
                      ).format(post.createdAt)}
                    </time>
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-slate-400 text-sm line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 text-indigo-400 text-sm mt-4 group-hover:gap-2 transition-all">
                    {t(dict, "Blog.readMore", "Read more")}{" "}
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
