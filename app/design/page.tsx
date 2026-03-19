'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  CardLayout, FieldElement, FieldId,
  PRESETS, DEFAULT_LAYOUT, safeLayout,
  ACCENT_OPTIONS, BG_OPTIONS, TEXT_PRESETS, FONT_OPTIONS,
} from '@/app/types'
import { saveLayout, loadLayout } from '@/lib/storage'
import type { User } from '@supabase/supabase-js'

type Mode = 'simple' | 'advanced'

const FIELD_LABELS: Record<FieldId, string> = {
  rank:'Rank #', title:'Title', year:'Year',
  imdb:'IMDb', stars:'Stars', score:'Score', note:'Note',
}

const FIELD_SAMPLE: Record<FieldId, string> = {
  rank:'#1', title:'Dune: Part Two', year:'2024',
  imdb:'★ 8.5 IMDb', stars:'★★★★½', score:'9', note:'"The scale of this film is unreal."',
}

const SAMPLE = {
  id:'p1', type:'movies' as const, title:'Dune: Part Two', year:2024,
  poster:'https://media.themoviedb.org/t/p/w440_and_h660_face/10CcntfB2m3eptSEuyQC8cwuip9.jpg',
  imdb:8.5, rating:4.5, note:'The scale of this film is unreal.', rank:1,
}

// Inject Google Font once
const loadedFonts = new Set<string>()
function ensureFont(url?: string) {
  if (!url || typeof document === 'undefined' || loadedFonts.has(url)) return
  loadedFonts.add(url)
  const l = document.createElement('link')
  l.rel = 'stylesheet'; l.href = url
  document.head.appendChild(l)
}

// ── Scaled live preview ───────────────────────────────────────────────────────

function PreviewCard({ layout, scale = 1 }: { layout: CardLayout; scale?: number }) {
  const fontOpt = FONT_OPTIONS.find(f => f.value === layout.fontFamily)
  if (fontOpt?.url) ensureFont(fontOpt.url)

  const W = 560
  const H = layout.cardH
  const { cardBg, fontFamily, poster, accentLine, elements } = layout

  function AccLine() {
    if (!accentLine?.visible) return null
    const leftPct = poster.visible ? poster.w : 0
    return (
      <div style={{ position:'absolute', left:`${leftPct}%`, top:0, width:accentLine.thickness, height:'100%', background:accentLine.color, zIndex:5, pointerEvents:'none', transform:'translateX(-50%)' }}/>
    )
  }

  function renderEl(el: FieldElement) {
    if (!el.visible) return null
    const glow = el.glow ? `0 0 8px ${el.color}, 0 0 22px ${el.color}66` : undefined
    const base: React.CSSProperties = {
      position:'absolute', left:`${el.x}%`, top:`${el.y}%`,
      fontSize:el.fontSize, color:el.color,
      fontWeight:el.bold?700:400, fontStyle:el.italic?'italic':'normal',
      fontFamily, lineHeight:1.2, whiteSpace:'nowrap', zIndex:2, textShadow:glow,
    }
    switch (el.id) {
      case 'rank':  return <div key="rank" style={base}>#{SAMPLE.rank}</div>
      case 'title': return <div key="title" style={{ ...base, maxWidth:'78%', overflow:'hidden', textOverflow:'ellipsis' }}>{SAMPLE.title}</div>
      case 'year':  return <div key="year" style={base}>{SAMPLE.year}</div>
      case 'imdb':  return <div key="imdb" style={base}>★ {SAMPLE.imdb} IMDb</div>
      case 'note':  return <div key="note" style={{ ...base, maxWidth:'75%', overflow:'hidden', textOverflow:'ellipsis' }}>"{SAMPLE.note}"</div>
      case 'score': return (
        <div key="score" style={{ ...base, display:'flex', alignItems:'baseline', gap:2 }}>
          <span style={{ textShadow:glow }}>{SAMPLE.rating*2}</span>
          <span style={{ fontSize:el.fontSize*.5, opacity:.5 }}>/10</span>
        </div>
      )
      case 'stars': return (
        <div key="stars" style={{ ...base, display:'flex', gap:2 }}>
          {[1,2,3,4,5].map(n => {
            const full = SAMPLE.rating >= n
            const half = !full && SAMPLE.rating >= n - 0.5
            return (
              <span key={n} style={{ position:'relative', display:'inline-block', fontSize:el.fontSize }}>
                <span style={{ color:'#2a2a2a' }}>★</span>
                <span style={{ position:'absolute', left:0, top:0, overflow:'hidden', width:full?'100%':half?'50%':'0%', color:el.color, textShadow:glow }}>★</span>
              </span>
            )
          })}
        </div>
      )
      default: return null
    }
  }

  return (
    <div style={{ width:W*scale, height:H*scale, borderRadius:Math.max(4, 10*scale), overflow:'hidden', flexShrink:0, border:'1px solid #1e1e1e', position:'relative' }}>
      <div style={{ width:W, height:H, background:cardBg, position:'relative', transform:`scale(${scale})`, transformOrigin:'top left' }}>
        <AccLine/>
        {poster.visible && (
          <div style={{ position:'absolute', left:`${poster.x}%`, top:`${poster.y}%`, width:`${poster.w}%`, height:`${poster.h}%`, overflow:'hidden', zIndex:0, opacity:poster.opacity??1 }}>
            <img src={SAMPLE.poster} draggable={false} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          </div>
        )}
        {elements.map(el => renderEl(el))}
      </div>
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height:1, background:'#1a1a1a', margin:'22px 0' }}/>
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)}
      style={{ width:28, height:16, borderRadius:8, background:on?'#ff6b6b':'#2a2a2a', position:'relative', cursor:'pointer', flexShrink:0, transition:'background 0.18s' }}>
      <div style={{ position:'absolute', top:2, left:on?13:2, width:12, height:12, borderRadius:'50%', background:'#fff', transition:'left 0.18s' }}/>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <p style={{ fontSize:10, color:'#444', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:10 }}>{children}</p>
}

