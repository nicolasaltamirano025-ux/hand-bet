import { ref, set, get, update, onValue, off, push, remove } from 'firebase/database'
import { db, isConfigured } from './config'

function guard() {
  if (!db) throw new Error('Firebase no está configurado. Agrega las variables de entorno.')
}

export function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export async function createRound(roundData) {
  guard()
  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const snap = await get(ref(db, `rounds/${code}`))
    if (!snap.exists()) break
    code = generateCode()
    attempts++
  }
  await set(ref(db, `rounds/${code}`), { ...roundData, code })
  return code
}

export async function getRound(code) {
  guard()
  const snap = await get(ref(db, `rounds/${code}`))
  return snap.exists() ? snap.val() : null
}

export function subscribeToRound(code, callback) {
  if (!db) { callback(null); return () => {} }
  const r = ref(db, `rounds/${code}`)
  onValue(r, snap => callback(snap.exists() ? snap.val() : null))
  return () => off(r)
}

export async function deleteRound(code) {
  guard()
  await remove(ref(db, `rounds/${code}`))
}

export async function updateRoundDeep(code, updates) {
  guard()
  await update(ref(db, `rounds/${code}`), updates)
}

export async function setHoleScore(code, holeNum, playerId, scoreData) {
  guard()
  await update(ref(db, `rounds/${code}/holes/${holeNum}/scores/${playerId}`), scoreData)
}

export async function proposePendingScore(code, holeNum, playerId, scoreData) {
  guard()
  await update(ref(db, `rounds/${code}/holes/${holeNum}/pendingScores/${playerId}`), scoreData)
}

export async function acceptPendingScore(code, holeNum, playerId) {
  guard()
  const snap = await get(ref(db, `rounds/${code}/holes/${holeNum}/pendingScores/${playerId}`))
  if (snap.exists()) {
    await update(ref(db, `rounds/${code}/holes/${holeNum}/scores/${playerId}`), snap.val())
    await set(ref(db, `rounds/${code}/holes/${holeNum}/pendingScores/${playerId}`), null)
  }
}

export async function rejectPendingScore(code, holeNum, playerId) {
  guard()
  await set(ref(db, `rounds/${code}/holes/${holeNum}/pendingScores/${playerId}`), null)
}

export async function addReviewMessage(code, holeNum, message) {
  guard()
  const newRef = push(ref(db, `rounds/${code}/holes/${holeNum}/review/messages`))
  await set(newRef, message)
}

export async function updateReviewStatus(code, holeNum, status, resolution) {
  guard()
  await update(ref(db, `rounds/${code}/holes/${holeNum}/review`), { status, resolution: resolution || null })
}

export { isConfigured }
