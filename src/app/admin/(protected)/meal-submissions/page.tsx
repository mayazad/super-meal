'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAdmin } from '@/hooks/use-admin'
import { Loader2, Check, X, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { SkeletonPage } from '@/components/ui/skeleton'

type Submission = {
    id: string
    member_id: string
    member_name: string
    date: string
    breakfast: number
    lunch: number
    dinner: number
    guest_breakfast: number
    guest_lunch: number
    guest_dinner: number
    regular_meals: number
    guest_meals: number
    note: string | null
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
}

export default function MealSubmissionsPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isActioning, setIsActioning] = useState<string | null>(null)
    const [breakfastEnabled, setBreakfastEnabled] = useState(false)
    const supabase = createClient()
    const { adminId } = useAdmin()

    const fetchSubmissions = useCallback(async () => {
        if (!adminId) return
        setIsLoading(true)
        
        const [
            { data: submissionsData },
            { data: profileData }
        ] = await Promise.all([
            supabase
                .from('meal_submissions')
                .select('*')
                .eq('admin_id', adminId)
                .order('created_at', { ascending: false })
                .limit(100),
            supabase.from('profiles').select('breakfast_enabled').eq('id', adminId).single()
        ])
        
        setSubmissions(submissionsData || [])
        setBreakfastEnabled(profileData?.breakfast_enabled || false)
        setIsLoading(false)
    }, [adminId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

    const handleAction = async (sub: Submission, action: 'approve' | 'reject') => {
        setIsActioning(sub.id)
        try {
            const newStatus = action === 'approve' ? 'approved' : 'rejected'
            
            // 1. Update status
            await supabase
                .from('meal_submissions')
                .update({ status: newStatus, reviewed_at: new Date().toISOString() })
                .eq('id', sub.id)
                
            // 2. If approved, upsert into daily_meals
            if (action === 'approve') {
                const monthYear = sub.date.substring(0, 7)
                await supabase
                    .from('daily_meals')
                    .upsert({
                        admin_id: adminId!,
                        member_id: sub.member_id,
                        date: sub.date,
                        month_year: monthYear,
                        breakfast: sub.breakfast,
                        lunch: sub.lunch,
                        dinner: sub.dinner,
                        guest_breakfast: sub.guest_breakfast,
                        guest_lunch: sub.guest_lunch,
                        guest_dinner: sub.guest_dinner,
                        regular_meals: sub.regular_meals,
                        guest_meals: sub.guest_meals,
                    }, { onConflict: 'member_id,date' })
            }
            
            // Optimistic update
            setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s))
        } catch (e) {
            console.error(e)
            alert('Action failed. Try again.')
        } finally {
            setIsActioning(null)
        }
    }

    if (isLoading) return <SkeletonPage cards={2} rows={4} />

    const pending = submissions.filter(s => s.status === 'pending')
    const reviewed = submissions.filter(s => s.status !== 'pending')

    const formatSlots = (s: Submission, type: 'regular' | 'guest') => {
        const parts = []
        if (type === 'regular') {
            if (breakfastEnabled && s.breakfast > 0) parts.push(`B:${s.breakfast}`)
            if (s.lunch > 0) parts.push(`L:${s.lunch}`)
            if (s.dinner > 0) parts.push(`D:${s.dinner}`)
        } else {
            if (breakfastEnabled && s.guest_breakfast > 0) parts.push(`B:${s.guest_breakfast}`)
            if (s.guest_lunch > 0) parts.push(`L:${s.guest_lunch}`)
            if (s.guest_dinner > 0) parts.push(`D:${s.guest_dinner}`)
        }
        return parts.join(' ') || '0'
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Meal Submissions</h1>
                <p className="text-muted-foreground mt-1">Review self-service meal logs submitted by members.</p>
            </div>
            
            <div className="flex items-center gap-4 text-sm font-medium">
                <div className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {pending.length} Pending
                </div>
                <div className="text-muted-foreground">
                    {reviewed.length} Reviewed (Recent)
                </div>
            </div>

            <div className="grid gap-6">
                <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Needs Review
                    </h2>
                    
                    {pending.length === 0 ? (
                        <div className="p-8 text-center rounded-xl border bg-card text-muted-foreground">
                            No pending submissions.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {pending.map(s => (
                                <div key={s.id} className="p-4 rounded-xl border bg-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{s.member_name}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{s.date}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                            <div className="px-2 py-0.5 rounded bg-muted/50 border">
                                                <span className="text-muted-foreground mr-1">Reg:</span>
                                                <span className="font-medium">{formatSlots(s, 'regular')}</span>
                                            </div>
                                            {s.guest_meals > 0 && (
                                                <div className="px-2 py-0.5 rounded bg-muted/50 border">
                                                    <span className="text-muted-foreground mr-1">Guest:</span>
                                                    <span className="font-medium">{formatSlots(s, 'guest')}</span>
                                                </div>
                                            )}
                                        </div>
                                        {s.note && (
                                            <p className="text-xs text-muted-foreground italic mt-2">Note: &quot;{s.note}&quot;</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAction(s, 'reject')}
                                            disabled={isActioning === s.id}
                                            className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 border rounded-lg text-sm font-medium hover:bg-red-50 text-red-600 border-red-200 transition-colors disabled:opacity-50"
                                        >
                                            {isActioning === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1.5" />}
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction(s, 'approve')}
                                            disabled={isActioning === s.id}
                                            className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                        >
                                            {isActioning === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
                
                <section>
                    <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Recently Reviewed</h2>
                    <div className="grid gap-2">
                        {reviewed.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No recent history.</p>
                        ) : (
                            reviewed.map(s => (
                                <div key={s.id} className="p-3 rounded-lg border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        {s.status === 'approved' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                        )}
                                        <span className="font-medium w-24">{s.member_name}</span>
                                        <span className="text-muted-foreground font-mono text-xs w-24">{s.date}</span>
                                        <span className="text-muted-foreground text-xs">
                                            {s.regular_meals} reg, {s.guest_meals} guest
                                        </span>
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${s.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                                        {s.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
