'use client'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface PageErrorProps {
    message?: string
    onRetry?: () => void
}

export function PageError({ message = 'Something went wrong loading this page.', onRetry }: PageErrorProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-5 text-center px-4">
            <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <div className="space-y-1">
                <p className="font-semibold text-base">Failed to load</p>
                <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-all"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </button>
            )}
        </div>
    )
}
