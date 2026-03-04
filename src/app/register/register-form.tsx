'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function RegisterForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [messName, setMessName] = useState('')
    const [messSlug, setMessSlug] = useState('')
    const [slugEdited, setSlugEdited] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    // Auto-generate slug from mess name unless user has manually edited it
    useEffect(() => {
        if (!slugEdited) {
            setTimeout(() => {
                setMessSlug(messName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
            }, 0)
        }
    }, [messName, slugEdited])

    const handleSlugChange = (val: string) => {
        setSlugEdited(true)
        // Only allow URL-safe characters
        setMessSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-'))
    }

    const validateSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!messName.trim()) { setError('Mess Name is required'); return }
        if (!validateSlug(messSlug)) { setError('Slug must be lowercase letters, numbers, and hyphens only (no leading/trailing hyphens)'); return }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return }

        setIsLoading(true)
        setError(null)

        // 1. Try to create user in Supabase Auth
        let { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

        // Handle: email already registered in Auth (orphaned user with no profile)
        if (authError?.message?.toLowerCase().includes('already registered') ||
            authError?.message?.toLowerCase().includes('user already registered') ||
            authError?.code === 'user_already_exists') {

            // Try signing in with the provided credentials
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

            if (signInError) {
                // Wrong password — genuinely different account
                setError('This email is already registered. Please go to /admin/login to sign in.')
                setIsLoading(false)
                return
            }

            // Signed in — check if they already have a profile
            const { data: existingProfile } = await supabase.from('profiles').select('id, role').eq('id', signInData.user.id).single()

            if (existingProfile) {
                // Profile exists — just redirect them based on role
                await supabase.auth.signOut()
                if (existingProfile.role === 'admin') {
                    setError('Your account is already active. Please log in at /admin/login.')
                } else {
                    router.push('/register/pending')
                }
                setIsLoading(false)
                return
            }

            // No profile yet — orphaned auth user. Use their ID to complete registration.
            authData = signInData
            authError = null
        }

        if (authError) {
            setError(authError.message)
            setIsLoading(false)
            return
        }

        const user = authData?.user
        if (user) {
            // 2. Create profile with pending_admin role
            const { error: profileError } = await supabase.from('profiles').insert([{
                id: user.id,
                email: user.email,
                mess_name: messName.trim(),
                mess_slug: messSlug,
                role: 'pending_admin'
            }])

            if (profileError) {
                if (profileError.message.includes('duplicate') || profileError.code === '23505') {
                    setError('That slug is already taken. Please choose a different one.')
                } else {
                    setError('Could not create profile: ' + profileError.message)
                }
                setIsLoading(false)
                return
            }

            // Notify senpai — fire and forget, never block the user
            fetch('/api/notify-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messName: messName.trim(), adminEmail: email, messSlug }),
            }).catch(() => { }) // ignore errors silently

            // Sign out immediately — don't auto-login
            await supabase.auth.signOut()
            router.push('/register/pending')
        } else {
            setError('Registration failed. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md rounded-3xl border border-[#D1E4D1] bg-white p-8 shadow-sm space-y-7"
        >
            <div className="space-y-1.5 text-center">
                <div className="flex justify-center mb-4">
                    <div className="h-11 w-11 rounded-2xl bg-[#10B981] text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-[#10B981]/20">SM</div>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2F1A]">Start Your Mess</h1>
                <p className="text-sm text-[#556B55]">Request a workspace — approved by Senpai before activation.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
                {/* Mess Name */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[#1A2F1A]">Mess Name</label>
                    <input
                        type="text"
                        placeholder="e.g. Skyline Mess"
                        required
                        value={messName}
                        onChange={(e) => setMessName(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-[#D1E4D1] bg-[#F7F9F7] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-shadow"
                    />
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[#1A2F1A]">
                        Unique Slug
                        <span className="ml-1.5 text-[10px] font-normal text-[#556B55] normal-case">Your public URL: /view/<strong>{messSlug || 'your-slug'}</strong></span>
                    </label>
                    <div className={`flex h-11 items-center rounded-xl border ${validateSlug(messSlug) && messSlug ? 'border-[#10B981]' : 'border-[#D1E4D1]'} bg-[#F7F9F7] px-3 transition-all focus-within:ring-2 focus-within:ring-[#10B981]`}>
                        <span className="text-xs text-[#556B55]/60 mr-1 shrink-0">slug/</span>
                        <input
                            type="text"
                            placeholder="skyline-mess"
                            required
                            value={messSlug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            className="flex-1 bg-transparent text-sm focus-visible:outline-none min-w-0"
                        />
                        {messSlug && (
                            validateSlug(messSlug)
                                ? <CheckCircle className="h-4 w-4 text-[#10B981] shrink-0" />
                                : <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                    </div>
                    <p className="text-[11px] text-[#556B55]/70">Lowercase letters, numbers, hyphens only. Auto-generated from mess name.</p>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[#1A2F1A]">Admin Email</label>
                    <input
                        type="email"
                        placeholder="admin@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-[#D1E4D1] bg-[#F7F9F7] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-shadow"
                    />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[#1A2F1A]">Password <span className="text-[11px] font-normal text-[#556B55]">(min 6 characters)</span></label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="flex h-11 w-full rounded-xl border border-[#D1E4D1] bg-[#F7F9F7] px-3 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] transition-shadow"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#556B55]/60 hover:text-[#10B981] transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#10B981] px-4 text-sm font-bold text-white transition-all hover:bg-[#059669] shadow-md shadow-[#10B981]/20 disabled:opacity-50 hover:-translate-y-0.5 mt-2"
                >
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit Registration'}
                </button>
            </form>

            <div className="text-center text-sm text-[#556B55]">
                Already have an account?{' '}
                <Link href="/admin/login" className="font-semibold text-[#1A2F1A] underline hover:text-[#10B981]">Log in</Link>
            </div>

            <p className="text-center text-[11px] text-[#556B55]/60 tracking-wide">
                Powered by <span className="font-mono font-bold text-[#1A2F1A]">MayazAD</span>
            </p>
        </motion.div>
    )
}
