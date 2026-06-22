// ── Signal-jammer defusal mini-game ──────────────────────────────────────
// Player tunes a frequency slider until a clean carrier signal locks on.
import { lang } from './i18n.js?v=12';

export const JAMMER_DEVICES = {
  jammer_t1: {
    nameEn: 'Signal Jammer', nameUk: 'Сигнальний глушник',
    tier: 1, tierLabel: 'MEDIUM',
    minLevel: 18,
    freqMin: 88, freqMax: 108, unit: 'MHz',
    variants: [
      { target: 96,  hintRange: [92, 100], ruleEn: 'Scan 92–100 MHz. Tune until static clears and the lock LED turns green.', ruleUk: 'Сканuj 92–100 МГц. Налаштовуй до тих пір, поки шум не зникне і LED не позеленіє.' },
      { target: 103, hintRange: [99, 107], ruleEn: 'Scan 99–107 MHz. Tune until static clears and the lock LED turns green.', ruleUk: 'Скануй 99–107 МГц. Налаштовуй до тих пір, поки шум не зникне і LED не позеленіє.' },
      { target: 91,  hintRange: [88, 95],  ruleEn: 'Scan 88–95 MHz. Tune until static clears and the lock LED turns green.', ruleUk: 'Скануй 88–95 МГц. Налаштовуй до тих пір, поки шум не зникне і LED не позеленіє.' },
    ],
  },
  jammer_t2: {
    nameEn: 'Military Jammer', nameUk: 'Військовий глушник',
    tier: 2, tierLabel: 'HARD',
    minLevel: 25,
    freqMin: 140, freqMax: 175, unit: 'MHz',
    variants: [
      { target: 152, hintRange: [145, 160], ruleEn: 'Scan 145–160 MHz. Fine-tune for a clean carrier — tolerance is tight.', ruleUk: 'Скануй 145–160 МГц. Точне налаштування — допуск вузький.' },
      { target: 168, hintRange: [162, 175], ruleEn: 'Scan 162–175 MHz. Fine-tune for a clean carrier — tolerance is tight.', ruleUk: 'Скануй 162–175 МГц. Точне налаштування — допуск вузький.' },
      { target: 147, hintRange: [140, 155], ruleEn: 'Scan 140–155 MHz. Fine-tune for a clean carrier — tolerance is tight.', ruleUk: 'Скануй 140–155 МГц. Точне налаштування — допуск вузький.' },
    ],
  },
};

// tier 1 = ±2, tier 2 = ±1.5 (expressed as fraction of full range)
function toleranceFor(dev) { return dev.tier === 1 ? 2 : 1.5; }

// Build waveform SVG: noisy at distance, clean sine at lock
function buildWaveformSVG(freqNow, target, freqMin, freqMax) {
  const range = freqMax - freqMin;
  const dist  = Math.abs(freqNow - target);
  const noise = Math.min(1, dist / (range * 0.15)); // 0=clean, 1=full noise
  const locked = noise < 0.05;

  const pts = [];
  const W = 280, H = 56, mid = H / 2;
  for (let x = 0; x <= W; x += 2) {
    const t = x / W;
    const sine = Math.sin(t * Math.PI * 8) * (mid * 0.75);
    const n = noise * (Math.random() - 0.5) * H;
    pts.push(`${x},${mid + sine * (1 - noise * 0.7) + n}`);
  }
  const strokeColor = locked ? '#4ade80' : (noise < 0.4 ? '#fbbf24' : '#ef4444');
  const glowFilter = locked ? 'drop-shadow(0 0 4px #4ade80)' : 'none';

  return `<svg viewBox="0 0 280 56" xmlns="http://www.w3.org/2000/svg"
    style="width:100%;height:56px;background:#050e07;border-radius:8px;filter:${glowFilter}">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linejoin="round"/>
    ${locked ? `<text x="140" y="13" fill="#4ade80" font-size="9" font-family="monospace" text-anchor="middle">LOCKED</text>` : ''}
  </svg>`;
}

