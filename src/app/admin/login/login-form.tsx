'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                if (user.email === process.env.NEXT_PUBLIC_SENPAI_EMAIL) {
                    router.push('/senpai')
                } else {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
                    const role = profile?.role
                    if (role === 'admin') router.push('/admin/dashboard')
                    else router.push('/register/pending')
                }
                router.refresh()
            }
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md space-y-8 rounded-2xl border bg-background p-8 shadow-sm"
        >
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-semibold tracking-tight">Admin Login</h1>
                <p className="text-sm text-muted-foreground">Enter your credentials to manage the app</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="admin@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : 'Sign In'}
                </button>
            </form>

            <div className="text-center">
                <a href="/admin/forgot-password" className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors underline">
                    Forgot password? Request a reset
                </a>
            </div>

            <div className="text-center text-sm text-muted-foreground mt-4">
                Don&apos;t have an account? <a href="/register" className="underline hover:text-foreground">Create Workspace</a>
            </div>

            <p className="text-center text-[11px] text-muted-foreground/50 tracking-wide mt-4">
                Powered by <span className="font-mono font-semibold brand-glow">MayazAD</span>
            </p>
        </motion.div>
    )
}
