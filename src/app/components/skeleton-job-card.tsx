import Skeleton from "./skeleton";

export default function SkeletonJobCard() {
  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-20 h-3" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <div className="flex gap-3 mb-4">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-14 h-3" />
      </div>
      <div className="flex gap-1.5 mb-5">
        <Skeleton className="w-12 h-5 rounded-md" />
        <Skeleton className="w-14 h-5 rounded-md" />
        <Skeleton className="w-10 h-5 rounded-md" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-20 h-8 rounded-xl" />
      </div>
    </div>
  );
}
