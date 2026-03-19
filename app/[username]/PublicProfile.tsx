'use client'

import { useState } from 'react'
import { Entry, CardLayout } from '@/app/types'
import CardRenderer from '@/app/components/CardRenderer'
import ProfilePicks, { Pick } from '@/app/components/ProfilePicks'

type Props = {
  username: string
  entries:  Entry[]
  layout:   CardLayout
}

export default function PublicProfile({ username, entries, layout }: Props) {
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies')

  const movieCount = entries.filter(e => e.type === 'movies').length
  const tvCount    = entries.filter(e => e.type === 'tv').length
  const visible    = entries.filter(e => e.type === activeTab).sort((a, b) => b.rating - a.rating || a.rank - b.rank)

  return (
    <div style={{ background:'#111111', minHeight:'100vh' }}>
      <div style={{ maxWidth:'700px', margin:'0 auto', padding:'48px 24px 80px' }}>

        <div style={{ marginBottom:'36px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'24px' }}>
            <h1 style={{ fontFamily:'Georgia, serif', fontSize:'2.4rem', fontWeight:400, color:'#eaeaea' }}>
              {username}&apos;s <em style={{ fontStyle: 'italic', color: layout.accentColor }}>Watchlist</em>
            </h1>
            <a href="/" style={{ padding:'9px 20px', background:'transparent', color:'#555', border:'1px solid #2a2a2a', borderRadius:'8px', fontSize:'0.82rem', textDecoration:'none' }}
              onMouseEnter={e => { e.currentTarget.style.color=layout.accentColor; e.currentTarget.style.borderColor=layout.accentColor }}
              onMouseLeave={e => { e.currentTarget.style.color='#555';    e.currentTarget.style.borderColor='#2a2a2a' }}>
              Make your own
            </a>
          </div>

          <div style={{ display:'flex', background:'#181818', border:'1px solid #222', borderRadius:'8px', overflow:'hidden', width:'fit-content' }}>
            <button onClick={() => setActiveTab('movies')} style={{ padding:'9px 24px', background: activeTab==='movies' ? 'layout.accentColor' : 'transparent', color: activeTab==='movies' ? '#fff' : '#555', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:500 }}>
              Movies ({movieCount})
            </button>
            <button onClick={() => setActiveTab('tv')} style={{ padding:'9px 24px', background: activeTab==='tv' ? 'layout.accentColor' : 'transparent', color: activeTab==='tv' ? '#fff' : '#555', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:500 }}>
              TV Shows ({tvCount})
            </button>
          </div>
        </div>

        {/* Picks embedded */}


        {visible.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#555' }}>
            <p style={{ fontSize:'1.1rem', color:'#eaeaea', marginBottom:'8px' }}>Nothing here yet</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
            {visible.map((entry, index) => (
              <CardRenderer key={entry.id} entry={entry} index={index} layout={layout} preview />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}