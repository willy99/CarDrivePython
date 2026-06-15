// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function goMenu() {
  document.getElementById('radar-panel').classList.remove('show');
  document.getElementById('workout-result').classList.remove('show');
  infoPopupClose();
  showScreen('screen-menu');
}

// ── Options panel toggle ──
function toggleOpts(panelId) {
  const panel = document.getElementById(panelId);
  const arrow = document.getElementById(panelId + '-arrow');
  if (!panel) return;
  const opening = !panel.classList.contains('open');
  panel.classList.toggle('open', opening);
  if (arrow) arrow.textContent = opening ? '▲' : '▼';
  localStorage.setItem('membrain_opts_' + panelId, opening ? '1' : '0');
}
function restoreOpts(panelId) {
  const saved = localStorage.getItem('membrain_opts_' + panelId);
  const panel = document.getElementById(panelId);
  const arrow = document.getElementById(panelId + '-arrow');
  if (!panel) return;
  const open = saved === '1';
  panel.classList.toggle('open', open);
  if (arrow) arrow.textContent = open ? '▲' : '▼';
}

// ── Leave game confirmation ──
let _leaveCb = null;
function backFromGame(game) {
  const inGame = {
    wm:      () => document.getElementById('wm-memorize').style.display !== 'none' ||
                   document.getElementById('wm-recall').style.display !== 'none',
    spot:    () => document.getElementById('spot-game').style.display !== 'none',
    math:    () => document.getElementById('math-play').style.display !== 'none',
    diamond: () => document.getElementById('diamond-game').style.display !== 'none',
    col:     () => document.getElementById('col-study').style.display !== 'none' ||
                   document.getElementById('col-quiz').style.display !== 'none',
    cipher:  () => document.getElementById('cipher-study').style.display !== 'none' ||
                   document.getElementById('cipher-warmup').style.display !== 'none' ||
                   document.getElementById('cipher-recall').style.display !== 'none',
    waiter:  () => document.getElementById('wtr-study').style.display !== 'none' ||
                   document.getElementById('wtr-recall').style.display !== 'none',
    meeting: () => document.getElementById('mtg-study').style.display !== 'none' ||
                   document.getElementById('mtg-quiz').style.display  !== 'none',
    pairs:   () => true,
  };
  const check = inGame[game];
  if (check && check()) {
    _leaveCb = () => {
      if (game === 'wm')     { wmTimers.forEach(clearTimeout);  wmTimers  = []; }
      if (game === 'col')    { colTimers.forEach(clearTimeout);  colTimers = []; }
      if (game === 'cipher') { cphTimers.forEach(clearTimeout);  cphTimers = []; }
      if (game === 'waiter')  { wtrTimers.forEach(clearTimeout);  wtrTimers = []; }
      if (game === 'meeting') { mtgTimers.forEach(clearTimeout);  mtgTimers = []; }
      if (game === 'spot')    { try { clearInterval(spotTimer); spotTimer = null; } catch (e) {} }
      if (game === 'math')    { try { clearInterval(mathState.timer); } catch (e) {} }
      if (game === 'diamond') { try { if (dmdState.animRaf) cancelAnimationFrame(dmdState.animRaf); if (dmdState.progressTimer) clearInterval(dmdState.progressTimer); dmdState.animRaf = null; dmdState.progressTimer = null; } catch (e) {} }
      if (game === 'pairs') { document.getElementById('gameover-overlay').classList.remove('show'); }
      goMenu();
    };
    document.getElementById('leave-title').textContent = t('leave_title');
    document.getElementById('leave-sub').textContent = t('leave_sub');
    document.getElementById('leave-stay-btn').textContent = t('leave_stay');
    document.getElementById('leave-leave-btn').textContent = t('leave_leave');
    document.getElementById('leave-popup').classList.add('show');
  } else {
    goMenu();
  }
}
function leaveCancel() {
  document.getElementById('leave-popup').classList.remove('show');
  _leaveCb = null;
}
function leaveConfirm() {
  document.getElementById('leave-popup').classList.remove('show');
  const cb = _leaveCb; _leaveCb = null;
  if (cb) cb();
}

// ── Info popup ──
let _infoPopupOkCb = null;
function showInfoPopup(title, bodyHtml, okCb) {
  document.getElementById('info-popup-title').textContent = title;
  document.getElementById('info-popup-body').innerHTML = bodyHtml;
  document.getElementById('info-popup-ok').textContent = t('info_got_it');
  _infoPopupOkCb = okCb || null;
  document.getElementById('info-popup').classList.add('show');
}
function infoPopupClose() {
  document.getElementById('info-popup').classList.remove('show');
  _infoPopupOkCb = null;
}
function infoPopupOk() {
  const cb = _infoPopupOkCb;
  infoPopupClose();
  if (cb) cb();
}
function showGameInfo(game) {
  showInfoPopup(t('info_' + game + '_title'), t('info_' + game + '_body'));
}

