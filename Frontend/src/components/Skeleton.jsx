/**
 * Layout-faithful skeleton loaders — prefer over spinners.
 */

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function SkeletonPulse({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-lg bg-gradient-to-r from-slate-100 via-slate-200/80 to-slate-100 bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "skeleton-shimmer 1.4s ease-in-out infinite" }}
    />
  );
}

export function DocumentListSkeleton({ count = 6, view = "grid" }) {
  if (view === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#E8EAF5] rounded-xl p-4 flex items-center gap-4"
          >
            <SkeletonPulse className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonPulse className="h-4 w-2/3" />
              <SkeletonPulse className="h-3 w-1/3" />
            </div>
            <SkeletonPulse className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#E8EAF5] rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-start justify-between">
            <SkeletonPulse className="w-11 h-11 rounded-xl" />
            <SkeletonPulse className="w-16 h-6 rounded-full" />
          </div>
          <SkeletonPulse className="h-4 w-4/5" />
          <SkeletonPulse className="h-3 w-1/2" />
          <div className="flex gap-2 pt-2">
            <SkeletonPulse className="h-8 w-16 rounded-lg" />
            <SkeletonPulse className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSidebarSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <SkeletonPulse className="h-10 w-full rounded-xl" />
      <SkeletonPulse className="h-8 w-full rounded-lg" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2 py-2">
          <SkeletonPulse className="h-4 w-5/6" />
          <SkeletonPulse className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto w-full">
      <div className="flex justify-end">
        <SkeletonPulse className="h-16 w-2/3 rounded-2xl" />
      </div>
      <div className="flex gap-3">
        <SkeletonPulse className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-full" />
          <SkeletonPulse className="h-4 w-5/6" />
          <SkeletonPulse className="h-4 w-2/3" />
        </div>
      </div>
      <div className="flex justify-end">
        <SkeletonPulse className="h-12 w-1/2 rounded-2xl" />
      </div>
      <div className="flex gap-3">
        <SkeletonPulse className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-full" />
          <SkeletonPulse className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#E8EAF5] rounded-2xl p-5 space-y-3"
        >
          <SkeletonPulse className="h-3 w-24" />
          <SkeletonPulse className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SidebarNavSkeleton() {
  return (
    <div className="px-4 space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonPulse key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3 pb-6 border-b border-[#E8EAF5]">
      <SkeletonPulse className="h-8 w-64" />
      <SkeletonPulse className="h-4 w-96 max-w-full" />
    </div>
  );
}

export function UploadZoneSkeleton() {
  return (
    <div className="bg-white border-2 border-dashed border-[#E8EAF5] rounded-3xl p-10 flex flex-col items-center gap-4">
      <SkeletonPulse className="w-16 h-16 rounded-2xl" />
      <SkeletonPulse className="h-5 w-48" />
      <SkeletonPulse className="h-3 w-72 max-w-full" />
    </div>
  );
}

export function SearchBarSkeleton() {
  return <SkeletonPulse className="h-12 w-full rounded-xl" />;
}

/* inject keyframes once */
if (typeof document !== "undefined" && !document.getElementById("skeleton-keyframes")) {
  const style = document.createElement("style");
  style.id = "skeleton-keyframes";
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% { opacity: 0.65; }
      50% { opacity: 1; }
      100% { opacity: 0.65; }
    }
  `;
  document.head.appendChild(style);
}
