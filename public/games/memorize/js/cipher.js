// ═══════════════════════════════════════════════════════
// CIPHER — Number Shape Mnemonic Subgame
// Each digit 0–9 maps to a vivid shape. Build stories.
// ═══════════════════════════════════════════════════════

const CPH_BG  = ['#1e1b4b','#1c0f00','#042f47','#3b0a1f','#022c22','#1a0a00','#1f0707','#1a1400','#1e0a3c','#021412'];
const CPH_CLR = ['#a5b4fc','#fcd34d','#7dd3fc','#fb7185','#6ee7b7','#fbbf24','#fca5a5','#fde047','#c4b5fd','#5eead4'];

// SVG body (viewBox 0 0 100 100) for each digit
const CPH_SVG = [
  // 0 – Ring
  `<circle cx="50" cy="50" r="28" fill="none" stroke="#a5b4fc" stroke-width="14"/>
   <circle cx="38" cy="38" r="7" fill="#818cf8" opacity=".35"/>`,
  // 1 – Candle
  `<rect x="42" y="40" width="16" height="36" rx="3" fill="#fef9c3"/>
   <path d="M50,11 C46,20 42,27 50,33 C58,27 54,20 50,11Z" fill="#f97316"/>
   <line x1="50" y1="33" x2="50" y2="41" stroke="#94a3b8" stroke-width="2"/>
   <ellipse cx="50" cy="76" rx="9" ry="3" fill="#9ca3af" opacity=".4"/>`,
  // 2 – Swan
  `<ellipse cx="50" cy="84" rx="38" ry="10" fill="#38bdf8" opacity=".35"/>
   <path d="M24 84 Q37 80 50 84 Q63 88 76 84" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity=".5"/>
   <ellipse cx="58" cy="70" rx="27" ry="19" fill="#f8fafc"/>
   <path d="M82 65 q10 -2 12 8 q-6 -2 -12 5 z" fill="#f0f9ff"/>
   <path d="M44 56 Q32 40 38 22 Q44 10 52 9" fill="none" stroke="#f8fafc" stroke-width="13" stroke-linecap="round"/>
   <circle cx="52" cy="11" r="12" fill="#f8fafc"/>
   <path d="M60 11 Q75 8 73 16 Q69 21 60 17 z" fill="#f59e0b"/>
   <circle cx="56" cy="8" r="3" fill="#1c1c24"/>
   <circle cx="55" cy="7" r="1.2" fill="white"/>
   <path d="M36 56 Q54 48 74 63" fill="none" stroke="#dbeafe" stroke-width="2.5" opacity=".8"/>`,
  // 3 – Heart
  `<path d="M50,68 L17,40 A18,18,0,0,1,50,31 A18,18,0,0,1,83,40 Z" fill="#f43f5e"/>
   <ellipse cx="35" cy="36" rx="11" ry="7" fill="#fb7185" opacity=".55"/>
   <ellipse cx="65" cy="36" rx="11" ry="7" fill="#fb7185" opacity=".55"/>`,
  // 4 – Flag
  `<rect x="32" y="16" width="5" height="60" rx="2.5" fill="#94a3b8"/>
   <path d="M37,16 L76,26 L70,42 L37,32Z" fill="#34d399"/>
   <path d="M37,32 L70,42 L64,58 L37,48Z" fill="#10b981"/>
   <circle cx="32" cy="78" r="4" fill="#475569"/>`,
  // 5 – Hand (open palm)
  `<rect x="24" y="18" width="10" height="34" rx="5" fill="#fde68a"/>
   <rect x="36" y="12" width="10" height="40" rx="5" fill="#fed7aa"/>
   <rect x="48" y="10" width="10" height="42" rx="5" fill="#fde68a"/>
   <rect x="60" y="14" width="10" height="38" rx="5" fill="#fed7aa"/>
   <rect x="22" y="50" width="56" height="26" rx="12" fill="#fbbf24"/>`,
  // 6 – Cherry
  `<path d="M35,49 Q50,20 65,51" fill="none" stroke="#22c55e" stroke-width="4.5" stroke-linecap="round"/>
   <path d="M50,29 Q61,16 67,21" fill="none" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round"/>
   <circle cx="31" cy="62" r="15" fill="#ef4444"/>
   <circle cx="63" cy="66" r="15" fill="#dc2626"/>
   <circle cx="26" cy="57" r="5" fill="#fca5a5" opacity=".55"/>`,
  // 7 – Lightning
  `<path d="M60,10 L30,52 L49,52 L40,86 L70,44 L51,44 Z" fill="#fde047" stroke="#a16207" stroke-width="1.5" stroke-linejoin="round"/>
   <path d="M35,52 L48,52" stroke="#fef08a" stroke-width="2" opacity=".6"/>`,
  // 8 – Snowman
  `<circle cx="50" cy="65" r="19" fill="white" stroke="#ddd6fe" stroke-width="1.5"/>
   <circle cx="50" cy="37" r="15" fill="white" stroke="#ddd6fe" stroke-width="1.5"/>
   <circle cx="44" cy="34" r="3" fill="#4b5563"/>
   <circle cx="56" cy="34" r="3" fill="#4b5563"/>
   <path d="M43,41 Q50,46 57,41" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round"/>
   <rect x="35" y="21" width="30" height="9" rx="4.5" fill="#7c3aed"/>
   <rect x="30" y="18" width="40" height="6" rx="3" fill="#6d28d9"/>
   <rect x="43" y="58" width="5" height="14" rx="2.5" fill="#f97316"/>
   <rect x="52" y="61" width="5" height="11" rx="2.5" fill="#f97316"/>`,
  // 9 – Balloon
  `<ellipse cx="50" cy="36" rx="23" ry="28" fill="#2dd4bf"/>
   <ellipse cx="43" cy="28" rx="10" ry="13" fill="#67e8f9" opacity=".5"/>
   <path d="M50,64 Q48,72 50,76 Q52,80 50,86" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
   <path d="M43,62 L57,62 L50,70Z" fill="#0f766e"/>`,
];



// ═══════════════════════════════════════════════════════
// CIPHER — Mnemonic Options (3 variants per digit)
// ═══════════════════════════════════════════════════════
// deprecated

