'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

type Props = { children: React.ReactNode }

export default function ThemeProvider({ children }: Props) {
    const supabase = createClient()

    const applyTheme = (theme: string) => {
        document.documentElement.setAttribute('data-theme', theme || 'classic')
    }

    useEffect(() => {
        // 1. Get the current user, then load their personal theme from profiles
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase
                .from('profiles')
                .select('selected_theme')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data?.selected_theme) applyTheme(data.selected_theme)
                })
        })

        // 2. Subscribe to realtime changes on the user's own profile row
        const setupChannel = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const channel = supabase
                .channel(`theme-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newTheme = payload.new?.selected_theme
                        if (newTheme) applyTheme(newTheme)
                    }
                )
                .subscribe()

            return channel
        }

        let channelRef: ReturnType<typeof supabase.channel> | undefined
        setupChannel().then(ch => { channelRef = ch })

        return () => {
            if (channelRef) supabase.removeChannel(channelRef)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return <>{children}</>
}
