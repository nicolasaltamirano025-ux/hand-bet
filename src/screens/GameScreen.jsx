import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRound, usePlayer } from '../hooks/useRound'
import { strokesOnHole, getMinHCP } from '../utils/handicap'
import { detectUnits } from '../utils/gameLogic'
import { updateRoundDeep } from '../firebase/roundsService'
import { CelebrationOverlay, ManoFlameBadge, SalvamentoOverlay } from '../components/animations/Celebration'
import ReviewModal from '../components/game/ReviewModal'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { useLanguage } from '../i18n'

// ── State rebuilders (for idempotent re-saves) ───────────────────────────────
function rebuildManoState(events) {
  let s = { holderId: null, isOpen: false, accumulated: 0 }
  for (const e of events) {
    if (e.type === 'mano_open')        s = { holderId: null, isOpen: true, accumulated: 1 }
    else if (e.type === 'mano_accumulated') s = { ...s, accumulated: e.newTotal }
    else if (e.type === 'mano_win' || e.type === 'hole_win') s = { holderId: null, isOpen: false, accumulated: 0 }
  }
  return s
}

function rebuildOyesState(events) {
  let s = { accumulated: 0, wonSequentially: [], zapatoTriggered: false }
  for (const e of events) {
    if (e.type === 'oyes_accumulated') s = { ...s, accumulated: e.newTotal }
    else if (e.type === 'oyes_won') {
      const seq = !e.wasAccumulated && e.winners.length === 1
        ? [...s.wonSequentially, e.winners[0]] : s.wonSequentially
      s = { ...s, accumulated: 0, wonSequentially: seq }
    } else if (e.type === 'zapato') s = { ...s, zapatoTriggered: true }
  }
  return s
}

function rebuildDrivesAccumulated(events) {
  let acc = 0
  for (const e of events) {
    if (e.type === 'drive_accumulated') acc = e.newTotal
    else if (e.type === 'drive_won') acc = 0
  }
  return acc
}

// Pairwise handicap comparison: returns players who don't lose to anyone
function getPairwiseWinners(playerIds, grossScores, handicaps, holeSI) {
  const losers = new Set()
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const p = playerIds[i], q = playerIds[j]
      const diff = handicaps[p] - handicaps[q]
      const netP = grossScores[p] - (diff > 0 ? strokesOnHole(diff, holeSI) : 0)
      const netQ = grossScores[q] - (diff < 0 ? strokesOnHole(-diff, holeSI) : 0)
      if (netP < netQ) losers.add(q)
      else if (netQ < netP) losers.add(p)
    }
  }
  const winners = playerIds.filter(id => !losers.has(id))
  return winners.length > 0 ? winners : playerIds // fallback: cycle → all tie
}

