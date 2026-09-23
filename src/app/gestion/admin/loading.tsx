import { CardSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-6">
            <div className="h-3 w-24 animate-pulse rounded bg-[#efe9dd]" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-[#efe9dd]" />
          </div>
        ))}
      </div>
      <CardSkeleton lines={5} />
    </>
  );
}
