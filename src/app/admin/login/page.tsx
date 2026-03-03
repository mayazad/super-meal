import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default async function LoginPage() {
    const supabase = await createClient()

    // If already logged in, redirect to dashboard
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
        redirect('/admin/dashboard')
    }

    return (
        <div data-theme="emerald" className="flex min-h-screen items-center justify-center p-4 bg-[#F7F9F7]">
            <LoginForm />
        </div>
    )
}