const CPH_OPTIONS = [
  // ── 0 ──
  [
    { id: 'ring', svg:
      `<circle cx="50" cy="50" r="28" fill="none" stroke="#a5b4fc" stroke-width="14"/>
       <circle cx="38" cy="38" r="7" fill="#818cf8" opacity=".35"/>` },
    { id: 'donut', svg:
      `<circle cx="50" cy="50" r="32" fill="#d97706"/>
       <path d="M22 45 Q30 20 50 18 Q70 20 78 45 Q80 65 65 75 Q50 82 35 75 Q20 65 22 45" fill="#f472b6"/>
       <circle cx="50" cy="50" r="12" fill="#1e1b4b"/>
       <rect x="35" y="30" width="8" height="3" rx="1.5" fill="#fff" transform="rotate(25 35 30)"/>
       <rect x="60" y="35" width="8" height="3" rx="1.5" fill="#fef08a" transform="rotate(-40 60 35)"/>
       <rect x="45" y="65" width="8" height="3" rx="1.5" fill="#67e8f9" transform="rotate(15 45 65)"/>` },
    { id: 'egg', svg:
      `<ellipse cx="50" cy="54" rx="30" ry="40" fill="#fef3c7"/>
       <ellipse cx="42" cy="40" rx="10" ry="18" fill="#fff" opacity=".6" transform="rotate(-15 42 40)"/>` }
  ],
  // ── 1 ──
  [
    { id: 'candle', svg:
      `<rect x="42" y="40" width="16" height="36" rx="3" fill="#fef9c3"/>
       <path d="M50,11 C46,20 42,27 50,33 C58,27 54,20 50,11Z" fill="#f97316"/>
       <line x1="50" y1="33" x2="50" y2="41" stroke="#94a3b8" stroke-width="2"/>
       <ellipse cx="50" cy="76" rx="9" ry="3" fill="#9ca3af" opacity=".4"/>` },
    { id: 'pencil', svg:
      `<polygon points="40,65 60,65 50,88" fill="#fcd34d"/>
       <polygon points="47,81 53,81 50,88" fill="#334155"/>
       <rect x="40" y="25" width="20" height="40" fill="#facc15"/>
       <line x1="46" y1="25" x2="46" y2="65" stroke="#eab308" stroke-width="2"/>
       <line x1="54" y1="25" x2="54" y2="65" stroke="#eab308" stroke-width="2"/>
       <rect x="40" y="18" width="20" height="7" fill="#94a3b8"/>
       <rect x="40" y="10" width="20" height="8" rx="2" fill="#f43f5e"/>` },
    { id: 'sword', svg:
      `<polygon points="46,15 54,15 50,5" fill="#cbd5e1"/>
       <rect x="46" y="15" width="8" height="55" fill="#cbd5e1"/>
       <line x1="50" y1="15" x2="50" y2="70" stroke="#94a3b8" stroke-width="2"/>
       <rect x="30" y="65" width="40" height="6" rx="3" fill="#fbbf24"/>
       <rect x="45" y="71" width="10" height="16" rx="2" fill="#8b5cf6"/>
       <circle cx="50" cy="90" r="5" fill="#fbbf24"/>` }
  ],
  // ── 2 ──
  [
    { id: 'swan', svg:
      `<ellipse cx="50" cy="84" rx="38" ry="10" fill="#38bdf8" opacity=".35"/>
       <path d="M24 84 Q37 80 50 84 Q63 88 76 84" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity=".5"/>
       <ellipse cx="58" cy="70" rx="27" ry="19" fill="#f8fafc"/>
       <path d="M82 65 q10 -2 12 8 q-6 -2 -12 5 z" fill="#f0f9ff"/>
       <path d="M44 56 Q32 40 38 22 Q44 10 52 9" fill="none" stroke="#f8fafc" stroke-width="13" stroke-linecap="round"/>
       <circle cx="52" cy="11" r="12" fill="#f8fafc"/>
       <path d="M60 11 Q75 8 73 16 Q69 21 60 17 z" fill="#f59e0b"/>
       <circle cx="56" cy="8" r="3" fill="#1c1c24"/>` },
    { id: 'hanger', svg:
      `<path d="M50 35 C65 35 65 15 50 15 C45 15 45 20 48 24" fill="none" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
       <polygon points="50,45 85,75 15,75" fill="none" stroke="#cbd5e1" stroke-width="6" stroke-linejoin="round"/>
       <line x1="15" y1="75" x2="85" y2="75" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
       <rect x="47" y="35" width="6" height="10" fill="#64748b"/>` },
    { id: 'snake', svg:
      `<path d="M30 25 C50 5 80 20 70 40 C60 60 30 50 40 70 C50 90 80 80 85 70" fill="none" stroke="#4ade80" stroke-width="14" stroke-linecap="round"/>
       <circle cx="42" cy="22" r="3" fill="#111"/>
       <path d="M30 20 L20 15 L22 22 Z" fill="#ef4444"/>` }
  ],
  // ── 3 ──
  [
    { id: 'heart', svg:
      `<path d="M50,68 L17,40 A18,18,0,0,1,50,31 A18,18,0,0,1,83,40 Z" fill="#f43f5e"/>
       <ellipse cx="35" cy="36" rx="11" ry="7" fill="#fb7185" opacity=".55"/>
       <ellipse cx="65" cy="36" rx="11" ry="7" fill="#fb7185" opacity=".55"/>` },
    { id: 'butterfly', svg:
      `<path d="M50 50 C 90 10, 100 50, 50 50" fill="#c084fc"/>
       <path d="M50 50 C 80 90, 100 50, 50 50" fill="#a855f7"/>
       <path d="M50 50 C 10 10, 0 50, 50 50" fill="#c084fc"/>
       <path d="M50 50 C 20 90, 0 50, 50 50" fill="#a855f7"/>
       <rect x="46" y="25" width="8" height="50" rx="4" fill="#475569"/>
       <path d="M48 25 Q35 15 30 20 M52 25 Q65 15 70 20" fill="none" stroke="#475569" stroke-width="3" stroke-linecap="round"/>` },
    { id: 'glasses', svg:
      `<rect x="15" y="40" width="30" height="20" rx="6" fill="none" stroke="#3b82f6" stroke-width="6"/>
       <rect x="55" y="40" width="30" height="20" rx="6" fill="none" stroke="#3b82f6" stroke-width="6"/>
       <path d="M45 45 Q50 38 55 45" fill="none" stroke="#3b82f6" stroke-width="5" stroke-linecap="round"/>
       <line x1="15" y1="45" x2="5" y2="35" stroke="#3b82f6" stroke-width="5" stroke-linecap="round"/>
       <line x1="85" y1="45" x2="95" y2="35" stroke="#3b82f6" stroke-width="5" stroke-linecap="round"/>
       <rect x="18" y="43" width="24" height="14" rx="4" fill="#bae6fd" opacity=".4"/>
       <rect x="58" y="43" width="24" height="14" rx="4" fill="#bae6fd" opacity=".4"/>` }
  ],
  // ── 4 ──
  [
    { id: 'flag', svg:
      `<rect x="32" y="16" width="5" height="60" rx="2.5" fill="#94a3b8"/>
       <path d="M37,16 L76,26 L70,42 L37,32Z" fill="#34d399"/>
       <path d="M37,32 L70,42 L64,58 L37,48Z" fill="#10b981"/>
       <circle cx="32" cy="78" r="4" fill="#475569"/>` },
    { id: 'sailboat', svg:
      `<path d="M55 10 L55 60 L85 60 Z" fill="#f8fafc"/>
       <path d="M45 15 L15 60 L45 60 Z" fill="#e2e8f0"/>
       <rect x="48" y="10" width="4" height="55" fill="#b45309"/>
       <path d="M10 65 L90 65 L75 85 L25 85 Z" fill="#ef4444"/>
       <path d="M0 80 Q25 70 50 80 T100 80" fill="none" stroke="#38bdf8" stroke-width="4" opacity=".6"/>` },
    { id: 'chair', svg:
      `<line x1="30" y1="20" x2="30" y2="80" stroke="#b45309" stroke-width="8" stroke-linecap="round"/>
       <line x1="70" y1="50" x2="70" y2="80" stroke="#b45309" stroke-width="8" stroke-linecap="round"/>
       <line x1="26" y1="50" x2="74" y2="50" stroke="#d97706" stroke-width="8" stroke-linecap="round"/>
       <line x1="30" y1="35" x2="70" y2="35" stroke="#d97706" stroke-width="5" stroke-linecap="round"/>
       <rect x="26" y="46" width="48" height="8" rx="4" fill="#fcd34d"/>` }
  ],
  // ── 5 ──
  [
    { id: 'hand', svg:
      `<rect x="24" y="18" width="10" height="34" rx="5" fill="#fde68a"/>
       <rect x="36" y="12" width="10" height="40" rx="5" fill="#fed7aa"/>
       <rect x="48" y="10" width="10" height="42" rx="5" fill="#fde68a"/>
       <rect x="60" y="14" width="10" height="38" rx="5" fill="#fed7aa"/>
       <rect x="22" y="50" width="56" height="26" rx="12" fill="#fbbf24"/>
       <rect x="70" y="40" width="10" height="26" rx="5" fill="#fde68a" transform="rotate(45 70 40)"/>` },
    { id: 'hook', svg:
      `<path d="M35 35 C35 15 65 15 65 35 C65 55 45 60 45 80" fill="none" stroke="#94a3b8" stroke-width="12" stroke-linecap="round"/>
       <circle cx="45" cy="85" r="8" fill="#64748b"/>
       <polygon points="35,35 25,35 35,20" fill="#94a3b8"/>
       <line x1="25" y1="40" x2="50" y2="40" stroke="#cbd5e1" stroke-width="4" opacity=".5"/>` },
    { id: 'star', svg:
      `<polygon points="50,10 61,35 88,35 66,51 74,77 50,61 26,77 34,51 12,35 39,35" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>
       <polygon points="50,10 61,35 50,61 39,35" fill="#fde68a" opacity=".5"/>
       <circle cx="43" cy="45" r="3" fill="#111"/><circle cx="57" cy="45" r="3" fill="#111"/>
       <path d="M46 52 Q50 56 54 52" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/>` }
  ],
  // ── 6 ──
  [
    { id: 'cherry', svg:
      `<path d="M35,49 Q50,20 65,51" fill="none" stroke="#22c55e" stroke-width="4.5" stroke-linecap="round"/>
       <path d="M50,29 Q61,16 67,21" fill="none" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round"/>
       <circle cx="31" cy="62" r="15" fill="#ef4444"/>
       <circle cx="63" cy="66" r="15" fill="#dc2626"/>
       <circle cx="26" cy="57" r="5" fill="#fca5a5" opacity=".55"/>
       <circle cx="58" cy="61" r="5" fill="#fca5a5" opacity=".55"/>` },
    { id: 'lock', svg:
      `<path d="M30 45 L30 30 C30 10 70 10 70 30 L70 45" fill="none" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/>
       <rect x="20" y="45" width="60" height="40" rx="8" fill="#f59e0b"/>
       <rect x="20" y="45" width="60" height="8" fill="#d97706" opacity=".5"/>
       <circle cx="50" cy="60" r="6" fill="#1e293b"/>
       <rect x="47" y="60" width="6" height="12" rx="3" fill="#1e293b"/>` },
    { id: 'snail', svg:
      `<path d="M20 75 Q40 85 75 75 Q85 70 70 65 L40 65" fill="#fbbf24" stroke="#d97706" stroke-width="8" stroke-linecap="round"/>
       <circle cx="45" cy="45" r="24" fill="#a78bfa"/>
       <path d="M45 45 L45 21 A24 24 0 0 1 69 45 A24 24 0 0 1 45 69 A24 24 0 0 1 21 45" fill="none" stroke="#8b5cf6" stroke-width="4"/>
       <line x1="72" y1="68" x2="80" y2="55" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>
       <line x1="68" y1="70" x2="72" y2="52" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>
       <circle cx="80" cy="55" r="2" fill="#111"/><circle cx="72" cy="52" r="2" fill="#111"/>` }
  ],
  // ── 7 ──
  [
    { id: 'lightning', svg:
      `<path d="M60,10 L30,52 L49,52 L40,86 L70,44 L51,44 Z" fill="#fde047" stroke="#a16207" stroke-width="1.5" stroke-linejoin="round"/>
       <path d="M35,52 L48,52" stroke="#fef08a" stroke-width="2" opacity=".6"/>` },
    { id: 'axe', svg:
      `<rect x="42" y="20" width="8" height="65" rx="4" fill="#b45309" transform="rotate(-15 46 52)"/>
       <path d="M45 15 L70 10 Q85 25 75 40 L40 35 Z" fill="#94a3b8" transform="rotate(-15 46 52)"/>
       <path d="M65 12 Q80 25 70 38" fill="none" stroke="#cbd5e1" stroke-width="3" transform="rotate(-15 46 52)"/>` },
    { id: 'golfclub', svg:
      `<rect x="46" y="10" width="6" height="70" rx="3" fill="#cbd5e1"/>
       <rect x="45" y="10" width="8" height="20" rx="2" fill="#1e293b"/>
       <path d="M46 75 L20 85 L20 75 L52 65 Z" fill="#94a3b8"/>
       <circle cx="75" cy="80" r="5" fill="#fff"/>
       <line x1="70" y1="88" x2="80" y2="88" stroke="#4ade80" stroke-width="3"/>` }
  ],
  // ── 8 ──
  [
    { id: 'snowman', svg:
      `<circle cx="50" cy="65" r="19" fill="white" stroke="#ddd6fe" stroke-width="1.5"/>
       <circle cx="50" cy="37" r="15" fill="white" stroke="#ddd6fe" stroke-width="1.5"/>
       <circle cx="44" cy="34" r="3" fill="#4b5563"/>
       <circle cx="56" cy="34" r="3" fill="#4b5563"/>
       <path d="M43,41 Q50,46 57,41" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round"/>
       <rect x="35" y="21" width="30" height="9" rx="4.5" fill="#7c3aed"/>
       <rect x="30" y="18" width="40" height="6" rx="3" fill="#6d28d9"/>
       <rect x="43" y="58" width="5" height="14" rx="2.5" fill="#f97316"/>
       <rect x="52" y="61" width="5" height="11" rx="2.5" fill="#f97316"/>` },
    { id: 'hourglass', svg:
      `<polygon points="30,15 70,15 50,45" fill="#bae6fd" opacity=".4"/>
       <polygon points="50,55 30,85 70,85" fill="#bae6fd" opacity=".4"/>
       <polygon points="35,75 65,75 50,55" fill="#fcd34d"/>
       <path d="M30 15 L70 15 L55 45 L50 50 L45 45 Z" fill="#fcd34d"/>
       <line x1="50" y1="50" x2="50" y2="60" stroke="#fcd34d" stroke-width="3"/>
       <rect x="25" y="10" width="50" height="6" rx="2" fill="#78350f"/>
       <rect x="25" y="85" width="50" height="6" rx="2" fill="#78350f"/>` },
    { id: 'spider', svg:
      `<circle cx="50" cy="55" r="16" fill="#1e293b"/>
       <circle cx="50" cy="35" r="8" fill="#1e293b"/>
       <path d="M45 35 Q20 15 15 35" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
       <path d="M55 35 Q80 15 85 35" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
       <path d="M40 45 Q15 45 15 65" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
       <path d="M60 45 Q85 45 85 65" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
       <path d="M40 55 Q10 65 20 85" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
       <path d="M60 55 Q90 65 80 85" fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
       <circle cx="47" cy="33" r="2" fill="#ef4444"/><circle cx="53" cy="33" r="2" fill="#ef4444"/>` }
  ],
  // ── 9 ──
  [
    { id: 'balloon', svg:
      `<ellipse cx="50" cy="36" rx="23" ry="28" fill="#2dd4bf"/>
       <ellipse cx="43" cy="28" rx="10" ry="13" fill="#67e8f9" opacity=".5"/>
       <path d="M50,64 Q48,72 50,76 Q52,80 50,86" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
       <path d="M43,62 L57,62 L50,70Z" fill="#0f766e"/>` },
    { id: 'magnifier', svg:
      `<circle cx="40" cy="40" r="20" fill="#bae6fd" opacity=".4" stroke="#94a3b8" stroke-width="8"/>
       <line x1="55" y1="55" x2="75" y2="75" stroke="#334155" stroke-width="12" stroke-linecap="round"/>
       <path d="M30 30 Q40 25 45 35" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
       <circle cx="75" cy="75" r="6" fill="#ef4444"/>` },
    { id: 'key', svg:
      `<circle cx="35" cy="35" r="15" fill="none" stroke="#fbbf24" stroke-width="8"/>
       <line x1="46" y1="46" x2="75" y2="75" stroke="#fbbf24" stroke-width="8" stroke-linecap="round"/>
       <line x1="60" y1="60" x2="70" y2="50" stroke="#fbbf24" stroke-width="8" stroke-linecap="round"/>
       <line x1="70" y1="70" x2="80" y2="60" stroke="#fbbf24" stroke-width="8" stroke-linecap="round"/>
       <circle cx="35" cy="35" r="6" fill="#f59e0b" opacity=".5"/>` }
  ]
];

