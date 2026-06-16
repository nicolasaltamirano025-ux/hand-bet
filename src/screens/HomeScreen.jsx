import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { isConfigured } from '../firebase/roundsService'

export default function HomeScreen() {
  const nav = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg px-6 gap-8" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex flex-col items-center gap-2">
        <img src="/hand-bet.png" alt="Hand Bet" className="w-36 h-36 rounded-2xl shadow-2xl" />
        <p className="text-gray-400 text-sm tracking-widest uppercase">Golf Betting App</p>
      </div>

      {!isConfigured && (
        <div className="w-full max-w-xs bg-yellow-900/40 border border-yellow-700 rounded-xl p-4 text-center">
          <p className="text-yellow-300 font-bold text-sm mb-1">⚙️ Firebase no configurado</p>
          <p className="text-yellow-200/70 text-xs leading-relaxed">
            Copia <code className="bg-black/30 px-1 rounded">.env.example</code> a <code className="bg-black/30 px-1 rounded">.env</code> y llena tus credenciales de Firebase para activar la app.
          </p>
        </div>
      )}

      <div className="flex flex-col w-full max-w-xs gap-3">
        <Button onClick={() => nav('/create')} className="w-full text-lg py-5" disabled={!isConfigured}>
          🏌️ Nueva Ronda
        </Button>
        <Button onClick={() => nav('/join')} variant="outline" className="w-full text-lg py-5" disabled={!isConfigured}>
          🚪 Unirse a Ronda
        </Button>
      </div>
    </div>
  )
}
