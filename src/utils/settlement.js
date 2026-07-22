import { strokesOnHole, getMinHCP } from './handicap'
import { detectUnits, UNIT_DEFAULTS, detectPenalties, PENALTY_DEFAULTS, calcMedals, calcPutts } from './gameLogic'

function holesComplete(holesMap, playerIds, predicate) {
  const relevant = Object.values(holesMap || {}).filter(predicate)
  return relevant.length > 0 && relevant.every(h =>
    playerIds.every(id => h.scores?.[id]?.gross != null)
  )
}

export function computeSettlement(round) {
  const { players, holes: holesMap, bets, roundType } = round
  const playerIds = Object.keys(players)
  const holes = Object.values(holesMap || {}).sort((a, b) => a.n - b.n)
  const minHCP = getMinHCP(players)

  const ledger = {}
  for (const id of playerIds) ledger[id] = 0

  const items = []

  function pay(fromIds, toIds, amount, label, type = null) {
    if (!fromIds.length || !toIds.length || amount === 0) return
    const perFrom = amount / fromIds.length
    const perTo   = amount / toIds.length
    for (const from of fromIds) ledger[from] -= perFrom
    for (const to of toIds)     ledger[to]   += perTo
    items.push({ label, amount, from: fromIds, to: toIds, type })
  }

  // ── LA MANO ────────────────────────────────────────────────────────────────
  if (bets?.mano?.enabled) {
    const val = bets.mano.valuePerHole || 0
    const manoEvents = round.manoEvents || []
    for (const ev of manoEvents) {
      if (ev.type === 'mano_win') {
        const losers = playerIds.filter(id => id !== ev.winnerId)
        pay(losers, [ev.winnerId], ev.units * val * losers.length, `Mano hoyo ${ev.holeNum} (${ev.units} hoyos)`, 'mano')
      }
      if (ev.type === 'hole_win') {
        const losers = playerIds.filter(id => id !== ev.winnerId)
        pay(losers, [ev.winnerId], val * losers.length, `Hoyo ${ev.holeNum}`, 'mano')
      }
      if (ev.type === 'salvamento') {
        const payers = playerIds.filter(id => id !== ev.receiverId && id !== ev.manoHolderId)
        pay(payers, [ev.receiverId], val * payers.length, `Salvamento hoyo ${ev.holeNum}`, 'mano')
      }
    }
  }

  // ── O'YES ──────────────────────────────────────────────────────────────────
  if (bets?.oyes?.enabled) {
    const oyesVal = bets.oyes.value || 0
    const oyesEvents = round.oyesEvents || []
    const zapato = oyesEvents.some(e => e.type === 'zapato')
    const multiplier = zapato ? 2 : 1

    for (const ev of oyesEvents) {
      if (ev.type === 'oyes_won') {
        const losers = playerIds.filter(id => !ev.winners.includes(id))
        const totalPot = oyesVal * ev.units * losers.length * multiplier
        pay(losers, ev.winners, totalPot, `O'yes hoyo ${ev.holeNum}${ev.units > 1 ? ` (×${ev.units} acum.)` : ''}${zapato ? ' ×2 ZAPATO' : ''}`, 'oyes')
      }
    }
  }

  // ── MEDALS — solo se calculan cuando los 9/18 hoyos están completos ─────────
  if (bets?.medals?.enabled) {
    const frontDone = holesComplete(holesMap, playerIds, h => h.n <= 9)
    const backDone  = holesComplete(holesMap, playerIds, h => h.n >= 10)

    const holesWithScores = holes.map(h => ({
      ...h,
      scores: holesMap[h.n]?.scores || holesMap[String(h.n)]?.scores || {},
    }))
    const medalResults = calcMedals(players, holesWithScores, roundType || '18')

    const completeness = { front: frontDone, back: backDone, total: frontDone && backDone }
    const medalValues = {
      front: bets.medals.frontValue || 0,
      back:  bets.medals.backValue  || 0,
      total: bets.medals.totalValue || 0,
    }
    const medalNames = { front: 'Medal Front 9', back: 'Medal Back 9', total: 'Medal Total' }

    for (const [cat, result] of Object.entries(medalResults)) {
      if (!completeness[cat]) continue
      const val = medalValues[cat]
      if (!val) continue
      const winners = result.winners
      const losers  = playerIds.filter(id => !winners.includes(id))
      pay(losers, winners, val * losers.length, medalNames[cat], 'medals')
    }
  }

  // ── DRIVES ─────────────────────────────────────────────────────────────────
  if (bets?.drives?.enabled) {
    const driveVal = bets.drives.value || 0
    const driveEvents = round.driveEvents || []
    for (const ev of driveEvents) {
      if (ev.type === 'drive_won') {
        const losers = playerIds.filter(id => id !== ev.winnerId)
        pay(losers, [ev.winnerId], ev.totalValue * losers.length, `Drive hoyo ${ev.holeNum}${ev.totalValue > driveVal ? ` (acum. $${ev.totalValue})` : ''}`, 'drives')
      }
    }
  }

  // ── PUTTS — solo cuando todos los hoyos de la ronda están completos ─────────
  if (bets?.putts?.enabled) {
    const allDone = holesComplete(holesMap, playerIds, () => true)
    if (allDone) {
      const puttVal = bets.putts.valuePerPutt || 0
      const holesWithScores = holes.map(h => ({
        ...h,
        scores: holesMap[h.n]?.scores || holesMap[String(h.n)]?.scores || {},
      }))
      const { totalPutts, minPlayers, maxPlayers, min, max } = calcPutts(players, holesWithScores)

      if (max > min && maxPlayers.length > 0 && minPlayers.length > 0) {
        // All worst putters split the payment equally; only max vs min is settled.
        const excess = max - min
        const totalAmount = excess * puttVal * minPlayers.length
        const namesMax = maxPlayers.map(id => `${players[id]?.name} (${max}p)`).join(' y ')
        const namesMin = minPlayers.map(id => `${players[id]?.name} (${min}p)`).join(' y ')
        pay(maxPlayers, minPlayers, totalAmount, `Putts — ${namesMax} pagan a ${namesMin}`, 'putts')
      }
    }
  }

  // ── PINKIES ────────────────────────────────────────────────────────────────
  if (bets?.pinkies?.enabled) {
    const pinkVal = bets.pinkies.value || 0
    const pinkiesEvents = round.pinkiesEvents || []
    for (const ev of pinkiesEvents) {
      if (ev.type === 'pinky') {
        const others = playerIds.filter(id => id !== ev.playerId)
        pay([ev.playerId], others, pinkVal * others.length, `Pinky hoyo ${ev.holeNum} — ${players[ev.playerId]?.name}`, 'pinkies')
      }
    }
  }

  // ── UNITS ──────────────────────────────────────────────────────────────────
  if (bets?.units?.enabled) {
    const unitValues = { ...UNIT_DEFAULTS, ...(bets.units || {}) }
    const baseVal = bets.units.baseValue || 50

    for (const hole of holes) {
      const holeScores = holesMap[hole.n]?.scores || holesMap[String(hole.n)]?.scores || {}
      for (const id of playerIds) {
        const s = holeScores[id]
        if (!s || s.gross == null) continue
        const achieved = detectUnits(s.gross, hole.par, s.inBunker, s.chipIn)
        for (const unit of achieved) {
          const multiplier = unitValues[unit] || 1
          const amount = baseVal * multiplier * (playerIds.length - 1)
          const losers = playerIds.filter(pid => pid !== id)
          pay(losers, [id], amount, `${unitLabel(unit)} hoyo ${hole.n} — ${players[id].name}`, 'units')
        }
      }
    }
  }

  // ── PENALTIES (unidades negativas) ──────────────────────────────────────────
  if (bets?.penalties?.enabled) {
    const penaltyValues = { ...PENALTY_DEFAULTS, ...(bets.penalties || {}) }
    const baseVal = bets.penalties.baseValue || 0

    for (const hole of holes) {
      const holeScores = holesMap[hole.n]?.scores || holesMap[String(hole.n)]?.scores || {}
      for (const id of playerIds) {
        const s = holeScores[id]
        if (!s || s.gross == null) continue
        const achieved = detectPenalties(s.putts, s.stuckInBunker, s.leftGreen, s.whiff)
        for (const penalty of achieved) {
          const multiplier = penaltyValues[penalty] || 1
          const amount = baseVal * multiplier * (playerIds.length - 1)
          const others = playerIds.filter(pid => pid !== id)
          pay([id], others, amount, `${penaltyLabel(penalty)} hoyo ${hole.n} — ${players[id].name}`, 'penalties')
        }
      }
    }
  }

  const debts = simplifyDebts(ledger, players)

  return { items, debts, ledger }
}

