import { buildNetScoreMap, strokesOnHole, getMinHCP } from './handicap'

// ─── MANO ───────────────────────────────────────────────────────────────────

export const INITIAL_MANO_STATE = {
  holderId: null,        // playerId who currently holds la mano
  isOpen: false,         // true when at least one hole is in play
  accumulated: 0,        // number of holes currently accumulated
  history: [],           // log of events
  totalUnits: 0,         // units paid out so far from closed hands
  winnerHistory: [],     // { winnerId, units, holeNum }
  salvamentoCount: 0,
}

/**
 * Process a hole result for La Mano.
 * Returns { newState, events[] }
 * events: { type: 'mano_win'|'mano_open'|'salvamento', ... }
 */
export function processMano(manoState, holeNum, playerIds, netScores, betsEnabled) {
  if (!betsEnabled) return { newState: manoState, events: [] }

  const state = { ...manoState }
  const events = []

  const validPlayers = playerIds.filter(id => netScores[id] != null)
  if (validPlayers.length === 0) return { newState: state, events }

  const minNet = Math.min(...validPlayers.map(id => netScores[id]))
  const winners = validPlayers.filter(id => netScores[id] === minNet)

  if (!state.isOpen && state.holderId === null) {
    // Mano not yet opened
    if (winners.length === 1) {
      // Clear winner on hole 1 (or first relevant hole) — no mano needed
      // Mano opens on first TIE, not first win
      // Actually: hole 1 win = winner gets that hole, mano stays closed
      // hole 1 tie = mano opens
      state.holderId = null
      state.accumulated = 1
      state.isOpen = false
      events.push({ type: 'hole_win', winnerId: winners[0], holeNum, units: 1 })
    } else {
      // Tie on hole 1 → mano opens
      state.isOpen = true
      state.holderId = null
      state.accumulated = 1
      events.push({ type: 'mano_open', holeNum })
    }
    return { newState: state, events }
  }

  // Mano is open (or we're past hole 1 with accumulated holes)
  const totalAccumulated = (state.accumulated || 0) + 1 // +1 for current hole

  if (winners.length === 1) {
    const winner = winners[0]
    if (!state.isOpen) {
      // No hand open, someone wins the hole
      events.push({ type: 'hole_win', winnerId: winner, holeNum, units: 1 })
      return { newState: { ...state, accumulated: 0, holderId: null }, events }
    }
    // Mano is open — winner takes everything
    const unitsWon = totalAccumulated
    events.push({ type: 'mano_win', winnerId: winner, holeNum, units: unitsWon })
    return {
      newState: {
        ...state,
        holderId: null,
        isOpen: false,
        accumulated: 0,
        winnerHistory: [...(state.winnerHistory || []), { winnerId: winner, units: unitsWon, holeNum }],
        totalUnits: (state.totalUnits || 0) + unitsWon,
      },
      events,
    }
  }

  // Multiple winners (tie)
  if (!state.isOpen) {
    // No hand open, tie → mano opens with accumulated holes
    return {
      newState: { ...state, isOpen: true, accumulated: totalAccumulated },
      events: [{ type: 'mano_open', holeNum }],
    }
  }

  // Mano is open and we have a tie
  const holderAmongWinners = state.holderId && winners.includes(state.holderId)

  // Check salvamento: 10+ accumulated and holder ties with exactly one other player
  if (
    state.accumulated >= 10 &&
    state.holderId &&
    holderAmongWinners &&
    winners.length === 2
  ) {
    const other = winners.find(id => id !== state.holderId)
    events.push({ type: 'salvamento', receiverId: other, holeNum, accumulated: state.accumulated })
  }

  if (state.holderId && !holderAmongWinners) {
    // Holder didn't win — winner takes the hand (but mano stays open, accumulated resets... wait)
    // If holder loses: winner(s) take the hand. If multiple winners, hand is contested.
    if (winners.length === 1) {
      // Already handled above
    } else {
      // Multiple non-holder winners tie — mano stays open, nobody takes it yet
      return {
        newState: { ...state, accumulated: totalAccumulated, holderId: null },
        events: [{ type: 'mano_contested', holeNum }],
      }
    }
  }

  // Tie involving current holder (or no holder): holder keeps it / stays open
  return {
    newState: { ...state, accumulated: totalAccumulated },
    events: [{ type: 'mano_accumulated', holeNum, newTotal: totalAccumulated }],
  }
}

