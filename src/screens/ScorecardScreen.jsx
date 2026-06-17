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

  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <div
        className="sticky top-0 bg-bg border-b border-border px-4 py-4 flex items-center gap-4 z-10"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button onClick={() => nav(-1)} className="text-gray-400 text-sm">{tr.back}</button>
        <h2 className="text-white font-bold text-lg flex-1 text-center">Scorecard</h2>
        <span className="text-gold font-bold text-lg">{code}</span>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="sticky left-0 bg-surface px-3 py-2 text-gray-400 text-left font-semibold min-w-[80px]">{tr.hole}</th>
              {holes.map(h => (
                <th key={h.n} className="px-2 py-2 text-gray-400 font-semibold min-w-[44px] text-center">
                  {h.n}
                  {Object.values(round.holes?.[h.n]?.reviews || {}).some(r => r.status === 'pending') && <span className="ml-0.5">🚩</span>}
                </th>
              ))}
              {front.length > 0 && <th className="px-2 py-2 text-gold font-bold min-w-[44px] text-center">F9</th>}
              {back.length  > 0 && <th className="px-2 py-2 text-gold font-bold min-w-[44px] text-center">B9</th>}
              <th className="px-2 py-2 text-gold font-bold min-w-[44px] text-center">TOT</th>
            </tr>
            <tr className="bg-surface border-b border-border">
              <th className="sticky left-0 bg-surface px-3 py-1 text-gray-500 text-left text-[11px]">Par</th>
              {holes.map(h => <td key={h.n} className="px-2 py-1 text-center text-gray-500">{h.par}</td>)}
              {front.length > 0 && <td className="px-2 py-1 text-center text-gray-500">{front.reduce((s, h) => s + h.par, 0)}</td>}
              {back.length  > 0 && <td className="px-2 py-1 text-center text-gray-500">{back.reduce((s, h) => s + h.par, 0)}</td>}
              <td className="px-2 py-1 text-center text-gray-500">{holes.reduce((s, h) => s + h.par, 0)}</td>
            </tr>
          </thead>
          <tbody>
            {playerIds.map(id => (
              <>
                <tr key={`${id}-g`} className="border-b border-border/30">
                  <td className="sticky left-0 bg-bg px-3 py-2 font-semibold text-white">{players[id].name}</td>
                  {holes.map(h => {
                    const g = round.holes?.[h.n]?.scores?.[id]?.gross
                    const diff = g != null ? g - h.par : null
                    return (
                      <td key={h.n} className={`px-2 py-2 text-center font-bold ${diff == null ? 'text-gray-600' : diff < 0 ? 'text-red-400' : diff === 0 ? 'text-blue-400' : 'text-white'}`}>
                        {g ?? '·'}
                        {diff != null && diff === -2 && <span className="text-[9px] block text-yellow-400">E</span>}
                        {diff != null && diff === -1 && <span className="text-[9px] block text-red-400">B</span>}
                      </td>
                    )
                  })}
                  {front.length > 0 && <td className="px-2 py-2 text-center text-gold font-bold">{totalGross(id, front) || '·'}</td>}
                  {back.length  > 0 && <td className="px-2 py-2 text-center text-gold font-bold">{totalGross(id, back) || '·'}</td>}
                  <td className="px-2 py-2 text-center text-gold font-bold">{totalGross(id, holes) || '·'}</td>
                </tr>
                <tr key={`${id}-n`} className="border-b border-border/30">
                  <td className="sticky left-0 bg-bg px-3 py-1 text-gray-400 text-[11px]">{tr.net}</td>
                  {holes.map(h => {
                    const n = net(id, h)
                    return <td key={h.n} className="px-2 py-1 text-center text-gray-400 text-[11px]">{n ?? '·'}</td>
                  })}
                  {front.length > 0 && <td className="px-2 py-1 text-center text-gray-400 text-[11px]">{totalNet(id, front) || '·'}</td>}
                  {back.length  > 0 && <td className="px-2 py-1 text-center text-gray-400 text-[11px]">{totalNet(id, back) || '·'}</td>}
                  <td className="px-2 py-1 text-center text-gray-400 text-[11px]">{totalNet(id, holes) || '·'}</td>
                </tr>
                {round.bets?.putts?.enabled && (
                  <tr key={`${id}-p`} className="border-b border-border">
                    <td className="sticky left-0 bg-bg px-3 py-1 text-blue-400/70 text-[11px]">{tr.putts.toLowerCase()}</td>
                    {holes.map(h => {
                      const p = putts(id, h)
                      return <td key={h.n} className="px-2 py-1 text-center text-blue-400/70 text-[11px]">{p ?? '·'}</td>
                    })}
                    {front.length > 0 && <td className="px-2 py-1 text-center text-blue-400/70 text-[11px]">{totalPutts(id, front) || '·'}</td>}
                    {back.length  > 0 && <td className="px-2 py-1 text-center text-blue-400/70 text-[11px]">{totalPutts(id, back) || '·'}</td>}
                    <td className="px-2 py-1 text-center text-blue-400 text-[11px] font-semibold">{totalPutts(id, holes) || '·'}</td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-dvh bg-bg"><p className="text-gray-400">Cargando...</p></div>
}
