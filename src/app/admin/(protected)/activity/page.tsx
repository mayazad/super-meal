'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAdmin } from '@/hooks/use-admin'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Landmark, ShoppingBag, Wallet, Zap, Calendar as CalendarIcon, Loader2 } from 'lucide-react'

// Unified Event Type for the Timeline
type TimelineEvent = {
    id: string
    type: 'meal_deposit' | 'utility_deposit' | 'grocery' | 'utility_payment'
    title: string
    description: string
    amount: number | null
    created_at: string
    date: string // The logical date of the transaction
    icon: React.ElementType
    colorClass: string
}

export default function ActivityLogsPage() {
    const [events, setEvents] = useState<TimelineEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()
    const { adminId } = useAdmin()

    // Filter state
    const currentMonthFilter = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const [monthFilter, setMonthFilter] = useState(currentMonthFilter)

    const fetchLogs = useCallback(async () => {
        if (!adminId) return
        setIsLoading(true)

        try {
            // Fetch all 4 streams of financial interactions for the selected month
            const [memRes, mealDepRes, utilDepRes, grocRes, utilRes, utilPayRes] = await Promise.all([
                supabase.from('members').select('id, name').eq('admin_id', adminId),
                supabase.from('meal_deposits').select('*').eq('month_year', monthFilter).eq('admin_id', adminId),
                supabase.from('utility_deposits').select('*').eq('month_year', monthFilter).eq('admin_id', adminId),
                supabase.from('groceries').select('*').eq('month_year', monthFilter).eq('admin_id', adminId),
                supabase.from('utilities').select('id, type').eq('month_year', monthFilter).eq('admin_id', adminId),
                supabase.from('utility_payments').select('*').eq('admin_id', adminId)
            ])

            const members = memRes.data || []
            const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown'
            const utilities = utilRes.data || []
            const getUtilName = (id: string) => utilities.find(u => u.id === id)?.type || 'Unknown Bill'

            const timeline: TimelineEvent[] = []

                // 1. Meal Deposits
                ; (mealDepRes.data || []).forEach(d => {
                    const noteStr = d.note ? ` (${d.note})` : ''
                    timeline.push({
                        id: `md-${d.id}`,
                        type: 'meal_deposit',
                        title: `Meal Deposit: ${getMemberName(d.member_id)}`,
                        description: `Deposited into meal fund${noteStr}.`,
                        amount: Number(d.amount),
                        created_at: d.created_at,
                        date: d.date,
                        icon: Wallet,
                        colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    })
                })

                // 2. Utility Deposits
                ; (utilDepRes.data || []).forEach(d => {
                    const noteStr = d.note ? ` (${d.note})` : ''
                    timeline.push({
                        id: `ud-${d.id}`,
                        type: 'utility_deposit',
                        title: `Utility Deposit: ${getMemberName(d.member_id)}`,
                        description: `Deposited into utility fund${noteStr}.`,
                        amount: Number(d.amount),
                        created_at: d.created_at,
                        date: d.date,
                        icon: Landmark,
                        colorClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    })
                })

                // 3. Groceries
                ; (grocRes.data || []).forEach(g => {
                    const purchaser = g.purchased_by ? getMemberName(g.purchased_by) : 'Manager'
                    timeline.push({
                        id: `groc-${g.id}`,
                        type: 'grocery',
                        title: `Bazaar: ${g.item_name}`,
                        description: `Purchased by ${purchaser}.`,
                        amount: Number(g.cost),
                        created_at: g.created_at,
                        date: g.date,
                        icon: ShoppingBag,
                        colorClass: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                    })
                })

            // 4. Utility Payments (Matrix Checks)
            // Filter utility payments to only those that match the current month's utility bills
            const currentMonthUtilIds = new Set(utilities.map(u => u.id))
                ; (utilPayRes.data || []).forEach(p => {
                    if (p.paid && currentMonthUtilIds.has(p.utility_id)) {
                        timeline.push({
                            id: `up-${p.id}`,
                            type: 'utility_payment',
                            title: `Cleared Bill: ${getMemberName(p.member_id)}`,
                            description: `Marked as paid for: ${getUtilName(p.utility_id)}.`,
                            amount: null, // we don't store exact fraction cost in the payment matrix row
                            created_at: p.created_at,
                            date: p.created_at.split('T')[0], // logical date is when it was checked
                            icon: Zap,
                            colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        })
                    }
                })

            // Sort purely by the exact timestamp of creation (newest first)
            timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            setEvents(timeline)

        } catch (error) {
            console.error('Failed to load activity logs', error)
        } finally {
            setIsLoading(false)
        }
    }, [adminId, monthFilter])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground mt-1">
                        Timeline of all financial activity and transactions.
                    </p>
                </div>
                <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background"
                />
            </div>

            <div className="border rounded-xl p-6 bg-card text-card-foreground shadow-sm">

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                        <Activity className="w-12 h-12 mb-4 opacity-20" />
                        <p>No financial activity recorded for this month.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-muted ml-4 space-y-8 pb-4">
                        <AnimatePresence>
                            {events.map((evt, idx) => {
                                const Icon = evt.icon
                                return (
                                    <motion.div
                                        key={evt.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="relative pl-8"
                                    >
                                        <div className={`absolute -left-[17px] top-1 rounded-full p-1.5 border-2 border-background ${evt.colorClass}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 bg-muted/30 p-4 rounded-lg border">
                                            <div>
                                                <h3 className="font-semibold">{evt.title}</h3>
                                                <p className="text-sm text-muted-foreground">{evt.description}</p>
                                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1 bg-background px-2 py-1 rounded border shadow-sm">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        Logged For: {new Date(evt.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="opacity-70">
                                                        System Entry: {new Date(evt.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {evt.amount !== null && (
                                                <div className="font-bold text-lg whitespace-nowrap bg-background px-3 py-1 rounded border shadow-sm h-fit">
                                                    {evt.amount.toFixed(2)} Tk
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    )
}
