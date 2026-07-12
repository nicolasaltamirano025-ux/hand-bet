import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRound } from '../hooks/useRound'
import { updateRoundDeep } from '../firebase/roundsService'
import {
  UNIT_DEFAULTS, PENALTY_DEFAULTS,
  rebuildManoState, rebuildOyesState, rebuildDrivesAccumulated,
} from '../utils/gameLogic'
import Toggle from '../components/ui/Toggle'
import NumberInput from '../components/ui/NumberInput'
import Button from '../components/ui/Button'
import { useLanguage } from '../i18n'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX')}`

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
      className="bg-bg border border-border rounded-lg px-2 py-1.5 text-white text-center w-16 outline-none text-sm focus:border-gold"
    />
  )
}

function AdminSection({ title, description, emoji, children, collapsible = true }) {
  const [open, setOpen] = useState(!collapsible)
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-start gap-3 p-4 text-left ${collapsible ? 'active:bg-border/20' : ''}`}
      >
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{title}</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-snug">{description}</p>
        </div>
        {collapsible && <span className="text-gray-500 text-lg mt-0.5">{open ? '▲' : '▼'}</span>}
      </button>
      {(!collapsible || open) && (
        <div className="px-4 pb-4 border-t border-border/50 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

function SaveFeedback({ saved }) {
  if (!saved) return null
  return <span className="text-green-400 text-xs font-semibold">✓ Guardado</span>
}

// ─── Bets Editor ─────────────────────────────────────────────────────────────

function BetsEditor({ initialBets, roundType, code }) {
  const { tr } = useLanguage()
  const [bets, setBets] = useState(initialBets)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setBets(initialBets) }, [JSON.stringify(initialBets)])

  const UNIT_KEYS = [
    { key: 'birdie',    label: 'Birdie',      emoji: '🦅' },
    { key: 'eagle',     label: 'Eagle',        emoji: '🦅🦅' },
    { key: 'albatross', label: 'Albatros',     emoji: '🐦' },
    { key: 'holeInOne', label: 'Hoyo en uno',  emoji: '⛳' },
    { key: 'sandyPar',  label: 'Sandy par',    emoji: '🏖️' },
    { key: 'chipIn',    label: 'Hole-out',     emoji: '🎯' },
  ]
  const PENALTY_KEYS = [
    { key: 'cuatripod', label: '4-putts',          emoji: '🐌' },
    { key: 'trampa',    label: 'Trampa (bunker)',   emoji: '🪤' },
    { key: 'saleVerde', label: 'Salir del green',  emoji: '🚪' },
    { key: 'paloma',    label: 'Paloma (whiff)',    emoji: '🕊️' },
  ]

  function toggle(key) {
    setBets(b => ({ ...b, [key]: { ...b[key], enabled: !b[key]?.enabled } }))
    setSaved(false)
  }
  function setVal(section, field, val) {
    setBets(b => ({ ...b, [section]: { ...(b[section] ?? {}), [field]: val } }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await updateRoundDeep(code, { bets })
    setSaving(false)
    setSaved(true)
  }

  const Row = ({ title, children }) => (
    <div className="border-b border-border/50 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  )

  return (
    <div className="flex flex-col gap-0">
      <Row title="🤜 La Mano">
        <Toggle checked={bets.mano.enabled} onChange={() => toggle('mano')} label="La Mano" />
        {bets.mano.enabled && <div className="mt-2"><NumberInput label="Valor por hoyo" value={bets.mano.valuePerHole} onChange={v => setVal('mano', 'valuePerHole', v)} /></div>}
      </Row>

      <Row title="📍 O'yes">
        <Toggle checked={bets.oyes.enabled} onChange={() => toggle('oyes')} label="O'yes" />
        {bets.oyes.enabled && <div className="mt-2"><NumberInput label="Valor por O'yes" value={bets.oyes.value} onChange={v => setVal('oyes', 'value', v)} /></div>}
      </Row>

      <Row title="🥇 Medals">
        <Toggle checked={bets.medals.enabled} onChange={() => toggle('medals')} label="Medals" />
        {bets.medals.enabled && (
          <div className="flex flex-col gap-2 mt-2">
            {(roundType === '18' || roundType === 'front9') && <NumberInput label="Front 9" value={bets.medals.frontValue} onChange={v => setVal('medals', 'frontValue', v)} />}
            {(roundType === '18' || roundType === 'back9') && <NumberInput label="Back 9" value={bets.medals.backValue} onChange={v => setVal('medals', 'backValue', v)} />}
            {roundType === '18' && <NumberInput label="Total" value={bets.medals.totalValue} onChange={v => setVal('medals', 'totalValue', v)} />}
          </div>
        )}
      </Row>

      <Row title="💨 Drives">
        <Toggle checked={bets.drives.enabled} onChange={() => toggle('drives')} label="Drives" />
        {bets.drives.enabled && <div className="mt-2"><NumberInput label="Valor por hoyo" value={bets.drives.value} onChange={v => setVal('drives', 'value', v)} /></div>}
      </Row>

      <Row title="⛳ Putts">
        <Toggle checked={bets.putts.enabled} onChange={() => toggle('putts')} label="Putts" />
        {bets.putts.enabled && <div className="mt-2"><NumberInput label="Valor por putt extra" value={bets.putts.valuePerPutt} onChange={v => setVal('putts', 'valuePerPutt', v)} /></div>}
      </Row>

      <Row title="🏆 Unidades">
        <Toggle checked={bets.units.enabled} onChange={() => toggle('units')} label="Unidades" />
        {bets.units.enabled && (
          <div className="flex flex-col gap-2 mt-2">
            <NumberInput label="Valor base" value={bets.units.baseValue} onChange={v => setVal('units', 'baseValue', v)} />
            <p className="text-gray-500 text-xs">Multiplicadores:</p>
            {UNIT_KEYS.map(u => (
              <div key={u.key} className="flex items-center justify-between">
                <span className="text-white text-sm">{u.emoji} {u.label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-sm">×</span>
                  <MultiplierInput value={bets.units[u.key] ?? UNIT_DEFAULTS[u.key]} onChange={v => setVal('units', u.key, v)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Row>

      <Row title="🤙 Pinkies">
        <Toggle checked={bets.pinkies?.enabled} onChange={() => toggle('pinkies')} label="Pinkies" />
        {bets.pinkies?.enabled && <div className="mt-2"><NumberInput label="Valor por pinky" value={bets.pinkies.value} onChange={v => setVal('pinkies', 'value', v)} /></div>}
      </Row>

      <Row title="💀 Penalidades">
        <Toggle checked={bets.penalties?.enabled} onChange={() => toggle('penalties')} label="Penalidades" />
        {bets.penalties?.enabled && (
          <div className="flex flex-col gap-2 mt-2">
            <NumberInput label="Valor base" value={bets.penalties.baseValue} onChange={v => setVal('penalties', 'baseValue', v)} />
            <p className="text-gray-500 text-xs">Multiplicadores:</p>
            {PENALTY_KEYS.map(p => (
              <div key={p.key} className="flex items-center justify-between">
                <span className="text-white text-sm">{p.emoji} {p.label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-sm">×</span>
                  <MultiplierInput value={bets.penalties[p.key] ?? PENALTY_DEFAULTS[p.key]} onChange={v => setVal('penalties', p.key, v)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Row>

      <div className="flex items-center gap-3 mt-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <SaveFeedback saved={saved} />
      </div>
    </div>
  )
}

// ─── Hole List ────────────────────────────────────────────────────────────────

function HoleList({ holes, holesMap, players, code, nav }) {
  const playerIds = Object.keys(players || {})
  return (
    <div className="flex flex-col gap-2">
      {holes.map(hole => {
        const scores = holesMap[hole.n]?.scores || {}
        const hasSaved = playerIds.some(id => scores[id]?.gross != null)
        return (
          <button
            key={hole.n}
            onClick={() => nav(`/round/${code}?editHole=${hole.n}`)}
            className="flex items-center justify-between px-3 py-2.5 bg-bg border border-border rounded-xl active:bg-border/30 text-left"
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasSaved ? 'bg-green-500' : 'bg-gray-600'}`} />
              <span className="text-white font-semibold text-sm">Hoyo {hole.n}</span>
              <span className="text-gray-400 text-xs">Par {hole.par}</span>
            </div>
            <div className="flex items-center gap-2">
              {hasSaved ? (
                <span className="text-gray-400 text-xs">
                  {playerIds.map(id => scores[id]?.gross ?? '—').join(' · ')}
                </span>
              ) : (
                <span className="text-gray-600 text-xs">Sin guardar</span>
              )}
              <span className="text-gray-500 text-xs">✏️</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── State Override ───────────────────────────────────────────────────────────

