'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Loader2, CheckCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

type Member = { id: string; name: string }

export default function GrocerySubmitForm({
    adminId,
    members,
    currentMonth,
    isLocked,
}: {
    adminId: string
    members: Member[]
    currentMonth: string
    isLocked: boolean
}) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [itemName, setItemName] = useState('')
    const [cost, setCost] = useState('')
    const [memberName, setMemberName] = useState(members[0]?.name ?? '')
    const [note, setNote] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!itemName.trim() || !cost || isNaN(Number(cost)) || Number(cost) <= 0) {
            setError('Please fill all fields with valid values.')
            return
        }
        setIsLoading(true)
        setError(null)

        const { error: insertErr } = await supabase
            .from('grocery_submissions')
            .insert([{
                admin_id: adminId,
                member_name: memberName,
                date,
                item_name: itemName.trim(),
                cost: Number(cost),
                note: note.trim() || null,
                status: 'pending',
            }])

        if (insertErr) {
            setError('Could not submit. Please try again.')
            setIsLoading(false)
            return
        }

        setSuccess(true)
        setItemName('')
        setCost('')
        setNote('')
        setIsLoading(false)
        setTimeout(() => { setSuccess(false); setOpen(false) }, 2500)
    }

    if (isLocked) return null

    return (
        <div className="mt-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 overflow-hidden">
            {/* Header toggle */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">Submit a Grocery</p>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Bought something for the mess? Log it for admin approval.</p>
                    </div>
                </div>
                {open
                    ? <ChevronUp className="h-4 w-4 text-emerald-600 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-emerald-600 shrink-0" />
                }
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 border-t border-emerald-200 dark:border-emerald-800/40 pt-4">
                            {success ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center gap-2 py-6 text-center"
                                >
                                    <CheckCircle className="h-10 w-10 text-emerald-500" />
                                    <p className="font-bold text-emerald-800 dark:text-emerald-300">Submitted!</p>
                                    <p className="text-sm text-emerald-600/70">The admin will review and approve your submission.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    {/* Member name */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Your Name</label>
                                        <select
                                            value={memberName}
                                            onChange={e => setMemberName(e.target.value)}
                                            required
                                            className="flex h-10 w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        >
                                            {members.map(m => (
                                                <option key={m.id} value={m.name}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Date */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={date}
                                                onChange={e => setDate(e.target.value)}
                                                className="flex h-10 w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                            />
                                        </div>
                                        {/* Cost */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Cost (Tk)</label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={cost}
                                                onChange={e => setCost(e.target.value)}
                                                className="flex h-10 w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Item */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Item / Description</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Weekly Bazaar, Eggs, Oil"
                                            value={itemName}
                                            onChange={e => setItemName(e.target.value)}
                                            className="flex h-10 w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        />
                                    </div>

                                    {/* Note (optional) */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Note <span className="font-normal opacity-60">(optional)</span></label>
                                        <input
                                            type="text"
                                            placeholder="Any extra detail..."
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            className="flex h-10 w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        />
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : 'Submit for Approval'}
                                    </button>
                                    <p className="text-center text-[11px] text-emerald-600/60">
                                        ✓ Admin will review before it counts toward the ledger
                                    </p>
                                </form>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