function FontPicker({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  return (
    <>
      <SectionLabel>Font</SectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
        {FONT_OPTIONS.map(f => {
          if (f.url) ensureFont(f.url)
          const active = value === f.value
          return (
            <button key={f.value} onClick={() => onChange(f.value)}
              style={{ padding:'7px 10px', display:'flex', alignItems:'center', gap:8, background:active?'#161616':'transparent', border:`1px solid ${active?accent:'#1a1a1a'}`, borderRadius:7, cursor:'pointer', transition:'all 0.15s', textAlign:'left' }}>
              <span style={{ fontSize:14, fontFamily:f.value, color:active?'#eaeaea':'#555', lineHeight:1 }}>Aa</span>
              <span style={{ fontSize:10, color:active?'#888':'#333' }}>{f.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ── Simple mode ───────────────────────────────────────────────────────────────

function SimpleMode({ layout, onChange }: { layout: CardLayout; onChange: (l: CardLayout) => void }) {
  const name   = layout.name ?? 'cinematic'
  const accent = layout.accentColor
  const bg     = layout.cardBg
  const font   = layout.fontFamily

  function apply(n: string, a: string, b: string, f: string) {
    const p = PRESETS.find(x => x.id === n) ?? PRESETS[0]
    onChange(p.build(a, b, f))
  }

  return (
    <div>
      <SectionLabel>Preset</SectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:4 }}>
        {PRESETS.map(p => {
          const isActive = name === p.id
          const prev = p.build(accent, '#181818', font)
          return (
            <button key={p.id} onClick={() => apply(p.id, accent, bg, font)}
              style={{ padding:0, background:isActive?'#161616':'#0e0e0e', border:`1px solid ${isActive?accent:'#1a1a1a'}`, borderRadius:10, cursor:'pointer', overflow:'hidden', transition:'all 0.15s', textAlign:'left' }}>
              <div style={{ padding:'10px 10px 6px' }}>
                <PreviewCard layout={prev} scale={0.3} />
              </div>
              <div style={{ padding:'0 10px 10px' }}>
                <div style={{ fontSize:11, fontWeight:500, color:isActive?'#eaeaea':'#555' }}>{p.name}</div>
                <div style={{ fontSize:9, color:'#2a2a2a', marginTop:2, lineHeight:1.4 }}>{p.desc}</div>
                {isActive && <div style={{ fontSize:9, color:accent, marginTop:4 }}>✓ Active</div>}
              </div>
            </button>
          )
        })}
      </div>

      <Divider/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div>
          <SectionLabel>Accent colour</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
            {ACCENT_OPTIONS.map(a => (
              <div key={a.value} onClick={() => apply(name, a.value, bg, font)}
                style={{ width:26, height:26, borderRadius:'50%', background:a.value, cursor:'pointer', border:accent===a.value?'2px solid #fff':'2px solid transparent', transform:accent===a.value?'scale(1.18)':'scale(1)', transition:'transform 0.15s' }}
                title={a.label}/>
            ))}
          </div>
          <input type="color" value={accent} onChange={e => apply(name, e.target.value, bg, font)}
            style={{ width:'100%', height:24, borderRadius:6, border:'1px solid #1e1e1e', padding:0, background:'transparent', cursor:'pointer' }}/>
        </div>
        <div>
          <SectionLabel>Background</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>
            {BG_OPTIONS.map(b => (
              <div key={b} onClick={() => apply(name, accent, b, font)}
                style={{ width:26, height:26, borderRadius:6, background:b, cursor:'pointer', border:bg===b?`2px solid ${accent}`:'1px solid #1e1e1e', transition:'border 0.15s' }}/>
            ))}
          </div>
          <input type="color" value={bg} onChange={e => apply(name, accent, e.target.value, font)}
            style={{ width:'100%', height:24, borderRadius:6, border:'1px solid #1e1e1e', padding:0, background:'transparent', cursor:'pointer' }}/>
        </div>
      </div>

      <Divider/>
      <FontPicker value={font} onChange={f => apply(name, accent, bg, f)} accent={accent}/>
      <Divider/>

      <SectionLabel>Current look</SectionLabel>
      <PreviewCard layout={layout} scale={0.52}/>
    </div>
  )
}

// ── Advanced mode ─────────────────────────────────────────────────────────────

function AdvancedMode({ layout, onChange }: { layout: CardLayout; onChange: (l: CardLayout) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef   = useRef<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null)
  const accent = layout.accentColor

  function updateEl(id: string, p: Partial<FieldElement>) {
    onChange({ ...layout, elements: layout.elements.map(el => el.id===id ? { ...el, ...p } : el) })
  }

  function startDrag(e: React.PointerEvent, id: string) {
    e.preventDefault()
    setSelected(id)
    const el     = layout.elements.find(f => f.id === id)!
    const canvas = canvasRef.current!.getBoundingClientRect()
    dragRef.current = { id, ox:el.x, oy:el.y, sx:e.clientX-canvas.left, sy:e.clientY-canvas.top }
  }

  const onMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current || !canvasRef.current) return
    const canvas = canvasRef.current.getBoundingClientRect()
    const dx = ((e.clientX - canvas.left - dragRef.current.sx) / canvas.width)  * 100
    const dy = ((e.clientY - canvas.top  - dragRef.current.sy) / canvas.height) * 100
    updateEl(dragRef.current.id, {
      x: Math.max(0, Math.min(96, dragRef.current.ox + dx)),
      y: Math.max(0, Math.min(94, dragRef.current.oy + dy)),
    })
  }, [layout])

  const onUp = useCallback(() => { dragRef.current = null }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [onMove, onUp])

  const sel = selected ? layout.elements.find(e => e.id === selected) : null

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 210px', gap:20, alignItems:'start' }}>

      {/* Canvas */}
      <div>
        <SectionLabel>Canvas — drag any field to move it</SectionLabel>
        <div ref={canvasRef} onClick={e => { if (e.target===e.currentTarget) setSelected(null) }}
          style={{ position:'relative', width:'100%', height:layout.cardH, background:layout.cardBg, borderRadius:10, overflow:'visible', border:'1px solid #1e1e1e', cursor:'default' }}>

          {/* Accent line */}
          {layout.accentLine?.visible && (
            <div style={{
              position:'absolute',
              left:`${layout.poster.visible ? layout.poster.w : 0}%`,
              top:0, width:layout.accentLine.thickness, height:'100%',
              background:layout.accentLine.color, zIndex:5, pointerEvents:'none',
              transform:'translateX(-50%)',
            }}/>
          )}

          {/* Card edge */}
          <div style={{ position:'absolute', inset:0, borderRadius:10, border:'1px dashed rgba(255,255,255,0.04)', pointerEvents:'none', zIndex:50, overflow:'hidden' }}/>

          {/* Poster */}
          {layout.poster.visible && (
            <div style={{ position:'absolute', left:`${layout.poster.x}%`, top:`${layout.poster.y}%`, width:`${layout.poster.w}%`, height:`${layout.poster.h}%`, overflow:'hidden', zIndex:0, opacity:layout.poster.opacity??1 }}>
              <img src={SAMPLE.poster} draggable={false} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
          )}

          {/* Elements */}
          {layout.elements.map(el => {
            if (!el.visible) return null
            const isSel = selected === el.id
            const glow  = el.glow ? `0 0 8px ${el.color}, 0 0 22px ${el.color}66` : undefined
            return (
              <div key={el.id}
                onPointerDown={e => startDrag(e, el.id)}
                onClick={e => { e.stopPropagation(); setSelected(el.id) }}
                style={{
                  position:'absolute', left:`${el.x}%`, top:`${el.y}%`,
                  fontSize:el.fontSize, color:el.color,
                  fontWeight:el.bold?700:400, fontStyle:el.italic?'italic':'normal',
                  fontFamily:layout.fontFamily, lineHeight:1.2, whiteSpace:'nowrap',
                  cursor:'move', zIndex:isSel?20:3,
                  padding:'2px 4px', borderRadius:3, userSelect:'none', textShadow:glow,
                  outline:isSel?`1.5px dashed ${accent}`:'none', outlineOffset:3,
                  background:isSel?`${accent}18`:'transparent',
                }}>
                {FIELD_SAMPLE[el.id as FieldId]}
                {isSel && (
                  <div style={{ position:'absolute', top:-16, left:0, fontSize:8, color:accent, background:'rgba(0,0,0,0.88)', padding:'1px 5px', borderRadius:3, whiteSpace:'nowrap', pointerEvents:'none' }}>
                    {FIELD_LABELS[el.id as FieldId]} · {Math.round(el.x)}% {Math.round(el.y)}%
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Card controls */}
        <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:14, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:10, color:'#444' }}>Height</label>
            <input type="range" min={60} max={220} value={layout.cardH} onChange={e => onChange({ ...layout, cardH:+e.target.value })} style={{ width:90, accentColor:accent }}/>
            <span style={{ fontSize:10, color:'#555', minWidth:32 }}>{layout.cardH}px</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Toggle on={layout.poster.visible} onChange={v => onChange({ ...layout, poster:{ ...layout.poster, visible:v } })}/>
            <span style={{ fontSize:10, color:'#555' }}>Poster</span>
          </div>
          {layout.poster.visible && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:10, color:'#444' }}>Width</label>
              <input type="range" min={8} max={50} value={layout.poster.w} onChange={e => onChange({ ...layout, poster:{ ...layout.poster, w:+e.target.value } })} style={{ width:70, accentColor:accent }}/>
              <span style={{ fontSize:10, color:'#555' }}>{layout.poster.w}%</span>
            </div>
          )}
          {layout.poster.visible && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:10, color:'#444' }}>Opacity</label>
              <input type="range" min={10} max={100} value={Math.round((layout.poster.opacity??1)*100)} onChange={e => onChange({ ...layout, poster:{ ...layout.poster, opacity:+e.target.value/100 } })} style={{ width:60, accentColor:accent }}/>
              <span style={{ fontSize:10, color:'#555' }}>{Math.round((layout.poster.opacity??1)*100)}%</span>
            </div>
          )}
        </div>

        <Divider/>

        {/* Dividing line */}
        <SectionLabel>Dividing line</SectionLabel>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Toggle on={layout.accentLine?.visible??false} onChange={v => onChange({ ...layout, accentLine:{ ...layout.accentLine!, visible:v } })}/>
            <span style={{ fontSize:10, color:'#555' }}>Show</span>
          </div>
          {layout.accentLine?.visible && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <label style={{ fontSize:10, color:'#444' }}>Thickness</label>
                <input type="range" min={1} max={8} value={layout.accentLine?.thickness??2}
                  onChange={e => onChange({ ...layout, accentLine:{ ...layout.accentLine!, thickness:+e.target.value } })}
                  style={{ width:60, accentColor:accent }}/>
                <span style={{ fontSize:10, color:'#555' }}>{layout.accentLine?.thickness}px</span>
              </div>
              <input type="color" value={layout.accentLine?.color??accent}
                onChange={e => onChange({ ...layout, accentLine:{ ...layout.accentLine!, color:e.target.value } })}
                style={{ width:26, height:26, borderRadius:5, border:'1px solid #222', padding:0, background:'transparent', cursor:'pointer' }}/>
            </>
          )}
        </div>

        <Divider/>

        {/* Colors */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div>
            <SectionLabel>Accent</SectionLabel>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
              {ACCENT_OPTIONS.map(a => (
                <div key={a.value} onClick={() => onChange({ ...layout, accentColor:a.value })}
                  style={{ width:22, height:22, borderRadius:'50%', background:a.value, cursor:'pointer', border:accent===a.value?'2px solid #fff':'2px solid transparent', transform:accent===a.value?'scale(1.18)':'scale(1)', transition:'transform 0.15s' }}/>
              ))}
            </div>
            <input type="color" value={accent} onChange={e => onChange({ ...layout, accentColor:e.target.value })}
              style={{ width:'100%', height:22, borderRadius:5, border:'1px solid #1e1e1e', padding:0, background:'transparent', cursor:'pointer' }}/>
          </div>
          <div>
            <SectionLabel>Background</SectionLabel>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
              {BG_OPTIONS.map(b => (
                <div key={b} onClick={() => onChange({ ...layout, cardBg:b })}
                  style={{ width:22, height:22, borderRadius:5, background:b, cursor:'pointer', border:layout.cardBg===b?`2px solid ${accent}`:'1px solid #1e1e1e' }}/>
              ))}
            </div>
            <input type="color" value={layout.cardBg} onChange={e => onChange({ ...layout, cardBg:e.target.value })}
              style={{ width:'100%', height:22, borderRadius:5, border:'1px solid #1e1e1e', padding:0, background:'transparent', cursor:'pointer' }}/>
          </div>
        </div>

        <Divider/>
        <FontPicker value={layout.fontFamily} onChange={f => onChange({ ...layout, fontFamily:f })} accent={accent}/>
      </div>

      {/* Inspector */}
      <div style={{ background:'#0e0e0e', border:'1px solid #1a1a1a', borderRadius:10, padding:14, position:'sticky', top:20 }}>
        {!sel ? (
          <div>
            <p style={{ fontSize:10, color:'#2a2a2a', marginBottom:12, lineHeight:1.7 }}>Click a field on the canvas to edit it</p>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {layout.elements.map(el => (
                <label key={el.id} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'5px 6px', borderRadius:6 }}>
                  <Toggle on={el.visible} onChange={v => updateEl(el.id, { visible:v })}/>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:el.color, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:el.visible?'#888':'#333', flex:1 }}>{FIELD_LABELS[el.id as FieldId]}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:12, fontWeight:500, color:'#eaeaea' }}>{FIELD_LABELS[sel.id as FieldId]}</span>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#444', cursor:'pointer', fontSize:14 }}>×</button>
            </div>

            <p style={{ fontSize:9, color:'#333', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Size</p>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
              <input type="range" min={8} max={72} value={sel.fontSize} onChange={e => updateEl(sel.id, { fontSize:+e.target.value })} style={{ flex:1, accentColor:accent }}/>
              <span style={{ fontSize:9, color:'#555', minWidth:24 }}>{sel.fontSize}</span>
            </div>

            <p style={{ fontSize:9, color:'#333', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Color</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
              {TEXT_PRESETS.map(c => (
                <div key={c} onClick={() => updateEl(sel.id, { color:c })}
                  style={{ width:18, height:18, borderRadius:4, background:c, cursor:'pointer', border:sel.color===c?'2px solid #fff':'1px solid #1a1a1a' }}/>
              ))}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:14 }}>
              <input type="color" value={sel.color} onChange={e => updateEl(sel.id, { color:e.target.value })}
                style={{ width:26, height:26, borderRadius:5, border:'1px solid #222', padding:0, background:'transparent', cursor:'pointer', flexShrink:0 }}/>
              <input type="text" value={sel.color}
                onChange={e => { if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateEl(sel.id, { color:e.target.value }) }}
                style={{ flex:1, padding:'4px 6px', background:'#111', border:'1px solid #1a1a1a', borderRadius:5, color:'#777', fontSize:10, outline:'none', fontFamily:'monospace' }}/>
            </div>

            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              <button onClick={() => updateEl(sel.id, { bold:!sel.bold })}
                style={{ flex:1, padding:'6px 0', background:sel.bold?accent:'transparent', border:`1px solid ${sel.bold?accent:'#1e1e1e'}`, borderRadius:6, color:sel.bold?'#fff':'#444', fontSize:13, fontWeight:700, cursor:'pointer' }}>B</button>
              <button onClick={() => updateEl(sel.id, { italic:!sel.italic })}
                style={{ flex:1, padding:'6px 0', background:sel.italic?accent:'transparent', border:`1px solid ${sel.italic?accent:'#1e1e1e'}`, borderRadius:6, color:sel.italic?'#fff':'#444', fontSize:13, fontStyle:'italic', cursor:'pointer' }}>I</button>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Toggle on={sel.visible} onChange={v => updateEl(sel.id, { visible:v })}/>
              <span style={{ fontSize:10, color:'#555' }}>Visible</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DesignPage() {
  const router = useRouter()
  const [user,    setUser]    = useState<User | null>(null)
  const [layout,  setLayout]  = useState<CardLayout>(DEFAULT_LAYOUT)
  const [mode,    setMode]    = useState<Mode>('simple')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUser(data.user)
      const raw = await loadLayout(data.user.id)
      if (raw) setLayout(safeLayout(raw))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const opt = FONT_OPTIONS.find(f => f.value === layout.fontFamily)
    if (opt?.url) ensureFont(opt.url)
  }, [layout.fontFamily])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await saveLayout(user.id, layout)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div style={{ background:'#0a0a0a', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#444', fontFamily:'system-ui' }}>
      Loading…
    </div>
  )

  const accent = layout.accentColor

  return (
    <div style={{ background:'#0a0a0a', minHeight:'100vh', color:'#eaeaea', fontFamily:'system-ui, sans-serif' }}>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'40px 24px 80px' }}>

        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:'#444', cursor:'pointer', fontSize:12, marginBottom:20, padding:0, display:'block' }}>
          ← Back
        </button>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28, flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ fontFamily:'Georgia, serif', fontSize:'1.8rem', fontWeight:400, lineHeight:1, marginBottom:6 }}>
              Card <em style={{ fontStyle:'italic', color:accent }}>design</em>
            </h1>
            <p style={{ color:'#333', fontSize:12, margin:0 }}>Applies to your list and public profile instantly.</p>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ display:'flex', background:'#111', border:'1px solid #1e1e1e', borderRadius:8, overflow:'hidden' }}>
              {(['simple','advanced'] as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ padding:'7px 18px', background:mode===m?'#1e1e1e':'transparent', color:mode===m?'#eaeaea':'#444', border:'none', borderBottom:mode===m?`2px solid ${accent}`:'2px solid transparent', cursor:'pointer', fontSize:11, fontWeight:mode===m?500:400, textTransform:'capitalize', transition:'all 0.15s' }}>
                  {m}
                </button>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'8px 22px', background:saved?'#1a5c35':accent, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', transition:'background 0.3s', whiteSpace:'nowrap' }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>

        <Divider/>

        {mode === 'simple'
          ? <SimpleMode layout={layout} onChange={setLayout} />
          : <AdvancedMode layout={layout} onChange={setLayout} />
        }
      </div>
    </div>
  )
}