'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAdmin } from '@/hooks/use-admin'
import { motion, AnimatePresence } from 'framer-motion'
import { SkeletonPage } from '@/components/ui/skeleton'
import { PageError } from '@/components/ui/page-error'
import { ChevronLeft, ChevronRight, Lock, Unlock, ExternalLink, TrendingUp, Copy, Check, AlertTriangle, Palette, Archive, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type MonthStats = {
    month_year: string
    monthLabel: string
    totalMeals: number
    mealRate: number
    totalGroceries: number
    totalUtilities: number
    totalExpenses: number
    totalDeposits: number
    isLocked: boolean
}

type DebtorInfo = { name: string; owes: number }

function getMonthLabel(my: string) {
    return new Date(my + '-01T00:00:00').toLocaleString('default', { month: 'short', year: 'numeric' })
}

function getLast12Months(): string[] {
    const months: string[] = []
    const d = new Date()
    for (let i = 0; i < 12; i++) {
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        d.setMonth(d.getMonth() - 1)
    }
    return months
}

export default function AdminDashboardPage() {
    const supabase = createClient()
    const now = new Date()
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [selectedMonth, setSelectedMonth] = useState(currentMonthYear)
    const [stats, setStats] = useState<MonthStats | null>(null)
    const [yearlyData, setYearlyData] = useState<MonthStats[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isLocking, setIsLocking] = useState(false)
    const [showLockModal, setShowLockModal] = useState(false)
    const [membersCount, setMembersCount] = useState(0)
    const [userEmail, setUserEmail] = useState('')
    const [copiedDueList, setCopiedDueList] = useState(false)
    const [debtors, setDebtors] = useState<DebtorInfo[]>([])
    const [activeTheme, setActiveThemeState] = useState<'classic' | 'emerald'>('classic')
    const [isSavingTheme, setIsSavingTheme] = useState(false)
    const [broadcastMsg, setBroadcastMsg] = useState('')
    const [messSlug, setMessSlug] = useState('')
    const [showCloseModal, setShowCloseModal] = useState(false)
    const [isClosingMonth, setIsClosingMonth] = useState(false)
    const [closeSuccess, setCloseSuccess] = useState(false)

    // Show Close Month only in last 7 days of the current calendar month
    const todayDate = now.getDate()
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const isEndOfMonth = selectedMonth === currentMonthYear && todayDate >= lastDayOfMonth - 6

    const months12 = getLast12Months()

    const { adminId, adminEmail, isAuthLoading } = useAdmin()
    const router = useRouter()

    const fetchStats = useCallback(async (monthYear: string, currentAdminId: string): Promise<MonthStats> => {
        const [
            { data: meals },
            { data: groceries },
            { data: utilities },
            { data: mealDeps },
            { data: utilDeps },
            { data: locked },
        ] = await Promise.all([
            supabase.from('daily_meals').select('regular_meals, guest_meals').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('groceries').select('cost').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('utilities').select('cost').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('meal_deposits').select('amount').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('utility_deposits').select('amount').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('locked_months').select('id').eq('month_year', monthYear).eq('admin_id', currentAdminId),
        ])

        const totalMeals = (meals || []).reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)
        const totalGroceries = (groceries || []).reduce((s, r) => s + Number(r.cost), 0)
        const totalUtilities = (utilities || []).reduce((s, r) => s + Number(r.cost), 0)
        const mealDepsTotal = (mealDeps || []).reduce((s, r) => s + Number(r.amount), 0)
        const utilDepsTotal = (utilDeps || []).reduce((s, r) => s + Number(r.amount), 0)

        return {
            month_year: monthYear,
            monthLabel: getMonthLabel(monthYear),
            totalMeals,
            mealRate: totalMeals > 0 ? totalGroceries / totalMeals : 0,
            totalGroceries,
            totalUtilities,
            totalExpenses: totalGroceries + totalUtilities,
            totalDeposits: mealDepsTotal + utilDepsTotal,
            isLocked: (locked?.length ?? 0) > 0,
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch per-member balances for the Copy Due List
    const fetchDebtors = useCallback(async (monthYear: string, currentAdminId: string) => {
        const [
            { data: activeMembers },
            { data: dailyMeals },
            { data: groceries },
            { data: utilities },
            { data: mealDeposits },
            { data: utilityDeposits },
        ] = await Promise.all([
            supabase.from('members').select('id, name').eq('is_active', true).eq('admin_id', currentAdminId).order('name'),
            supabase.from('daily_meals').select('member_id, regular_meals, guest_meals').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('groceries').select('cost').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('utilities').select('cost').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('meal_deposits').select('amount, member_id').eq('month_year', monthYear).eq('admin_id', currentAdminId),
            supabase.from('utility_deposits').select('amount, member_id').eq('month_year', monthYear).eq('admin_id', currentAdminId),
        ])

        const totalGroceryCost = (groceries || []).reduce((s, r) => s + Number(r.cost), 0)
        const totalUtilityCost = (utilities || []).reduce((s, r) => s + Number(r.cost), 0)
        const totalMeals = (dailyMeals || []).reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)
        const mealRate = totalMeals > 0 ? totalGroceryCost / totalMeals : 0
        const utilPerPerson = (activeMembers?.length ?? 0) > 0 ? totalUtilityCost / (activeMembers?.length ?? 1) : 0

        const result: DebtorInfo[] = (activeMembers || []).map(m => {
            const meals = (dailyMeals || []).filter(r => r.member_id === m.id)
                .reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)
            const mealDep = (mealDeposits || []).filter(d => d.member_id === m.id)
                .reduce((s, d) => s + Number(d.amount), 0)
            const utilDep = (utilityDeposits || []).filter(d => d.member_id === m.id)
                .reduce((s, d) => s + Number(d.amount), 0)
            const balance = (mealDep - meals * mealRate) + (utilDep - utilPerPerson)
            return { name: m.name, owes: balance }
        }).filter(d => d.owes < -0.01).sort((a, b) => a.owes - b.owes)

        setDebtors(result)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const loadAll = useCallback(async () => {
        if (!adminId) return
        setIsLoading(true)
        setError(null)
        try {
            const [{ count }, selectedStats, ...rest] = await Promise.all([
                supabase.from('members').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('admin_id', adminId),
                fetchStats(selectedMonth, adminId),
                ...months12.slice(1).map(m => fetchStats(m, adminId)),
            ])
            setMembersCount(count || 0)
            setUserEmail(adminEmail ?? '')
            setStats(selectedStats)
            const allStats = [selectedStats, ...rest as MonthStats[]]
            setYearlyData([...allStats].reverse())

            const { data: globalSettingsData } = await supabase.from('app_settings').select('broadcast_message').eq('id', 'global_config').single()
            if (globalSettingsData) {
                if (globalSettingsData.broadcast_message) setBroadcastMsg(globalSettingsData.broadcast_message)
            }

            // Load this admin's personal theme and mess_slug from their profile
            const { data: profileData } = await supabase.from('profiles').select('selected_theme, mess_slug').eq('id', adminId).single()
            if (profileData?.selected_theme) {
                setActiveThemeState(profileData.selected_theme as 'classic' | 'emerald')
            }
            if (profileData?.mess_slug) setMessSlug(profileData.mess_slug)
            fetchDebtors(selectedMonth, adminId)
        } catch {
            setError('Could not load dashboard data. Check your connection and try again.')
        } finally {
            setIsLoading(false)
        }
    }, [selectedMonth, adminId, adminEmail]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadAll() }, [loadAll])

    const confirmLock = async () => {
        if (!adminId) return
        setIsLocking(true)
        setShowLockModal(false)
        await supabase.from('locked_months').insert([{ month_year: selectedMonth, locked_by: userEmail, admin_id: adminId }])
        const updated = await fetchStats(selectedMonth, adminId)
        setStats(updated)
        setIsLocking(false)
    }

    const handleUnlock = async () => {
        if (!adminId) return
        setIsLocking(true)
        await supabase.from('locked_months').delete().eq('month_year', selectedMonth).eq('admin_id', adminId)
        const updated = await fetchStats(selectedMonth, adminId)
        setStats(updated)
        setIsLocking(false)
    }

    const handleSetTheme = async (theme: 'classic' | 'emerald') => {
        if (!adminId) return
        setIsSavingTheme(true)
        setActiveThemeState(theme)
        // Apply locally immediately (optimistic)
        document.documentElement.setAttribute('data-theme', theme)
        // Save to this admin's own profile row (per-admin, not global)
        await supabase.from('profiles').update({ selected_theme: theme }).eq('id', adminId)
        setIsSavingTheme(false)
    }

    const handleCopyDueList = () => {
        if (debtors.length === 0) return
        const lines = debtors.map(d =>
            `⚠️ SuperMeal Payment Reminder: ${d.name} owes ${Math.abs(d.owes).toFixed(2)} Tk. Please settle your dues!`
        ).join('\n')
        const text = `--- ${stats?.monthLabel ?? ''} Due List ---\n${lines}\n---\nGenerated by SuperMeal | MayazAD`
        navigator.clipboard.writeText(text)
        setCopiedDueList(true)
        setTimeout(() => setCopiedDueList(false), 2500)
    }

    const navigate = (dir: -1 | 1) => {
        const d = new Date(selectedMonth + '-01T00:00:00')
        d.setMonth(d.getMonth() + dir)
        setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const handleCloseMonth = async () => {
        if (!adminId) return
        setIsClosingMonth(true)
        try {
            // 1. Gather all data needed for the archive snapshot
            const [
                { data: members },
                { data: groceries },
                { data: dailyMeals },
                { data: mealDeposits },
                { data: profileData },
            ] = await Promise.all([
                supabase.from('members').select('id, name').eq('is_active', true).eq('admin_id', adminId).order('name'),
                supabase.from('groceries').select('cost').eq('month_year', selectedMonth).eq('admin_id', adminId),
                supabase.from('daily_meals').select('member_id, regular_meals, guest_meals').eq('month_year', selectedMonth).eq('admin_id', adminId),
                supabase.from('meal_deposits').select('member_id, amount').eq('month_year', selectedMonth).eq('admin_id', adminId),
                supabase.from('profiles').select('mess_slug').eq('id', adminId).single(),
            ])

            // 2. Calculate final settlement
            const groceryTotal = (groceries || []).reduce((s, r) => s + Number(r.cost), 0)
            const mealsTotal = (dailyMeals || []).reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)
            const rate = mealsTotal > 0 ? groceryTotal / mealsTotal : 0
            const depositsTotal = (mealDeposits || []).reduce((s, d) => s + Number(d.amount), 0)

            const settlementData = (members || []).map(member => {
                const memberMeals = (dailyMeals || []).filter(r => r.member_id === member.id).reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)
                const memberDeposits = (mealDeposits || []).filter(d => d.member_id === member.id).reduce((s, d) => s + Number(d.amount), 0)
                const mealCost = memberMeals * rate
                return { name: member.name, totalMeals: memberMeals, totalDeposits: memberDeposits, mealCost, netBalance: memberDeposits - mealCost }
            })

            const monthLong = new Date(selectedMonth + '-01T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })

            // 3. Insert archive row
            const { error: insertError } = await supabase.from('monthly_archives').insert([{
                admin_id: adminId,
                mess_slug: profileData?.mess_slug ?? '',
                month_year: selectedMonth,
                month_label: monthLong,
                total_grocery: groceryTotal,
                total_meals: mealsTotal,
                meal_rate: rate,
                total_deposits: depositsTotal,
                cash_on_hand: depositsTotal - groceryTotal,
                settlement_data: settlementData,
            }])

            if (insertError) throw insertError

            // 4. Delete meal-side data for this month
            await Promise.all([
                supabase.from('daily_meals').delete().eq('month_year', selectedMonth).eq('admin_id', adminId),
                supabase.from('meal_deposits').delete().eq('month_year', selectedMonth).eq('admin_id', adminId),
                supabase.from('groceries').delete().eq('month_year', selectedMonth).eq('admin_id', adminId),
            ])

            setShowCloseModal(false)
            setCloseSuccess(true)
            setTimeout(() => router.push('/admin/history'), 1800)
        } catch (err) {
            console.error('Close month failed:', err)
            alert('Something went wrong archiving the month. Please try again.')
        } finally {
            setIsClosingMonth(false)
        }
    }

    const maxExpense = Math.max(...yearlyData.map(d => d.totalExpenses), 1)

    if (error) return <PageError message={error} onRetry={loadAll} />

    if (isLoading) return <SkeletonPage cards={4} rows={6} />

    return (
        <div className="space-y-8 max-w-5xl">

            {/* ── Lock Month Confirmation Modal ─────────────────────────── */}
            <AnimatePresence>
                {showLockModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                        onClick={() => setShowLockModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="rounded-2xl border bg-card shadow-xl p-6 max-w-sm w-full space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-muted">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                </div>
                                <h2 className="font-bold text-lg">Lock {stats?.monthLabel}?</h2>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Once locked, <strong>{stats?.monthLabel}</strong> data <strong>cannot be edited</strong>. Ensure all bazaar purchases, utility bills, and deposits are fully logged before proceeding.
                            </p>
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowLockModal(false)}
                                    className="flex-1 h-10 rounded-md border text-sm font-medium hover:bg-muted transition-colors">
                                    Cancel
                                </button>
                                <button onClick={confirmLock} disabled={isLocking}
                                    className="flex-1 h-10 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    Lock Month
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Close Month Modal ────────────────────────────────────── */}
            <AnimatePresence>
                {showCloseModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card border shadow-lg rounded-xl p-6 w-full max-w-md overflow-hidden relative">
                            <div className="flex items-center gap-3 text-red-500 mb-2">
                                <AlertTriangle className="h-6 w-6" />
                                <h3 className="text-xl font-bold">Close Month & Archive</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Are you sure you want to close <strong>{stats?.monthLabel}</strong>?
                            </p>
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-lg text-sm mb-6 space-y-2">
                                <p><strong>1. Archive:</strong> A permanent snapshot of all meal rates and member balances will be saved to History.</p>
                                <p><strong>2. Reset:</strong> All <u>meals</u>, <u>meal deposits</u>, and <u>groceries</u> for this month will be <strong>permanently deleted</strong> to reset the ledger.</p>
                                <p className="font-semibold pt-1">This action cannot be undone.</p>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                <button onClick={() => setShowCloseModal(false)} disabled={isClosingMonth || closeSuccess}
                                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors disabled:opacity-50">
                                    Cancel
                                </button>
                                <button onClick={handleCloseMonth} disabled={isClosingMonth || closeSuccess}
                                    className="px-4 py-2 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {isClosingMonth ? <><Loader2 className="h-4 w-4 animate-spin" /> Archiving...</> :
                                        closeSuccess ? <><Check className="h-4 w-4" /> Success!</> :
                                            'Yes, Close & Reset'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ── Header + Month Navigator ─────────────────────────────── */}
            {broadcastMsg && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/20 rounded-md">
                            <AlertTriangle className="h-5 w-5 fill-emerald-50 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/80 mb-0.5">Senpai Broadcast</p>
                            <p className="font-medium text-sm">{broadcastMsg}</p>
                        </div>
                    </div>
                </motion.div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                    <p className="text-muted-foreground mt-1">{stats?.monthLabel ?? '…'} · Archive Navigator</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="h-9 w-9 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors" title="Previous month">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                        className="h-9 rounded-lg border bg-background px-3 text-sm font-medium focus-visible:outline-none">
                        {months12.map(m => <option key={m} value={m}>{getMonthLabel(m)}</option>)}
                        {!months12.includes(selectedMonth) && <option value={selectedMonth}>{getMonthLabel(selectedMonth)}</option>}
                    </select>
                    <button onClick={() => navigate(1)} disabled={selectedMonth >= currentMonthYear}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none" title="Next month">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <a href={`/summary/${selectedMonth}`} target="_blank" rel="noreferrer"
                        className="h-9 px-3 flex items-center gap-1.5 rounded-lg border bg-background text-sm font-medium hover:bg-muted transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" /> View Report
                    </a>
                </div>
            </div>

            {/* ── Lock/Unlock Banner ───────────────────────────────────── */}
            {
                stats?.isLocked ? (
                    <div className="flex items-center justify-between rounded-xl border border-foreground/20 bg-muted/40 px-5 py-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Lock className="h-4 w-4" />
                            <span>{stats.monthLabel} is <strong>locked</strong> — read-only archive.</span>
                        </div>
                        <button onClick={handleUnlock} disabled={isLocking} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors disabled:opacity-50">
                            {isLocking ? 'Unlocking…' : 'Unlock'}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-foreground/20 px-5 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Unlock className="h-4 w-4" />
                            <span>{stats?.monthLabel} is open for editing.</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Copy Due List */}
                            {debtors.length > 0 && (
                                <button onClick={handleCopyDueList}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted transition-colors">
                                    {copiedDueList ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    {copiedDueList ? 'Copied!' : `Copy Due List (${debtors.length})`}
                                </button>
                            )}
                            <button onClick={() => setShowLockModal(true)} disabled={isLocking}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50">
                                <Lock className="h-3 w-3" />
                                {isLocking ? 'Locking…' : 'Lock Month'}
                            </button>
                            {/* Close Month Button (End of month only) */}
                            {isEndOfMonth && (
                                <button onClick={() => setShowCloseModal(true)} disabled={isClosingMonth}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 px-3 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40">
                                    <Archive className="h-3 w-3" />
                                    Close Month
                                </button>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ── Stat Cards ───────────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Active Members', value: membersCount.toString() },
                    { label: 'Total Meals', value: (stats?.totalMeals ?? 0).toString() },
                    { label: 'Meal Rate', value: `${(stats?.mealRate ?? 0).toFixed(2)} Tk` },
                    { label: 'Total Expenses', value: `${(stats?.totalExpenses ?? 0).toFixed(2)} Tk` },
                ].map(card => (
                    <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border bg-card shadow-sm p-6 flex flex-col gap-1">
                        <div className="text-sm font-medium text-muted-foreground">{card.label}</div>
                        <div className="text-2xl font-bold">{card.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* ── Breakdown + Quick Actions ─────────────────────────────── */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-card shadow-sm p-6 space-y-3">
                    <h3 className="font-semibold text-lg">Expenses — {stats?.monthLabel}</h3>
                    {[
                        { label: 'Total Groceries', value: stats?.totalGroceries ?? 0, negative: true },
                        { label: 'Total Utility Bills', value: stats?.totalUtilities ?? 0, negative: true },
                        { label: 'Total Deposits Collected', value: stats?.totalDeposits ?? 0, negative: false },
                    ].map(row => (
                        <div key={row.label} className="flex justify-between items-center py-2 border-b last:border-0">
                            <span className="text-sm text-muted-foreground">{row.label}</span>
                            <span className={`font-semibold text-sm ${row.negative ? 'text-red-500' : 'text-green-500'}`}>{row.value.toFixed(2)} Tk</span>
                        </div>
                    ))}
                </div>
                <div className="rounded-xl border bg-card shadow-sm p-6 space-y-3">
                    <h3 className="font-semibold text-lg">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: '+ Log Meals', href: '/admin/meals' },
                            { label: '+ Add Deposit', href: '/admin/meal-deposits' },
                            { label: '+ Grocery', href: '/admin/groceries' },
                            { label: '+ Utility Bill', href: '/admin/utilities' },
                            { label: 'Members', href: '/admin/members' },
                            { label: 'Settlement', href: '/admin/settlement' },
                        ].map(({ label, href }) => (
                            <a key={href} href={href}
                                className="flex items-center justify-center h-9 rounded-lg border text-xs font-semibold hover:bg-muted/60 transition-colors text-center px-2">
                                {label}
                            </a>
                        ))}
                    </div>
                    <a href={messSlug ? `/view/${messSlug}` : '#'} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-1">
                        <ExternalLink className="h-3.5 w-3.5" /> Open Public View →
                    </a>
                </div>
            </div>

            {/* ── Yearly Overview Chart ────────────────────────────────── */}
            <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Yearly Overview</h3>
                    <span className="text-xs text-muted-foreground">(Last 12 months)</span>
                </div>
                <div className="grid grid-cols-12 gap-1 items-end h-40">
                    {yearlyData.map(d => {
                        const barH = d.totalExpenses > 0 ? Math.max(8, (d.totalExpenses / maxExpense) * 100) : 4
                        const rateH = d.mealRate > 0
                            ? Math.max(4, (d.mealRate / Math.max(...yearlyData.map(x => x.mealRate), 1)) * 100) : 4
                        const isSelected = d.month_year === selectedMonth
                        return (
                            <button key={d.month_year} onClick={() => setSelectedMonth(d.month_year)}
                                className="flex flex-col items-center gap-1 group" title={`${d.monthLabel}: ${d.totalExpenses.toFixed(0)} Tk`}>
                                <div className="w-full flex flex-col justify-end h-32 gap-0.5">
                                    <div className="w-full rounded-t-sm bg-muted-foreground/20 transition-all" style={{ height: `${rateH}%` }} />
                                    <div className={`w-full rounded-t-sm transition-all ${isSelected ? 'bg-foreground' : 'bg-foreground/40 group-hover:bg-foreground/70'}`}
                                        style={{ height: `${barH}%` }} />
                                </div>
                                <span className={`text-[9px] font-medium truncate w-full text-center ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {d.monthLabel.slice(0, 3)}
                                </span>
                            </button>
                        )
                    })}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-foreground/40" /> Total Expenses</div>
                    <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-muted-foreground/20" /> Meal Rate</div>
                    <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-foreground" /> Selected</div>
                </div>
            </div>
            {/* ── Site Appearance ──────────────────────────────────────────── */}
            <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Site Appearance</h3>
                </div>
                <p className="text-sm text-muted-foreground">Choose a visual theme for all users. Changes apply instantly to all screens.</p>
                <div className="grid grid-cols-2 gap-4">
                    {/* Classic Black */}
                    <button
                        onClick={() => handleSetTheme('classic')}
                        disabled={isSavingTheme}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all ${activeTheme === 'classic' ? 'border-foreground' : 'border-border hover:border-foreground/40'
                            }`}
                    >
                        {/* Preview swatch */}
                        <div className="rounded-lg overflow-hidden mb-3 h-16 bg-black flex flex-col gap-1 p-2">
                            <div className="h-2 w-3/4 rounded bg-white/90" />
                            <div className="h-1.5 w-1/2 rounded bg-white/40" />
                            <div className="mt-auto h-2 w-full rounded bg-white/10" />
                        </div>
                        <p className="text-sm font-semibold">Classic Black</p>
                        <p className="text-xs text-muted-foreground mt-0.5">High-contrast black &amp; white</p>
                        {activeTheme === 'classic' && (
                            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                                <Check className="h-3 w-3" />
                            </span>
                        )}
                    </button>

                    {/* Emerald Forest */}
                    <button
                        onClick={() => handleSetTheme('emerald')}
                        disabled={isSavingTheme}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all ${activeTheme === 'emerald' ? 'border-emerald-500' : 'border-border hover:border-emerald-500/40'
                            }`}
                    >
                        {/* Preview swatch */}
                        <div className="rounded-lg overflow-hidden mb-3 h-16 flex flex-col gap-1 p-2" style={{ background: '#F7F9F7', border: '1px solid #D1E4D1' }}>
                            <div className="h-2 w-3/4 rounded" style={{ background: '#10b981' }} />
                            <div className="h-1.5 w-1/2 rounded" style={{ background: 'rgba(16,185,129,0.4)' }} />
                            <div className="mt-auto h-2 w-full rounded" style={{ background: '#EDF2ED' }} />
                        </div>
                        <p className="text-sm font-semibold" style={activeTheme === 'emerald' ? { color: '#10b981' } : {}}>Emerald Forest</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Deep green with emerald accents</p>
                        {activeTheme === 'emerald' && (
                            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: '#10b981' }}>
                                <Check className="h-3 w-3 text-black" />
                            </span>
                        )}
                    </button>
                </div>
                {isSavingTheme && <p className="text-xs text-muted-foreground">Applying theme to all screens…</p>}
            </div>

        </div >
    )
}
