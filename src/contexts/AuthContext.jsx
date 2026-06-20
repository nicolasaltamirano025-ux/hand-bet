import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getUserProfile, saveUserProfile } from '../firebase/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = cargando, null = no autenticado, object = autenticado
  const [user, setUser]       = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!auth) { setUser(null); return }

    // Handle post-redirect Google sign-in result
    getRedirectResult(auth).catch(() => {})

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        let prof = await getUserProfile(firebaseUser.uid)
        if (!prof) {
          prof = {
            name:             firebaseUser.displayName || '',
            email:            firebaseUser.email       || '',
            photoURL:         firebaseUser.photoURL    || '',
            defaultHandicap:  18,
            createdAt:        Date.now(),
          }
          await saveUserProfile(firebaseUser.uid, prof)
        }
        setProfile(prof)
      } else {
        setUser(null)
        setProfile(null)
      }
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
