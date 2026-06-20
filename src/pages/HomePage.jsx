import { useState, useEffect } from 'react'
import GameCard from '../components/GameCard'

const TRANSLATIONS = {
  en: {
    title: 'Pashka Games',
    subtitle: 'Pick a game and start playing',
    cardrive: { title: 'CarDrive', description: 'Driving along the streets, taxi mode, at night, in a rain, with limited fuel. (PC only version)' },
    hanoi: { title: 'Tower of Hanoi', description: '8 levels: from tutorial to Legend with countdown timers. (PC only version)' },
    memorize: { title: 'MemBrain', description: 'Word recall, object spotting, math drills & multiplayer pairs battle. (PC/Mobile versions)' },
    engineer: { title: 'Engineer', description: 'Build bridges from beams and cables, then send a truck across. Physics sandbox — will it hold?' },
    footer: 'Built with Python + Pygame + React',
    langBtn: '🇺🇦 UA',
  },
  uk: {
    title: 'Pashka Games',
    subtitle: 'Виберіть, що торкається серця й тицяйте кніпочку',
    cardrive: { title: 'Угнати за 30', description: 'Водіння в лабіринтах, режим таксі, в ніч, в дощ, обмеженим паливом та з погонями. (версія тільки для ПК)' },
    hanoi: { title: 'Ханойська Вежа', description: '8 рівнів: від навчання до Легенди з таймерами зворотного відліку. (версія тільки для ПК)' },
    memorize: { title: 'Ботанік', description: 'Тут можна скинути іржопхану з мозку з математичними та іншими вправами. (версії для ПК/мобільних)' },
    engineer: { title: 'Інженер', description: 'Будуй мости з балок і тросів, пускай вантажівку — фізичний пісочниця. Чи витримає?' },
    footer: 'Створено на Python + Pygame + React',
    langBtn: '🇬🇧 EN',
  },
}

// ─── Game registry ───────────────────────────────────────────────────────────
// Add new games here.  Each entry becomes one card on the home screen.
const GAME_IDS = ['cardrive', 'hanoi', 'memorize', 'engineer']

export default function HomePage() {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    const saved = localStorage.getItem('pashka-lang') || 'en'
    setLang(saved)
  }, [])

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'uk' : 'en'
    setLang(newLang)
    localStorage.setItem('pashka-lang', newLang)
  }

  const t = TRANSLATIONS[lang]

  const GAMES = [
    { id: 'cardrive', emoji: '🏎️', color: 'bg-blue-700', available: true, landing: '/games/cardrive/landing.html', ...t.cardrive },
    { id: 'hanoi', emoji: '🗼', color: 'bg-purple-700', available: true, landing: '/games/hanoi/landing.html', ...t.hanoi },
    { id: 'memorize', emoji: '🧠', color: 'bg-violet-700', available: true, landing: '/games/memorize/landing.html', ...t.memorize },
    // { id: 'engineer', emoji: '🌉', color: 'bg-orange-700', available: true, landing: '/games/engineer/index.html', ...t.engineer },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center">

      {/* Header */}
      <header className="relative w-full pt-16 pb-10 text-center">
        <button
          onClick={toggleLang}
          className="absolute top-6 right-6 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-bold transition-colors"
        >
          {t.langBtn}
        </button>
        <h1 className="text-5xl font-extrabold tracking-tight">
          🕹️ <span className="text-blue-400">Pashka</span> Games
        </h1>
        <p className="text-gray-400 text-lg mt-4">
          {t.subtitle}
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
        {t.footer}
      </footer>
    </div>
  )
}
