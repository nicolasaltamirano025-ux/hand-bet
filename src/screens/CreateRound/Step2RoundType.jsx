import Button from '../../components/ui/Button'

const ROUND_OPTIONS = [
  { id: '18',     label: '18 Hoyos', desc: 'Ronda completa' },
  { id: 'front9', label: 'Front 9',  desc: 'Solo hoyos 1–9' },
  { id: 'back9',  label: 'Back 9',   desc: 'Solo hoyos 10–18' },
]

export default function Step2RoundType({ roundType, setRoundType, setStartingHole, next, back }) {
  return (
    <div className="flex flex-col px-5 pt-10 pb-8 gap-6">
      <button onClick={back} className="text-gray-400 text-sm self-start">← Atrás</button>
      <div>
        <h1 className="text-white text-2xl font-black">Tipo de Ronda</h1>
        <p className="text-gray-400 text-sm mt-1">Paso 2 de 5</p>
      </div>

      <div className="flex flex-col gap-3">
        {ROUND_OPTIONS.map(o => (
          <button
            key={o.id}
            onClick={() => {
              setRoundType(o.id)
              if (o.id === 'front9') setStartingHole(1)
              if (o.id === 'back9')  setStartingHole(10)
            }}
            className={`rounded-xl border px-5 py-5 text-left transition-colors ${roundType === o.id ? 'border-gold bg-gold/10' : 'border-border bg-surface'}`}
          >
            <p className={`font-bold text-lg ${roundType === o.id ? 'text-gold' : 'text-white'}`}>{o.label}</p>
            <p className="text-gray-400 text-sm">{o.desc}</p>
          </button>
        ))}
      </div>

      <Button onClick={next} className="w-full mt-auto">Continuar →</Button>
    </div>
  )
}
