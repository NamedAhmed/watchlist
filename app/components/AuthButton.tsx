'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

type Props = {
  onOpenAccount?: () => void
}

export default function AuthButton({ onOpenAccount }: Props) {
  const [user,      setUser]      = useState<User | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [menuOpen,  setMenuOpen]  = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  async function signInWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setMenuOpen(false)
  }

  if (loading) return null

  if (!user) return (
    <div style={{ display:'flex', gap:'8px' }}>
      <button
        onClick={signInWithGoogle}
        style={{ padding:'9px 16px', background:'#fff', color:'#111', border:'none', borderRadius:'8px', fontSize:'0.82rem', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', transition:`transform 200ms ${SPRING}` }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
      >
        <svg width="16" height="16" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.8 6C12.5 13 17.8 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z"/>
          <path fill="#FBBC05" d="M10.6 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 000 24c0 3.9.9 7.5 2.6 10.7l8-6z"/>
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.7 42.6 14.7 48 24 48z"/>
        </svg>
        Google
      </button>
      <button
        onClick={signInWithGitHub}
        style={{ padding:'9px 16px', background:'#24292e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'0.82rem', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', transition:`transform 200ms ${SPRING}` }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2c-3.34.72-4.04-1.6-4.04-1.6-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.22 1.83 1.22 1.06 1.82 2.78 1.3 3.46 1 .1-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.3.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 016 0c2.28-1.55 3.28-1.23 3.28-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.9 1.23 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        GitHub
      </button>
    </div>
  )

  const avatarUrl = user.user_metadata?.avatar_url
  const name      = user.user_metadata?.full_name ?? user.email

  return (
    <div style={{ position:'relative' }}>
      <div
        onClick={() => setMenuOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'4px 8px', borderRadius:'8px', border:'1px solid #222', background: menuOpen ? '#1e1e1e' : 'transparent', transition:'background 0.15s' }}
      >
        {avatarUrl
          ? <img src={avatarUrl} style={{ width:28, height:28, borderRadius:'50%' }} />
          : <div style={{ width:28, height:28, borderRadius:'50%', background:'#ff6b6b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', color:'#fff', fontWeight:600 }}>
              {name?.[0]?.toUpperCase()}
            </div>
        }
        <span style={{ fontSize:'0.82rem', color:'#888', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
        <span style={{ fontSize:'0.65rem', color:'#555', transform: menuOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▼</span>
      </div>

      {menuOpen && (
        <div style={{ position:'absolute', top:'110%', right:0, background:'#1e1e1e', border:'1px solid #2a2a2a', borderRadius:'10px', padding:'6px', minWidth:'160px', zIndex:200 }}>
          {onOpenAccount && (
            <button
              onClick={() => { setMenuOpen(false); onOpenAccount() }}
              style={{ width:'100%', padding:'8px 12px', background:'transparent', border:'none', color:'#888', fontSize:'0.82rem', textAlign:'left', cursor:'pointer', borderRadius:'6px' }}
              onMouseEnter={e => { e.currentTarget.style.background='#2a2a2a'; e.currentTarget.style.color='#eaeaea' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#888' }}
            >
              Account settings
            </button>
          )}
          <button
            onClick={signOut}
            style={{ width:'100%', padding:'8px 12px', background:'transparent', border:'none', color:'#888', fontSize:'0.82rem', textAlign:'left', cursor:'pointer', borderRadius:'6px' }}
            onMouseEnter={e => { e.currentTarget.style.background='#2a2a2a'; e.currentTarget.style.color='#eaeaea' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#888' }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}