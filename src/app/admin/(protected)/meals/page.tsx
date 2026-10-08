'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAdmin } from '@/hooks/use-admin'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Save, User as UserIcon, Minus, Plus, BookOpen } from 'lucide-react'
import { SkeletonRow } from '@/components/ui/skeleton'
import { PageError } from '@/components/ui/page-error'

type Member = { id: string; name: string }

type LedgerRow = {
    id: string
    date: string
    member_id: string
    breakfast: number
    lunch: number
    dinner: number
    guest_breakfast: number
    guest_lunch: number
    guest_dinner: number
    regular_meals: number
    guest_meals: number
    created_at: string
}

type MealSlots = {
    breakfast: number
    lunch: number
    dinner: number
    guest_breakfast: number
    guest_lunch: number
    guest_dinner: number
}

export default function MealsPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [meals, setMeals] = useState<Record<string, MealSlots>>({})
    const [ledger, setLedger] = useState<LedgerRow[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingLedger, setIsLoadingLedger] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [breakfastEnabled, setBreakfastEnabled] = useState(false)

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const [dateFilter, setDateFilter] = useState(today)

    // month_year derived from dateFilter — drives both Save and the history table
    const monthYear = dateFilter.substring(0, 7)

    const { adminId } = useAdmin()

    // ── Fetch members + counters for the selected date ──────────────────────────
    const fetchData = useCallback(async () => {
        if (!adminId) return
        setIsLoading(true)
        setError(null)
        try {
            const [
                { data: membersData }, 
                { data: mealsData }, 
                { data: lockedData },
                { data: profileData }
            ] = await Promise.all([
                supabase.from('members').select('id, name').eq('is_active', true).eq('admin_id', adminId).order('name'),
                supabase.from('daily_meals')
                    .select('member_id, breakfast, lunch, dinner, guest_breakfast, guest_lunch, guest_dinner')
                    .eq('date', dateFilter)
                    .eq('admin_id', adminId),
                supabase.from('locked_months').select('id').eq('month_year', monthYear).eq('admin_id', adminId),
                supabase.from('profiles').select('breakfast_enabled').eq('id', adminId).single()
            ])
            
            const mems = membersData || []
            setMembers(mems)
            setIsLocked((lockedData?.length ?? 0) > 0)
            setBreakfastEnabled(profileData?.breakfast_enabled || false)
            
            const mealMap: Record<string, MealSlots> = {}
            mems.forEach(m => {
                const rec = mealsData?.find(r => r.member_id === m.id)
                mealMap[m.id] = rec ? { 
                    breakfast: rec.breakfast,
                    lunch: rec.lunch,
                    dinner: rec.dinner,
                    guest_breakfast: rec.guest_breakfast,
                    guest_lunch: rec.guest_lunch,
                    guest_dinner: rec.guest_dinner
                } : { 
                    breakfast: 0, lunch: 0, dinner: 0, 
                    guest_breakfast: 0, guest_lunch: 0, guest_dinner: 0 
                }
            })
            setMeals(mealMap)
        } catch {
            setError('Failed to load meal data.')
        } finally {
            setIsLoading(false)
        }
    }, [dateFilter, adminId]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Fetch monthly history for the ledger table ───────────────────────────────
    const fetchLedger = useCallback(async () => {
        if (!adminId) return
        setIsLoadingLedger(true)
        const { data } = await supabase
            .from('daily_meals')
            .select('id, date, member_id, breakfast, lunch, dinner, guest_breakfast, guest_lunch, guest_dinner, regular_meals, guest_meals, created_at')
            .eq('month_year', monthYear)
            .eq('admin_id', adminId)
            .order('date', { ascending: false })
        setLedger(data || [])
        setIsLoadingLedger(false)
    }, [monthYear, adminId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { fetchLedger() }, [fetchLedger])

    // ── Supabase Realtime — update history table without page refresh ─────────────
    useEffect(() => {
        if (!adminId) return
        const channel = supabase
            .channel('daily_meals_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_meals', filter: `admin_id=eq.${adminId}` }, () => {
                fetchLedger()
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [fetchLedger]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleMealChange = (memberId: string, type: keyof MealSlots, inc: number) => {
        if (isLocked) return
        const cur = meals[memberId] || { breakfast: 0, lunch: 0, dinner: 0, guest_breakfast: 0, guest_lunch: 0, guest_dinner: 0 }
        setMeals({ ...meals, [memberId]: { ...cur, [type]: Math.max(0, cur[type] + inc) } })
    }

    // ── Save — upsert so corrections are always possible ─────────────────────────
    const handleSaveAll = async () => {
        if (!adminId || isLocked) return
        setIsSubmitting(true)
        const payload = members.map(m => {
            const slots = meals[m.id] || { breakfast: 0, lunch: 0, dinner: 0, guest_breakfast: 0, guest_lunch: 0, guest_dinner: 0 }
            const regular = slots.breakfast + slots.lunch + slots.dinner
            const guest = slots.guest_breakfast + slots.guest_lunch + slots.guest_dinner
            return {
                member_id: m.id,
                date: dateFilter,
                month_year: monthYear,
                admin_id: adminId,
                ...slots,
                regular_meals: regular,
                guest_meals: guest,
            }
        })

        const { error } = await supabase
            .from('daily_meals')
            .upsert(payload, { onConflict: 'member_id,date' })

        if (error) {
            console.error(error)
            alert('Failed to save. Try again.')
        } else {
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2500)
            // Ledger will auto-refresh via Realtime, but also fetch immediately
            fetchLedger()
        }
        setIsSubmitting(false)
    }

    const getMemberName = (id: string) => members.find(m => m.id === id)?.name ?? '—'
    
    // Totals for the page
    const totalMealsToday = Object.values(meals).reduce((s, c) => 
        s + c.breakfast + c.lunch + c.dinner + c.guest_breakfast + c.guest_lunch + c.guest_dinner, 0
    )

    const ledgerTotalRegular = ledger.reduce((s, r) => s + r.regular_meals, 0)
    const ledgerTotalGuest = ledger.reduce((s, r) => s + r.guest_meals, 0)
    const ledgerTotalBreakfast = ledger.reduce((s, r) => s + r.breakfast, 0)
    const ledgerTotalLunch = ledger.reduce((s, r) => s + r.lunch, 0)
    const ledgerTotalDinner = ledger.reduce((s, r) => s + r.dinner, 0)
    const ledgerTotalGuestBreakfast = ledger.reduce((s, r) => s + r.guest_breakfast, 0)
    const ledgerTotalGuestLunch = ledger.reduce((s, r) => s + r.guest_lunch, 0)
    const ledgerTotalGuestDinner = ledger.reduce((s, r) => s + r.guest_dinner, 0)

    const baseFields = [
        { key: 'lunch', label: 'Lunch' },
        { key: 'dinner', label: 'Dinner' }
    ] as const
    const guestFields = [
        { key: 'guest_lunch', label: 'Guest L.' },
        { key: 'guest_dinner', label: 'Guest D.' }
    ] as const

    const renderCounter = (memberId: string, type: keyof MealSlots, label: string) => {
        const val = meals[memberId]?.[type] || 0;
        return (
            <div key={type} className="flex items-center justify-between border rounded-md p-1 bg-muted/10">
                <span className="text-xs font-medium w-16 text-center text-muted-foreground">{label}</span>
                <button
                    onClick={() => handleMealChange(memberId, type, -1)}
                    disabled={val === 0 || isLocked}
                    className="p-1 hover:bg-muted rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none min-w-[32px] min-h-[32px] flex items-center justify-center"
                >
                    <Minus className="h-4 w-4" />
                </button>
                <span className="text-base font-bold w-6 text-center">{val}</span>
                <button
                    onClick={() => handleMealChange(memberId, type, 1)}
                    disabled={isLocked}
                    className="p-1 hover:bg-muted rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-10 max-w-4xl">

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Daily Meals</h1>
                    <p className="text-muted-foreground mt-1">Log daily regular and guest meals per roommate.</p>
                </div>
                <div className="flex items-center border border-input rounded-md px-3 bg-background">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        onClick={(e) => {
                            try { e.currentTarget.showPicker() } catch (err) {}
                        }}
                        className="flex h-10 min-w-[160px] bg-transparent text-sm focus-visible:outline-none"
                    />
                </div>
            </div>

            {/* ── Meal Counters ────────────────────────────────────────────── */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="flex justify-between items-center bg-muted/50 p-4 border-b">
                    <span className="font-semibold">Meals on {dateFilter}</span>
                    <span className="text-xl font-bold">{totalMealsToday} total</span>
                </div>

                {isLocked && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-4 text-sm font-medium border border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
                        <BookOpen className="h-5 w-5 shrink-0" />
                        <span>This month ({monthYear}) has been locked for settlement. You cannot edit meals. Unlock it from the Dashboard if needed.</span>
                    </div>
                )}

                {error ? (
                    <PageError message={error} onRetry={fetchData} />
                ) : isLoading ? (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={3} />)}
                    </div>
                ) : members.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                        <UserIcon className="h-10 w-10 mb-2 opacity-20" />
                        No active members. Add members first.
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <AnimatePresence>
                                {members.map((member) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col space-y-3 p-4 border rounded-lg bg-background"
                                    >
                                        <div className="flex items-center gap-2 font-medium mb-1">
                                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                                            {member.name}
                                        </div>

                                        <div className="space-y-1.5">
                                            {breakfastEnabled && renderCounter(member.id, 'breakfast', 'Breakfast')}
                                            {baseFields.map(f => renderCounter(member.id, f.key, f.label))}
                                        </div>
                                        
                                        <div className="pt-2 border-t space-y-1.5">
                                            {breakfastEnabled && renderCounter(member.id, 'guest_breakfast', 'Guest B.')}
                                            {guestFields.map(f => renderCounter(member.id, f.key, f.label))}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Save row */}
                        <div className="mt-8 flex items-center justify-end gap-4">
                            <AnimatePresence>
                                {saveSuccess && (
                                    <motion.span
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="text-sm font-medium text-green-600"
                                    >
                                        ✓ Saved
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            <button
                                onClick={handleSaveAll}
                                disabled={isSubmitting || members.length === 0 || isLocked}
                                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-colors hover:bg-primary/90"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save All Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Monthly History Ledger ───────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight">Monthly History</h2>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground uppercase tracking-wide">
                            {monthYear}
                        </span>
                        <span className="text-xs bg-foreground text-background px-2 py-0.5 rounded-full font-medium">Live</span>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{ledger.length} records</p>
                </div>

                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    {isLoadingLedger ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : ledger.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <BookOpen className="h-8 w-8 opacity-20 mx-auto mb-2" />
                            <p className="text-sm">No meal records for {monthYear}.</p>
                            <p className="text-xs mt-1">Log meals above and save to build history.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b bg-muted/40">
                                    <tr>
                                        <th className="text-left p-3 pl-4 font-semibold">Date</th>
                                        <th className="text-left p-3 font-semibold">Member</th>
                                        {breakfastEnabled && <th className="text-center p-3 font-semibold text-muted-foreground">B</th>}
                                        <th className="text-center p-3 font-semibold text-muted-foreground">L</th>
                                        <th className="text-center p-3 font-semibold text-muted-foreground">D</th>
                                        <th className="text-center p-3 font-semibold border-l">Reg.</th>
                                        <th className="text-center p-3 font-semibold border-l text-muted-foreground">Guest</th>
                                        <th className="text-center p-3 pr-4 font-semibold border-l">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <AnimatePresence initial={false}>
                                        {ledger.map(row => (
                                            <motion.tr
                                                key={row.id}
                                                initial={{ opacity: 0, backgroundColor: 'oklch(0.9 0 0 / 0.12)' }}
                                                animate={{ opacity: 1, backgroundColor: 'oklch(0 0 0 / 0)' }}
                                                transition={{ duration: 0.6 }}
                                                className="hover:bg-muted/20 transition-colors"
                                            >
                                                <td className="p-3 pl-4 font-mono text-xs text-muted-foreground">{row.date}</td>
                                                <td className="p-3 font-medium">{getMemberName(row.member_id)}</td>
                                                {breakfastEnabled && <td className="p-3 text-center text-muted-foreground">{row.breakfast}</td>}
                                                <td className="p-3 text-center text-muted-foreground">{row.lunch}</td>
                                                <td className="p-3 text-center text-muted-foreground">{row.dinner}</td>
                                                
                                                <td className="p-3 text-center border-l bg-muted/5">{row.regular_meals}</td>
                                                <td className="p-3 text-center text-muted-foreground border-l bg-muted/5">{row.guest_meals}</td>
                                                <td className="p-3 pr-4 text-center font-semibold border-l bg-muted/10">
                                                    {row.regular_meals + row.guest_meals}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                                <tfoot className="border-t bg-muted/30">
                                    <tr>
                                        <td colSpan={2} className="p-3 pl-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                            Month Totals
                                        </td>
                                        {breakfastEnabled && <td className="p-3 text-center font-bold text-muted-foreground">{ledgerTotalBreakfast}</td>}
                                        <td className="p-3 text-center font-bold text-muted-foreground">{ledgerTotalLunch}</td>
                                        <td className="p-3 text-center font-bold text-muted-foreground">{ledgerTotalDinner}</td>
                                        <td className="p-3 text-center font-bold border-l">{ledgerTotalRegular}</td>
                                        <td className="p-3 text-center font-bold text-muted-foreground border-l">{ledgerTotalGuest}</td>
                                        <td className="p-3 pr-4 text-center font-bold border-l">{ledgerTotalRegular + ledgerTotalGuest}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={breakfastEnabled ? 8 : 7} className="px-4 pb-3 pt-1">
                                            <p className="text-[11px] text-muted-foreground/50 tracking-wide">
                                                Meal Ledger · SuperMeal · Crafted by <span className="font-mono font-semibold">MayazAD</span>
                                            </p>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}
