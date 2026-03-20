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
  genre_ids:       number[]
  mediaType:       MediaType
}

const TMDB = process.env.NEXT_PUBLIC_TMDB_KEY

// ── TMDB helpers ──────────────────────────────────────────────────────────────

async function getGenresFromEntries(entries: Entry[], type: MediaType): Promise<number[]> {
  const endpoint = type === 'movies' ? 'movie' : 'tv'
  const topRated = entries
    .filter(e => e.type === type && e.rating >= 3.5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)

  if (topRated.length === 0) return []

  const genreCount: Record<number, number> = {}

  await Promise.all(topRated.map(async entry => {
    try {
      const res  = await fetch(`https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB}&query=${encodeURIComponent(entry.title)}&year=${entry.year ?? ''}`)
      const data = await res.json()
      const first = data.results?.[0]
      if (!first) return
      const detailRes  = await fetch(`https://api.themoviedb.org/3/${endpoint}/${first.id}?api_key=${TMDB}`)
      const detail = await detailRes.json()
      const genres: { id: number }[] = detail.genres ?? []
      genres.forEach(g => {
        genreCount[g.id] = (genreCount[g.id] ?? 0) + (entry.rating * 2)
      })
    } catch {}
  }))

  // Sort genres by weighted score, return top 3
  return Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => Number(id))
}

async function discoverByGenres(
  genres: number[],
  type: MediaType,
  page = 1
): Promise<TMDBItem[]> {
  const endpoint  = type === 'movies' ? 'movie' : 'tv'
  const genreStr  = genres.join(',')
  const minVotes  = type === 'movies' ? 7.2 : 7.0
  const res = await fetch(
    `https://api.themoviedb.org/3/discover/${endpoint}?api_key=${TMDB}` +
    `&with_genres=${genreStr}` +
    `&vote_average.gte=${minVotes}` +
    `&vote_count.gte=500` +
    `&sort_by=vote_average.desc` +
    `&language=en-US` +
    `&page=${page}`
  )
  const data = await res.json()
  return (data.results ?? []).map((r: any) => ({
    id:              r.id,
    title:           r.title ?? r.name ?? '',
    release_date:    r.release_date,
    first_air_date:  r.first_air_date,
    poster_path:     r.poster_path,
    vote_average:    r.vote_average,
    overview:        r.overview,
    genre_ids:       r.genre_ids ?? [],
    mediaType:       type,
  }))
}

async function getTrending(type: MediaType): Promise<TMDBItem[]> {
  const endpoint = type === 'movies' ? 'movie' : 'tv'
  const res  = await fetch(`https://api.themoviedb.org/3/trending/${endpoint}/week?api_key=${TMDB}`)
  const data = await res.json()
  return (data.results ?? [])
    .filter((r: any) => r.vote_average >= 7.0 && r.vote_count >= 200)
    .map((r: any) => ({
      id:              r.id,
      title:           r.title ?? r.name ?? '',
      release_date:    r.release_date,
      first_air_date:  r.first_air_date,
      poster_path:     r.poster_path,
      vote_average:    r.vote_average,
      overview:        r.overview,
      genre_ids:       r.genre_ids ?? [],
      mediaType:       type,
    }))
}

