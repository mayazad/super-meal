'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, KeyRound, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [messSlug, setMessSlug] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        // Look up the admin profile using email + slug
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('email', email.toLowerCase().trim())
            .eq('mess_slug', messSlug.toLowerCase().trim())
            .single()

        if (profileError || !profile) {
            setError('No account found with that email and mess slug combination. Double-check your details.')
            setIsLoading(false)
            return
        }

        if (profile.role !== 'admin') {
            setError('This account is not an active admin workspace. Contact MayazAD for help.')
            setIsLoading(false)
            return
        }

        // Insert a reset claim (no token yet — Senpai approves and generates the link)
        const { error: claimError } = await supabase
            .from('password_reset_claims')
            .insert([{
                admin_id: profile.id,
                admin_email: email.toLowerCase().trim(),
            }])

        if (claimError) {
            setError('Could not submit request. You may have a pending request already. Contact MayazAD directly.')
            setIsLoading(false)
            return
        }

        setSuccess(true)
        setIsLoading(false)
    }

    return (
        <div data-theme="emerald" className="flex min-h-screen items-center justify-center p-4 bg-[#F7F9F7]">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md rounded-3xl border border-[#D1E4D1] bg-white p-8 shadow-sm space-y-7"
            >
                <div className="space-y-1.5 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-11 w-11 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shadow-md shadow-[#10B981]/20">
                            <KeyRound className="h-5 w-5" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2F1A]">Forgot Password?</h1>
                    <p className="text-sm text-[#556B55]">Enter your credentials to submit a reset request to MayazAD.</p>
                </div>

                {success ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl bg-[#ECFDF5] border border-[#10B981]/30 p-6 text-center space-y-3"
                    >
                        <CheckCircle className="h-10 w-10 text-[#10B981] mx-auto" />
                        <h2 className="font-bold text-[#064E3B] text-lg">Request Submitted!</h2>
                        <p className="text-sm text-[#556B55] leading-relaxed">
                            Your reset request has been logged. Contact <strong>MayazAD</strong> and they will send you a secure reset link.
                        </p>
                        <Link href="/admin/login" className="inline-block mt-2 text-sm font-semibold text-[#10B981] hover:underline">
                            Back to Login →
                        </Link>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-[#1A2F1A]">Admin Email</label>
                            <input
                                type="email"
                                required
                                placeholder="your-email@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="flex h-11 w-full rounded-xl border border-[#D1E4D1] bg-[#F7F9F7] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-shadow"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-[#1A2F1A]">Mess Slug</label>
                            <input
                                type="text"
                                required
                                placeholder="your-mess-slug"
                                value={messSlug}
                                onChange={e => setMessSlug(e.target.value)}
                                className="flex h-11 w-full rounded-xl border border-[#D1E4D1] bg-[#F7F9F7] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-shadow"
                            />
                            <p className="text-[11px] text-[#556B55]/70">The slug you chose when registering (e.g. skyline-mess)</p>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#10B981] px-4 text-sm font-bold text-white transition-all hover:bg-[#059669] shadow-md shadow-[#10B981]/20 disabled:opacity-50 hover:-translate-y-0.5 mt-2"
                        >
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit Reset Request'}
                        </button>
                    </form>
                )}

                <div className="text-center text-sm text-[#556B55]">
                    Remember your password?{' '}
                    <Link href="/admin/login" className="font-semibold text-[#1A2F1A] underline hover:text-[#10B981]">Back to Login</Link>
                </div>
            </motion.div>
        </div>
    )
}
