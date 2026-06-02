/**
 * Full-viewport iframe that hosts a pygbag game.
 *
 * Props:
 *   src – path to the game's index.html, e.g. '/games/cardrive/'
 */
export default function GameFrame({ src }) {
  return (
    <iframe
      src={src}
      title="Game"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
        display: 'block',
        background: '#000',
      }}
      allow="autoplay"
    />
  )
}
