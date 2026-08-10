import React from 'react';
import { AppShellSkeleton } from '@/components/skeletons/AppShellSkeleton';

interface RouteLoadingFallbackProps {
  minimal?: boolean;
}

export const RouteLoadingFallback: React.FC<RouteLoadingFallbackProps> = ({ minimal }) => {
  if (minimal) {
    return (
      <div className="min-h-screen bg-[#131313] grid place-items-center p-6 text-[#e5e2e1]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-full border-4 border-[#ff5f00] border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-[#ffb599] tracking-wide uppercase animate-pulse">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return <AppShellSkeleton />;
};
