'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, ShieldCheck, LogIn, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function PendingApproval() {
    const router = useRouter()
    const supabase = createClient()
    const [isChecking] = useState(false) // Removed userEmail as it's unused
    // Removed setUserEmail as it's unused

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return // Already signed out — show static page, let them click login

            // setUserEmail(user.email || '') // Removed as userEmail is unused

            // Fetch current role
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            const role = profile?.role

            if (role === 'admin') {
                // Approved! Redirect directly
                router.push('/admin/dashboard')
            } else if (role === 'senpai') {
                router.push('/senpai')
            } else {
                // Still pending — sign out so "Go to Login" gives a clean fresh session
                await supabase.auth.signOut()
            }
        }

        checkStatus()
    }, [router, supabase])

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-[#FDFEFD] selection:bg-[#10B981]/20">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="max-w-md w-full text-center space-y-0 rounded-3xl border border-[#D1E4D1] bg-white shadow-sm overflow-hidden"
            >
                {/* Top emerald banner */}
                <div className="bg-gradient-to-r from-[#064E3B] to-[#10B981] px-8 py-10 flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-4 shadow-inner relative">
                        <ShieldCheck className="h-8 w-8 text-white" />
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#10B981] border-2 border-white animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Registration Received!</h1>
                    <p className="text-emerald-100 text-sm mt-1.5">Your application is under review.</p>
                </div>

                {/* Body */}
                <div className="px-8 py-8 space-y-6">
                    <div className="space-y-3 text-left">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
                            <p className="text-sm text-[#1A2F1A]">Your mess workspace has been <strong>created successfully.</strong></p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Loader2 className={`h-5 w-5 text-amber-400 shrink-0 mt-0.5 ${isChecking ? 'animate-spin' : ''}`} />
                            <p className="text-sm text-[#1A2F1A]">Your mess is currently <strong className="text-amber-600">&apos;Pending Approval&apos;</strong> by Senpai. You will be able to access your dashboard once approved.</p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#F7F9F7] border border-[#E1E8E1] p-4 text-sm text-[#064E3B]/80 leading-relaxed">
                        Once approved, log in with your credentials at{' '}
                        <Link href="/admin/login" className="font-semibold text-[#10B981] underline">
                            /admin/login
                        </Link>{' '}
                        to access your dashboard.
                    </div>

                    <Link
                        href="/admin/login"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm transition-all shadow-md shadow-[#10B981]/20 hover:-translate-y-0.5"
                    >
                        <LogIn className="h-4 w-4" />
                        Go to Login
                    </Link>

                    <p className="text-center text-[11px] text-[#556B55]/60 tracking-wide">
                        Powered by <span className="font-mono font-bold text-[#1A2F1A]">MayazAD</span>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
