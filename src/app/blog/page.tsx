import Link from "next/link";
import { ArrowRight, Calendar, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export default async function BlogPage() {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <BookOpen className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-3">Career Blog</h1>
          <p className="text-slate-400">
            Tips, guides, and insights for your career journey
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center border border-white/10">
            <p className="text-slate-400">No articles yet. Check back soon!</p>
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
                  <div
                    className="h-48 bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.coverImage})` }}
                  />
                ) : (
                  <div className="h-48 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-indigo-400/50" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-slate-400 text-sm line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 text-indigo-400 text-sm mt-4 group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="w-3 h-3" />
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
