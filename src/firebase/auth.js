import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth'
import { auth } from './config'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  if (!auth) throw new Error('Auth no configurado')
  await signInWithRedirect(auth, provider)
}

export { getRedirectResult }

export async function signOutUser() {
  if (!auth) return
  return signOut(auth)
}
