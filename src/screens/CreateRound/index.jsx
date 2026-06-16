import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRound } from '../../firebase/roundsService'
import { UNIT_DEFAULTS } from '../../utils/gameLogic'
import Step1Field from './Step1Field'
import Step2RoundType from './Step2RoundType'
import Step3Players from './Step3Players'
import Step4Bets from './Step4Bets'
import Step5Review from './Step5Review'

const TOTAL_STEPS = 5

export default function CreateRound() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [field, setField] = useState(null)
  const [roundType, setRoundType] = useState('18')
  const [startingHole, setStartingHole] = useState(1)
  const [players, setPlayers] = useState([{ name: '', handicap: 18 }])
  const [bets, setBets] = useState({
    mano:   { enabled: true, valuePerHole: 30 },
    oyes:   { enabled: true, value: 30 },
    medals: { enabled: true, frontValue: 30, backValue: 30, totalValue: 30 },
    drives: { enabled: true, value: 10 },
    putts:  { enabled: true, valuePerPutt: 3 },
    units:  { enabled: true, baseValue: 30, ...UNIT_DEFAULTS },
  })

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function back() { setStep(s => Math.max(s - 1, 1)) }

  async function handleCreate() {
    setSaving(true)
    const playerMap = {}
    players.forEach((p, i) => {
      const id = `p${i + 1}`
      playerMap[id] = { id, name: p.name, handicap: Number(p.handicap), isCreator: i === 0 }
    })

    const fieldHoles = field.holes || []
    const activeHoles =
      roundType === 'front9' ? fieldHoles.filter(h => h.n <= 9) :
      roundType === 'back9'  ? fieldHoles.filter(h => h.n >= 10) :
      fieldHoles

    const orderedHoles = orderHolesByStart(activeHoles, startingHole)

    const holesTemplate = {}
    orderedHoles.forEach((h, idx) => {
      // Resolve SI based on starting hole (El Campanario has si10 for back-first play)
      const si = startingHole === 10 && h.si10 != null ? h.si10 : h.si
      holesTemplate[h.n] = {
        n: h.n,
        par: h.par,
        si,
        playOrder: idx + 1,
        scores: {},
        reviews: {},
      }
    })

    const roundData = {
      createdAt: Date.now(),
      creatorId: 'p1',
      status: 'active',
      field: { id: field.id, name: field.name, holes: fieldHoles },
      roundType,
      startingHole,
      players: playerMap,
      bets,
      holes: holesTemplate,
      manoState: { holderId: null, isOpen: false, accumulated: 0 },
      manoEvents: [],
      oyesState: { accumulated: 0, wonSequentially: [], zapatoTriggered: false },
      oyesEvents: [],
      driveEvents: [],
      drivesAccumulated: 0,
    }

    const code = await createRound(roundData)
    localStorage.setItem(`hb_player_${code}`, 'p1')
    setSaving(false)
    nav(`/round/${code}?new=1`)
  }

  const stepProps = {
    field, setField,
    roundType, setRoundType,
    startingHole, setStartingHole,
    players, setPlayers,
    bets, setBets,
    next, back, handleCreate, saving,
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      <div className="h-1 bg-border" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <div className="h-full bg-gold transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {step === 1 && <Step1Field {...stepProps} />}
        {step === 2 && <Step2RoundType {...stepProps} />}
        {step === 3 && <Step3Players {...stepProps} />}
        {step === 4 && <Step4Bets {...stepProps} />}
        {step === 5 && <Step5Review {...stepProps} />}
      </div>
    </div>
  )
}

function orderHolesByStart(holes, startingHole) {
  if (startingHole === 1) return [...holes].sort((a, b) => a.n - b.n)
  const back  = holes.filter(h => h.n >= 10).sort((a, b) => a.n - b.n)
  const front = holes.filter(h => h.n < 10).sort((a, b) => a.n - b.n)
  return [...back, ...front]
}
