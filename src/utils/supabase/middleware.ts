import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()
    const path = url.pathname

    const isLoginPath = path.startsWith('/admin/login') || path === '/register'
    const isAdminPath = path.startsWith('/admin') && !isLoginPath
    const isSenpaiPath = path.startsWith('/senpai')
    const isViewPath = path.startsWith('/view')

    // Public routes that don't need auth checks
    if (isViewPath) return supabaseResponse

    if (!user) {
        if (isAdminPath || isSenpaiPath || path.startsWith('/register/pending')) {
            url.pathname = '/admin/login'
            return NextResponse.redirect(url)
        }
        return supabaseResponse
    }

    // User is authenticated, check role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role || 'pending_admin'

    const email = user.email

    // Redirect authenticated users away from login pages
    if (isLoginPath) {
        if (role === 'senpai' && email === 'mayaz@adnan.hossain') url.pathname = '/senpai'
        else if (role === 'admin') url.pathname = '/admin/dashboard'
        else url.pathname = '/register/pending'
        return NextResponse.redirect(url)
    }

    // Role-based protection: Senpai only - Strictly locked to mayaz@adnan.hossain
    if (isSenpaiPath && (role !== 'senpai' || email !== 'mayaz@adnan.hossain')) {
        url.pathname = role === 'admin' ? '/admin/dashboard' : '/register/pending'
        return NextResponse.redirect(url)
    }

    // Role-based protection: Admin paths (Senpai can also access admin paths if they want)
    if (isAdminPath && role === 'pending_admin') {
        url.pathname = '/register/pending'
        return NextResponse.redirect(url)
    }

    // Role-based protection: Pending admin shouldn't see pending page if they are already upgraded
    if (path.startsWith('/register/pending')) {
        if (role === 'senpai' && email === 'mayaz@adnan.hossain') {
            url.pathname = '/senpai'
            return NextResponse.redirect(url)
        } else if (role === 'admin' || role === 'senpai') { // If they have senpai role but wrong email, they go to admin dash
            url.pathname = '/admin/dashboard'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
