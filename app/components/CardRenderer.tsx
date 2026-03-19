'use client'

import { useState } from 'react'
import { Entry, CardLayout, FieldElement } from '@/app/types'

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

type Props = {
  entry:        Entry
  index:        number
  layout:       CardLayout
  onRate?:      (id: string, rating: number) => void
  onEdit?:      (entry: Entry) => void
  onDelete?:    (id: string) => void
  onDragStart?: (e: React.PointerEvent) => void
  isDragging?:  boolean
  onHover?:     (on: boolean) => void
  preview?:     boolean
}

export default function CardRenderer({
  entry, index, layout,
  onRate, onEdit, onDelete,
  onDragStart, isDragging = false, onHover,
  preview = false,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const { cardBg, cardH, fontFamily, poster, accentLine, elements } = layout

  // Accent line sits at the RIGHT edge of the poster — always between poster and info
  function AccLine() {
    if (!accentLine?.visible) return null
    const leftPct = poster.visible ? poster.w : 0
    return (
      <div style={{
        position:   'absolute',
        left:       `${leftPct}%`,
        top:        0,
        width:      accentLine.thickness,
        height:     '100%',
        background: accentLine.color,
        zIndex:     5,
        pointerEvents: 'none',
        transform:  'translateX(-50%)',
      }}/>
    )
  }

  function renderEl(el: FieldElement) {
    if (!el.visible) return null
    const glow = el.glow
      ? `0 0 8px ${el.color}, 0 0 22px ${el.color}66`
      : undefined

    const base: React.CSSProperties = {
      position:   'absolute',
      left:       `${Math.min(el.x, 96)}%`,
      top:        `${Math.min(el.y, 94)}%`,
      fontSize:   el.fontSize,
      color:      el.color,
      fontWeight: el.bold   ? 700 : 400,
      fontStyle:  el.italic ? 'italic' : 'normal',
      fontFamily,
      lineHeight:    1.2,
      whiteSpace:    'nowrap',
      zIndex:        2,
      pointerEvents: 'none',
      textShadow:    glow,
    }

    switch (el.id) {
      case 'rank':
        return <div key="rank" style={base}>#{index + 1}</div>

      case 'title':
        return (
          <div key="title" style={{
            ...base,
            maxWidth:     '78%',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            transform:    hovered && !preview ? 'translateX(2px)' : 'none',
            transition:   `transform 220ms ${SPRING}`,
          }}>
            {entry.title}
          </div>
        )

      case 'year':
        return entry.year ? <div key="year" style={base}>{entry.year}</div> : null

      case 'imdb':
        return entry.imdb ? <div key="imdb" style={base}>★ {entry.imdb} IMDb</div> : null

      case 'note':
        return entry.note ? (
          <div key="note" style={{ ...base, maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            "{entry.note}"
          </div>
        ) : null

      case 'stars':
        return (
          <div key="stars" style={{ ...base, display: 'flex', gap: 2, pointerEvents: 'auto' }}>
            {[1,2,3,4,5].map(n => {
              const full = entry.rating >= n
              const half = !full && entry.rating >= n - 0.5
              return (
                <span key={n} style={{ position: 'relative', display: 'inline-block', fontSize: el.fontSize, userSelect: 'none' }}>
                  <span style={{ color: '#2a2a2a' }}>★</span>
                  <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: full?'100%':half?'50%':'0%', color: el.color, pointerEvents: 'none', textShadow: glow }}>★</span>
                  {!preview && onRate && <>
                    <span onPointerDown={e=>e.stopPropagation()} onClick={()=>onRate(entry.id,entry.rating===n-.5?0:n-.5)} style={{ position:'absolute',left:0,top:0,width:'50%',height:'100%',cursor:'pointer' }}/>
                    <span onPointerDown={e=>e.stopPropagation()} onClick={()=>onRate(entry.id,entry.rating===n?0:n)}         style={{ position:'absolute',right:0,top:0,width:'50%',height:'100%',cursor:'pointer' }}/>
                  </>}
                </span>
              )
            })}
          </div>
        )

      case 'score':
        return entry.rating > 0 ? (
          <div key="score" style={{ ...base, display: 'flex', alignItems: 'baseline', gap: 2, pointerEvents: 'none' }}>
            <span style={{ textShadow: glow }}>{entry.rating * 2}</span>
            <span style={{ fontSize: Math.max(el.fontSize * .5, 9), opacity: .5 }}>/10</span>
          </div>
        ) : null

      default: return null
    }
  }

  return (
    <div
      onPointerDown={!preview ? onDragStart : undefined}
      onMouseEnter={() => { setHovered(true);  onHover?.(true)  }}
      onMouseLeave={() => { setHovered(false); onHover?.(false) }}
      style={{
        position:     'relative',
        width:        '100%',
        height:       cardH,
        background:   cardBg,
        borderRadius: 10,
        overflow:     'hidden',
        cursor:       preview ? 'default' : isDragging ? 'grabbing' : 'grab',
        userSelect:   'none',
      }}
    >
      <AccLine />

      {poster.visible && (
        <div style={{
          position: 'absolute',
          left:     `${poster.x}%`,
          top:      `${poster.y}%`,
          width:    `${poster.w}%`,
          height:   `${poster.h}%`,
          overflow: 'hidden',
          zIndex:   0,
          opacity:  poster.opacity ?? 1,
        }}>
          {entry.poster
            ? <img src={entry.poster} alt={entry.title} draggable={false} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <div style={{ width:'100%', height:'100%', background:'#222', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>🎬</div>
          }
        </div>
      )}

      {elements.map(el => renderEl(el))}

      {!preview && (onEdit || onDelete) && (
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          display: 'flex', gap: 6, zIndex: 10,
          opacity:    hovered ? 1 : 0,
          transform:  hovered ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 0.2s, transform 0.2s',
        }}>
          {onEdit   && <button onPointerDown={e=>e.stopPropagation()} onClick={()=>onEdit(entry)}      style={{ padding:'3px 10px', background:'rgba(0,0,0,0.8)', border:'1px solid #2a2a2a', borderRadius:5, color:'#888', fontSize:'0.72rem', cursor:'pointer' }}>Edit</button>}
          {onDelete && <button onPointerDown={e=>e.stopPropagation()} onClick={()=>onDelete(entry.id)} style={{ padding:'3px 10px', background:'rgba(0,0,0,0.8)', border:'1px solid #2a2a2a', borderRadius:5, color:'#888', fontSize:'0.72rem', cursor:'pointer' }}>Delete</button>}
        </div>
      )}
    </div>
  )
}