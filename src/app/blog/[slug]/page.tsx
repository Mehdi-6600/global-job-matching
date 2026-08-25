import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });

  if (!post) return notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <article className="glass rounded-2xl p-8 sm:p-10 border border-white/10">
          {post.coverImage && (
            <div
              className="h-64 rounded-xl bg-cover bg-center mb-8"
              style={{ backgroundImage: `url(${post.coverImage})` }}
            />
          )}

          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Calendar className="w-4 h-4" />
            {new Date(post.createdAt).toLocaleDateString()}
          </div>

          <h1 className="text-3xl font-bold text-white mb-6">{post.title}</h1>

          {post.excerpt && (
            <p className="text-lg text-slate-300 mb-8 leading-relaxed border-l-4 border-indigo-500/30 pl-4">
              {post.excerpt}
            </p>
          )}

          <div
            className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </div>
  );
}
