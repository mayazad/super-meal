'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Utensils, Loader2, CheckCircle, ChevronDown, ChevronUp, AlertCircle, Minus, Plus } from 'lucide-react'

type Member = { id: string; name: string }

type MealSlots = {
    breakfast: number
    lunch: number
    dinner: number
    guest_breakfast: number
    guest_lunch: number
    guest_dinner: number
}

export default function MealSubmitForm({
    adminId,
    members,
    currentMonth,
    isLocked,
    breakfastEnabled = false
}: {
    adminId: string
    members: Member[]
    currentMonth: string
    isLocked: boolean
    breakfastEnabled?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [memberId, setMemberId] = useState(members[0]?.id ?? '')
    const [slots, setSlots] = useState<MealSlots>({ breakfast: 0, lunch: 0, dinner: 0, guest_breakfast: 0, guest_lunch: 0, guest_dinner: 0 })
    const [note, setNote] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    const handleMealChange = (type: keyof MealSlots, inc: number) => {
        setSlots(prev => ({ ...prev, [type]: Math.max(0, prev[type] + inc) }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const memberName = members.find(m => m.id === memberId)?.name
        if (!memberName) {
            setError('Please select a valid member.')
            return
        }

        const regular = slots.breakfast + slots.lunch + slots.dinner
        const guest = slots.guest_breakfast + slots.guest_lunch + slots.guest_dinner

        if (regular === 0 && guest === 0) {
            setError('Please log at least one meal.')
            return
        }

        setIsLoading(true)
        setError(null)

        // Check for duplicates
        const { data: existing } = await supabase
            .from('meal_submissions')
            .select('id')
            .eq('member_id', memberId)
            .eq('date', date)
            .eq('admin_id', adminId)
            .single()
        
        if (existing) {
            setError('You have already submitted a meal for this date. Please wait for admin review or contact the admin to update it.')
            setIsLoading(false)
            return
        }

        const { error: insertErr } = await supabase
            .from('meal_submissions')
            .insert([{
                admin_id: adminId,
                member_id: memberId,
                member_name: memberName,
                date,
                ...slots,
                regular_meals: regular,
                guest_meals: guest,
                note: note.trim() || null,
                status: 'pending',
            }])

        if (insertErr) {
            setError('Could not submit. Please try again.')
            setIsLoading(false)
            return
        }

        setSuccess(true)
        setSlots({ breakfast: 0, lunch: 0, dinner: 0, guest_breakfast: 0, guest_lunch: 0, guest_dinner: 0 })
        setNote('')
        setIsLoading(false)
        setTimeout(() => { setSuccess(false); setOpen(false) }, 2500)
    }

    if (isLocked) return null

    const inputCls = 'flex h-10 w-full rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors'

    const renderCounter = (type: keyof MealSlots, label: string) => (
        <div key={type} className="flex items-center justify-between border rounded-xl px-2 py-1.5 bg-background shadow-sm">
            <span className="text-sm font-medium w-16 text-muted-foreground">{label}</span>
            <button
                type="button"
                onClick={() => handleMealChange(type, -1)}
                disabled={slots[type] === 0}
                className="p-1 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center border bg-muted/30"
            >
                <Minus className="h-4 w-4" />
            </button>
            <span className="text-base font-bold w-6 text-center">{slots[type]}</span>
            <button
                type="button"
                onClick={() => handleMealChange(type, 1)}
                className="p-1 hover:bg-muted rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center border bg-muted/30"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    )

    const baseFields = [
        { key: 'lunch', label: 'Lunch' },
        { key: 'dinner', label: 'Dinner' }
    ] as const
    const guestFields = [
        { key: 'guest_lunch', label: 'Guest L.' },
        { key: 'guest_dinner', label: 'Guest D.' }
    ] as const

    return (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden mt-4">
            {/* Header toggle */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                        <Utensils className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-foreground">Log My Meal</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Admin not home? Log your meal here.</p>
                    </div>
                </div>
                {open
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
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
                        <div className="px-5 pb-5 border-t pt-4 space-y-5">
                            {success ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center gap-2 py-6 text-center"
                                >
                                    <CheckCircle className="h-10 w-10 text-orange-500" />
                                    <p className="font-bold text-foreground">Meal Logged!</p>
                                    <p className="text-sm text-muted-foreground">The admin will review and approve your submission.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Member name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Name</label>
                                            <select
                                                value={memberId}
                                                onChange={e => setMemberId(e.target.value)}
                                                required
                                                className={inputCls}
                                            >
                                                {members.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Date */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={date}
                                                onChange={e => setDate(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>

                                    {/* Counters */}
                                    <div className="bg-muted/30 p-3 rounded-xl border space-y-3">
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {breakfastEnabled && renderCounter('breakfast', 'Breakfast')}
                                            {baseFields.map(f => renderCounter(f.key, f.label))}
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2 pt-3 border-t">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider col-span-full">Guest Meals</p>
                                            {breakfastEnabled && renderCounter('guest_breakfast', 'Guest B.')}
                                            {guestFields.map(f => renderCounter(f.key, f.label))}
                                        </div>
                                    </div>

                                    {/* Note (optional) */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Note <span className="font-normal normal-case opacity-60">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Any extra detail..."
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : 'Submit for Approval'}
                                    </button>
                                    <p className="text-center text-[11px] text-muted-foreground/60">
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
