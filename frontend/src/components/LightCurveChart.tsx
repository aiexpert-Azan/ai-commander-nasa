import { useMemo } from 'react'
import { Brush, CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Interactive plot of a processed, phase-folded Kepler signal (128 bins).
export function LightCurveChart({ phase, signal, showTrend }: { phase: number[]; signal: number[]; showTrend: boolean }) {
  const data = useMemo(() => {
    const trend = signal.map((_, i) => {
      const w = signal.slice(Math.max(0, i - 2), i + 3)
      return w.reduce((a, b) => a + b, 0) / w.length
    })
    return phase.map((p, i) => ({ i, phase: p, flux: signal[i], trend: trend[i] }))
  }, [phase, signal])

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#1e2f5c" strokeDasharray="3 3" />
          <ReferenceArea x1={-0.5} x2={0.5} fill="#22d3ee" fillOpacity={0.08} stroke="#22d3ee" strokeOpacity={0.25}
            label={{ value: 'expected transit window', position: 'insideTop', fill: '#67e8f9', fontSize: 10 }} />
          <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
          <XAxis dataKey="phase" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => v.toFixed(1)} stroke="#334155" height={24} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" width={56} tickFormatter={(v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1))}
            label={{ value: 'Brightness change (ppt)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11, dy: 70 }} />
          <Tooltip
            contentStyle={{ background: '#070b1a', border: '1px solid rgba(103,232,249,0.3)', borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => `Phase ${Number(v).toFixed(2)} durations`}
            formatter={(v, name) => [`${Number(v).toFixed(3)} ppt`, name === 'flux' ? 'Brightness' : 'Smoothed trend']} />
          <Line type="monotone" dataKey="flux" stroke="#38bdf8" strokeWidth={1.6} dot={{ r: 1.6, fill: '#7dd3fc' }} isAnimationActive animationDuration={700} />
          {showTrend && <Line type="monotone" dataKey="trend" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />}
          <Brush dataKey="phase" height={22} stroke="#22d3ee" fill="#070b1a" travellerWidth={8} tickFormatter={(v: number) => v.toFixed(1)} />
        </LineChart>
      </ResponsiveContainer>
      <div className="-mt-1 text-center text-[11px] text-slate-400">Time from transit centre (in transit durations)</div>
    </div>
  )
}
