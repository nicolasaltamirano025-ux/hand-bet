import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

export function useConfetti() {
  const fire = (opts = {}) => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#C9A84C', '#E9C46A', '#2D6A4F', '#40916C', '#ffffff'],
      ...opts,
    })
  }
  return fire
}

export function CelebrationOverlay({ message, emoji, onDone, duration = 2500 }) {
  const [visible, setVisible] = useState(true)
  const fire = useConfetti()

  useEffect(() => {
    fire()
    const t = setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, duration)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 animate-pop-in">
      <div className="text-7xl mb-4">{emoji}</div>
      <div className="text-white font-black text-4xl text-center px-8 leading-tight">
        {message}
      </div>
    </div>
  )
}

export function ManoFlameBadge({ accumulated }) {
  if (accumulated < 5) return null
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold animate-flame ${accumulated >= 10 ? 'bg-red-900 text-red-200' : 'bg-orange-900 text-orange-200'}`}>
      🔥 {accumulated} hoyos
    </div>
  )
}

export function PinkyOverlay({ playerName, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    confetti({
      particleCount: 90,
      spread: 110,
      origin: { y: 0.45 },
      colors: ['#EC4899', '#F472B6', '#DB2777', '#BE185D', '#FDF2F8', '#FBCFE8'],
    })
    const t = setTimeout(() => { setVisible(false); onDone?.() }, 2800)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-pop-in" style={{ background: 'rgba(80,7,36,0.95)' }}>
      <div className="text-8xl mb-3 animate-wiggle select-none">🤙</div>
      <div className="font-black text-6xl tracking-widest" style={{ color: '#F9A8D4' }}>PINKY</div>
      <div className="text-white text-2xl font-bold mt-3">{playerName}</div>
      <div className="text-sm mt-2" style={{ color: '#F472B6' }}>paga una unidad a todos</div>
    </div>
  )
}

const PENALTY_THEMES = {
  cuatripod: { emoji: '🐌', title: 'CUATRIPOD',  bg: 'rgba(46,16,82,0.95)', color: '#D8B4FE' },
  trampa:    { emoji: '🪤', title: 'TRAMPA',     bg: 'rgba(92,51,8,0.95)',  color: '#FCD34D' },
  saleVerde: { emoji: '🚪', title: 'SE SALIÓ',   bg: 'rgba(20,60,40,0.95)', color: '#86EFAC' },
  paloma:    { emoji: '🕊️', title: 'PALOMA',     bg: 'rgba(55,65,81,0.95)', color: '#E5E7EB' },
}

export function PenaltyOverlay({ subtype, playerName, onDone }) {
  const [visible, setVisible] = useState(true)
  const theme = PENALTY_THEMES[subtype] || PENALTY_THEMES.paloma

  useEffect(() => {
    confetti({
      particleCount: 70,
      spread: 90,
      origin: { y: 0.45 },
      colors: [theme.color, '#9CA3AF', '#4B5563'],
    })
    const t = setTimeout(() => { setVisible(false); onDone?.() }, 2600)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-pop-in" style={{ background: theme.bg }}>
      <div className="text-8xl mb-3 select-none">{theme.emoji}</div>
      <div className="font-black text-5xl tracking-widest text-center px-6" style={{ color: theme.color }}>{theme.title}</div>
      <div className="text-white text-2xl font-bold mt-3">{playerName}</div>
      <div className="text-sm mt-2 text-gray-300">paga una unidad a todos</div>
    </div>
  )
}

export function SalvamentoOverlay({ receiverName, label, msg, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#60a5fa', '#3b82f6', '#1d4ed8'] })
    const t = setTimeout(() => { setVisible(false); onDone?.() }, 2500)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 animate-pop-in">
      <div className="text-7xl mb-4">🛡️</div>
      <div className="text-blue-300 font-black text-3xl text-center px-8">{label || 'SALVAMENTO'}</div>
      <div className="text-white text-xl mt-2">{msg || `${receiverName} cobra una unidad`}</div>
    </div>
  )
}
