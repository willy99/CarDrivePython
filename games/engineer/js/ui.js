import { MATERIALS } from './constants.js';

export class UI {
  constructor() {
    this.onMatChange     = () => {};
    this.onVehicleChange = () => {};
    this.onTest          = () => {};
    this.onBack          = () => {};
    this.onClear         = () => {};
    this._bind();
  }

  _bind() {
    const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
    for (const mat of ['wood', 'steel', 'cable', 'del']) {
      on('btn-' + mat, () => { this.onMatChange(mat); this._activeMat(mat); });
    }
    for (const v of ['car', 'truck', 'bus']) {
      on('veh-' + v, () => { this.onVehicleChange(v); this._activeVeh(v); });
    }
    on('btn-clear', () => this.onClear());
    on('btn-test',  () => this.onTest());
    on('btn-back',  () => { this.hideOverlay(); this.onBack(); });
    on('ov-btn',    () => { this.hideOverlay(); this.onBack(); });
  }

  _activeVeh(v) {
    ['car', 'truck', 'bus'].forEach(id => {
      document.getElementById('veh-' + id)?.classList.toggle('active', id === v);
    });
  }

  selectVehicle(v) { this._activeVeh(v); }

  _activeMat(mat) {
    ['wood', 'steel', 'cable', 'del'].forEach(id => {
      document.getElementById('btn-' + id)?.classList.toggle('active', id === mat);
    });
    const m = MATERIALS[mat];
    this.hint(m ? `${m.emoji} ${m.label} — ${m.desc}` : 'Клікни на вузол або балку щоб видалити.');
  }

  setMode(mode) {
    const build = mode === 'BUILD';
    const ids = ['btn-wood', 'btn-steel', 'btn-cable', 'btn-del', 'btn-clear', 'btn-test',
                 'veh-car', 'veh-truck', 'veh-bus', 'veh-sep'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = build ? '' : 'none';
    });
    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.style.display = build ? 'none' : '';
    document.getElementById('mode-badge').textContent =
      mode === 'BUILD' ? 'БУДІВНИЦТВО' : mode === 'TEST' ? 'ТЕСТ' : 'РЕЗУЛЬТАТ';
  }

  selectMat(mat) {
    this._activeMat(mat);
  }

  updateHUD(totalCost, edgeCount) {
    const fmt = (n, el) => { const e = document.getElementById(el); if (e) e.textContent = n; };
    fmt(totalCost,  'hud-cost');
    fmt(edgeCount,  'hud-edges');
  }

  showResult(success) {
    const ov = document.getElementById('overlay');
    ov.classList.add('show');
    document.getElementById('ov-icon').textContent  = success ? '🎉' : '💥';
    document.getElementById('ov-title').textContent = success ? 'Міст витримав!' : 'Міст обвалився!';
    document.getElementById('ov-text').textContent  = success
      ? 'Транспорт безпечно дістався іншого берега. Можеш повернутись і вдосконалити конструкцію.'
      : 'Конструкція не витримала навантаження. Подивись на червоні балки — вони лопнули першими.';
    const btn = document.getElementById('ov-btn');
    btn.textContent = success ? '↺ Назад до будівництва' : '↺ Спробувати ще раз';
    btn.className   = 'big-btn ' + (success ? 'success' : 'retry');
  }

  hideOverlay() {
    document.getElementById('overlay').classList.remove('show');
  }

  hint(text) {
    const el = document.getElementById('hint');
    if (el) el.textContent = text;
  }
}
