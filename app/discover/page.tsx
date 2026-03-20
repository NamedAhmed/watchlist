'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Entry } from '@/app/types'
import { loadEntries, saveEntry } from '@/lib/storage'
import type { User } from '@supabase/supabase-js'

type MediaType = 'movies' | 'tv'

type TMDBItem = {
  id:              number
  title:           string
  release_date?:   string
  first_air_date?: string
  poster_path:     string
  vote_average:    number
  overview:        string
  mediaType:       MediaType
  original_language?: string
}

const TMDB = process.env.NEXT_PUBLIC_TMDB_KEY

async function searchTMDB(entry: Entry): Promise<number | null> {
  const endpoint = entry.type === 'movies' ? 'movie' : 'tv'
  const res  = await fetch(
    `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB}` +
    `&query=${encodeURIComponent(entry.title)}` +
    `&year=${entry.year ?? ''}&language=en-US`
  )
  const data = await res.json()
  return data.results?.[0]?.id ?? null
}

async function getRecsForId(id: number, type: MediaType): Promise<TMDBItem[]> {
  const endpoint = type === 'movies' ? 'movie' : 'tv'
  const [page1, page2] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/${endpoint}/${id}/recommendations?api_key=${TMDB}&page=1`).then(r => r.json()),
    fetch(`https://api.themoviedb.org/3/${endpoint}/${id}/recommendations?api_key=${TMDB}&page=2`).then(r => r.json()),
  ])
  const combined = [...(page1.results ?? []), ...(page2.results ?? [])]
  return combined
    .filter((r: any) =>
      r.vote_average >= 7.2 &&
      r.vote_count   >= 300 &&
      r.poster_path  &&
      // Filter out non-English for TV to avoid anime flood
      (type === 'movies' || r.original_language === 'en' || r.original_language === 'ko' || r.original_language === 'ja' && r.vote_average >= 8.2)
    )
    .map((r: any) => ({
      id:               r.id,
      title:            r.title ?? r.name ?? '',
      release_date:     r.release_date,
      first_air_date:   r.first_air_date,
      poster_path:      r.poster_path,
      vote_average:     r.vote_average,
      overview:         r.overview,
      original_language: r.original_language,
      mediaType:        type,
    }))
}

async function getSimilarForId(id: number, type: MediaType): Promise<TMDBItem[]> {
  const endpoint = type === 'movies' ? 'movie' : 'tv'
  const res  = await fetch(`https://api.themoviedb.org/3/${endpoint}/${id}/similar?api_key=${TMDB}&page=1`)
  const data = await res.json()
  return (data.results ?? [])
    .filter((r: any) =>
      r.vote_average >= 7.5 &&
      r.vote_count   >= 500 &&
      r.poster_path
    )
    .map((r: any) => ({
      id:             r.id,
      title:          r.title ?? r.name ?? '',
      release_date:   r.release_date,
      first_air_date: r.first_air_date,
      poster_path:    r.poster_path,
      vote_average:   r.vote_average,
      overview:       r.overview,
      original_language: r.original_language,
      mediaType:      type,
    }))
}

