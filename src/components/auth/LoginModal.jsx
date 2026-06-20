import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '../../firebase/config'
import { saveUserProfile } from '../../firebase/userService'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export default function LoginModal({ onClose }) {
  const [tab, setTab]         = useState('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleEmail(e) {
    e.preventDefault()
    if (!email || !password || (tab === 'register' && !name)) return
    setError('')
    setLoading(true)
    try {
      if (tab === 'register') {
        const { user } = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(user, { displayName: name })
        await saveUserProfile(user.uid, {
          name, email, photoURL: '', defaultHandicap: 18, createdAt: Date.now(),
        })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onClose()
    } catch (err) {
      setError(errMsg(err.code))
    }
    setLoading(false)
  }

  // Llamado sincrónicamente desde onClick para que Safari no bloquee el popup
  function handleGoogle() {
    if (!auth) { setError('Firebase no está configurado'); return }
    setError('')
    signInWithPopup(auth, googleProvider)
      .then(() => onClose())
      .catch(err => setError(`${err.code}: ${err.message}`))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-bg border-t border-border rounded-t-2xl px-5 pt-4 animate-slide-up"
        style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="flex gap-1 bg-surface rounded-xl p-1 mb-5">
          {[['login', 'Iniciar sesión'], ['register', 'Crear cuenta']].map(([t, label]) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-gold text-bg' : 'text-gray-400'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          {tab === 'register' && (
            <input
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-surface border border-border rounded-xl px-4 py-3.5 text-white outline-none focus:border-gold"
              autoComplete="name"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-surface border border-border rounded-xl px-4 py-3.5 text-white outline-none focus:border-gold"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-surface border border-border rounded-xl px-4 py-3.5 text-white outline-none focus:border-gold"
            autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-gold text-bg rounded-xl py-4 font-bold text-base disabled:opacity-60 mt-1"
          >
            {loading ? '...' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-gray-500 text-xs">o</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-surface border border-border rounded-xl py-4 text-white font-semibold active:bg-border transition-colors"
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 text-gray-500 text-sm"
        >
          Continuar como invitado
        </button>
      </div>
    </div>
  )
}

function errMsg(code) {
  const map = {
    'auth/email-already-in-use':  'Este email ya tiene cuenta',
    'auth/wrong-password':        'Contraseña incorrecta',
    'auth/invalid-credential':    'Email o contraseña incorrectos',
    'auth/user-not-found':        'No existe cuenta con ese email',
    'auth/weak-password':         'Mínimo 6 caracteres',
    'auth/invalid-email':         'Email inválido',
    'auth/popup-blocked':               'El browser bloqueó la ventana — usa email',
    'auth/popup-closed-by-user':        'Cerraste la ventana de Google',
    'auth/cancelled-popup-request':     'La ventana fue cancelada',
    'auth/operation-not-allowed':       'Google no está habilitado en Firebase',
    'auth/unauthorized-domain':         'Dominio no autorizado en Firebase',
    'auth/network-request-failed':      'Sin conexión a internet',
  }
  return map[code] || `Error (${code})`
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
