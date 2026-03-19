'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  userId: string
  onDone: (username: string) => void
}

export default function UsernameModal({ userId, onDone }: Props) {
  const [value,   setValue]   = useState('')
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    const username = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!username || username.length < 3) {
      setError('At least 3 characters. Letters, numbers, underscores only.')
      return
    }

    setSaving(true)
    setError('')

    const { error: dbError } = await supabase
      .from('profiles')
      .insert({ id: userId, username })

    if (dbError) {
      if (dbError.code === '23505') {
        setError('That username is taken. Try another.')
      } else {
        setError('Something went wrong. Try again.')
      }
      setSaving(false)
      return
    }

    onDone(username)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#1e1e1e',
        border: '1px solid #2a2a2a',
        borderRadius: '16px',
        padding: '36px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h2 style={{
          fontFamily: 'Georgia, serif',
          fontSize: '1.6rem',
          fontWeight: 400,
          color: '#eaeaea',
          marginBottom: '8px',
        }}>
          Pick a username
        </h2>

        <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '24px', lineHeight: 1.6 }}>
          This becomes your public URL — anyone can view your watchlist at{' '}
          <span style={{ color: '#ff6b6b' }}>localhost:3000/{value.trim().toLowerCase() || 'yourname'}</span>
        </p>

        <input
          value={value}
          onChange={e => { setValue(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="e.g. ahmed"
          autoFocus
          maxLength={24}
          style={{
            width: '100%',
            padding: '11px 14px',
            background: '#141414',
            border: `1px solid ${error ? '#ff6b6b' : '#2a2a2a'}`,
            borderRadius: '8px',
            color: '#eaeaea',
            fontSize: '1rem',
            outline: 'none',
            marginBottom: '8px',
            fontFamily: 'Georgia, serif',
          }}
        />

        {error && (
          <p style={{ fontSize: '0.78rem', color: '#ff6b6b', marginBottom: '16px' }}>{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px',
            background: saving ? '#333' : '#ff6b6b',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            marginTop: error ? '0' : '8px',
            transition: 'background 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Claim username'}
        </button>
      </div>
    </div>
  )
}