export default function GameScreen() {
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  const nav = useNavigate()
  const { round, loading } = useRound(code)

  const { tr } = useLanguage()
  const localPlayerId = localStorage.getItem(`hb_player_${code}`)
  const { isCreator } = usePlayer(round, localPlayerId)

  const [currentHoleIdx, setCurrentHoleIdx] = useState(0)
  const [celebration, setCelebration] = useState(null)
  const [salvamentoAlert, setSalvamentoAlert] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [showCode, setShowCode] = useState(searchParams.get('new') === '1')
  const [pendingScore, setPendingScore] = useState({})
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState(null) // { type: 'missing'|'zero_putts', names: [] }
  const savingRef = useRef(false)
  const lastCelebrationTsRef = useRef(null)
  const initialHoleSet = useRef(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      window.history.replaceState(null, '', `/round/${code}`)
    }
  }, [])

  const holes = useMemo(() => {
    if (!round?.holes) return []
    const all = Object.values(round.holes)
    if (all[0]?.playOrder != null) return all.sort((a, b) => a.playOrder - b.playOrder)
    return all.sort((a, b) => a.n - b.n)
  }, [round?.holes])

  const currentHole = holes[currentHoleIdx]
  const players = round?.players || {}
  const playerIds = Object.keys(players)
  const bets = round?.bets || {}
  const minHCP = getMinHCP(players)

  // On first load, jump to the last hole that has saved scores
  useEffect(() => {
    if (initialHoleSet.current || holes.length === 0) return
    initialHoleSet.current = true
    let lastIdx = 0
    for (let i = 0; i < holes.length; i++) {
      const saved = round?.holes?.[holes[i].n]?.scores || {}
      if (Object.keys(saved).length > 0) lastIdx = i
    }
    setCurrentHoleIdx(lastIdx)
  }, [holes])

  useEffect(() => {
    if (!currentHole) return
    const existing = {}
    for (const id of playerIds) {
      existing[id] = { ...(round?.holes?.[currentHole.n]?.scores?.[id] || {}) }
    }
    setPendingScore(existing)
  }, [currentHoleIdx, round?.holes])

  // Watch celebration field in Firebase and display for all players
  useEffect(() => {
    const c = round?.celebration
    if (!c?.ts || c.ts === lastCelebrationTsRef.current) return
    lastCelebrationTsRef.current = c.ts
    const celebMap = {
      hole_win: ev => ({ emoji: '🏆', message: tr.celebHoleWin(ev.name) }),
      mano_win: ev => ({ emoji: '🤜', message: tr.celebManoWin(ev.name, ev.extra) }),
      oyes:     ev => ({ emoji: '📍', message: tr.celebOyes(ev.name) }),
      zapato:   ev => ({ emoji: '👟', message: tr.celebZapato(ev.name) }),
      drive:    ev => ({ emoji: '💨', message: tr.celebDrive(ev.name) }),
    }
    ;(c.events || []).forEach((ev, i) => {
      setTimeout(() => {
        if (ev.type === 'salvamento') setSalvamentoAlert(ev.name)
        else { const cel = celebMap[ev.type]?.(ev); if (cel) setCelebration(cel) }
      }, i * 2800)
    })
  }, [round?.celebration?.ts, tr])

  if (loading || !round) return <Loading />
  if (!currentHole) return <div className="text-white p-8">{tr.roundCompleted}</div>

  const manoState = round.manoState || {}
  const holderName = manoState.holderId ? players[manoState.holderId]?.name : null
  const holeReviews = round.holes?.[currentHole.n]?.reviews || {}
  const hasPendingReview = Object.values(holeReviews).some(r => r.status === 'pending')

  function updateScore(playerId, field, value) {
    setPendingScore(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }))
  }

  function setDriveWinner(playerId) {
    const isAlreadyWinner = pendingScore[playerId]?.driveWinner
    setPendingScore(prev => {
      const next = { ...prev }
      for (const pid of playerIds) {
        next[pid] = { ...next[pid], driveWinner: false, inFairway: false }
      }
      if (!isAlreadyWinner) {
        next[playerId] = { ...next[playerId], driveWinner: true, inFairway: true }
      }
      return next
    })
  }

  function setOyesClosest(playerId) {
    playerIds.forEach(pid => {
      if (pid !== playerId) updateScore(pid, 'oyesClosest', false)
    })
    updateScore(playerId, 'oyesClosest', !pendingScore[playerId]?.oyesClosest)
  }

  // ── Navigation with validation ────────────────────────────────────────────
  function handleNext() {
    if (!isCreator) { navigate(); return }

    const missingNames = playerIds
      .filter(id => pendingScore[id]?.gross == null)
      .map(id => players[id]?.name)

    if (missingNames.length > 0) {
      setValidation({ type: 'missing', names: missingNames })
      return
    }

    if (bets.putts?.enabled) {
      const zeroPuttsNames = playerIds
        .filter(id => {
          const s = pendingScore[id] || {}
          return s.gross != null && (s.putts ?? 0) === 0 && !s.chipIn
        })
        .map(id => players[id]?.name)
      if (zeroPuttsNames.length > 0) {
        setValidation({ type: 'zero_putts', names: zeroPuttsNames })
        return
      }
    }

    saveAndNavigate()
  }

  // Called when validation passes or user confirms "continue anyway"
  async function saveAndNavigate() {
    setValidation(null)
    if (isCreator && !savingRef.current) await saveHole()
    navigate()
  }

  function navigate() {
    if (currentHoleIdx < holes.length - 1) setCurrentHoleIdx(i => i + 1)
    else nav(`/round/${code}/final`)
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function saveHole() {
    if (!isCreator || savingRef.current) return
    savingRef.current = true
    setSaving(true)

    const holeNum = currentHole.n
    const par = currentHole.par
    const si = currentHole.si
    const updates = {}

    const celebrationsToFire = []

    // Save scores
    for (const id of playerIds) {
      const s = pendingScore[id] || {}
      if (s.gross != null) {
        updates[`holes/${holeNum}/scores/${id}`] = s
      }
    }

    // Filter existing events for this hole (makes re-save idempotent)
    const prevManoEvents  = (round.manoEvents  || []).filter(e => e.holeNum !== holeNum)
    const prevOyesEvents  = (round.oyesEvents  || []).filter(e => e.holeNum !== holeNum)
    const prevDriveEvents = (round.driveEvents || []).filter(e => e.holeNum !== holeNum)
    const prevUnitsEvents = (round.unitsEvents || []).filter(e => e.holeNum !== holeNum)

    // ── Mano ───────────────────────────────────────────────────────────────
    if (bets.mano?.enabled) {
      const validIds = playerIds.filter(id => pendingScore[id]?.gross != null)

      if (validIds.length > 0) {
        const grossScores = Object.fromEntries(validIds.map(id => [id, pendingScore[id].gross]))
        const handicaps  = Object.fromEntries(validIds.map(id => [id, players[id].handicap]))
        const winners = getPairwiseWinners(validIds, grossScores, handicaps, si)

        let mState = rebuildManoState(prevManoEvents)
        const newManoEvents = [...prevManoEvents]

        if (!mState.isOpen && mState.accumulated === 0) {
          if (winners.length === 1) {
            newManoEvents.push({ type: 'hole_win', winnerId: winners[0], holeNum, units: 1 })
            celebrationsToFire.push({ type: 'hole_win', name: players[winners[0]]?.name })
          } else {
            mState = { holderId: null, isOpen: true, accumulated: 1 }
            newManoEvents.push({ type: 'mano_open', holeNum })
          }
        } else if (mState.isOpen) {
          const totalAcc = mState.accumulated + 1
          if (winners.length === 1) {
            newManoEvents.push({ type: 'mano_win', winnerId: winners[0], holeNum, units: totalAcc })
            mState = { holderId: null, isOpen: false, accumulated: 0 }
            celebrationsToFire.push({ type: 'mano_win', name: players[winners[0]]?.name, extra: totalAcc })
          } else {
            if (mState.accumulated >= 10 && mState.holderId && winners.includes(mState.holderId) && winners.length === 2) {
              const other = winners.find(id => id !== mState.holderId)
              newManoEvents.push({ type: 'salvamento', receiverId: other, holeNum, accumulated: mState.accumulated, manoHolderId: mState.holderId })
              celebrationsToFire.push({ type: 'salvamento', name: players[other]?.name })
            }
            mState = { ...mState, accumulated: totalAcc }
            newManoEvents.push({ type: 'mano_accumulated', holeNum, newTotal: totalAcc })
          }
        } else {
          if (winners.length === 1) {
            newManoEvents.push({ type: 'hole_win', winnerId: winners[0], holeNum, units: 1 })
            celebrationsToFire.push({ type: 'hole_win', name: players[winners[0]]?.name })
          } else {
            mState = { holderId: null, isOpen: true, accumulated: 1 }
            newManoEvents.push({ type: 'mano_open', holeNum })
          }
        }

        updates['manoState'] = mState
        updates['manoEvents'] = newManoEvents
      }
    }

    // ── O'yes ──────────────────────────────────────────────────────────────
    if (bets.oyes?.enabled && par === 3) {
      let oyesSt = rebuildOyesState(prevOyesEvents)
      const newOyesEvents = [...prevOyesEvents]

      const eligible = playerIds.filter(id => {
        const s = pendingScore[id]
        return s?.gross === par && s?.onGreenFirstShot === true
      })
      const qualifiedClosest = playerIds.filter(id => pendingScore[id]?.oyesClosest && eligible.includes(id))

      if (eligible.length === 0) {
        oyesSt.accumulated += 1
        newOyesEvents.push({ type: 'oyes_accumulated', holeNum, newTotal: oyesSt.accumulated })
      } else {
        const winners = qualifiedClosest.length > 0 ? qualifiedClosest : eligible
        const totalUnits = oyesSt.accumulated + 1
        const wasAcc = oyesSt.accumulated > 0
        if (!wasAcc && winners.length === 1) {
          oyesSt.wonSequentially = [...oyesSt.wonSequentially, winners[0]]
        }
        oyesSt.accumulated = 0
        newOyesEvents.push({ type: 'oyes_won', winners, holeNum, units: totalUnits, wasAccumulated: wasAcc })
        celebrationsToFire.push({ type: 'oyes', name: winners.map(id => players[id]?.name).join(' y ') })

        const par3Count = holes.filter(h => h.par === 3).length
        if (!oyesSt.zapatoTriggered && !wasAcc && oyesSt.wonSequentially.length >= par3Count && par3Count > 0) {
          if (oyesSt.wonSequentially.every(id => id === oyesSt.wonSequentially[0])) {
            oyesSt.zapatoTriggered = true
            newOyesEvents.push({ type: 'zapato', winnerId: oyesSt.wonSequentially[0] })
            celebrationsToFire.push({ type: 'zapato', name: players[oyesSt.wonSequentially[0]]?.name })
          }
        }
      }

      updates['oyesState'] = oyesSt
      updates['oyesEvents'] = newOyesEvents
    }

    // ── Drives ─────────────────────────────────────────────────────────────
    if (bets.drives?.enabled && (par === 4 || par === 5)) {
      const baseVal = bets.drives.value || 0
      let drivesAcc = rebuildDrivesAccumulated(prevDriveEvents)
      const newDriveEvents = [...prevDriveEvents]

      const driveWinner = playerIds.find(id => pendingScore[id]?.driveWinner === true)
      if (!driveWinner) {
        drivesAcc += baseVal
        newDriveEvents.push({ type: 'drive_accumulated', holeNum, newTotal: drivesAcc })
        updates['drivesAccumulated'] = drivesAcc
      } else {
        const total = drivesAcc + baseVal
        newDriveEvents.push({ type: 'drive_won', winnerId: driveWinner, holeNum, totalValue: total })
        updates['drivesAccumulated'] = 0
        celebrationsToFire.push({ type: 'drive', name: players[driveWinner]?.name })
      }
      updates['driveEvents'] = newDriveEvents
    }

    // ── Units ──────────────────────────────────────────────────────────────
    if (bets.units?.enabled) {
      const newUnitsEvents = [...prevUnitsEvents]
      for (const id of playerIds) {
        const s = pendingScore[id]
        if (!s || s.gross == null) continue
        const achieved = detectUnits(s.gross, par, s.inBunker, s.chipIn)
        if (achieved.length > 0) newUnitsEvents.push({ holeNum, playerId: id, units: achieved })
      }
      updates['unitsEvents'] = newUnitsEvents
    }

    if (celebrationsToFire.length > 0) {
      updates['celebration'] = { events: celebrationsToFire, ts: Date.now() }
    }

    await updateRoundDeep(code, updates)
    savingRef.current = false
    setSaving(false)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <div
        className="sticky top-0 z-30 bg-bg border-b border-border px-4 py-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCode(true)} className="text-gold font-black text-xl tracking-wider">
              {code}
            </button>
            <div className="text-white">
              <span className="font-bold text-lg">H{currentHole.n}</span>
              <span className="text-gray-400 text-sm ml-1.5">Par {currentHole.par} · Ventaja {currentHole.si}</span>
              {round.startingHole === 10 && (
                <span className="text-gray-500 text-xs ml-1.5">({currentHoleIdx + 1}/{holes.length})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {manoState.accumulated > 0 && <ManoFlameBadge accumulated={manoState.accumulated} />}
            <div className="flex gap-1">
              <button onClick={() => nav(`/round/${code}/scorecard`)} className="text-xs text-gray-400 border border-border rounded-lg px-2.5 py-1.5">📋</button>
              <button onClick={() => nav(`/round/${code}/bets`)} className="text-xs text-gray-400 border border-border rounded-lg px-2.5 py-1.5">💰</button>
            </div>
          </div>
        </div>
        {holderName && manoState.isOpen && (
          <div className="mt-1 text-xs text-orange-300">
            {tr.manoStatus(holderName, manoState.accumulated)}
          </div>
        )}
        {hasPendingReview && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="bg-yellow-800 text-yellow-200 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">⚠ {tr.inReview}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {playerIds.map(id => (
            <PlayerScoreCard
              key={id}
              player={players[id]}
              playerId={id}
              score={pendingScore[id] || {}}
              hole={currentHole}
              bets={bets}
              isCreator={isCreator}
              minHCP={minHCP}
              onChange={(field, val) => updateScore(id, field, val)}
              onSetDriveWinner={() => setDriveWinner(id)}
              onSetOyesClosest={() => setOyesClosest(id)}
            />
          ))}
        </div>
      </div>

      <div
        className="sticky bottom-0 bg-bg border-t border-border px-4 pt-3 flex gap-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setCurrentHoleIdx(i => Math.max(0, i - 1))}
          disabled={currentHoleIdx === 0}
          className="flex-1 py-3.5 rounded-xl border border-border text-white font-semibold disabled:opacity-30"
        >{tr.previous}</button>

        {isCreator && (
          <Button onClick={saveHole} disabled={saving} className="flex-1 py-3.5 text-sm">
            {saving ? '...' : tr.save}
          </Button>
        )}

        <button
          onClick={handleNext}
          className="flex-1 py-3.5 rounded-xl border border-border text-white font-semibold"
        >
          {currentHoleIdx < holes.length - 1 ? tr.next : tr.final}
        </button>
      </div>

      <button
        onClick={() => setShowReview(true)}
        className="fixed bottom-20 right-4 bg-yellow-800 text-yellow-200 rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-lg z-20"
      >🚩</button>

      {celebration && (
        <CelebrationOverlay message={celebration.message} emoji={celebration.emoji} onDone={() => setCelebration(null)} />
      )}
      {salvamentoAlert && (
        <SalvamentoOverlay receiverName={salvamentoAlert} msg={tr.salvamentoMsg(salvamentoAlert)} label={tr.salvamento} onDone={() => setSalvamentoAlert(null)} />
      )}

      <ReviewModal
        open={showReview}
        onClose={() => setShowReview(false)}
        code={code}
        holeNum={currentHole.n}
        reviews={holeReviews}
        isCreator={isCreator}
        players={players}
        localPlayerId={localPlayerId}
      />

      <Modal open={showCode} onClose={() => setShowCode(false)} title={tr.roundCodeTitle}>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-gold font-black text-7xl tracking-widest">{code}</div>
          <p className="text-gray-400 text-sm text-center">{tr.shareCodeMsg}</p>
          <Button onClick={() => {
            navigator.share?.({ title: 'Hand Bet', text: tr.joinCodeMsg(code), url: window.location.origin + `/join` })
              .catch(() => navigator.clipboard?.writeText(code))
          }} className="w-full">{tr.shareCode}</Button>
        </div>
      </Modal>

      {validation && (
        <Modal open onClose={() => setValidation(null)}
          title={validation.type === 'missing' ? tr.missingScore : tr.zeroPuttsTitle}
        >
          <p className="text-gray-300 text-sm mb-5">
            {validation.type === 'missing'
              ? tr.missingScoreMsg(validation.names.join(', '))
              : tr.zeroPuttsMsg(validation.names.join(', '))}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setValidation(null)} variant="outline" className="flex-1">{tr.reviewBtn}</Button>
            <Button onClick={saveAndNavigate} className="flex-1">{tr.continueAnyway}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PlayerScoreCard({ player, playerId, score, hole, bets, isCreator, minHCP, onChange, onSetDriveWinner, onSetOyesClosest }) {
  const { tr } = useLanguage()
  const strokes = strokesOnHole(player.handicap - minHCP, hole.si)
  const gross = score.gross
  const net = gross != null ? gross - strokes : null

  const diff = gross != null ? gross - hole.par : null
  const scoreColor = diff == null ? 'text-white' : diff < -1 ? 'text-yellow-400' : diff === -1 ? 'text-red-400' : diff === 0 ? 'text-blue-400' : 'text-gray-400'
  const scoreLabel = diff == null ? '—' : diff === -3 ? tr.albatross.replace('🐦 ', '') : diff === -2 ? 'Eagle' : diff === -1 ? 'Birdie' : diff === 0 ? 'Par' : `+${diff}`

  const units = gross != null ? detectUnits(gross, hole.par, score.inBunker, score.chipIn) : []

  useEffect(() => {
    if (!bets.putts?.enabled || hole.par !== 3 || !score.onGreenFirstShot) return
    if (gross == null || gross < hole.par) return
    const auto = gross - 1
    if ((score.putts ?? 0) !== auto) onChange('putts', auto)
  }, [score.onGreenFirstShot, gross, hole.par])

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white font-bold text-base">{player.name}</p>
          <p className="text-gray-400 text-xs">HCP {player.handicap} · {strokes > 0 ? tr.strokes(strokes) : tr.reference}</p>
        </div>
        <div className="text-right">
          {gross != null && (
            <>
              <p className={`text-2xl font-black ${scoreColor}`}>{gross}</p>
              <p className="text-gray-400 text-xs">{scoreLabel}{net != null ? ` · ${tr.net} ${net}` : ''}</p>
            </>
          )}
        </div>
      </div>

      {isCreator ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm w-14">{tr.score}</span>
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => onChange('gross', gross == null ? Math.max(1, hole.par - 1) : Math.max(1, gross - 1))}
                className="w-12 h-12 rounded-xl border border-border text-white text-2xl font-bold active:bg-border"
              >−</button>
              <div className={`flex-1 text-center text-3xl font-black py-1 ${scoreColor}`}>
                {gross ?? '—'}
              </div>
              <button
                onClick={() => onChange('gross', gross == null ? hole.par : gross + 1)}
                className="w-12 h-12 rounded-xl border border-border text-white text-2xl font-bold active:bg-border"
              >+</button>
            </div>
          </div>

          {bets.putts?.enabled && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm w-14">{tr.putts}</span>
              <div className="flex items-center gap-2 flex-1">
                <button onClick={() => onChange('putts', Math.max(0, (score.putts ?? 0) - 1))} className="w-12 h-12 rounded-xl border border-border text-white text-2xl font-bold active:bg-border">−</button>
                <div className="flex-1 text-center text-2xl font-bold text-white py-1">{score.putts ?? 0}</div>
                <button onClick={() => onChange('putts', (score.putts ?? 0) + 1)} className="w-12 h-12 rounded-xl border border-border text-white text-2xl font-bold active:bg-border">+</button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-1">
            {(hole.par === 4 || hole.par === 5) && bets.drives?.enabled && (
              <Chip active={score.driveWinner} onClick={onSetDriveWinner} label={tr.drive} />
            )}
            {hole.par === 3 && bets.oyes?.enabled && (
              <>
                <Chip active={score.onGreenFirstShot} onClick={() => onChange('onGreenFirstShot', !score.onGreenFirstShot)} label={tr.onGreenFirstShot} />
                {score.onGreenFirstShot && (
                  <Chip active={score.oyesClosest} onClick={onSetOyesClosest} label={tr.closest} />
                )}
              </>
            )}
            {bets.units?.enabled && (
              <>
                <Chip active={score.inBunker} onClick={() => onChange('inBunker', !score.inBunker)} label={tr.bunker} />
                <Chip active={score.chipIn} onClick={() => onChange('chipIn', !score.chipIn)} label={tr.holeOut} />
              </>
            )}
          </div>

          {units.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {units.map(u => (
                <span key={u} className="bg-gold/20 text-gold text-xs px-2 py-0.5 rounded-full font-semibold">{unitEmoji(u, tr)}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-4 text-sm text-gray-400">
          {score.putts != null && <span>⛳ {score.putts} putts</span>}
          {score.driveWinner && <span>{tr.drive}</span>}
          {score.onGreenFirstShot && <span>🟢 Green</span>}
          {units.map(u => <span key={u}>{unitEmoji(u, tr)}</span>)}
        </div>
      )}
    </div>
  )
}

function Chip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${active ? 'border-gold bg-gold/20 text-gold' : 'border-border text-gray-400'}`}
    >
      {label}
    </button>
  )
}

function unitEmoji(key, tr) {
  const map = {
    birdie:    tr.birdie,
    eagle:     tr.eagle,
    albatross: tr.albatross,
    holeInOne: tr.holeInOne,
    sandyPar:  tr.sandyPar,
    chipIn:    tr.chipIn,
  }
  return map[key] || key
}

function Loading() {
  return <div className="flex items-center justify-center min-h-dvh bg-bg"><p className="text-gray-400">Cargando...</p></div>
}
