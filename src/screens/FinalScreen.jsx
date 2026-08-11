import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRound } from '../hooks/useRound'
import { computeSettlement } from '../utils/settlement'
import { generateShareImage } from '../utils/shareImage'
import { useLanguage } from '../i18n'
import { useAuth } from '../contexts/AuthContext'
import { recordRoundResult } from '../firebase/userService'
import { voidEvent, unvoidEvent, updateRoundDeep } from '../firebase/roundsService'

const fmt = n => `$${Math.abs(Number(n || 0)).toLocaleString('es-MX')}`

export default function FinalScreen() {
  const { code } = useParams()
  const nav = useNavigate()
  const { tr } = useLanguage()
  const { user } = useAuth()
  const { round, loading } = useRound(code)
  const [sharing, setSharing] = useState(false)
  const [showAddBenefit, setShowAddBenefit] = useState(false)
  const recordedRef = useRef(false)

  useEffect(() => {
    if (!user || !round || recordedRef.current) return
    const myPlayerId = localStorage.getItem(`hb_player_${code}`)
    if (!myPlayerId || !round.players?.[myPlayerId]) return
    let settlement
    try { settlement = computeSettlement(round) } catch { return }
    const myNet = Math.round(settlement.ledger?.[myPlayerId] || 0)
    recordedRef.current = true
    recordRoundResult(user.uid, code, {
      field:       round.field?.name || '',
      roundType:   round.roundType  || '18',
      holesPlayed: Object.keys(round.holes || {}).length,
      totalNet:    myNet,
      role:        round.players[myPlayerId]?.isCreator ? 'creator' : 'player',
      playerName:  round.players[myPlayerId]?.name || '',
    })
  }, [user, round, code])

  if (loading || !round) return <Loading />

  const { players } = round
  const playerIds = Object.keys(players || {})
  const localPlayerId = localStorage.getItem(`hb_player_${code}`)
  const isCreator = round.players?.[localPlayerId]?.isCreator === true
  const voidedKeys = new Set(Object.keys(round.voidedEvents || {}))

  let settlement
  try {
    settlement = computeSettlement(round, voidedKeys)
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
        const text = debts.map(d => `${d.fromName} → ${d.toName}: ${fmt(d.amount)}`).join('\n')
        await navigator.share({ title: 'Hand Bet — Resultado', text })
      } else {
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
    <div className="flex flex-col bg-bg" style={{ height: '100dvh' }}>
      {/* Header — shrinks to fit, never scrolls away */}
      <div
        className="shrink-0 bg-bg border-b border-border px-4 py-4 flex items-center gap-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button onClick={() => nav(-1)} className="text-gray-400 text-sm">{tr.back}</button>
        <h2 className="text-white font-bold text-xl flex-1 text-center">{tr.finalResult}</h2>
      </div>

      {/* Scrollable content — independent scroll, bar can never overlap it */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-center py-6">
          <img src="/hand-bet.png" alt="Hand Bet" className="w-20 h-20 rounded-2xl" />
        </div>

        <div className="px-4 mb-6">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">{tr.balancePerPlayer}</h3>
          <div className="flex flex-col gap-2">
            {[...playerIds].sort((a, b) => (ledger[b] || 0) - (ledger[a] || 0)).map((id, i) => {
              const bal = ledger?.[id] || 0
              const medals = ['🏆', '🥈', '🥉']
              return (
                <div key={id} className={`border rounded-xl px-4 py-3 flex justify-between items-center ${i === 0 && bal > 0 ? 'bg-gold/10 border-gold/40' : 'bg-surface border-border'}`}>
                  <span className="text-white font-semibold text-lg">
                    {medals[i] ? <span className="mr-2">{medals[i]}</span> : null}
                    {players[id].name}
                  </span>
                  <span className={`font-black text-2xl ${bal > 0 ? 'text-green-400' : bal < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {bal > 0 ? '+' : ''}{fmt(bal)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {debts.length > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">{tr.whoPayWhom}</h3>
            <div className="flex flex-col gap-2">
              {debts.map((d, i) => (
                <div key={i} className="bg-surface border border-gold/30 rounded-xl px-4 py-5 flex items-center justify-between">
                  <div>
                    <span className="text-red-400 font-bold text-lg">{d.fromName}</span>
                    <span className="text-gray-400 mx-2 text-lg">→</span>
                    <span className="text-green-400 font-bold text-lg">{d.toName}</span>
                  </div>
                  <span className="text-gold font-black text-2xl">{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {debts.length === 0 && items.length === 0 && (
          <div className="px-4 text-center text-gray-400 py-8">
            <p className="text-4xl mb-3">🏌️</p>
            <p>{tr.noBetsYet}</p>
          </div>
        )}

        {(items.length > 0 || isCreator) && (
          <BetBreakdown
            items={items}
            players={players}
            isCreator={isCreator}
            onVoid={key => voidEvent(code, key)}
            onUnvoid={key => unvoidEvent(code, key)}
            onAddBenefit={isCreator ? () => setShowAddBenefit(true) : null}
          />
        )}

        {showAddBenefit && (
          <AddBenefitModal
            round={round}
            code={code}
            players={players}
            playerIds={playerIds}
            onClose={() => setShowAddBenefit(false)}
          />
        )}
      </div>

      {/* Bottom bar — part of the layout, never overlaps scrollable content */}
      <div
        className="shrink-0 bg-bg border-t border-border p-4 flex gap-2"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => nav('/')}
          className="flex-shrink-0 px-5 rounded-xl border border-border text-white font-semibold active:bg-surface"
        >
          🏠
        </button>
        <button
          onClick={share}
          disabled={sharing}
          className="flex-1 bg-gold text-bg rounded-xl py-4 font-bold text-base active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {sharing ? (
            <><span className="animate-spin">⏳</span> {tr.generatingImage}</>
          ) : (
            <>{tr.shareResult}</>
          )}
        </button>
      </div>
    </div>
  )
}

const TYPE_META = {
  mano:      { emoji: '🤜', label: "La Mano"    },
  oyes:      { emoji: '📍', label: "O'yes"       },
  medals:    { emoji: '🥇', label: 'Medals'      },
  drives:    { emoji: '💨', label: 'Drives'      },
  putts:     { emoji: '⛳', label: 'Putts'       },
  units:     { emoji: '🏆', label: 'Unidades'    },
  pinkies:   { emoji: '🤙', label: 'Pinkies'     },
  penalties: { emoji: '💀', label: 'Penalidades' },
}

const PAYER_TYPES = new Set(['pinkies', 'penalties'])

function playerEventLabel(type, count) {
  const s = count !== 1
  const map = {
    mano:     `ganó ${count} hoyo${s ? 's' : ''}`,
    oyes:     `ganó ${count} O'yes`,
    medals:   `ganó ${count} medalla${s ? 's' : ''}`,
    drives:   `ganó ${count} drive${s ? 's' : ''}`,
    units:    `logró ${count} unidad${s ? 'es' : ''}`,
    pinkies:  `pagó ${count} penalidad${s ? 'es' : ''}`,
    penalties:`pagó ${count} penalidad${s ? 'es' : ''}`,
  }
  return map[type] || `${count} evento${s ? 's' : ''}`
}

function getPlayerGroups(type, typeItems) {
  const byPlayer = {}
  for (const item of typeItems) {
    const side = PAYER_TYPES.has(type) ? (item.from || []) : (item.to || [])
    for (const pid of side) {
      if (!byPlayer[pid]) byPlayer[pid] = { items: [], amount: 0, holeCount: 0 }
      byPlayer[pid].items.push({ ...item, playerShare: item.amount / (side.length || 1) })
      if (!item.voided) {
        byPlayer[pid].amount    += item.amount / (side.length || 1)
        byPlayer[pid].holeCount += item.units || 1
      }
    }
  }
  return byPlayer
}

function BetBreakdown({ items, players, isCreator, onVoid, onUnvoid, onAddBenefit }) {
  const [openTypes, setOpenTypes]     = useState({})
  const [openPlayers, setOpenPlayers] = useState({})

  const grouped = useMemo(() => {
    const g = {}
    for (const item of items) {
      const t = item.type || 'other'
      if (!g[t]) g[t] = []
      g[t].push(item)
    }
    return g
  }, [items])

  const typeOrder = ['mano', 'oyes', 'medals', 'drives', 'putts', 'units', 'pinkies', 'penalties', 'other']
  const presentTypes = typeOrder.filter(t => grouped[t]?.length > 0)

  const totalForType = type => (grouped[type] || []).filter(i => !i.voided).reduce((s, item) => s + item.amount, 0)
  const toggleType   = type => setOpenTypes(o => ({ ...o, [type]: !o[type] }))
  const togglePlayer = key  => setOpenPlayers(o => ({ ...o, [key]: !o[key] }))
  const fmt = n => `$${Math.abs(Number(n || 0)).toLocaleString('es-MX')}`

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-400 text-xs uppercase tracking-widest">Desglose por apuesta</h3>
        {onAddBenefit && (
          <button
            onClick={onAddBenefit}
            className="text-gold text-xs border border-gold/40 rounded-lg px-3 py-1 font-semibold active:bg-gold/10"
          >+ Agregar</button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {presentTypes.map(type => {
          const meta      = TYPE_META[type] || { emoji: '📌', label: type }
          const typeItems = grouped[type]
          const total     = totalForType(type)
          const isOpen    = openTypes[type]
          const isPutts   = type === 'putts'
          const playerGroups = isPutts ? null : getPlayerGroups(type, typeItems)

          return (
            <div key={type} className="bg-surface border border-border rounded-xl overflow-hidden">
              {/* ── Cabecera del tipo ── */}
              <button
                onClick={() => toggleType(type)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-border/20"
              >
                <span className="text-xl">{meta.emoji}</span>
                <span className="text-white font-semibold text-base flex-1">{meta.label}</span>
                <span className="text-gray-400 text-sm mr-1">
                  {typeItems.filter(i => !i.voided).length} evento{typeItems.filter(i => !i.voided).length !== 1 ? 's' : ''}
                  {typeItems.some(i => i.voided) && <span className="text-red-400/60 ml-1">({typeItems.filter(i => i.voided).length} anulado{typeItems.filter(i => i.voided).length !== 1 ? 's' : ''})</span>}
                </span>
                <span className="text-gold font-bold text-base">{fmt(total)}</span>
                <span className="text-gray-500 text-sm ml-1">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-border/50">
                  {isPutts ? (
                    /* Putts: transacción única, vista plana */
                    typeItems.map((item, i) => (
                      <div key={i} className={`px-4 py-3 ${item.voided ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <p className={`text-white text-sm font-medium ${item.voided ? 'line-through' : ''}`}>{item.label}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {(item.from || []).map(id => players[id]?.name).join(', ')}
                              <span className="mx-1">→</span>
                              {(item.to || []).map(id => players[id]?.name).join(', ')}
                            </p>
                          </div>
                          <span className={`font-bold text-sm shrink-0 ${item.voided ? 'line-through text-gray-500' : 'text-gold'}`}>{fmt(item.amount)}</span>
                          {isCreator && item.key && (
                            item.voided
                              ? <button onClick={() => onUnvoid(item.key)} className="text-green-400 text-base ml-2 shrink-0 active:opacity-60">↩</button>
                              : <button onClick={() => onVoid(item.key)} className="text-red-400/50 text-base ml-2 shrink-0 active:text-red-400">✕</button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Resto: agrupado por jugador con sub-toggle */
                    Object.entries(playerGroups).map(([pid, data]) => {
                      const pkey = `${type}_${pid}`
                      const isPlayerOpen = openPlayers[pkey]
                      return (
                        <div key={pid} className="border-b border-border/30 last:border-0">
                          <button
                            onClick={() => togglePlayer(pkey)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left active:bg-border/20"
                          >
                            <span className="text-white font-semibold text-sm flex-1">{players[pid]?.name}</span>
                            <span className="text-gray-400 text-xs">{playerEventLabel(type, type === 'mano' ? data.holeCount : data.items.length)}</span>
                            <span className="text-gold font-semibold text-sm ml-2">{fmt(data.amount)}</span>
                            <span className="text-gray-500 text-xs ml-1">{isPlayerOpen ? '▲' : '▼'}</span>
                          </button>
                          {isPlayerOpen && (
                            <div className="bg-black/20 border-t border-border/30">
                              {data.items.map((item, i) => (
                                <div key={i} className={`px-5 py-2.5 border-b border-border/20 last:border-0 ${item.voided ? 'opacity-50' : ''}`}>
                                  <div className="flex justify-between items-center gap-3">
                                    <p className={`text-gray-300 text-xs flex-1 ${item.voided ? 'line-through text-gray-500' : ''}`}>{item.label}</p>
                                    <span className={`text-xs shrink-0 ${item.voided ? 'line-through text-gray-500' : 'text-gray-400'}`}>{fmt(item.playerShare)}</span>
                                    {isCreator && item.key && (
                                      item.voided
                                        ? <button onClick={() => onUnvoid(item.key)} className="text-green-400 text-sm ml-2 shrink-0 active:opacity-60">↩</button>
                                        : <button onClick={() => onVoid(item.key)} className="text-red-400/50 text-sm ml-2 shrink-0 active:text-red-400">✕</button>
                                    )}
                                  </div>
                                  {type === 'medals' && item.meta?.netScores && (
                                    <MedalDetail meta={item.meta} players={players} />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MedalDetail({ meta, players }) {
  const { netScores, hadScoreTie, tiedPlayers } = meta
  const sorted = Object.entries(netScores || {}).sort(([, a], [, b]) => a - b)
  return (
    <div className="mt-1.5">
      {hadScoreTie && tiedPlayers?.length > 0 && (
        <p className="text-yellow-400/80 text-[10px] mb-1">
          Empate en {netScores[tiedPlayers[0]]} neto — gana por menor handicap
        </p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {sorted.map(([id, score]) => (
          <span key={id} className={`text-[10px] ${hadScoreTie && tiedPlayers?.includes(id) ? 'text-yellow-400/70' : 'text-gray-500'}`}>
            {players[id]?.name}: {score} neto
          </span>
        ))}
      </div>
    </div>
  )
}

const BENEFIT_OPTIONS = [
  { value: 'chipIn',    label: 'Chip-in (Hole-out)',          emoji: '⛳' },
  { value: 'sandyPar',  label: 'Sandy Par (desde bunker)',     emoji: '🏖️' },
  { value: 'salvamento',label: 'Salvamento (La Mano)',         emoji: '🤜' },
  { value: 'inBunker',  label: 'En bunker (Sandy habilitado)', emoji: '🪣' },
]

function AddBenefitModal({ round, code, players, playerIds, onClose }) {
  const holes = Object.values(round.holes || {}).sort((a, b) => a.n - b.n)
  const [benefitType, setBenefitType] = useState('chipIn')
  const [playerId, setPlayerId]       = useState(playerIds[0] || '')
  const [holeNum,  setHoleNum]        = useState(holes[0]?.n ?? 1)
  const [saving,   setSaving]         = useState(false)
  const [done,     setDone]           = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      if (benefitType === 'chipIn') {
        await updateRoundDeep(code, { [`holes/${holeNum}/scores/${playerId}/chipIn`]: true })
      } else if (benefitType === 'sandyPar' || benefitType === 'inBunker') {
        await updateRoundDeep(code, { [`holes/${holeNum}/scores/${playerId}/inBunker`]: true })
      } else if (benefitType === 'salvamento') {
        const manoEvents = [...(round.manoEvents || []),
          { type: 'salvamento', receiverId: playerId, holeNum, accumulated: 0 }]
        await updateRoundDeep(code, { manoEvents })
      }
      setDone(true)
      setTimeout(onClose, 900)
    } finally {
      setSaving(false)
    }
  }

  const selectedBenefit = BENEFIT_OPTIONS.find(b => b.value === benefitType)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-t-2xl w-full max-w-lg p-5 pb-8"
        style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Agregar beneficio</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-white font-semibold">Beneficio añadido</p>
            <p className="text-gray-400 text-sm mt-1">El desglose se actualizará automáticamente</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Benefit type */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Tipo de beneficio</p>
              <div className="flex flex-col gap-2">
                {BENEFIT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBenefitType(opt.value)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${benefitType === opt.value ? 'border-gold bg-gold/10' : 'border-border'}`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className={`font-semibold text-sm ${benefitType === opt.value ? 'text-gold' : 'text-white'}`}>{opt.label}</span>
                    {benefitType === opt.value && <span className="ml-auto text-gold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Player */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Jugador</p>
              <select
                value={playerId}
                onChange={e => setPlayerId(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-white text-sm"
              >
                {playerIds.map(id => (
                  <option key={id} value={id}>{players[id]?.name}</option>
                ))}
              </select>
            </div>

            {/* Hole */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Hoyo</p>
              <select
                value={holeNum}
                onChange={e => setHoleNum(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-white text-sm"
              >
                {holes.map(h => (
                  <option key={h.n} value={h.n}>Hoyo {h.n} — Par {h.par}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-xl bg-gold text-bg font-bold text-base active:opacity-80 disabled:opacity-50 mt-1"
            >
              {saving ? 'Guardando…' : `Añadir ${selectedBenefit?.emoji || ''} ${selectedBenefit?.label || ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-dvh bg-bg"><p className="text-gray-400">Cargando...</p></div>
}
