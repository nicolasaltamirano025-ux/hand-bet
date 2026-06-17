import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from './config'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  if (!auth) throw new Error('Auth no configurado')
  return signInWithPopup(auth, provider)
}

export async function signOutUser() {
  if (!auth) return
  return signOut(auth)
}
