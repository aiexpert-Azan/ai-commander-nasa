import { Bot, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { AIResult } from '../api/client'

// Presents the live CNN result from /api/ai/analyze. All numbers shown come from that response.
const plain: Record<AIResult['predicted_class'], { headline: string; body: string; tone: string }> = {
  CANDIDATE: {
    headline: 'Possible Planet',
    body: 'The dip in this graph looks similar to signals the AI learned were planet candidates.',
    tone: 'text-emerald-300',
  },
  'FALSE POSITIVE': {
    headline: 'Likely False Positive',
    body: 'The dip looks more like the fakes the AI learned about, such as two stars eclipsing each other or instrument noise.',
    tone: 'text-rose-300',
  },
}

const confidence: Record<string, string> = {
  strong: 'It is fairly sure.',
  moderate: 'It is somewhat sure.',
  weak: 'It is very unsure. This is close to a coin-flip.',
}

export function AIScientistCard({ result }: { result: AIResult }) {
  const [open, setOpen] = useState(false)
  const p = plain[result.predicted_class]
  const pct = Math.max(0, Math.min(100, result.score * 100))
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-sm font-bold text-violet-100">AI Suggests:</span>
        <span className={`font-display text-lg font-black ${p.tone}`}>{p.headline}</span>
      </div>
      <p className="mt-1 text-sm text-slate-200">{p.body} {confidence[result.lean_strength] ?? ''}</p>
      <p className="mt-2 text-sm font-semibold text-amber-200">The AI can be wrong. It has not confirmed a planet. You make the final call.</p>

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="mt-2 flex min-h-11 items-center gap-1.5 text-sm font-semibold text-violet-200 hover:text-white">
        <Bot className="h-4 w-4" /> How did the AI decide? <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1 space-y-3 rounded-xl bg-space-950/60 p-3 text-xs text-slate-300">
          <p>A 1D convolutional neural network (<code className="text-violet-200">{result.model}</code>) read the same 128 brightness points you see in the graph and produced an <b>experimental score</b>.
            Scores at or above the threshold lean "candidate". The score is <b>not a calibrated probability</b>.</p>
          <div>
            <div className="mb-1 flex justify-between tabular-nums"><span>Experimental score: <b className="text-white">{result.score.toFixed(2)}</b></span><span>Threshold: <b className="text-white">{result.threshold.toFixed(2)}</b></span></div>
            <div className="relative h-2.5 rounded-full bg-slate-800" role="img" aria-label={`Score ${result.score.toFixed(2)} against threshold ${result.threshold.toFixed(2)}`}>
              <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
              <div className="absolute -top-1 h-4.5 w-0.5 bg-amber-300" style={{ left: `${result.threshold * 100}%` }} title="threshold" />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>0 · leans false positive</span><span>leans candidate · 1</span></div>
          </div>
          <p><b className="text-slate-200">Model's own explanation:</b> {result.explanation}</p>
          <p><b className="text-slate-200">Limitations:</b> {result.disclaimer}</p>
        </div>
      )}
    </div>
  )
}
