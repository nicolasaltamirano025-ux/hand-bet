import { useParams, useNavigate } from 'react-router-dom'
import { useRound } from '../hooks/useRound'
import { strokesOnHole, getMinHCP } from '../utils/handicap'
import { useLanguage } from '../i18n'

export default function ScorecardScreen() {
  const { code } = useParams()
  const nav = useNavigate()
  const { tr } = useLanguage()
  const { round, loading } = useRound(code)

  if (loading || !round) return <Loading />

  const players = round.players || {}
  const playerIds = Object.keys(players)
  const minHCP = getMinHCP(players)
  const holes = Object.values(round.holes || {}).sort((a, b) => {
    if (a.playOrder != null) return a.playOrder - b.playOrder
    return a.n - b.n
  })

  function net(playerId, hole) {
    const g = round.holes?.[hole.n]?.scores?.[playerId]?.gross
    if (g == null) return null
    return g - strokesOnHole(players[playerId].handicap - minHCP, hole.si)
  }

  function putts(playerId, hole) {
    return round.holes?.[hole.n]?.scores?.[playerId]?.putts ?? null
  }

  function totalGross(playerId, holeList) {
    return holeList.reduce((s, h) => {
      const g = round.holes?.[h.n]?.scores?.[playerId]?.gross
      return s + (g ?? 0)
    }, 0)
  }

  function totalNet(playerId, holeList) {
    return holeList.reduce((s, h) => {
      const n = net(playerId, h)
      return s + (n ?? 0)
    }, 0)
  }

  function totalPutts(playerId, holeList) {
    return holeList.reduce((s, h) => {
      const p = putts(playerId, h)
      return s + (p ?? 0)
    }, 0)
  }

  const front = holes.filter(h => h.n <= 9)
  const back  = holes.filter(h => h.n >= 10)
  const hasBoth = front.length > 0 && back.length > 0

  const holeWinnerMap = {}
  for (const ev of (round.manoEvents || [])) {
    if (ev.type === 'hole_win') {
      holeWinnerMap[ev.holeNum] = ev.winnerId
    }
    if (ev.type === 'mano_win') {
      holeWinnerMap[ev.holeNum] = ev.winnerId
      // Circle every accumulated hole, not just the winning one
      if (ev.units > 1) {
        const winIdx = holes.findIndex(h => h.n === ev.holeNum)
        if (winIdx >= 0) {
          for (let i = Math.max(0, winIdx - ev.units + 1); i < winIdx; i++) {
            holeWinnerMap[holes[i].n] = ev.winnerId
          }
        }
      }
    }
  }

  const unitMap = {}
  for (const ev of (round.unitsEvents || [])) {
    if (ev.units?.length > 0) unitMap[`${ev.holeNum}_${ev.playerId}`] = true
  }

  const penaltyMap = {}
  for (const ev of (round.penaltiesEvents || [])) {
    if (ev.penalties?.length > 0) penaltyMap[`${ev.holeNum}_${ev.playerId}`] = true
  }

  function renderTable(sectionHoles, secTotLabel, showGrandTot) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="sticky left-0 bg-surface px-3 py-3 text-gray-400 text-left font-semibold min-w-[90px] text-sm">{tr.hole}</th>
              {sectionHoles.map(h => (
                <th key={h.n} className="px-2 py-3 text-gray-400 font-semibold min-w-[52px] text-center text-sm">
                  {h.n}
                  {Object.values(round.holes?.[h.n]?.reviews || {}).some(r => r.status === 'pending') && <span className="ml-0.5">🚩</span>}
                </th>
              ))}
              <th className="px-2 py-3 text-gold font-bold min-w-[52px] text-center text-sm">{secTotLabel}</th>
              {showGrandTot && <th className="px-2 py-3 text-gold font-bold min-w-[52px] text-center text-sm">TOT</th>}
            </tr>
            <tr className="bg-surface border-b border-border">
              <th className="sticky left-0 bg-surface px-3 py-1.5 text-gray-500 text-left text-xs">Par</th>
              {sectionHoles.map(h => <td key={h.n} className="px-2 py-1.5 text-center text-gray-500 text-xs">{h.par}</td>)}
              <td className="px-2 py-1.5 text-center text-gray-500 text-xs">{sectionHoles.reduce((s, h) => s + h.par, 0)}</td>
              {showGrandTot && <td className="px-2 py-1.5 text-center text-gray-500 text-xs">{holes.reduce((s, h) => s + h.par, 0)}</td>}
            </tr>
          </thead>
          <tbody>
            {playerIds.map(id => (
              <>
                <tr key={`${id}-g`} className="border-b border-border/30">
                  <td className="sticky left-0 bg-bg px-3 py-2.5 font-semibold text-white text-sm">{players[id].name}</td>
                  {sectionHoles.map(h => {
                    const g = round.holes?.[h.n]?.scores?.[id]?.gross
                    const diff = g != null ? g - h.par : null
                    const wonHole = holeWinnerMap[h.n] === id
                    const hasUnit = unitMap[`${h.n}_${id}`]
                    const hasPenalty = penaltyMap[`${h.n}_${id}`]
                    const color = diff == null ? 'text-gray-600'
                      : diff <= -2 ? 'text-yellow-400'
                      : diff === -1 ? 'text-green-400'
                      : diff === 0 ? 'text-blue-400'
                      : 'text-white'
                    return (
                      <td key={h.n} className="px-1 py-2 text-center">
                        <div className={`inline-flex flex-col items-center justify-center w-9 h-9 rounded-full font-bold text-sm ${color} ${wonHole ? 'ring-2 ring-gold bg-gold/15' : ''}`}>
                          {g ?? '·'}
                          {hasUnit && <span className="text-[9px] text-gold leading-none">★</span>}
                          {hasPenalty && <span className="text-[9px] text-red-400 leading-none">✗</span>}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-2 py-2.5 text-center text-gold font-bold text-sm">{totalGross(id, sectionHoles) || '·'}</td>
                  {showGrandTot && <td className="px-2 py-2.5 text-center text-gold font-bold text-sm">{totalGross(id, holes) || '·'}</td>}
                </tr>
                <tr key={`${id}-n`} className="border-b border-border/30">
                  <td className="sticky left-0 bg-bg px-3 py-1.5 text-gray-400 text-xs">{tr.net}</td>
                  {sectionHoles.map(h => {
                    const n = net(id, h)
                    return <td key={h.n} className="px-2 py-1.5 text-center text-gray-400 text-xs">{n ?? '·'}</td>
                  })}
                  <td className="px-2 py-1.5 text-center text-gray-400 text-xs">{totalNet(id, sectionHoles) || '·'}</td>
                  {showGrandTot && <td className="px-2 py-1.5 text-center text-gray-400 text-xs">{totalNet(id, holes) || '·'}</td>}
                </tr>
                {round.bets?.putts?.enabled && (
                  <tr key={`${id}-p`} className="border-b border-border">
                    <td className="sticky left-0 bg-bg px-3 py-1.5 text-blue-400/70 text-xs">{tr.putts.toLowerCase()}</td>
                    {sectionHoles.map(h => {
                      const p = putts(id, h)
                      return <td key={h.n} className="px-2 py-1.5 text-center text-blue-400/70 text-xs">{p ?? '·'}</td>
                    })}
                    <td className="px-2 py-1.5 text-center text-blue-400/70 text-xs">{totalPutts(id, sectionHoles) || '·'}</td>
                    {showGrandTot && <td className="px-2 py-1.5 text-center text-blue-400 text-xs font-semibold">{totalPutts(id, holes) || '·'}</td>}
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <div
        className="sticky top-0 bg-bg border-b border-border px-4 py-4 flex items-center gap-4 z-10"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button onClick={() => nav(-1)} className="text-gray-400 text-sm">{tr.back}</button>
        <h2 className="text-white font-bold text-lg flex-1 text-center">Scorecard</h2>
        <span className="text-gold font-bold text-lg">{code}</span>
        <button onClick={() => nav('/')} className="text-xs text-gray-400 border border-border rounded-lg px-2.5 py-1.5">🏠</button>
      </div>

      {front.length > 0 && (
        <div>
          {hasBoth && <p className="px-4 pt-4 pb-2 text-gold font-bold text-xs uppercase tracking-widest">Front 9</p>}
          {renderTable(front, hasBoth ? 'F9' : 'TOT', false)}
        </div>
      )}

      {back.length > 0 && (
        <div>
          <p className={`px-4 pb-2 text-gold font-bold text-xs uppercase tracking-widest ${hasBoth ? 'pt-6' : 'pt-4'}`}>
            {hasBoth ? 'Back 9' : 'Back 9'}
          </p>
          {renderTable(back, hasBoth ? 'B9' : 'TOT', hasBoth)}
        </div>
      )}
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-dvh bg-bg"><p className="text-gray-400">Cargando...</p></div>
}