async function getTrending(type: MediaType): Promise<TMDBItem[]> {
  const endpoint = type === 'movies' ? 'movie' : 'tv'
  const res  = await fetch(`https://api.themoviedb.org/3/trending/${endpoint}/week?api_key=${TMDB}`)
  const data = await res.json()
  return (data.results ?? [])
    .filter((r: any) => r.vote_average >= 7.0 && r.vote_count >= 200 && r.poster_path)
    .map((r: any) => ({
      id:             r.id,
      title:          r.title ?? r.name ?? '',
      release_date:   r.release_date,
      first_air_date: r.first_air_date,
      poster_path:    r.poster_path,
      vote_average:   r.vote_average,
      overview:       r.overview,
      original_language: r.original_language,
      mediaType:      type,
    }))
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value

  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const full = display >= n
        const half = !full && display >= n - 0.5
        return (
          <span key={n} style={{ position: 'relative', display: 'inline-block', fontSize: 20, userSelect: 'none', lineHeight: 1 }}>
            <span style={{ color: '#2a2a2a' }}>★</span>
            {(full || half) && (
              <span style={{ position:'absolute', left:0, top:0, overflow:'hidden', width: full?'100%':'50%', color: hover !== null ? '#ffaa6b' : '#ff6b6b', pointerEvents:'none' }}>★</span>
            )}
            <span onMouseEnter={() => setHover(n-0.5)} onMouseLeave={() => setHover(null)} onClick={() => onChange(value===n-0.5?0:n-0.5)} style={{ position:'absolute', left:0, top:0, width:'50%', height:'100%', cursor:'pointer', zIndex:2 }}/>
            <span onMouseEnter={() => setHover(n)}     onMouseLeave={() => setHover(null)} onClick={() => onChange(value===n?0:n)}         style={{ position:'absolute', right:0, top:0, width:'50%', height:'100%', cursor:'pointer', zIndex:2 }}/>
          </span>
        )
      })}
    </div>
  )
}

