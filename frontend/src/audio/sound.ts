// Original synthesized sound effects via the Web Audio API (no audio files).
let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean) {
  enabled = on
}

function ac(): AudioContext | null {
  if (!enabled) return null
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0, slideTo?: number) {
  const a = ac()
  if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, vol = 0.12, cutoff = 600) {
  const a = ac()
  if (!a) return
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = cutoff
  const g = a.createGain()
  g.gain.value = vol
  src.connect(f).connect(g).connect(a.destination)
  src.start()
}

export const sfx = {
  click: () => tone(660, 0.06, 'triangle', 0.05),
  select: () => { tone(520, 0.07, 'sine', 0.06); tone(880, 0.09, 'sine', 0.05, 0.05) },
  error: () => { tone(220, 0.15, 'square', 0.04); tone(165, 0.2, 'square', 0.04, 0.12) },
  beep: () => tone(980, 0.12, 'sine', 0.07),
  go: () => tone(1320, 0.4, 'sine', 0.08),
  launch: () => { noise(2.8, 0.18, 400); tone(80, 2.5, 'sawtooth', 0.03, 0, 40) },
  deploy: () => tone(400, 0.25, 'triangle', 0.05, 0, 900),
  scan: () => tone(300, 0.5, 'sine', 0.04, 0, 1200),
  success: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, i * 0.09)),
  failure: () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.06, i * 0.12)),
}
