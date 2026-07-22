import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRound, usePlayer } from '../hooks/useRound'
import { strokesOnHole, getMinHCP } from '../utils/handicap'
import { detectUnits, detectPenalties, rebuildManoState, rebuildOyesState, rebuildDrivesAccumulated } from '../utils/gameLogic'
import { updateRoundDeep, proposePendingScore, acceptPendingScore, rejectPendingScore } from '../firebase/roundsService'
import { CelebrationOverlay, ManoFlameBadge, SalvamentoOverlay, PinkyOverlay, PenaltyOverlay } from '../components/animations/Celebration'
import ReviewModal from '../components/game/ReviewModal'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { useLanguage } from '../i18n'

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
  const [pinkyAlert, setPinkyAlert] = useState(null)
  const [penaltyAlert, setPenaltyAlert] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [showCode, setShowCode] = useState(searchParams.get('new') === '1')
  const [showExit, setShowExit] = useState(false)
  const [pendingScore, setPendingScore] = useState({})
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState(null) // { type: 'missing'|'zero_putts'|'discrepancy'|'oyes_reminder', ... }
  const savingRef = useRef(false)
  const lastCelebrationTsRef = useRef(null)
  const celebrationInitialized = useRef(false)
  const celebratedHolesRef = useRef(new Set())
  const initialHoleSet = useRef(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      window.history.replaceState(null, '', `/round/${code}`)
    }
  }, [])

  // Bug A: redirect players who never went through JoinScreen
  useEffect(() => {
    if (!loading && round && (!localPlayerId || !round.players?.[localPlayerId])) {
      nav(`/join?code=${code}`, { replace: true })
    }
  }, [loading, round])

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
  const referencePlayerId = playerIds.find(id => players[id].handicap === minHCP)
  const referenceName = referencePlayerId ? players[referencePlayerId].name : null

  // On first load, jump to the editHole param or the last hole with saved scores
  useEffect(() => {
    if (initialHoleSet.current || holes.length === 0) return
    initialHoleSet.current = true
    const editHoleN = parseInt(searchParams.get('editHole') || '0')
    if (editHoleN) {
      const idx = holes.findIndex(h => h.n === editHoleN)
      if (idx >= 0) { setCurrentHoleIdx(idx); return }
    }
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
      const official = round?.holes?.[currentHole.n]?.scores?.[id] || {}
      const proposal = round?.holes?.[currentHole.n]?.pendingScores?.[id] || {}
      // For own card (non-creator), pre-load their pending proposal if they have one
      existing[id] = (id === localPlayerId && Object.keys(proposal).length > 0)
        ? { ...proposal }
        : { ...official }
    }
    setPendingScore(existing)
  }, [currentHoleIdx])

  // Mark the existing celebration ts as "already seen" on first load to avoid replaying old events
  useEffect(() => {
    if (celebrationInitialized.current || !round?.celebration?.ts) return
    celebrationInitialized.current = true
    lastCelebrationTsRef.current = round.celebration.ts
  }, [round?.celebration?.ts])

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
        else if (ev.type === 'pinky') setPinkyAlert(ev.name)
        else if (ev.type === 'penalty') setPenaltyAlert({ subtype: ev.subtype, name: ev.name })
        else { const cel = celebMap[ev.type]?.(ev); if (cel) setCelebration(cel) }
      }, i * 2800)
    })
  }, [round?.celebration?.ts, tr])

  if (loading || !round) return <Loading />
  if (!localPlayerId || !round.players?.[localPlayerId]) return <Loading />
  if (!currentHole) return <div className="text-white p-8">{tr.roundCompleted}</div>

  const manoState = round.manoState || {}
  const holderName = manoState.holderId ? players[manoState.holderId]?.name : null
  const holeReviews = round.holes?.[currentHole.n]?.reviews || {}
  const hasPendingReview = Object.values(holeReviews).some(r => r.status === 'pending')
  const holeProposals = round.holes?.[currentHole.n]?.pendingScores || {}

  async function handlePropose() {
    if (!localPlayerId || !currentHole) return
    const score = pendingScore[localPlayerId] || {}
    await proposePendingScore(code, currentHole.n, localPlayerId, score)
  }

  async function handleAcceptProposal(playerId) {
    await acceptPendingScore(code, currentHole.n, playerId)
  }

  async function handleRejectProposal(playerId) {
    await rejectPendingScore(code, currentHole.n, playerId)
  }

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

    // Discrepancy checks
    const impossible = []
    const suspicious = []
    for (const id of playerIds) {
      const s = pendingScore[id] || {}
      if (s.gross == null) continue
      const { gross, putts = 0 } = s
      if (s.chipIn && putts > 0) {
        impossible.push(`${players[id]?.name}: marcado Hole-out pero tiene ${putts} putt${putts === 1 ? '' : 's'} (Hole-out implica 0 putts)`)
      } else if (putts > gross) {
        impossible.push(`${players[id]?.name}: ${putts} putts con score ${gross} (más putts que golpes totales)`)
      } else if (gross - putts < 1 && putts > 0 && !s.chipIn) {
        impossible.push(`${players[id]?.name}: sin golpes de approach (putts=${putts}, score=${gross})`)
      } else if (currentHole.par >= 4 && gross - putts === 1 && !s.chipIn) {
        suspicious.push(`${players[id]?.name}: llegó al green del hoyo ${currentHole.par} en 1 golpe — ¿correcto?`)
      }
    }
    if (impossible.length > 0 || suspicious.length > 0) {
      setValidation({ type: 'discrepancy', impossible, suspicious })
      return
    }

    // O'yes reminder on par 3
    if (bets.oyes?.enabled && currentHole.par === 3) {
      setValidation({ type: 'oyes_reminder' })
      return
    }

    // Drive reminder on par 4/5 when no winner was marked
    if (bets.drives?.enabled && (currentHole.par === 4 || currentHole.par === 5)) {
      const hasDriveWinner = playerIds.some(id => pendingScore[id]?.driveWinner === true)
      if (!hasDriveWinner) {
        setValidation({ type: 'drive_reminder' })
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
    const editHoleN = parseInt(searchParams.get('editHole') || '0')
    if (editHoleN) { nav(`/round/${code}/admin`); return }
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

    // Re-save idempotency: rebuild state ONLY from holes played before the current one.
    // Including future holes in the rebuild inflates accumulated counts because their
    // stale newTotal values get processed by rebuildManoState/rebuildOyesState/etc.
    const currentPO  = currentHole.playOrder ?? currentHole.n
    const beforeNums = new Set(holes.filter(h => (h.playOrder ?? h.n) < currentPO).map(h => h.n))
    const afterNums  = new Set(holes.filter(h => (h.playOrder ?? h.n) > currentPO).map(h => h.n))

    const prevManoEvents      = (round.manoEvents      || []).filter(e => beforeNums.has(e.holeNum))
    const prevOyesEvents      = (round.oyesEvents      || []).filter(e => beforeNums.has(e.holeNum))
    const prevDriveEvents     = (round.driveEvents     || []).filter(e => beforeNums.has(e.holeNum))
    const prevUnitsEvents     = (round.unitsEvents     || []).filter(e => beforeNums.has(e.holeNum))
    const prevPinkiesEvents   = (round.pinkiesEvents   || []).filter(e => beforeNums.has(e.holeNum))
    const prevPenaltiesEvents = (round.penaltiesEvents || []).filter(e => beforeNums.has(e.holeNum))
    const manoEventsAfter      = (round.manoEvents      || []).filter(e => afterNums.has(e.holeNum))
    const oyesEventsAfter      = (round.oyesEvents      || []).filter(e => afterNums.has(e.holeNum))
    const driveEventsAfter     = (round.driveEvents     || []).filter(e => afterNums.has(e.holeNum))
    const unitsEventsAfter     = (round.unitsEvents     || []).filter(e => afterNums.has(e.holeNum))
    const pinkiesEventsAfter   = (round.pinkiesEvents   || []).filter(e => afterNums.has(e.holeNum))
    const penaltiesEventsAfter = (round.penaltiesEvents || []).filter(e => afterNums.has(e.holeNum))

    // ── Mano ───────────────────────────────────────────────────────────────
    if (bets.mano?.enabled) {
      const validIds = playerIds.filter(id => pendingScore[id]?.gross != null)

      if (validIds.length > 0) {
        const grossScores = Object.fromEntries(validIds.map(id => [id, pendingScore[id].gross]))
        const handicaps  = Object.fromEntries(validIds.map(id => [id, players[id].handicap]))
        const winners = getPairwiseWinners(validIds, grossScores, handicaps, si)

        let mState = rebuildManoState(prevManoEvents)
        const newManoEvents = [...prevManoEvents]

        if (!mState.isOpen) {
          // No mano in play
          if (winners.length === 1) {
            newManoEvents.push({ type: 'hole_win', winnerId: winners[0], holeNum, units: 1 })
            celebrationsToFire.push({ type: 'hole_win', name: players[winners[0]]?.name })
          } else {
            mState = { holderId: null, isOpen: true, accumulated: 1 }
            newManoEvents.push({ type: 'mano_open', holeNum })
          }
        } else {
          // Mano is in play (may or may not have a holder)
          const totalAcc = mState.accumulated + 1

          if (winners.length === 1) {
            const winner = winners[0]
            if (mState.holderId === winner) {
              // Holder wins again → collects everything
              newManoEvents.push({ type: 'mano_win', winnerId: winner, holeNum, units: totalAcc })
              mState = { holderId: null, isOpen: false, accumulated: 0 }
              celebrationsToFire.push({ type: 'mano_win', name: players[winner]?.name, extra: totalAcc })
            } else {
              // New player takes the mano (must win again to collect)
              newManoEvents.push({ type: 'mano_taken', holderId: winner, holeNum, newTotal: totalAcc })
              mState = { holderId: winner, isOpen: true, accumulated: totalAcc }
            }
          } else {
            // Tie — check salvamento
            if (mState.accumulated >= 10 && mState.holderId && winners.includes(mState.holderId) && winners.length === 2) {
              const other = winners.find(id => id !== mState.holderId)
              newManoEvents.push({ type: 'salvamento', receiverId: other, holeNum, accumulated: mState.accumulated, manoHolderId: mState.holderId })
              celebrationsToFire.push({ type: 'salvamento', name: players[other]?.name })
            }
            // If current holder is not among the tied players, they lose the mano
            const holderSurvives = !mState.holderId || winners.includes(mState.holderId)
            mState = {
              holderId: holderSurvives ? mState.holderId : null,
              isOpen: true,
              accumulated: totalAcc,
            }
            newManoEvents.push({ type: 'mano_accumulated', holeNum, newTotal: totalAcc })
          }
        }

        if (newManoEvents.length > prevManoEvents.length) updates['manoState'] = mState
        updates['manoEvents'] = [...newManoEvents, ...manoEventsAfter]
      }
    }

    // ── O'yes ──────────────────────────────────────────────────────────────
    if (bets.oyes?.enabled && par === 3) {
      let oyesSt = rebuildOyesState(prevOyesEvents)
      const newOyesEvents = [...prevOyesEvents]

      const eligible = playerIds.filter(id => {
        const s = pendingScore[id]
        return s?.gross != null && s.gross <= par && s?.onGreenFirstShot === true
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

      if (newOyesEvents.length > prevOyesEvents.length) updates['oyesState'] = oyesSt
      updates['oyesEvents'] = [...newOyesEvents, ...oyesEventsAfter]
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
      updates['driveEvents'] = [...newDriveEvents, ...driveEventsAfter]
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
      updates['unitsEvents'] = [...newUnitsEvents, ...unitsEventsAfter]
    }

    // ── Castigos (Pinky, 4-Putts, ...) ──────────────────────────────────────────
    if (bets.pinkies?.enabled) {
      const newPinkiesEvents = [...prevPinkiesEvents]
      for (const id of playerIds) {
        const s = pendingScore[id]
        if (!s || s.gross == null) continue
        if (s.pinky) {
          newPinkiesEvents.push({ type: 'pinky', subtype: 'pinky', playerId: id, holeNum })
          celebrationsToFire.push({ type: 'pinky', name: players[id]?.name })
        }
        if (s.fourPutt) {
          newPinkiesEvents.push({ type: 'pinky', subtype: 'fourPutt', playerId: id, holeNum })
          celebrationsToFire.push({ type: 'pinky', name: players[id]?.name })
        }
      }
      updates['pinkiesEvents'] = [...newPinkiesEvents, ...pinkiesEventsAfter]
    }

    // ── Penalties (unidades negativas) ──────────────────────────────────────
    if (bets.penalties?.enabled) {
      const newPenaltiesEvents = [...prevPenaltiesEvents]
      for (const id of playerIds) {
        const s = pendingScore[id]
        if (!s || s.gross == null) continue
        const achieved = detectPenalties(s.putts, s.stuckInBunker, s.leftGreen, s.whiff)
        if (achieved.length > 0) {
          newPenaltiesEvents.push({ holeNum, playerId: id, penalties: achieved })
          for (const subtype of achieved) {
            celebrationsToFire.push({ type: 'penalty', subtype, name: players[id]?.name })
          }
        }
      }
      updates['penaltiesEvents'] = [...newPenaltiesEvents, ...penaltiesEventsAfter]
    }

    if (celebrationsToFire.length > 0 && !celebratedHolesRef.current.has(holeNum)) {
      celebratedHolesRef.current.add(holeNum)
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
              <button onClick={() => setShowExit(true)} className="text-xs text-gray-400 border border-border rounded-lg px-2.5 py-1.5">🚪</button>
              <button onClick={() => nav(`/round/${code}/scorecard`)} className="text-xs text-gray-400 border border-border rounded-lg px-2.5 py-1.5">📋</button>
              <button onClick={() => nav(`/round/${code}/bets`)} className="text-xs text-gray-400 border border-border rounded-lg px-2.5 py-1.5">💰</button>
              {isCreator && <button onClick={() => nav(`/round/${code}/admin`)} className="text-xs text-gray-400 border border-border rounded-lg px-2.5 py-1.5">⚙️</button>}
            </div>
          </div>
        </div>
        {manoState.isOpen && !holderName && (
          <div className="mt-1 text-xs text-orange-300">
            🔥 {tr.manoOpen(manoState.accumulated)}
          </div>
        )}
        {manoState.isOpen && holderName && (
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

      {searchParams.get('editHole') && (
        <div className="bg-yellow-900/30 border-b border-yellow-700/40 px-4 py-2 flex items-center justify-between">
          <span className="text-yellow-300 text-xs font-semibold">✏️ Modo edición — Hoyo {currentHole?.n}</span>
          <button onClick={() => nav(`/round/${code}/admin`)} className="text-yellow-400 text-xs font-semibold">Volver al admin →</button>
        </div>
      )}

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
              isMyCard={!isCreator && id === localPlayerId}
              proposal={isCreator ? (holeProposals[id] || null) : null}
              myPendingProposal={!isCreator && id === localPlayerId ? (holeProposals[id] || null) : null}
              minHCP={minHCP}
              referenceName={referenceName}
              onChange={(field, val) => updateScore(id, field, val)}
              onSetDriveWinner={() => setDriveWinner(id)}
              onSetOyesClosest={() => setOyesClosest(id)}
              onPropose={id === localPlayerId ? handlePropose : undefined}
              onAcceptProposal={isCreator ? () => handleAcceptProposal(id) : undefined}
              onRejectProposal={isCreator ? () => handleRejectProposal(id) : undefined}
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
      {pinkyAlert && (
        <PinkyOverlay playerName={pinkyAlert} onDone={() => setPinkyAlert(null)} />
      )}
      {penaltyAlert && (
        <PenaltyOverlay subtype={penaltyAlert.subtype} playerName={penaltyAlert.name} onDone={() => setPenaltyAlert(null)} />
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
            const joinUrl = window.location.origin + `/join?code=${code}`
            navigator.share?.({ title: 'Hand Bet', text: tr.joinCodeMsg(code), url: joinUrl })
              .catch(() => navigator.clipboard?.writeText(joinUrl))
          }} className="w-full">{tr.shareCode}</Button>
        </div>
      </Modal>

      {validation && validation.type === 'missing' && (
        <Modal open onClose={() => setValidation(null)} title={tr.missingScore}>
          <p className="text-gray-300 text-sm mb-5">{tr.missingScoreMsg(validation.names.join(', '))}</p>
          <div className="flex gap-3">
            <Button onClick={() => setValidation(null)} variant="outline" className="flex-1">{tr.reviewBtn}</Button>
            <Button onClick={saveAndNavigate} className="flex-1">{tr.continueAnyway}</Button>
          </div>
        </Modal>
      )}
      {validation && validation.type === 'zero_putts' && (
        <Modal open onClose={() => setValidation(null)} title={tr.zeroPuttsTitle}>
          <p className="text-gray-300 text-sm mb-5">{tr.zeroPuttsMsg(validation.names.join(', '))}</p>
          <div className="flex gap-3">
            <Button onClick={() => setValidation(null)} variant="outline" className="flex-1">{tr.reviewBtn}</Button>
            <Button onClick={saveAndNavigate} className="flex-1">{tr.continueAnyway}</Button>
          </div>
        </Modal>
      )}
      {validation && validation.type === 'discrepancy' && (
        <Modal open onClose={() => setValidation(null)} title={tr.discrepancyTitle}>
          {validation.impossible.length > 0 && (
            <div className="mb-3">
              <p className="text-red-400 text-xs font-semibold mb-1">{tr.discrepancyHardMsg}</p>
              {validation.impossible.map((msg, i) => <p key={i} className="text-gray-300 text-sm">• {msg}</p>)}
            </div>
          )}
          {validation.suspicious.length > 0 && (
            <div className="mb-3">
              <p className="text-yellow-400 text-xs font-semibold mb-1">{tr.discrepancySoftMsg}</p>
              {validation.suspicious.map((msg, i) => <p key={i} className="text-gray-300 text-sm">• {msg}</p>)}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setValidation(null)} variant="outline" className="flex-1">{tr.reviewBtn}</Button>
            {validation.impossible.length === 0 && (
              <Button onClick={saveAndNavigate} className="flex-1">{tr.continueAnyway}</Button>
            )}
          </div>
        </Modal>
      )}
      {validation && validation.type === 'oyes_reminder' && (
        <Modal open onClose={() => saveAndNavigate()} title={tr.oyesReminderTitle}>
          <p className="text-gray-300 text-sm mb-5">{tr.oyesReminderMsg}</p>
          <div className="flex gap-3">
            <Button onClick={() => setValidation(null)} variant="outline" className="flex-1">{tr.reviewBtn}</Button>
            <Button onClick={saveAndNavigate} className="flex-1">{tr.oyesLooksGood}</Button>
          </div>
        </Modal>
      )}
      {validation && validation.type === 'drive_reminder' && (
        <Modal open onClose={() => saveAndNavigate()} title={tr.driveReminderTitle}>
          <p className="text-gray-300 text-sm mb-5">{tr.driveReminderMsg}</p>
          <div className="flex gap-3">
            <Button onClick={saveAndNavigate} variant="outline" className="flex-1">{tr.driveAccumulatesBtn}</Button>
            <Button onClick={() => setValidation(null)} className="flex-1">{tr.driveCheckBtn}</Button>
          </div>
        </Modal>
      )}

      <Modal open={showExit} onClose={() => setShowExit(false)} title="¿Salir de la ronda?">
        <p className="text-gray-300 text-sm mb-5">Los scores no guardados en este hoyo se perderán. Podrás volver a la ronda ingresando el mismo código.</p>
        <div className="flex gap-3">
          <Button onClick={() => setShowExit(false)} variant="outline" className="flex-1">Cancelar</Button>
          <Button onClick={() => nav('/')} className="flex-1">Salir</Button>
        </div>
      </Modal>
    </div>
  )
}

const CASTIGOS = [
  { key: 'pinky',    emoji: '🤙', label: 'Pinky',    desc: 'Score de doble dígito (10 o más) en este hoyo' },
  { key: 'fourPutt', emoji: '🐌', label: '4 Putts',  desc: '4 o más putts en este hoyo' },
]

function PlayerScoreCard({ player, playerId, score, hole, bets, isCreator, isMyCard, proposal, myPendingProposal, minHCP, referenceName, onChange, onSetDriveWinner, onSetOyesClosest, onPropose, onAcceptProposal, onRejectProposal }) {
  const { tr } = useLanguage()
  const [showCastigos, setShowCastigos] = useState(false)
  const canEdit = isCreator || isMyCard
  const strokes = strokesOnHole(player.handicap - minHCP, hole.si)
  const gross = score.gross
  const net = gross != null ? gross - strokes : null

  const diff = gross != null ? gross - hole.par : null
  const scoreColor = diff == null ? 'text-white' : diff <= -2 ? 'text-yellow-400' : diff === -1 ? 'text-green-400' : diff === 0 ? 'text-blue-400' : 'text-red-400'
  const scoreLabel = diff == null ? '—' : diff === -3 ? tr.albatross.replace('🐦 ', '') : diff === -2 ? 'Eagle' : diff === -1 ? 'Birdie' : diff === 0 ? 'Par' : `+${diff}`

  const units = gross != null ? detectUnits(gross, hole.par, score.inBunker, score.chipIn) : []
  const penalties = gross != null ? detectPenalties(score.putts, score.stuckInBunker, score.leftGreen, score.whiff) : []
  const activeCastigos = CASTIGOS.filter(c => score[c.key])

  useEffect(() => {
    if (!bets.putts?.enabled || hole.par !== 3 || !score.onGreenFirstShot) return
    if (gross == null || gross < hole.par) return
    const auto = gross - 1
    if ((score.putts ?? 0) !== auto) onChange('putts', auto)
  }, [score.onGreenFirstShot, gross, hole.par])

  // Auto-suggest castigos based on score, without overriding a manual uncheck
  useEffect(() => {
    if (!bets.pinkies?.enabled) return
    if (gross != null && gross >= 10 && !score.pinky) onChange('pinky', true)
  }, [bets.pinkies?.enabled, gross])

  useEffect(() => {
    if (!bets.pinkies?.enabled) return
    if ((score.putts ?? 0) >= 4 && !score.fourPutt) onChange('fourPutt', true)
  }, [bets.pinkies?.enabled, score.putts])

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      {/* Creator sees pending proposal from this player */}
      {proposal && (
        <div className="bg-yellow-900/30 border border-yellow-700/60 rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-2">
          <div>
            <span className="text-yellow-300 text-xs font-semibold block">{tr.scorePropuesto}</span>
            <span className="text-yellow-100 text-xs">Score: {proposal.gross ?? '—'} · Putts: {proposal.putts ?? '—'}</span>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onAcceptProposal} className="text-green-400 text-xs border border-green-700 rounded-lg px-2.5 py-1 font-semibold active:bg-green-900/30">{tr.aceptar}</button>
            <button onClick={onRejectProposal} className="text-red-400 text-xs border border-red-700 rounded-lg px-2.5 py-1 font-semibold active:bg-red-900/30">{tr.rechazar}</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white font-bold text-base">{player.name}</p>
          <p className="text-gray-400 text-xs">HCP {player.handicap} · {strokes > 0 ? tr.strokes(strokes, referenceName) : tr.reference}</p>
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

      {canEdit ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-base w-16">{tr.score}</span>
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => onChange('gross', gross == null ? Math.max(1, hole.par - 1) : Math.max(1, gross - 1))}
                className="w-14 h-14 rounded-xl border border-border text-white text-3xl font-bold active:bg-border"
              >−</button>
              <div className={`flex-1 text-center text-4xl font-black py-1 ${scoreColor}`}>
                {gross ?? '—'}
              </div>
              <button
                onClick={() => onChange('gross', gross == null ? hole.par : gross + 1)}
                className="w-14 h-14 rounded-xl border border-border text-white text-3xl font-bold active:bg-border"
              >+</button>
            </div>
          </div>

          {bets.putts?.enabled && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-base w-16">{tr.putts}</span>
              <div className="flex items-center gap-2 flex-1">
                <button onClick={() => onChange('putts', Math.max(0, (score.putts ?? 0) - 1))} className="w-14 h-14 rounded-xl border border-border text-white text-3xl font-bold active:bg-border">−</button>
                <div className="flex-1 text-center text-3xl font-bold text-white py-1">{score.putts ?? 0}</div>
                <button onClick={() => onChange('putts', (score.putts ?? 0) + 1)} className="w-14 h-14 rounded-xl border border-border text-white text-3xl font-bold active:bg-border">+</button>
              </div>
            </div>
          )}

          {isCreator && (
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
              {bets.penalties?.enabled && (
                <>
                  <Chip active={score.stuckInBunker} onClick={() => onChange('stuckInBunker', !score.stuckInBunker)} label={tr.stuckInBunkerChip} />
                  <Chip active={score.leftGreen} onClick={() => onChange('leftGreen', !score.leftGreen)} label={tr.leftGreenChip} />
                  <Chip active={score.whiff} onClick={() => onChange('whiff', !score.whiff)} label={tr.whiffChip} />
                </>
              )}
              {bets.pinkies?.enabled && (
                <Chip active={activeCastigos.length > 0} onClick={() => setShowCastigos(true)} label="⚠️ Castigo" />
              )}
            </div>
          )}

          {(units.length > 0 || activeCastigos.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {units.map(u => (
                <span key={u} className="bg-gold/20 text-gold text-xs px-2 py-0.5 rounded-full font-semibold">{unitEmoji(u, tr)}</span>
              ))}
              {activeCastigos.map(c => (
                <span key={c.key} className="bg-red-900/40 text-red-300 text-xs px-2 py-0.5 rounded-full font-semibold">{c.emoji} {c.label}</span>
              ))}
            </div>
          )}

          {penalties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {penalties.map(p => (
                <span key={p} className="bg-red-900/40 text-red-300 text-xs px-2 py-0.5 rounded-full font-semibold">{penaltyEmoji(p, tr)}</span>
              ))}
            </div>
          )}

          <Modal open={showCastigos} onClose={() => setShowCastigos(false)} title="Castigo">
            <div className="flex flex-col gap-2">
              {CASTIGOS.map(c => (
                <button
                  key={c.key}
                  onClick={() => onChange(c.key, !score[c.key])}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${score[c.key] ? 'border-gold bg-gold/10' : 'border-border'}`}
                >
                  <div>
                    <p className={`font-semibold text-sm ${score[c.key] ? 'text-gold' : 'text-white'}`}>{c.emoji} {c.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{c.desc}</p>
                  </div>
                  <span className={`text-xl ${score[c.key] ? 'text-gold' : 'text-gray-600'}`}>{score[c.key] ? '✓' : ''}</span>
                </button>
              ))}
            </div>
          </Modal>

          {isMyCard && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onPropose}
                className="flex-1 py-2 rounded-xl border border-gold/50 text-gold text-sm font-semibold active:bg-gold/10"
              >
                {tr.proposarScore}
              </button>
              {myPendingProposal && (
                <span className="text-yellow-400 text-xs">{tr.esperandoValidacion}</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-4 text-sm text-gray-400">
          {score.gross != null && <span className={scoreColor}>{score.gross} ({scoreLabel})</span>}
          {score.putts != null && <span>⛳ {score.putts}p</span>}
          {score.driveWinner && <span>{tr.drive}</span>}
          {score.onGreenFirstShot && <span>🟢</span>}
          {units.map(u => <span key={u}>{unitEmoji(u, tr)}</span>)}
          {penalties.map(p => <span key={p}>{penaltyEmoji(p, tr)}</span>)}
          {activeCastigos.map(c => <span key={c.key}>{c.emoji} {c.label}</span>)}
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

function penaltyEmoji(key, tr) {
  const map = {
    cuatripod: tr.cuatripod,
    trampa:    tr.trampa,
    saleVerde: tr.saleVerde,
    paloma:    tr.paloma,
  }
  return map[key] || key
}

function Loading() {
  return <div className="flex items-center justify-center min-h-dvh bg-bg"><p className="text-gray-400">Cargando...</p></div>
}
