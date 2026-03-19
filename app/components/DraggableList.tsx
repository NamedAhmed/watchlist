'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Entry, CardLayout, getCardHeight } from '@/app/types'
import CardRenderer from './CardRenderer'

const GAP    = 6
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const PUSH   = 8

type Props = {
  entries:   Entry[]
  layout:    CardLayout
  onRate:    (id: string, rating: number) => void
  onEdit:    (entry: Entry) => void
  onDelete:  (id: string) => void
  onReorder: (reordered: Entry[]) => void
}

export default function DraggableList({ entries, layout, onRate, onEdit, onDelete, onReorder }: Props) {
  const CARD_H  = getCardHeight(layout)
  const STEP    = CARD_H + GAP

  const cardHRef = useRef(CARD_H)
  const stepRef  = useRef(STEP)
  cardHRef.current = CARD_H
  stepRef.current  = STEP

  const [order,      setOrder]      = useState<string[]>(entries.map(e => e.id))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const elMap        = useRef<Map<string, HTMLDivElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const pressing     = useRef(false)
  const offsetX      = useRef(0)
  const offsetY      = useRef(0)
  const orderRef     = useRef(order)
  const dragIdRef    = useRef<string | null>(null)
  const rafRef       = useRef<number | null>(null)

  const TRANSITION = `top 300ms ${SPRING}`

  useEffect(() => { orderRef.current = order },         [order])
  useEffect(() => { setOrder(entries.map(e => e.id)) }, [entries.length])

  function setCardY(id: string, y: number, animated: boolean) {
    const el = elMap.current.get(id)
    if (!el) return
    el.style.transition = animated ? TRANSITION : 'none'
    el.style.setProperty('--_y', `${y}px`)
  }

  function placeAll(currentOrder: string[], dragId: string | null, hovered: number | null) {
    currentOrder.forEach((id, index) => {
      if (id === dragId) return
      let push = 0
      if (hovered !== null) {
        const dist = index - hovered
        if (dist !== 0) push = dist * PUSH
      }
      setCardY(id, index * stepRef.current + push, true)
    })
  }

  useEffect(() => {
    placeAll(order, draggingId, hoveredIdx)
  }, [order, draggingId, hoveredIdx, STEP])

  function startDrag(e: React.PointerEvent, id: string) {
    if (!containerRef.current) return
    e.preventDefault()
    pressing.current = true
    setHoveredIdx(null)

    const rect  = containerRef.current.getBoundingClientRect()
    const idx   = orderRef.current.indexOf(id)
    const cardY = idx * stepRef.current

    offsetX.current   = e.clientX - rect.left
    offsetY.current   = e.clientY - rect.top - cardY
    dragIdRef.current = id
    setCardY(id, cardY, false)
    setDraggingId(id)
  }

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!pressing.current || !dragIdRef.current || !containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const rawX = e.clientX - rect.left - offsetX.current
    const rawY = e.clientY - rect.top  - offsetY.current

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = elMap.current.get(dragIdRef.current!)
      if (el) {
        el.style.transition = 'none'
        el.style.setProperty('--_y', `${rawY}px`)
        el.style.transform = `translateX(${rawX}px) rotate(2deg) scale(1.03)`
      }
    })

    const midY = rawY + cardHRef.current / 2
    const id   = dragIdRef.current

    setOrder(prev => {
      const from = prev.indexOf(id)
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] === id) continue
        if (Math.abs(midY - (i * stepRef.current + cardHRef.current / 2)) < stepRef.current / 2) {
          const next = [...prev]
          next.splice(from, 1)
          next.splice(i, 0, id)
          return next
        }
      }
      return prev
    })
  }, [])

  const onPointerUp = useCallback(() => {
    if (!pressing.current || !dragIdRef.current) return
    pressing.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const id        = dragIdRef.current
    const current   = orderRef.current
    const newIdx    = current.indexOf(id)
    const displaced = entries[newIdx]

    const el = elMap.current.get(id)
    if (el) {
      el.style.transition = TRANSITION
      el.style.setProperty('--_y', `${newIdx * stepRef.current}px`)
      el.style.transform = ''
    }

    const reordered = current.map((eid, idx) => {
      const entry = entries.find(e => e.id === eid)!
      return { ...entry, rank: idx + 1, rating: eid === id ? (displaced?.rating ?? entry.rating) : entry.rating }
    })

    onReorder(reordered)
    setDraggingId(null)
    dragIdRef.current = null
  }, [entries, onReorder])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup',   onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup',   onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: order.length * STEP - GAP }}>
      {order.map((id, index) => {
        const entry      = entries.find(e => e.id === id)
        if (!entry) return null
        const isDragging = id === draggingId
        const isHovered  = hoveredIdx === index && !isDragging

        return (
          <div
            key={id}
            ref={el => { if (el) elMap.current.set(id, el); else elMap.current.delete(id) }}
            style={{
              position:   'absolute',
              top:        'var(--_y, 0px)',
              left:       0,
              width:      '100%',
              zIndex:     isDragging ? 100 : isHovered ? 50 : 1,
              filter:     isDragging ? 'brightness(1.12)' : 'none',
              boxShadow:  isDragging ? '0 32px 80px rgba(0,0,0,0.7), 0 8px 20px rgba(255,107,107,0.15)' : 'none',
              transition: 'box-shadow 0.15s, filter 0.15s',
            }}
          >
            <div style={{
              transform:  isHovered ? 'scale(1.02)' : 'scale(1)',
              transition: `transform 300ms ${SPRING}`,
              borderRadius: '10px',
            }}>
              <CardRenderer
                entry={entry}
                index={index}
                layout={layout}
                onRate={onRate}
                onEdit={onEdit}
                onDelete={onDelete}
                onDragStart={ev => startDrag(ev, id)}
                isDragging={isDragging}
                onHover={on => setHoveredIdx(on ? index : null)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}