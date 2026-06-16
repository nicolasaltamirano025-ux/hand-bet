import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen'
import JoinScreen from './screens/JoinScreen'
import CreateRound from './screens/CreateRound/index'
import GameScreen from './screens/GameScreen'
import ScorecardScreen from './screens/ScorecardScreen'
import BetsScreen from './screens/BetsScreen'
import FinalScreen from './screens/FinalScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                       element={<HomeScreen />} />
        <Route path="/create"                 element={<CreateRound />} />
        <Route path="/join"                   element={<JoinScreen />} />
        <Route path="/round/:code"            element={<GameScreen />} />
        <Route path="/round/:code/scorecard"  element={<ScorecardScreen />} />
        <Route path="/round/:code/bets"       element={<BetsScreen />} />
        <Route path="/round/:code/final"      element={<FinalScreen />} />
        <Route path="*"                       element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
