import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Find Your Next Job Anywhere
      </h1>
      <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
        Global job matching powered by AI. Free to start.
      </p>
      <div className="mt-10 flex gap-4">
        <Link href="/jobs">
          <Button size="lg">Browse Jobs</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline" size="lg">Get Started</Button>
        </Link>
      </div>
    </div>
  );
}
