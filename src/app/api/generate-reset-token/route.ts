import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServerClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
    try {
        // Verify caller is the senpai
        const supabaseServer = await createServerClient()
        const { data: { user } } = await supabaseServer.auth.getUser()
        if (!user || user.email !== process.env.NEXT_PUBLIC_SENPAI_EMAIL) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { claimId } = await request.json()

        // Use service role client to update the claim
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Generate token and set 1-hour expiry
        const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

        const { error } = await adminClient
            .from('password_reset_claims')
            .update({ token, expires_at: expiresAt })
            .eq('id', claimId)

        if (error) throw error

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const resetLink = `${siteUrl}/admin/reset-password?token=${token}`

        return NextResponse.json({ ok: true, resetLink })
    } catch (err) {
        console.error('generate-reset-token error:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
