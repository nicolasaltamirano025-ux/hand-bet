import Button from '../../components/ui/Button'
import { useLanguage } from '../../i18n'

export default function Step2RoundType({ roundType, setRoundType, setStartingHole, next, back }) {
  const { tr } = useLanguage()

  const ROUND_OPTIONS = [
    { id: '18',     label: tr.holes18,  desc: tr.fullRound },
    { id: 'front9', label: tr.front9,   desc: tr.front9only },
    { id: 'back9',  label: tr.back9,    desc: tr.back9only },
  ]

  return (
    <div className="flex flex-col px-5 pt-10 pb-8 gap-6">
      <button onClick={back} className="text-gray-400 text-sm self-start">{tr.backStep}</button>
      <div>
        <h1 className="text-white text-2xl font-black">{tr.roundTypeTitle}</h1>
        <p className="text-gray-400 text-sm mt-1">{tr.step(2, 5)}</p>
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

      <Button onClick={next} className="w-full mt-auto">{tr.continue}</Button>
    </div>
  )
}
