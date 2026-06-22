import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOutUser } from '../firebase/auth'
import { saveUserProfile, subscribeUserRounds, removeUserRound, uploadProfilePhoto } from '../firebase/userService'
import { deleteRound } from '../firebase/roundsService'
import Modal from '../components/ui/Modal'
import AvatarPicker from '../components/profile/AvatarPicker'
import { AVATAR_ICONS } from '../components/profile/avatarIcons'

export default function ProfileScreen() {
  const nav = useNavigate()
  const { user, profile, setProfile } = useAuth()
  const [rounds, setRounds] = useState({})
  const [editingHcp, setEditingHcp] = useState(false)
  const [hcp, setHcp] = useState(18)
  const [editingGhin, setEditingGhin] = useState(false)
  const [ghin, setGhin] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (profile) {
      setHcp(profile.defaultHandicap ?? 18)
      setGhin(profile.ghin || '')
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    return subscribeUserRounds(user.uid, setRounds)
  }, [user])

  if (!user) {
    nav('/')
    return null
  }

  const allRounds = Object.entries(rounds).map(([code, r]) => ({ code, ...r }))
  const activeRounds    = allRounds.filter(r => r.status === 'active').sort((a, b) => b.ts - a.ts)
  const completedRounds = allRounds.filter(r => r.status !== 'active').sort((a, b) => b.ts - a.ts)

  const totalNet = completedRounds.reduce((s, r) => s + (r.totalNet || 0), 0)
  const won  = completedRounds.filter(r => r.totalNet > 0).length
  const lost = completedRounds.filter(r => r.totalNet < 0).length

  async function saveHcp() {
    setSaving(true)
    await saveUserProfile(user.uid, { defaultHandicap: Number(hcp) })
    setProfile(p => ({ ...p, defaultHandicap: Number(hcp) }))
    setSaving(false)
    setEditingHcp(false)
  }

  async function saveGhin() {
    setSaving(true)
    await saveUserProfile(user.uid, { ghin: ghin.trim() })
    setProfile(p => ({ ...p, ghin: ghin.trim() }))
    setSaving(false)
    setEditingGhin(false)
  }

  async function handleSignOut() {
    await signOutUser()
    nav('/')
  }

  async function handleDeleteActiveRound() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteRound(deleteTarget) } catch {}
    await removeUserRound(user.uid, deleteTarget)
    if (localStorage.getItem('hb_last_round') === deleteTarget) {
      localStorage.removeItem('hb_last_round')
    }
    localStorage.removeItem(`hb_player_${deleteTarget}`)
    setDeleting(false)
    setDeleteTarget(null)
  }

  const avatarIcon = AVATAR_ICONS.find(a => a.id === profile?.avatarIcon)

  return (
    <div className="flex flex-col min-h-dvh bg-bg pb-10">
      <div
        className="sticky top-0 bg-bg border-b border-border px-4 py-4 flex items-center gap-4 z-10"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button onClick={() => nav('/')} className="text-gray-400 text-sm">← Inicio</button>
        <h2 className="text-white font-bold text-lg flex-1 text-center">Mi Perfil</h2>
        <button onClick={handleSignOut} className="text-red-400 text-sm font-semibold">Salir</button>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center gap-3 px-4 py-8">
        <button onClick={() => setShowAvatarPicker(true)} className="relative">
          {avatarIcon
            ? <div className={`w-20 h-20 rounded-full border-2 border-gold flex items-center justify-center text-4xl ${avatarIcon.bg}`}>
                {avatarIcon.emoji}
              </div>
            : profile?.photoURL
              ? <img src={profile.photoURL} referrerPolicy="no-referrer" alt="avatar" className="w-20 h-20 rounded-full border-2 border-gold object-cover" />
              : <div className="w-20 h-20 rounded-full bg-surface border-2 border-gold flex items-center justify-center text-3xl text-gold font-bold">
                  {profile?.name?.[0]?.toUpperCase() || '?'}
                </div>
          }
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold flex items-center justify-center text-bg text-sm border-2 border-bg">
            ✎
          </div>
        </button>
        <p className="text-white text-xl font-bold">{profile?.name}</p>
        <p className="text-gray-400 text-sm">{profile?.email}</p>
      </div>

      {/* Default HCP */}
      <div className="px-4 mb-6">
        <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Handicap por defecto</p>
            {editingHcp
              ? <input
                  type="number"
                  value={hcp}
                  onChange={e => setHcp(e.target.value)}
                  className="bg-bg border border-gold rounded-lg px-3 py-1 text-white text-xl font-bold w-20 outline-none"
                  min={0} max={54}
                />
              : <p className="text-white text-2xl font-black">{profile?.defaultHandicap ?? 18}</p>
            }
          </div>
          {editingHcp
            ? <button
                onClick={saveHcp}
                disabled={saving}
                className="bg-gold text-bg rounded-lg px-4 py-2 font-bold text-sm disabled:opacity-60"
              >{saving ? '...' : 'Guardar'}</button>
            : <button
                onClick={() => setEditingHcp(true)}
                className="text-gold text-sm font-semibold border border-gold/40 rounded-lg px-4 py-2"
              >Editar</button>
          }
        </div>
      </div>

      {/* GHIN */}
      <div className="px-4 mb-6">
        <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Número GHIN</p>
            {editingGhin
              ? <input
                  type="text"
                  value={ghin}
                  onChange={e => setGhin(e.target.value)}
                  placeholder="Ej. 1234567"
                  className="bg-bg border border-gold rounded-lg px-3 py-1 text-white text-lg font-bold w-32 outline-none"
                />
              : <p className="text-white text-lg font-black">{profile?.ghin || '—'}</p>
            }
          </div>
          {editingGhin
            ? <button
                onClick={saveGhin}
                disabled={saving}
                className="bg-gold text-bg rounded-lg px-4 py-2 font-bold text-sm disabled:opacity-60"
              >{saving ? '...' : 'Guardar'}</button>
            : <button
                onClick={() => setEditingGhin(true)}
                className="text-gold text-sm font-semibold border border-gold/40 rounded-lg px-4 py-2"
              >Editar</button>
          }
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Estadísticas</p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatCard label="Rondas" value={completedRounds.length} />
          <StatCard label="Ganadas" value={won} color="text-green-400" />
          <StatCard label="Perdidas" value={lost} color="text-red-400" />
        </div>
        <div className="bg-surface border border-border rounded-xl px-4 py-3 flex justify-between items-center">
          <p className="text-gray-400 text-sm">Balance total</p>
          <p className={`text-xl font-black ${totalNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalNet >= 0 ? '+' : '-'}${Math.abs(totalNet).toLocaleString('es-MX')}
          </p>
        </div>
      </div>

      {/* Active rounds */}
      {activeRounds.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">En progreso</p>
          <div className="flex flex-col gap-2">
            {activeRounds.map(r => (
              <div
                key={r.code}
                className="bg-surface border border-gold/40 rounded-xl px-4 py-3 flex items-center gap-2"
              >
                <button
                  onClick={() => nav(`/round/${r.code}`)}
                  className="flex-1 text-left active:opacity-70 transition-opacity"
                >
                  <p className="text-white font-semibold text-sm">{r.field || 'Ronda'}</p>
                  <p className="text-gray-500 text-xs mt-0.5">#{r.code}</p>
                </button>
                <button
                  onClick={() => setDeleteTarget(r.code)}
                  aria-label="Eliminar ronda"
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 active:bg-border"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round history */}
      {completedRounds.length > 0 && (
        <div className="px-4">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">Historial</p>
          <div className="flex flex-col gap-2">
            {completedRounds.map(r => (
              <button
                key={r.code}
                onClick={() => nav(`/round/${r.code}/final`)}
                className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between text-left active:scale-98 transition-transform"
              >
                <div>
                  <p className="text-white font-semibold text-sm">{r.field || 'Ronda'}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {new Date(r.ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}#{r.code}
                  </p>
                </div>
                <p className={`font-black text-lg ${r.totalNet > 0 ? 'text-green-400' : r.totalNet < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {r.totalNet > 0 ? '+' : r.totalNet < 0 ? '-' : ''}${Math.abs(r.totalNet || 0).toLocaleString('es-MX')}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeRounds.length === 0 && completedRounds.length === 0 && (
        <div className="px-4 text-center text-gray-500 py-8">
          <p className="text-4xl mb-3">⛳</p>
          <p className="text-sm">Tus rondas aparecerán aquí</p>
        </div>
      )}

      {showAvatarPicker && (
        <AvatarPicker
          current={profile?.avatarIcon}
          onSelect={async (iconId) => {
            await saveUserProfile(user.uid, { avatarIcon: iconId })
            setProfile(p => ({ ...p, avatarIcon: iconId }))
            setShowAvatarPicker(false)
          }}
          onUploadPhoto={async (file) => {
            const photoURL = await uploadProfilePhoto(user.uid, file)
            await saveUserProfile(user.uid, { photoURL, avatarIcon: null })
            setProfile(p => ({ ...p, photoURL, avatarIcon: null }))
            setShowAvatarPicker(false)
          }}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="¿Eliminar ronda?">
        <p className="text-gray-300 text-sm mb-5">Esta ronda sin completar se borrará para todos los jugadores. No se puede deshacer.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 py-3 rounded-xl border border-border text-gray-300 font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteActiveRound}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-60"
          >
            {deleting ? '...' : 'Eliminar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-3 text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  )
}
