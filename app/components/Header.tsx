'use client'

import { useState } from 'react'
import { Entry } from '@/app/types'
import AuthButton from './AuthButton'
import AccountModal from './AccountModal'

type Props = {
  activeTab:        'movies' | 'tv'
  entries:          Entry[]
  onSwitch:         (tab: 'movies' | 'tv') => void
  onAdd:            () => void
  isOwner:          boolean
  username:         string | null
  userId:           string | null
  onDesign:         () => void
  onUsernameChange: (name: string) => void
  onAccountDeleted: () => void
  accentColor: string
  onDiscover:       () => void
}

export default function Header({
  activeTab, entries, onSwitch, onAdd,
  isOwner, username, userId, onDesign,
  onUsernameChange, onAccountDeleted,
  accentColor, onDiscover,
}: Props) {
  const [accountOpen, setAccountOpen] = useState(false)

  const movieCount = entries.filter(e => e.type === 'movies').length
  const tvCount    = entries.filter(e => e.type === 'tv').length

  return (
    <>
      <div style={{ marginBottom:'32px' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'24px', gap:'16px', flexWrap:'wrap' }}>
          <h1 style={{ fontFamily:'Georgia, serif', fontSize:'2.4rem', fontWeight:400, color:'#eaeaea' }}>
            {username ? <>{username}&apos;s </> : "Ahmed's " }
            <em style={{ fontStyle:'italic', color: accentColor }}>Watchlist</em>
          </h1>

          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            {isOwner && (
              <button onClick={onAdd} style={{ padding:'9px 20px', background: accentColor, color:'#fff', border:'none', borderRadius:'8px', fontSize:'0.82rem', fontWeight:500, cursor:'pointer' }}>
                + Add
              </button>
            )}
            {isOwner && (
              <button onClick={onDiscover} style={{ padding:'9px 16px', background:'transparent', border:'1px solid #2a2a2a', borderRadius:'8px', color:'#888', fontSize:'0.82rem', cursor:'pointer' }}>
                Discover
              </button>
            )}
            {isOwner && (
              <button onClick={onDesign} style={{ padding:'9px 16px', background:'transparent', border:'1px solid #2a2a2a', borderRadius:'8px', color:'#888', fontSize:'0.82rem', cursor:'pointer' }}>
                Design card
              </button>
            )}
            {username && (
              <a
                href={`/${username}`}
                style={{ padding:'9px 16px', background:'transparent', color:'#555', border:'1px solid #2a2a2a', borderRadius:'8px', fontSize:'0.82rem', textDecoration:'none', whiteSpace:'nowrap' }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color='#ff6b6b'; e.currentTarget.style.borderColor='#ff6b6b' }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color='#555'; e.currentTarget.style.borderColor='#2a2a2a' }}
              >
                /{username}
              </a>
            )}
            <AuthButton
              onOpenAccount={isOwner && userId && username ? () => setAccountOpen(true) : undefined}
            />
          </div>
        </div>

        <div style={{ display:'flex', background:'#181818', border:'1px solid #222', borderRadius:'8px', overflow:'hidden', width:'fit-content' }}>
          <button onClick={() => onSwitch('movies')} style={{ padding:'9px 24px', background: activeTab==='movies' ? accentColor : 'transparent', color: activeTab==='movies' ? '#fff' : '#555', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:500 }}>
            Movies ({movieCount})
          </button>
          <button onClick={() => onSwitch('tv')} style={{ padding:'9px 24px', background: activeTab==='tv' ? accentColor : 'transparent', color: activeTab==='tv' ? '#fff' : '#555', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:500 }}>
            TV Shows ({tvCount})
          </button>
        </div>

      </div>

      {accountOpen && userId && username && (
        <AccountModal
          userId={userId!}
          currentUsername={username!}
          onUsernameChange={onUsernameChange}
          onAccountDeleted={onAccountDeleted}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </>
  )
}