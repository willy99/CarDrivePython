import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Enable cross-origin isolation site-wide so pygbag's WebAssembly runtime
 * can use SharedArrayBuffer.
 *
 * Why GLOBAL (not just /games/*):
 *   For an iframe to be cross-origin isolated, BOTH the top-level document
 *   (the React route, e.g. /play/cardrive) AND the iframe document
 *   (/games/cardrive/) must carry these headers.  Scoping them to /games/*
 *   only isolated the iframe but not its parent → isolation chain broken →
 *   the game hangs on a black screen.
 *
 *   COEP 'credentialless' (not 'require-corp') lets the pygbag CDN's
 *   cross-origin WASM/data files load via their CORS (access-control-allow-
 *   origin: *) headers WITHOUT requiring a CORP header the CDN doesn't send.
 *
 *   The React app's own assets are same-origin, so global COEP is harmless
 *   for them.
 */
function isolationHeaders() {
  const apply = (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy',   'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
  }
  return {
    name: 'cross-origin-isolation-headers',
    configureServer(server)        { server.middlewares.use(apply) },
    configurePreviewServer(server) { server.middlewares.use(apply) },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), isolationHeaders()],
})
