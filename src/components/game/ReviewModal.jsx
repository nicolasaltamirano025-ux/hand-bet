import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { updateRoundDeep } from '../../firebase/roundsService'
import { ref, push, set } from 'firebase/database'
import { db } from '../../firebase/config'

export default function ReviewModal({ open, onClose, code, holeNum, reviews, isCreator, players, localPlayerId }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const reviewList = Object.entries(reviews || {}).map(([id, r]) => ({ id, ...r }))
  const pendingReviews = reviewList.filter(r => r.status === 'pending')
  const resolvedReviews = reviewList.filter(r => r.status === 'resolved')

  const myName = localPlayerId ? players?.[localPlayerId]?.name : null

  async function submitReview() {
    if (!message.trim()) return
    setSending(true)
    const reviewRef = push(ref(db, `rounds/${code}/holes/${holeNum}/reviews`))
    await set(reviewRef, {
      status: 'pending',
      authorId: localPlayerId || null,
      authorName: myName || 'Jugador',
      text: message.trim(),
      ts: Date.now(),
      resolution: null,
    })
    setMessage('')
    setSending(false)
  }

  async function resolveReview(reviewId, action) {
    const resolution = action === 'validate' ? 'validated' : 'rejected'
    await updateRoundDeep(code, {
      [`holes/${holeNum}/reviews/${reviewId}/status`]: 'resolved',
      [`holes/${holeNum}/reviews/${reviewId}/resolution`]: resolution,
      [`holes/${holeNum}/reviews/${reviewId}/resolvedAt`]: Date.now(),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={`Review — Hoyo ${holeNum}`}>
      <div className="flex flex-col gap-4">

        {/* Pending reviews — creator can resolve each */}
        {pendingReviews.length > 0 && (
          <div className="flex flex-col gap-3">
            {pendingReviews.map(r => (
              <div key={r.id} className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-800 text-yellow-200 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">⚠ PENDIENTE</span>
                  <span className="text-yellow-300 text-xs font-semibold">{r.authorName}</span>
                </div>
                <p className="text-white text-sm">{r.text}</p>
                {isCreator && (
                  <div className="flex gap-2 mt-1">
                    <Button onClick={() => resolveReview(r.id, 'validate')} className="flex-1 text-xs py-2">✅ Validar</Button>
                    <Button onClick={() => resolveReview(r.id, 'reject')} variant="danger" className="flex-1 text-xs py-2">❌ Rechazar</Button>
                  </div>
                )}
              </div>
            ))}
            {!isCreator && (
              <p className="text-gray-400 text-sm text-center">Esperando al organizador...</p>
            )}
          </div>
        )}

        {/* Resolved reviews history */}
        {resolvedReviews.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Historial</p>
            {resolvedReviews.map(r => (
              <div key={r.id} className={`rounded-xl px-3 py-2 text-xs ${r.resolution === 'validated' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                <span className="font-semibold">{r.authorName}: </span>{r.text}
                <span className="ml-2 opacity-70">→ {r.resolution === 'validated' ? '✅ Validado' : '❌ Rechazado'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit new review — always available */}
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <p className="text-gray-400 text-sm">
            {myName ? `Enviando como ${myName} — ¿` : '¿'}Hay un error en el score de este hoyo?
          </p>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe el problema..."
            className="bg-bg border border-border rounded-xl px-4 py-3 text-white outline-none text-sm resize-none focus:border-gold"
          />
          <Button onClick={submitReview} disabled={!message.trim() || sending}>
            {sending ? 'Enviando...' : '🚩 Solicitar Review'}
          </Button>
        </div>

      </div>
    </Modal>
  )
}
