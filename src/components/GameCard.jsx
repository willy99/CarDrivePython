import { useNavigate } from 'react-router-dom'

/**
 * A clickable box-style card that launches a game.
 *
 * Props:
 *   id          – used in the URL  /play/:id
 *   title       – display name
 *   description – one-liner shown under the title
 *   emoji       – large icon (no image file needed yet)
 *   color       – tailwind bg colour class, e.g. 'bg-blue-600'
 *   available   – if false, shows a "Coming soon" badge instead of being clickable
 *   landing     – optional URL to a static "how to play / about" page
 */
export default function GameCard({
  id,
  title,
  description,
  emoji = '🎮',
  color = 'bg-blue-600',
  available = true,
  landing,
}) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => available && navigate(`/play/${id}`)}
        disabled={!available}
        className={[
          'group relative flex flex-col items-center justify-center',
          'w-52 h-52 rounded-2xl border-2 border-white/20',
          'shadow-lg transition-all duration-200',
          color,
          available
            ? 'cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-white/50'
            : 'cursor-not-allowed opacity-50',
        ].join(' ')}
      >
        {/* Glow ring on hover */}
        {available && (
          <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-200" />
        )}

        <span className="text-6xl mb-3 select-none">{emoji}</span>
        <span className="text-white text-xl font-bold tracking-wide">{title}</span>
        <span className="text-white/70 text-sm mt-1 px-4 text-center leading-tight">
          {description}
        </span>

        {!available && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
            Soon
          </span>
        )}
      </button>

      {/* "How it works" link to the static landing / instructions page */}
      {available && landing && (
        <a
          href={landing}
          className="mt-3 text-sm text-white/50 hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white/60 transition-colors"
        >
          ℹ How to play
        </a>
      )}
    </div>
  )
}
