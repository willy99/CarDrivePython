// ═══════════════════════════════════════════════════
// LONG MEMORY GAME
// ═══════════════════════════════════════════════════
const LM_ITEMS = [
  // Tier 1 — word + definition
  {tier:1,
   en:{text:'Petrichor: the scent of earth after rain',check:['petrichor','scent','rain']},
   uk:{text:'Петрикор: запах землі після дощу',check:['петрикор','запах','дощу']}},
  {tier:1,
   en:{text:'Sonder: the realization that every stranger has a life as vivid and complex as your own',check:['sonder','stranger','vivid']},
   uk:{text:'Зондер: усвідомлення того, що кожен незнайомець має таке ж яскраве внутрішнє життя, як і твоє',check:['зондер','незнайомець','яскраве']}},
  {tier:1,
   en:{text:'Hiraeth: a Welsh longing for a home that may never have existed',check:['hiraeth','welsh','longing','home']},
   uk:{text:'Гіраїт: валлійська туга за домом, якого, можливо, ніколи не існувало',check:['гіраїт','валлійська','туга','домом']}},
  {tier:1,
   en:{text:'Phosphene: the light you see when you press your closed eyes',check:['phosphene','light','eyes']},
   uk:{text:'Фосфен: світло, яке ти бачиш коли натискаєш на заплющені очі',check:['фосфен','світло','очі']}},
  // Tier 2 — phrases
  {tier:2,
   en:{text:'Three cats sat on a cold stone wall at midnight, watching fog drift in from the sea.',check:['three','cats','stone','midnight','fog','sea']},
   uk:{text:'Три коти сиділи на холодному кам\'яному паркані опівночі, спостерігаючи як туман плив з моря.',check:['три','коти','кам\'яному','опівночі','туман','моря']}},
  {tier:2,
   en:{text:'The last train left at 11:47, heading south. It carried exactly one passenger.',check:['train','11:47','south','one passenger']},
   uk:{text:'Останній потяг відправився о 11:47, на південь. У ньому їхав рівно один пасажир.',check:['потяг','11:47','південь','один пасажир']}},
  {tier:2,
   en:{text:'A blue kite got tangled in the oak tree at the corner of Maple and Fifth Street.',check:['blue','kite','oak','maple','fifth']},
   uk:{text:'Блакитний змій заплутався у дубі на розі вулиць Кленової та П\'ятої.',check:['блакитний','змій','дуб','кленов','п\'ятої']}},
  {tier:2,
   en:{text:'She kept a green notebook on the left side of her desk, filled only with Tuesday\'s thoughts.',check:['green','notebook','left','desk','tuesday']},
   uk:{text:'Вона тримала зелений зошит зліва на столі, заповнений думками по вівторках.',check:['зелений','зошит','зліва','столі','вівторк']}},
  // Tier 3 — fact with number
  {tier:3,
   en:{text:'A blue whale\'s tongue alone weighs 2.7 tonnes — heavier than most family cars.',check:['whale','tongue','2.7','tonnes']},
   uk:{text:'Тільки язик синього кита важить 2,7 тонни — більше, ніж більшість легкових автомобілів.',check:['кит','язик','2,7','тонни']}},
  {tier:3,
   en:{text:'Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs — and it was still edible.',check:['honey','3,000','egyptian','edible']},
   uk:{text:'Мед не псується. Археологи знайшли 3000-річний мед у єгипетських гробницях — він досі їстівний.',check:['мед','3000','єгипетськ','їстівн']}},
  {tier:3,
   en:{text:'Sunlight takes exactly 8 minutes and 20 seconds to travel from the Sun to Earth.',check:['sunlight','8 minutes','20 seconds']},
   uk:{text:'Світло від Сонця до Землі летить рівно 8 хвилин і 20 секунд.',check:['8 хвилин','20 секунд']}},
  {tier:3,
   en:{text:'Cleopatra lived closer in time to the Moon landing (1969) than to the Great Pyramid\'s construction (2560 BC).',check:['cleopatra','1969','2560']},
   uk:{text:'Клеопатра жила ближче в часі до висадки на Місяць (1969) ніж до будівництва піраміди Хеопса (2560 до н.е.).',check:['клеопатра','1969','2560']}},
  // Tier 4 — historical fact with date
  {tier:4,
   en:{text:'The Eiffel Tower opened on March 31, 1889, taking 2 years, 2 months, and 5 days to build.',check:['eiffel','march 31','1889','2 years','2 months','5 days']},
   uk:{text:'Ейфелева вежа відкрилась 31 березня 1889 року. Будівництво тривало 2 роки, 2 місяці та 5 днів.',check:['ейфелева','1889','2 роки','2 місяці','5 днів']}},
  {tier:4,
   en:{text:'The first email was sent in 1971 by Ray Tomlinson. The message read: "QWERTYUIOP".',check:['email','1971','tomlinson','qwertyuiop']},
   uk:{text:'Перший електронний лист надіслав Рей Томлінсон у 1971 році. Текст повідомлення: «QWERTYUIOP».',check:['1971','томлінсон','qwertyuiop']}},
  {tier:4,
   en:{text:'The Wright Brothers\' first flight on December 17, 1903 lasted 12 seconds and covered 36 meters.',check:['wright','1903','12 seconds','36 meters']},
   uk:{text:'Перший політ братів Райт 17 грудня 1903 року тривав 12 секунд і покрив 36 метрів.',check:['райт','1903','12 секунд','36 метрів']}},
  {tier:4,
   en:{text:'Mozart composed his first symphony at age 8. He wrote 41 symphonies in total before dying at 35.',check:['mozart','age 8','41 symphonies','35']},
   uk:{text:'Моцарт написав першу симфонію у 8 років. До смерті у 35 він створив 41 симфонію.',check:['моцарт','8 років','41 симфонію','35']}},
  // Tier 5 — short story with details
  {tier:5,
   en:{text:'Anna left her red umbrella on seat 14B of the 7:30 train to Kyiv. A boy named Mykola kept it for exactly 3 days before returning it to the station lost-and-found.',check:['anna','red','14b','7:30','mykola','3 days']},
   uk:{text:'Анна забула червону парасольку на місці 14B потяга 7:30 до Києва. Хлопець на ім\'я Микола тримав її рівно 3 дні, а потім здав до бюро знахідок.',check:['анна','червону','14b','7:30','микола','3 дні']}},
  {tier:5,
   en:{text:'The café on Franko Street opened in 1967. It serves 43 types of coffee and closes only on Christmas Day. The original espresso machine is still in use.',check:['franko','1967','43','christmas','espresso']},
   uk:{text:'Кафе на вулиці Франка відкрилося у 1967 році. Воно подає 43 види кави і зачиняється лише на Різдво. Оригінальна кавова машина досі в роботі.',check:['франка','1967','43','різдво','кавова']}},
  {tier:5,
   en:{text:'The library had 11,247 books, but only one was checked out every day — the same detective novel, always returned by morning. Nobody knew who took it.',check:['11,247','detective','morning','nobody']},
   uk:{text:'У бібліотеці було 11 247 книг, але щодня видавалася лише одна — той самий детективний роман, завжди повернений до ранку. Ніхто не знав, хто його брав.',check:['11 247','детективний','ранку','ніхто']}},
  {tier:5,
   en:{text:'The message in the bottle was written on a Tuesday in July 1987. It was found 27 years later, 3,400 km away, by a fisherman named Thomas who had never learned to swim.',check:['tuesday','1987','27 years','3,400','thomas','swim']},
   uk:{text:'Записка у пляшці була написана у вівторок у липні 1987 року. Її знайшли 27 років по тому, за 3 400 км, рибалка на ім\'я Томас, який ніколи не вчився плавати.',check:['вівторок','1987','27 років','3 400','томас','плавати']}},
];

