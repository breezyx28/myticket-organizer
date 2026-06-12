import type { ReactNode } from 'react';

export function MarketplaceCarousel({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]">
      {children}
    </div>
  );
}

export function MarketplaceCarouselItem({ children }: { children: ReactNode }) {
  return <div className="w-[min(272px,82vw)] shrink-0 snap-start">{children}</div>;
}

export function MarketplaceCarouselSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-hidden px-1 pb-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-[min(272px,82vw)] shrink-0 overflow-hidden rounded-2xl border border-ink-10 bg-white"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="aspect-[16/10] animate-pulse bg-ink-5" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-ink-5" />
            <div className="h-3 w-1/2 animate-pulse rounded-md bg-ink-5" />
            <div className="mt-4 h-9 animate-pulse rounded-xl bg-ink-5" />
            <div className="h-9 animate-pulse rounded-xl bg-ink-5" />
          </div>
        </div>
      ))}
    </div>
  );
}
