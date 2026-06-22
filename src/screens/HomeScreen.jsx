import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { isConfigured, deleteRound } from '../firebase/roundsService'
import { useLanguage } from '../i18n'
import { useAuth } from '../contexts/AuthContext'
import LoginModal from '../components/auth/LoginModal'
import { AVATAR_ICONS } from '../components/profile/avatarIcons'
import { APP_VERSION } from '../version'

export default function HomeScreen() {
  const nav = useNavigate()
  const { lang, setLang, tr } = useLanguage()
  const { user, profile } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [lastRound, setLastRound] = useState(() => localStorage.getItem('hb_last_round'))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteRound() {
    setDeleting(true)
    try {
      await deleteRound(lastRound)
    } catch {}
    localStorage.removeItem('hb_last_round')
    localStorage.removeItem(`hb_player_${lastRound}`)
    setLastRound(null)
    setConfirmDelete(false)
    setDeleting(false)
  }

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
              {(() => {
                const avatarIcon = AVATAR_ICONS.find(a => a.id === profile?.avatarIcon)
                if (avatarIcon) return <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${avatarIcon.bg}`}>{avatarIcon.emoji}</div>
                if (profile?.photoURL) return <img src={profile.photoURL} referrerPolicy="no-referrer" alt="avatar" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                return <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">{profile?.name?.[0]?.toUpperCase() || '?'}</div>
              })()}
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
          <div className="flex items-center gap-2">
            <Button onClick={() => nav(`/round/${lastRound}`)} className="flex-1 text-lg py-5 bg-gold/20 border border-gold text-gold">
              {tr.resumeRound(lastRound)}
            </Button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar ronda"
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border border-border text-gray-400 active:bg-surface"
            >
              🗑️
            </button>
          </div>
        )}
        <Button onClick={() => nav('/create')} className="w-full text-lg py-5" disabled={!isConfigured}>
          {tr.newRound}
        </Button>
        <Button onClick={() => nav('/join')} variant="outline" className="w-full text-lg py-5" disabled={!isConfigured}>
          {tr.joinRound}
        </Button>
      </div>

      <p className="absolute bottom-2 text-gray-600 text-[10px]" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        V{APP_VERSION}
      </p>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={tr.deleteRoundConfirmTitle}>
        <p className="text-gray-300 text-sm mb-5">{tr.deleteRoundConfirmBody}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 py-3 rounded-xl border border-border text-gray-300 font-semibold"
          >
            {tr.cancel}
          </button>
          <button
            onClick={handleDeleteRound}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-60"
          >
            {deleting ? '...' : tr.deleteRoundConfirmBtn}
          </button>
        </div>
      </Modal>
    </div>
  )
}