// ── Star picker with hover half-stars ─────────────────────────────────────────

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
            {/* Background star */}
            <span style={{ color: '#2a2a2a' }}>★</span>
            {/* Filled portion */}
            {(full || half) && (
              <span style={{
                position: 'absolute', left: 0, top: 0,
                overflow: 'hidden',
                width: full ? '100%' : '50%',
                color: hover !== null ? '#ffaa6b' : '#ff6b6b',
                pointerEvents: 'none',
              }}>★</span>
            )}
            {/* Left half — half star */}
            <span
              onMouseEnter={() => setHover(n - 0.5)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(value === n - 0.5 ? 0 : n - 0.5)}
              style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', cursor: 'pointer', zIndex: 2 }}
            />
            {/* Right half — full star */}
            <span
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(value === n ? 0 : n)}
              style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', cursor: 'pointer', zIndex: 2 }}
            />
          </span>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter()
  const [user,        setUser]        = useState<User | null>(null)
  const [entries,     setEntries]     = useState<Entry[]>([])
  const [tab,         setTab]         = useState<MediaType>('movies')
  const [recs,        setRecs]        = useState<TMDBItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [source,      setSource]      = useState('')
  const [ratings,     setRatings]     = useState<Record<number, number>>({})
  const [added,       setAdded]       = useState<Record<number, boolean>>({})
  const [saving,      setSaving]      = useState<Record<number, boolean>>({})
  const [expandedId,  setExpandedId]  = useState<number | null>(null)

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
  }, [tab, user])

  async function loadRecs() {
    setLoading(true)
    setRecs([])

    const existingIds  = new Set(entries.map(e => e.title.toLowerCase().trim()))
    const hasRated     = entries.filter(e => e.type === tab && e.rating >= 3.5).length > 0

    let items: TMDBItem[] = []

    if (hasRated) {
      const genres = await getGenresFromEntries(entries, tab)
      if (genres.length > 0) {
        setSource(`your top-rated ${tab === 'movies' ? 'movies' : 'TV shows'}`)
        const [page1, page2] = await Promise.all([
          discoverByGenres(genres, tab, 1),
          discoverByGenres(genres, tab, 2),
        ])
        items = [...page1, ...page2]
      }
    }

    if (items.length < 20) {
      setSource(`trending ${tab === 'movies' ? 'movies' : 'TV shows'} this week`)
      const trending = await getTrending(tab)
      items = [...items, ...trending]
    }

    // Deduplicate + filter already-on-list + require poster
    const seen = new Set<number>()
    const filtered: TMDBItem[] = []
    for (const item of items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      if (!item.poster_path) continue
      if (existingIds.has(item.title.toLowerCase().trim())) continue
      filtered.push(item)
    }

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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, marginBottom: 10, padding: 0, display: 'block' }}>
              ← Back
            </button>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 400, lineHeight: 1, margin: 0 }}>
              Discover
            </h1>
            {!loading && source && (
              <p style={{ color: '#444', fontSize: 12, margin: '6px 0 0' }}>Based on {source}</p>
            )}
          </div>

          <div style={{ display: 'flex', background: '#181818', border: '1px solid #222', borderRadius: 8, overflow: 'hidden' }}>
            {(['movies', 'tv'] as MediaType[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '9px 24px', background: tab === t ? accent : 'transparent', color: tab === t ? '#fff' : '#555', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.15s' }}>
                {t === 'movies' ? 'Movies' : 'TV Shows'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: '#333' }}>
            <div style={{ fontSize: 13 }}>Finding recommendations…</div>
            <div style={{ fontSize: 11, color: '#2a2a2a' }}>Analysing your taste</div>
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

                  {/* Poster */}
                  <div
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '2/3', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                      alt={item.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />

                    {/* Score badge */}
                    <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.78)', borderRadius: 5, padding: '2px 7px', fontSize: 11, color: '#f5c518', fontWeight: 500 }}>
                      ★ {item.vote_average.toFixed(1)}
                    </div>

                    {/* Added overlay */}
                    {isAdded && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <div style={{ fontSize: 24, color: '#6bffb0' }}>✓</div>
                        <div style={{ fontSize: 11, color: '#eaeaea', fontWeight: 500 }}>Added</div>
                        {rating > 0 && <div style={{ fontSize: 11, color: accent }}>{rating * 2}/10</div>}
                      </div>
                    )}

                    {/* Overview on click */}
                    {isOpen && !isAdded && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <p style={{ fontSize: 10, color: '#ccc', lineHeight: 1.55, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical' }}>
                          {item.overview || 'No description available.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Title + year */}
                  <div style={{ minHeight: 34 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#eaeaea', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.title}
                    </div>
                    {year && <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{year}</div>}
                  </div>

                  {/* Stars */}
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