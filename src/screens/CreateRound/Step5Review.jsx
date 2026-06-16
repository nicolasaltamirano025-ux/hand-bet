import Button from '../../components/ui/Button'

const fmtMXN = n => `$${Number(n || 0).toLocaleString('es-MX')}`

export default function Step5Review({ field, roundType, startingHole, players, bets, back, handleCreate, saving }) {
  const rtLabel = { '18': '18 Hoyos', front9: 'Front 9', back9: 'Back 9' }

  return (
    <div className="flex flex-col px-5 pt-10 pb-8 gap-6">
      <button onClick={back} className="text-gray-400 text-sm self-start">← Atrás</button>
      <div>
        <h1 className="text-white text-2xl font-black">Resumen</h1>
        <p className="text-gray-400 text-sm mt-1">Paso 5 de 5 — confirma y crea la ronda</p>
      </div>

      <Row label="Campo" value={field?.name} />
      <Row label="Ronda" value={rtLabel[roundType]} />
      {roundType === '18' && <Row label="Salen por" value={`Hoyo ${startingHole}`} />}

      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wide">Jugadores</p>
        {players.map((p, i) => (
          <div key={i} className="flex justify-between py-1.5 border-b border-border last:border-0">
            <span className="text-white">{p.name} {i === 0 && <span className="text-gold text-xs">⭐</span>}</span>
            <span className="text-gray-400 text-sm">HCP {p.handicap}</span>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wide">Apuestas activas</p>
        {bets.mano.enabled   && <BetRow label="La Mano"    value={`${fmtMXN(bets.mano.valuePerHole)} / hoyo`} />}
        {bets.oyes.enabled   && <BetRow label="O'yes"      value={fmtMXN(bets.oyes.value)} />}
        {bets.medals.enabled && <BetRow label="Medals"     value={[bets.medals.frontValue, bets.medals.backValue, bets.medals.totalValue].filter(Boolean).map(fmtMXN).join(' / ')} />}
        {bets.drives.enabled && <BetRow label="Drives"     value={`${fmtMXN(bets.drives.value)} / hoyo`} />}
        {bets.putts.enabled  && <BetRow label="Putts"      value={`${fmtMXN(bets.putts.valuePerPutt)} / putt`} />}
        {bets.units.enabled  && <BetRow label="Unidades"   value={`Base ${fmtMXN(bets.units.baseValue)}`} />}
      </div>

      <Button onClick={handleCreate} disabled={saving} className="w-full text-lg py-5">
        {saving ? 'Creando ronda...' : '🚀 Crear Ronda'}
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