const CPH_LEVELS = [
  {len:3, study:9000,  showLabel:true,  introKey:'cph_intro_learn'},
  {len:3, study:7000,  showLabel:true},
  {len:4, study:10000, showLabel:true},
  {len:4, study:7000,  showLabel:false, introKey:'cph_intro_hidden'},
  {len:5, study:10000, showLabel:false},
  {len:5, study:7000,  showLabel:false},
  {len:6, study:11000, showLabel:false},
  {len:6, study:8000,  showLabel:false},
  {len:7, study:12000, showLabel:false},
  {len:9, study:15000, showLabel:false},
];

const CPH_DAILY_LEN = 6;
const CPH_LS_KEY = 'membrain_cipher_v1';

// Linking actions for the active story-builder. Presented as an emoji + a short
// caption that sits BETWEEN two shape icons, so no grammatical-case agreement is
// needed — safe for every language (the shapes are pictures, not inflected words).
const CPH_LINKS = [
  { emoji:'💥', key:'cph_link_smash' },
  { emoji:'🔥', key:'cph_link_burn'  },
  { emoji:'🏃', key:'cph_link_chase' },
  { emoji:'🎁', key:'cph_link_gift'  },
  { emoji:'🔄', key:'cph_link_morph' },
  { emoji:'⬆️', key:'cph_link_leap'  },
];