const EVENT_LABELS = {
  mano_open: 'Mano abierta',
  mano_accumulated: 'Mano acumulada',
  mano_taken: 'Mano tomada',
  mano_win: 'Mano ganada',
  hole_win: 'Hoyo ganado',
  salvamento: 'Salvamento',
  oyes_accumulated: "O'yes acumulado",
  oyes_won: "O'yes ganado",
  zapato: 'Zapato',
  drive_accumulated: 'Drive acumulado',
  drive_won: 'Drive ganado',
  pinky: 'Pinky',
}

function EventsList({ title, events = [], players, onDelete }) {
  const [open, setOpen] = useState(false)
  if (events.length === 0) return null
  return (
    <div className="border-t border-border/40 pt-3 mt-1">
      <button onClick={() => setOpen(o => !o)} className="text-gray-400 text-xs flex items-center gap-1 mb-2">
        {open ? '▼' : '▶'} {title} ({events.length})
      </button>
      {open && (
        <div className="flex flex-col gap-1.5">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center justify-between gap-2 bg-bg rounded-lg px-3 py-2">
              <div>
                <span className="text-white text-xs font-semibold">{EVENT_LABELS[ev.type] || ev.type}</span>
                <span className="text-gray-500 text-xs ml-2">H{ev.holeNum}</span>
                {(ev.winnerId || ev.playerId) && (
                  <span className="text-gray-400 text-xs ml-2">
                    {players[ev.winnerId || ev.playerId]?.name}
                  </span>
                )}
                {ev.winners && (
                  <span className="text-gray-400 text-xs ml-2">
                    {ev.winners.map(id => players[id]?.name).join(', ')}
                  </span>
                )}
                {ev.units != null && <span className="text-gray-400 text-xs ml-2">×{ev.units}</span>}
                {ev.newTotal != null && <span className="text-gray-400 text-xs ml-2">→{ev.newTotal}</span>}
              </div>
              <button
                onClick={() => onDelete(i)}
                className="text-red-400 text-xs border border-red-800 rounded-lg px-2 py-0.5 active:bg-red-900/30 flex-shrink-0"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StateOverride({ round, players, playerIds, code }) {
  const { manoState, oyesState, manoEvents = [], oyesEvents = [], driveEvents = [] } = round
  const drivesAccumulated = round.drivesAccumulated || 0

  const [mano, setMano] = useState({ ...manoState })
  const [oyes, setOyes] = useState({ ...oyesState })
  const [drives, setDrives] = useState(drivesAccumulated)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [mEvents, setMEvents] = useState([...manoEvents])
  const [oEvents, setOEvents] = useState([...oyesEvents])
  const [dEvents, setDEvents] = useState([...driveEvents])

  useEffect(() => {
    setMano({ ...manoState })
    setOyes({ ...oyesState })
    setDrives(round.drivesAccumulated || 0)
    setMEvents([...manoEvents])
    setOEvents([...oyesEvents])
    setDEvents([...driveEvents])
  }, [round.code])

  async function handleSaveState() {
    setSaving(true)
    await updateRoundDeep(code, {
      manoState: mano,
      oyesState: oyes,
      drivesAccumulated: drives,
    })
    setSaving(false)
    setSaved(true)
  }

  async function deleteEvent(type, idx) {
    if (!window.confirm('¿Eliminar este evento? Esto puede afectar el estado y el cobro final.')) return
    let updates = {}
    if (type === 'mano') {
      const remaining = mEvents.filter((_, i) => i !== idx)
      const newState = rebuildManoState(remaining)
      setMEvents(remaining)
      setMano(newState)
      updates = { manoEvents: remaining, manoState: newState }
    } else if (type === 'oyes') {
      const remaining = oEvents.filter((_, i) => i !== idx)
      const newState = rebuildOyesState(remaining)
      setOEvents(remaining)
      setOyes(newState)
      updates = { oyesEvents: remaining, oyesState: newState }
    } else if (type === 'drive') {
      const remaining = dEvents.filter((_, i) => i !== idx)
      const newAcc = rebuildDrivesAccumulated(remaining)
      setDEvents(remaining)
      setDrives(newAcc)
      updates = { driveEvents: remaining, drivesAccumulated: newAcc }
    }
    await updateRoundDeep(code, updates)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mano state */}
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">La Mano</p>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-gray-400 text-xs mb-1">Dueño de la mano</p>
            <select
              value={mano.holderId || ''}
              onChange={e => { setMano(m => ({ ...m, holderId: e.target.value || null })); setSaved(false) }}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold"
            >
              <option value="">Nadie</option>
              {playerIds.map(id => <option key={id} value={id}>{players[id]?.name}</option>)}
            </select>
          </div>
          <Toggle
            checked={mano.isOpen}
            onChange={v => { setMano(m => ({ ...m, isOpen: v })); setSaved(false) }}
            label="Mano abierta"
          />
          <NumberInput
            label="Hoyos acumulados"
            value={mano.accumulated}
            onChange={v => { setMano(m => ({ ...m, accumulated: v })); setSaved(false) }}
            prefix=""
          />
        </div>
        <EventsList title="Eventos de La Mano" events={mEvents} players={players} onDelete={i => deleteEvent('mano', i)} />
      </div>

      <div className="border-t border-border/50 pt-4">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">O'yes</p>
        <div className="flex flex-col gap-3">
          <NumberInput
            label="Acumulado"
            value={oyes.accumulated}
            onChange={v => { setOyes(o => ({ ...o, accumulated: v })); setSaved(false) }}
            prefix=""
          />
          <Toggle
            checked={oyes.zapatoTriggered}
            onChange={v => { setOyes(o => ({ ...o, zapatoTriggered: v })); setSaved(false) }}
            label="Zapato activo 👟"
          />
        </div>
        <EventsList title="Eventos de O'yes" events={oEvents} players={players} onDelete={i => deleteEvent('oyes', i)} />
      </div>

      <div className="border-t border-border/50 pt-4">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Drives</p>
        <NumberInput
          label="Monto acumulado"
          value={drives}
          onChange={v => { setDrives(v); setSaved(false) }}
        />
        <EventsList title="Eventos de Drives" events={dEvents} players={players} onDelete={i => deleteEvent('drive', i)} />
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
        <Button onClick={handleSaveState} disabled={saving} className="flex-1">
          {saving ? 'Guardando…' : 'Guardar estado'}
        </Button>
        <SaveFeedback saved={saved} />
      </div>
    </div>
  )
}

// ─── Course Editor ───────────────────────────────────────────────────────────

function SmallNumInput({ value, min, max, onChange }) {
  const [local, setLocal] = useState(String(value ?? ''))
  useEffect(() => { setLocal(String(value ?? '')) }, [value])
  return (
    <input
      type="text"
      inputMode="numeric"
      value={local}
      onChange={e => setLocal(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        const n = Math.min(max, Math.max(min, parseInt(local, 10) || min))
        setLocal(String(n))
        onChange(n)
      }}
      className="bg-bg border border-border rounded-lg px-2 py-1.5 text-white text-center w-14 outline-none text-sm focus:border-gold"
    />
  )
}

function CourseEditor({ holes, code }) {
  const [localHoles, setLocalHoles] = useState(holes.map(h => ({ n: h.n, par: h.par, si: h.si })))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLocalHoles(holes.map(h => ({ n: h.n, par: h.par, si: h.si })))
  }, [holes.length])

  function setField(n, field, val) {
    setLocalHoles(prev => prev.map(h => h.n === n ? { ...h, [field]: val } : h))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const updates = {}
    for (const h of localHoles) {
      updates[`holes/${h.n}/par`] = h.par
      updates[`holes/${h.n}/si`] = h.si
    }
    await updateRoundDeep(code, updates)
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 pb-1 border-b border-border/40">
        <span className="text-gray-500 text-xs font-semibold">Hoyo</span>
        <span className="text-gray-500 text-xs font-semibold text-center">Par</span>
        <span className="text-gray-500 text-xs font-semibold text-center">Ventaja (SI)</span>
      </div>
      {localHoles.map(h => (
        <div key={h.n} className="grid grid-cols-3 items-center gap-2">
          <span className="text-white text-sm font-semibold">H{h.n}</span>
          <div className="flex justify-center">
            <SmallNumInput value={h.par} min={3} max={5} onChange={v => setField(h.n, 'par', v)} />
          </div>
          <div className="flex justify-center">
            <SmallNumInput value={h.si} min={1} max={18} onChange={v => setField(h.n, 'si', v)} />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2 border-t border-border/40">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Guardando…' : 'Guardar campo'}
        </Button>
        <SaveFeedback saved={saved} />
      </div>
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { code } = useParams()
  const nav = useNavigate()
  const { round, loading } = useRound(code)
  const localPlayerId = localStorage.getItem(`hb_player_${code}`)

  if (loading || !round) return <Loading />

  const isCreator = round?.players?.[localPlayerId]?.isCreator
  if (!isCreator) {
    return (
      <div className="flex flex-col min-h-dvh bg-bg items-center justify-center px-6">
        <p className="text-white text-lg font-bold mb-2">Acceso restringido</p>
        <p className="text-gray-400 text-sm text-center mb-6">Solo el administrador de la ronda puede acceder a este panel.</p>
        <button onClick={() => nav(`/round/${code}`)} className="text-gold text-sm">Volver a la ronda</button>
      </div>
    )
  }

  const { players, bets, roundType } = round
  const playerIds = Object.keys(players || {})
  const holes = Object.values(round.holes || {}).sort((a, b) => {
    if (a.playOrder != null) return a.playOrder - b.playOrder
    return a.n - b.n
  })

  return (
    <div className="flex flex-col min-h-dvh bg-bg pb-10">
      {/* Header */}
      <div
        className="sticky top-0 bg-bg border-b border-border px-4 py-4 flex items-center gap-4 z-10"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button onClick={() => nav(`/round/${code}`)} className="text-gray-400 text-sm">← Ronda</button>
        <div className="flex-1 text-center">
          <p className="text-white font-bold">Panel de administración</p>
          <p className="text-gold font-black tracking-widest text-sm">{code}</p>
        </div>
        <div className="w-14" />
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Section 1: Bets config */}
        <AdminSection
          emoji="⚙️"
          title="Configuración de apuestas"
          description="Cambia valores y activa/desactiva apuestas. Los cambios aplican inmediatamente a toda la ronda, incluyendo hoyos ya jugados."
        >
          <BetsEditor initialBets={bets} roundType={roundType} code={code} />
        </AdminSection>

        {/* Section 2: Re-edit holes (always expanded) */}
        <AdminSection
          emoji="✏️"
          title="Re-editar hoyos"
          description="Toca cualquier hoyo para corregir scores, putts o chips. Los hoyos en verde ya tienen scores guardados."
          collapsible={false}
        >
          <HoleList
            holes={holes}
            holesMap={round.holes || {}}
            players={players}
            code={code}
            nav={nav}
          />
        </AdminSection>

        {/* Section 3: Course config */}
        <AdminSection
          emoji="🗺️"
          title="Configuración del campo"
          description="Corrige el par o la ventaja (SI) de cualquier hoyo. Aplica inmediatamente al cálculo de handicaps, unidades y medals."
        >
          <CourseEditor holes={holes} code={code} />
        </AdminSection>

        {/* Section 4: State override */}
        <AdminSection
          emoji="🔧"
          title="Estado del juego"
          description="Override directo cuando la app calcula algo incorrecto: quién tiene la mano, acumulados, estado del Zapato. También puedes eliminar eventos individuales."
        >
          <StateOverride
            round={round}
            players={players}
            playerIds={playerIds}
            code={code}
          />
        </AdminSection>

      </div>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-dvh bg-bg"><p className="text-gray-400">Cargando…</p></div>
}
