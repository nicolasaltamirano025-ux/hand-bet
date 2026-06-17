import Button from '../../components/ui/Button'
import { useLanguage } from '../../i18n'

export default function Step3Players({ players, setPlayers, next, back }) {
  const { tr } = useLanguage()

  function add() {
    if (players.length >= 6) return
    setPlayers(p => [...p, { name: '', handicap: 18 }])
  }

  function remove(i) {
    if (players.length <= 1) return
    setPlayers(p => p.filter((_, idx) => idx !== i))
  }

  function update(i, key, val) {
    setPlayers(p => {
      const next = [...p]
      next[i] = { ...next[i], [key]: val }
      return next
    })
  }

  const valid = players.every(p => p.name.trim().length > 0) && players.length >= 2

  return (
    <div className="flex flex-col px-5 pt-10 pb-8 gap-6">
      <button onClick={back} className="text-gray-400 text-sm self-start">{tr.backStep}</button>
      <div>
        <h1 className="text-white text-2xl font-black">{tr.playersTitle}</h1>
        <p className="text-gray-400 text-sm mt-1">{tr.step(3, 5)} — {tr.step3sub}</p>
      </div>

      <div className="flex flex-col gap-3">
        {players.map((p, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                {i === 0 ? tr.organizerYouLabel : tr.playerLabel(i + 1)}
              </span>
              {i > 0 && (
                <button onClick={() => remove(i)} className="text-red-400 text-sm">{tr.removePlayer}</button>
              )}
            </div>
            <input
              placeholder={tr.namePlaceholder}
              value={p.name}
              onChange={e => update(i, 'name', e.target.value)}
              className="bg-bg border border-border rounded-xl px-4 py-3 text-white outline-none focus:border-gold text-base"
            />
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm flex-shrink-0">{tr.handicap}</span>
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => update(i, 'handicap', Math.max(0, Number(p.handicap) - 1))}
                  className="w-10 h-10 rounded-xl border border-border bg-bg text-white text-xl font-bold flex items-center justify-center"
                >−</button>
                <input
                  type="number"
                  value={p.handicap}
                  min={0}
                  max={36}
                  onChange={e => update(i, 'handicap', Math.min(36, Math.max(0, Number(e.target.value))))}
                  className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-white text-center text-xl font-bold outline-none focus:border-gold"
                />
                <button
                  onClick={() => update(i, 'handicap', Math.min(36, Number(p.handicap) + 1))}
                  className="w-10 h-10 rounded-xl border border-border bg-bg text-white text-xl font-bold flex items-center justify-center"
                >+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {players.length < 6 && (
        <button
          onClick={add}
          className="border-2 border-dashed border-border rounded-xl py-4 text-gray-400 text-sm font-medium"
        >
          {tr.addPlayer}
        </button>
      )}

      <Button onClick={next} disabled={!valid} className="w-full mt-auto">
        {valid ? tr.continue : tr.enterAllNames}
      </Button>
    </div>
  )
}
