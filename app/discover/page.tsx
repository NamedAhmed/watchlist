'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Entry } from '@/app/types'
import { loadEntries, saveEntry } from '@/lib/storage'
import type { User } from '@supabase/supabase-js'

type MediaType = 'movies' | 'tv'

type TMDBItem = {
  id:               number
  title?:           string
  name?:            string
  release_date?:    string
  first_air_date?:  string
  poster_path:      string | null
  vote_average:     number
  overview:         string
  mediaType:        MediaType
  source?:          string   // which entry triggered this rec
}

const TMDB = process.env.NEXT_PUBLIC_TMDB_KEY

async function getTMDBId(entry: Entry): Promise<number | null> {
  const endpoint = entry.type === 'movies' ? 'movie' : 'tv'
  const res  = await fetch(
    `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB}&query=${encodeURIComponent(entry.title)}&year=${entry.year ?? ''}`
  )
  const data = await res.json()
  return data.results?.[0]?.id ?? null
}

async function getRecs(tmdbId: number, type: MediaType): Promise<TMDBItem[]> {
  const endpoint = type === 'movies' ? 'movie' : 'tv'
  const res  = await fetch(
    `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/recommendations?api_key=${TMDB}&language=en-US&page=1`
  )
  const data = await res.json()
  return (data.results ?? []).map((r: any) => ({
    id:              r.id,
    title:           r.title ?? r.name,
    name:            r.name,
    release_date:    r.release_date,
    first_air_date:  r.first_air_date,
    poster_path:     r.poster_path,
    vote_average:    r.vote_average,
    overview:        r.overview,
    mediaType:       type,
  }))
}

async function getTrending(type: MediaType): Promise<TMDBItem[]> {
  const endpoint = type === 'movies' ? 'movie' : 'tv'
  const res  = await fetch(
    `https://api.themoviedb.org/3/trending/${endpoint}/week?api_key=${TMDB}`
  )
  const data = await res.json()
  return (data.results ?? []).map((r: any) => ({
    id:             r.id,
    title:          r.title ?? r.name,
    release_date:   r.release_date,
    first_air_date: r.first_air_date,
    poster_path:    r.poster_path,
    vote_average:   r.vote_average,
    overview:       r.overview,
    mediaType:      type,
  }))
}

function StarPicker({
  value,
  onChange,
  size = 20,
}: {
  value: number
  onChange: (v: number) => void
  size?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value

  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(n => {
        const full = display >= n
        const half = !full && display >= n - 0.5
        return (
          <span key={n} style={{ position:'relative', display:'inline-block', fontSize:size, userSelect:'none' }}>
            <span style={{ color: full||half ? '#ff6b6b' : '#2a2a2a' }}>★</span>
            {(full || half) && (
              <span style={{ position:'absolute', left:0, top:0, overflow:'hidden', width:full?'100%':'50%', color:'#ff6b6b', pointerEvents:'none' }}>★</span>
            )}
            <span
              onMouseEnter={() => setHover(n - 0.5)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(value === n-0.5 ? 0 : n-0.5)}
              style={{ position:'absolute', left:0, top:0, width:'50%', height:'100%', cursor:'pointer' }}
            />
            <span
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(value === n ? 0 : n)}
              style={{ position:'absolute', right:0, top:0, width:'50%', height:'100%', cursor:'pointer' }}
            />
          </span>
        )
      })}
    </div>
  )
}

