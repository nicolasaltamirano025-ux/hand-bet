import { signOut } from 'firebase/auth'
import { auth } from './config'

export async function signOutUser() {
  if (!auth) return
  return signOut(auth)
}
