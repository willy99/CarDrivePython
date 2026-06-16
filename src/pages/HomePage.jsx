import GameCard from '../components/GameCard'

// ─── Game registry ───────────────────────────────────────────────────────────
// Add new games here.  Each entry becomes one card on the home screen.
const GAMES = [
  {
    id:          'cardrive',
    title:       'CarDrive',
    description: '15 levels: racing, taxi fares, night, rain & fuel',
    emoji:       '🏎️',
    color:       'bg-blue-700',
    available:   true,
    landing:     '/games/cardrive/landing.html',
  },
  {
    id:          'hanoi',
    title:       'Tower of Hanoi',
    description: '8 levels: from tutorial to Legend with countdown timers',
    emoji:       '🗼',
    color:       'bg-purple-700',
    available:   true,
    landing:     '/games/hanoi/landing.html',
  },
  {
    id:          'memorize',
    title:       'MemBrain',
    description: 'Word recall, object spotting, math drills & multiplayer pairs battle',
    emoji:       '🧠',
    color:       'bg-violet-700',
    available:   true,
    landing:     '/games/memorize/landing.html',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center">

      {/* Header */}
      <header className="w-full max-w-4xl px-6 pt-16 pb-10 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight mb-3">
          🕹️ <span className="text-blue-400">Pashka</span> Games
        </h1>
        <p className="text-gray-400 text-lg">
          Pick a game and start playing
        </p>
      </header>

      {/* Game cards grid */}
      <main className="flex flex-wrap justify-center gap-8 px-6 pb-20">
        {GAMES.map(game => (
          <GameCard key={game.id} {...game} />
        ))}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-gray-600 text-sm">
        Built with Python + Pygame + React
      </footer>
    </div>
  )
}
