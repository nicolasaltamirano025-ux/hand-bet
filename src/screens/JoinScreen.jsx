import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRound } from '../firebase/roundsService'
import Button from '../components/ui/Button'

export default function JoinScreen() {
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [round, setRound] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  async function handleSearch() {
    setError('')
    setLoading(true)
    const data = await getRound(code.trim())
    setLoading(false)
    if (!data) return setError('Código no encontrado. Verifica e intenta de nuevo.')
    setRound(data)
  }

  function handleJoin() {
    if (!selectedPlayer) return
    localStorage.setItem(`hb_player_${code}`, selectedPlayer)
    nav(`/round/${code}`)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg px-5 pb-8" style={{ paddingTop: 'max(56px, env(safe-area-inset-top))' }}>
      <button onClick={() => nav('/')} className="text-gray-400 text-sm mb-8">← Regresar</button>
      <h1 className="text-white text-3xl font-black mb-1">Unirse a Ronda</h1>
      <p className="text-gray-400 text-sm mb-8">Ingresa el código de 4 dígitos</p>

      {!round ? (
        <div className="flex flex-col gap-4">
          <input
            type="number"
            inputMode="numeric"
            placeholder="1234"
            maxLength={4}
            value={code}
            onChange={e => setCode(e.target.value.slice(0, 4))}
            className="bg-surface border border-border rounded-xl px-5 py-5 text-white text-4xl font-bold text-center tracking-[0.5em] outline-none focus:border-gold"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <Button onClick={handleSearch} disabled={code.length !== 4 || loading} className="w-full mt-2">
            {loading ? 'Buscando...' : 'Buscar Ronda'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-xl p-4 mb-2">
            <p className="text-gray-400 text-xs mb-1">Campo</p>
            <p className="text-white font-semibold">{round.field?.name}</p>
            <p className="text-gray-400 text-xs mt-2">Jugadores</p>
          </div>
          <p className="text-white font-medium">Selecciona tu nombre:</p>
          <div className="flex flex-col gap-2">
            {Object.entries(round.players || {}).map(([id, p]) => (
              <button
                key={id}
                onClick={() => setSelectedPlayer(id)}
                className={`px-5 py-4 rounded-xl border text-left font-semibold text-base transition-colors ${selectedPlayer === id ? 'border-gold bg-gold/10 text-gold' : 'border-border bg-surface text-white'}`}
              >
                {p.name}
                <span className="text-gray-400 font-normal text-sm ml-2">HCP {p.handicap}</span>
              </button>
            ))}
          </div>
          {selectedPlayer && (
            <Button onClick={handleJoin} className="w-full mt-2">
              Entrar como {round.players[selectedPlayer]?.name}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
