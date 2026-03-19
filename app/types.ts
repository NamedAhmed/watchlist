export type Entry = {
  id:        string
  type:      'movies' | 'tv'
  title:     string
  year:      number | null
  poster:    string
  imdb:      number | null
  rating:    number
  note:      string
  rank:      number
}

export type FieldId = 'rank' | 'title' | 'year' | 'imdb' | 'stars' | 'score' | 'note'

export type FieldElement = {
  id:       FieldId
  visible:  boolean
  x:        number
  y:        number
  fontSize: number
  color:    string
  bold:     boolean
  italic:   boolean
  glow?:    boolean
}

export type PosterConfig = {
  visible:  boolean
  x:        number
  y:        number
  w:        number
  h:        number
  opacity?: number
}

export type AccentLine = {
  visible:   boolean
  thickness: number
  color:     string
}

export type CardLayout = {
  name:        string
  cardBg:      string
  cardH:       number
  accentColor: string
  fontFamily:  string
  poster:      PosterConfig
  accentLine:  AccentLine
  elements:    FieldElement[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

function el(
  id: FieldId, x: number, y: number,
  size: number, color: string,
  bold = false, italic = false, visible = true, glow = false
): FieldElement {
  return { id, visible, x, y, fontSize: size, color, bold, italic, glow }
}

// ── fonts ─────────────────────────────────────────────────────────────────────

export const FONT_OPTIONS: { label: string; value: string; url?: string }[] = [
  { label: 'System',     value: 'system-ui, sans-serif' },
  { label: 'Serif',      value: "'Georgia', serif" },
  { label: 'Mono',       value: "'Courier New', monospace" },
  { label: 'Syne',       value: "'Syne', sans-serif",          url: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;700&display=swap' },
  { label: 'DM Serif',   value: "'DM Serif Display', serif",   url: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap' },
  { label: 'Playfair',   value: "'Playfair Display', serif",   url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap' },
  { label: 'Space Mono', value: "'Space Mono', monospace",     url: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap' },
  { label: 'Inter',      value: "'Inter', sans-serif",         url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap' },
]

// ── palettes ──────────────────────────────────────────────────────────────────

export const ACCENT_OPTIONS = [
  { label: 'Red',    value: '#ff6b6b' },
  { label: 'Amber',  value: '#ffcf6b' },
  { label: 'Green',  value: '#6bffb0' },
  { label: 'Blue',   value: '#6b9eff' },
  { label: 'Purple', value: '#d06bff' },
  { label: 'Pink',   value: '#ff6bd0' },
  { label: 'Cyan',   value: '#6bfff5' },
  { label: 'White',  value: '#e0e0e0' },
]

export const BG_OPTIONS = [
  '#181818','#111111','#0a0a0a','#0f0f14',
  '#0d1410','#14080f','#0a0f1a','#1a1208',
]

export const TEXT_PRESETS = [
  '#eaeaea','#ffffff','#ff6b6b','#f5c518',
  '#6b9eff','#6bffb0','#d06bff','#ff9966',
  '#aaaaaa','#555555',
]

// ── presets ───────────────────────────────────────────────────────────────────

export type PresetDef = {
  id:    string
  name:  string
  desc:  string
  build: (accent: string, bg: string, font: string) => CardLayout
}

export const PRESETS: PresetDef[] = [
  {
    id: 'cinematic', name: 'Cinematic', desc: 'Classic · poster left · info right',
    build: (accent, bg, font) => ({
      name: 'cinematic', cardBg: bg, cardH: 180, accentColor: accent, fontFamily: font,
      poster:     { visible: true,  x: 0, y: 0, w: 20, h: 100, opacity: 1 },
      accentLine: { visible: true,  thickness: 2, color: accent },
      elements: [
        el('rank',  22, 5,  11, '#444'),
        el('title', 22, 19, 16, '#eaeaea', true),
        el('year',  22, 38, 12, '#555'),
        el('imdb',  45, 38, 12, '#f5c518'),
        el('stars', 22, 54, 15, accent),
        el('score', 22, 70, 22, accent, true),
        el('note',  22, 87, 11, '#444', false, true),
      ],
    }),
  },
  {
    id: 'neon', name: 'Neon', desc: 'Glowing text on deep black',
    build: (accent, _bg, font) => ({
      name: 'neon', cardBg: '#06060f', cardH: 180, accentColor: accent, fontFamily: font,
      poster:     { visible: true,  x: 0, y: 0, w: 20, h: 100, opacity: 0.55 },
      accentLine: { visible: true,  thickness: 1, color: accent },
      elements: [
        el('rank',  22, 5,  10, '#1a1a2e'),
        el('title', 22, 19, 16, '#ffffff', true,  false, true, true),
        el('year',  22, 38, 11, '#2a2a4a'),
        el('imdb',  44, 38, 11, accent,    false,  false, true, true),
        el('stars', 22, 54, 15, accent,    false,  false, true, true),
        el('score', 22, 70, 22, accent,    true,   false, true, true),
        el('note',  22, 87, 10, '#2a2a3a', false, true),
      ],
    }),
  },
  {
    id: 'editorial', name: 'Editorial', desc: 'No poster · ghost rank · serif',
    build: (accent, bg, _font) => ({
      name: 'editorial', cardBg: bg, cardH: 180, accentColor: accent, fontFamily: "'Playfair Display', serif",
      poster:     { visible: false, x: 0, y: 0, w: 0,  h: 0,   opacity: 1 },
      accentLine: { visible: false, thickness: 2, color: accent },
      elements: [
        el('rank',  66, 0,  96, '#1c1c1c',  true),
        el('title', 3,  13, 22, '#eaeaea',  false, true),
        el('year',  3,  43, 12, '#555'),
        el('imdb',  20, 43, 12, '#f5c518'),
        el('stars', 3,  61, 16, accent),
        el('score', 3,  79, 14, accent, true),
        el('note',  52, 57, 11, '#444', false, true),
      ],
    }),
  },
  {
    id: 'score', name: 'Score', desc: 'Giant score dominates the right',
    build: (accent, bg, font) => ({
      name: 'score', cardBg: bg, cardH: 180, accentColor: accent, fontFamily: font,
      poster:     { visible: true,  x: 0, y: 0, w: 20, h: 100, opacity: 1 },
      accentLine: { visible: true,  thickness: 2, color: accent },
      elements: [
        el('rank',  22, 5,  10, '#333'),
        el('title', 22, 18, 14, '#eaeaea', false, true),
        el('year',  22, 37, 11, '#444'),
        el('imdb',  22, 51, 11, '#f5c518'),
        el('stars', 22, 66, 13, accent),
        el('score', 60, 16, 56, accent, true),
        el('note',  22, 82, 10, '#444', false, true),
      ],
    }),
  },
  {
    id: 'banner', name: 'Banner', desc: 'Wide poster bleeds across the top',
    build: (accent, bg, font) => ({
      name: 'banner', cardBg: bg, cardH: 200, accentColor: accent, fontFamily: font,
      poster:     { visible: true,  x: 0, y: 0, w: 100, h: 55, opacity: 1 },
      accentLine: { visible: false, thickness: 2, color: accent },
      elements: [
        el('rank',  2,  2,  10, 'rgba(255,255,255,0.15)'),
        el('title', 2,  62, 15, '#eaeaea', true),
        el('year',  2,  79, 11, '#555'),
        el('imdb',  18, 79, 11, '#f5c518'),
        el('stars', 58, 63, 14, accent),
        el('score', 78, 74, 20, accent, true),
        el('note',  2,  91, 10, '#444', false, true),
      ],
    }),
  },
  {
    id: 'overlay', name: 'Overlay', desc: 'Poster full-bleed · text floats over',
    build: (accent, _bg, font) => ({
      name: 'overlay', cardBg: '#000', cardH: 180, accentColor: accent, fontFamily: font,
      poster:     { visible: true,  x: 0, y: 0, w: 100, h: 100, opacity: 0.5 },
      accentLine: { visible: false, thickness: 2, color: accent },
      elements: [
        el('rank',  3,  4,  10, 'rgba(255,255,255,0.2)'),
        el('title', 3,  65, 18, '#ffffff', true),
        el('year',  3,  81, 11, 'rgba(255,255,255,0.4)'),
        el('imdb',  20, 81, 11, '#f5c518'),
        el('stars', 3,  92, 14, accent),
        el('score', 74, 62, 28, '#ffffff', true),
        el('note',  3,  52, 10, 'rgba(255,255,255,0.28)', false, true),
      ],
    }),
  },
  {
    id: 'wide', name: 'Wide Poster', desc: 'Large poster · compressed info',
    build: (accent, bg, font) => ({
      name: 'wide', cardBg: bg, cardH: 180, accentColor: accent, fontFamily: font,
      poster:     { visible: true,  x: 0, y: 0, w: 38, h: 100, opacity: 1 },
      accentLine: { visible: true,  thickness: 2, color: accent },
      elements: [
        el('rank',  40, 5,  10, '#333'),
        el('title', 40, 18, 14, '#eaeaea', true),
        el('year',  40, 38, 11, '#555'),
        el('imdb',  40, 52, 11, '#f5c518'),
        el('stars', 40, 66, 14, accent),
        el('score', 40, 80, 20, accent, true),
        el('note',  40, 93, 9,  '#444', false, true, false),
      ],
    }),
  },
  {
    id: 'noir', name: 'Noir', desc: 'Pure black · white type · serif',
    build: (accent, _bg, _font) => ({
      name: 'noir', cardBg: '#000000', cardH: 180, accentColor: accent, fontFamily: "'Georgia', serif",
      poster:     { visible: true,  x: 0, y: 0, w: 22, h: 100, opacity: 0.7 },
      accentLine: { visible: true,  thickness: 1, color: '#333' },
      elements: [
        el('rank',  25, 5,  10, '#2a2a2a'),
        el('title', 25, 19, 16, '#ffffff', false, true),
        el('year',  25, 42, 11, '#444'),
        el('imdb',  44, 42, 11, '#777'),
        el('stars', 25, 60, 16, '#ffffff'),
        el('score', 25, 77, 20, '#ffffff', true),
        el('note',  25, 91, 11, '#333', false, true),
      ],
    }),
  },
  {
    id: 'minimal', name: 'Minimal', desc: 'Compact single row · fast to scan',
    build: (accent, bg, font) => ({
      name: 'minimal', cardBg: bg, cardH: 80, accentColor: accent, fontFamily: font,
      poster:     { visible: true,  x: 0, y: 0, w: 10, h: 100, opacity: 1 },
      accentLine: { visible: true,  thickness: 1, color: '#1e1e1e' },
      elements: [
        el('rank',  12, 18, 9,  '#333'),
        el('title', 12, 33, 13, '#eaeaea', true),
        el('year',  12, 62, 10, '#555'),
        el('imdb',  32, 62, 10, '#f5c518'),
        el('stars', 60, 22, 13, accent),
        el('score', 80, 40, 20, accent, true),
        el('note',  12, 80, 9,  '#444', false, true, false),
      ],
    }),
  },
]

export const DEFAULT_LAYOUT: CardLayout = PRESETS[0].build('#ff6b6b', '#181818', 'system-ui, sans-serif')

export function safeLayout(raw: unknown): CardLayout {
  if (!raw || typeof raw !== 'object') return DEFAULT_LAYOUT
  const l = raw as Partial<CardLayout>
  if (!l.elements || !l.poster || !l.cardBg) return DEFAULT_LAYOUT
  return {
    ...DEFAULT_LAYOUT, ...l,
    accentLine: l.accentLine ?? DEFAULT_LAYOUT.accentLine,
  } as CardLayout
}

export function getCardHeight(l: CardLayout): number { return l.cardH }