// ─── O'YES ──────────────────────────────────────────────────────────────────

export const INITIAL_OYES_STATE = {
  accumulated: 0,
  wonSequentially: [],  // playerIds who won non-accumulated O'yes (for Zapato tracking)
  zapatoTriggered: false,
  events: [],
}

/**
 * Process O'yes for a par-3 hole.
 * closestPlayerId: playerId closest to pin (in green, first shot)
 * parAchievers: set of playerIds who made gross par
 */
export function processOyes(oyesState, holeNum, holeScores, par, players) {
  if (par !== 3) return { newState: oyesState, events: [] }

  const state = { ...oyesState }
  const events = []

  // Find who made gross par and was on the green with first shot
  const playerIds = Object.keys(players)
  const eligible = playerIds.filter(id => {
    const s = holeScores?.[id]
    if (!s || s.gross == null) return false
    return s.gross === par && s.onGreenFirstShot === true
  })

  if (eligible.length === 0) {
    // No one qualifies → accumulate
    state.accumulated = (state.accumulated || 0) + 1
    events.push({ type: 'oyes_accumulated', holeNum, newTotal: state.accumulated })
    return { newState: state, events }
  }

  // Find closest to pin among eligible
  // closestTo is stored as a numeric distance (lower = closer); or a designated field
  // We use oyesClosest: playerId marked as closest
  const closest = eligible.filter(id => holeScores[id].oyesClosest === true)

  let winners = []
  if (closest.length === 0) {
    // No one marked as closest — split among all eligible
    winners = eligible
  } else if (closest.length === 1) {
    winners = [closest[0]]
  } else {
    // Multiple marked closest → split
    winners = closest
  }

  const accumulated = state.accumulated || 0
  const totalUnits = accumulated + 1

  const wasAccumulated = accumulated > 0

  if (!wasAccumulated && winners.length === 1) {
    state.wonSequentially = [...(state.wonSequentially || []), winners[0]]
  }

  state.accumulated = 0
  events.push({ type: 'oyes_won', winners, holeNum, units: totalUnits, wasAccumulated })

  // Check Zapato: all 4 par-3s won by same player without any accumulation
  const par3Count = Object.keys(players).length > 0 ? 4 : 4 // assume 4 par 3s
  if (
    !state.zapatoTriggered &&
    !wasAccumulated &&
    state.wonSequentially.length >= par3Count
  ) {
    const allSame = state.wonSequentially.every(id => id === state.wonSequentially[0])
    if (allSame) {
      state.zapatoTriggered = true
      events.push({ type: 'zapato', winnerId: state.wonSequentially[0] })
    }
  }

  return { newState: state, events }
}

// ─── DRIVES ─────────────────────────────────────────────────────────────────

export function processDrive(drivesAccumulated, holeNum, holePar, holeScores, playerIds, baseValue) {
  if (holePar !== 4 && holePar !== 5) return { winner: null, newAccumulated: drivesAccumulated, events: [] }

  const inFairway = playerIds.filter(id => holeScores?.[id]?.inFairway === true)

  if (inFairway.length === 0) {
    const newAcc = drivesAccumulated + baseValue
    return {
      winner: null,
      newAccumulated: newAcc,
      events: [{ type: 'drive_accumulated', holeNum, newTotal: newAcc }],
    }
  }

  // Find longest drive in fairway
  // driveDistance stored per player; or use marker driveWinner
  const driveWinner = playerIds.find(id => holeScores?.[id]?.driveWinner === true)
  const winner = driveWinner || inFairway[0] // fallback to first in fairway

  const totalValue = drivesAccumulated + baseValue
  return {
    winner,
    newAccumulated: 0,
    events: [{ type: 'drive_won', winnerId: winner, holeNum, totalValue }],
  }
}

