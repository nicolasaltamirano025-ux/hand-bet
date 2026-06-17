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
