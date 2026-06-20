// ─── Artifacts: found on the field, kept in a stash, carried ≤2 per op ──────
// active:'self'  → used immediately on the sapper (echo)
// active:'target'→ arms a tap target (drone, probe)
// active:false   → passive, triggers automatically (detector)

// Hand-drawn SVG icons — military/tactical aesthetic, 48×48 viewBox.
const _S = {
  echo: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="31" width="8" height="11" rx="2" fill="#4a5e52"/><rect x="13" y="41" width="22" height="5" rx="2.5" fill="#2e3e34"/><path d="M8,31 Q8,10 24,8 Q40,10 40,31Z" fill="#3e5248"/><path d="M12,30 Q12,13 24,11 Q36,13 36,30Z" fill="#5e7868"/><path d="M17,30 Q17,18 24,16 Q31,18 31,30Z" fill="#8aa49e"/><line x1="24" y1="31" x2="24" y2="22" stroke="#2e3e34" stroke-width="1.5"/><circle cx="24" cy="20" r="3.5" fill="#c4a862"/><circle cx="24" cy="20" r="1.8" fill="#f0d890"/><path d="M31 8 Q41 18 31 28" stroke="#c4a862" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M34 5 Q46 18 34 31" stroke="#c4a862" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.55"/><path d="M37 2 Q48 18 37 34" stroke="#c4a862" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.28"/></svg>`,

  drone: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><line x1="14" y1="14" x2="24" y2="24" stroke="#2e4a30" stroke-width="5" stroke-linecap="round"/><line x1="34" y1="14" x2="24" y2="24" stroke="#2e4a30" stroke-width="5" stroke-linecap="round"/><line x1="14" y1="34" x2="24" y2="24" stroke="#2e4a30" stroke-width="5" stroke-linecap="round"/><line x1="34" y1="34" x2="24" y2="24" stroke="#2e4a30" stroke-width="5" stroke-linecap="round"/><ellipse cx="10" cy="10" rx="8" ry="2.5" fill="#5e8e62" opacity="0.82" transform="rotate(-45 10 10)"/><ellipse cx="38" cy="10" rx="8" ry="2.5" fill="#5e8e62" opacity="0.82" transform="rotate(45 38 10)"/><ellipse cx="10" cy="38" rx="8" ry="2.5" fill="#5e8e62" opacity="0.82" transform="rotate(45 10 38)"/><ellipse cx="38" cy="38" rx="8" ry="2.5" fill="#5e8e62" opacity="0.82" transform="rotate(-45 38 38)"/><circle cx="10" cy="10" r="3.2" fill="#c4a862"/><circle cx="38" cy="10" r="3.2" fill="#c4a862"/><circle cx="10" cy="38" r="3.2" fill="#c4a862"/><circle cx="38" cy="38" r="3.2" fill="#c4a862"/><rect x="18" y="18" width="12" height="12" rx="3" fill="#3e6640"/><rect x="20" y="20" width="8" height="8" rx="2" fill="#1e3e22"/><circle cx="24" cy="24" r="3.5" fill="#0a1408"/><circle cx="24" cy="24" r="2" fill="#1e5888"/><circle cx="22.5" cy="22.5" r="0.9" fill="#80b0e8" opacity="0.85"/></svg>`,

  probe: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M2,33 Q14,31 24,32 Q34,31 46,33 L46,48 L2,48Z" fill="#344830"/><path d="M2,33 Q14,30 24,31 Q34,30 46,33" stroke="#445a3a" stroke-width="1.5" fill="none"/><rect x="15" y="3" width="18" height="7" rx="3.5" fill="#3e5248"/><rect x="16" y="4" width="16" height="5" rx="2.5" fill="#5e7868"/><rect x="21" y="8" width="6" height="27" rx="3" fill="#6e8878"/><rect x="22.5" y="9" width="3" height="25" rx="1.5" fill="#9eb8ae"/><polygon points="24,37 21,32 27,32" fill="#c4a862"/><circle cx="24" cy="33" r="11" fill="none" stroke="#c4a862" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.65"/><circle cx="24" cy="33" r="6.5" fill="none" stroke="#c4a862" stroke-width="1" opacity="0.5"/><circle cx="24" cy="33" r="2.5" fill="none" stroke="#d86030" stroke-width="2.2"/></svg>`,

  detector: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M34,4 Q38,4 38,8 L38,18 Q38,22 34,22 L30,22" fill="none" stroke="#2e3e34" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M34,4 Q38,4 38,8 L38,18 Q38,22 34,22 L30,22" fill="none" stroke="#5e7868" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><line x1="32" y1="15" x2="12" y2="42" stroke="#3e5248" stroke-width="4.5" stroke-linecap="round"/><line x1="32" y1="15" x2="12" y2="42" stroke="#7e9a8e" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="8" cy="43" rx="10" ry="5" fill="none" stroke="#3e5248" stroke-width="3"/><ellipse cx="8" cy="43" rx="10" ry="5" fill="none" stroke="#c4a862" stroke-width="2"/><ellipse cx="8" cy="43" rx="5.5" ry="2.5" fill="none" stroke="#c4a862" stroke-width="1" opacity="0.5"/><ellipse cx="8" cy="46.5" rx="8" ry="2" fill="#c4a862" opacity="0.14"/><path d="M31 6 Q35 12 31 18" stroke="#d86030" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M34 3 Q41 12 34 21" stroke="#d86030" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.5"/></svg>`,

  arm: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="18" width="10" height="14" rx="3" fill="#2e3e34"/><circle cx="7" cy="25" r="5" fill="#1e2e24" stroke="#4e6858" stroke-width="1.5"/><circle cx="7" cy="25" r="2.5" fill="#6e8878"/><rect x="10" y="21" width="18" height="8" rx="3" fill="#4e6858"/><rect x="11" y="22" width="16" height="6" rx="2" fill="#8aa49e"/><rect x="26" y="22" width="14" height="6" rx="3" fill="#3e5850"/><rect x="27" y="23" width="12" height="4" rx="2" fill="#6e8878"/><circle cx="27" cy="25" r="3.2" fill="#c4a862" stroke="#f0d890" stroke-width="0.8"/><path d="M39,21 L47,15 L44.5,21Z" fill="#c4a862"/><path d="M39,29 L47,35 L44.5,29Z" fill="#c4a862"/><rect x="37" y="22" width="4" height="6" rx="1.5" fill="#7e9a8e"/><line x1="14" y1="23" x2="14" y2="27" stroke="#c4a862" stroke-width="1" opacity="0.6"/><line x1="18" y1="23" x2="18" y2="27" stroke="#c4a862" stroke-width="1" opacity="0.6"/><line x1="22" y1="23" x2="22" y2="27" stroke="#c4a862" stroke-width="1" opacity="0.6"/></svg>`,

  ugv: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="5" width="22" height="13" rx="3" fill="#1e3422"/><rect x="14" y="6" width="20" height="11" rx="2" fill="#142a18"/><circle cx="20" cy="11.5" r="2.5" fill="#080e0a"/><circle cx="20" cy="11.5" r="1.5" fill="#1a5080"/><circle cx="28" cy="11.5" r="2.5" fill="#080e0a"/><circle cx="28" cy="11.5" r="1.5" fill="#1a5080"/><rect x="4" y="15" width="40" height="18" rx="3" fill="#2e4a2e"/><rect x="5" y="16" width="38" height="16" rx="2" fill="#3e6040"/><rect x="8" y="21" width="32" height="5" rx="1" fill="#c4a862" opacity="0.28"/><line x1="11" y1="21" x2="8" y2="26" stroke="#c4a862" stroke-width="1.2" opacity="0.5"/><line x1="16" y1="21" x2="12" y2="26" stroke="#c4a862" stroke-width="1.2" opacity="0.5"/><line x1="21" y1="21" x2="17" y2="26" stroke="#c4a862" stroke-width="1.2" opacity="0.5"/><line x1="26" y1="21" x2="22" y2="26" stroke="#c4a862" stroke-width="1.2" opacity="0.5"/><line x1="31" y1="21" x2="27" y2="26" stroke="#c4a862" stroke-width="1.2" opacity="0.5"/><line x1="36" y1="21" x2="32" y2="26" stroke="#c4a862" stroke-width="1.2" opacity="0.5"/><rect x="2" y="29" width="44" height="14" rx="7" fill="#1e2e20"/><circle cx="9" cy="36" r="5.5" fill="#121e14" stroke="#2e4830" stroke-width="1.5"/><circle cx="9" cy="36" r="2.5" fill="#3e5840"/><circle cx="20" cy="36" r="3.5" fill="#121e14" stroke="#2e4830" stroke-width="1"/><circle cx="20" cy="36" r="1.5" fill="#3e5840"/><circle cx="30" cy="36" r="3.5" fill="#121e14" stroke="#2e4830" stroke-width="1"/><circle cx="30" cy="36" r="1.5" fill="#3e5840"/><circle cx="39" cy="36" r="5.5" fill="#121e14" stroke="#2e4830" stroke-width="1.5"/><circle cx="39" cy="36" r="2.5" fill="#3e5840"/></svg>`,

  dronex: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><ellipse cx="24" cy="45" rx="8" ry="3" fill="#d86030" opacity="0.18"/><line x1="24" y1="34" x2="24" y2="44" stroke="#d86030" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/><circle cx="24" cy="44" r="2.5" fill="#d86030" opacity="0.65"/><circle cx="24" cy="44" r="1.2" fill="#ffcc44"/><ellipse cx="24" cy="28" rx="21" ry="8" fill="#3e5850"/><ellipse cx="24" cy="27" rx="21" ry="8" fill="#4e6860"/><path d="M6,24 Q6,8 24,6 Q42,8 42,24Z" fill="#6e8888"/><path d="M9,23 Q9,11 24,9 Q39,11 39,23Z" fill="#8eaaa8"/><ellipse cx="24" cy="17" rx="9" ry="5.5" fill="#0a1c2a"/><ellipse cx="21" cy="16" rx="4" ry="3" fill="#165078" opacity="0.75"/><ellipse cx="21" cy="16" rx="2" ry="1.5" fill="#6898c8" opacity="0.5"/><ellipse cx="24" cy="27" rx="21" ry="8" fill="none" stroke="#c4a862" stroke-width="1.5" stroke-dasharray="4,4.5"/><circle cx="3" cy="27" r="3" fill="#c4a862"/><circle cx="45" cy="27" r="3" fill="#c4a862"/><circle cx="11" cy="34" r="2" fill="#c4a862" opacity="0.65"/><circle cx="37" cy="34" r="2" fill="#c4a862" opacity="0.65"/></svg>`,

  thermal: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="14" width="34" height="22" rx="4" fill="#2e4a2e"/><rect x="4" y="15" width="32" height="20" rx="3" fill="#14221a"/><circle cx="13" cy="25" r="8" fill="#0a1408" stroke="#4e7855" stroke-width="1.5"/><circle cx="13" cy="25" r="5.5" fill="#0a1020"/><circle cx="13" cy="25" r="3" fill="#ff4400" opacity="0.75"/><circle cx="11.5" cy="23.5" r="1.2" fill="#ff9966" opacity="0.6"/><rect x="24" y="17" width="11" height="16" rx="1.5" fill="#0a1408"/><rect x="25" y="18" width="3.5" height="3.5" rx="0.5" fill="#d86030" opacity="0.95"/><rect x="29.5" y="18" width="3.5" height="3.5" rx="0.5" fill="#c4a862" opacity="0.8"/><rect x="25" y="22.5" width="3.5" height="3.5" rx="0.5" fill="#35d07f" opacity="0.55"/><rect x="29.5" y="22.5" width="3.5" height="3.5" rx="0.5" fill="#d86030" opacity="0.9"/><rect x="25" y="27" width="3.5" height="3.5" rx="0.5" fill="#c4a862" opacity="0.65"/><rect x="29.5" y="27" width="3.5" height="3.5" rx="0.5" fill="#35d07f" opacity="0.4"/><rect x="37" y="19" width="8" height="13" rx="3" fill="#3e5248"/><rect x="38" y="23" width="6" height="5" rx="1.5" fill="#2e3e34"/></svg>`,

  detonator: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="3" width="32" height="7" rx="3.5" fill="#3e5248"/><rect x="9" y="4" width="30" height="5" rx="2.5" fill="#5e7868"/><rect x="20" y="8" width="8" height="18" rx="3" fill="#4e6858"/><rect x="21.5" y="9" width="5" height="16" rx="2" fill="#8aa49e"/><rect x="12" y="24" width="24" height="20" rx="4" fill="#2e4a2e"/><rect x="13" y="25" width="22" height="18" rx="3" fill="#1a3020"/><rect x="16" y="28" width="16" height="8" rx="2" fill="#d86030" opacity="0.85"/><line x1="18" y1="30" x2="22" y2="34" stroke="#c4a862" stroke-width="1.2" opacity="0.7"/><line x1="22" y1="30" x2="26" y2="34" stroke="#c4a862" stroke-width="1.2" opacity="0.7"/><line x1="26" y1="30" x2="30" y2="34" stroke="#c4a862" stroke-width="1.2" opacity="0.7"/><circle cx="24" cy="39" r="2.5" fill="#35d07f" opacity="0.9"/><path d="M36,44 Q44,44 44,36 Q44,28 38,28" stroke="#d86030" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,

  autosap: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="30" width="40" height="14" rx="7" fill="#1e2e20"/><circle cx="11" cy="37" r="5" fill="#121e14" stroke="#2e4830" stroke-width="1.5"/><circle cx="11" cy="37" r="2.5" fill="#3e5840"/><circle cx="37" cy="37" r="5" fill="#121e14" stroke="#2e4830" stroke-width="1.5"/><circle cx="37" cy="37" r="2.5" fill="#3e5840"/><circle cx="24" cy="37" r="3" fill="#2e4030" stroke="#2e4830" stroke-width="1"/><rect x="10" y="17" width="28" height="16" rx="4" fill="#2e4a30"/><rect x="11" y="18" width="26" height="14" rx="3" fill="#3e6040"/><rect x="14" y="6" width="20" height="14" rx="4" fill="#1e3422"/><rect x="15" y="7" width="18" height="12" rx="3" fill="#142a18"/><circle cx="21" cy="12" r="3.5" fill="#0a1408" stroke="#4e7855" stroke-width="1"/><circle cx="21" cy="12" r="2" fill="#1a5080"/><circle cx="19.5" cy="10.5" r="0.9" fill="#80b0e8" opacity="0.7"/><circle cx="29" cy="12" r="3" fill="#0a1408" stroke="#4e7855" stroke-width="1"/><circle cx="29" cy="12" r="1.6" fill="#d86030" opacity="0.9"/><rect x="38" y="21" width="8" height="3" rx="1.5" fill="#c4a862"/><polygon points="44,18 48,22.5 44,27" fill="#c4a862"/></svg>`,

  vest: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M8,10 L8,42 Q8,46 12,46 L36,46 Q40,46 40,42 L40,10 L34,6 L24,10 L14,6 Z" fill="#2e4a2e"/><path d="M9,11 L9,42 Q9,45 12,45 L36,45 Q39,45 39,42 L39,11 L33,7 L24,11 L15,7 Z" fill="#3e6040"/><path d="M24,11 L24,46" stroke="#2e4a2e" stroke-width="2"/><rect x="12" y="16" width="10" height="8" rx="2" fill="#1e3422"/><rect x="13" y="17" width="8" height="6" rx="1.5" fill="#4e7855"/><rect x="26" y="16" width="10" height="8" rx="2" fill="#1e3422"/><rect x="27" y="17" width="8" height="6" rx="1.5" fill="#4e7855"/><rect x="12" y="27" width="10" height="6" rx="1.5" fill="#1e3422"/><rect x="26" y="27" width="10" height="6" rx="1.5" fill="#1e3422"/><path d="M14,6 Q14,2 24,2 Q34,2 34,6" fill="#3e5248" stroke="#5e7868" stroke-width="1"/><circle cx="24" cy="13" r="3" fill="#c4a862"/><circle cx="24" cy="13" r="1.5" fill="#f0d890"/></svg>`,

  relay: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="21" y="36" width="6" height="10" rx="2" fill="#2e3e34"/><rect x="16" y="32" width="16" height="6" rx="2" fill="#3e5248"/><rect x="22" y="10" width="4" height="24" rx="2" fill="#4e6858"/><rect x="22.5" y="11" width="3" height="22" rx="1.5" fill="#8aa49e"/><rect x="14" y="10" width="20" height="5" rx="2" fill="#3e5248"/><rect x="15" y="11" width="18" height="3" rx="1.5" fill="#5e7868"/><circle cx="24" cy="9" r="3.5" fill="#c4a862"/><circle cx="24" cy="9" r="2" fill="#f0d890"/><path d="M16 16 Q10 16 8 22" stroke="#c4a862" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M32 16 Q38 16 40 22" stroke="#c4a862" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 21 Q6 21 4 30" stroke="#c4a862" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6"/><path d="M34 21 Q42 21 44 30" stroke="#c4a862" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6"/><line x1="24" y1="5" x2="24" y2="2" stroke="#c4a862" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="1" r="1.5" fill="#c4a862" opacity="0.7"/></svg>`,

  sniper: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="22" width="44" height="5" rx="2.5" fill="#2e4a2e"/><rect x="3" y="23" width="42" height="3" rx="1.5" fill="#4e7855"/><rect x="28" y="16" width="18" height="17" rx="3" fill="#1e3422"/><rect x="29" y="17" width="16" height="15" rx="2" fill="#0a1408"/><circle cx="37" cy="24.5" r="6" fill="#0a0e12" stroke="#4e7855" stroke-width="1.5"/><circle cx="37" cy="24.5" r="4" fill="#0a1220"/><line x1="37" y1="19.5" x2="37" y2="29.5" stroke="#c4a862" stroke-width="0.8" opacity="0.9"/><line x1="32" y1="24.5" x2="42" y2="24.5" stroke="#c4a862" stroke-width="0.8" opacity="0.9"/><circle cx="37" cy="24.5" r="1.2" fill="#d86030"/><rect x="6" y="18" width="10" height="13" rx="2" fill="#2e4a2e"/><rect x="7" y="19" width="8" height="11" rx="1.5" fill="#3e6040"/><rect x="18" y="14" width="4" height="6" rx="1" fill="#3e5248"/><rect x="19" y="10" width="2" height="5" rx="1" fill="#5e7868"/></svg>`,

  flashlight: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="28" width="10" height="16" rx="5" fill="#3e5248"/><rect x="20.5" y="29" width="7" height="14" rx="3.5" fill="#5e7868"/><rect x="15" y="18" width="18" height="13" rx="3" fill="#2e4a2e"/><rect x="16" y="19" width="16" height="11" rx="2" fill="#1a3020"/><ellipse cx="24" cy="16" rx="12" ry="7" fill="#3e5248"/><ellipse cx="24" cy="15" rx="12" ry="7" fill="#4e6858"/><ellipse cx="24" cy="14" rx="9" ry="5" fill="#f5e090" opacity="0.95"/><ellipse cx="24" cy="13.5" rx="6" ry="3.5" fill="#fff8c0"/><ellipse cx="22" cy="12.5" rx="2" ry="1.5" fill="#ffffff" opacity="0.6"/><path d="M12 8 Q6 12 8 20" stroke="#f5e090" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6"/><path d="M36 8 Q42 12 40 20" stroke="#f5e090" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6"/><path d="M9 5 Q2 12 5 22" stroke="#f5e090" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.3"/><path d="M39 5 Q46 12 43 22" stroke="#f5e090" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.3"/><line x1="24" y1="3" x2="24" y2="8" stroke="#f5e090" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/></svg>`,

  spotlight: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="2" width="12" height="8" rx="3" fill="#2e4a2e"/><rect x="19" y="3" width="10" height="6" rx="2" fill="#3e5248"/><rect x="14" y="8" width="20" height="14" rx="4" fill="#3e5248"/><rect x="15" y="9" width="18" height="12" rx="3" fill="#4e6858"/><path d="M4 22 L12 18 L36 18 L44 22 L42 48 L6 48 Z" fill="#f5e090" opacity="0.12"/><path d="M6 22 L13 19 L35 19 L42 22" fill="none" stroke="#f5e090" stroke-width="1" opacity="0.4"/><ellipse cx="24" cy="16" rx="10" ry="6" fill="#ffe060" opacity="0.9"/><ellipse cx="24" cy="15.5" rx="7" ry="4" fill="#fff8c0"/><ellipse cx="22" cy="14.5" rx="2.5" ry="1.8" fill="#ffffff" opacity="0.7"/><circle cx="24" cy="36" r="14" fill="#f5e090" opacity="0.08"/><circle cx="24" cy="38" r="10" fill="#f5e090" opacity="0.05"/></svg>`,
};

export const ARTIFACTS = {
  echo: {
    id: 'echo', icon: '📡', svg: _S.echo, active: 'self', radius: 2,
    en: 'Echo sounder', uk: 'Ехолокатор',
    descEn: 'Reveals mines within 2 cells of your sapper for a moment.',
    descUk: 'На кілька секунд показує міни в радіусі 2 клітинок від сапера.',
  },
  drone: {
    id: 'drone', icon: '🚁', svg: _S.drone, active: 'target',
    en: 'Recon drone', uk: 'Розвідувальний дрон',
    descEn: 'Tap a spot — scans 3×3 and flags every mine it finds.',
    descUk: 'Тицьни місце — сканує 3×3 і позначає всі знайдені міни.',
  },
  probe: {
    id: 'probe', icon: '🎯', svg: _S.probe, active: 'target',
    en: 'Safe probe', uk: 'Щуп',
    descEn: 'Tap one cell to open it safely — a mine there is flagged, not triggered.',
    descUk: 'Тицьни клітинку, щоб безпечно відкрити — міну там позначить, а не підірве.',
  },
  detector: {
    id: 'detector', icon: '🔍', svg: _S.detector, active: false,
    en: 'Metal detector', uk: 'Металодетектор',
    descEn: 'Auto-trigger (equip to activate) — saves from the first mine stepped on.',
    descUk: 'Авто-тригер (потрібно екіпірувати) — рятує від першого підриву.',
  },
  arm: {
    id: 'arm', icon: '🦾', svg: _S.arm, active: 'target', range: 2,
    en: 'Manipulator arm', uk: 'Маніпулятор',
    descEn: 'Telescoping arm reaches up to 2 cells (over a mine) and opens it safely.',
    descUk: 'Висувна штанга дотягується на 2 клітинки (через міну) і безпечно відкриває клітину.',
  },
  ugv: {
    id: 'ugv', icon: '🛻', svg: _S.ugv, active: 'target',
    en: 'High-clearance UGV', uk: 'НРК на платформі',
    descEn: 'Ride the platform across mines to a cut-off cell — mines pass under you.',
    descUk: 'Переїдь на платформі через міни до відрізаної клітинки — міни проходять під тобою.',
  },
  dronex: {
    id: 'dronex', icon: '🛸', svg: _S.dronex, active: 'target',
    en: 'Defuser drone', uk: 'Дрон-розмінувач',
    descEn: 'Flies to any cell on the field and defuses or opens it remotely.',
    descUk: 'Летить до будь-якої клітинки на полі й дистанційно знешкоджує або відкриває її.',
  },
  thermal: {
    id: 'thermal', icon: '🌡️', svg: _S.thermal, active: 'self',
    en: 'Thermoscope', uk: 'Тепловізор',
    descEn: 'Flashes all mines and overlays mine counts per row & column for 4 sec.',
    descUk: 'Підсвічує всі міни і показує їх кількість по рядках та стовпцях на 4 сек.',
  },
  detonator: {
    id: 'detonator', icon: '⚡', svg: _S.detonator, active: 'target',
    en: 'Safe detonator', uk: 'Підривник',
    descEn: 'Tap any cell — safely defuses a mine there or reveals if clear.',
    descUk: 'Тицьни клітинку — безпечно знешкоджує міну або відкриває якщо безпечна.',
  },
  autosap: {
    id: 'autosap', icon: '🤖', svg: _S.autosap, active: 'self',
    en: 'Auto-sapper', uk: 'Авто-сапер',
    descEn: 'Automatically opens 5 random safe cells anywhere on the map.',
    descUk: 'Автоматично відкриває 5 випадкових безпечних клітинок по всій карті.',
  },
  vest: {
    id: 'vest', icon: '🛡️', svg: _S.vest, active: false,
    en: 'Ballistic vest', uk: 'Бронежилет',
    descEn: 'Auto-trigger (equip to activate) — sapper survives one mine step.',
    descUk: 'Авто-тригер (потрібно екіпірувати) — сапер переживає один підрив.',
  },
  relay: {
    id: 'relay', icon: '📡', svg: _S.relay, active: 'self',
    en: 'Signal relay', uk: 'Ретранслятор',
    descEn: 'Flashes ALL mines across the entire map for 3 seconds.',
    descUk: 'Підсвічує ВСІ міни по всій карті на 3 секунди.',
  },
  sniper: {
    id: 'sniper', icon: '🎯', svg: _S.sniper, active: 'self',
    en: 'Sniper scan', uk: 'Снайпер',
    descEn: 'Reveals all safe cells in your sapper\'s row and column. Mines get flagged.',
    descUk: 'Відкриває всі безпечні клітинки в рядку і стовпці сапера. Міни позначає.',
  },
  flashlight: {
    id: 'flashlight', icon: '🔦', svg: _S.flashlight, active: 'target',
    en: 'Flashlight', uk: 'Ліхтарик',
    descEn: 'Tap any cell to reveal a 3×3 area around it (mines get flagged).',
    descUk: 'Тицьни клітинку — розкриє 3×3 навколо неї (міни позначить прапорцем).',
  },
  spotlight: {
    id: 'spotlight', icon: '💡', svg: _S.spotlight, active: 'self',
    en: 'Spotlight', uk: 'Прожектор',
    descEn: 'One-time burst — reveals a 5×5 area around your sapper.',
    descUk: 'Одноразово — розкриває область 5×5 навколо сапера.',
  },
};
export const ARTIFACT_IDS = Object.keys(ARTIFACTS);

export function artifactName(id, lang) { const a = ARTIFACTS[id]; return a ? (a[lang] || a.en) : id; }
export function artifactDesc(id, lang) { const a = ARTIFACTS[id]; return a ? (lang === 'uk' ? a.descUk : a.descEn) : ''; }

const STASH_KEY = 'miner_stash_v1';
const EQUIP_KEY = 'miner_equip_v1';

export function loadStash() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STASH_KEY)) || {}; } catch { s = {}; }
  for (const id of ARTIFACT_IDS) s[id] = Math.max(0, s[id] | 0);
  return s;
}
export function saveStash(s) { localStorage.setItem(STASH_KEY, JSON.stringify(s)); }
export function addArtifact(id, n = 1) { const s = loadStash(); s[id] = (s[id] | 0) + n; saveStash(s); return s; }
export function consumeArtifact(id) {
  const s = loadStash();
  if ((s[id] | 0) > 0) { s[id]--; saveStash(s); return true; }
  return false;
}
export function stashTotal() { const s = loadStash(); return ARTIFACT_IDS.reduce((a, id) => a + s[id], 0); }

// Equip (loadout) is an array of ≤2 artifact ids — duplicates allowed if owned.
export function loadEquip() {
  let e = [];
  try { e = JSON.parse(localStorage.getItem(EQUIP_KEY)) || []; } catch { e = []; }
  const s = loadStash(), used = {}, out = [];
  for (const id of e) {
    if (!ARTIFACTS[id] || out.length >= 2) continue;
    used[id] = (used[id] | 0) + 1;
    if (used[id] <= s[id]) out.push(id);
  }
  return out;
}
export function saveEquip(e) { localStorage.setItem(EQUIP_KEY, JSON.stringify(e.slice(0, 2))); }

// Remove one copy of id from loadout unconditionally (for the X button on bp-slot).
export function removeEquip(id) {
  const e = loadEquip();
  const i = e.indexOf(id);
  if (i >= 0) e.splice(i, 1);
  saveEquip(e);
  return e;
}

// Toggle an id in the loadout for the level picker: add a copy if there's room
// and we own enough, else remove one copy. Returns the new loadout.
export function toggleEquip(id) {
  const e = loadEquip();
  const have = loadStash()[id] | 0;
  const inLoadout = e.filter(x => x === id).length;
  if (inLoadout > 0 && (e.length >= 2 || inLoadout >= have)) {
    e.splice(e.indexOf(id), 1);            // remove one copy
  } else if (e.length < 2 && inLoadout < have) {
    e.push(id);                            // add one copy
  }
  saveEquip(e);
  return e;
}
