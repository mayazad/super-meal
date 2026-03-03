'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAdmin } from '@/hooks/use-admin'
import { Archive, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { SkeletonPage } from '@/components/ui/skeleton'
import { PageError } from '@/components/ui/page-error'

type SettlementMember = {
    name: string
    totalMeals: number
    totalDeposits: number
    mealCost: number
    netBalance: number
}

type MonthlyArchive = {
    id: string
    month_year: string
    month_label: string
    total_grocery: number
    total_meals: number
    meal_rate: number
    total_deposits: number
    cash_on_hand: number
    settlement_data: SettlementMember[]
    created_at: string
}

export default function HistoryPage() {
    const { adminId } = useAdmin()
    const supabase = createClient()

    const [archives, setArchives] = useState<MonthlyArchive[]>([])
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchArchives = useCallback(async () => {
        if (!adminId) return
        setIsLoading(true)
        setError(null)
        try {
            const { data, error: fetchError } = await supabase
                .from('monthly_archives')
                .select('*')
                .eq('admin_id', adminId)
                .order('created_at', { ascending: false })
            if (fetchError) throw fetchError
            setArchives(data || [])
        } catch {
            setError('Failed to load archive history.')
        } finally {
            setIsLoading(false)
        }
    }, [adminId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchArchives() }, [fetchArchives])

    if (error) return <PageError message={error} onRetry={fetchArchives} />
    if (isLoading) return <SkeletonPage cards={2} rows={4} />

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Month History</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Archived monthly settlements — permanent records after Close Month.
                </p>
            </div>

            {archives.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No archived months yet.</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">
                        Use &quot;Close Month &amp; Settle&quot; at the end of a month to create your first archive.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {archives.map(archive => {
                        const isOpen = expandedId === archive.id
                        const members: SettlementMember[] = archive.settlement_data || []
                        return (
                            <div key={archive.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                {/* Month header — clickable */}
                                <button
                                    onClick={() => setExpandedId(isOpen ? null : archive.id)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <Archive className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-base">{archive.month_label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {members.length} members · Meal Rate: {Number(archive.meal_rate).toFixed(2)} Tk · Cash on Hand: <span className={Number(archive.cash_on_hand) >= 0 ? 'text-emerald-600' : 'text-red-500'}>{Number(archive.cash_on_hand).toFixed(2)} Tk</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="hidden sm:flex gap-4 text-xs text-muted-foreground">
                                            <span>{archive.total_meals} meals</span>
                                            <span>{Number(archive.total_grocery).toFixed(0)} Tk groceries</span>
                                            <span>{Number(archive.total_deposits).toFixed(0)} Tk deposits</span>
                                        </div>
                                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                </button>

                                {/* Expanded settlement table */}
                                {isOpen && (
                                    <div className="border-t">
                                        {/* Desktop table */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-5 py-3 text-left font-semibold">Member</th>
                                                        <th className="px-5 py-3 text-right font-semibold">Meals</th>
                                                        <th className="px-5 py-3 text-right font-semibold">Meal Cost</th>
                                                        <th className="px-5 py-3 text-right font-semibold">Deposits</th>
                                                        <th className="px-5 py-3 text-right font-semibold">Net Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {members.map((m, i) => (
                                                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                                                            <td className="px-5 py-3 font-semibold">{m.name}</td>
                                                            <td className="px-5 py-3 text-right text-muted-foreground">{m.totalMeals}</td>
                                                            <td className="px-5 py-3 text-right text-muted-foreground">{Number(m.mealCost).toFixed(2)}</td>
                                                            <td className="px-5 py-3 text-right text-muted-foreground">{Number(m.totalDeposits).toFixed(2)}</td>
                                                            <td className="px-5 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <span className={`font-bold ${m.netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                        {m.netBalance >= 0 ? '+' : ''}{Number(m.netBalance).toFixed(2)} Tk
                                                                    </span>
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${m.netBalance >= 0
                                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700'
                                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                                                                        {m.netBalance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                                        {m.netBalance >= 0 ? 'Refund Due' : 'Amount Owed'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-muted/50 border-t-2 text-xs font-semibold text-muted-foreground">
                                                    <tr>
                                                        <td className="px-5 py-3">Totals</td>
                                                        <td className="px-5 py-3 text-right">{archive.total_meals}</td>
                                                        <td className="px-5 py-3 text-right">{Number(archive.total_grocery).toFixed(2)}</td>
                                                        <td className="px-5 py-3 text-right">{Number(archive.total_deposits).toFixed(2)}</td>
                                                        <td className="px-5 py-3 text-right">
                                                            <span className={Number(archive.cash_on_hand) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                                                {Number(archive.cash_on_hand) >= 0 ? '+' : ''}{Number(archive.cash_on_hand).toFixed(2)} Tk on hand
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        {/* Mobile cards */}
                                        <div className="sm:hidden p-4 space-y-3">
                                            {members.map((m, i) => (
                                                <div key={i} className="rounded-xl border bg-background p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-bold">{m.name}</p>
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${m.netBalance >= 0
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-red-100 text-red-600'}`}>
                                                            {m.netBalance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                            {m.netBalance >= 0 ? 'Refund Due' : 'Amount Owed'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                        <div className="bg-muted/50 rounded-lg p-2">
                                                            <p className="text-[10px] text-muted-foreground uppercase">Meals</p>
                                                            <p className="font-bold text-sm">{m.totalMeals}</p>
                                                        </div>
                                                        <div className="bg-muted/50 rounded-lg p-2">
                                                            <p className="text-[10px] text-muted-foreground uppercase">Cost</p>
                                                            <p className="font-bold text-sm">{Number(m.mealCost).toFixed(0)} Tk</p>
                                                        </div>
                                                        <div className="bg-muted/50 rounded-lg p-2">
                                                            <p className="text-[10px] text-muted-foreground uppercase">Deposit</p>
                                                            <p className="font-bold text-sm">{Number(m.totalDeposits).toFixed(0)} Tk</p>
                                                        </div>
                                                    </div>
                                                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${m.netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                                        <span className="text-xs text-muted-foreground">Net Balance</span>
                                                        <span className={`font-black text-lg ${m.netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {m.netBalance >= 0 ? '+' : ''}{Number(m.netBalance).toFixed(2)} Tk
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Cash on hand */}
                                            <div className={`rounded-xl border p-4 text-center ${Number(archive.cash_on_hand) >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'}`}>
                                                <p className="text-xs text-muted-foreground uppercase font-semibold">Cash on Hand</p>
                                                <p className={`text-2xl font-black mt-1 ${Number(archive.cash_on_hand) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {Number(archive.cash_on_hand).toFixed(2)} Tk
                                                </p>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="px-5 py-3 bg-muted/20 border-t text-[11px] text-muted-foreground/60 flex items-center justify-between">
                                            <span>Meal Rate: {Number(archive.meal_rate).toFixed(4)} Tk/meal</span>
                                            <span>Archived {new Date(archive.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