function unitLabel(key) {
  const map = {
    birdie:    'Birdie',
    eagle:     'Eagle',
    albatross: 'Albatros',
    holeInOne: 'Hoyo en uno',
    sandyPar:  'Sandy par',
    chipIn:    'Hole-out',
  }
  return map[key] || key
}

function penaltyLabel(key) {
  const map = {
    cuatripod: '4-putts',
    trampa:    'Trampa',
    saleVerde: 'Salió del green',
    paloma:    'Paloma',
  }
  return map[key] || key
}

function simplifyDebts(ledger, players) {
  const creditors = []
  const debtors   = []

  for (const [id, bal] of Object.entries(ledger)) {
    if (bal > 0.01)   creditors.push({ id, bal })
    if (bal < -0.01)  debtors.push({ id, bal: -bal })
  }

  creditors.sort((a, b) => b.bal - a.bal)
  debtors.sort((a, b) => b.bal - a.bal)

  const debts = []
  let ci = 0, di = 0
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].bal, debtors[di].bal)
    debts.push({
      from: debtors[di].id,
      to:   creditors[ci].id,
      fromName: players[debtors[di].id]?.name,
      toName:   players[creditors[ci].id]?.name,
      amount: Math.round(amount),
    })
    creditors[ci].bal -= amount
    debtors[di].bal   -= amount
    if (creditors[ci].bal < 0.01) ci++
    if (debtors[di].bal   < 0.01) di++
  }

  return debts
}
