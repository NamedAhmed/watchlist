'use client'

import { CardLayout, DEFAULT_LAYOUT } from '@/app/types'
import { loadEntries, saveEntry, deleteEntry, loadLayout } from '@/lib/storage'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Entry } from '@/app/types'
import type { Pick }       from '@/app/components/ProfilePicks'
import Header              from '@/app/components/Header'
import DraggableList       from '@/app/components/DraggableList'
import Modal               from '@/app/components/Modal'
import UsernameModal       from '@/app/components/UsernameModal'
import ProfilePicks        from '@/app/components/ProfilePicks'
import ProfilePicksEditor  from '@/app/components/ProfilePicksEditor'
import type { User }       from '@supabase/supabase-js'
import EditModal from '@/app/components/EditModal'

export default function Home() {
  const [user,             setUser]             = useState<User | null>(null)
  const [entries,          setEntries]          = useState<Entry[]>([])
  const [activeTab,        setActiveTab]        = useState<'movies' | 'tv'>('movies')
  const [modalOpen,        setModalOpen]        = useState(false)
  const [editing,          setEditing]          = useState<Entry | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [username,         setUsername]         = useState<string | null>(null)
  const [showUserModal,    setShowUserModal]    = useState(false)
  const [layout,           setLayout]           = useState<CardLayout>(DEFAULT_LAYOUT)
  const [picks,            setPicks]            = useState<Pick[]>([])
  const [picksEditorOpen,  setPicksEditorOpen]  = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setEntries([]); setLoading(false); return }
    async function init() {
      setLoading(true)
      const [saved, userLayout] = await Promise.all([loadEntries(user!.id), loadLayout(user!.id)])
      setEntries(saved)
      if (userLayout) setLayout(userLayout)
      setLoading(false)
    }
    init()
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('username, picks').eq('id', user.id).single().then(({ data }) => {
      if (data?.username) { setUsername(data.username); setPicks(data.picks ?? []) }
      else setShowUserModal(true)
    })
  }, [user])

  async function handleSave(entry: Entry) {
    if (!user) return
    const exists = entries.find(e => e.id === entry.id)
    if (!exists) {
      const maxRank = entries.filter(e => e.type === entry.type).reduce((m, e) => Math.max(m, e.rank), 0)
      entry.rank = maxRank + 1
    }
    await saveEntry(entry, user.id)
    setEntries(prev => exists ? prev.map(e => e.id === entry.id ? entry : e) : [...prev, entry])
    setModalOpen(false); setEditing(null)
  }

  async function handleDelete(id: string) {
    await deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function handleRate(id: string, rating: number) {
    if (!user) return
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    const updated = { ...entry, rating: entry.rating === rating ? 0 : rating }
    await saveEntry(updated, user.id)
    setEntries(prev => prev.map(e => e.id === id ? updated : e))
  }

  async function handleReorder(reordered: Entry[]) {
    if (!user) return
    setEntries(prev => { const map = new Map(reordered.map(e => [e.id, e])); return prev.map(e => map.get(e.id) ?? e) })
    for (const entry of reordered) await saveEntry(entry, user.id)
  }

  async function handleSavePicks(newPicks: Pick[]) {
    if (!user) return
    setPicks(newPicks)
    await supabase.from('profiles').update({ picks: newPicks }).eq('id', user.id)
  }

  function handleAccountDeleted() {
    setUser(null); setEntries([]); setUsername(null); router.push('/')
  }

  const safeLayout = { ...DEFAULT_LAYOUT, ...layout, poster: layout.poster ?? DEFAULT_LAYOUT.poster, elements: layout.elements ?? DEFAULT_LAYOUT.elements }
  const visible    = entries.filter(e => e.type === activeTab).sort((a, b) => b.rating - a.rating || a.rank - b.rank)

  return (
    <div style={{ background:'#111111', minHeight:'100vh' }}>
      <div style={{ maxWidth:'700px', margin:'0 auto', padding:'48px 24px 80px' }}>

        <Header
          activeTab={activeTab}
          entries={entries}
          onSwitch={setActiveTab}
          onAdd={() => { setEditing(null); setModalOpen(true) }}
          isOwner={!!user}
          username={username}
          userId={user?.id ?? null}
          onDesign={() => router.push('/design')}
          onUsernameChange={setUsername}
          onAccountDeleted={handleAccountDeleted}
          accentColor={layout.accentColor}
        />


  
        {!user ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'#555' }}>
            <p style={{ fontSize:'1.3rem', color:'#eaeaea', marginBottom:'8px', fontFamily:'Georgia, serif', fontWeight:400 }}>Sign in to build your list</p>
            <p style={{ fontSize:'0.85rem' }}>Your watchlist saves to the cloud and gets its own shareable URL.</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#555', fontSize:'0.85rem' }}>Loading…</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#555' }}>
            <p style={{ fontSize:'1.3rem', color:'#eaeaea', marginBottom:'8px' }}>Nothing here yet</p>
            <p style={{ fontSize:'0.85rem' }}>Hit &ldquo;+ Add&rdquo; to get started.</p>
          </div>
        ) : (
          <DraggableList
            entries={visible}
            layout={safeLayout}
            onRate={handleRate}
            onEdit={e => { setEditing(e); setModalOpen(true) }}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        )}

      </div>

      {/* Add modal — only for new entries */}
      <Modal
        isOpen={modalOpen && !editing}
        editing={null}
        active={activeTab}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditing(null) }}
      />

      {/* Edit modal — only for existing entries */}
      {editing && modalOpen && (
        <EditModal
          entry={editing}
          onSave={entry => { handleSave(entry) }}
          onClose={() => { setModalOpen(false); setEditing(null) }}
        />
      )}

      {showUserModal && user && (
        <UsernameModal userId={user.id} onDone={name => { setUsername(name); setShowUserModal(false) }} />
      )}

      {picksEditorOpen && (
        <ProfilePicksEditor initialPicks={picks} onSave={handleSavePicks} onClose={() => setPicksEditorOpen(false)} />
      )}

    </div>
  )
}