export function showJammer(cell, onSuccess, onFail) {
  const isUk = lang === 'uk';
  const devType = JAMMER_DEVICES[cell.device.type];
  const variant = devType.variants[cell.device.variantIdx];
  const { freqMin, freqMax, unit } = devType;
  const tol = toleranceFor(devType);

  let modal = document.getElementById('jam-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'jam-modal';
    document.body.appendChild(modal);
  }

  // Start slider at midpoint of hint range to make it obvious what to do
  let freq = Math.round((variant.hintRange[0] + variant.hintRange[1]) / 2);
  let resolved = false;
  let animFrame = null;

  function isLocked() { return Math.abs(freq - variant.target) <= tol; }

  function render() {
    const locked = isLocked();
    const dist   = Math.abs(freq - variant.target);
    const range  = freqMax - freqMin;
    const proximity = Math.max(0, 1 - dist / (range * 0.2)); // 0..1
    const tierColor = devType.tier === 1 ? '#facc15' : '#f97316';
    const rule  = isUk ? variant.ruleUk : variant.ruleEn;
    const name  = isUk ? devType.nameUk : devType.nameEn;
    const signalBars = Math.round(proximity * 5);
    const barColors = ['#ef4444','#f97316','#eab308','#84cc16','#4ade80'];
    const bars = Array.from({length: 5}, (_, i) =>
      `<span style="display:inline-block;width:8px;height:${8+i*4}px;border-radius:2px;margin:0 1px;background:${i < signalBars ? barColors[i] : '#1d3b28'};vertical-align:bottom"></span>`
    ).join('');

    const stepTxt = isUk
      ? (locked ? '✅ Сигнал захоплено — вимкни пристрій!' : `📡 Скануй ${variant.hintRange[0]}–${variant.hintRange[1]} ${unit}`)
      : (locked ? '✅ Signal locked — disable the device!'  : `📡 Scan ${variant.hintRange[0]}–${variant.hintRange[1]} ${unit}`);
    const guideStyle = locked
      ? 'background:#0d2218;border:1px solid #16a34a;color:#4ade80'
      : 'background:#0d1a1a;border:1px solid #1d4b5c;color:#67e8f9';

    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.9);backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:10px;';
    modal.innerHTML = `
<div style="background:#0d1a12;border:2px solid #2d5c3c;border-radius:16px;padding:14px;width:min(520px,96vw);max-height:92vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px;">
  <div style="display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid #1d3b28;">
    <span style="font-size:1.4rem">📡</span>
    <span style="font-size:1rem;font-weight:800;color:#f1f5f0;flex:1">${name}</span>
    <span style="font-size:.65rem;font-weight:800;letter-spacing:.1em;border-radius:10px;padding:2px 9px;background:rgba(249,115,22,.12);color:${tierColor};border:1px solid ${tierColor}40;">${devType.tierLabel}</span>
  </div>
  <div style="${guideStyle};padding:9px 13px;border-radius:10px;font-size:.82rem;font-weight:700;">${stepTxt}</div>

  <!-- Display panel -->
  <div style="background:#050e07;border:1px solid #1d3b28;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;">
    <!-- freq readout -->
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <span style="font-family:monospace;font-size:1.4rem;font-weight:900;color:${locked ? '#4ade80' : '#67e8f9'};letter-spacing:.05em">${freq.toFixed(1)} ${unit}</span>
      <div style="display:flex;align-items:flex-end;gap:2px;height:28px">${bars}</div>
    </div>
    <!-- waveform -->
    <div id="jam-wave">${buildWaveformSVG(freq, variant.target, freqMin, freqMax)}</div>
    <!-- lock LED -->
    <div style="display:flex;align-items:center;gap:8px;font-size:.75rem;color:#4b5563;">
      <span style="width:10px;height:10px;border-radius:50%;background:${locked ? '#4ade80' : '#374151'};box-shadow:${locked ? '0 0 8px #4ade80' : 'none'};flex-shrink:0"></span>
      <span style="color:${locked ? '#4ade80' : '#4b5563'}">${locked ? (isUk ? 'ЗАХОПЛЕНО' : 'LOCKED') : (isUk ? 'ПОШУК...' : 'SCANNING...')}</span>
    </div>
  </div>

  <!-- Tuning slider -->
  <div style="padding:4px 2px;">
    <div style="display:flex;justify-content:space-between;font-size:.72rem;color:#4b5563;margin-bottom:4px;">
      <span>${freqMin} ${unit}</span><span>${freqMax} ${unit}</span>
    </div>
    <input id="jam-freq" type="range" min="${freqMin * 10}" max="${freqMax * 10}" value="${freq * 10}"
      step="1" style="width:100%;accent-color:${locked ? '#4ade80' : '#67e8f9'};touch-action:manipulation">
  </div>

  <div style="font-size:.77rem;color:#4b5563;line-height:1.5;padding:2px;">${rule}</div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <button id="jam-cut" style="padding:12px;border-radius:10px;border:2px solid ${locked ? '#16a34a' : '#374151'};background:${locked ? 'rgba(22,163,74,.18)' : 'rgba(55,65,81,.2)'};color:${locked ? '#4ade80' : '#4b5563'};font-size:.9rem;font-weight:800;cursor:${locked ? 'pointer' : 'default'};touch-action:manipulation;"
      ${locked ? '' : 'disabled'}>${locked ? '📴 ' : ''}${isUk ? 'Вимкнути пристрій' : 'Disable device'}</button>
    <button id="jam-bail" style="padding:12px;border-radius:10px;border:2px solid #7f1d1d;background:rgba(127,29,29,.2);color:#f87171;font-size:.9rem;font-weight:800;cursor:pointer;touch-action:manipulation;">${isUk ? '💥 Залишити' : '💥 Abandon'}</button>
  </div>
</div>`;

    // Slider — re-render on every input for live waveform update
    document.getElementById('jam-freq').oninput = (e) => {
      freq = parseInt(e.target.value) / 10;
      render();
    };

    const cutBtn = document.getElementById('jam-cut');
    if (cutBtn && locked && !resolved) {
      cutBtn.onclick = () => { if (resolved) return; resolved = true; modal.style.display = 'none'; onSuccess({ type: 'jammer', tier: devType.tier }); };
    }
    document.getElementById('jam-bail').onclick = () => { if (resolved) return; resolved = true; modal.style.display = 'none'; onFail(); };
  }

  render();
}
