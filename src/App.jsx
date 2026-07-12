import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './i18n'
import { AuthProvider } from './contexts/AuthContext'
import HomeScreen from './screens/HomeScreen'
import JoinScreen from './screens/JoinScreen'
import CreateRound from './screens/CreateRound/index'
import GameScreen from './screens/GameScreen'
import ScorecardScreen from './screens/ScorecardScreen'
import BetsScreen from './screens/BetsScreen'
import FinalScreen from './screens/FinalScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen from './screens/AdminScreen'

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/"                       element={<HomeScreen />} />
        <Route path="/create"                 element={<CreateRound />} />
        <Route path="/join"                   element={<JoinScreen />} />
        <Route path="/round/:code"            element={<GameScreen />} />
        <Route path="/round/:code/scorecard"  element={<ScorecardScreen />} />
        <Route path="/round/:code/bets"       element={<BetsScreen />} />
        <Route path="/round/:code/final"      element={<FinalScreen />} />
        <Route path="/round/:code/admin"      element={<AdminScreen />} />
        <Route path="/profile"               element={<ProfileScreen />} />
        <Route path="*"                       element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  )
}
