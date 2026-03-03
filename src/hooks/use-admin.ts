'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useAdmin() {
    const [adminId, setAdminId] = useState<string | null>(null)
    const [adminEmail, setAdminEmail] = useState<string | null>(null)
    const [isAuthLoading, setIsAuthLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setAdminId(data.user.id)
                setAdminEmail(data.user.email ?? '')
            }
            setIsAuthLoading(false)
        })
    }, [])

    return { adminId, adminEmail, isAuthLoading }
}