// ─── Personal Cipher storage ───
const CPH_CIPHER_LS = 'membrain_cipher_choice_v1';

function cphGetChoices() {
  try {
    const c = JSON.parse(localStorage.getItem(CPH_CIPHER_LS));
    if (Array.isArray(c) && c.length === 10) return c;
  } catch(e) {}
  return Array.from({length:10}, () => 0);
}

function cphSetChoices(arr) {
  try { localStorage.setItem(CPH_CIPHER_LS, JSON.stringify(arr)); } catch(e) {}
}

function cphShapeName(digit) {
  const choices = cphGetChoices();
  const idx = choices[digit] || 0;
  return t('cph_shape_' + CPH_OPTIONS[digit][Math.min(idx, CPH_OPTIONS[digit].length - 1)].id);
}

let cphState = {
  level:0, digits:[], answer:[], links:[], activeSlot:0, timer:null, daily:false, showLabel:true
};
let cphTimers = [];
let cphSetupDraft = null;

// ── SOUNDS (reuse the global playTone from pairs.js) ──
function cphSnd(fn){ try{ if(typeof playTone==='function') fn(); }catch(e){} }
function cphSndTick(){    cphSnd(()=>{ playTone(520,'sine',0.08,0.04); }); }
function cphSndLock(){    cphSnd(()=>{ playTone(660,'triangle',0.12,0.06); playTone(880,'triangle',0.10,0.07,0.05); }); }
function cphSndPlace(){   cphSnd(()=>{ playTone(440,'sine',0.10,0.05); }); }
function cphSndCorrect(d=0){ cphSnd(()=>{ playTone(587,'triangle',0.16,0.10,d); playTone(880,'triangle',0.12,0.12,d+0.08); }); }
function cphSndWrong(d=0){   cphSnd(()=>{ playTone(196,'sawtooth',0.12,0.16,d); }); }
function cphSndCombo(n){  cphSnd(()=>{ playTone(440+n*90,'triangle',0.16,0.10); }); }
function cphSndVerdict(pct){ cphSnd(()=>{
  if(pct>=80){ [523,659,784,1047].forEach((f,i)=>playTone(f,'triangle',0.24,0.20,i*0.11)); }
  else if(pct>=50){ playTone(440,'triangle',0.18,0.18); playTone(523,'triangle',0.16,0.20,0.15); }
  else { playTone(330,'sawtooth',0.16,0.24); playTone(247,'sawtooth',0.13,0.28,0.16); }
}); }

// ── Seeded RNG (same as Colombo's mulberry32) ──
function cphRng(seed) {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 4294967296;
  };
}

function cphDailySeed() { return Math.floor(Date.now() / 86400000); }

function cphGenDigits(len, seed) {
  const rng = cphRng(seed);
  const arr = [];
  for (let i = 0; i < len; i++) arr.push(Math.floor(rng() * 10));
  return arr;
}

function cphSavedData() {
  try { return JSON.parse(localStorage.getItem(CPH_LS_KEY) || '{}'); } catch(e) { return {}; }
}

