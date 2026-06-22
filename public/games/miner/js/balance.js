// ── Balance-circuit defusal mini-game ─────────────────────────────────────
// Player adjusts resistor sliders until the ammeter needle centres.
import { lang } from './i18n.js?v=12';

// ── Device catalogue ──────────────────────────────────────────────────────
export const BALANCE_DEVICES = {

  balance_t1: {
    nameEn: 'Wheatstone Bridge', nameUk: 'Міст Уітстона',
    tier: 1, tierLabel: 'EASY',
    minLevel: 12,
    variants: [
      { r1: 20, r2: 80, ruleEn: 'Adjust R1 and R2 until the ammeter needle centres (Δ = 0).', ruleUk: 'Регулюй R1 і R2, поки стрілка амперметра не встане в центр (Δ = 0).' },
      { r1: 65, r2: 15, ruleEn: 'Adjust R1 and R2 until the ammeter needle centres (Δ = 0).', ruleUk: 'Регулюй R1 і R2, поки стрілка амперметра не встане в центр (Δ = 0).' },
      { r1: 10, r2: 90, ruleEn: 'Adjust R1 and R2 until the ammeter needle centres (Δ = 0).', ruleUk: 'Регулюй R1 і R2, поки стрілка амперметра не встане в центр (Δ = 0).' },
    ],
  },

  balance_t2: {
    nameEn: 'Precision Bridge', nameUk: 'Точний міст',
    tier: 2, tierLabel: 'MEDIUM',
    minLevel: 20,
    // R3 is fixed (read-only), user balances R1+R2 to match R3
    variants: [
      { r1: 10, r2: 15, r3: 70, ruleEn: 'Adjust R1 and R2 so that R1 + R2 = R3 (the fixed reference).', ruleUk: 'Регулюй R1 і R2 так, щоб R1 + R2 = R3 (фіксований еталон).' },
      { r1: 50, r2: 5,  r3: 30, ruleEn: 'Adjust R1 and R2 so that R1 + R2 = R3 (the fixed reference).', ruleUk: 'Регулюй R1 і R2 так, щоб R1 + R2 = R3 (фіксований еталон).' },
      { r1: 25, r2: 40, r3: 85, ruleEn: 'Adjust R1 and R2 so that R1 + R2 = R3 (the fixed reference).', ruleUk: 'Регулюй R1 і R2 так, щоб R1 + R2 = R3 (фіксований еталон).' },
    ],
  },
};

const TOLERANCE = 3; // ±3 Ω counts as balanced

// ── SVG circuit diagram ───────────────────────────────────────────────────
function buildCircuitSVG(devType, r1, r2, r3Fixed) {
  const isT2 = devType.tier === 2;
  const balanced = isT2
    ? Math.abs((r1 + r2) - r3Fixed) <= TOLERANCE
    : Math.abs(r1 - r2) <= TOLERANCE;
  const balColor = balanced ? '#4ade80' : '#f87171';
  const needleAngle = isT2
    ? Math.max(-60, Math.min(60, ((r1 + r2) - r3Fixed) * 1.2))
    : Math.max(-60, Math.min(60, (r1 - r2) * 1.2));
  const arrowX = 160 + Math.sin(needleAngle * Math.PI / 180) * 46;
  const arrowY = 80  - Math.cos(needleAngle * Math.PI / 180) * 46;

  return `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:170px">
  <!-- power rails -->
  <line x1="20" y1="40"  x2="20"  y2="130" stroke="#f87171" stroke-width="2"/>
  <text x="9" y="88" fill="#f87171" font-size="10" font-family="monospace">+9V</text>
  <line x1="300" y1="40" x2="300" y2="130" stroke="#6b7280" stroke-width="2"/>
  <text x="295" y="88" fill="#6b7280" font-size="10" font-family="monospace">GND</text>

  <!-- branch A (top): R1 -->
  <line x1="20" y1="55" x2="72" y2="55" stroke="#c084fc" stroke-width="2"/>
  <rect x="72" y="46" width="56" height="18" rx="5" fill="#1a1a2e" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="100" y="59" fill="#c084fc" font-size="11" font-family="monospace" text-anchor="middle">R1</text>
  <line x1="128" y1="55" x2="300" y2="55" stroke="#c084fc" stroke-width="2"/>

  <!-- branch B (bottom): R2 -->
  <line x1="20" y1="115" x2="72" y2="115" stroke="#60a5fa" stroke-width="2"/>
  <rect x="72" y="106" width="56" height="18" rx="5" fill="#1a1a2e" stroke="#2563eb" stroke-width="1.5"/>
  <text x="100" y="119" fill="#60a5fa" font-size="11" font-family="monospace" text-anchor="middle">R2</text>
  <line x1="128" y1="115" x2="300" y2="115" stroke="#60a5fa" stroke-width="2"/>

  ${isT2 ? `
  <!-- branch C (mid fixed): R3 -->
  <line x1="20" y1="85" x2="72" y2="85" stroke="#fbbf24" stroke-width="2"/>
  <rect x="72" y="76" width="56" height="18" rx="5" fill="#1a1a2e" stroke="#d97706" stroke-width="1.5"/>
  <text x="100" y="89" fill="#fbbf24" font-size="11" font-family="monospace" text-anchor="middle">R3</text>
  <text x="100" y="101" fill="#78716c" font-size="9" font-family="monospace" text-anchor="middle">fixed</text>
  <line x1="128" y1="85" x2="300" y2="85" stroke="#fbbf24" stroke-width="2"/>
  ` : ''}

  <!-- ammeter / galvanometer -->
  <circle cx="160" cy="85" r="28" fill="#0d1a12" stroke="${balColor}" stroke-width="2"/>
  <text x="160" y="73" fill="${balColor}" font-size="8" font-family="monospace" text-anchor="middle">A</text>
  <!-- arc background -->
  <path d="M 118,105 A 44 44 0 0 1 202,105" fill="none" stroke="#1d3b28" stroke-width="3"/>
  <!-- needle -->
  <line x1="160" y1="85" x2="${arrowX}" y2="${arrowY}"
        stroke="${balColor}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="${arrowX}" cy="${arrowY}" r="3.5" fill="${balColor}"/>
  <!-- ticks -->
  <line x1="116" y1="85" x2="122" y2="85" stroke="#4b5563" stroke-width="1"/>
  <line x1="204" y1="85" x2="198" y2="85" stroke="#4b5563" stroke-width="1"/>
  <line x1="160" y1="41" x2="160" y2="47" stroke="#4ade80" stroke-width="1.5"/>
  <text x="160" y="100" fill="${balColor}" font-size="8" font-family="monospace" text-anchor="middle">
    ${balanced ? '⊕ 0' : (needleAngle > 0 ? '▶' : '◀')}
  </text>
</svg>`;
}

