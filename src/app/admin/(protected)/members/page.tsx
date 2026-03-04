'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAdmin } from '@/hooks/use-admin'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Loader2, RotateCcw } from 'lucide-react'
import { SkeletonRow } from '@/components/ui/skeleton'
import { PageError } from '@/components/ui/page-error'

type Member = {
    id: string
    name: string
    is_active: boolean
    created_at: string
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [newMemberName, setNewMemberName] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const supabase = createClient()

    const { adminId } = useAdmin()

    const fetchMembers = async () => {
        if (!adminId) return
        setIsLoading(true)
        setError(null)
        try {
            const { data, error: fetchErr } = await supabase
                .from('members').select('*').eq('admin_id', adminId).order('created_at', { ascending: true })
            if (fetchErr) throw fetchErr
            if (data) setMembers(data)
        } catch {
            setError('Failed to load members.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchMembers()
    }, [adminId]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMemberName.trim()) return

        setIsSubmitting(true)
        const { data, error } = await supabase
            .from('members')
            .insert([{ name: newMemberName.trim(), is_active: true, admin_id: adminId }])
            .select()

        if (!error && data) {
            setMembers([...members, data[0]])
            setNewMemberName('')
        }
        setIsSubmitting(false)
    }

    const handleDeleteMember = async (id: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return

        // We update is_active to false rather than hard delete to preserve historical meal data
        const { error } = await supabase
            .from('members')
            .update({ is_active: false })
            .eq('id', id)
            .eq('admin_id', adminId)

        if (!error) {
            setMembers(members.map(m => m.id === id ? { ...m, is_active: false } : m))
        }
    }

    const handleReactivateMember = async (id: string) => {
        if (!confirm('Reactivate this former roommate? They will appear in all active lists again.')) return
        const { error } = await supabase
            .from('members')
            .update({ is_active: true })
            .eq('id', id)
            .eq('admin_id', adminId)
        if (!error) {
            setMembers(members.map(m => m.id === id ? { ...m, is_active: true } : m))
        }
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Members</h1>
                <p className="text-muted-foreground mt-1">
                    Manage roommates and their active status.
                </p>
            </div>

            <form onSubmit={handleAddMember} className="flex gap-2">
                <input
                    type="text"
                    placeholder="New roommate name..."
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !newMemberName.trim()}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isSubmitting ? '' : 'Add'}
                </button>
            </form>

            {error ? (
                <PageError message={error} onRetry={fetchMembers} />
            ) : isLoading ? (
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden divide-y">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={3} />)}
                </div>
            ) : members.length === 0 ? (
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden p-8 text-center text-muted-foreground">
                    No members found. Add your first roommate above.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Active Members */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <div className="bg-muted/30 border-b px-4 py-3 font-semibold text-sm">Active Roommates</div>
                        <div className="divide-y relative">
                            <AnimatePresence>
                                {members.filter(m => m.is_active).map((member) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex items-center justify-between p-4"
                                    >
                                        <div>
                                            <p className="font-medium flex items-center gap-2">{member.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Added {new Date(member.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMember(member.id)}
                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                            title="Deactivate Member"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </motion.div>
                                ))}
                                {members.filter(m => m.is_active).length === 0 && (
                                    <div className="p-6 text-center text-sm text-muted-foreground">No active roommates.</div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Former Members */}
                    {members.filter(m => !m.is_active).length > 0 && (
                        <div className="rounded-xl border border-dashed bg-card text-card-foreground shadow-sm overflow-hidden opacity-75">
                            <div className="bg-muted/30 border-b px-4 py-3 font-semibold text-sm text-muted-foreground flex justify-between items-center">
                                Former Roommates
                                <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded-full">Archive Data Retained</span>
                            </div>
                            <div className="divide-y">
                                {members.filter(m => !m.is_active).map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-4 bg-muted/20">
                                        <div>
                                            <p className="font-medium text-muted-foreground">{member.name}</p>
                                            <p className="text-xs text-muted-foreground/60">
                                                Joined {new Date(member.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleReactivateMember(member.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-md transition-colors border border-emerald-200 dark:border-emerald-800"
                                            title="Reactivate Member"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            Reactivate
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
