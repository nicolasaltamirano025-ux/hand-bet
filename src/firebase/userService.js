import { ref, set, get, update, onValue, off } from 'firebase/database'
import { db } from './config'

export async function getUserProfile(uid) {
  if (!db) return null
  const snap = await get(ref(db, `users/${uid}`))
  return snap.exists() ? snap.val() : null
}

export async function saveUserProfile(uid, data) {
  if (!db) return
  await update(ref(db, `users/${uid}`), data)
}

export async function recordRoundResult(uid, code, data) {
  if (!db) return
  await set(ref(db, `userRounds/${uid}/${code}`), { ...data, ts: Date.now() })
}

export function subscribeUserRounds(uid, callback) {
  if (!db) { callback({}); return () => {} }
  const r = ref(db, `userRounds/${uid}`)
  onValue(r, snap => callback(snap.val() || {}))
  return () => off(r)
}