// ── Main exported function ─────────────────────────────────────────────────
export function showBalance(cell, onSuccess, onFail) {
  const isUk = lang === 'uk';
  const devType = BALANCE_DEVICES[cell.device.type];
  const variant = devType.variants[cell.device.variantIdx];
  const isT2 = devType.tier === 2;

  let modal = document.getElementById('bal-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bal-modal';
    document.body.appendChild(modal);
  }

  let r1 = variant.r1, r2 = variant.r2;
  const r3Fixed = isT2 ? variant.r3 : null;
  let resolved = false;

  function isBalanced() {
    return isT2
      ? Math.abs((r1 + r2) - r3Fixed) <= TOLERANCE
      : Math.abs(r1 - r2) <= TOLERANCE;
  }

  function render() {
    const balanced = isBalanced();
    const tierColor = devType.tier === 1 ? '#4ade80' : '#facc15';
    const rule = isUk ? variant.ruleUk : variant.ruleEn;
    const name = isUk ? devType.nameUk : devType.nameEn;
    const cutLabel = isUk ? 'Перерізати ланцюг' : 'Cut circuit';
    const r1Label = isUk ? 'Гілка A' : 'Branch A';
    const r2Label = isUk ? 'Гілка B' : 'Branch B';
    const r3Label = isUk ? 'Еталон (фікс.)' : 'Reference (fixed)';
    const stepTxt = isUk
      ? (balanced ? '✅ Баланс досягнуто — переріжи ланцюг!' : '⚖️ Вирівняй резистори до нуля на амперметрі')
      : (balanced ? '✅ Balanced — cut the circuit!' : '⚖️ Adjust resistors until ammeter reads zero');
    const stepClass = balanced ? 'bal-sg-cut' : 'bal-sg-adj';
    const guideStyle = balanced
      ? 'background:#0d2218;border:1px solid #16a34a;color:#4ade80'
      : 'background:#1a1a0d;border:1px solid #ca8a04;color:#fde047';

    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.9);backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:10px;';
    modal.innerHTML = `
<div id="bal-box" style="background:#0d1a12;border:2px solid #2d5c3c;border-radius:16px;padding:14px;width:min(520px,96vw);max-height:92vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px;">
  <div style="display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid #1d3b28;">
    <span style="font-size:1.4rem">⚖️</span>
    <span style="font-size:1rem;font-weight:800;color:#f1f5f0;flex:1">${name}</span>
    <span style="font-size:.65rem;font-weight:800;letter-spacing:.1em;border-radius:10px;padding:2px 9px;background:rgba(74,222,128,.12);color:${tierColor};border:1px solid ${tierColor}40;">${devType.tierLabel}</span>
  </div>
  <div style="${guideStyle};padding:9px 13px;border-radius:10px;font-size:.82rem;font-weight:700;">${stepTxt}</div>
  <div id="bal-circuit">${buildCircuitSVG(devType, r1, r2, r3Fixed)}</div>
  <div style="background:#0a1208;border:1px solid #1d3b28;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <label style="display:flex;align-items:center;gap:10px;font-size:.82rem;color:#c084fc;">
        <span style="width:70px;flex-shrink:0">${r1Label}  R1</span>
        <input id="bal-r1" type="range" min="0" max="100" value="${r1}" style="flex:1;accent-color:#c084fc">
        <span id="bal-r1-val" style="width:40px;text-align:right;font-family:monospace;font-size:.85rem">${r1} Ω</span>
      </label>
      <label style="display:flex;align-items:center;gap:10px;font-size:.82rem;color:#60a5fa;">
        <span style="width:70px;flex-shrink:0">${r2Label}  R2</span>
        <input id="bal-r2" type="range" min="0" max="100" value="${r2}" style="flex:1;accent-color:#60a5fa">
        <span id="bal-r2-val" style="width:40px;text-align:right;font-family:monospace;font-size:.85rem">${r2} Ω</span>
      </label>
      ${isT2 ? `
      <div style="display:flex;align-items:center;gap:10px;font-size:.82rem;color:#fbbf24;padding:5px 0;">
        <span style="width:70px;flex-shrink:0">${r3Label} R3</span>
        <div style="flex:1;height:6px;background:linear-gradient(to right,#d97706 ${r3Fixed}%,#1d3b28 ${r3Fixed}%);border-radius:3px;"></div>
        <span style="width:40px;text-align:right;font-family:monospace;font-size:.85rem">${r3Fixed} Ω</span>
      </div>` : ''}
    </div>
    <div style="text-align:center;font-size:.75rem;color:#4b5563;padding-top:4px;border-top:1px solid #1d3b28;">
      ${isT2
        ? `R1 + R2 = <span style="color:#c084fc">${r1 + r2}</span> &nbsp;|&nbsp; R3 = <span style="color:#fbbf24">${r3Fixed}</span> &nbsp;|&nbsp; Δ = <span style="color:${isBalanced()?'#4ade80':'#f87171'}">${Math.abs((r1+r2)-r3Fixed)}</span>`
        : `R1 = <span style="color:#c084fc">${r1}</span> &nbsp;|&nbsp; R2 = <span style="color:#60a5fa">${r2}</span> &nbsp;|&nbsp; Δ = <span style="color:${isBalanced()?'#4ade80':'#f87171'}">${Math.abs(r1-r2)}</span>`}
    </div>
  </div>
  <div style="font-size:.77rem;color:#4b5563;line-height:1.5;padding:6px 2px;">${rule}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <button id="bal-cut" style="padding:12px;border-radius:10px;border:2px solid ${balanced ? '#16a34a' : '#374151'};background:${balanced ? 'rgba(22,163,74,.18)' : 'rgba(55,65,81,.2)'};color:${balanced ? '#4ade80' : '#4b5563'};font-size:.9rem;font-weight:800;cursor:${balanced ? 'pointer' : 'default'};touch-action:manipulation;"
      ${balanced ? '' : 'disabled'}>✂️ ${cutLabel}</button>
    <button id="bal-bail" style="padding:12px;border-radius:10px;border:2px solid #7f1d1d;background:rgba(127,29,29,.2);color:#f87171;font-size:.9rem;font-weight:800;cursor:pointer;touch-action:manipulation;">
      ${isUk ? '💥 Залишити' : '💥 Abandon'}</button>
  </div>
</div>`;

    // Wire up sliders
    document.getElementById('bal-r1').oninput = (e) => {
      r1 = parseInt(e.target.value);
      document.getElementById('bal-r1-val').textContent = r1 + ' Ω';
      render();
    };
    document.getElementById('bal-r2').oninput = (e) => {
      r2 = parseInt(e.target.value);
      document.getElementById('bal-r2-val').textContent = r2 + ' Ω';
      render();
    };

    const cutBtn = document.getElementById('bal-cut');
    if (cutBtn && balanced && !resolved) {
      cutBtn.onclick = () => {
        if (resolved) return;
        resolved = true;
        modal.style.display = 'none';
        onSuccess({ type: 'balance', tier: devType.tier });
      };
    }
    const bailBtn = document.getElementById('bal-bail');
    if (bailBtn) {
      bailBtn.onclick = () => {
        if (resolved) return;
        resolved = true;
        modal.style.display = 'none';
        onFail();
      };
    }
  }

  render();
}
