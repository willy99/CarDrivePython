import { GameServer } from './GameServer.js';
export { GameServer };

// COOP/COEP headers required for pygbag WebAssembly (SharedArrayBuffer)
const ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy':   'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // WebSocket endpoint for Memorize Pairs Battle multiplayer
    if (url.pathname === '/ws') {
      const id = env.GAME_SERVER.idFromName('global-lobby');
      const obj = env.GAME_SERVER.get(id);
      return obj.fetch(request);
    }

    // Serve static assets (Vite build output) with required isolation headers
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(ISOLATION_HEADERS)) headers.set(k, v);
    return new Response(response.body, {
      status:     response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
