import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { token, newPassword } = await request.json()

        if (!token || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Validate token: must exist, be unused, and not expired
        const { data: claim, error: lookupError } = await adminClient
            .from('password_reset_claims')
            .select('*')
            .eq('token', token)
            .eq('is_used', false)
            .single()

        if (lookupError || !claim) {
            return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
        }

        if (claim.expires_at && new Date(claim.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })
        }

        // Update the user's password via admin API
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            claim.admin_id,
            { password: newPassword }
        )

        if (updateError) throw updateError

        // Mark token as used
        await adminClient
            .from('password_reset_claims')
            .update({ is_used: true })
            .eq('id', claim.id)

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('apply-reset error:', err)
        return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 })
    }
}
