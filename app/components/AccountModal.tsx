'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  userId:           string
  currentUsername:  string
  onUsernameChange: (name: string) => void
  onAccountDeleted: () => void
  onClose:          () => void
}

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

export default function AccountModal({ userId, currentUsername, onUsernameChange, onAccountDeleted, onClose }: Props) {
  const [tab,         setTab]         = useState<'username' | 'danger'>('username')
  const [newUsername, setNewUsername] = useState(currentUsername)
  const [usernameErr, setUsernameErr] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting,    setDeleting]    = useState(false)
  const [deleteErr,   setDeleteErr]   = useState('')

  async function handleChangeUsername() {
    const cleaned = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleaned.length < 3) { setUsernameErr('At least 3 characters. Letters, numbers, underscores only.'); return }
    if (cleaned === currentUsername) { setUsernameErr("That's already your username."); return }
    setSaving(true); setUsernameErr('')
    const { error } = await supabase.from('profiles').update({ username: cleaned }).eq('id', userId)
    setSaving(false)
    if (error) {
      setUsernameErr(error.code === '23505' ? 'That username is already taken.' : 'Something went wrong.')
      return
    }
    onUsernameChange(cleaned)
    onClose()
  }

  async function handleDelete() {
    if (deleteInput !== 'DELETE') return
    setDeleting(true); setDeleteErr('')
    try {
      await supabase.from('entries').delete().eq('user_id', userId)
      await supabase.from('profiles').delete().eq('id', userId)
      await supabase.auth.signOut()
      onAccountDeleted()
    } catch {
      setDeleteErr('Something went wrong. Try again.')
      setDeleting(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
    >
      <div style={{ background:'#1a1a1a', border:'1px solid #252525', borderRadius:'18px', width:'100%', maxWidth:'420px', overflow:'hidden' }}>

        <div style={{ padding:'26px 28px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontFamily:'Georgia, serif', fontSize:'1.35rem', fontWeight:400, color:'#eaeaea' }}>Account settings</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#444', cursor:'pointer', fontSize:'1.4rem', lineHeight:1, padding:'2px 6px' }}>×</button>
        </div>

        <div style={{ display:'flex', padding:'18px 28px 0', gap:'4px' }}>
          {(['username', 'danger'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'7px 16px', background: tab===t ? '#252525' : 'transparent',
              border:'1px solid', borderColor: tab===t ? '#333' : 'transparent',
              borderRadius:'8px', color: tab===t ? '#eaeaea' : '#555',
              fontSize:'0.78rem', cursor:'pointer', transition:'all 0.15s',
            }}>
              {t === 'username' ? 'Username' : '⚠ Danger zone'}
            </button>
          ))}
        </div>

        <div style={{ padding:'24px 28px 30px' }}>

          {tab === 'username' && (
            <>
              <p style={{ fontSize:'0.8rem', color:'#555', marginBottom:'16px', lineHeight:1.6 }}>
                Changing your username will move your public profile to the new URL.
              </p>
              <label style={{ display:'block', fontSize:'0.68rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'7px' }}>New username</label>
              <input
                value={newUsername}
                onChange={e => { setNewUsername(e.target.value); setUsernameErr('') }}
                onKeyDown={e => e.key === 'Enter' && handleChangeUsername()}
                maxLength={24}
                style={{ width:'100%', padding:'10px 14px', background:'#141414', border:`1px solid ${usernameErr ? '#ff6b6b' : '#2a2a2a'}`, borderRadius:'8px', color:'#eaeaea', fontSize:'0.9rem', outline:'none', fontFamily:'Georgia, serif' }}
              />
              {usernameErr && <p style={{ fontSize:'0.75rem', color:'#ff6b6b', marginTop:'7px' }}>{usernameErr}</p>}
              <button
                onClick={handleChangeUsername}
                disabled={saving}
                style={{ marginTop:'16px', width:'100%', padding:'11px', background: saving ? '#2a2a2a' : '#ff6b6b', color: saving ? '#555' : '#fff', border:'none', borderRadius:'8px', fontSize:'0.85rem', fontWeight:500, cursor: saving ? 'not-allowed' : 'pointer', transition:`background 200ms ${SPRING}` }}
              >
                {saving ? 'Saving…' : 'Save username'}
              </button>
            </>
          )}

          {tab === 'danger' && (
            <>
              <div style={{ background:'rgba(200,40,40,0.07)', border:'1px solid rgba(200,40,40,0.18)', borderRadius:'10px', padding:'14px 16px', marginBottom:'20px' }}>
                <p style={{ fontSize:'0.8rem', color:'#c04040', lineHeight:1.65, margin:0 }}>
                  This permanently deletes your account, your entire watchlist, your profile picks, and your public URL. <strong style={{ color:'#e05555' }}>There is no undo.</strong>
                </p>
              </div>
              <label style={{ display:'block', fontSize:'0.68rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'7px' }}>
                Type <span style={{ color:'#cc3333', fontWeight:600 }}>DELETE</span> to confirm
              </label>
              <input
                value={deleteInput}
                onChange={e => { setDeleteInput(e.target.value); setDeleteErr('') }}
                placeholder="DELETE"
                style={{ width:'100%', padding:'10px 14px', background:'#141414', border:'1px solid #2a2a2a', borderRadius:'8px', color:'#eaeaea', fontSize:'0.9rem', outline:'none' }}
              />
              {deleteErr && <p style={{ fontSize:'0.75rem', color:'#ff6b6b', marginTop:'7px' }}>{deleteErr}</p>}
              <button
                onClick={handleDelete}
                disabled={deleteInput !== 'DELETE' || deleting}
                style={{
                  marginTop:'16px', width:'100%', padding:'11px',
                  background: deleteInput === 'DELETE' && !deleting ? '#991111' : '#1c1c1c',
                  color: deleteInput === 'DELETE' ? '#fff' : '#444',
                  border: deleteInput === 'DELETE' ? 'none' : '1px solid #2a2a2a',
                  borderRadius:'8px', fontSize:'0.85rem', fontWeight:500,
                  cursor: deleteInput === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                  transition:'all 0.2s',
                }}
              >
                {deleting ? 'Deleting…' : 'Permanently delete my account'}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}