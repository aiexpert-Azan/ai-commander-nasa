import { useMemo } from 'react'

// Lightweight animated starfield (pure CSS, deterministic positions).
export function Starfield({ density = 120 }: { density?: number }) {
  const stars = useMemo(() => {
    let seed = 42
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: density }, () => ({
      x: rnd() * 100, y: rnd() * 200, s: rnd() * 1.8 + 0.4, d: rnd() * 5 + 2, o: rnd() * 4,
    }))
  }, [density])
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 100%, rgba(30,64,175,0.18), transparent 60%), radial-gradient(ellipse at 10% 20%, rgba(14,116,144,0.15), transparent 50%)' }} />
      <div className="absolute inset-x-0 top-0 h-[200%]" style={{ animation: 'drift 240s linear infinite' }}>
        {stars.map((st, i) => (
          <span key={i} className="absolute rounded-full bg-white"
            style={{ left: `${st.x}%`, top: `${st.y / 2}%`, width: st.s, height: st.s,
              animation: `twinkle ${st.d}s ease-in-out ${st.o}s infinite`, boxShadow: st.s > 1.6 ? '0 0 6px #a5f3fc' : undefined }} />
        ))}
      </div>
    </div>
  )
}
