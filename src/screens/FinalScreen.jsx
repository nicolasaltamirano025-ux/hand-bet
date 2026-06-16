import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRound } from '../hooks/useRound'
import { computeSettlement } from '../utils/settlement'
import { generateShareImage } from '../utils/shareImage'

const fmt = n => `$${Math.abs(Number(n || 0)).toLocaleString('es-MX')}`

export default function FinalScreen() {
  const { code } = useParams()
  const nav = useNavigate()
  const { round, loading } = useRound(code)
  const [sharing, setSharing] = useState(false)

  if (loading || !round) return <Loading />

  const { players } = round
  const playerIds = Object.keys(players || {})

  let settlement
  try {
    settlement = computeSettlement(round)
  } catch {
    settlement = { items: [], debts: [], ledger: {} }
  }

  const { items, debts, ledger } = settlement

  async function share() {
    setSharing(true)
    try {
      const blob = await generateShareImage(round, players, settlement)
      const file = new File([blob], 'hand-bet-resultado.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Hand Bet — Resultado' })
      } else if (navigator.share) {
        // Fallback: share as text if files not supported
        const text = debts.map(d => `${d.fromName} → ${d.toName}: ${fmt(d.amount)}`).join('\n')
        await navigator.share({ title: 'Hand Bet — Resultado', text })
      } else {
        // Last resort: download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'hand-bet-resultado.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 3000)
      }
    } catch (e) {
      if (e?.name !== 'AbortError') console.error('Share failed', e)
    }
    setSharing(false)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg pb-24">
      <div
        className="sticky top-0 bg-bg border-b border-border px-4 py-4 flex items-center gap-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button onClick={() => nav(-1)} className="text-gray-400 text-sm">← Volver</button>
        <h2 className="text-white font-bold text-xl flex-1 text-center">🏁 Resultado Final</h2>
      </div>

      {/* Logo */}
      <div className="flex justify-center py-6">
        <img src="/hand-bet.png" alt="Hand Bet" className="w-20 h-20 rounded-2xl" />
      </div>

      {/* Balance per player */}
      <div className="px-4 mb-6">
        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">Balance por jugador</h3>
        <div className="flex flex-col gap-2">
          {[...playerIds].sort((a, b) => (ledger[b] || 0) - (ledger[a] || 0)).map((id, i) => {
            const bal = ledger?.[id] || 0
            const medals = ['🏆', '🥈', '🥉']
            return (
              <div key={id} className={`border rounded-xl px-4 py-3 flex justify-between items-center ${i === 0 && bal > 0 ? 'bg-gold/10 border-gold/40' : 'bg-surface border-border'}`}>
                <span className="text-white font-semibold">
                  {medals[i] ? <span className="mr-2">{medals[i]}</span> : null}
                  {players[id].name}
                </span>
                <span className={`font-black text-lg ${bal > 0 ? 'text-green-400' : bal < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {bal > 0 ? '+' : ''}{fmt(bal)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Simplified debts */}
      {debts.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">¿Quién le paga a quién?</h3>
          <div className="flex flex-col gap-2">
            {debts.map((d, i) => (
              <div key={i} className="bg-surface border border-gold/30 rounded-xl px-4 py-4 flex items-center justify-between">
                <div>
                  <span className="text-red-400 font-semibold">{d.fromName}</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="text-green-400 font-semibold">{d.toName}</span>
                </div>
                <span className="text-gold font-black text-xl">{fmt(d.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {debts.length === 0 && items.length === 0 && (
        <div className="px-4 text-center text-gray-400 py-8">
          <p className="text-4xl mb-3">🏌️</p>
          <p>No hay apuestas registradas todavía.</p>
        </div>
      )}

      {/* Detail breakdown */}
      {items.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">Detalle por apuesta</h3>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-start px-4 py-3 border-b border-border/50 last:border-0">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {item.from.map(id => players[id]?.name).join(', ')} → {item.to.map(id => players[id]?.name).join(', ')}
                  </p>
                </div>
                <span className="text-gold text-sm font-bold ml-4">{fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share button */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <button
          onClick={share}
          disabled={sharing}
          className="w-full bg-gold text-bg rounded-xl py-4 font-bold text-base active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {sharing ? (
            <>
              <span className="animate-spin">⏳</span> Generando imagen...
            </>
          ) : (
            <>📸 Compartir Resultado</>
          )}
        </button>
      </div>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-dvh bg-bg"><p className="text-gray-400">Cargando...</p></div>
}
