'use client'

import { useState, useEffect } from 'react'
import { Entry } from '@/app/types'

type Props = {
  isOpen:  boolean
  editing: Entry | null
  active:  'movies' | 'tv'
  onSave:  (entry: Entry) => void
  onClose: () => void
}

type TMDBResult = {
  id:               number
  title?:           string
  name?:            string
  release_date?:    string
  first_air_date?:  string
  poster_path?:     string
  vote_average?:    number
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function Modal({ isOpen, editing, active, onSave, onClose }: Props) {

  const [title,          setTitle]          = useState('')
  const [type,           setType]           = useState<'movies' | 'tv'>('movies')
  const [year,           setYear]           = useState<number | null>(null)
  const [imdb,           setImdb]           = useState<number | null>(null)
  const [poster,         setPoster]         = useState('')
  const [rating,         setRating]         = useState(0)
  const [note,           setNote]           = useState('')
  const [query,          setQuery]          = useState('')
  const [results,        setResults]        = useState<TMDBResult[]>([])
  const [searching,      setSearching]      = useState(false)
  const [posterOptions,  setPosterOptions]  = useState<string[]>([])
  const [loadingPosters, setLoadingPosters] = useState(false)

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setType(editing.type)
      setYear(editing.year)
      setImdb(editing.imdb)
      setPoster(editing.poster)
      setRating(editing.rating)
      setNote(editing.note)
    } else {
      setTitle('')
      setType(active)
      setYear(null)
      setImdb(null)
      setPoster('')
      setRating(0)
      setNote('')
    }
    setQuery('')
    setResults([])
    setPosterOptions([])
  }, [editing, isOpen])

  // Debounced TMDB search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const endpoint = type === 'movies' ? 'movie' : 'tv'
      const res  = await fetch(`https://api.themoviedb.org/3/search/${endpoint}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&query=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results?.slice(0, 5) ?? [])
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [query, type])

  async function pickResult(r: TMDBResult) {
    const t     = r.title ?? r.name ?? ''
    const date  = r.release_date ?? r.first_air_date ?? ''
    const y     = date ? parseInt(date.slice(0, 4)) : null
    const score = r.vote_average ? parseFloat(r.vote_average.toFixed(1)) : null

    setTitle(t)
    setYear(y)
    setImdb(score)
    setQuery('')
    setResults([])
    setPosterOptions([])
    setPoster('')

    // Fetch all available posters for this title
    setLoadingPosters(true)
    const endpoint = type === 'movies' ? 'movie' : 'tv'
    const res  = await fetch(`https://api.themoviedb.org/3/${endpoint}/${r.id}/images?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}`)
    const data = await res.json()
    const paths: string[] = (data.posters ?? [])
      .slice(0, 12)
      .map((p: { file_path: string }) => `https://image.tmdb.org/t/p/w342${p.file_path}`)
    setPosterOptions(paths)
    if (paths.length > 0) setPoster(paths[0])
    setLoadingPosters(false)
  }

  function handleSave() {
    if (!title.trim()) return
    const entry: Entry = {
      id:     editing ? editing.id : uid(),
      type,
      title:  title.trim(),
      year,
      imdb,
      poster,
      rating,
      note:   note.trim(),
      rank:   editing ? editing.rank : 9999,
    }
    onSave(entry)
  }

  if (!isOpen) return null

  const stars = [1, 2, 3, 4, 5].map(n => {
    const full = rating >= n
    const half = !full && rating >= n - 0.5
    return (
      <span key={n} style={{ position: 'relative', display: 'inline-block', fontSize: '28px', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ color: '#333' }}>★</span>
        <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: full ? '100%' : half ? '50%' : '0%', color: '#ff6b6b', pointerEvents: 'none' }}>★</span>
        <span onClick={() => setRating(rating === n - 0.5 ? 0 : n - 0.5)} style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%' }} />
        <span onClick={() => setRating(rating === n ? 0 : n)} style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%' }} />
      </span>
    )
  })

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div style={{ background: '#1e1e1e', border: '1px solid #222', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>

        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontWeight: 400, color: '#eaeaea', marginBottom: '22px' }}>
          {editing ? 'Edit entry' : 'Add entry'}
        </h2>

        {/* TYPE */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as 'movies' | 'tv')}
            style={{ width: '100%', padding: '9px 12px', background: '#181818', border: '1px solid #222', borderRadius: '7px', color: '#eaeaea', fontSize: '0.85rem', outline: 'none' }}>
            <option value="movies">Movie</option>
            <option value="tv">TV Show</option>
          </select>
        </div>

        {/* TMDB SEARCH */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Search to auto-fill</label>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a title…"
            style={{ width: '100%', padding: '9px 12px', background: '#181818', border: '1px solid #2a2a2a', borderRadius: '7px', color: '#eaeaea', fontSize: '0.85rem', outline: 'none' }} />
          {searching && <p style={{ fontSize: '0.75rem', color: '#555', marginTop: '8px' }}>Searching…</p>}
          {results.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {results.map(r => {
                const t    = r.title ?? r.name ?? ''
                const date = r.release_date ?? r.first_air_date ?? ''
                const y    = date ? date.slice(0, 4) : ''
                return (
                  <div key={r.id} onClick={() => pickResult(r)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '7px', cursor: 'pointer', background: '#1a1a1a' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}>
                    {r.poster_path
                      ? <img src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} alt={t} style={{ width: '32px', height: '48px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                      : <div style={{ width: '32px', height: '48px', background: '#222', borderRadius: '4px', flexShrink: 0 }} />}
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#eaeaea', fontWeight: 500 }}>{t}</div>
                      <div style={{ fontSize: '0.75rem', color: '#555' }}>{y}{r.vote_average ? ` · ★ ${r.vote_average.toFixed(1)}` : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* POSTER PICKER */}
        {loadingPosters && <p style={{ fontSize: '0.75rem', color: '#555', marginBottom: '14px' }}>Loading posters…</p>}
        {posterOptions.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Choose poster</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {posterOptions.map((url, i) => (
                <img key={i} src={url} onClick={() => setPoster(url)}
                  style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: poster === url ? '2px solid #ff6b6b' : '2px solid transparent', transition: 'border-color 0.15s' }} />
              ))}
            </div>
          </div>
        )}

        {/* TITLE — auto-filled but editable */}
        {title && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', background: '#181818', border: '1px solid #222', borderRadius: '7px', color: '#eaeaea', fontSize: '0.85rem', outline: 'none' }} />
          </div>
        )}

        {/* RATING */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            My rating {rating > 0 && <span style={{ color: '#ff6b6b', textTransform: 'none' }}>— {rating * 2}/10</span>}
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>{stars}</div>
        </div>

        {/* NOTE */}
        <div style={{ marginBottom: '22px' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Why does this one matter?" rows={2}
            style={{ width: '100%', padding: '9px 12px', background: '#181818', border: '1px solid #222', borderRadius: '7px', color: '#eaeaea', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #222', borderRadius: '7px', color: '#555', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ flex: 2, padding: '10px', background: '#ff6b6b', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>Save</button>
        </div>

      </div>
    </div>
  )
}