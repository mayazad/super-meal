import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import RegisterForm from './register-form'

export default async function RegisterPage() {
    const supabase = await createClient()

    // If already logged in, redirect based on role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'senpai') redirect('/senpai')
        if (profile?.role === 'admin') redirect('/admin/dashboard')
        redirect('/register/pending')
    }

    return (
        <div data-theme="emerald" className="flex min-h-screen items-center justify-center p-4 bg-[#F7F9F7]">
            <RegisterForm />
        </div>
    )
}