// ── SVG helper — uses user's chosen icon from CPH_OPTIONS ──
function cphIconSvg(digit, size, borderColor) {
  const choices = cphGetChoices();
  const idx = Math.min(choices[digit] || 0, CPH_OPTIONS[digit].length - 1);
  const bc = borderColor || (CPH_CLR[digit] + '44');
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="border-radius:50%;background:${CPH_BG[digit]};border:2px solid ${bc};display:block;flex-shrink:0">${CPH_OPTIONS[digit][idx].svg}</svg>`;
}

// ── Story generator ──
function cphMakeStory(digits) {
  if (digits.length === 0) return '';
  const names = digits.map(d => cphShapeName(d));
  if (digits.length === 1) return names[0];
  if (digits.length === 2) {
    const idx = (digits[0] + digits[1]) % 5;
    const tpls = [
      (a,b) => t('cph_story_tpl_2a', a, b),
      (a,b) => t('cph_story_tpl_2b', a, b),
      (a,b) => t('cph_story_tpl_2c', a, b),
      (a,b) => t('cph_story_tpl_2d', a, b),
      (a,b) => t('cph_story_tpl_2e', a, b),
    ];
    return tpls[idx](names[0], names[1]);
  }
  if (digits.length === 3) {
    const idx = (digits[0] + digits[2]) % 4;
    const tpls = [
      (a,b,c) => t('cph_story_tpl_3a', a, b, c),
      (a,b,c) => t('cph_story_tpl_3b', a, b, c),
      (a,b,c) => t('cph_story_tpl_3c', a, b, c),
      (a,b,c) => t('cph_story_tpl_3d', a, b, c),
    ];
    return tpls[idx](names[0], names[1], names[2]);
  }
  // 4+ → split into chunks of 2-3
  const half = Math.floor(digits.length / 2);
  return cphMakeStory(digits.slice(0, half)) + ' · ' + cphMakeStory(digits.slice(half));
}

// ── Personal Cipher Setup ──
function cphShowSetup() {
  cphSetupDraft = [...cphGetChoices()];
  document.getElementById('cipher-setup').style.display = '';
  document.getElementById('cipher-menu').style.display  = 'none';
  cphRenderSetup();
}

function cphRenderSetup() {
  const el = document.getElementById('cipher-setup');
  if (!el) return;
  const houseIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
  el.innerHTML = `
    <div class="cph-setup-head">
      <button class="close-btn" onclick="cphSetupCancel()" title="${t('home_btn')}">${houseIcon}</button>
      <div class="cph-setup-title">${t('cph_setup_title')}</div>
    </div>
    <div class="cph-setup-sub">${t('cph_setup_sub')}</div>
    <div class="cph-setup-grid">
      ${Array.from({length:10}, (_,d) => `
        <div class="cph-setup-row">
          <div class="cph-setup-digit" style="color:${CPH_CLR[d]}">${d}</div>
          <div class="cph-setup-opts">
            ${CPH_OPTIONS[d].map((opt,i) => `
              <button class="cph-setup-opt ${cphSetupDraft[d]===i?'sel':''}"
                      onclick="cphSetupPick(${d},${i})">
                <svg viewBox="0 0 100 100" width="48" height="48"
                     style="border-radius:50%;background:${CPH_BG[d]}">${opt.svg}</svg>
                <span class="cph-setup-opt-name">${t('cph_shape_'+opt.id)}</span>
              </button>`).join('')}
          </div>
        </div>`).join('')}
    </div>
    <button class="btn btn-primary" onclick="cphSaveSetup()"
            style="width:100%;max-width:400px;margin:14px auto 0;display:block;">${t('cph_setup_save')}</button>
  `;
}

function cphSetupPick(digit, optIdx) {
  cphSetupDraft[digit] = optIdx;
  cphRenderSetup();
}

function cphSaveSetup() {
  cphSetChoices(cphSetupDraft);
  cphSetupCancel();
  cphBuildRefStrip();
}

function cphSetupCancel() {
  document.getElementById('cipher-setup').style.display = 'none';
  document.getElementById('cipher-menu').style.display  = '';
}

// ── Menu ──
function showCipherMenu() {
  showScreen('screen-cipher');
  const menu    = document.getElementById('cipher-menu');
  const study   = document.getElementById('cipher-study');
  const recall  = document.getElementById('cipher-recall');
  const result  = document.getElementById('cipher-result');
  if (menu)   menu.style.display   = '';
  if (study)  study.style.display  = 'none';
  if (recall) recall.style.display = 'none';
  if (result) result.style.display = 'none';

  cphTimers.forEach(clearTimeout); cphTimers = [];

  cphBuildRefStrip();
  cphBuildLevelGrid();
  cphBuildDailyCard();
  cphBuildStats();
  cphSetTxt('cipher-section-title', 'cph_section_title');
  cphSetTxt('cipher-section-sub',   'cph_section_sub');
  cphSetTxt('cipher-training-head', 'cph_training_head');
  cphSetTxt('cipher-opts-label',    'opts_label');
  restoreOpts('cipher-opts');
}

function cphBuildRefStrip() {
  const row = document.getElementById('cipher-ref-strip');
  if (!row) return;
  row.innerHTML = Array.from({length:10}, (_,d) =>
    `<div class="cph-ref-item" onclick="cphShowSetup()" title="${t('cph_setup_btn')}">
      ${cphIconSvg(d, 42)}
      <span class="cph-ref-digit" style="color:${CPH_CLR[d]}">${d}</span>
      <span class="cph-ref-name" id="cph-ref-name-${d}">${cphShapeName(d)}</span>
    </div>`
  ).join('');
}

function cphBuildLevelGrid() {
  const grid = document.getElementById('cipher-level-grid');
  if (!grid) return;
  const saved = cphSavedData();
  grid.innerHTML = CPH_LEVELS.map((lv, i) => {
    const done   = saved.levels && saved.levels[i];
    const best   = saved.best   && saved.best[i] !== undefined ? saved.best[i] : null;
    const locked = i > 0 && !(saved.levels && saved.levels[i - 1]);
    const cls    = locked ? 'locked' : (done ? 'done' : '');
    return `<button class="lv-btn ${cls}" onclick="cphStart(${i})" ${locked ? 'disabled' : ''}>
      <span class="lv-num">${i+1}</span>
      <span class="lv-tag">${lv.len}🔢</span>
      ${best !== null ? `<span class="lv-best">${best}%</span>` : ''}
    </button>`;
  }).join('');
}

function cphBuildDailyCard() {
  const wrap = document.getElementById('cipher-daily-wrap');
  if (!wrap) return;
  const saved   = cphSavedData();
  const seed    = cphDailySeed();
  const done    = saved.dailyDate === seed;
  const digits  = cphGenDigits(CPH_DAILY_LEN, seed);
  const preview = done
    ? digits.map(d => cphIconSvg(d, 26, CPH_CLR[d])).join('')
    : ''.padEnd(CPH_DAILY_LEN, '?').split('').map(() => `<span class="cph-daily-dot">?</span>`).join('');

  wrap.innerHTML = `<div class="cph-daily-card ${done?'done':''}" onclick="${done?'':' cphDaily()'}">
    <div class="cph-daily-header">
      <span class="tag tag-gold" id="cph-daily-tag">${t('cph_daily_lbl')}</span>
      <span class="cph-daily-status">${done ? t('cph_daily_done') : t('cph_daily_open')}</span>
    </div>
    <div class="cph-daily-icons">${preview}</div>
    <div class="cph-daily-sub">${CPH_DAILY_LEN} ${t('cph_digits')} · ${t('cph_daily_sub')}</div>
  </div>`;
}

function cphBuildStats() {
  const saved   = cphSavedData();
  const history = saved.history || [];
  const today   = cphDailySeed();

  // 7-day bars
  const bars = document.getElementById('cipher-bars');
  if (bars) {
    bars.innerHTML = Array.from({length:7}, (_,i) => {
      const day    = today - (6 - i);
      const dayH   = history.filter(h => h.date === day);
      const best   = dayH.length ? Math.max(...dayH.map(h => h.pct)) : 0;
      return `<div class="bar7-col">
        <div class="bar7-fill" style="height:${best}%;background:var(--cyanL)"></div>
        <div class="bar7-label">${t('dow')[new Date(day*86400000).getDay()]}</div>
      </div>`;
    }).join('');
  }

  // Stat cells
  const statsDiv = document.getElementById('cipher-daily-stats');
  if (statsDiv) {
    const todayH   = history.filter(h => h.date === today);
    const totalR   = history.length;
    const avgPct   = totalR ? Math.round(history.reduce((s,h) => s + h.pct, 0) / totalR) : 0;
    const bestPct  = totalR ? Math.max(...history.map(h => h.pct)) : 0;
    statsDiv.innerHTML = `
      <div class="math-stat"><div class="stat-val">${todayH.length}</div><div class="stat-lbl">${t('cph_stat_today')}</div></div>
      <div class="math-stat"><div class="stat-val">${totalR}</div><div class="stat-lbl">${t('cph_stat_total')}</div></div>
      <div class="math-stat"><div class="stat-val">${avgPct}%</div><div class="stat-lbl">${t('cph_stat_avg')}</div></div>
      <div class="math-stat"><div class="stat-val">${bestPct}%</div><div class="stat-lbl">${t('cph_stat_best')}</div></div>`;
  }
}

// ── Start game ──
function cphStart(levelIdx, daily=false, dailySeed=null) {
  cphTimers.forEach(clearTimeout); cphTimers = [];

  const lv  = CPH_LEVELS[levelIdx] || CPH_LEVELS[0];
  const len = daily ? CPH_DAILY_LEN : lv.len;
  const seed = dailySeed !== null ? dailySeed : ((Date.now() + levelIdx * 31337) % 999983);

  const digits = cphGenDigits(len, seed);
  // Default link per gap is seeded so the same code starts with the same story,
  // but the player can re-tap each link to make it their own.
  const links = [];
  for (let i = 0; i < digits.length - 1; i++) links.push((digits[i] + digits[i + 1]) % CPH_LINKS.length);

  cphState = {
    level:     levelIdx,
    digits:    digits,
    answer:    [],
    links:     links,
    tiles:     [],
    locked:    digits.map(() => false),
    studyStart:0,
    studyElapsed:0,
    warmupOk:  false,
    timer:     null,
    daily:     daily,
    showLabel: daily ? true : lv.showLabel,
    studyMs:   daily ? 12000 : lv.study,
  };

  showScreen('screen-cipher');
  document.getElementById('cipher-menu').style.display   = 'none';
  document.getElementById('cipher-study').style.display  = '';
  document.getElementById('cipher-recall').style.display = 'none';
  document.getElementById('cipher-result').style.display = 'none';

  cphRenderStudy();

  // Check for intro on first encounter of this level
  if (lv.introKey) {
    const seen = cphSavedData().seenIntros || {};
    if (!seen[levelIdx]) {
      const saved = cphSavedData();
      if (!saved.seenIntros) saved.seenIntros = {};
      saved.seenIntros[levelIdx] = true;
      try{ localStorage.setItem(CPH_LS_KEY, JSON.stringify(saved)); }catch(e){}
    }
  }
}

function cphDaily() {
  cphStart(5, true, cphDailySeed());
}

// ── Study phase (self-paced: morph → build story → lock each shape) ──
function cphRenderStudy() {
  const {digits} = cphState;

  cphSetTxt('cipher-study-title', 'cph_build_title');

  // Build the interactive chain: shape · link · shape · …
  cphRenderChain('cipher-icons-row', true);

  // Trigger the number→shape morph, staggered left-to-right
  digits.forEach((_, i) => {
    const tid = setTimeout(() => {
      const m = document.getElementById('cph-morph-' + i);
      if (m) m.classList.add('done');
    }, i * 220 + 220);
    cphTimers.push(tid);
  });

  // Hint fades in once the shapes have settled
  const box = document.getElementById('cipher-story-box');
  if (box) { box.textContent = t('cph_build_hint'); box.style.opacity = '0'; box.classList.add('cph-build-hint'); }
  const hintTid = setTimeout(() => {
    if (box) { box.style.transition = 'opacity .5s'; box.style.opacity = '1'; }
  }, digits.length * 220 + 420);
  cphTimers.push(hintTid);

  // Self-paced: no countdown. Hide the timebar, run a count-UP elapsed clock.
  const bar = document.querySelector('#cipher-study .cph-study-timebar');
  if (bar) bar.style.display = 'none';
  cphState.studyStart = Date.now();
  const counter = document.getElementById('cipher-countdown');
  const tickUp = () => {
    const s = Math.floor((Date.now() - cphState.studyStart) / 1000);
    if (counter) counter.textContent = '⏱ ' + s + 's';
    const tid = setTimeout(tickUp, 250); cphTimers.push(tid);
  };
  tickUp();

  cphUpdateLockBtn();
}

// Keep already-morphed shapes visible after a chain re-render.
function cphMarkMorphsDone() {
  cphState.digits.forEach((_, k) => {
    const m = document.getElementById('cph-morph-' + k);
    if (m) m.classList.add('done');
  });
}

// Tapping a shape "commits" it — forces the player to look at each one.
function cphToggleLock(i) {
  cphState.locked[i] = !cphState.locked[i];
  if (cphState.locked[i]) cphSndLock(); else cphSndTick();
  cphRenderChain('cipher-icons-row', true);
  cphMarkMorphsDone();
  cphUpdateLockBtn();
}

function cphUpdateLockBtn() {
  const btn = document.getElementById('cipher-ready-btn');
  if (!btn) return;
  const n = cphState.locked.filter(Boolean).length;
  const total = cphState.digits.length;
  if (n >= total) { btn.disabled = false; btn.textContent = t('cph_lock_btn'); }
  else            { btn.disabled = true;  btn.textContent = t('cph_lock_progress', n, total); }
}

// Renders the shape/link chain. interactive=true gives tappable link chips +
// the morph wrappers; interactive=false renders a static recap (for results).
function cphRenderChain(containerId, interactive, shapeSize) {
  const row = document.getElementById(containerId);
  if (!row) return;
  const {digits, showLabel, links, locked} = cphState;
  const sz = shapeSize || 74;
  let html = '<div class="cph-chain">';
  digits.forEach((d, i) => {
    const isLocked = interactive && locked && locked[i];
    const shapeInner = interactive
      ? `<div class="cph-digit-label" style="color:${CPH_CLR[d]}">${d}</div>
         <div class="cph-morph" id="cph-morph-${i}">
           <span class="cph-morph-shape">${cphIconSvg(d, sz, CPH_CLR[d])}</span>
           ${isLocked ? '<span class="cph-lock-badge">✓</span>' : ''}
         </div>`
      : cphIconSvg(d, sz, CPH_CLR[d]);
    html += `<div class="cph-chain-shape ${interactive ? 'tappable' : ''} ${isLocked ? 'locked' : ''}" ${interactive ? `onclick="cphToggleLock(${i})"` : ''}>
      ${shapeInner}
      ${interactive ? `<div class="cph-icon-name" style="color:${CPH_CLR[d]}99">${cphShapeName(d)}</div>` : ''}
    </div>`;
    if (i < digits.length - 1) {
      const lk = CPH_LINKS[links[i]];
      html += interactive
        ? `<button class="cph-link" onclick="cphCycleLink(${i})" aria-label="change link">
             <span class="cph-link-emoji">${lk.emoji}</span>
             <span class="cph-link-label">${t(lk.key)}</span>
           </button>`
        : `<span class="cph-link static"><span class="cph-link-emoji">${lk.emoji}</span></span>`;
    }
  });
  html += '</div>';
  row.innerHTML = html;
}

// Player taps a link chip to cycle the action — their personal mnemonic.
function cphCycleLink(i) {
  // Don't let a tap on the chip bubble up and toggle the shape lock.
  if (window.event) window.event.stopPropagation();
  cphState.links[i] = (cphState.links[i] + 1) % CPH_LINKS.length;
  cphRenderChain('cipher-icons-row', true);
  cphMarkMorphsDone();
  cphUpdateLockBtn();
}

function cphSkipStudy() {
  cphTimers.forEach(clearTimeout); cphTimers = [];
  cphState.studyElapsed = Math.round((Date.now() - cphState.studyStart) / 1000);
  cphStartWarmup();
}

// ── Warm-up flash round (active-recall priming: one shape → tap its digit) ──
function cphStartWarmup() {
  cphTimers.forEach(clearTimeout); cphTimers = [];
  document.getElementById('cipher-study').style.display  = 'none';
  document.getElementById('cipher-recall').style.display = 'none';
  document.getElementById('cipher-result').style.display = 'none';
  const wrap = document.getElementById('cipher-warmup');
  wrap.style.display = '';

  // Pick a shape that actually appeared, build 4 digit choices (correct + lures)
  const {digits} = cphState;
  const pos = Math.floor(Math.random() * digits.length);
  const correct = digits[pos];
  const choices = new Set([correct]);
  while (choices.size < 4) choices.add(Math.floor(Math.random() * 10));
  const opts = [...choices].sort(() => Math.random() - 0.5);

  wrap.innerHTML = `
    <button class="close-btn close-btn-float" onclick="backFromGame('cipher')" title="← MemBrain">✕</button>
    <div class="cph-warmup-title">${t('cph_warmup_title')}</div>
    <div class="cph-warmup-shape">${cphIconSvg(correct, 96, CPH_CLR[correct])}</div>
    <div class="cph-warmup-q">${t('cph_warmup_q')}</div>
    <div class="cph-warmup-opts" id="cipher-warmup-opts">
      ${opts.map(d => `<button class="cph-warmup-opt" data-d="${d}" onclick="cphWarmupAnswer(${d},${correct})">${d}</button>`).join('')}
    </div>`;
}

function cphWarmupAnswer(picked, correct) {
  const opts = document.getElementById('cipher-warmup-opts');
  if (!opts || opts.dataset.locked) return;
  opts.dataset.locked = '1';
  cphState.warmupOk = (picked === correct);
  (cphState.warmupOk ? cphSndCorrect() : cphSndWrong());
  opts.querySelectorAll('.cph-warmup-opt').forEach(b => {
    const d = parseInt(b.dataset.d);
    if (d === correct)      b.classList.add('right');
    else if (d === picked)  b.classList.add('wrong');
    b.disabled = true;
  });
  const tid = setTimeout(() => {
    document.getElementById('cipher-warmup').style.display = 'none';
    cphStartRecall();
  }, 750);
  cphTimers.push(tid);
}

// ── Recall phase — dual row (digits + icons) with tap-to-fill panel ──
function cphStartRecall() {
  cphTimers.forEach(clearTimeout); cphTimers = [];
  const {digits} = cphState;
  cphState.answer    = new Array(digits.length).fill(null);
  cphState.activeSlot = 0;

  document.getElementById('cipher-study').style.display  = 'none';
  const recall = document.getElementById('cipher-recall');
  recall.style.display = '';
  const houseIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
  recall.innerHTML = `
    <button class="close-btn close-btn-float" onclick="backFromGame('cipher')" title="${t('home_btn')}">${houseIcon}</button>
    <div class="cph-recall-title">${t('cph_recall_title')}</div>
    <div class="cph-recall-hint">${t('cph_recall_hint')}</div>
    <div class="cph-dual-board" id="cph-dual-board"></div>
    <div class="cph-input-panel" id="cph-input-panel"></div>
    <div style="display:flex;justify-content:center;margin-top:12px;max-width:560px;margin-left:auto;margin-right:auto;">
      <button class="btn btn-primary" id="cipher-submit-btn" onclick="cphSubmit()" style="width:100%;max-width:260px;" disabled>${t('cph_submit_btn')}</button>
    </div>`;

  cphRenderRecall();
}

function cphRenderRecall() {
  const {digits, answer, activeSlot} = cphState;

  const board = document.getElementById('cph-dual-board');
  if (board) {
    const makeRow = (label, slotFn) =>
      `<div class="cph-dual-row">
         <div class="cph-dual-lbl">${label}</div>
         <div class="cph-dual-slots">${digits.map((_,i) => slotFn(i)).join('')}</div>
       </div>`;

    const digitSlot = i => {
      const d = answer[i];
      const cls = `cph-ds${d!==null?' filled':''}${i===activeSlot?' active':''}`;
      return `<div class="${cls}" onclick="cphSelectSlot(${i})">
        <span class="cph-ds-idx">${i+1}</span>
        ${d!==null ? `<span class="cph-ds-val" style="color:${CPH_CLR[d]}">${d}</span>` : ''}
      </div>`;
    };

    const iconSlot = i => {
      const d = answer[i];
      const cls = `cph-ds${d!==null?' filled':''}${i===activeSlot?' active':''}`;
      return `<div class="${cls}" onclick="cphSelectSlot(${i})">
        <span class="cph-ds-idx">${i+1}</span>
        ${d!==null ? cphIconSvg(d, 34, CPH_CLR[d]) : ''}
      </div>`;
    };

    board.innerHTML =
      makeRow(t('cph_row_digits'), digitSlot) +
      makeRow(t('cph_row_icons'),  iconSlot);
  }

  const panel = document.getElementById('cph-input-panel');
  if (panel) {
    const makeKey = d =>
      `<button class="cph-calc-key" onclick="cphInputDigit(${d})"
               style="border-color:${CPH_CLR[d]}33;box-shadow:0 4px 12px rgba(0,0,0,.35),0 0 0 0 ${CPH_CLR[d]}00,inset 0 1px 0 rgba(255,255,255,.1);"
               onmouseenter="this.style.boxShadow='0 8px 20px rgba(0,0,0,.4),0 0 16px ${CPH_CLR[d]}44,inset 0 1px 0 rgba(255,255,255,.15)'"
               onmouseleave="this.style.boxShadow='0 4px 12px rgba(0,0,0,.35),0 0 0 0 ${CPH_CLR[d]}00,inset 0 1px 0 rgba(255,255,255,.1)'"
      >
         ${cphIconSvg(d, 44, CPH_CLR[d])}
         <span class="cph-calc-key-digit" style="color:${CPH_CLR[d]}">${d}</span>
       </button>`;
    panel.innerHTML =
      `<div class="cph-calc-grid">
         ${[7,8,9,4,5,6,1,2,3].map(makeKey).join('')}
         <div class="cph-calc-empty"></div>
         ${makeKey(0)}
         <button class="cph-calc-key cph-calc-del" onclick="cphClearActive()">⌫</button>
       </div>`;
  }

  const btn = document.getElementById('cipher-submit-btn');
  if (btn) btn.disabled = answer.some(a => a === null);
}

function cphSelectSlot(i) {
  const wasActive = i === cphState.activeSlot;
  cphState.activeSlot = i;
  if (wasActive && cphState.answer[i] !== null) {
    cphState.answer[i] = null; // tap filled active slot → clear it
  }
  cphSndTick();
  cphRenderRecall();
}

function cphInputDigit(d) {
  const {answer, digits} = cphState;
  const slot = cphState.activeSlot;
  if (slot < 0 || slot >= digits.length) return;
  answer[slot] = d;
  cphSndPlace();
  cphState.activeSlot = cphNextEmpty(slot);
  cphRenderRecall();
}

function cphClearActive() {
  const slot = cphState.activeSlot;
  if (slot >= 0 && slot < cphState.digits.length) {
    cphState.answer[slot] = null;
    cphSndTick();
    cphRenderRecall();
  }
}

function cphNextEmpty(from) {
  const {answer, digits} = cphState;
  for (let i = from + 1; i < digits.length; i++) if (answer[i] === null) return i;
  for (let i = 0; i < from; i++)               if (answer[i] === null) return i;
  return from;
}

// ── Submit ──
function cphSubmit() {
  const {digits, answer, level, daily} = cphState;
  if (!answer || answer.length < digits.length || answer.some(a => a === null)) return;

  let correct = 0;
  digits.forEach((d, i) => { if (answer[i] === d) correct++; });
  const pct = Math.round(correct / digits.length * 100);

  // Persist
  const saved = cphSavedData();
  if (!saved.levels) saved.levels = {};
  if (!saved.best)   saved.best   = {};
  saved.levels[level] = true;
  if (saved.best[level] === undefined || pct > saved.best[level]) saved.best[level] = pct;
  if (!saved.history) saved.history = [];
  saved.history.push({date: cphDailySeed(), pct, level, daily: !!daily});
  if (saved.history.length > 90) saved.history = saved.history.slice(-90);
  if (daily) saved.dailyDate = cphDailySeed();
  try{ localStorage.setItem(CPH_LS_KEY, JSON.stringify(saved)); }catch(e){}

  // XP — base accuracy reward + self-paced speed bonus + warm-up bonus
  if (typeof addXp === 'function') {
    let xp = Math.round(pct / 10) * (level + 2);
    if (pct >= 60 && cphState.studyElapsed > 0) {
      const perItem = cphState.studyElapsed / digits.length;
      if (perItem < 3)      xp += 8;
      else if (perItem < 5) xp += 4;
    }
    if (cphState.warmupOk) xp += 3;
    addXp(xp, 'Cipher');
  }

  // Achievement: first solve
  if (typeof unlockAch === 'function') {
    unlockAch('ach_cph_first');
    if (pct === 100) unlockAch('ach_cph_perfect');
    if (daily)       unlockAch('ach_cph_daily');
  }

  cphShowResult(pct, correct, digits.length);
}

// ── Result phase (animated combo-meter reveal) ──
function cphShowResult(pct, correct, total) {
  document.getElementById('cipher-recall').style.display = 'none';
  document.getElementById('cipher-result').style.display = '';

  cphSetTxt('cipher-result-label', 'cph_result_label');

  const {digits, answer} = cphState;

  // Render icons with their markers, but start hidden — revealed one-by-one below.
  const iconsDiv = document.getElementById('cipher-result-icons');
  if (iconsDiv) {
    iconsDiv.innerHTML = digits.map((d, i) => {
      const ok      = answer[i] === d;
      const guessed = answer[i] !== undefined ? answer[i] : -1;
      const clr     = ok ? '#34d399' : '#f87171';
      const guessHtml = (!ok && guessed >= 0)
        ? `<div class="cph-result-guess" style="color:#f87171">${cphIconSvg(guessed, 26)}</div>`
        : '';
      return `<div class="cph-result-item pending" id="cph-rev-${i}">
        ${cphIconSvg(d, 52, clr)}
        <div class="cph-result-mark" style="color:${clr}">${ok ? '✓' : '✗'}</div>
        ${guessHtml}
        <div class="cph-result-digit" style="color:${CPH_CLR[d]}">${d}</div>
      </div>`;
    }).join('');
  }

  // Hide score/story until the reveal finishes
  const scoreDiv = document.getElementById('cipher-score-display');
  const storyDiv = document.getElementById('cipher-result-story');
  if (scoreDiv) scoreDiv.innerHTML = '';
  if (storyDiv) storyDiv.style.display = 'none';
  const comboEl = document.getElementById('cipher-combo-badge');
  if (comboEl) { comboEl.textContent = ''; comboEl.className = 'cph-combo-badge'; }

  // Animate the reveal, building a combo on consecutive correct slots
  let combo = 0, maxCombo = 0;
  digits.forEach((d, i) => {
    const tid = setTimeout(() => {
      const ok = answer[i] === d;
      const el = document.getElementById('cph-rev-' + i);
      if (el) { el.classList.remove('pending'); el.classList.add('show', ok ? 'reveal-ok' : 'reveal-miss'); }
      if (ok) {
        combo++; maxCombo = Math.max(maxCombo, combo);
        cphSndCombo(combo);
        if (combo >= 2 && comboEl) {
          comboEl.textContent = '🔥 x' + combo;
          comboEl.className = 'cph-combo-badge'; void comboEl.offsetWidth; // restart anim
          comboEl.classList.add('show');
          comboEl.style.fontSize = Math.min(1.1 + combo * 0.12, 2.0) + 'rem';
        }
      } else {
        combo = 0;
        cphSndWrong();
        if (comboEl) comboEl.classList.remove('show');
      }
      if (i === digits.length - 1) {
        const t2 = setTimeout(() => { cphSndVerdict(pct); cphRevealScore(pct, correct, total, maxCombo); }, 450);
        cphTimers.push(t2);
      }
    }, 260 + i * 280);
    cphTimers.push(tid);
  });
}

function cphRevealScore(pct, correct, total, maxCombo) {
  const {digits} = cphState;
  const comboEl = document.getElementById('cipher-combo-badge');
  if (comboEl) comboEl.classList.remove('show');

  const scoreDiv = document.getElementById('cipher-score-display');
  if (scoreDiv) {
    const verdictKey = pct===100 ? 'cph_verdict_perfect' : pct>=80 ? 'cph_verdict_great' : pct>=50 ? 'cph_verdict_ok' : 'cph_verdict_try';
    const streakLine = maxCombo >= 2 ? `<div class="cph-streak-line">${t('cph_best_streak', maxCombo)}</div>` : '';
    const timeLine = cphState.studyElapsed > 0 ? ` · ⏱ ${cphState.studyElapsed}s` : '';
    scoreDiv.innerHTML = `<div class="cph-verdict">${t(verdictKey)}</div>
      <div class="cph-score-line">${correct}/${total} · ${pct}%${timeLine}</div>
      ${streakLine}`;
  }

  // Story replay — the player's own shape→link→shape chain
  const storyDiv = document.getElementById('cipher-result-story');
  if (storyDiv) {
    storyDiv.style.display = '';
    let chain = `<div class="cph-story-label">${t('cph_your_story')}</div><div class="cph-chain cph-chain-sm">`;
    digits.forEach((d, i) => {
      chain += `<span class="cph-chain-mini">${cphIconSvg(d, 30, CPH_CLR[d])}</span>`;
      if (i < digits.length - 1) {
        const lk = CPH_LINKS[cphState.links[i]];
        chain += `<span class="cph-link static sm"><span class="cph-link-emoji">${lk.emoji}</span></span>`;
      }
    });
    chain += '</div>';
    storyDiv.innerHTML = chain;
  }

  const nextBtn = document.getElementById('cipher-next-btn');
  if (nextBtn) {
    const hasNext = cphState.level < CPH_LEVELS.length - 1;
    nextBtn.style.display = hasNext && !cphState.daily ? '' : 'none';
    nextBtn.textContent = t('cph_next_btn');
  }
  const menuBtn = document.getElementById('cipher-menu-btn');
  if (menuBtn) menuBtn.textContent = t('cph_menu_btn');
}

function cphNext() {
  cphStart(Math.min(cphState.level + 1, CPH_LEVELS.length - 1));
}

// ── applyLang update hook ──
function showCipherMenuLang() {
  const menu = document.getElementById('cipher-menu');
  if (menu && menu.style.display !== 'none') {
    cphBuildRefStrip();
    cphBuildLevelGrid();
    cphBuildDailyCard();
    cphBuildStats();
  }
  cphSetTxt('cph-mode-title', 'cph_mode_title');
  cphSetTxt('cph-mode-desc',  'cph_mode_desc');
}

// ── small DOM helpers local to cipher (reuse applyLang pattern) ──
function cphSetTxt(id, key) {
  const el = document.getElementById(id); if (el) el.textContent = t(key);
}
