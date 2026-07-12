import { useParams, useNavigate } from 'react-router-dom'
import { useRound } from '../hooks/useRound'
import { strokesOnHole, getMinHCP } from '../utils/handicap'
import { computeSettlement } from '../utils/settlement'
import { useLanguage } from '../i18n'

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX')}`

export default function BetsScreen() {
  const { code } = useParams()
  const nav = useNavigate()
  const { tr } = useLanguage()
  const { round, loading } = useRound(code)

  if (loading || !round) return <Loading />

  const { players, bets, manoState, manoEvents, oyesEvents, driveEvents, drivesAccumulated, oyesState } = round
  const playerIds = Object.keys(players || {})
  const minHCP = getMinHCP(players || {})
  const holes = Object.values(round.holes || {}).sort((a, b) => a.n - b.n)

  const manoHoleWins = (manoEvents || []).filter(e => e.type === 'mano_win' || e.type === 'hole_win')
  const oyesWins = (oyesEvents || []).filter(e => e.type === 'oyes_won')
  const driveWins = (driveEvents || []).filter(e => e.type === 'drive_won')

  let settlement = { debts: [] }
  try { settlement = computeSettlement(round) } catch {}

  return (
    <div className="flex flex-col min-h-dvh bg-bg pb-8">
      <div
        className="sticky top-0 bg-bg border-b border-border px-4 py-4 flex items-center gap-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button onClick={() => nav(-1)} className="text-gray-400 text-sm">{tr.back}</button>
        <h2 className="text-white font-bold text-lg flex-1 text-center">{tr.betsStatus}</h2>
        <button onClick={() => nav('/')} className="text-xs text-gray-400 border border-border rounded-lg px-2.5 py-1.5">🏠</button>
        <button onClick={() => nav(`/round/${code}/final`)} className="text-gold text-sm">{tr.finalBtn}</button>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">

        {bets?.mano?.enabled && (
          <Card title="🤜 La Mano" sub={`${fmt(bets.mano.valuePerHole)} ${tr.perHole}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`text-sm font-semibold px-3 py-1 rounded-full ${manoState?.isOpen ? 'bg-orange-900 text-orange-200' : 'bg-surface text-gray-400'}`}>
                {manoState?.isOpen ? tr.manoOpen(manoState.accumulated) : tr.manoClosed}
              </div>
              {manoState?.holderId && <span className="text-white text-sm">{players[manoState.holderId]?.name}</span>}
            </div>
            {manoHoleWins.length > 0 ? manoHoleWins.map((e, i) => (
              <EventRow key={i}
                label={e.type === 'mano_win' ? `Mano H${e.holeNum} (${tr.manoHoles(e.units)})` : `${tr.hole} ${e.holeNum}`}
                value={players[e.winnerId]?.name}
                amount={e.units * bets.mano.valuePerHole}
              />
            )) : <p className="text-gray-500 text-sm">{tr.noChargesYet}</p>}
          </Card>
        )}

        {bets?.oyes?.enabled && (
          <Card title="📍 O'yes" sub={`${fmt(bets.oyes.value)} ${tr.perOyes}${oyesState?.zapatoTriggered ? ' · ×2 ZAPATO 👟' : ''}`}>
            {oyesState?.accumulated > 0 && (
              <div className="text-yellow-400 text-sm font-semibold mb-2">⏳ {oyesState.accumulated} {tr.accumulatedLabel}</div>
            )}
            {oyesWins.length > 0 ? oyesWins.map((e, i) => (
              <EventRow key={i}
                label={`O'yes H${e.holeNum}${e.wasAccumulated ? ` (×${e.units})` : ''}`}
                value={e.winners.map(id => players[id]?.name).join(', ')}
                amount={e.units * bets.oyes.value * (oyesState?.zapatoTriggered ? 2 : 1)}
              />
            )) : <p className="text-gray-500 text-sm">{tr.noChargesYet}</p>}
          </Card>
        )}

        {bets?.medals?.enabled && (
          <Card title="🥇 Medals" sub={tr.calculatedAtEnd}>
            {['front', 'back', 'total'].filter(c => bets.medals[`${c === 'total' ? 'total' : c}Value`]).map(cat => {
              const catHoles = cat === 'front' ? holes.filter(h => h.n <= 9) : cat === 'back' ? holes.filter(h => h.n >= 10) : holes
              const netTotals = playerIds.map(id => {
                const net = catHoles.reduce((s, h) => {
                  const g = round.holes?.[h.n]?.scores?.[id]?.gross
                  return s + (g != null ? g - strokesOnHole(players[id].handicap - minHCP, h.si) : 0)
                }, 0)
                return { id, net }
              }).sort((a, b) => a.net - b.net)

              return (
                <div key={cat} className="mb-3">
                  <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">{cat === 'front' ? tr.front9 : cat === 'back' ? tr.back9 : 'Total'}</p>
                  {netTotals.map(({ id, net }, i) => (
                    <div key={id} className="flex justify-between py-1">
                      <span className={`text-sm ${i === 0 ? 'text-gold font-bold' : 'text-white'}`}>{i === 0 ? '🥇 ' : ''}{players[id]?.name}</span>
                      <span className={`text-sm ${i === 0 ? 'text-gold' : 'text-gray-400'}`}>{net}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </Card>
        )}

        {bets?.drives?.enabled && (
          <Card title="💨 Drives" sub={`${fmt(bets.drives.value)} ${tr.perHole}`}>
            {(drivesAccumulated || 0) > 0 && (
              <div className="text-yellow-400 text-sm font-semibold mb-2">{tr.accumulatedAmt(fmt(drivesAccumulated))}</div>
            )}
            {driveWins.length > 0 ? driveWins.map((e, i) => (
              <EventRow key={i}
                label={`Drive H${e.holeNum}${e.totalValue > bets.drives.value ? ` (${tr.driveAcc})` : ''}`}
                value={players[e.winnerId]?.name}
                amount={e.totalValue}
              />
            )) : <p className="text-gray-500 text-sm">{tr.noChargesYet}</p>}
          </Card>
        )}

        {bets?.putts?.enabled && (
          <Card title="⛳ Putts" sub={`${fmt(bets.putts.valuePerPutt)} ${tr.perPutt}`}>
            {playerIds.map(id => {
              const total = holes.reduce((s, h) => s + (round.holes?.[h.n]?.scores?.[id]?.putts || 0), 0)
              return (
                <div key={id} className="flex justify-between py-1">
                  <span className="text-white text-sm">{players[id]?.name}</span>
                  <span className="text-gray-400 text-sm">{total} putts · {fmt(total * bets.putts.valuePerPutt)}</span>
                </div>
              )
            })}
          </Card>
        )}

        {bets?.pinkies?.enabled && (
          <Card title={`⚠️ ${tr.pinkiesLabel}`} sub={`${fmt(bets.pinkies.value)} / castigo`}>
            {(round.pinkiesEvents || []).filter(e => e.type === 'pinky').length > 0
              ? (round.pinkiesEvents || []).filter(e => e.type === 'pinky').map((e, i) => (
                  <EventRow key={i}
                    label={`${e.subtype === 'fourPutt' ? '4 Putts' : 'Pinky'} H${e.holeNum}`}
                    value={players[e.playerId]?.name}
                    amount={bets.pinkies.value * (playerIds.length - 1)}
                  />
                ))
              : <p className="text-gray-500 text-sm">Sin castigos</p>}
          </Card>
        )}

        {bets?.units?.enabled && (
          <Card title={`🏆 ${tr.unitsLabel}`} sub={`Base ${fmt(bets.units?.baseValue)}`}>
            {(round.unitsEvents || []).length > 0 ? (round.unitsEvents || []).map((ev, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                <span className="text-white text-sm">{players[ev.playerId]?.name} · H{ev.holeNum}</span>
                <span className="text-gold text-sm">{ev.units.join(', ')}</span>
              </div>
            )) : <p className="text-gray-500 text-sm">{tr.noUnitsYet}</p>}
          </Card>
        )}

        {bets?.penalties?.enabled && (
          <Card title={`💀 ${tr.penaltiesLabel}`} sub={`Base ${fmt(bets.penalties?.baseValue)}`}>
            {(round.penaltiesEvents || []).length > 0 ? (round.penaltiesEvents || []).map((ev, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                <span className="text-white text-sm">{players[ev.playerId]?.name} · H{ev.holeNum}</span>
                <span className="text-red-400 text-sm">{ev.penalties.join(', ')}</span>
              </div>
            )) : <p className="text-gray-500 text-sm">{tr.noPenaltiesYet}</p>}
          </Card>
        )}

        {settlement.debts.length > 0 && (
          <div className="bg-surface border border-gold/30 rounded-xl p-4">
            <h3 className="text-white font-bold text-sm mb-3">{tr.whoOwesWhom}</h3>
            <div className="flex flex-col gap-2">
              {settlement.debts.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div>
                    <span className="text-red-400 font-semibold text-sm">{d.fromName}</span>
                    <span className="text-gray-400 mx-2 text-sm">→</span>
                    <span className="text-green-400 font-semibold text-sm">{d.toName}</span>
                  </div>
                  <span className="text-gold font-black text-base">{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function Card({ title, sub, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        <span className="text-gray-400 text-xs">{sub}</span>
      </div>
      {children}
    </div>
  )
}

function EventRow({ label, value, amount }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-gray-400 text-xs">{value}</p>
      </div>
      <span className="text-gold text-sm font-bold">{fmt(amount)}</span>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-dvh bg-bg"><p className="text-gray-400">Cargando...</p></div>
}
