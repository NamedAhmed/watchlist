import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { DEFAULT_LAYOUT } from '@/app/types'
import PublicProfile from './PublicProfile'
import type { Pick } from '@/app/components/ProfilePicks'

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, layout')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: entries } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', profile.id)
    .order('rank', { ascending: true })

  return (
    <PublicProfile
      username={profile.username}
      entries={entries ?? []}
      layout={profile.layout ?? DEFAULT_LAYOUT}
    />
  )
}