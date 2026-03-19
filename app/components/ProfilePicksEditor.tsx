'use client'

import { useState, useEffect } from 'react'
import { Pick, DEFAULT_LABELS } from './ProfilePicks'

type Props = {
  initialPicks: Pick[]
  onSave:       (picks: Pick[]) => Promise<void>
  onClose:      () => void
}

type TMDBResult = {
  id:              number
  title?:          string
  name?:           string
  release_date?:   string
  first_air_date?: string
  poster_path?:    string
  media_type?:     string
}

const EMPTY = (label: string): Pick => ({ label, title:'', year:null, poster:'', tmdbId:0 })

export default function ProfilePicksEditor({ initialPicks, onSave, onClose }: Props) {
  const [picks,     setPicks]     = useState<Pick[]>(() =>
    DEFAULT_LABELS.map((lbl, i) => initialPicks[i] ?? EMPTY(lbl))
  )
  const [active,    setActive]    = useState<number | null>(null)
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const res  = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&query=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults((data.results ?? []).filter((r: TMDBResult) => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 6))
      setSearching(false)
    }, 380)
    return () => clearTimeout(t)
  }, [query])

  function pickResult(r: TMDBResult) {
    if (active === null) return
    const title  = r.title ?? r.name ?? ''
    const date   = r.release_date ?? r.first_air_date ?? ''
    const year   = date ? parseInt(date.slice(0, 4)) : null
    const poster = r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : ''
    setPicks(prev => prev.map((p, i) => i === active ? { ...p, title, year, poster, tmdbId: r.id } : p))
    setQuery(''); setResults([]); setActive(null)
  }

  function clearSlot(i: number) {
    setPicks(prev => prev.map((p, idx) => idx === i ? EMPTY(p.label) : p))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(picks.filter(p => p.title))
    setSaving(false)
    onClose()
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
    >
      <div style={{ background:'#1a1a1a', border:'1px solid #252525', borderRadius:'18px', width:'100%', maxWidth:'520px', maxHeight:'90vh', overflowY:'auto', padding:'30px' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h2 style={{ fontFamily:'Georgia, serif', fontSize:'1.35rem', fontWeight:400, color:'#eaeaea' }}>
            Your <em style={{ color:'#ff6b6b' }}>Picks</em>
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#444', cursor:'pointer', fontSize:'1.4rem', padding:'2px 6px' }}>×</button>
        </div>
        <p style={{ fontSize:'0.78rem', color:'#555', marginBottom:'26px' }}>Rename any category, then search for the film that fits.</p>

        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px' }}>
          {picks.map((pick, i) => (
            <div key={i} style={{ background: active===i ? '#1e1e1e' : '#161616', border:`1px solid ${active===i ? '#333' : '#222'}`, borderRadius:'12px', padding:'14px 16px', transition:'all 0.15s' }}>

              {/* Label */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: active===i ? 12 : 6 }}>
                <input
                  value={pick.label}
                  onChange={e => setPicks(prev => prev.map((p, idx) => idx===i ? {...p, label:e.target.value} : p))}
                  maxLength={32}
                  style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#ff6b6b', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}
                />
                {pick.title && (
                  <button onClick={() => clearSlot(i)} style={{ background:'none', border:'none', color:'#333', cursor:'pointer', fontSize:'0.75rem', padding:'0 2px' }}
                    onMouseEnter={e => e.currentTarget.style.color='#cc4444'}
                    onMouseLeave={e => e.currentTarget.style.color='#333'}
                  >✕</button>
                )}
              </div>

              {/* Film row or pick button */}
              {pick.title ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => { setActive(active===i ? null : i); setQuery(''); setResults([]) }}>
                  {pick.poster
                    ? <img src={pick.poster} alt={pick.title} style={{ width:28, height:42, objectFit:'cover', borderRadius:4, flexShrink:0 }} />
                    : <div style={{ width:28, height:42, background:'#222', borderRadius:4, flexShrink:0 }} />
                  }
                  <div>
                    <div style={{ fontSize:'0.85rem', color:'#eaeaea' }}>{pick.title}</div>
                    {pick.year && <div style={{ fontSize:'0.72rem', color:'#444' }}>{pick.year}</div>}
                  </div>
                  <div style={{ marginLeft:'auto', fontSize:'0.72rem', color:'#444' }}>change →</div>
                </div>
              ) : (
                <button
                  onClick={() => { setActive(active===i ? null : i); setQuery(''); setResults([]) }}
                  style={{ background:'none', border:'1px dashed #2a2a2a', borderRadius:7, color:'#444', fontSize:'0.78rem', cursor:'pointer', padding:'7px 12px', width:'100%', textAlign:'left' }}
                >
                  + Search for a film…
                </button>
              )}

              {/* Search panel */}
              {active === i && (
                <div style={{ marginTop:12 }}>
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Type a title…"
                    style={{ width:'100%', padding:'8px 12px', background:'#141414', border:'1px solid #2a2a2a', borderRadius:7, color:'#eaeaea', fontSize:'0.85rem', outline:'none' }}
                  />
                  {searching && <p style={{ fontSize:'0.72rem', color:'#444', marginTop:6 }}>Searching…</p>}
                  {results.length > 0 && (
                    <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:2 }}>
                      {results.map(r => {
                        const t  = r.title ?? r.name ?? ''
                        const yr = (r.release_date ?? r.first_air_date ?? '').slice(0, 4)
                        return (
                          <div key={r.id} onClick={() => pickResult(r)}
                            style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:6, cursor:'pointer', background:'#1a1a1a' }}
                            onMouseEnter={e => e.currentTarget.style.background='#222'}
                            onMouseLeave={e => e.currentTarget.style.background='#1a1a1a'}
                          >
                            {r.poster_path
                              ? <img src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} alt={t} style={{ width:24, height:36, objectFit:'cover', borderRadius:3, flexShrink:0 }} />
                              : <div style={{ width:24, height:36, background:'#222', borderRadius:3, flexShrink:0 }} />
                            }
                            <div>
                              <div style={{ fontSize:'0.82rem', color:'#eaeaea' }}>{t}</div>
                              <div style={{ fontSize:'0.7rem', color:'#555' }}>{yr}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', background:'transparent', border:'1px solid #222', borderRadius:8, color:'#555', fontSize:'0.85rem', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:'11px', background: saving ? '#2a2a2a' : '#ff6b6b', color: saving ? '#555' : '#fff', border:'none', borderRadius:8, fontSize:'0.85rem', fontWeight:500, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save picks'}
          </button>
        </div>

      </div>
    </div>
  )
}