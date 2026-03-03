import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import SummaryClient from './summary-client'
import Link from 'next/link'

export default async function ViewPublicSummaryPage(props: {
    params: Promise<{ slug: string, month_year: string }>
}) {
    const params = await props.params;
    const { slug, month_year: monthYear } = params;

    if (!/^\d{4}-\d{2}$/.test(monthYear)) notFound()

    const supabase = await createClient()

    // 1. Resolve slug to admin_id
    const { data: profile } = await supabase.from('profiles').select('id, mess_name').eq('mess_slug', slug).single()
    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
                <h1 className="text-2xl font-bold mb-2">Workspace Not Found</h1>
                <p className="text-muted-foreground mb-6">Could not find a mess acting under slug '{slug}'.</p>
                <Link href="/" className="text-sm underline">Go Home</Link>
            </div>
        )
    }

    const adminId = profile.id
    const messNameTitle = profile.mess_name

    // 2. Fetch specific data for this admin_id
    const [
        { data: activeMembers },
        { data: dailyMeals },
        { data: groceries },
        { data: utilities },
        { data: mealDeposits },
        { data: utilityDeposits },
        { data: utilityPayments },
        { data: lockedData },
    ] = await Promise.all([
        supabase.from('members').select('*').eq('is_active', true).eq('admin_id', adminId).order('name', { ascending: true }),
        supabase.from('daily_meals').select('*').eq('month_year', monthYear).eq('admin_id', adminId).order('date', { ascending: true }),
        supabase.from('groceries').select('cost').eq('month_year', monthYear).eq('admin_id', adminId),
        supabase.from('utilities').select('id, type, cost, due_date').eq('month_year', monthYear).eq('admin_id', adminId),
        supabase.from('meal_deposits').select('amount, member_id, date').eq('month_year', monthYear).eq('admin_id', adminId),
        supabase.from('utility_deposits').select('amount, member_id, date').eq('month_year', monthYear).eq('admin_id', adminId),
        supabase.from('utility_payments').select('utility_id, member_id, paid').eq('paid', true).eq('admin_id', adminId),
        supabase.from('locked_months').select('id').eq('month_year', monthYear).eq('admin_id', adminId),
    ])

    const isLocked = (lockedData?.length ?? 0) > 0

    // Prev / Next month URLs for navigation
    const d = new Date(monthYear + '-01T00:00:00')
    const prevD = new Date(d); prevD.setMonth(prevD.getMonth() - 1)
    const nextD = new Date(d); nextD.setMonth(nextD.getMonth() + 1)
    const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    const prevMonth = fmt(prevD)
    const nextMonth = fmt(nextD)
    const nowMonth = fmt(new Date())

    if (!activeMembers || activeMembers.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
                <h1 className="text-2xl font-bold mb-2">No Active Members Found</h1>
                <p className="text-muted-foreground mb-6">Ask the admin of {messNameTitle} to add roommates.</p>
                <Link href="/admin/login" className="text-sm underline">Admin Login</Link>
            </div>
        )
    }

    const totalGroceries = groceries?.reduce((s, i) => s + Number(i.cost), 0) || 0
    const totalUtilities = utilities?.reduce((s, i) => s + Number(i.cost), 0) || 0
    const totalMealsConsumed = dailyMeals?.reduce((s, i) => s + i.regular_meals + i.guest_meals, 0) || 0
    const mealRate = totalMealsConsumed > 0 ? totalGroceries / totalMealsConsumed : 0
    const utilityRatePerPerson = activeMembers.length > 0 ? totalUtilities / activeMembers.length : 0

    const paidSet = new Set<string>()
        ; (utilityPayments || []).forEach(p => paidSet.add(`${p.utility_id}:${p.member_id}`))

    const utilityBills = (utilities || []).map(u => ({
        id: u.id, type: u.type, cost: Number(u.cost), due_date: u.due_date ?? null,
    }))

    const breakdown = activeMembers.map(member => {
        const memberDailyRecords = (dailyMeals || []).filter(m => m.member_id === member.id)
        const regularMeals = memberDailyRecords.reduce((s, i) => s + i.regular_meals, 0)
        const guestMeals = memberDailyRecords.reduce((s, i) => s + i.guest_meals, 0)
        const totalMeals = regularMeals + guestMeals
        const activeDays = memberDailyRecords.filter(r => r.regular_meals + r.guest_meals > 0).length

        const totalMealDeposits = (mealDeposits || []).filter(d => d.member_id === member.id)
            .reduce((s, i) => s + Number(i.amount), 0)
        const totalUtilDeposits = (utilityDeposits || []).filter(d => d.member_id === member.id)
            .reduce((s, i) => s + Number(i.amount), 0)

        const mealCost = totalMeals * mealRate
        const mealBalance = totalMealDeposits - mealCost
        const utilityBalance = totalUtilDeposits - utilityRatePerPerson
        const totalBalance = mealBalance + utilityBalance

        const billDetails = utilityBills.map(bill => ({
            id: bill.id, type: bill.type, cost: bill.cost,
            paid: paidSet.has(`${bill.id}:${member.id}`),
            due_date: bill.due_date,
        }))

        // Day-by-day meal log for the public "View Meal Log" expandable
        const mealLog = memberDailyRecords
            .filter(r => r.regular_meals + r.guest_meals > 0)
            .map(r => ({ date: r.date, regular: r.regular_meals, guest: r.guest_meals }))

        return {
            id: member.id, name: member.name,
            meals: totalMeals, regularMeals, guestMeals, activeDays,
            mealCost, utilityCost: utilityRatePerPerson,
            mealDeposits: totalMealDeposits, utilityDeposits: totalUtilDeposits,
            mealBalance, utilityBalance, totalBalance,
            billDetails, mealLog,
        }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlines = (utilities || []).filter(u => u.due_date).map(u => ({
        type: u.type, due_date: u.due_date!,
        isOverdue: new Date(u.due_date!) < today,
    }))

    const monthName = new Date(monthYear + '-01T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })

    // Generate text summary
    const textSummaryLines = breakdown.map(b => {
        const mealStatus = b.mealBalance < -0.01 ? 'Owes' : b.mealBalance > 0.01 ? 'Credit' : 'Settled'
        const utilStatus = b.utilityBalance < -0.01 ? 'Owes' : b.utilityBalance > 0.01 ? 'Credit' : 'Settled'
        const finalStatus = b.totalBalance < -0.01 ? 'Owes' : b.totalBalance > 0.01 ? 'Credit' : 'Settled'
        const billLines = b.billDetails.length > 0
            ? b.billDetails.map(bill => `  - ${bill.type} (${bill.cost.toFixed(0)} Tk): ${bill.paid ? '✅ Paid' : '⏳ Pending'}`).join('\n')
            : '  (No bills this month)'

        return [
            b.name,
            `Meals: ${b.meals} (incl. ${b.guestMeals} Guest) | Active Days: ${b.activeDays} | Rate: ${mealRate.toFixed(0)} Tk`,
            `Meal Balance: ${b.mealBalance.toFixed(2)} Tk (${mealStatus})`,
            ``,
            `Utilities (Individual Bills):`,
            billLines,
            `Utility Balance: ${b.utilityBalance.toFixed(2)} Tk (${utilStatus})`,
            `---------------------------`,
            `Final Status: ${finalStatus} ${Math.abs(b.totalBalance).toFixed(2)} Tk`,
        ].join('\n')
    })

    const textSummaryText = [
        `--- ${messNameTitle} | ${monthName} Summary ---`,
        textSummaryLines.join('\n---------------------------\n'),
        `---------------------------`,
        `Please settle your dues!`,
        `Generated by SuperMeal | MayazAD`,
    ].join('\n')

    // Raw deposits list for Excel export (joined with member names)
    const memberNameMap: Record<string, string> = {}
        ; (activeMembers || []).forEach(m => { memberNameMap[m.id] = m.name })

    const rawDeposits = [
        ...(mealDeposits || []).map(d => ({ memberName: memberNameMap[d.member_id] ?? '—', type: 'Meal Deposit', amount: Number(d.amount), date: d.date })),
        ...(utilityDeposits || []).map(d => ({ memberName: memberNameMap[d.member_id] ?? '—', type: 'Utility Deposit', amount: Number(d.amount), date: d.date })),
    ].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

    return (
        <SummaryClient
            slug={slug}
            monthName={monthName}
            monthYear={monthYear}
            breakdown={breakdown}
            textSummary={textSummaryText}
            deadlines={deadlines}
            utilityBills={utilityBills}
            isLocked={isLocked}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            hasNextMonth={nextMonth <= nowMonth}
            rawDeposits={rawDeposits}
            stats={{ totalMeals: totalMealsConsumed, mealRate, totalGroceries, totalUtilities }}
        />
    )
}
