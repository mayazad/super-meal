'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Check, X, ShieldAlert, BadgeCheck, Trash2, ShieldCheck, Activity, Users, Wallet, Send, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

type Profile = {
    id: string
    email: string
    role: string
    mess_name: string
    mess_slug: string
    created_at: string
}

type GlobalStats = {
    totalMesses: number
    globalMeals: number
    financialThroughput: number
    activeRoommates: number
}

type ChartData = {
    date: string
    meals: number
}

export default function SenpaiDashboard() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [stats, setStats] = useState<GlobalStats>({ totalMesses: 0, globalMeals: 0, financialThroughput: 0, activeRoommates: 0 })
    const [chartData, setChartData] = useState<ChartData[]>([])
    const [broadcastMsg, setBroadcastMsg] = useState('')
    const [isBroadcasting, setIsBroadcasting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
    const [lastActive, setLastActive] = useState<Record<string, string>>({})

    const supabase = createClient()

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true)

        // 1. Fetch Profiles
        const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
        const fetchedProfiles = profilesData || []
        setProfiles(fetchedProfiles)

        // 2. Fetch Broadcast Message
        const { data: settingsData } = await supabase.from('app_settings').select('broadcast_message').eq('id', 'global_config').single()
        if (settingsData && settingsData.broadcast_message) {
            setBroadcastMsg(settingsData.broadcast_message)
        }

        // 3. Fetch analytics aggressively (Senpai only)
        const [
            { data: members },
            { data: meals },
            { data: mealDeps },
            { data: utilDeps }
        ] = await Promise.all([
            supabase.from('members').select('id, admin_id, is_active'),
            supabase.from('daily_meals').select('date, regular_meals, guest_meals, admin_id'),
            supabase.from('meal_deposits').select('amount'),
            supabase.from('utility_deposits').select('amount')
        ])

        // Compute Stats
        const admins = fetchedProfiles.filter(p => p.role === 'admin' || p.role === 'senpai')

        const safeMembers = members || []
        const safeMeals = meals || []
        const safeMD = mealDeps || []
        const safeUD = utilDeps || []

        const totalGlobalMeals = safeMeals.reduce((acc, curr) => acc + curr.regular_meals + curr.guest_meals, 0)
        let totalFinancial = 0
        safeMD.forEach(d => totalFinancial += Number(d.amount))
        safeUD.forEach(d => totalFinancial += Number(d.amount))

        setStats({
            totalMesses: admins.length,
            globalMeals: totalGlobalMeals,
            financialThroughput: totalFinancial,
            activeRoommates: safeMembers.filter(m => m.is_active).length
        })

        // Compute Table Enhancements (Member count & Last Active per Admin)
        const mCounts: Record<string, number> = {}
        const lActive: Record<string, string> = {}

        safeMembers.filter(m => m.is_active).forEach(m => {
            if (m.admin_id) {
                mCounts[m.admin_id] = (mCounts[m.admin_id] || 0) + 1
            }
        })

        // Sort meals by date descending to find last active date per admin
        const sortedMeals = [...safeMeals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        sortedMeals.forEach(m => {
            if (m.admin_id && !lActive[m.admin_id]) {
                if (m.regular_meals > 0 || m.guest_meals > 0) {
                    lActive[m.admin_id] = m.date
                }
            }
        })

        setMemberCounts(mCounts)
        setLastActive(lActive)

        // Compute 14 Day Chart Data
        const last14Days: ChartData[] = []
        for (let i = 13; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]

            const dayMeals = safeMeals.filter(m => m.date === dateStr).reduce((acc, curr) => acc + curr.regular_meals + curr.guest_meals, 0)

            last14Days.push({
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                meals: dayMeals
            })
        }
        setChartData(last14Days)
        setIsLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    const handleApprove = async (id: string, slug: string) => {
        if (!confirm(`Approve this user? They will get an empty dashboard under /view/${slug}`)) return

        await supabase.from('profiles').update({ role: 'admin' }).eq('id', id)

        await supabase.from('app_settings').upsert({
            id: 'global_config',
            admin_id: id,
            selected_theme: 'emerald',
            mess_slug: slug
        })

        fetchDashboardData()
    }

    const handleReject = async (id: string) => {
        if (!confirm("Are you sure? This deletes their profile and blocks access.")) return
        await supabase.from('profiles').delete().eq('id', id)
        fetchDashboardData()
    }

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsBroadcasting(true)
        await supabase.from('app_settings').update({ broadcast_message: broadcastMsg.trim() }).eq('id', 'global_config')
        setIsBroadcasting(false)
        alert('Broadcast updated.')
    }

    if (isLoading) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                <p className="text-sm font-medium text-emerald-600/60 animate-pulse">Initializing Command Center...</p>
            </div>
        )
    }

    const pending = profiles.filter(p => p.role === 'pending_admin')
    const admins = profiles.filter(p => p.role === 'admin' || p.role === 'senpai')

    return (
        <div className="space-y-6 sm:space-y-8 relative px-4 sm:px-6 md:px-8 w-full overflow-x-hidden pb-12">
            {/* Watermark Logo Background */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.02] z-0">
                <ShieldCheck className="w-[400px] h-[400px] sm:w-[800px] sm:h-[800px] text-emerald-900" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-emerald-500" />
                        Senpai Command Center
                    </h1>
                    <p className="text-muted-foreground">Master overview and administrative controls.</p>
                </div>
            </div>

            {/* Broadcast System */}
            <form onSubmit={handleBroadcast} className="relative z-10 flex flex-col sm:flex-row gap-2 rounded-xl bg-card border p-2 shadow-sm w-full">
                <div className="flex-1 flex items-center px-2 py-1.5 sm:py-0 bg-muted/30 rounded-lg">
                    <Send className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                    <input
                        type="text"
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        placeholder="Global announcement..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm py-1 sm:py-2 px-1 outline-none truncate"
                    />
                </div>
                <button
                    disabled={isBroadcasting}
                    className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                >
                    {isBroadcasting ? 'Updating...' : 'Broadcast'}
                </button>
            </form>

            {/* Platform Overview Stats */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="text-emerald-500 mb-2"><BadgeCheck className="h-5 w-5" /></div>
                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Managed Messes</p>
                    <p className="text-2xl font-bold">{stats.totalMesses}</p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="text-emerald-500 mb-2"><Activity className="h-5 w-5" /></div>
                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Global Meals</p>
                    <p className="text-2xl font-bold">{stats.globalMeals.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="text-emerald-500 mb-2"><Wallet className="h-5 w-5" /></div>
                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Total Throughput</p>
                    <p className="text-2xl font-bold">{stats.financialThroughput.toLocaleString()} Tk</p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="text-emerald-500 mb-2"><Users className="h-5 w-5" /></div>
                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Active Roommates</p>
                    <p className="text-2xl font-bold">{stats.activeRoommates}</p>
                </div>
            </div>

            {/* Platform Usage Chart */}
            <div className="relative z-10 rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">System Activity (14 Days)</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                            />
                            <RechartsTooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="meals"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorMeals)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pending Approvals */}
            {pending.length > 0 && (
                <div className="relative z-10 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        Pending Approvals ({pending.length})
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {pending.map(p => (
                            <div key={p.id} className="p-5 border border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 rounded-xl flex flex-col gap-4">
                                <div>
                                    <h3 className="font-semibold text-lg">{p.mess_name}</h3>
                                    <p className="text-sm text-muted-foreground">{p.email}</p>
                                    <p className="text-xs font-mono mt-1 text-muted-foreground/70">Slug: {p.mess_slug}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-amber-500/20">
                                    <button onClick={() => handleApprove(p.id, p.mess_slug)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
                                        <Check className="h-4 w-4" /> Approve
                                    </button>
                                    <button onClick={() => handleReject(p.id)} className="px-3 h-9 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors title='Reject'">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Workspaces Table */}
            <div className="relative z-10 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-emerald-500" />
                    Active Workspaces ({admins.length})
                </h2>
                <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">Tenant Info</th>
                                    <th className="px-5 py-4 font-semibold">Members</th>
                                    <th className="px-5 py-4 font-semibold">Activity</th>
                                    <th className="px-5 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {admins.map(p => {
                                    const createdDate = new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                    const mCount = memberCounts[p.id] || 0

                                    // Live calculation (Logged meal within 48h)
                                    let isLive = false
                                    if (lastActive[p.id]) {
                                        const hrDiff = (new Date().getTime() - new Date(lastActive[p.id]).getTime()) / (1000 * 60 * 60)
                                        if (hrDiff <= 48) isLive = true
                                    }

                                    return (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-base">{p.mess_name}</p>
                                                    {p.role === 'senpai' && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white leading-none">SENPAI</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">{p.email}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Created {createdDate}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center justify-center bg-muted px-2.5 py-1 rounded-md font-mono text-sm">
                                                    {mCount} <span className="text-xs text-muted-foreground ml-1">users</span>
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {isLive ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                        </span>
                                                        Live
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground border">
                                                        Dormant
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/view/${p.mess_slug}`}
                                                        target="_blank"
                                                        className="h-8 inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-medium px-3 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800 transition-colors"
                                                    >
                                                        Enter <ChevronRight className="h-3 w-3" />
                                                    </Link>
                                                    {p.role !== 'senpai' && (
                                                        <button
                                                            onClick={() => handleReject(p.id)}
                                                            className="h-8 w-8 inline-flex items-center justify-center rounded-md border text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                                            title="Delete Workspace Data"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
