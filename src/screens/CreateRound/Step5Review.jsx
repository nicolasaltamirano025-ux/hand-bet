import Button from '../../components/ui/Button'
import { useLanguage } from '../../i18n'

const fmtMXN = n => `$${Number(n || 0).toLocaleString('es-MX')}`

export default function Step5Review({ field, roundType, startingHole, players, bets, back, handleCreate, saving }) {
  const { tr } = useLanguage()

  const rtLabel = { '18': tr.holes18, front9: tr.front9, back9: tr.back9 }

  return (
    <div className="flex flex-col px-5 pt-10 pb-8 gap-6">
      <button onClick={back} className="text-gray-400 text-sm self-start">{tr.backStep}</button>
      <div>
        <h1 className="text-white text-2xl font-black">{tr.reviewTitle}</h1>
        <p className="text-gray-400 text-sm mt-1">{tr.step(5, 5)} — {tr.step5sub}</p>
      </div>

      <Row label={tr.fieldLabel} value={field?.name} />
      <Row label={tr.roundLabel} value={rtLabel[roundType]} />
      {roundType === '18' && <Row label={tr.startingFrom} value={tr.holeN(startingHole)} />}

      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wide">{tr.playersTitle}</p>
        {players.map((p, i) => (
          <div key={i} className="flex justify-between py-1.5 border-b border-border last:border-0">
            <span className="text-white">{p.name} {i === 0 && <span className="text-gold text-xs">⭐</span>}</span>
            <span className="text-gray-400 text-sm">HCP {p.handicap}</span>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wide">{tr.activeBets}</p>
        {bets.mano.enabled   && <BetRow label="La Mano"       value={`${fmtMXN(bets.mano.valuePerHole)} ${tr.perHole}`} />}
        {bets.oyes.enabled   && <BetRow label="O'yes"         value={fmtMXN(bets.oyes.value)} />}
        {bets.medals.enabled && <BetRow label="Medals"        value={[bets.medals.frontValue, bets.medals.backValue, bets.medals.totalValue].filter(Boolean).map(fmtMXN).join(' / ')} />}
        {bets.drives.enabled && <BetRow label="Drives"        value={`${fmtMXN(bets.drives.value)} ${tr.perHole}`} />}
        {bets.putts.enabled  && <BetRow label="Putts"         value={`${fmtMXN(bets.putts.valuePerPutt)} ${tr.perPutt}`} />}
        {bets.units.enabled   && <BetRow label={tr.unitsLabel}   value={`Base ${fmtMXN(bets.units.baseValue)}`} />}
        {bets.pinkies?.enabled && <BetRow label={tr.pinkiesLabel} value={`${fmtMXN(bets.pinkies.value)} / pinky`} />}
        {bets.penalties?.enabled && <BetRow label={tr.penaltiesLabel} value={`Base ${fmtMXN(bets.penalties.baseValue)}`} />}
      </div>

      <Button onClick={handleCreate} disabled={saving} className="w-full text-lg py-5">
        {saving ? tr.creatingRound : tr.createRound}
      </Button>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white font-semibold text-sm text-right max-w-[60%]">{value}</span>
    </div>
  )
}

function BetRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-white text-sm">{label}</span>
      <span className="text-gold text-sm font-semibold">{value}</span>
    </div>
  )
}
