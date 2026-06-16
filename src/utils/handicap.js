// Handicap system: relative between players in the group.
// The lowest-HCP player in the group plays at scratch (0 strokes).
// All others receive strokes equal to (their HCP − lowest HCP) on the hardest holes.
// Example: group has 10, 15, 20 HCP → minHCP=10.
//   HCP 15 gets 5 strokes (on SI 1–5), HCP 20 gets 10 strokes (on SI 1–10).

export function getMinHCP(players) {
  const hcps = Object.values(players).map(p => Number(p.handicap))
  return hcps.length ? Math.min(...hcps) : 0
}

// Strokes a player receives on a hole, given effective (relative) handicap and hole SI.
// effectiveHCP = player.handicap − minGroupHCP
// effectiveHCP 5 = 1 stroke on SI 1–5, 0 on SI 6–18
// effectiveHCP 36 = 2 strokes on all holes
export function strokesOnHole(effectiveHCP, holeSI) {
  if (effectiveHCP <= 0) return 0
  const hcp = Math.min(effectiveHCP, 36)
  const firstRound  = hcp >= holeSI ? 1 : 0
  const secondRound = hcp >= holeSI + 18 ? 1 : 0
  return firstRound + secondRound
}

// Convenience: strokes for a player given all players in the group (computes minHCP internally)
export function strokesForPlayer(player, holeSI, players) {
  const minHCP = getMinHCP(players)
  return strokesOnHole(player.handicap - minHCP, holeSI)
}

export function netScore(grossScore, effectiveHCP, holeSI) {
  return grossScore - strokesOnHole(effectiveHCP, holeSI)
}

// Legacy — kept for any callers that use the old absolute-HCP map
export function buildNetScoreMap(players, holeScores, holeSI) {
  const minHCP = getMinHCP(players)
  const map = {}
  for (const [id, p] of Object.entries(players)) {
    const score = holeScores?.[id]
    if (score == null || score.gross == null) continue
    map[id] = score.gross - strokesOnHole(p.handicap - minHCP, holeSI)
  }
  return map
}
