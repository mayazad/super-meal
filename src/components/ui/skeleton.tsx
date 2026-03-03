// Reusable shimmer skeleton block
export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-lg bg-muted/60 ${className}`} />
    )
}

// A row of skeleton lines mimicking a table row
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className={`h-4 flex-1 ${i === 0 ? 'max-w-[140px]' : ''}`} />
            ))}
        </div>
    )
}

// Card-style skeleton for stat blocks
export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`rounded-xl border border-border/50 p-5 space-y-3 ${className}`}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
        </div>
    )
}

// Full-page table skeleton (form + list)
export function SkeletonPage({ rows = 5, cards = 0 }: { rows?: number; cards?: number }) {
    return (
        <div className="space-y-6 max-w-5xl animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-7 w-48 rounded-lg bg-muted/60" />
                <div className="h-4 w-72 rounded-lg bg-muted/40" />
            </div>
            {/* Stat cards (optional) */}
            {cards > 0 && (
                <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(cards, 4)} gap-4`}>
                    {Array.from({ length: cards }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-border/50 p-5 space-y-3">
                            <div className="h-3 w-20 rounded bg-muted/60" />
                            <div className="h-7 w-16 rounded bg-muted/60" />
                        </div>
                    ))}
                </div>
            )}
            {/* Table */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
                {/* Table header */}
                <div className="flex gap-3 px-4 py-3 bg-muted/30 border-b border-border/50">
                    {[1, 2, 3].map(i => <div key={i} className="h-3 flex-1 rounded bg-muted/60" />)}
                </div>
                {/* Rows */}
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                        <div className="h-4 w-32 rounded bg-muted/60" />
                        <div className="h-4 flex-1 rounded bg-muted/40" />
                        <div className="h-4 w-20 rounded bg-muted/60" />
                    </div>
                ))}
            </div>
        </div>
    )
}
