import { motion } from 'framer-motion'
import type { Design } from '../api/client'

// SVG spacecraft that redraws as components are chosen.
export function SpacecraftPreview({ design, compact = false, deployed = true }: { design: Design; compact?: boolean; deployed?: boolean }) {
  const tel = design.telescope
  const tube = tel === 'tel_large' ? { w: 74, h: 120 } : tel === 'tel_medium' ? { w: 56, h: 100 } : tel === 'tel_small' ? { w: 38, h: 76 } : null
  const segs = design.solar === 'sol_large' ? 3 : design.solar === 'sol_medium' ? 2 : design.solar === 'sol_small' ? 1 : 0
  const ant = design.antenna
  const ins = design.instrument
  const busY = 150
  const cx = 160
  const spring = { type: 'spring' as const, stiffness: 140, damping: 16 }

  return (
    <svg viewBox="0 0 320 240" className={compact ? 'h-40 w-full' : 'h-56 w-full sm:h-64'} role="img" aria-label="Spacecraft preview">
      <defs>
        <linearGradient id="tube" x1="0" x2="1">
          <stop offset="0" stopColor="#94a3b8" /><stop offset="0.5" stopColor="#e2e8f0" /><stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="panel" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1d4ed8" /><stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id="gold" x1="0" x2="1">
          <stop offset="0" stopColor="#b45309" /><stop offset="0.5" stopColor="#fcd34d" /><stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <radialGradient id="glow"><stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx={cx} cy={130} r={110} fill="url(#glow)" />

      {/* Solar arrays */}
      {[-1, 1].map((side) =>
        Array.from({ length: segs }).map((_, i) => (
          <motion.g key={`${side}-${i}`} initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: deployed ? 1 : 0 }}
            transition={{ ...spring, delay: i * 0.08 }} style={{ originX: side < 0 ? '100%' : '0%' }}>
            <rect x={side < 0 ? cx - 40 - (i + 1) * 36 : cx + 40 + i * 36 + 4} y={busY - 2} width={32} height={44} rx={2}
              fill="url(#panel)" stroke="#67e8f9" strokeOpacity={0.6} strokeWidth={1} />
            {[1, 2, 3].map((k) => (
              <line key={k} x1={side < 0 ? cx - 40 - (i + 1) * 36 : cx + 40 + i * 36 + 4} x2={side < 0 ? cx - 8 - (i + 1) * 36 : cx + 76 + i * 36}
                y1={busY - 2 + k * 11} y2={busY - 2 + k * 11} stroke="#a5f3fc" strokeOpacity={0.35} />
            ))}
          </motion.g>
        )),
      )}
      {segs > 0 && <line x1={cx - 40} x2={cx + 44} y1={busY + 20} y2={busY + 20} stroke="#cbd5e1" strokeWidth={3} />}

      {/* Bus */}
      <rect x={cx - 40} y={busY} width={84} height={46} rx={6} fill="url(#gold)" stroke="#fde68a" strokeOpacity={0.6} />
      <rect x={cx - 30} y={busY + 10} width={64} height={26} rx={3} fill="#0f172a" opacity={0.25} />

      {/* Instrument module */}
      {ins && (
        <motion.g key={ins} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <rect x={cx - 22} y={busY - 14} width={48} height={14} rx={2} fill="#0f172a" stroke="#22d3ee" strokeOpacity={0.8} />
          {ins === 'ins_wide' && Array.from({ length: 6 }).map((_, i) => <rect key={i} x={cx - 19 + i * 7.5} y={busY - 11} width={5} height={8} fill="#38bdf8" />)}
          {ins === 'ins_basic' && <rect x={cx - 3} y={busY - 11} width={10} height={8} fill="#38bdf8" />}
          {ins === 'ins_precision' && <><rect x={cx - 10} y={busY - 11} width={24} height={8} fill="#a78bfa" /><circle cx={cx + 2} cy={busY - 7} r={2} fill="#fff" /></>}
        </motion.g>
      )}

      {/* Telescope tube */}
      {tube && (
        <motion.g key={tel} initial={{ opacity: 0, scaleY: 0.4 }} animate={{ opacity: 1, scaleY: 1 }} transition={spring} style={{ originY: '100%' }}>
          <rect x={cx + 2 - tube.w / 2} y={busY - 14 - tube.h} width={tube.w} height={tube.h} rx={4} fill="url(#tube)" />
          <path d={`M ${cx + 2 - tube.w / 2} ${busY - 14 - tube.h} L ${cx + 2 + tube.w / 2 + 10} ${busY - 14 - tube.h - 18} L ${cx + 2 + tube.w / 2} ${busY - 14 - tube.h + 30} Z`}
            fill="#cbd5e1" opacity={0.5} />
          <ellipse cx={cx + 2} cy={busY - 14 - tube.h} rx={tube.w / 2 - 3} ry={5} fill="#0b1226" stroke="#67e8f9" strokeOpacity={0.6} />
        </motion.g>
      )}

      {/* Antenna */}
      {ant && (
        <motion.g key={ant} initial={{ opacity: 0, rotate: -30 }} animate={{ opacity: 1, rotate: 0 }} transition={spring} style={{ originX: '50%', originY: '0%' }}>
          <line x1={cx + 10} x2={cx + 10} y1={busY + 46} y2={busY + 62} stroke="#cbd5e1" strokeWidth={2} />
          {ant === 'ant_low' && <circle cx={cx + 10} cy={busY + 66} r={4} fill="#e2e8f0" />}
          {ant === 'ant_high' && <path d={`M ${cx - 8} ${busY + 62} Q ${cx + 10} ${busY + 84} ${cx + 28} ${busY + 62} Z`} fill="#e2e8f0" stroke="#94a3b8" />}
          {ant === 'ant_ka' && <path d={`M ${cx - 18} ${busY + 62} Q ${cx + 10} ${busY + 92} ${cx + 38} ${busY + 62} Z`} fill="url(#gold)" stroke="#fde68a" />}
        </motion.g>
      )}

      {!tube && !segs && !ins && !ant && (
        <text x={cx} y={110} textAnchor="middle" fill="#7dd3fc" fontSize={12} opacity={0.7}>Select components to build your spacecraft</text>
      )}
    </svg>
  )
}
