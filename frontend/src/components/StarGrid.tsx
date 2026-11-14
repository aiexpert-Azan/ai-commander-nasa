import { motion } from 'framer-motion'
import type { StarSummary } from '../api/client'
import type { DecisionRecord } from '../game/store'

// Stylized target field. Positions are decorative (hashed from Kepler ID), not sky coordinates.
export function StarGrid({ stars, selected, observed, decisions, onSelect }: {
  stars: StarSummary[]; selected: string | null; observed: string[]; decisions: Record<string, DecisionRecord>; onSelect: (id: string) => void
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-cyan-300/10 bg-[radial-gradient(ellipse_at_center,#0c1a3d_0%,#03050d_75%)]">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        {[20, 40, 60, 80].map((p) => <line key={`v${p}`} x1={`${p}%`} x2={`${p}%`} y1="0" y2="100%" stroke="#1e2f5c" strokeDasharray="2 6" />)}
        {[25, 50, 75].map((p) => <line key={`h${p}`} y1={`${p}%`} y2={`${p}%`} x1="0" x2="100%" stroke="#1e2f5c" strokeDasharray="2 6" />)}
      </svg>
      {stars.map((s, i) => {
        const d = decisions[s.id]
        const isObs = observed.includes(s.id)
        const isSel = selected === s.id
        const color = d ? (d.correct ? '#34d399' : '#fb7185') : isObs ? '#fbbf24' : '#e0f2fe'
        const size = 10 + s.grid.mag * 8
        return (
          <motion.button key={s.id} onClick={() => onSelect(s.id)} aria-label={`Select ${s.name}`}
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.3 }}
            className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.grid.x}%`, top: `${s.grid.y}%` }}>
            {isSel && <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 animate-pulse-ring" />}
            <span className="block rounded-full" style={{ width: size, height: size, background: color, boxShadow: `0 0 ${size}px ${color}` }} />
            <span className={`pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-slate-200 ${isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {s.name}
            </span>
          </motion.button>
        )
      })}
      <div className="absolute bottom-1.5 left-2 text-[10px] text-slate-500">Stylized target grid · not real sky positions</div>
    </div>
  )
}
