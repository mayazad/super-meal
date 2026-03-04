'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, KeyRound, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function ResetForm() {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isValidating, setIsValidating] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [tokenValid, setTokenValid] = useState(false)

    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')

    // Quick client-side check that token looks valid (actual check is in API)
    useEffect(() => {
        if (!token) {
            setError('No reset token provided. Please use the link sent to you.')
            setIsValidating(false)
            return
        }
        // We don't need to pre-validate on the client since POST will validate
        setTokenValid(true)
        setIsValidating(false)
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }

        setIsLoading(true)
        setError(null)

        const res = await fetch('/api/apply-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        })
        const data = await res.json()

        if (!res.ok || data.error) {
            setError(data.error || 'Failed to reset password.')
            setIsLoading(false)
            return
        }

        setSuccess(true)
        setTimeout(() => router.push('/admin/login'), 3000)
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
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2F1A]">Set New Password</h1>
                    <p className="text-sm text-[#556B55]">Choose a strong password for your admin account.</p>
                </div>

                {isValidating ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-[#10B981]" />
                    </div>
                ) : success ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl bg-[#ECFDF5] border border-[#10B981]/30 p-6 text-center space-y-3"
                    >
                        <CheckCircle className="h-10 w-10 text-[#10B981] mx-auto" />
                        <h2 className="font-bold text-[#064E3B] text-lg">Password Updated!</h2>
                        <p className="text-sm text-[#556B55]">Redirecting you to login in a moment...</p>
                    </motion.div>
                ) : !tokenValid ? (
                    <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center space-y-3">
                        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                        <Link href="/admin/forgot-password" className="inline-block mt-2 text-sm font-semibold text-[#10B981] hover:underline">
                            Request a new link →
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-[#1A2F1A]">New Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="At least 6 characters"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="flex h-11 w-full rounded-xl border border-[#D1E4D1] bg-[#F7F9F7] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-shadow"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-[#1A2F1A]">Confirm Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="Repeat your new password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="flex h-11 w-full rounded-xl border border-[#D1E4D1] bg-[#F7F9F7] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-shadow"
                            />
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
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Set New Password'}
                        </button>
                    </form>
                )}

                <div className="text-center text-sm text-[#556B55]">
                    <Link href="/admin/login" className="font-semibold text-[#1A2F1A] underline hover:text-[#10B981]">Back to Login</Link>
                </div>
            </motion.div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        }>
            <ResetForm />
        </Suspense>
    )
}
