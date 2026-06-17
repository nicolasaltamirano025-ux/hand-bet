import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { isConfigured } from '../firebase/roundsService'
import { useLanguage } from '../i18n'

export default function HomeScreen() {
  const nav = useNavigate()
  const { lang, setLang, tr } = useLanguage()
  const lastRound = localStorage.getItem('hb_last_round')

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg px-6 gap-8 relative" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <button
        onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
        className="absolute top-4 right-4 text-gray-400 text-xs border border-border rounded-full px-3 py-1.5 font-semibold tracking-wide"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        {lang === 'es' ? 'EN' : 'ES'}
      </button>

      <div className="flex flex-col items-center gap-2">
        <img src="/hand-bet.png" alt="Hand Bet" className="w-36 h-36 rounded-2xl shadow-2xl" />
        <p className="text-gray-400 text-sm tracking-widest uppercase">Golf Betting App</p>
      </div>

      {!isConfigured && (
        <div className="w-full max-w-xs bg-yellow-900/40 border border-yellow-700 rounded-xl p-4 text-center">
          <p className="text-yellow-300 font-bold text-sm mb-1">{tr.firebaseNotConfigured}</p>
          <p className="text-yellow-200/70 text-xs leading-relaxed">{tr.firebaseNotConfiguredDesc}</p>
        </div>
      )}

      <div className="flex flex-col w-full max-w-xs gap-3">
        {lastRound && isConfigured && (
          <Button onClick={() => nav(`/round/${lastRound}`)} className="w-full text-lg py-5 bg-gold/20 border border-gold text-gold">
            {tr.resumeRound(lastRound)}
          </Button>
        )}
        <Button onClick={() => nav('/create')} className="w-full text-lg py-5" disabled={!isConfigured}>
          {tr.newRound}
        </Button>
        <Button onClick={() => nav('/join')} variant="outline" className="w-full text-lg py-5" disabled={!isConfigured}>
          {tr.joinRound}
        </Button>
      </div>
    </div>
  )
}
