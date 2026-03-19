'use client'

import { useState, useEffect } from 'react'
import { Entry } from '@/app/types'

type Props = {
  entry:   Entry
  onSave:  (entry: Entry) => void
  onClose: () => void
}

type TMDBPoster = { file_path: string; vote_count: number }

export default function EditModal({ entry, onSave, onClose }: Props) {
  const [rating,         setRating]         = useState(entry.rating)
  const [note,           setNote]           = useState(entry.note)
  const [poster,         setPoster]         = useState(entry.poster)
  const [posterOptions,  setPosterOptions]  = useState<string[]>([])
  const [loadingPosters, setLoadingPosters] = useState(false)
  const [postersLoaded,  setPostersLoaded]  = useState(false)

  // Auto-load TMDB posters when modal opens
  useEffect(() => {
    async function fetchPosters() {
      setLoadingPosters(true)
      try {
        // Search for the title to get the TMDB id
        const endpoint = entry.type === 'movies' ? 'movie' : 'tv'
        const searchRes  = await fetch(
          `https://api.themoviedb.org/3/search/${endpoint}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&query=${encodeURIComponent(entry.title)}&year=${entry.year ?? ''}`
        )
        const searchData = await searchRes.json()
        const first = searchData.results?.[0]
        if (!first) { setLoadingPosters(false); return }

        const imgRes  = await fetch(
          `https://api.themoviedb.org/3/${endpoint}/${first.id}/images?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}`
        )
        const imgData = await imgRes.json()
        const posters = (imgData.posters as TMDBPoster[] ?? [])
          .sort((a, b) => b.vote_count - a.vote_count)
          .slice(0, 16)
          .map(p => `https://image.tmdb.org/t/p/w342${p.file_path}`)

        setPosterOptions(posters)
        setPostersLoaded(true)
      } catch (e) {
        console.error(e)
      }
      setLoadingPosters(false)
    }
    fetchPosters()
  }, [])

  function handleSave() {
    onSave({ ...entry, rating, note: note.trim(), poster })
  }

  const stars = [1, 2, 3, 4, 5].map(n => {
    const full = rating >= n
    const half = !full && rating >= n - 0.5
    return (
      <span key={n} style={{ position:'relative', display:'inline-block', fontSize:28, userSelect:'none' }}>
        <span style={{ color:'#2a2a2a' }}>★</span>
        <span style={{ position:'absolute', left:0, top:0, overflow:'hidden', width:full?'100%':half?'50%':'0%', color:'#ff6b6b', pointerEvents:'none' }}>★</span>
        <span onClick={() => setRating(rating===n-0.5?0:n-0.5)} style={{ position:'absolute', left:0,  top:0, width:'50%', height:'100%', cursor:'pointer' }}/>
        <span onClick={() => setRating(rating===n?0:n)}          style={{ position:'absolute', right:0, top:0, width:'50%', height:'100%', cursor:'pointer' }}/>
      </span>
    )
  })

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
    >
      <div style={{ background:'#1a1a1a', border:'1px solid #222', borderRadius:14, width:'100%', maxWidth:480, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #1e1e1e', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:'Georgia, serif', fontSize:'1.1rem', fontWeight:400, color:'#eaeaea' }}>{entry.title}</div>
            <div style={{ fontSize:11, color:'#444', marginTop:2 }}>
              {entry.year && <span>{entry.year}</span>}
              {entry.imdb && <span style={{ color:'#f5c518', marginLeft:10 }}>★ {entry.imdb} IMDb</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY:'auto', padding:'20px 22px', flex:1, display:'flex', flexDirection:'column', gap:22 }}>

          {/* Rating */}
          <div>
            <label style={{ display:'block', fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>
              My rating {rating > 0 && <span style={{ color:'#ff6b6b', textTransform:'none', marginLeft:6 }}>{rating * 2} / 10</span>}
            </label>
            <div style={{ display:'flex', gap:4 }}>{stars}</div>
          </div>

          {/* Note */}
          <div>
            <label style={{ display:'block', fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Comment</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Why does this one matter?"
              rows={3}
              style={{ width:'100%', padding:'10px 12px', background:'#141414', border:'1px solid #222', borderRadius:8, color:'#eaeaea', fontSize:'0.88rem', outline:'none', resize:'vertical', fontFamily:'system-ui, sans-serif', lineHeight:1.5 }}
            />
          </div>

          {/* Poster */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <label style={{ fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:'0.6px' }}>Poster</label>
              {loadingPosters && <span style={{ fontSize:10, color:'#444' }}>Loading posters…</span>}
              {postersLoaded  && <span style={{ fontSize:10, color:'#444' }}>{posterOptions.length} available — click to select</span>}
            </div>

            {/* Current poster preview */}
            <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:16 }}>
              <div style={{ width:72, height:108, borderRadius:6, overflow:'hidden', background:'#111', flexShrink:0, border:'2px solid #ff6b6b' }}>
                {poster
                  ? <img src={poster} alt="current" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>🎬</div>
                }
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, color:'#555', marginBottom:6 }}>Current poster</div>
                <input
                  value={poster}
                  onChange={e => setPoster(e.target.value)}
                  placeholder="Paste any image URL…"
                  style={{ width:'100%', padding:'7px 10px', background:'#141414', border:'1px solid #222', borderRadius:7, color:'#666', fontSize:'0.75rem', outline:'none' }}
                />
                <button onClick={() => setPoster('')}
                  style={{ marginTop:6, padding:'4px 10px', background:'transparent', border:'1px solid #222', borderRadius:5, color:'#444', fontSize:'0.72rem', cursor:'pointer' }}>
                  Clear
                </button>
              </div>
            </div>

            {/* TMDB poster grid */}
            {posterOptions.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6 }}>
                {posterOptions.map((url, i) => (
                  <div key={i} onClick={() => setPoster(url)}
                    style={{ position:'relative', borderRadius:6, overflow:'hidden', cursor:'pointer', border: poster===url?'2px solid #ff6b6b':'2px solid transparent', transition:'border-color 0.12s', aspectRatio:'2/3' }}>
                    <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                    {poster === url && (
                      <div style={{ position:'absolute', top:4, right:4, background:'#ff6b6b', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', fontWeight:700 }}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loadingPosters && !postersLoaded && (
              <div style={{ padding:'20px 0', textAlign:'center', color:'#333', fontSize:12 }}>
                Could not load TMDB posters — paste a URL above
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid #1e1e1e', display:'flex', gap:10, flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', background:'transparent', border:'1px solid #222', borderRadius:7, color:'#555', fontSize:'0.85rem', cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ flex:2, padding:'10px', background:'#ff6b6b', border:'none', borderRadius:7, color:'#fff', fontSize:'0.85rem', fontWeight:500, cursor:'pointer' }}>
            Save
          </button>
        </div>

      </div>
    </div>
  )
}