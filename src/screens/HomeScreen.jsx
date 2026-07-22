import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { isConfigured } from '../firebase/roundsService'
import { useLanguage } from '../i18n'
import { useAuth } from '../contexts/AuthContext'
import LoginModal from '../components/auth/LoginModal'

export default function HomeScreen() {
  const nav = useNavigate()
  const { lang, setLang, tr } = useLanguage()
  const { user, profile } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
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

      {/* Auth — solo renderiza cuando Firebase resolvió */}
      {user !== undefined && (
        user
          ? <button
              onClick={() => nav('/profile')}
              className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 w-full max-w-xs"
            >
              {profile?.photoURL
                ? <img src={profile.photoURL} referrerPolicy="no-referrer" alt="avatar" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                : <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                    {profile?.name?.[0]?.toUpperCase() || '?'}
                  </div>
              }
              <div className="text-left flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{profile?.name}</p>
                <p className="text-gray-400 text-xs">Ver perfil e historial</p>
              </div>
              <span className="text-gray-600 text-lg">›</span>
            </button>
          : <button
              onClick={() => setShowLogin(true)}
              className="text-gray-400 text-sm py-2 underline underline-offset-4"
            >
              Iniciar sesión / Crear cuenta
            </button>
      )}

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

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <p className="absolute bottom-3 text-gray-600 text-xs" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>V1.7</p>
    </div>
  )
}
