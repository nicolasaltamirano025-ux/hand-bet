import { strokesOnHole, getMinHCP } from './handicap'
import { detectUnits, UNIT_DEFAULTS, calcMedals, calcPutts } from './gameLogic'

export function computeSettlement(round) {
  const { players, holes: holesMap, bets, roundType } = round
  const playerIds = Object.keys(players)
  const holes = Object.values(holesMap || {}).sort((a, b) => a.n - b.n)
  const minHCP = getMinHCP(players)

  const ledger = {}
  for (const id of playerIds) ledger[id] = 0

  const items = []

  function pay(fromIds, toIds, amount, label) {
    if (!fromIds.length || !toIds.length || amount === 0) return
    const perFrom = amount / fromIds.length
    const perTo   = amount / toIds.length
    for (const from of fromIds) ledger[from] -= perFrom
    for (const to of toIds)     ledger[to]   += perTo
    items.push({ label, amount, from: fromIds, to: toIds })
  }

  // ── LA MANO ────────────────────────────────────────────────────────────────
  if (bets?.mano?.enabled) {
    const val = bets.mano.valuePerHole || 0
    const manoEvents = round.manoEvents || []
    for (const ev of manoEvents) {
      if (ev.type === 'mano_win') {
        const losers = playerIds.filter(id => id !== ev.winnerId)
        pay(losers, [ev.winnerId], ev.units * val * losers.length, `Mano hoyo ${ev.holeNum} (${ev.units} hoyos)`)
      }
      if (ev.type === 'hole_win') {
        const losers = playerIds.filter(id => id !== ev.winnerId)
        pay(losers, [ev.winnerId], val * losers.length, `Hoyo ${ev.holeNum}`)
      }
      if (ev.type === 'salvamento') {
        const payers = playerIds.filter(id => id !== ev.receiverId && id !== ev.manoHolderId)
        pay(payers, [ev.receiverId], val * payers.length, `Salvamento hoyo ${ev.holeNum}`)
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
        pay(losers, ev.winners, totalPot, `O'yes hoyo ${ev.holeNum}${ev.units > 1 ? ` (×${ev.units} acum.)` : ''}${zapato ? ' ×2 ZAPATO' : ''}`)
      }
    }
  }

  // ── MEDALS ─────────────────────────────────────────────────────────────────
  if (bets?.medals?.enabled) {
    const holesWithScores = holes.map(h => ({
      ...h,
      scores: holesMap[h.n]?.scores || holesMap[String(h.n)]?.scores || {},
    }))
    const medalResults = calcMedals(players, holesWithScores, roundType || '18')

    const medalValues = {
      front: bets.medals.frontValue || 0,
      back:  bets.medals.backValue  || 0,
      total: bets.medals.totalValue || 0,
    }
    const medalNames = { front: 'Medal Front 9', back: 'Medal Back 9', total: 'Medal Total' }

    for (const [cat, result] of Object.entries(medalResults)) {
      const val = medalValues[cat]
      if (!val) continue
      const winners = result.winners
      const losers  = playerIds.filter(id => !winners.includes(id))
      pay(losers, winners, val * losers.length, medalNames[cat])
    }
  }

  // ── DRIVES ─────────────────────────────────────────────────────────────────
  if (bets?.drives?.enabled) {
    const driveVal = bets.drives.value || 0
    const driveEvents = round.driveEvents || []
    for (const ev of driveEvents) {
      if (ev.type === 'drive_won') {
        const losers = playerIds.filter(id => id !== ev.winnerId)
        pay(losers, [ev.winnerId], ev.totalValue * losers.length, `Drive hoyo ${ev.holeNum}${ev.totalValue > driveVal ? ` (acum. $${ev.totalValue})` : ''}`)
      }
    }
  }

  // ── PUTTS — individual: each player pays (their putts − min) × value to the player with fewest putts
  if (bets?.putts?.enabled) {
    const puttVal = bets.putts.valuePerPutt || 0
    const holesWithScores = holes.map(h => ({
      ...h,
      scores: holesMap[h.n]?.scores || holesMap[String(h.n)]?.scores || {},
    }))
    const { totalPutts, minPlayers, min } = calcPutts(players, holesWithScores)

    for (const id of playerIds) {
      const myPutts = totalPutts[id] || 0
      const excess = myPutts - (min || 0)
      if (excess > 0 && minPlayers.length > 0) {
        const amount = excess * puttVal
        pay([id], minPlayers, amount, `Putts — ${players[id]?.name} (${myPutts} putts)`)
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
          pay(losers, [id], amount, `${unitLabel(unit)} hoyo ${hole.n} — ${players[id].name}`)
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
