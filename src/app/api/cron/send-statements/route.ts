import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role to bypass RLS in cron

// The cron runs on the 28th, 29th, 30th, and 31st. We only want to execute on the *actual* last day.
function isLastDayOfMonth(date: Date) {
    const tomorrow = new Date(date)
    tomorrow.setDate(date.getDate() + 1)
    return tomorrow.getDate() === 1
}

function getMonthLabel(my: string) {
    return new Date(my + '-01T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })
}

export async function GET(request: Request) {
    // 1. Verify Vercel Cron Secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    const today = new Date()
    if (!isLastDayOfMonth(today)) {
        return NextResponse.json({ message: 'Skipped: Not the last day of the month.' })
    }

    const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = getMonthLabel(currentMonthYear)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Fetch all members globally who have a whatsapp number
    const { data: members, error: membersErr } = await supabase
        .from('members')
        .select('id, name, whatsapp_number, admin_id')
        .eq('is_active', true)
        .not('whatsapp_number', 'is', null)

    if (membersErr || !members || members.length === 0) {
        return NextResponse.json({ message: 'No eligible members found.' })
    }

    // Group members by admin_id to process each mess group
    const membersByAdmin = members.reduce((acc, m) => {
        if (!acc[m.admin_id]) acc[m.admin_id] = []
        acc[m.admin_id].push(m)
        return acc
    }, {} as Record<string, typeof members>)

    let sentCount = 0

    const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
    const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

    if (!WA_PHONE_ID || !WA_TOKEN) {
        return NextResponse.json({ error: 'WhatsApp credentials missing in environment variables.' }, { status: 500 })
    }

    for (const adminId of Object.keys(membersByAdmin)) {
        const messMembers = membersByAdmin[adminId]

        // Fetch data for this admin's mess
        const [
            { data: dailyMeals },
            { data: groceries },
            { data: utilities },
            { data: mealDeposits },
            { data: utilityDeposits },
        ] = await Promise.all([
            supabase.from('daily_meals').select('member_id, regular_meals, guest_meals').eq('month_year', currentMonthYear).eq('admin_id', adminId),
            supabase.from('groceries').select('cost').eq('month_year', currentMonthYear).eq('admin_id', adminId),
            supabase.from('utilities').select('cost').eq('month_year', currentMonthYear).eq('admin_id', adminId),
            supabase.from('meal_deposits').select('amount, member_id').eq('month_year', currentMonthYear).eq('admin_id', adminId),
            supabase.from('utility_deposits').select('amount, member_id').eq('month_year', currentMonthYear).eq('admin_id', adminId),
        ])

        // Calculate totals for the mess
        const utilTotal = (utilities || []).reduce((s, r) => s + Number(r.cost), 0)
        const totalMeals = (dailyMeals || []).reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)
        const totalMealDeps = (mealDeposits || []).reduce((s, d) => s + Number(d.amount), 0)
        const mealRate = totalMeals > 0 ? totalMealDeps / totalMeals : 0

        // Need total active members for utility per person calculation
        const { count: totalActiveMembers } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('admin_id', adminId)

        const utilPerPerson = (totalActiveMembers ?? 0) > 0 ? utilTotal / totalActiveMembers! : 0

        for (const m of messMembers) {
            const memberMeals = (dailyMeals || []).filter(r => r.member_id === m.id).reduce((s, r) => s + r.regular_meals + r.guest_meals, 0)
            const mealDep = (mealDeposits || []).filter(d => d.member_id === m.id).reduce((s, d) => s + Number(d.amount), 0)
            const utilDep = (utilityDeposits || []).filter(d => d.member_id === m.id).reduce((s, d) => s + Number(d.amount), 0)
            
            const mealCost = memberMeals * mealRate
            const mealBal = mealDep - mealCost
            const utilBal = utilDep - utilPerPerson
            const totalBal = mealBal + utilBal
            const status = totalBal < -0.01 ? 'Owes' : totalBal > 0.01 ? 'In Credit' : 'Settled'

            // Format phone (strip all non-digits, ensure starts with country code, assume +880 if just 01...)
            let phone = m.whatsapp_number!.replace(/\D/g, '')
            if (phone.startsWith('01') && phone.length === 11) {
                phone = '88' + phone // Auto-prefix Bangladesh code if missing
            }

            // Send via Meta API
            const payload = {
                messaging_product: 'whatsapp',
                to: phone,
                type: 'template',
                template: {
                    name: 'monthly_statement',
                    language: { code: 'en' },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: monthLabel },                   // {{1}}
                                { type: 'text', text: m.name },                       // {{2}}
                                { type: 'text', text: memberMeals.toString() },       // {{3}}
                                { type: 'text', text: mealRate.toFixed(2) },          // {{4}}
                                { type: 'text', text: mealDep.toFixed(2) },           // {{5}}
                                { type: 'text', text: mealCost.toFixed(2) },          // {{6}}
                                { type: 'text', text: `${mealBal > 0 ? '+' : ''}${mealBal.toFixed(2)}` }, // {{7}}
                                { type: 'text', text: utilDep.toFixed(2) },           // {{8}}
                                { type: 'text', text: utilPerPerson.toFixed(2) },     // {{9}}
                                { type: 'text', text: `${utilBal > 0 ? '+' : ''}${utilBal.toFixed(2)}` }, // {{10}}
                                { type: 'text', text: status },                       // {{11}}
                                { type: 'text', text: Math.abs(totalBal).toFixed(2) } // {{12}}
                            ]
                        }
                    ]
                }
            }

            try {
                const response = await fetch(`https://graph.facebook.com/v17.0/${WA_PHONE_ID}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${WA_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                })
                
                if (response.ok) {
                    sentCount++
                } else {
                    const errText = await response.text()
                    console.error(`Failed to send WA to ${m.name}:`, errText)
                }
            } catch (err) {
                console.error(`Fetch error for WA to ${m.name}:`, err)
            }
        }
    }

    return NextResponse.json({ success: true, statements_sent: sentCount })
}
