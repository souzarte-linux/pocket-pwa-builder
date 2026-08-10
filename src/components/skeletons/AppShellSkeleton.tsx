import React from 'react';

export const AppShellSkeleton: React.FC = () => {
  return (
    <div className="app-shell pb-24 min-h-screen bg-[#131313] text-[#e5e2e1]">
      {/* Top Header Skeleton */}
      <header className="sticky top-0 z-30 bg-[#131313]/90 backdrop-blur-xl border-b border-[#ff5f00]/30 safe-top">
        <div className="flex items-center justify-between gap-3 px-4 py-3 min-h-[56px]">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-[#201f1f] border border-[#ff5f00]/20 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-[#201f1f] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[#2a2a2a] rounded animate-pulse" />
            </div>
          </div>
          <div className="size-11 rounded-xl bg-[#201f1f] border border-stone-800 animate-pulse" />
        </div>
      </header>

      {/* Main Content Area Skeleton */}
      <main className="px-5 sm:px-6 md:px-8 pt-4 md:pt-6 pb-6 space-y-4 animate-fade-in">
        {/* KPI / Hero Card Skeleton */}
        <div className="rounded-2xl bg-[#201f1f] border border-stone-800/80 p-5 space-y-3 animate-pulse">
          <div className="h-4 w-32 bg-[#2a2a2a] rounded" />
          <div className="h-8 w-44 bg-[#353534] rounded" />
          <div className="h-2 w-full bg-[#131313] rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-[#ff5f00]/50 rounded-full" />
          </div>
        </div>

        {/* Secondary Cards Grid Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl bg-[#201f1f] border border-stone-800/60 p-4 space-y-2 animate-pulse">
            <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
            <div className="h-6 w-24 bg-[#353534] rounded" />
          </div>
          <div className="h-24 rounded-xl bg-[#201f1f] border border-stone-800/60 p-4 space-y-2 animate-pulse">
            <div className="h-3 w-16 bg-[#2a2a2a] rounded" />
            <div className="h-6 w-24 bg-[#353534] rounded" />
          </div>
        </div>

        {/* List Items Skeleton */}
        <div className="space-y-2.5 pt-2">
          <div className="h-16 rounded-xl bg-[#201f1f] border border-stone-800/50 animate-pulse" />
          <div className="h-16 rounded-xl bg-[#201f1f] border border-stone-800/50 animate-pulse" />
          <div className="h-16 rounded-xl bg-[#201f1f] border border-stone-800/50 animate-pulse" />
        </div>
      </main>

      {/* Bottom Nav Skeleton */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#131313]/95 backdrop-blur-lg border-t border-stone-800 h-16 safe-bottom">
        <div className="h-full flex items-center justify-around px-4">
          <div className="size-8 rounded-lg bg-[#201f1f] animate-pulse" />
          <div className="size-8 rounded-lg bg-[#201f1f] animate-pulse" />
          <div className="size-10 rounded-xl bg-[#ff5f00]/30 animate-pulse" />
          <div className="size-8 rounded-lg bg-[#201f1f] animate-pulse" />
          <div className="size-8 rounded-lg bg-[#201f1f] animate-pulse" />
        </div>
      </nav>
    </div>
  );
};