function lmDailyIdx() {
  const d = new Date();
  return (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % LM_ITEMS.length;
}
function lmLoadData() {
  try { return JSON.parse(localStorage.getItem('membrain_lm') || '{"items":[]}'); } catch { return {items:[]}; }
}
function lmSaveData(data) {
  try { localStorage.setItem('membrain_lm', JSON.stringify(data)); } catch {}
}
function lmNow() { return Date.now(); }
function lmTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function lmHoursAgo(ts) { return (lmNow() - ts) / 3600000; }
function lmDaysUntil(tsMs) { const diff = tsMs - lmNow(); return diff <= 0 ? 0 : Math.ceil(diff / 86400000); }

function lmItemText(item) {
  const src = item.itemIdx !== undefined ? LM_ITEMS[item.itemIdx] : null;
  if (src) return src[lang]?.text || src.en.text;
  return item.customText || '';
}
function lmItemCheck(item) {
  const src = item.itemIdx !== undefined ? LM_ITEMS[item.itemIdx] : null;
  if (src) return src[lang]?.check || src.en.check;
  return item.customCheck || [];
}
function lmItemTier(item) {
  const src = item.itemIdx !== undefined ? LM_ITEMS[item.itemIdx] : null;
  return src ? src.tier : (item.tier || 3);
}

let lmActiveItem = null;

function showLmMenu() { lmShowHub(); showScreen('screen-lm'); }

function lmShowHub() {
  ['lm-hub','lm-encode','lm-recall','lm-score-panel','lm-add'].forEach(id => {
    document.getElementById(id).style.display = id === 'lm-hub' ? '' : 'none';
  });
  document.getElementById('lm-section-title').textContent = t('lm_section_title');
  document.getElementById('lm-section-sub').textContent = t('lm_section_sub');
  document.getElementById('lm-today-lbl').textContent = t('lm_today_lbl');
  document.getElementById('lm-review-lbl').textContent = t('lm_review_lbl');
  document.getElementById('lm-diary-lbl').textContent = t('lm_diary_lbl');
  document.getElementById('lm-add-btn').textContent = t('lm_add_btn');
  lmRenderToday();
  lmRenderReview();
  lmRenderDiary();
}

function lmTierBadge(tier) {
  return `<span class="lm-tier-badge lm-tier-${tier}">${t('lm_tier_'+tier)}</span>`;
}

function lmRenderToday() {
  const data = lmLoadData();
  const idx = lmDailyIdx();
  const item = LM_ITEMS[idx];
  const text = item[lang]?.text || item.en.text;
  const rec = data.items.find(it => it.type === 'daily' && it.itemIdx === idx);
  const el = document.getElementById('lm-today-body');
  let html = lmTierBadge(item.tier);
  const preview = text.length > 90 ? text.slice(0,90)+'…' : text;
  html += `<div class="lm-item-text">${preview}</div>`;
  if (!rec) {
    html += `<button class="btn btn-primary" onclick="lmStartEncodeDaily(${idx})" style="width:100%;margin-top:10px;">${t('lm_encode_btn')}</button>`;
  } else if (rec.encodedAt && !rec.recalled) {
    const h = lmHoursAgo(rec.encodedAt);
    if (h < 12) {
      const rem = Math.ceil(12 - h);
      html += `<div style="margin-top:8px;font-size:.82rem;color:var(--text3);">✓ ${t('lm_encoded')} · ${t('lm_recall_opens_in', rem)}</div>`;
    } else {
      html += `<button class="btn btn-primary" onclick="lmStartRecallById('${rec.id}')" style="width:100%;margin-top:10px;">${t('lm_recall_btn')}</button>`;
    }
  } else if (rec.recalled) {
    const today = lmTodayStr();
    const sc = rec.history?.length ? Math.round(rec.history[rec.history.length-1].score) : 0;
    if (rec.lastRecallDate === today) {
      html += `<div style="margin-top:8px;font-size:.82rem;color:var(--text3);">✓ ${t('lm_recalled_today')} · ${sc}%</div>`;
    }
    if (rec.nextReviewAt && lmDaysUntil(rec.nextReviewAt) > 0) {
      html += `<div style="font-size:.78rem;color:var(--text3);">${t('lm_next_in', lmDaysUntil(rec.nextReviewAt))}</div>`;
    } else if (rec.nextReviewAt && lmDaysUntil(rec.nextReviewAt) <= 0) {
      html += `<button class="btn btn-primary" onclick="lmStartRecallById('${rec.id}')" style="width:100%;margin-top:10px;">${t('lm_recall_btn')}</button>`;
    }
  }
  el.innerHTML = html;
}

function lmRenderReview() {
  const data = lmLoadData();
  const now = lmNow();
  const today = lmTodayStr();
  const due = data.items.filter(it => it.recalled && it.nextReviewAt && it.nextReviewAt <= now && it.lastRecallDate !== today);
  const card = document.getElementById('lm-review-card');
  if (!due.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  const el = document.getElementById('lm-review-body');
  el.innerHTML = due.map(it => {
    const text = lmItemText(it);
    const preview = text.length > 60 ? text.slice(0,60)+'…' : text;
    return `<div class="lm-diary-row">
      <div class="lm-diary-content">
        ${lmTierBadge(lmItemTier(it))}<span class="lm-diary-due">${t('lm_due_now')}</span>
        <div class="lm-item-text" style="margin:4px 0 6px;">${preview}</div>
        <button class="btn btn-primary" onclick="lmStartRecallById('${it.id}')" style="padding:6px 16px;font-size:.8rem;">${t('lm_recall_btn')}</button>
      </div>
    </div>`;
  }).join('');
}

function lmRenderDiary() {
  const data = lmLoadData();
  const personal = data.items.filter(it => it.type === 'personal');
  const el = document.getElementById('lm-diary-body');
  if (!personal.length) {
    el.innerHTML = `<div style="font-size:.82rem;color:var(--text3);padding:6px 0;">${t('lm_diary_empty')}</div>`;
    return;
  }
  const now = lmNow();
  el.innerHTML = personal.map(it => {
    const text = lmItemText(it);
    const preview = text.length > 60 ? text.slice(0,60)+'…' : text;
    let statusHtml = '';
    if (!it.encodedAt) {
      statusHtml = `<button class="btn" onclick="lmStartEncodeById('${it.id}')" style="padding:4px 12px;font-size:.78rem;">${t('lm_encode_btn')}</button>`;
    } else if (!it.recalled) {
      const h = lmHoursAgo(it.encodedAt);
      if (h < 12) {
        statusHtml = `<span class="lm-diary-due">${t('lm_recall_opens_in', Math.ceil(12-h))}</span>`;
      } else {
        statusHtml = `<button class="btn btn-primary" onclick="lmStartRecallById('${it.id}')" style="padding:4px 12px;font-size:.78rem;">${t('lm_recall_btn')}</button>`;
      }
    } else if (it.nextReviewAt && it.nextReviewAt <= now) {
      statusHtml = `<button class="btn btn-primary" onclick="lmStartRecallById('${it.id}')" style="padding:4px 12px;font-size:.78rem;">${t('lm_recall_btn')}</button>`;
    } else {
      const sc = it.history?.length ? Math.round(it.history[it.history.length-1].score) : 0;
      const d = lmDaysUntil(it.nextReviewAt);
      statusHtml = `<span class="lm-diary-due">${sc}% · ${t('lm_next_in', d)}</span>`;
    }
    return `<div class="lm-diary-row">
      <div class="lm-diary-content">
        ${lmTierBadge(lmItemTier(it))}
        <div class="lm-item-text" style="margin:4px 0 6px;">${preview}</div>
        ${statusHtml}
      </div>
      <button class="btn" onclick="lmDeleteItem('${it.id}')" style="padding:4px 8px;font-size:.75rem;flex-shrink:0;">✕</button>
    </div>`;
  }).join('');
}

function lmStartEncodeDaily(idx) {
  const data = lmLoadData();
  let rec = data.items.find(it => it.type === 'daily' && it.itemIdx === idx);
  if (!rec) {
    rec = {id:'daily_'+idx, type:'daily', itemIdx:idx, encodedAt:null, recalled:false, nextReviewAt:null, intervalDays:1, history:[]};
    data.items.push(rec);
    lmSaveData(data);
  }
  lmActiveItem = rec;
  lmShowEncodeScreen();
}

function lmStartEncodeById(id) {
  const data = lmLoadData();
  lmActiveItem = data.items.find(it => it.id === id) || null;
  if (lmActiveItem) lmShowEncodeScreen();
}

function lmShowEncodeScreen() {
  if (!lmActiveItem) return;
  ['lm-hub','lm-encode','lm-recall','lm-score-panel','lm-add'].forEach(id => {
    document.getElementById(id).style.display = id === 'lm-encode' ? '' : 'none';
  });
  document.getElementById('lm-encode-title').textContent = t('lm_encode_title');
  document.getElementById('lm-encode-sub').textContent = t('lm_encode_sub');
  document.getElementById('lm-tier-row').innerHTML = lmTierBadge(lmItemTier(lmActiveItem));
  document.getElementById('lm-encode-text').textContent = lmItemText(lmActiveItem);
  document.getElementById('lm-tips-title').textContent = t('lm_tips_title');
  document.getElementById('lm-tips-body').innerHTML = t('lm_tips_body');
  document.getElementById('lm-memorized-btn').textContent = t('lm_memorized_btn');
  document.getElementById('lm-encode-note').textContent = t('lm_encode_note');
}

function lmFinishEncode() {
  if (!lmActiveItem) return;
  const data = lmLoadData();
  const rec = data.items.find(it => it.id === lmActiveItem.id);
  if (rec) rec.encodedAt = lmNow();
  lmSaveData(data);
  lmActiveItem = rec;
  lmShowHub();
}

function lmStartRecallById(id) {
  const data = lmLoadData();
  lmActiveItem = data.items.find(it => it.id === id) || null;
  if (lmActiveItem) lmShowRecallScreen();
}

function lmShowRecallScreen() {
  if (!lmActiveItem) return;
  const tier = lmItemTier(lmActiveItem);
  ['lm-hub','lm-encode','lm-recall','lm-score-panel','lm-add'].forEach(id => {
    document.getElementById(id).style.display = id === 'lm-recall' ? '' : 'none';
  });
  document.getElementById('lm-recall-title').textContent = t('lm_recall_title');
  document.getElementById('lm-recall-prompt').textContent = t('lm_recall_prompt_' + Math.min(tier, 3));
  document.getElementById('lm-recall-tier-row').innerHTML = lmTierBadge(tier);
  document.getElementById('lm-recall-input').value = '';
  document.getElementById('lm-submit-btn').textContent = t('lm_submit_btn');
  document.getElementById('lm-recall-back-btn').textContent = t('lm_recall_back');
  setTimeout(() => document.getElementById('lm-recall-input').focus(), 100);
}

function lmScore(userText, checkWords) {
  const lower = userText.toLowerCase();
  let matched = 0;
  for (const kw of checkWords) { if (lower.includes(kw.toLowerCase())) matched++; }
  return checkWords.length > 0 ? Math.round(matched / checkWords.length * 100) : 0;
}

function lmSubmitRecall() {
  const userText = document.getElementById('lm-recall-input').value.trim();
  if (!userText || !lmActiveItem) return;
  const checkWords = lmItemCheck(lmActiveItem);
  const score = lmScore(userText, checkWords);
  const data = lmLoadData();
  const rec = data.items.find(it => it.id === lmActiveItem.id);
  if (rec) {
    rec.recalled = true;
    rec.lastRecallDate = lmTodayStr();
    if (!rec.history) rec.history = [];
    rec.history.push({date:lmTodayStr(), score});
    if (score >= 70) {
      rec.intervalDays = Math.min(Math.max((rec.intervalDays||1) * 2, 3), 60);
    } else {
      rec.intervalDays = 1;
    }
    rec.nextReviewAt = lmNow() + rec.intervalDays * 86400000;
  }
  lmSaveData(data);
  lmActiveItem = data.items.find(it => it.id === lmActiveItem.id);
  const xp = score >= 70 ? 20 : score >= 50 ? 10 : 5;
  addXp(xp, t('lm_section_title'));
  const allRecalled = data.items.filter(it => it.recalled);
  checkAchievements(['lm_first']);
  if (allRecalled.length >= 5) checkAchievements(['lm_recall5']);
  if (score === 100) checkAchievements(['lm_perfect']);
  lmShowScoreScreen(userText, score, checkWords, xp);
}

function lmShowScoreScreen(userText, score, checkWords, xp) {
  ['lm-hub','lm-encode','lm-recall','lm-score-panel','lm-add'].forEach(id => {
    document.getElementById(id).style.display = id === 'lm-score-panel' ? '' : 'none';
  });
  document.getElementById('lm-score-title').textContent = t('lm_score_title');
  document.getElementById('lm-kw-title').textContent = t('lm_kw_title');
  document.getElementById('lm-orig-lbl').textContent = t('lm_orig_lbl');
  document.getElementById('lm-score-done-btn').textContent = t('lm_done_btn');
  document.getElementById('lm-score-orig').textContent = lmItemText(lmActiveItem);
  const color = score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const ring = document.getElementById('lm-score-ring');
  ring.style.borderColor = color; ring.style.color = color;
  ring.textContent = score >= 70 ? '✓' : score >= 50 ? '~' : '✗';
  document.getElementById('lm-score-pct').textContent = score + '%';
  document.getElementById('lm-score-msg').textContent = score >= 80 ? t('lm_score_great') : score >= 55 ? t('lm_score_ok') : t('lm_score_try');
  const lower = userText.toLowerCase();
  document.getElementById('lm-kw-row').innerHTML = checkWords.map(kw => {
    const hit = lower.includes(kw.toLowerCase());
    return `<span class="${hit?'lm-kw-hit':'lm-kw-miss'}">${hit?'✓':'✗'} ${kw}</span>`;
  }).join('');
  const days = lmActiveItem?.intervalDays || 1;
  document.getElementById('lm-next-review-lbl').textContent = t('lm_next_in', days);
  document.getElementById('lm-xp-earned').textContent = '+' + xp + ' XP';
}

function lmShowAdd() {
  ['lm-hub','lm-encode','lm-recall','lm-score-panel','lm-add'].forEach(id => {
    document.getElementById(id).style.display = id === 'lm-add' ? '' : 'none';
  });
  document.getElementById('lm-add-title').textContent = t('lm_add_title');
  document.getElementById('lm-add-sub').textContent = t('lm_add_sub');
  document.getElementById('lm-add-note').textContent = t('lm_add_note');
  document.getElementById('lm-add-cancel').textContent = t('lm_add_cancel');
  document.getElementById('lm-add-save').textContent = t('lm_add_save');
  document.getElementById('lm-add-input').value = '';
  setTimeout(() => document.getElementById('lm-add-input').focus(), 100);
}

function lmSaveNewItem() {
  const text = document.getElementById('lm-add-input').value.trim();
  if (!text) return;
  const words = text.split(/\s+/).filter(w => w.length > 3);
  const checkWords = [...new Set(words)].slice(0, 6);
  const tier = text.length < 30 ? 1 : text.length < 80 ? 2 : text.length < 200 ? 3 : 4;
  const id = 'personal_' + Date.now();
  const rec = {id, type:'personal', customText:text, customCheck:checkWords, tier, encodedAt:null, recalled:false, nextReviewAt:null, intervalDays:1, history:[]};
  const data = lmLoadData();
  data.items.push(rec);
  lmSaveData(data);
  lmActiveItem = rec;
  lmShowEncodeScreen();
}

function lmDeleteItem(id) {
  const data = lmLoadData();
  data.items = data.items.filter(it => it.id !== id);
  lmSaveData(data);
  lmRenderDiary();
}

