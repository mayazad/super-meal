'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type MonthPickerProps = {
    currentMonth: string       // "YYYY-MM"
    slug: string
    onClose: () => void
}

const MONTHS = [
    { label: 'Jan', val: '01' }, { label: 'Feb', val: '02' }, { label: 'Mar', val: '03' }, { label: 'Apr', val: '04' },
    { label: 'May', val: '05' }, { label: 'Jun', val: '06' }, { label: 'Jul', val: '07' }, { label: 'Aug', val: '08' },
    { label: 'Sep', val: '09' }, { label: 'Oct', val: '10' }, { label: 'Nov', val: '11' }, { label: 'Dec', val: '12' },
]

export default function MonthPicker({ currentMonth, slug, onClose }: MonthPickerProps) {
    const [displayYear, setDisplayYear] = useState(parseInt(currentMonth.substring(0, 4), 10))

    const now = new Date()
    const currentRealYear = now.getFullYear()
    const currentRealMonthNum = now.getMonth() + 1 // 1-12

    const currentViewedYear = parseInt(currentMonth.substring(0, 4), 10)
    const currentViewedMonthStr = currentMonth.substring(5, 7)

    // Close when pressing Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    return (
        <>
            {/* Backdrop for mobile (covers full screen) and desktop (invisible click-away) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[100] sm:z-40 bg-black/50 sm:bg-transparent"
                onClick={onClose}
            />

            {/* Popup Panel */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
                className="fixed sm:absolute bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] z-[101] sm:z-50 bg-card sm:border sm:shadow-xl rounded-t-2xl sm:rounded-xl p-4 sm:p-3 sm:w-[280px]"
            >
                {/* Header (Year Navigation) */}
                <div className="flex items-center justify-between mb-4 sm:mb-3">
                    <button
                        onClick={() => setDisplayYear(y => y - 1)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-sm">{displayYear}</span>
                    <button
                        onClick={() => setDisplayYear(y => y + 1)}
                        disabled={displayYear >= currentRealYear}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-4 gap-2 sm:gap-1.5">
                    {MONTHS.map(m => {
                        const isFuture = displayYear > currentRealYear || (displayYear === currentRealYear && parseInt(m.val, 10) > currentRealMonthNum)
                        const isViewed = displayYear === currentViewedYear && m.val === currentViewedMonthStr
                        const isCurrentReal = displayYear === currentRealYear && parseInt(m.val, 10) === currentRealMonthNum

                        if (isFuture) {
                            return (
                                <div key={m.val} className="h-10 sm:h-9 flex items-center justify-center text-xs font-medium text-muted-foreground/30 select-none">
                                    {m.label}
                                </div>
                            )
                        }

                        return (
                            <Link
                                key={m.val}
                                href={`/view/${slug}/${displayYear}-${m.val}`}
                                onClick={onClose}
                                className={`relative h-10 sm:h-9 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${isViewed
                                        ? 'bg-foreground text-background shadow-sm hover:opacity-90'
                                        : 'hover:bg-muted hover:text-foreground text-muted-foreground'
                                    }`}
                            >
                                {m.label}
                                {isCurrentReal && !isViewed && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />
                                )}
                            </Link>
                        )
                    })}
                </div>
            </motion.div>
        </>
    )
}
