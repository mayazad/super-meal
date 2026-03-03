import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminLogoutButton from '../admin/logout-button'
import { ShieldCheck, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default async function SenpaiLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'senpai') {
        redirect('/admin/dashboard')
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
            <header className="border-b bg-card h-16 flex items-center justify-between px-4 sm:px-6 shrink-0">
                {/* Left: Logo */}
                <div className="flex items-center gap-2 shrink-0">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <span className="font-bold text-base sm:text-lg tracking-tight">Senpai Control</span>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* My Mess — always visible */}
                    <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#064E3B]/70 hover:text-[#10B981] transition-colors border border-[#D1E4D1] rounded-full px-2.5 sm:px-3 py-1.5 whitespace-nowrap"
                    >
                        <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:inline">My Mess</span>
                        <span className="sm:hidden">Mess</span>
                    </Link>
                    {/* Email — desktop only */}
                    <span className="hidden md:block text-xs text-muted-foreground truncate max-w-[160px] bg-muted/50 rounded-full px-3 py-1.5">{user.email}</span>
                    <AdminLogoutButton />
                </div>
            </header>
            <main className="flex-1 px-4 sm:px-6 py-6 w-full max-w-5xl mx-auto overflow-x-hidden">
                {children}
            </main>
        </div>
    )
}
