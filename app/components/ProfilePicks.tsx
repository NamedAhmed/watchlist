'use client'

import { useState } from 'react'

export type Pick = {
  label:  string
  title:  string
  year:   number | null
  poster: string
  tmdbId: number
}

export const DEFAULT_LABELS = [
  'Best Picture',
  'Most Underrated',
  'Made Me Cry',
  'Guilty Pleasure',
  'Most Overrated',
  'Would Rewatch Forever',
]

type Props = {
  picks:    Pick[]
  username: string
  isOwner?: boolean
  onEdit?:  () => void
}

export default function ProfilePicks({ picks, username, isOwner, onEdit }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)
  const hasPicks = picks.some(p => p.title)

  if (!hasPicks && !isOwner) return null

  return (
    <div style={{ marginBottom:'48px' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'20px' }}>
        <div>
          <h2 style={{ fontFamily:'Georgia, serif', fontSize:'1.25rem', fontWeight:400, color:'#eaeaea', margin:0 }}>
            {username}&apos;s <em style={{ color:'#ff6b6b', fontStyle:'italic' }}>Picks</em>
          </h2>
          <p style={{ fontSize:'0.75rem', color:'#444', marginTop:4, marginBottom:0 }}>Personal awards — no committee needed</p>
        </div>
        {isOwner && (
          <button
            onClick={onEdit}
            style={{ padding:'7px 14px', background:'transparent', border:'1px solid #2a2a2a', borderRadius:'7px', color:'#555', fontSize:'0.75rem', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color='#ff6b6b'; e.currentTarget.style.borderColor='#ff6b6b' }}
            onMouseLeave={e => { e.currentTarget.style.color='#555';    e.currentTarget.style.borderColor='#2a2a2a' }}
          >
            {hasPicks ? 'Edit picks' : '+ Add picks'}
          </button>
        )}
      </div>

      {!hasPicks ? (
        <div
          onClick={onEdit}
          style={{ border:'1px dashed #2a2a2a', borderRadius:'12px', padding:'32px 24px', textAlign:'center', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor='#ff6b6b'}
          onMouseLeave={e => e.currentTarget.style.borderColor='#2a2a2a'}
        >
          <p style={{ color:'#555', fontSize:'0.85rem', margin:0 }}>Give out your personal Oscars. Set up your picks →</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'12px' }}>
          {picks.filter(p => p.title).map((pick, i) => (
            <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div style={{ borderRadius:'10px', overflow:'hidden', aspectRatio:'2/3', background:'#1a1a1a', border: hovered===i ? '1px solid #ff6b6b' : '1px solid #222', transition:'border-color 0.2s', marginBottom:'10px', position:'relative' }}>
                {pick.poster
                  ? <img src={pick.poster} alt={pick.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem' }}>🎬</div>
                }
                <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)', padding:'20px 8px 8px' }}>
                  <div style={{ fontSize:'0.58rem', fontWeight:700, color:'#ff6b6b', textTransform:'uppercase', letterSpacing:'0.5px', lineHeight:1.3 }}>
                    {pick.label}
                  </div>
                </div>
              </div>
              <div style={{ fontSize:'0.78rem', color:'#ccc', fontWeight:500, lineHeight:1.3, marginBottom:2 }}>{pick.title}</div>
              {pick.year && <div style={{ fontSize:'0.7rem', color:'#444' }}>{pick.year}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}