export default function DiscoverPage() {
  const router = useRouter()
  const [user,         setUser]         = useState<User | null>(null)
  const [entries,      setEntries]      = useState<Entry[]>([])
  const [tab,          setTab]          = useState<MediaType>('movies')
  const [recs,         setRecs]         = useState<TMDBItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [ratings,      setRatings]      = useState<Record<string, number>>({})
  const [added,        setAdded]        = useState<Record<string, boolean>>({})
  const [saving,       setSaving]       = useState<Record<string, boolean>>({})
  const [expandedId,   setExpandedId]   = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUser(data.user)
      const saved = await loadEntries(data.user.id)
      setEntries(saved)
    })
  }, [])

  // Load recs whenever tab or entries change
  useEffect(() => {
    if (!user) return
    loadRecs()
  }, [tab, user, entries.length])

  async function loadRecs() {
    setLoading(true)
    setRecs([])

    const existing  = new Set(entries.map(e => e.title.toLowerCase().trim()))
    const typeEntries = entries
      .filter(e => e.type === tab && e.rating >= 3.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6)

    let collected: TMDBItem[] = []

    if (typeEntries.length > 0) {
      // Get recommendations based on top-rated
      const promises = typeEntries.map(async entry => {
        const id = await getTMDBId(entry)
        if (!id) return []
        const r = await getRecs(id, tab)
        return r.map(x => ({ ...x, source: entry.title }))
      })
      const results = await Promise.all(promises)
      collected = results.flat()
    }

    // Pad with trending if not enough recs
    if (collected.length < 12) {
      const trending = await getTrending(tab)
      collected = [...collected, ...trending]
    }

    // Deduplicate by TMDB id, filter already-on-list
    const seen = new Set<number>()
    const filtered: TMDBItem[] = []
    for (const item of collected) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const t = (item.title ?? '').toLowerCase().trim()
      if (existing.has(t)) continue
      if (!item.poster_path) continue
      filtered.push(item)
    }

    setRecs(filtered.slice(0, 40))
    setLoading(false)
  }

  async function handleAdd(item: TMDBItem, rating: number) {
    if (!user || saving[item.id]) return
    setSaving(prev => ({ ...prev, [item.id]: true }))

    const newEntry: Entry = {
      id:     `${item.id}-${Date.now()}`,
      type:   item.mediaType,
      title:  item.title ?? item.name ?? '',
      year:   item.release_date
                ? parseInt(item.release_date)
                : item.first_air_date
                  ? parseInt(item.first_air_date)
                  : null,
      poster: item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : '',
      imdb:   Math.round(item.vote_average * 10) / 10,
      rating,
      note:   '',
      rank:   entries.length + 1,
    }

    await saveEntry(newEntry, user.id)
    setEntries(prev => [...prev, newEntry])
    setAdded(prev => ({ ...prev, [item.id]: true }))
    setSaving(prev => ({ ...prev, [item.id]: false }))
  }

  function handleStarClick(item: TMDBItem, rating: number) {
    const key = String(item.id)
    setRatings(prev => ({ ...prev, [key]: rating }))
    handleAdd(item, rating)
  }

  const accent = '#ff6b6b'

  return (
    <div style={{ background:'#111111', minHeight:'100vh', color:'#eaeaea', fontFamily:'system-ui, sans-serif' }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:16 }}>
          <div>
            <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:12, marginBottom:10, padding:0, display:'block' }}>
              ← Back
            </button>
            <h1 style={{ fontFamily:'Georgia, serif', fontSize:'2rem', fontWeight:400, lineHeight:1, margin:0 }}>
              Discover
            </h1>
            <p style={{ color:'#444', fontSize:12, margin:'6px 0 0' }}>
              {entries.filter(e => e.type===tab && e.rating>=3.5).length > 0
                ? `Based on your top ${tab === 'movies' ? 'movies' : 'TV shows'}`
                : `Trending ${tab === 'movies' ? 'movies' : 'TV shows'} this week`
              }
            </p>
          </div>

          {/* Tab switch */}
          <div style={{ display:'flex', background:'#181818', border:'1px solid #222', borderRadius:8, overflow:'hidden' }}>
            {(['movies','tv'] as MediaType[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'9px 24px', background:tab===t?accent:'transparent', color:tab===t?'#fff':'#555', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:500, transition:'all 0.15s' }}>
                {t === 'movies' ? 'Movies' : 'TV Shows'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'#333', fontSize:13 }}>
            Finding recommendations…
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:20 }}>
            {recs.map(item => {
              const key       = String(item.id)
              const rating    = ratings[key] ?? 0
              const isAdded   = added[key]
              const isSaving  = saving[key]
              const isExpanded = expandedId === item.id
              const year = item.release_date
                ? item.release_date.slice(0,4)
                : item.first_air_date?.slice(0,4) ?? ''

              return (
                <div key={item.id}
                  style={{ display:'flex', flexDirection:'column', gap:8 }}>

                  {/* Poster */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{ position:'relative', borderRadius:8, overflow:'hidden', aspectRatio:'2/3', cursor:'pointer', flexShrink:0 }}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                      alt={item.title}
                      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                    />

                    {/* TMDB score badge */}
                    <div style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.78)', borderRadius:5, padding:'2px 7px', fontSize:11, color:'#f5c518', fontWeight:500 }}>
                      ★ {item.vote_average.toFixed(1)}
                    </div>

                    {/* Added overlay */}
                    {isAdded && (
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <div style={{ fontSize:28 }}>✓</div>
                        <div style={{ fontSize:11, color:'#eaeaea', fontWeight:500 }}>Added</div>
                        {rating > 0 && <div style={{ fontSize:11, color:accent }}>{rating * 2}/10</div>}
                      </div>
                    )}

                    {/* Hover overview */}
                    {isExpanded && !isAdded && (
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.88)', padding:10, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                        <p style={{ fontSize:10, color:'#bbb', lineHeight:1.5, margin:0, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:6, WebkitBoxOrient:'vertical' }}>
                          {item.overview || 'No description available.'}
                        </p>
                        {item.source && (
                          <p style={{ fontSize:9, color:'#444', marginTop:6, marginBottom:0 }}>Because you liked {item.source}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Title + year */}
                  <div style={{ minHeight:36 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'#eaeaea', lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                      {item.title}
                    </div>
                    {year && <div style={{ fontSize:10, color:'#444', marginTop:2 }}>{year}</div>}
                  </div>

                  {/* Quick-add stars */}
                  {!isAdded ? (
                    <div>
                      <StarPicker
                        value={rating}
                        onChange={v => handleStarClick(item, v)}
                        size={18}
                      />
                      {isSaving && <div style={{ fontSize:9, color:'#444', marginTop:4 }}>Saving…</div>}
                      {rating === 0 && !isSaving && (
                        <div style={{ fontSize:9, color:'#333', marginTop:4 }}>Rate to add instantly</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize:10, color:'#3a6a3a' }}>✓ On your list</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}