export default function DiscoverPage() {
  const router = useRouter()
  const [user,       setUser]       = useState<User | null>(null)
  const [entries,    setEntries]    = useState<Entry[]>([])
  const [tab,        setTab]        = useState<MediaType>('movies')
  const [recs,       setRecs]       = useState<TMDBItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [source,     setSource]     = useState('')
  const [ratings,    setRatings]    = useState<Record<number, number>>({})
  const [added,      setAdded]      = useState<Record<number, boolean>>({})
  const [saving,     setSaving]     = useState<Record<number, boolean>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUser(data.user)
      const saved = await loadEntries(data.user.id)
      setEntries(saved)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    loadRecs()
  }, [tab, user, entries.length])

  async function loadRecs() {
    setLoading(true)
    setRecs([])

    const existingTitles = new Set(entries.map(e => e.title.toLowerCase().trim()))

    // Take top 5 rated entries for this tab, sorted by rating
    const topEntries = entries
      .filter(e => e.type === tab && e.rating >= 3.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)

    let allItems: TMDBItem[] = []

    if (topEntries.length > 0) {
      setSource(`your top-rated ${tab === 'movies' ? 'movies' : 'TV shows'}`)

      // Resolve TMDB ids in parallel
      const ids = await Promise.all(topEntries.map(e => searchTMDB(e)))

      // Get recs + similar for each in parallel
      const recResults = await Promise.all(
        ids.filter(Boolean).map(id =>
          Promise.all([
            getRecsForId(id!, tab),
            getSimilarForId(id!, tab),
          ]).then(([r, s]) => [...r, ...s])
        )
      )

      allItems = recResults.flat()
    }

    // Pad with trending if needed
    if (allItems.length < 16) {
      setSource(prev => prev || `trending ${tab === 'movies' ? 'movies' : 'TV shows'} this week`)
      const trending = await getTrending(tab)
      allItems = [...allItems, ...trending]
    }

    // Deduplicate + filter out already-on-list
    const seen = new Set<number>()
    const filtered: TMDBItem[] = []
    for (const item of allItems) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      if (!item.poster_path) continue
      if (existingTitles.has(item.title.toLowerCase().trim())) continue
      filtered.push(item)
    }

    // Sort by vote_average so best stuff comes first
    filtered.sort((a, b) => b.vote_average - a.vote_average)

    setRecs(filtered.slice(0, 40))
    setLoading(false)
  }

  async function handleAdd(item: TMDBItem, rating: number) {
    if (!user || saving[item.id] || added[item.id]) return
    setSaving(prev => ({ ...prev, [item.id]: true }))

    const newEntry: Entry = {
      id:     `${item.id}-${Date.now()}`,
      type:   item.mediaType,
      title:  item.title,
      year:   item.release_date
                ? parseInt(item.release_date)
                : item.first_air_date
                  ? parseInt(item.first_air_date)
                  : null,
      poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
      imdb:   Math.round(item.vote_average * 10) / 10,
      rating,
      note:   '',
      rank:   entries.filter(e => e.type === item.mediaType).length + 1,
    }

    await saveEntry(newEntry, user.id)
    setEntries(prev => [...prev, newEntry])
    setAdded(prev => ({ ...prev, [item.id]: true }))
    setSaving(prev => ({ ...prev, [item.id]: false }))
  }

  function onRate(item: TMDBItem, v: number) {
    setRatings(prev => ({ ...prev, [item.id]: v }))
    if (v > 0) handleAdd(item, v)
  }

  const accent = '#ff6b6b'

  return (
    <div style={{ background: '#111111', minHeight: '100vh', color: '#eaeaea', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, marginBottom: 10, padding: 0, display: 'block' }}>
              ← Back
            </button>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 400, lineHeight: 1, margin: 0 }}>Discover</h1>
            {!loading && source && <p style={{ color: '#444', fontSize: 12, margin: '6px 0 0' }}>Based on {source}</p>}
          </div>
          <div style={{ display: 'flex', background: '#181818', border: '1px solid #222', borderRadius: 8, overflow: 'hidden' }}>
            {(['movies', 'tv'] as MediaType[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '9px 24px', background: tab===t ? accent : 'transparent', color: tab===t ? '#fff' : '#555', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.15s' }}>
                {t === 'movies' ? 'Movies' : 'TV Shows'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
            <div style={{ fontSize: 13, color: '#444' }}>Finding recommendations…</div>
            <div style={{ fontSize: 11, color: '#2a2a2a' }}>Analysing your taste</div>
          </div>
        ) : recs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
            <p style={{ fontSize: 14, marginBottom: 8 }}>No recommendations found</p>
            <p style={{ fontSize: 12 }}>Rate some {tab === 'movies' ? 'movies' : 'TV shows'} first</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 24 }}>
            {recs.map(item => {
              const rating   = ratings[item.id] ?? 0
              const isAdded  = added[item.id]
              const isSaving = saving[item.id]
              const year     = (item.release_date ?? item.first_air_date ?? '').slice(0, 4)
              const isOpen   = expandedId === item.id

              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div onClick={() => setExpandedId(isOpen ? null : item.id)}
                    style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '2/3', cursor: 'pointer', flexShrink: 0 }}>
                    <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} alt={item.title} loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                    <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.78)', borderRadius: 5, padding: '2px 7px', fontSize: 11, color: '#f5c518', fontWeight: 500 }}>
                      ★ {item.vote_average.toFixed(1)}
                    </div>
                    {isAdded && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <div style={{ fontSize: 24, color: '#6bffb0' }}>✓</div>
                        <div style={{ fontSize: 11, color: '#eaeaea', fontWeight: 500 }}>Added</div>
                        {rating > 0 && <div style={{ fontSize: 11, color: accent }}>{rating * 2}/10</div>}
                      </div>
                    )}
                    {isOpen && !isAdded && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)', padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <p style={{ fontSize: 10, color: '#ccc', lineHeight: 1.55, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical' }}>
                          {item.overview || 'No description.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div style={{ minHeight: 34 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#eaeaea', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.title}
                    </div>
                    {year && <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{year}</div>}
                  </div>

                  {!isAdded ? (
                    <div>
                      <StarPicker value={rating} onChange={v => onRate(item, v)} />
                      {isSaving
                        ? <div style={{ fontSize: 9, color: '#444', marginTop: 4 }}>Saving…</div>
                        : <div style={{ fontSize: 9, color: '#2a2a2a', marginTop: 4 }}>Rate to add instantly</div>
                      }
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: '#3a6a3a' }}>✓ On your list</div>
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