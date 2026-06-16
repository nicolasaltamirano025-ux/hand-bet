import { useState, useEffect } from 'react'
import Button from '../../components/ui/Button'
import Toggle from '../../components/ui/Toggle'
import NumberInput from '../../components/ui/NumberInput'

const UNIT_KEYS = [
  { key: 'birdie',    label: 'Birdie',      def: 1,  emoji: '🦅' },
  { key: 'eagle',     label: 'Eagle',       def: 3,  emoji: '🦅🦅' },
  { key: 'albatross', label: 'Albatros',    def: 20, emoji: '🐦' },
  { key: 'holeInOne', label: 'Hoyo en uno', def: 10, emoji: '⛳' },
  { key: 'sandyPar',  label: 'Sandy par',   def: 1,  emoji: '🏖️' },
  { key: 'chipIn',    label: 'Hole-out',    def: 1,  emoji: '🎯' },
]

export default function Step4Bets({ bets, setBets, roundType, next, back }) {
  function toggle(key) {
    setBets(b => ({ ...b, [key]: { ...b[key], enabled: !b[key].enabled } }))
  }

  function setVal(section, field, val) {
    setBets(b => ({ ...b, [section]: { ...b[section], [field]: val } }))
  }

  const isFullRound = roundType === '18'

  return (
    <div className="flex flex-col px-5 pt-10 pb-8 gap-6">
      <button onClick={back} className="text-gray-400 text-sm self-start">← Atrás</button>
      <div>
        <h1 className="text-white text-2xl font-black">Apuestas</h1>
        <p className="text-gray-400 text-sm mt-1">Paso 4 de 5 — activa y configura cada apuesta</p>
      </div>

      {/* MANO */}
      <Section title="🤜 La Mano">
        <Toggle
          checked={bets.mano.enabled}
          onChange={() => toggle('mano')}
          label="La Mano"
          description="Hoyos acumulados por empates"
        />
        {bets.mano.enabled && (
          <NumberInput
            label="Valor por hoyo"
            value={bets.mano.valuePerHole}
            onChange={v => setVal('mano', 'valuePerHole', v)}
          />
        )}
      </Section>

      {/* O'YES */}
      <Section title="📍 O'yes">
        <Toggle
          checked={bets.oyes.enabled}
          onChange={() => toggle('oyes')}
          label="O'yes"
          description="Par 3 · más cercano en green + par bruto"
        />
        {bets.oyes.enabled && (
          <NumberInput
            label="Valor por O'yes"
            value={bets.oyes.value}
            onChange={v => setVal('oyes', 'value', v)}
          />
        )}
      </Section>

      {/* MEDALS */}
      <Section title="🥇 Medals (stroke neto)">
        <Toggle
          checked={bets.medals.enabled}
          onChange={() => toggle('medals')}
          label="Medals"
          description="Front 9, Back 9 y/o Total"
        />
        {bets.medals.enabled && (
          <div className="flex flex-col gap-2 mt-1">
            {(roundType === '18' || roundType === 'front9') && (
              <NumberInput label="Front 9" value={bets.medals.frontValue} onChange={v => setVal('medals', 'frontValue', v)} />
            )}
            {(roundType === '18' || roundType === 'back9') && (
              <NumberInput label="Back 9" value={bets.medals.backValue} onChange={v => setVal('medals', 'backValue', v)} />
            )}
            {roundType === '18' && (
              <NumberInput label="Total" value={bets.medals.totalValue} onChange={v => setVal('medals', 'totalValue', v)} />
            )}
          </div>
        )}
      </Section>

      {/* DRIVES */}
      <Section title="💨 Drives">
        <Toggle
          checked={bets.drives.enabled}
          onChange={() => toggle('drives')}
          label="Drives"
          description="Par 4 y 5 · drive más largo"
        />
        {bets.drives.enabled && (
          <NumberInput
            label="Valor por hoyo"
            value={bets.drives.value}
            onChange={v => setVal('drives', 'value', v)}
          />
        )}
      </Section>

      {/* PUTTS */}
      <Section title="⛳ Putts">
        <Toggle
          checked={bets.putts.enabled}
          onChange={() => toggle('putts')}
          label="Putts"
          description="Cada jugador paga sus propios putts × valor"
        />
        {bets.putts.enabled && (
          <NumberInput
            label="Valor por putt"
            value={bets.putts.valuePerPutt}
            onChange={v => setVal('putts', 'valuePerPutt', v)}
          />
        )}
      </Section>

      {/* UNITS */}
      <Section title="🏆 Unidades">
        <Toggle
          checked={bets.units.enabled}
          onChange={() => toggle('units')}
          label="Unidades"
          description="Birdie, Eagle, Albatros, Hole-out, etc."
        />
        {bets.units.enabled && (
          <div className="flex flex-col gap-3 mt-2">
            <NumberInput
              label="Valor base por unidad ($)"
              value={bets.units.baseValue}
              onChange={v => setVal('units', 'baseValue', v)}
            />
            <p className="text-gray-400 text-xs">Multiplicadores (× valor base):</p>
            {UNIT_KEYS.map(u => (
              <div key={u.key} className="flex items-center justify-between gap-3">
                <span className="text-white text-sm">{u.emoji} {u.label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-sm">×</span>
                  <MultiplierInput
                    value={bets.units[u.key] ?? u.def}
                    onChange={v => setVal('units', u.key, v)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Button onClick={next} className="w-full mt-2">Ver Resumen →</Button>
    </div>
  )
}

function MultiplierInput({ value, onChange }) {
  const [local, setLocal] = useState(String(value ?? 1))

  useEffect(() => { setLocal(String(value ?? 1)) }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      value={local}
      onChange={e => setLocal(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        const n = Math.max(1, parseInt(local, 10) || 1)
        setLocal(String(n))
        onChange(n)
      }}
      className="bg-surface border border-border rounded-lg px-2 py-1.5 text-white text-center w-16 outline-none text-sm focus:border-gold"
    />
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-4">
      <h3 className="text-white font-bold text-sm">{title}</h3>
      {children}
    </div>
  )
}
