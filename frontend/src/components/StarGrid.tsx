import { motion } from 'framer-motion'
import type { StarSummary } from '../api/client'
import type { DecisionRecord } from '../game/store'

export function starStatus(id: string, observed: string[], decisions: Record<string, DecisionRecord>) {
  const d = decisions[id]
  if (d) return d.correct ? 'correct' : 'incorrect'
  return observed.includes(id) ? 'observed' : 'new'
}

export const statusColor = { new: '#e0f2fe', observed: '#fbbf24', correct: '#34d399', incorrect: '#fb7185' } as const
export const statusText = { new: 'not observed yet', observed: 'observed, waiting for your call', correct: 'you called it correctly', incorrect: 'your call was incorrect' } as const

// Stylized target field. Positions are decorative (hashed from Kepler ID), not sky coordinates.
// Each star is a 44px touch target; the visible dot inside can be smaller.
export function StarGrid({ stars, selected, observed, decisions, onSelect, highlightNew = false }: {
  stars: StarSummary[]; selected: string | null; observed: string[]; decisions: Record<string, DecisionRecord>; onSelect: (id: string) => void; highlightNew?: boolean
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-cyan-300/10 bg-[radial-gradient(ellipse_at_center,#0c1a3d_0%,#03050d_75%)]">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        {[20, 40, 60, 80].map((p) => <line key={`v${p}`} x1={`${p}%`} x2={`${p}%`} y1="0" y2="100%" stroke="#1e2f5c" strokeDasharray="2 6" />)}
        {[25, 50, 75].map((p) => <line key={`h${p}`} y1={`${p}%`} y2={`${p}%`} x1="0" x2="100%" stroke="#1e2f5c" strokeDasharray="2 6" />)}
      </svg>
      {stars.map((s, i) => {
        const st = starStatus(s.id, observed, decisions)
        const isSel = selected === s.id
        const color = statusColor[st]
        const size = 10 + s.grid.mag * 8
        // Keep targets inside the frame so edge stars stay fully tappable.
        const x = Math.min(94, Math.max(6, s.grid.x))
        const y = Math.min(90, Math.max(8, s.grid.y))
        return (
          <motion.button key={s.id} onClick={() => onSelect(s.id)} aria-label={`${s.name}: ${statusText[st]}`} aria-pressed={isSel}
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
            className={`group absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${isSel ? 'z-10' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}>
            {isSel && <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 animate-pulse-ring" />}
            {highlightNew && st === 'new' && !isSel && <span className="absolute h-7 w-7 rounded-full border border-cyan-200/40 animate-pulse-ring" />}
            <span className="block rounded-full transition-transform group-hover:scale-125" style={{ width: size, height: size, background: color, boxShadow: `0 0 ${size}px ${color}` }} />
            {isSel && (
              <span className={`pointer-events-none absolute top-[calc(100%-6px)] whitespace-nowrap ${x > 75 ? 'right-0' : x < 25 ? 'left-0' : 'left-1/2 -translate-x-1/2'} rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-slate-100`}>
                {s.name}
              </span>
            )}
          </motion.button>
        )
      })}
      <div className="pointer-events-none absolute bottom-1.5 left-2 text-[10px] text-slate-400">Stylized target grid · not real sky positions</div>
    </div>
  )
}
