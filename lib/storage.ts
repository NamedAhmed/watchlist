import { supabase } from '@/lib/supabase'
import { Entry } from '@/app/types'
import { CardLayout } from '@/app/types'

const KEY = 'watchlist-v1'

export async function loadEntries(userId: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('rank', { ascending: true })

  if (error) { console.error('loadEntries:', error); return [] }
  return data as Entry[]
}

export async function saveEntry(entry: Entry, userId: string): Promise<void> {
  // Always stamp user_id — never rely on the entry object having it
  const row = {
    id:       entry.id,
    user_id:  userId,
    type:     entry.type,
    title:    entry.title,
    year:     entry.year,
    poster:   entry.poster,
    imdb:     entry.imdb,
    rating:   entry.rating,
    note:     entry.note,
    rank:     entry.rank,
  }

  const { error } = await supabase
    .from('entries')
    .upsert(row, { onConflict: 'id' })

  if (error) console.error('saveEntry:', JSON.stringify(error))
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)

  if (error) console.error('deleteEntry:', JSON.stringify(error))
}

export async function saveLayout(userId: string, layout: CardLayout): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ layout })
    .eq('id', userId)
  if (error) console.error('saveLayout:', JSON.stringify(error))
}

export async function loadLayout(userId: string): Promise<CardLayout | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('layout')
    .eq('id', userId)
    .single()
  if (error || !data?.layout) return null
  return data.layout as CardLayout
}