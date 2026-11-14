import { motion, useReducedMotion } from 'framer-motion'

// EDUCATIONAL ILLUSTRATION ONLY: a drawn cartoon of the transit method, never real or game data.
// Planet path and brightness dot share one linear timeline so the dip lines up with the transit.
const DUR = 6
const XS = [20, 52, 68, 132, 148, 180] // planet x at: start, touches star, fully in, starts leaving, gone, end
const TIMES = XS.map((x) => (x - 20) / 160)
const DOT_Y = [30, 30, 42, 42, 30, 30]

export function TransitDemo({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion()
  const loop = { duration: DUR, repeat: Infinity, ease: 'linear' as const, times: TIMES }
  return (
    <figure className="w-full">
      <div className="relative overflow-hidden rounded-xl border border-dashed border-amber-300/30 bg-space-950/60">
        <span className="absolute right-2 top-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
          Illustration · not real data
        </span>
        <svg viewBox="0 0 200 130" className={`w-full ${compact ? 'max-h-40' : 'max-h-56'}`} role="img"
          aria-label="Illustration: a planet passes in front of its star, and the star's brightness graph dips while the planet blocks some light.">
          <defs>
            <radialGradient id="tdStar">
              <stop offset="0" stopColor="#fff7d6" /><stop offset="0.6" stopColor="#fcd34d" /><stop offset="1" stopColor="#f59e0b" />
            </radialGradient>
          </defs>
          {/* Star + planet */}
          <circle cx="100" cy="40" r="44" fill="#fbbf24" opacity="0.12" />
          <circle cx="100" cy="40" r="32" fill="url(#tdStar)" />
          {reduce ? (
            <circle cx="100" cy="40" r="7" fill="#0b1226" stroke="#38bdf8" strokeWidth="1" />
          ) : (
            <motion.circle cy="40" r="7" fill="#0b1226" stroke="#38bdf8" strokeWidth="1"
              initial={{ cx: XS[0] }} animate={{ cx: XS }} transition={loop} />
          )}
          <text x="100" y="86" textAnchor="middle" fontSize="7" fill="#94a3b8">Star (seen from far away)</text>

          {/* Brightness graph */}
          <line x1="20" y1="96" x2="180" y2="96" stroke="#1e2f5c" />
          <g transform="translate(0,70)">
            <path d="M20 30 L52 30 L68 42 L132 42 L148 30 L180 30" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
            {reduce ? (
              <circle cx="100" cy="42" r="2.6" fill="#7dd3fc" />
            ) : (
              <motion.circle r="2.6" fill="#7dd3fc" initial={{ cx: XS[0], cy: DOT_Y[0] }} animate={{ cx: XS, cy: DOT_Y }} transition={loop} />
            )}
            <text x="100" y="54" textAnchor="middle" fontSize="7" fill="#fbbf24">brightness dip</text>
          </g>
          <text x="10" y="102" fontSize="6" fill="#94a3b8" transform="rotate(-90 10 102)" textAnchor="middle">brightness</text>
          <text x="180" y="127" fontSize="6" fill="#94a3b8" textAnchor="end">time →</text>
        </svg>
      </div>
      <figcaption className="mt-2 text-sm text-slate-300">
        When a planet crosses in front of a star, it blocks a tiny amount of light. Scientists look for these <b className="text-amber-200">brightness dips</b>.
      </figcaption>
    </figure>
  )
}
