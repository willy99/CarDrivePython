// ═══════════════════════════════════════════════════
// applyLang — update all static DOM + re-render dynamic sections
// ═══════════════════════════════════════════════════
function applyLang() {
  const setTxt = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  const setHtml = (id, key) => { const el = document.getElementById(id); if (el) el.innerHTML = t(key); };
  // menu
  setTxt('menu-title', 'app_name');
  setTxt('menu-tagline', 'menu_tagline');
  const lt = document.getElementById('lang-toggle'); if (lt) lt.textContent = t('lang_toggle');
  // mode cards
  setTxt('wm-mode-title', 'wm_mode_title'); setTxt('wm-mode-desc', 'wm_mode_desc');
  setTxt('spot-mode-title', 'spot_mode_title'); setTxt('spot-mode-desc', 'spot_mode_desc');
  setTxt('pairs-mode-title', 'pairs_mode_title'); setTxt('pairs-mode-desc', 'pairs_mode_desc');
  setTxt('math-mode-title', 'math_mode_title'); setTxt('math-mode-desc', 'math_mode_desc');
  setTxt('diamond-mode-title', 'diamond_mode_title'); setTxt('diamond-mode-desc', 'diamond_mode_desc');
  setTxt('lm-mode-title', 'lm_mode_title'); setTxt('lm-mode-desc', 'lm_mode_desc');
  setTxt('col-mode-title',  'col_mode_title');  setTxt('col-mode-desc',  'col_mode_desc');
  setTxt('cph-mode-title',  'cph_mode_title');  setTxt('cph-mode-desc',  'cph_mode_desc');
  setTxt('wtr-mode-title',  'wtr_mode_title');  setTxt('wtr-mode-desc',  'wtr_mode_desc');
  setTxt('mtg-mode-title',  'mtg_mode_title');  setTxt('mtg-mode-desc',  'mtg_mode_desc');
  // back buttons
  document.querySelectorAll('.back-btn').forEach(b => { b.textContent = t('back_menu'); });
  // options toggle labels
  ['wm-opts-label','spot-opts-label','math-opts-label','col-opts-label','cipher-opts-label'].forEach(id => setTxt(id, 'opts_label'));
  // colombo static
  setTxt('col-section-title', 'col_section_title'); setTxt('col-section-sub', 'col_section_sub');
  setTxt('col-training-head', 'col_training_head');
  // word memory static
  setTxt('wm-section-title', 'wm_section_title'); setTxt('wm-section-sub', 'wm_section_sub');
  setTxt('wm-training-head', 'wm_training_head');
  const wmChg = document.getElementById('wm-change-btn'); if (wmChg) wmChg.textContent = t('spot_change_level');
  const wmRep = document.getElementById('wm-replay-btn'); if (wmRep) wmRep.textContent = t('math_replay');
  const wmNxt = document.getElementById('wm-next-btn'); if (wmNxt) wmNxt.textContent = t('math_next_level');
  const wmClr = document.getElementById('wm-clear-btn'); if (wmClr) wmClr.textContent = t('wm_clear');
  const wmSub = document.getElementById('wm-submit-btn'); if (wmSub) wmSub.textContent = t('wm_check');
  // spot static
  setTxt('spot-section-title', 'spot_section_title'); setTxt('spot-section-sub', 'spot_section_sub');
  setTxt('spot-choose-pack-lbl', 'spot_choose_pack'); setTxt('spot-select-level-lbl', 'spot_select_level');
  setTxt('spot-streak-lbl', 'spot_streak_lbl');
  const spChg = document.getElementById('spot-change-btn'); if (spChg) spChg.textContent = t('spot_change_level');
  // lobby static
  setTxt('lobby-title', 'pairs_lobby'); setTxt('lobby-conn-title', 'pairs_conn');
  setTxt('lobby-players-title', 'pairs_players'); setTxt('lobby-settings-title', 'pairs_settings');
  setTxt('lobby-coll-label', 'pairs_coll_label'); setTxt('lobby-grid-label', 'pairs_grid_label');
  setHtml('lobby-scoring-body', 'pairs_scoring');
  setTxt('conn-hint-prefix', 'pairs_conn_hint');
  const connBtn = document.getElementById('connect-btn'); if (connBtn) connBtn.textContent = t('pairs_connect_btn');
  const uname = document.getElementById('lobby-username'); if (uname) uname.placeholder = t('pairs_your_name');
  setTxt('invite-decline-btn', 'pairs_decline'); setTxt('invite-accept-btn', 'pairs_accept');
  setTxt('lobby-back-btn', 'pairs_lobby_btn');
  const remBtn = document.getElementById('rematch-btn'); if (remBtn && !remBtn.disabled) remBtn.textContent = t('pairs_rematch');
  // AI panel
  setTxt('ai-game-title', 'ai_game_title'); setTxt('ai-game-sub', 'ai_game_sub'); setTxt('ai-diff-lbl', 'ai_diff_lbl');
  const aiStartBtn = document.getElementById('ai-start-btn'); if (aiStartBtn) aiStartBtn.textContent = t('ai_start_btn');
  document.querySelectorAll('.ai-diff-btn').forEach(b => { b.textContent = t('ai_diff_' + b.dataset.diff); });
  // math static
  setTxt('math-section-title', 'math_section_title'); setTxt('math-section-sub', 'math_section_sub');
  setTxt('math-select-lbl', 'math_select_lbl'); setTxt('math-daily-head', 'math_daily_head');
  const mathHint = document.getElementById('math-op-hint');
  if (mathHint && mathState.opsId) selectMathOps(mathState.opsId); else if (mathHint) setTxt('math-op-hint', 'math_choose_arith');
  const mathRep = document.getElementById('math-replay-btn'); if (mathRep) mathRep.textContent = t('math_replay');
  // re-render dynamic level grids
  showWordMenu(); showSpotMenu(); showDiamondMenu(); showLmMenu(); showColomboMenu(); showCipherMenuLang(); showWaiterMenuLang(); showMeetingMenuLang(); renderMathOps(); renderMathLevels(); renderMathTricks(); renderMathStats(); renderWmStats(); renderMathEstRow(); renderDailyChallenge(); updateXpDisplay(); renderWorkoutBtn();
  setTxt('radar-title','radar_title'); setTxt('workout-lbl','workout_lbl'); setTxt('workout-result-title','workout_complete'); setTxt('workout-result-sub','workout_sub'); setTxt('workout-dismiss-btn','workout_awesome');
  updateAchBadge();
  // return to menu
  goMenu();
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
showWordMenu(); showSpotMenu();
applyLang(); // applies lang, re-renders grids, calls goMenu()
