'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Check, X, ShieldAlert, BadgeCheck, Trash2, ShieldCheck, Activity, Users, Wallet, Send, ChevronRight, RefreshCw, CheckCircle2, KeyRound, Copy, ExternalLink } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import { SkeletonPage } from '@/components/ui/skeleton'
import { PageError } from '@/components/ui/page-error'

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
    const [broadcastSuccess, setBroadcastSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
    const [lastSettlement, setLastSettlement] = useState<Record<string, string>>({})
    const [activityStatus, setActivityStatus] = useState<Record<string, 'Active' | 'Inactive' | 'Unused'>>({})
    const [resetClaims, setResetClaims] = useState<{
        id: string
        admin_email: string
        created_at: string
        is_used: boolean
        token: string | null
        expires_at: string | null
    }[]>([])
    const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({})
    const [generatingId, setGeneratingId] = useState<string | null>(null)

    const supabase = createClient()

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [
                { data: profilesData },
                { data: settingsData },
                { data: members },
                { data: meals },
                { data: mealDeps },
                { data: utilDeps },
                { data: archivesData },
                { data: claimsData },
            ] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('app_settings').select('broadcast_message').eq('id', 'global_config').single(),
                supabase.from('members').select('id, admin_id, is_active'),
                supabase.from('daily_meals').select('date, regular_meals, guest_meals, admin_id'),
                supabase.from('meal_deposits').select('amount'),
                supabase.from('utility_deposits').select('amount'),
                supabase.from('monthly_archives').select('admin_id, created_at').order('created_at', { ascending: false }),
                supabase.from('password_reset_claims').select('*').eq('is_used', false).order('created_at', { ascending: false }),
            ])

            const fetchedProfiles = (profilesData || []) as Profile[]
            setProfiles(fetchedProfiles)
            if (settingsData?.broadcast_message) setBroadcastMsg(settingsData.broadcast_message)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setResetClaims((claimsData as any[]) || [])

            const admins = fetchedProfiles.filter(p => p.role === 'admin' || p.role === 'senpai')
            const safeMembers = members || []
            const safeMeals = meals || []
            let totalFinancial = 0
                ; (mealDeps || []).forEach(d => { totalFinancial += Number(d.amount) })
                ; (utilDeps || []).forEach(d => { totalFinancial += Number(d.amount) })

            setStats({
                totalMesses: admins.length,
                globalMeals: safeMeals.reduce((acc, m) => acc + m.regular_meals + m.guest_meals, 0),
                financialThroughput: totalFinancial,
                activeRoommates: safeMembers.filter(m => m.is_active).length,
            })

            // Member counts & last active/settlement per admin
            const mCounts: Record<string, number> = {}
            const lActive: Record<string, string> = {}
            const lSettlement: Record<string, string> = {}
            const actStatus: Record<string, 'Active' | 'Inactive' | 'Unused'> = {}

            safeMembers.filter(m => m.is_active).forEach(m => {
                if (m.admin_id) mCounts[m.admin_id] = (mCounts[m.admin_id] || 0) + 1
            })

            const fortyFiveDaysAgo = new Date()
            fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)

                // Calculate last activity purely for the line graph (not displayed in UI)
                ;[...safeMeals]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .forEach(m => {
                        if (m.admin_id && (m.regular_meals > 0 || m.guest_meals > 0)) {
                            // data available but not rendered  
                        }
                    })

            // Calculate exact Last Settlement Date & 45-day Activity Window
            const safeArchives = archivesData || []
            admins.forEach(admin => {
                const adminArchives = safeArchives.filter((a: { admin_id: string; created_at: string }) => a.admin_id === admin.id)
                if (adminArchives.length > 0) {
                    const latest = adminArchives[0].created_at
                    lSettlement[admin.id] = new Date(latest).toLocaleDateString()
                    actStatus[admin.id] = new Date(latest) >= fortyFiveDaysAgo ? 'Active' : 'Inactive'
                } else {
                    lSettlement[admin.id] = 'Never'
                    actStatus[admin.id] = 'Unused'
                }
            })

            setMemberCounts(mCounts)
            setLastSettlement(lSettlement)
            setActivityStatus(actStatus)

            // 14-day chart
            const last14Days: ChartData[] = []
            for (let i = 13; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const dateStr = d.toISOString().split('T')[0]
                last14Days.push({
                    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    meals: safeMeals.filter(m => m.date === dateStr).reduce((acc, m) => acc + m.regular_meals + m.guest_meals, 0),
                })
            }
            setChartData(last14Days)
        } catch {
            setError('Failed to load dashboard data.')
        } finally {
            setIsLoading(false)
        }
    }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchDashboardData()

        // Realtime: auto-refresh when a profile is inserted or updated
        const channel = supabase
            .channel('senpai-profiles-watch')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchDashboardData()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchDashboardData])

    const handleApprove = async (id: string, slug: string) => {
        if (!confirm(`Approve this mess? They will get access to /view/${slug}`)) return
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', id)
        fetchDashboardData()
    }

    const handleReject = async (id: string) => {
        if (!confirm('Reject this application? Their profile will be deleted.')) return
        await supabase.from('profiles').delete().eq('id', id)
        fetchDashboardData()
    }

    // Revoke active admin (set to revoked, preserves data)
    const handleRevoke = async (id: string, name: string) => {
        if (!confirm(`Revoke "${name}"? Their dashboard access will be disabled but data is preserved.`)) return
        await supabase.from('profiles').update({ role: 'revoked' }).eq('id', id)
        fetchDashboardData()
    }

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsBroadcasting(true)
        await supabase.from('app_settings').update({ broadcast_message: broadcastMsg.trim() }).eq('id', 'global_config')
        setIsBroadcasting(false)
        setBroadcastSuccess(true)
        setTimeout(() => setBroadcastSuccess(false), 3000)
    }

    const handleGenerateResetLink = async (claimId: string) => {
        setGeneratingId(claimId)
        try {
            const res = await fetch('/api/generate-reset-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claimId }),
            })
            const data = await res.json()
            if (data.resetLink) {
                setGeneratedLinks(prev => ({ ...prev, [claimId]: data.resetLink }))
            }
        } catch {
            // silent
        } finally {
            setGeneratingId(null)
        }
    }

    if (error) return <PageError message={error} onRetry={fetchDashboardData} />
    if (isLoading) return <SkeletonPage cards={4} rows={5} />

    const pending = profiles.filter(p => p.role === 'pending_admin')
    const admins = profiles.filter(p => p.role === 'admin' || p.role === 'senpai')

    return (
        <div className="space-y-6 sm:space-y-8 relative pb-12">
            {/* Watermark */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.02] z-0">
                <ShieldCheck className="w-[400px] h-[400px] sm:w-[800px] sm:h-[800px] text-emerald-900" />
            </div>

            {/* Header row */}
            <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-7 w-7 text-emerald-500 shrink-0" />
                        Senpai Command Center
                        {pending.length > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                                {pending.length}
                            </span>
                        )}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Master overview and administrative controls.</p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    title="Refresh dashboard"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* Broadcast */}
            <form onSubmit={handleBroadcast} className="relative z-10 flex flex-col sm:flex-row gap-2 rounded-xl bg-card border p-2 shadow-sm">
                <div className="flex-1 flex items-center px-2 py-1.5 sm:py-0 bg-muted/30 rounded-lg">
                    <Send className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                    <input
                        type="text"
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        placeholder="Global announcement..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm py-1 sm:py-2 px-1 outline-none"
                    />
                </div>
                <button
                    disabled={isBroadcasting}
                    className="shrink-0 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                >
                    {broadcastSuccess ? (
                        <><CheckCircle2 className="h-4 w-4" /> Sent!</>
                    ) : isBroadcasting ? 'Updating...' : 'Broadcast'}
                </button>
            </form>

            {/* Stats */}
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { icon: BadgeCheck, label: 'Managed Messes', value: stats.totalMesses },
                    { icon: Activity, label: 'Global Meals', value: stats.globalMeals.toLocaleString() },
                    { icon: Wallet, label: 'Total Throughput', value: `${stats.financialThroughput.toLocaleString()} Tk` },
                    { icon: Users, label: 'Active Roommates', value: stats.activeRoommates },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
                        <div className="text-emerald-500 mb-2"><Icon className="h-5 w-5" /></div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1 leading-tight">{label}</p>
                        <p className="text-xl sm:text-2xl font-bold">{value}</p>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="relative z-10 rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 sm:mb-6">System Activity (14 Days)</h3>
                <div className="h-48 sm:h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                            <RechartsTooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="meals" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMeals)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pending Approvals */}
            {pending.length > 0 && (
                <div className="relative z-10 space-y-3">
                    <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        Pending Approvals
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black">{pending.length}</span>
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {pending.map(p => (
                            <div key={p.id} className="p-4 sm:p-5 border border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 rounded-xl flex flex-col gap-3">
                                <div>
                                    <h3 className="font-semibold text-base sm:text-lg leading-tight">{p.mess_name}</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{p.email || '—'}</p>
                                    <p className="text-xs font-mono mt-1 text-muted-foreground bg-muted/50 rounded px-2 py-0.5 inline-block">/view/{p.mess_slug}</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">
                                        Registered: {p.created_at ? new Date(p.created_at).toLocaleString() : 'Unknown'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                                    <button onClick={() => handleApprove(p.id, p.mess_slug)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
                                        <Check className="h-4 w-4" /> Approve
                                    </button>
                                    <button onClick={() => handleReject(p.id)} className="flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium">
                                        <X className="h-4 w-4" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Workspaces */}
            <div className="relative z-10 space-y-3">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-emerald-500" />
                    Active Workspaces ({admins.length})
                </h2>

                {/* ── Desktop Table ── */}
                <div className="hidden sm:block border rounded-xl bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Tenant Info</th>
                                    <th className="px-5 py-3 font-semibold">Members</th>
                                    <th className="px-5 py-3 font-semibold">Activity</th>
                                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {admins.map(p => {
                                    return (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold">{p.mess_name}</p>
                                                    {p.role === 'senpai' && <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white">SENPAI</span>}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{p.email}</p>
                                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Created {new Date(p.created_at).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center bg-muted px-2.5 py-1 rounded-md font-mono text-sm">
                                                    {memberCounts[p.id] || 0} <span className="text-xs text-muted-foreground ml-1">users</span>
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 flex flex-col items-start gap-1">
                                                {activityStatus[p.id] === 'Active' ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                        </span>
                                                        Active
                                                    </span>
                                                ) : activityStatus[p.id] === 'Inactive' ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200">Inactive</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground border">Unused</span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
                                                    Last Settled: {lastSettlement[p.id]}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={`/view/${p.mess_slug}`} target="_blank" className="h-8 inline-flex items-center gap-1.5 rounded-md border text-xs font-medium px-3 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 transition-colors">
                                                        View <ChevronRight className="h-3 w-3" />
                                                    </Link>
                                                    {p.role !== 'senpai' && (
                                                        <button
                                                            onClick={() => handleRevoke(p.id, p.mess_name)}
                                                            className="h-8 w-8 inline-flex items-center justify-center rounded-md border text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                                            title="Revoke access (preserves data)"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
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

                {/* ── Mobile Card List ── */}
                <div className="sm:hidden space-y-3">
                    {admins.map(p => {
                        const mCount = memberCounts[p.id] || 0
                        return (
                            <div key={p.id} className="border rounded-xl bg-card p-4 shadow-sm space-y-3">
                                {/* Top row */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-bold text-base truncate">{p.mess_name}</p>
                                            {p.role === 'senpai' && <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500 text-white">SENPAI</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{p.email}</p>
                                    </div>
                                    {activityStatus[p.id] === 'Active' ? (
                                        <span className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            Active
                                        </span>
                                    ) : activityStatus[p.id] === 'Inactive' ? (
                                        <span className="shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200">Inactive</span>
                                    ) : (
                                        <span className="shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium text-muted-foreground border">Unused</span>
                                    )}
                                </div>
                                {/* Meta row */}
                                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-muted px-2 py-0.5 rounded font-mono">{mCount} members</span>
                                        <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <span className="text-[10px] font-medium uppercase tracking-wider mt-1">
                                        Last Settled: {lastSettlement[p.id]}
                                    </span>
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-border">
                                    <Link href={`/view/${p.mess_slug}`} target="_blank" className="flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                                        View Mess <ChevronRight className="h-3 w-3" />
                                    </Link>
                                    {p.role !== 'senpai' && (
                                        <button
                                            onClick={() => handleRevoke(p.id, p.mess_name)}
                                            className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                            title="Revoke access"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Revoke
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {admins.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-8">No active workspaces yet.</p>
                    )}
                </div>
            </div>

            {/* ── Password Reset Requests ───────────────────────────── */}
            <div className="relative z-10 rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
                    <KeyRound className="h-5 w-5 text-amber-500" />
                    <h2 className="font-bold text-base">Password Reset Requests</h2>
                    {resetClaims.length > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                            {resetClaims.length}
                        </span>
                    )}
                </div>
                {resetClaims.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No pending reset requests.</p>
                ) : (
                    <div className="divide-y">
                        {resetClaims.map(claim => (
                            <div key={claim.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">{claim.admin_email}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Requested {new Date(claim.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {generatedLinks[claim.id] ? (
                                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 max-w-full">
                                        <ExternalLink className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        <code className="text-xs text-emerald-700 dark:text-emerald-300 truncate max-w-[280px]">{generatedLinks[claim.id]}</code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(generatedLinks[claim.id])}
                                            className="ml-1 shrink-0 p-1 hover:bg-emerald-100 rounded transition-colors"
                                            title="Copy link"
                                        >
                                            <Copy className="h-3.5 w-3.5 text-emerald-600" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleGenerateResetLink(claim.id)}
                                        disabled={generatingId === claim.id}
                                        className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
                                    >
                                        <KeyRound className="h-3.5 w-3.5" />
                                        {generatingId === claim.id ? 'Generating...' : 'Approve & Generate Link'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
