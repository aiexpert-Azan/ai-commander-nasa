import { Bot, ChevronLeft, ChevronRight, Hammer, Rocket, ShieldCheck, Trophy, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { sfx } from '../audio/sound'
import { useGame } from '../game/store'
import { TransitDemo } from './TransitDemo'
import { Button, Modal, Panel } from './ui'

interface Slide { icon: typeof Hammer; title: string; body: ReactNode; art?: ReactNode }

const slides: Slide[] = [
  { icon: Hammer, title: 'Build your spacecraft',
    body: <>Pick a telescope, camera, solar panels, antenna, rocket and orbit. Every part changes <b>cost</b>, <b>weight</b> and <b>power</b>. In a hurry? Tap <b>Auto-Build</b>.</> },
  { icon: ShieldCheck, title: 'Pass the safety checks',
    body: <>Mission control checks your design. Anything red tells you <b>what is wrong</b> and <b>how to fix it</b>. When everything is green, you can launch.</> },
  { icon: Rocket, title: 'Launch into space',
    body: <>Watch the countdown! Risky designs can have problems on the way up, which leave you with fewer resources.</> },
  { icon: Trophy, title: 'Hunt for planets',
    body: <>Tap a star to point your telescope. You'll see a graph of its real brightness, measured by NASA's Kepler telescope.</>,
    art: <TransitDemo compact /> },
  { icon: Bot, title: 'Make the call',
    body: <>Decide: <b className="text-emerald-300">Planet Candidate</b> or <b className="text-rose-300">False Positive</b>. The AI Scientist can give a suggestion, but it can be wrong. You are the commander!</> },
  { icon: Trophy, title: 'How you win',
    body: <>Classify enough stars, with at least <b>60% correct</b>, to complete the mission and unlock the next level. Correct calls earn points; spending less money and energy boosts your score.</> },
]

const Ctx = createContext<{ openTutorial: (onDone?: () => void) => void }>({ openTutorial: () => {} })
export const useTutorial = () => useContext(Ctx)

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useGame()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const [onDone, setOnDone] = useState<(() => void) | null>(null)

  const openTutorial = useCallback((done?: () => void) => {
    setI(0)
    setOnDone(() => done ?? null)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    dispatch({ type: 'tutorialSeen' })
    onDone?.()
    setOnDone(null)
  }, [dispatch, onDone])

  const s = slides[i]
  const last = i === slides.length - 1
  return (
    <Ctx.Provider value={{ openTutorial }}>
      {children}
      <Modal open={open} onClose={close} label="How to play">
        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="hud-label">How to play · {i + 1} of {slides.length}</span>
            <button onClick={close} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-slate-300 hover:text-white">
              Skip <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300"><s.icon className="h-6 w-6" /></span>
            <h2 className="font-display text-xl font-bold text-white">{s.title}</h2>
          </div>
          {s.art && <div className="mt-4">{s.art}</div>}
          <p className="mt-4 text-base leading-relaxed text-slate-200">{s.body}</p>
          <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
            {slides.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-cyan-300' : 'w-1.5 bg-slate-600'}`} />)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft className="h-4 w-4" /> BACK</Button>
            {last ? (
              <Button data-autofocus onClick={() => { sfx.go(); close() }}>LET'S GO!</Button>
            ) : (
              <Button data-autofocus onClick={() => setI(i + 1)}>NEXT <ChevronRight className="h-4 w-4" /></Button>
            )}
          </div>
        </Panel>
      </Modal>
    </Ctx.Provider>
  )
}
