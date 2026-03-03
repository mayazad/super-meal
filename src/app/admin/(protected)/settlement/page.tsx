'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAdmin } from '@/hooks/use-admin'
import { Calculator, Copy, Check, TrendingUp, TrendingDown, DollarSign, Utensils, Printer } from 'lucide-react'
import { SkeletonPage } from '@/components/ui/skeleton'
import { PageError } from '@/components/ui/page-error'

type MemberSettlement = {
    id: string
    name: string
    totalMeals: number
    totalDeposits: number
    mealCost: number
    netBalance: number // positive = refund due, negative = amount due
}

function getCurrentMonthFilter() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthYear: string) {
    const [year, month] = monthYear.split('-')
    return new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

export default function SettlementPage() {
    const { adminId } = useAdmin()
    const supabase = createClient()

    const [monthFilter, setMonthFilter] = useState(getCurrentMonthFilter())
    const [settlements, setSettlements] = useState<MemberSettlement[]>([])
    const [mealRate, setMealRate] = useState(0)
    const [totalGroceries, setTotalGroceries] = useState(0)
    const [totalMeals, setTotalMeals] = useState(0)
    const [totalDepositsGlobal, setTotalDepositsGlobal] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const fetchData = useCallback(async () => {
        if (!adminId) return
        setIsLoading(true)
        setError(null)
        try {
            const [
                { data: members },
                { data: groceries },
                { data: dailyMeals },
                { data: mealDeposits },
            ] = await Promise.all([
                supabase.from('members').select('id, name').eq('is_active', true).eq('admin_id', adminId).order('name'),
                supabase.from('groceries').select('cost').eq('month_year', monthFilter).eq('admin_id', adminId),
                supabase.from('daily_meals').select('member_id, regular_meals, guest_meals').eq('month_year', monthFilter).eq('admin_id', adminId),
                supabase.from('meal_deposits').select('member_id, amount').eq('month_year', monthFilter).eq('admin_id', adminId),
            ])

            const groceryTotal = (groceries || []).reduce((s, r) => s + Number(r.cost), 0)
            const mealsTotal = (dailyMeals || []).reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)
            const rate = mealsTotal > 0 ? groceryTotal / mealsTotal : 0

            setTotalGroceries(groceryTotal)
            setTotalMeals(mealsTotal)
            setMealRate(rate)

            const result: MemberSettlement[] = (members || []).map(member => {
                const memberMeals = (dailyMeals || [])
                    .filter(r => r.member_id === member.id)
                    .reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)

                const memberDeposits = (mealDeposits || [])
                    .filter(d => d.member_id === member.id)
                    .reduce((s, d) => s + Number(d.amount), 0)

                const mealCost = memberMeals * rate

                return {
                    id: member.id,
                    name: member.name,
                    totalMeals: memberMeals,
                    totalDeposits: memberDeposits,
                    mealCost,
                    netBalance: memberDeposits - mealCost,
                }
            })

            setSettlements(result)
            setTotalDepositsGlobal(result.reduce((s, m) => s + m.totalDeposits, 0))
        } catch {
            setError('Failed to load settlement data.')
        } finally {
            setIsLoading(false)
        }
    }, [adminId, monthFilter]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData() }, [fetchData])

    const cashOnHand = totalDepositsGlobal - totalGroceries

    const handleCopy = () => {
        const label = getMonthLabel(monthFilter)
        const lines = [
            `📊 Meal Settlement — ${label}`,
            `Meal Rate: ${mealRate.toFixed(2)} Tk/meal`,
            `Total Groceries: ${totalGroceries.toFixed(2)} Tk`,
            `Cash on Hand: ${cashOnHand.toFixed(2)} Tk`,
            ``,
            ...settlements.map(m => {
                const tag = m.netBalance >= 0 ? `✅ Refund: ${m.netBalance.toFixed(2)} Tk` : `⚠️ Due: ${Math.abs(m.netBalance).toFixed(2)} Tk`
                return `${m.name} (${m.totalMeals} meals) — ${tag}`
            })
        ]
        navigator.clipboard.writeText(lines.join('\n'))
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
    }

    if (error) return <PageError message={error} onRetry={fetchData} />
    if (isLoading) return <SkeletonPage cards={3} rows={5} />

    const hasData = settlements.length > 0 && totalMeals > 0

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Month-End Settlement</h1>
                    <p className="text-muted-foreground text-sm mt-1">Per-member meal balance for the selected month.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value)}
                        className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <button
                        onClick={handleCopy}
                        disabled={!hasData}
                        className="flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-40"
                    >
                        {copied ? <><Check className="h-4 w-4 text-green-500" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}
                    </button>
                    <button
                        onClick={() => window.print()}
                        disabled={!hasData}
                        className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-40"
                        title="Print settlement"
                    >
                        <Printer className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="text-primary mb-1"><Utensils className="h-4 w-4" /></div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Meal Rate</p>
                    <p className="text-xl font-bold mt-1">{mealRate.toFixed(2)}<span className="text-xs text-muted-foreground ml-1">Tk</span></p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="text-primary mb-1"><DollarSign className="h-4 w-4" /></div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Total Groceries</p>
                    <p className="text-xl font-bold mt-1">{totalGroceries.toFixed(0)}<span className="text-xs text-muted-foreground ml-1">Tk</span></p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="text-primary mb-1"><DollarSign className="h-4 w-4" /></div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Total Deposits</p>
                    <p className="text-xl font-bold mt-1">{totalDepositsGlobal.toFixed(0)}<span className="text-xs text-muted-foreground ml-1">Tk</span></p>
                </div>
                <div className={`rounded-xl border p-4 shadow-sm ${cashOnHand >= 0 ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50/60 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                    <div className={`mb-1 ${cashOnHand >= 0 ? 'text-emerald-600' : 'text-red-500'}`}><DollarSign className="h-4 w-4" /></div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cash on Hand</p>
                    <p className={`text-xl font-bold mt-1 ${cashOnHand >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {cashOnHand.toFixed(0)}<span className="text-xs ml-1">Tk</span>
                    </p>
                </div>
            </div>

            {!hasData ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <Calculator className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No data for {getMonthLabel(monthFilter)}.</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Log groceries and meals to see the settlement.</p>
                </div>
            ) : (
                <>
                    {/* ── Desktop Table ── */}
                    <div className="hidden sm:block rounded-xl border bg-card shadow-sm overflow-hidden">
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
                                {settlements.map(m => (
                                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-4 font-semibold">{m.name}</td>
                                        <td className="px-5 py-4 text-right text-muted-foreground">{m.totalMeals}</td>
                                        <td className="px-5 py-4 text-right text-muted-foreground">{m.mealCost.toFixed(2)}</td>
                                        <td className="px-5 py-4 text-right text-muted-foreground">{m.totalDeposits.toFixed(2)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`font-bold text-base ${m.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                    {m.netBalance >= 0 ? '+' : ''}{m.netBalance.toFixed(2)} Tk
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${m.netBalance >= 0
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {m.netBalance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                    {m.netBalance >= 0 ? 'Refund Due' : 'Amount Owed'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-muted/50 border-t-2 border-border text-xs font-semibold text-muted-foreground">
                                <tr>
                                    <td className="px-5 py-3">Totals</td>
                                    <td className="px-5 py-3 text-right">{totalMeals}</td>
                                    <td className="px-5 py-3 text-right">{totalGroceries.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right">{totalDepositsGlobal.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right">
                                        <span className={cashOnHand >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                            {cashOnHand >= 0 ? '+' : ''}{cashOnHand.toFixed(2)} Tk on hand
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* ── Mobile Cards ── */}
                    <div className="sm:hidden space-y-3">
                        {settlements.map(m => (
                            <div key={m.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-base">{m.name}</p>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${m.netBalance >= 0
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                        }`}>
                                        {m.netBalance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        {m.netBalance >= 0 ? 'Refund Due' : 'Amount Owed'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-muted/50 rounded-lg p-2">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meals</p>
                                        <p className="font-bold text-sm mt-0.5">{m.totalMeals}</p>
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-2">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meal Cost</p>
                                        <p className="font-bold text-sm mt-0.5">{m.mealCost.toFixed(0)} Tk</p>
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-2">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deposits</p>
                                        <p className="font-bold text-sm mt-0.5">{m.totalDeposits.toFixed(0)} Tk</p>
                                    </div>
                                </div>

                                <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${m.netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
                                    }`}>
                                    <span className="text-xs text-muted-foreground font-medium">Net Balance</span>
                                    <span className={`font-black text-lg ${m.netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {m.netBalance >= 0 ? '+' : ''}{m.netBalance.toFixed(2)} Tk
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Mobile Cash on Hand footer */}
                        <div className={`rounded-xl border p-4 text-center ${cashOnHand >= 0 ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200' : 'bg-red-50/60 border-red-200'}`}>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cash on Hand</p>
                            <p className={`text-2xl font-black mt-1 ${cashOnHand >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {cashOnHand.toFixed(2)} Tk
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">Total Deposits − Total Groceries</p>
                        </div>
                    </div>

                    {/* Meal rate note */}
                    <p className="text-xs text-muted-foreground/60 text-center">
                        Meal Rate = {totalGroceries.toFixed(2)} Tk ÷ {totalMeals} meals = <strong>{mealRate.toFixed(4)} Tk/meal</strong>
                    </p>
                </>
            )}
        </div>
    )
}
