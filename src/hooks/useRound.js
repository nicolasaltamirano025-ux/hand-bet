import { useState, useEffect, useCallback } from 'react'
import { subscribeToRound, updateRoundDeep, setHoleScore as fbSetHoleScore } from '../firebase/roundsService'

export function useRound(code) {
  const [round, setRound] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return
    const unsub = subscribeToRound(code, data => {
      setRound(data)
      setLoading(false)
    })
    return unsub
  }, [code])

  const updatePath = useCallback(async (updates) => {
    if (!code) return
    await updateRoundDeep(code, updates)
  }, [code])

  const setHoleScore = useCallback(async (holeNum, playerId, scoreData) => {
    if (!code) return
    await fbSetHoleScore(code, holeNum, playerId, scoreData)
  }, [code])

  return { round, loading, updatePath, setHoleScore }
}

export function usePlayer(round, localPlayerId) {
  if (!round || !localPlayerId) return { player: null, isCreator: false }
  const player = round.players?.[localPlayerId]
  const isCreator = player?.isCreator === true
  return { player, isCreator }
}
