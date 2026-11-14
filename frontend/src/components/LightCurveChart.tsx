import { ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Brush, CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function useWide(minWidth = 640) {
  const q = `(min-width: ${minWidth}px)`
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [q])
  return wide
}

type Zoom = 'full' | 'transit'

// Interactive plot of a processed, phase-folded REAL Kepler signal (128 bins). Values are never altered;
// zoom only changes which part of the x-axis is visible.
export function LightCurveChart({ phase, signal, showTrend }: { phase: number[]; signal: number[]; showTrend: boolean }) {
  const wide = useWide()
  const [zoom, setZoom] = useState<Zoom>('full')
  const data = useMemo(() => {
    const trend = signal.map((_, i) => {
      const w = signal.slice(Math.max(0, i - 2), i + 3)
      return w.reduce((a, b) => a + b, 0) / w.length
    })
    return phase.map((p, i) => ({ i, phase: p, flux: signal[i], trend: trend[i] }))
  }, [phase, signal])
  const shown = zoom === 'transit' ? data.filter((d) => Math.abs(d.phase) <= 1.5) : data

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">Real NASA Kepler data</span>
        <div className="flex rounded-xl border border-cyan-300/20 p-0.5" role="group" aria-label="Zoom">
          {(['full', 'transit'] as const).map((z) => (
            <button key={z} onClick={() => setZoom(z)} aria-pressed={zoom === z}
              className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${zoom === z ? 'bg-cyan-400/20 text-white' : 'text-slate-300 hover:text-white'}`}>
              {z === 'full' ? <><ZoomOut className="h-3.5 w-3.5" /> Full view</> : <><ZoomIn className="h-3.5 w-3.5" /> Zoom on dip</>}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64 w-full sm:h-80" role="img"
        aria-label={`Brightness graph of a real Kepler star. ${shown.length} points. The shaded middle band is where a planet's dip would appear.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart key={zoom} data={shown} margin={{ top: 14, right: 8, bottom: 4, left: wide ? 4 : -8 }}>
            <CartesianGrid stroke="#1e2f5c" strokeDasharray="3 3" />
            <ReferenceArea x1={-0.5} x2={0.5} fill="#22d3ee" fillOpacity={0.1} stroke="#22d3ee" strokeOpacity={0.3}
              label={{ value: 'dip window', position: 'insideTop', fill: '#67e8f9', fontSize: 10 }} />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4"
              label={wide ? { value: 'normal brightness', position: 'insideTopRight', fill: '#94a3b8', fontSize: 10 } : undefined} />
            <XAxis dataKey="phase" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v: number) => v.toFixed(1)} stroke="#334155" height={24} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" width={wide ? 56 : 44}
              tickFormatter={(v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1))}
              label={wide ? { value: 'Brightness change (ppt)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, dy: 70 } : undefined} />
            <Tooltip
              contentStyle={{ background: '#070b1a', border: '1px solid rgba(103,232,249,0.3)', borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v) => `${Number(v).toFixed(2)} dip-lengths from centre`}
              formatter={(v, name) => [`${Number(v).toFixed(3)} ppt`, name === 'flux' ? 'Brightness change' : 'Smoothed trend']} />
            <Line type="monotone" dataKey="flux" stroke="#38bdf8" strokeWidth={1.6} dot={{ r: wide ? 1.6 : 1.3, fill: '#7dd3fc' }}
              activeDot={{ r: 5 }} isAnimationActive animationDuration={600} />
            {showTrend && <Line type="monotone" dataKey="trend" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />}
            {wide && zoom === 'full' && <Brush dataKey="phase" height={22} stroke="#22d3ee" fill="#070b1a" travellerWidth={10} tickFormatter={(v: number) => v.toFixed(1)} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[11px] text-slate-400">
        <span>↑ brighter · ↓ dimmer (ppt = parts per thousand)</span>
        <span>→ time from the middle of the dip</span>
      </div>
    </div>
  )
}
