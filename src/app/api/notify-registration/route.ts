import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    // Instantiate inside handler so it only runs at request-time, not build-time
    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
        const { messName, adminEmail, messSlug } = await request.json()

        const notifyEmail = process.env.SENPAI_NOTIFICATION_EMAIL
        if (!notifyEmail) {
            return NextResponse.json({ ok: false, error: 'Notification email not configured' }, { status: 500 })
        }

        await resend.emails.send({
            from: 'SuperMeal <onboarding@resend.dev>',
            to: notifyEmail,
            subject: `🍽️ New Mess Registration: ${messName}`,
            html: `
                <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; background: #10B981; color: white; font-weight: 800; font-size: 18px; padding: 8px 16px; border-radius: 8px;">SM</div>
                        <h1 style="color: #064E3B; font-size: 22px; margin: 12px 0 4px;">New Mess Registration</h1>
                        <p style="color: #6b7280; font-size: 14px; margin: 0;">Pending your approval at the Senpai Dashboard</p>
                    </div>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="color: #6b7280; padding: 8px 0; border-bottom: 1px solid #f3f4f6; width: 40%;">Mess Name</td>
                                <td style="font-weight: 600; color: #064E3B; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${messName}</td>
                            </tr>
                            <tr>
                                <td style="color: #6b7280; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">Admin Email</td>
                                <td style="font-weight: 600; color: #064E3B; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${adminEmail}</td>
                            </tr>
                            <tr>
                                <td style="color: #6b7280; padding: 8px 0;">Public Slug</td>
                                <td style="font-weight: 600; color: #064E3B; padding: 8px 0;">/view/${messSlug}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/senpai" style="display: inline-block; background: #10B981; color: white; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
                            Go to Senpai Dashboard →
                        </a>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">SuperMeal · Crafted by MayazAD</p>
                </div>
            `,
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('notify-registration error:', err)
        // Non-blocking — never let this fail the registration
        return NextResponse.json({ ok: false }, { status: 200 })
    }
}
