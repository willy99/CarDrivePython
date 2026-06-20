import { useParams, useNavigate } from 'react-router-dom'
import GameFrame from '../components/GameFrame'

// Maps a game id → the static path of its pygbag build.
// NOTE: must point at the explicit index.html, NOT the directory.
// A trailing-slash directory URL gets caught by Vite's SPA fallback and
// serves the React app instead of the static game → blank iframe.
const GAME_PATHS = {
  cardrive: '/games/cardrive/index.html',
  hanoi:    '/games/hanoi/index.html',
  memorize: '/games/memorize/index.html',
  engineer: '/games/engineer/index.html',
  miner:    '/games/miner/index.html',
}

export default function GamePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const src = GAME_PATHS[id]

  if (!src) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">Game not found</h1>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500"
        >
          ← Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <GameFrame src={src} />

      {/* Floating "back" button overlaid on the game */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 px-4 py-2 bg-black/60 text-white rounded-lg
                   border border-white/20 backdrop-blur hover:bg-black/80 transition"
      >
        ← Back
      </button>
    </div>
  )
}