// ─── UNITS ──────────────────────────────────────────────────────────────────

export const UNIT_DEFAULTS = {
  birdie:    1,
  eagle:     3,
  albatross: 20,
  holeInOne: 10,
  sandyPar:  1,
  chipIn:    1,
}

export function detectUnits(gross, par, inBunker, chipIn) {
  const diff = par - gross
  const units = []
  if (diff === 1) units.push('birdie')
  if (diff === 2) units.push('eagle')
  if (diff >= 3) units.push('albatross')
  if (gross === 1) units.push('holeInOne')
  if (inBunker && gross === par) units.push('sandyPar')
  if (chipIn) units.push('chipIn')
  return units
}

// ─── PENALTIES (unidades negativas) ────────────────────────────────────────

export const PENALTY_DEFAULTS = {
  cuatripod: 1,
  trampa:    1,
  saleVerde: 1,
  paloma:    1,
}

export function detectPenalties(putts, stuckInBunker, leftGreen, whiff) {
  const penalties = []
  if (putts != null && putts >= 4) penalties.push('cuatripod')
  if (stuckInBunker) penalties.push('trampa')
  if (leftGreen) penalties.push('saleVerde')
  if (whiff) penalties.push('paloma')
  return penalties
}

// ─── MEDALS ─────────────────────────────────────────────────────────────────

export function calcMedals(players, holes, roundType) {
  const playerIds = Object.keys(players)
  const minHCP = getMinHCP(players)

  const totals = {}
  for (const id of playerIds) {
    totals[id] = { front: 0, back: 0, total: 0 }
    const effectiveHCP = players[id].handicap - minHCP
    for (const hole of holes) {
      const score = hole.scores?.[id]
      if (!score || score.gross == null) continue
      const net = score.gross - strokesOnHole(effectiveHCP, hole.si)
      if (hole.n <= 9)  totals[id].front += net
      if (hole.n >= 10) totals[id].back  += net
      totals[id].total += net
    }
  }

  function medalWinner(category) {
    const key = category === 'front' ? 'front' : category === 'back' ? 'back' : 'total'
    const scores = playerIds.map(id => ({ id, score: totals[id][key], hcp: players[id].handicap }))
    const min = Math.min(...scores.map(s => s.score))
    const tied = scores.filter(s => s.score === min)
    if (tied.length === 1) return [tied[0].id]
    const minHcp = Math.min(...tied.map(s => s.hcp))
    const byHcp  = tied.filter(s => s.hcp === minHcp)
    return byHcp.map(s => s.id)
  }

  const available = roundType === 'front9' ? ['front'] : roundType === 'back9' ? ['back'] : ['front', 'back', 'total']

  const results = {}
  for (const cat of available) {
    results[cat] = { winners: medalWinner(cat), totals: {} }
    for (const id of playerIds) {
      const key = cat === 'front' ? 'front' : cat === 'back' ? 'back' : 'total'
      results[cat].totals[id] = totals[id][key]
    }
  }

  return results
}

// ─── PUTTS ──────────────────────────────────────────────────────────────────

export function calcPutts(players, holes) {
  const playerIds = Object.keys(players)
  const totalPutts = {}
  for (const id of playerIds) {
    totalPutts[id] = 0
    for (const hole of holes) {
      const p = hole.scores?.[id]?.putts
      if (p != null) totalPutts[id] += p
    }
  }

  const values = Object.values(totalPutts)
  if (values.length === 0) return { totalPutts, minPlayers: [], maxPlayers: [], paid: 0 }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const minPlayers = playerIds.filter(id => totalPutts[id] === min)
  const maxPlayers = playerIds.filter(id => totalPutts[id] === max)

  return { totalPutts, minPlayers, maxPlayers, min, max }
}
