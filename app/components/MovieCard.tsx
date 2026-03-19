'use client'

import { useState } from 'react'
import { Entry } from '@/app/types'

type Props = {
  entry:       Entry
  index:       number
  onRate:      (id: string, rating: number) => void
  onEdit:      (entry: Entry) => void
  onDelete:    (id: string) => void
  onDragStart: (e: React.PointerEvent) => void
  isDragging:  boolean
  onHover:     (on: boolean) => void   // Added onHover prop
}

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

export default function MovieCard({ entry, index, onRate, onEdit, onDelete, onDragStart, isDragging, onHover }: Props) {

  const [hovered,       setHovered]       = useState(false)
  const [posterHovered, setPosterHovered] = useState(false)

  const stars = [1, 2, 3, 4, 5].map(n => {
    const full = entry.rating >= n
    const half = !full && entry.rating >= n - 0.5
    return (
      <span
        key={n}
        style={{ position: 'relative', display: 'inline-block', fontSize: '18px', userSelect: 'none' }}
      >
        {/* grey base star */}
        <span style={{ color: '#2e2e2e' }}>★</span>

        {/* red fill — full, half, or empty */}
        <span style={{
          position: 'absolute', left: 0, top: 0,
          overflow: 'hidden',
          width: full ? '100%' : half ? '50%' : '0%',
          color: '#ff6b6b',
          pointerEvents: 'none',
          transition: `width 180ms ${SPRING}`,
        }}>★</span>

        {/* left half clickzone → half star */}
        <span
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onRate(entry.id, entry.rating === n - 0.5 ? 0 : n - 0.5)}
          style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', cursor: 'pointer' }}
        />
        {/* right half clickzone → full star */}
        <span
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onRate(entry.id, entry.rating === n ? 0 : n)}
          style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', cursor: 'pointer' }}
        />
      </span>
    )
  })

  return (
    <div
      style={{
        transform:  hovered ? 'scale(1.25)' : 'scale(1)',
        boxShadow:  hovered ? '0 12px 40px rgba(0,0,0,0.5)' : '0 0px 0px rgba(0,0,0,0)',
        zIndex:     hovered ? 5 : 1,
        position:   'relative',
        transition: `transform 300ms ${SPRING}, box-shadow 300ms ease`,
        borderRadius: '10px',
      }}
      onMouseEnter={() => { setHovered(true);  onHover(true)  }} // Updated to call onHover
      onMouseLeave={() => { setHovered(false); onHover(false) }} // Updated to call onHover
    >
      <div
        onPointerDown={onDragStart}
        style={{
          display:    'grid',
          gridTemplateColumns: '120px 1fr',
          background: hovered ? '#1f1f1f' : '#181818',
          borderRadius: '10px',
          overflow:   'hidden',
          height:     '180px',
          cursor:     isDragging ? 'grabbing' : 'grab',
          transition: `background 0.2s`,
          userSelect: 'none',
        }}
      >
        {/* POSTER — zooms on hover, no overlay */}
        <div
          onMouseEnter={() => setPosterHovered(true)}
          onMouseLeave={() => setPosterHovered(false)}
          style={{ width: '120px', height: '180px', overflow: 'hidden', flexShrink: 0 }}
        >
          {entry.poster ? (
            <img
              src={entry.poster}
              alt={entry.title}
              style={{
                width: '120px', height: '180px',
                objectFit: 'cover', display: 'block',
                borderRadius: '8px 0 0 8px',
              }}
            />
          ) : (
            <div style={{ width: '120px', height: '180px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              🎬
            </div>
          )}
        </div>

        {/* INFO — stop drag propagation on interactive children */}
        <div style={{
          padding:        '16px 20px',
          borderLeft:     '2px solid #ff6b6b',
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'center',
          gap:            '6px',
          overflow:       'hidden',
        }}>

          <span style={{
            fontSize:   '0.68rem',
            color:      '#444',
            transition: `color 0.2s`,
          }}>
            #{index + 1}
          </span>

          <div style={{
            fontSize:     '1rem',
            fontWeight:   500,
            color:        '#eaeaea',
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            transform:    hovered ? 'translateX(3px)' : 'translateX(0)',
            transition:   `transform 250ms ${SPRING}`,
          }}>
            {entry.title}
          </div>

          <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#555', flexWrap: 'wrap' }}>
            {entry.year && <span>{entry.year}</span>}
            {entry.imdb && <span style={{ color: '#f5c518' }}>★ {entry.imdb} IMDb</span>}
            {entry.rating > 0 && (
              <span style={{
                color:      '#ff6b6b',
                fontWeight: 500,
                transform:  hovered ? 'scale(1.05)' : 'scale(1)',
                display:    'inline-block',
                transition: `transform 200ms ${SPRING}`,
              }}>
                {entry.rating * 2}/10
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '2px' }}>{stars}</div>

          {entry.note && (
            <div style={{
              fontSize:     '0.72rem',
              color:        '#555',
              fontStyle:    'italic',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}>
              "{entry.note}"
            </div>
          )}

          <div
            style={{
              display:    'flex',
              gap:        '6px',
              marginTop:  '2px',
              opacity:    hovered ? 1 : 0,
              transform:  hovered ? 'translateY(0px)' : 'translateY(4px)',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
          >
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => onEdit(entry)}
              style={{ padding: '3px 10px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '5px', color: '#555', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Edit
            </button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => onDelete(entry.id)}
              style={{ padding: '3px 10px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '5px', color: '#555', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Delete
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}