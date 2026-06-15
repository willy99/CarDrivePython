// ═══════════════════════════════════════════════════
// COLOMBO — detective eyewitness (procedural scenes)
// ═══════════════════════════════════════════════════
function colMulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function colShade(hex,f){const n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;r=Math.min(255,Math.round(r*f));g=Math.min(255,Math.round(g*f));b=Math.min(255,Math.round(b*f));return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}

const COL_COLORS=[['red','#c0392b'],['blue','#2563eb'],['green','#2e8b57'],['yellow','#e1b12c'],['purple','#7c4ddb'],['orange','#e07b1a'],['white','#e9edf2'],['black','#2c2c34'],['brown','#7a5230'],['pink','#d96ba8'],['teal','#17a2a2'],['gray','#8a94a0']];
const COL_HAIR=[['black','#2b2b30'],['brown','#5b3a22'],['blonde','#d9b25a'],['gray','#9a9aa0'],['red','#a8431f'],['white','#e3e3e8']];
const COL_SKIN=['#f1c9a5','#e0a878','#c68642','#8d5524','#4a2e1a'];
const COL_HELD=[
  'cup','bottle','vase','book','candle','glass','phone','key','envelope','knife',
  'magnifier', 'camera', 'drone', 'cezve', 'whistle', 'oscilloscope', 'watch'
];
const COL_OUTSIDE=['moon','tree','rain','city','watcher'];
const COL_PAINT=['portrait','landscape','ship','abstract'];
const COL_SETTINGS={
  lounge:{wall:'#3a3550',floor:'#5a4434'},
  study: {wall:'#46382c',floor:'#4a3526'},
  cafe:  {wall:'#43505a',floor:'#6b5038'},
  hotel: {wall:'#4a3a44',floor:'#574033'},
  office:{wall:'#36424e',floor:'#52555c'},
};
const COL_SETTING_KEYS=Object.keys(COL_SETTINGS);

const COL_LEVELS=[
  {len:11000,people:[1,2],objects:3,questions:4,secret:false},
  {len:9000, people:[1,2],objects:4,questions:5,secret:false},
  {len:8000, people:[1,3],objects:4,questions:5,secret:true},
  {len:6500, people:[2,3],objects:5,questions:6,secret:true},
  {len:5500, people:[2,3],objects:5,questions:6,secret:true},
  {len:4500, people:[2,4],objects:6,questions:7,secret:true},
  {len:4000, people:[2,4],objects:6,questions:7,secret:true},
  {len:3200, people:[3,4],objects:7,questions:8,secret:true},
];

let colLevel = 0;
let colAnsStyle = localStorage.getItem('membrain_col_ans') || 'choice';
let colSecretOpt = localStorage.getItem('membrain_col_secret') !== 'off';
let colTimers = [];
let colQuiz = null;
let _colGid = 0;

function colCfg(lvIdx){
  const lv = COL_LEVELS[lvIdx] || COL_LEVELS[COL_LEVELS.length-1];
  return {...lv, secret: lv.secret && colSecretOpt, settings: COL_SETTING_KEYS, lvIdx};
}

// ── scene model from seed ──
function colBuild(seed, cfg){
  const rng = colMulberry(seed >>> 0);
  const rnd = ()=>rng();
  const pick = a=>a[Math.floor(rnd()*a.length)];
  const chance = p=>rnd()<p;
  const setting = pick(cfg.settings);
  const pal = COL_SETTINGS[setting];
  const timeOfDay = pick(['day','day','dusk','night']);
  const nPeople = cfg.people[0] + Math.floor(rnd()*(cfg.people[1]-cfg.people[0]+1));
  const people=[];
  for(let i=0;i<nPeople;i++){
    people.push({
      skin: pick(COL_SKIN), hair: pick(COL_HAIR), hairStyle: Math.floor(rnd()*4),
      shirt: pick(COL_COLORS), tie: chance(.32)?pick(COL_COLORS):null,
      glasses: chance(.3), mustache: chance(.22),
      holding: chance(.4)?pick(COL_HELD):null,
    });
  }
  const clock = {present: chance(.82), h:1+Math.floor(rnd()*12), m:pick([0,15,30,45])};
  const outside = cfg.secret ? pick(['moon','tree','watcher','rain','city','watcher']) : pick(['moon','tree','rain','city']);
  const windo = {present: chance(.85), outside, watcher: pick(COL_COLORS)};
  const painting = {present: chance(.7), subject: pick(COL_PAINT), frame: pick([['gold','#caa24a'],['black','#1f1f26'],['brown','#6a4a2c']])};
let mirror = {present:false, reveals:null};
  if(cfg.secret && chance(.8)){
    // Calculate true physical geometric reflection of the clock
    const totalM = (clock.h % 12) * 60 + clock.m;
    const reflM = (720 - totalM) % 720;
    const mirH = Math.floor(reflM / 60) || 12;
    const mirM = reflM % 60;

    mirror = {present:true, reveals:{type: pick(['person','object','clock']),
      personShirt: pick(COL_COLORS), object: pick(COL_HELD),
      clockH: mirH, clockM: mirM}};
  } else if(chance(.4)){ mirror = {present:true, reveals:null}; }
  const door = {present: chance(.72), open: chance(.5), color: pick([['red','#9c3b32'],['white','#d8d8de'],['brown','#6a4a2c'],['blue','#34557a'],['green','#2e6b50']])};
  const nObj = 2 + Math.floor(rnd()*Math.max(1,cfg.objects-1));
  const bag=[...COL_HELD]; const objects=[];
  for(let i=0;i<nObj && bag.length;i++){ const t=bag.splice(Math.floor(rnd()*bag.length),1)[0]; objects.push({type:t, color:pick(COL_COLORS)}); }
  const plant = chance(.6), lamp = chance(.5), pet = chance(.3)?pick(['cat','dog']):null, rug = {present:chance(.7), color:pick(COL_COLORS)};
  let clue = {type:'none', color:pick(COL_COLORS), object:pick(COL_HELD)};
  if(cfg.secret){ clue = {type:pick(['footprints','spill','dropped','none']), color:pick(COL_COLORS), object:pick(COL_HELD)}; }
  return {seed,setting,pal,timeOfDay,people,clock,window:windo,painting,mirror,door,table:{objects},plant,lamp,pet,rug,clue,cfg};
}

// ── object drawer (sits on baseline yb) ──
function colObj(type,x,yb,hex){
  const d=colShade(hex,.7);
  switch(type){
    case 'cup': return `<ellipse cx="${x}" cy="${yb}" rx="16" ry="4" fill="${d}"/><rect x="${x-12}" y="${yb-20}" width="24" height="20" rx="5" fill="${hex}"/><path d="M${x+12} ${yb-16} q10 2 10 9 q0 6 -8 7" fill="none" stroke="${hex}" stroke-width="3"/>`;
    case 'bottle': return `<rect x="${x-9}" y="${yb-30}" width="18" height="30" rx="6" fill="${hex}"/><rect x="${x-4}" y="${yb-44}" width="8" height="16" fill="${colShade(hex,.85)}"/><rect x="${x-5}" y="${yb-48}" width="10" height="5" rx="2" fill="${d}"/>`;
    case 'vase': return `<path d="M${x-13} ${yb-32} q3 18 0 32 h26 q-3 -14 0 -32 q-13 6 -26 0 z" fill="${hex}"/><ellipse cx="${x}" cy="${yb-32}" rx="13" ry="4" fill="${colShade(hex,1.15)}"/>`;
    case 'book': return `<rect x="${x-18}" y="${yb-9}" width="36" height="9" rx="1" fill="${hex}"/><rect x="${x-18}" y="${yb-22}" width="34" height="13" fill="${colShade(hex,1.1)}" transform="rotate(-7 ${x} ${yb-15})"/><rect x="${x-15}" y="${yb-21}" width="28" height="2" fill="#fff" opacity=".7" transform="rotate(-7 ${x} ${yb-15})"/>`;
    case 'candle': return `<rect x="${x-5}" y="${yb-6}" width="10" height="6" rx="2" fill="${d}"/><rect x="${x-3}" y="${yb-30}" width="6" height="24" fill="${hex}"/><ellipse cx="${x}" cy="${yb-36}" rx="4" ry="7" fill="#ffd24a"/><ellipse cx="${x}" cy="${yb-35}" rx="2" ry="4" fill="#ff7a18"/>`;
    case 'glass': return `<path d="M${x-9} ${yb-32} q9 14 9 14 q0 0 9 -14 z" fill="${hex}" opacity=".82"/><rect x="${x-1.5}" y="${yb-18}" width="3" height="14" fill="#cdd3da"/><ellipse cx="${x}" cy="${yb-3}" rx="9" ry="3" fill="#cdd3da"/>`;
    case 'key': return `<circle cx="${x-9}" cy="${yb-8}" r="8" fill="none" stroke="${hex}" stroke-width="4"/><rect x="${x-2}" y="${yb-10}" width="20" height="4" fill="${hex}"/><rect x="${x+12}" y="${yb-6}" width="4" height="6" fill="${hex}"/><rect x="${x+6}" y="${yb-6}" width="3" height="6" fill="${hex}"/>`;
    case 'envelope': return `<rect x="${x-18}" y="${yb-14}" width="36" height="24" rx="2" fill="${hex}"/><path d="M${x-18} ${yb-14} L${x} ${yb-1} L${x+18} ${yb-14}" fill="none" stroke="${d}" stroke-width="2"/>`;

    // ── Fixed Objects ──
    case 'phone': return `<rect x="${x-10}" y="${yb-32}" width="20" height="32" rx="3" fill="${hex}"/><rect x="${x-8}" y="${yb-30}" width="16" height="26" rx="1" fill="#111"/><circle cx="${x}" cy="${yb-2}" r="1.5" fill="${d}"/>`;
    case 'knife': return `<rect x="${x}" y="${yb-6}" width="16" height="5" rx="1" fill="${d}"/><path d="M${x} ${yb-6} L${x-20} ${yb-1} L${x} ${yb-1} z" fill="#cfd6dd"/><circle cx="${x+4}" cy="${yb-3.5}" r="1" fill="#111" opacity="0.3"/><circle cx="${x+12}" cy="${yb-3.5}" r="1" fill="#111" opacity="0.3"/>`;

    // ── New Objects ──
    case 'magnifier': return `<rect x="${x-12}" y="${yb-6}" width="14" height="4" rx="2" fill="${hex}" transform="rotate(45 ${x-12} ${yb-6})"/><circle cx="${x+2}" cy="${yb-16}" r="10" fill="${colShade(hex, 1.2)}" stroke="${d}" stroke-width="3"/><path d="M${x-2} ${yb-20} Q${x+4} ${yb-22} ${x+6} ${yb-14}" fill="none" stroke="#fff" stroke-width="2" opacity="0.6"/>`;
    case 'camera': return `<rect x="${x-14}" y="${yb-20}" width="28" height="20" rx="3" fill="${d}"/><rect x="${x-10}" y="${yb-22}" width="8" height="4" rx="1" fill="${hex}"/><circle cx="${x}" cy="${yb-10}" r="7" fill="${hex}"/><circle cx="${x}" cy="${yb-10}" r="4" fill="#111"/><circle cx="${x-8}" cy="${yb-16}" r="1.5" fill="#fff" opacity="0.8"/>`;
    case 'drone': return `<rect x="${x-14}" y="${yb-4}" width="28" height="2" fill="${d}"/><path d="M${x-14} ${yb-4} L${x-8} ${yb-12} L${x+8} ${yb-12} L${x+14} ${yb-4}" fill="none" stroke="${hex}" stroke-width="2"/><rect x="${x-5}" y="${yb-14}" width="10" height="6" rx="1" fill="${d}"/><ellipse cx="${x-14}" cy="${yb-12}" rx="8" ry="1.5" fill="#a0a0a0" opacity="0.7"/><ellipse cx="${x+14}" cy="${yb-12}" rx="8" ry="1.5" fill="#a0a0a0" opacity="0.7"/><rect x="${x-1}" y="${yb-16}" width="2" height="4" fill="#cf2020"/>`;
    case 'cezve': return `<path d="M${x-10} ${yb} L${x-6} ${yb-20} L${x+6} ${yb-20} L${x+10} ${yb} z" fill="${hex}"/><path d="M${x+6} ${yb-18} L${x+24} ${yb-32}" stroke="${d}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="${x}" cy="${yb}" rx="10" ry="3" fill="${colShade(hex,0.8)}"/><ellipse cx="${x}" cy="${yb-20}" rx="6" ry="2" fill="${colShade(hex,1.2)}"/>`;
    case 'whistle': return `<rect x="${x-16}" y="${yb-6}" width="32" height="4" rx="1" fill="${d}"/><rect x="${x-18}" y="${yb-7}" width="6" height="6" rx="1" fill="${hex}"/><path d="M${x-18} ${yb-7} L${x-22} ${yb-4} L${x-18} ${yb-1} z" fill="${d}"/><circle cx="${x-2}" cy="${yb-4}" r="1" fill="#222"/><circle cx="${x+2}" cy="${yb-4}" r="1" fill="#222"/><circle cx="${x+6}" cy="${yb-4}" r="1" fill="#222"/><circle cx="${x+10}" cy="${yb-4}" r="1" fill="#222"/>`;
    case 'oscilloscope': return `<rect x="${x-14}" y="${yb-24}" width="28" height="24" rx="2" fill="${d}"/><rect x="${x-12}" y="${yb-22}" width="16" height="14" fill="#1c2833"/><path d="M${x-12} ${yb-15} Q${x-8} ${yb-20} ${x-4} ${yb-15} T${x+4} ${yb-15}" fill="none" stroke="#2ecc71" stroke-width="1.5"/><circle cx="${x+9}" cy="${yb-18}" r="2" fill="${hex}"/><circle cx="${x+9}" cy="${yb-12}" r="2" fill="${hex}"/><rect x="${x-10}" y="${yb-6}" width="4" height="2" fill="${hex}"/><rect x="${x-4}" y="${yb-6}" width="4" height="2" fill="${hex}"/>`;
    case 'watch': return `<rect x="${x-12}" y="${yb-8}" width="24" height="6" rx="1" fill="${d}"/><circle cx="${x}" cy="${yb-12}" r="10" fill="${hex}"/><circle cx="${x}" cy="${yb-12}" r="8" fill="#111"/><circle cx="${x}" cy="${yb-12}" r="6" fill="none" stroke="#555" stroke-width="1"/><line x1="${x}" y1="${yb-12}" x2="${x+4}" y2="${yb-15}" stroke="#fff" stroke-width="1.5"/><line x1="${x}" y1="${yb-12}" x2="${x}" y2="${yb-8}" stroke="#fff" stroke-width="1.5"/>`;

    default: return '';
  }
}

// ── window outside view (clipped region) ──
function colWindowView(m,U,ix,iy,iw,ih){
  const o=m.window.outside; const P=[];
  const sky = o==='rain'?'#3a4250':(o==='tree'?'#7fa8c9':(o==='city'||o==='moon'||o==='watcher')?'#10162e':'#7fa8c9');
  P.push(`<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="${sky}"/>`);
  if(o==='moon'){ P.push(`<circle cx="${ix+iw*0.68}" cy="${iy+ih*0.3}" r="16" fill="#f4f0d8"/><circle cx="${ix+iw*0.62}" cy="${iy+ih*0.28}" r="13" fill="${sky}"/>`); for(let i=0;i<6;i++) P.push(`<circle cx="${ix+(i*53%iw)+8}" cy="${iy+((i*37)%(ih-20))+8}" r="1.4" fill="#fff" opacity=".8"/>`); }
  else if(o==='tree'){ P.push(`<rect x="${ix+iw*0.55}" y="${iy+ih*0.5}" width="9" height="${ih*0.5}" fill="#5b3a22"/><circle cx="${ix+iw*0.6}" cy="${iy+ih*0.42}" r="26" fill="#2e7d44"/><circle cx="${ix+iw*0.35}" cy="${iy+ih*0.55}" r="18" fill="#36994f"/>`); }
  else if(o==='rain'){ for(let i=0;i<22;i++) P.push(`<line x1="${ix+(i*29%iw)}" y1="${iy+(i*23%ih)}" x2="${ix+(i*29%iw)-6}" y2="${iy+(i*23%ih)+12}" stroke="#9fb3c8" stroke-width="1.4" opacity=".6"/>`); }
  else if(o==='city'){ for(let i=0;i<5;i++){ const bx=ix+i*(iw/5); const bh=ih*(0.4+((i*13)%5)/10); P.push(`<rect x="${bx}" y="${iy+ih-bh}" width="${iw/5-3}" height="${bh}" fill="#1b2747"/>`); for(let w=0;w<6;w++) P.push(`<rect x="${bx+4+(w%2)*10}" y="${iy+ih-bh+8+Math.floor(w/2)*14}" width="5" height="6" fill="${((i+w)%2)?'#ffd76a':'#2a3a5e'}"/>`); } }
  else if(o==='watcher'){ const wc=m.window.watcher[1]; const fx=ix+iw*0.42, baseY=iy+ih, hY=iy+ih*0.36;
    P.push(`<circle cx="${ix+iw*0.8}" cy="${iy+ih*0.2}" r="10" fill="#e8e2c4"/>`);
    P.push(`<path d="M${fx-22} ${baseY} L${fx-17} ${iy+ih*0.52} Q${fx} ${iy+ih*0.44} ${fx+17} ${iy+ih*0.52} L${fx+22} ${baseY} Z" fill="${wc}" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/>`);
    P.push(`<circle cx="${fx}" cy="${hY}" r="12" fill="#14141b"/>`);
    P.push(`<ellipse cx="${fx}" cy="${hY-8}" rx="19" ry="5" fill="#0e0e14"/><rect x="${fx-8}" y="${hY-19}" width="16" height="12" rx="3" fill="#0e0e14"/>`); }
  return P.join('');
}

// ── setting-specific background decor ──
// ── setting-specific background decor ──
// ── setting-specific background decor ──
function colSettingDecor(m, P) {
  const s = m.setting;
  if (s === 'office') {
    // Filing Cabinet
    P.push(`<rect x="220" y="250" width="40" height="80" rx="2" fill="#7f8c8d" stroke="#34495e" stroke-width="2"/>`);
    P.push(`<rect x="225" y="255" width="30" height="22" fill="#95a5a6"/><rect x="235" y="264" width="10" height="4" fill="#2c3e50"/>`);
    P.push(`<rect x="225" y="280" width="30" height="22" fill="#95a5a6"/><rect x="235" y="289" width="10" height="4" fill="#2c3e50"/>`);
    P.push(`<rect x="225" y="305" width="30" height="22" fill="#95a5a6"/><rect x="235" y="314" width="10" height="4" fill="#2c3e50"/>`);

    // Computer Table
    P.push(`<rect x="80" y="285" width="120" height="6" rx="1" fill="#bdc3c7"/>`);
    P.push(`<rect x="85" y="291" width="6" height="39" fill="#2c3e50"/><rect x="189" y="291" width="6" height="39" fill="#2c3e50"/>`);

    // Desktop Monitor
    P.push(`<rect x="115" y="255" width="40" height="26" rx="2" fill="#34495e"/>`);
    P.push(`<rect x="117" y="257" width="36" height="22" fill="#ecf0f1"/>`);
    P.push(`<rect x="133" y="281" width="4" height="4" fill="#34495e"/><rect x="125" y="284" width="20" height="2" fill="#2c3e50"/>`);

    // Notebooks on the desk
    P.push(`<rect x="90" y="280" width="16" height="5" rx="1" fill="#e74c3c" transform="rotate(-4 90 280)"/>`);
    P.push(`<rect x="92" y="274" width="16" height="5" rx="1" fill="#f1c40f" transform="rotate(2 92 274)"/>`);

    // Office Chair
    P.push(`<rect x="125" y="295" width="6" height="25" fill="#2c3e50"/>`);
    P.push(`<path d="M115 320 L141 320 L138 325 L118 325 Z" fill="#34495e"/>`);
    P.push(`<rect x="115" y="270" width="26" height="22" rx="4" fill="#2980b9" opacity="0.9"/>`);
    P.push(`<rect x="112" y="290" width="32" height="6" rx="3" fill="#34495e"/>`);
  } else if (s === 'cafe') {
    // Espresso Machine on a low back-counter
    P.push(`<rect x="96" y="250" width="92" height="80" rx="4" fill="#1c1006" stroke="#4a3418" stroke-width="2"/>`);
    P.push(`<rect x="100" y="254" width="84" height="40" rx="2" fill="#120c04"/>`);
    P.push(`<circle cx="124" cy="274" r="12" fill="#201408" stroke="#b8924c" stroke-width="2"/>`);
    P.push(`<rect x="150" y="260" width="28" height="20" rx="2" fill="#2c1c0a"/>`);
    P.push(`<circle cx="158" cy="268" r="4" fill="#d97706" opacity=".9"/><circle cx="170" cy="268" r="4" fill="#2e8b57" opacity=".9"/>`);
    P.push(`<rect x="112" y="290" width="32" height="4" rx="1" fill="#38260e"/>`);
    P.push(`<line x1="122" y1="294" x2="120" y2="304" stroke="#38260e" stroke-width="2" stroke-linecap="round"/>`);
    P.push(`<line x1="130" y1="294" x2="128" y2="304" stroke="#38260e" stroke-width="2" stroke-linecap="round"/>`);

    // Cafe Bar Counter
    P.push(`<rect x="84" y="310" width="160" height="20" rx="2" fill="#5a3c1e" stroke="#6e4e2a" stroke-width="1.5"/>`);
    P.push(`<rect x="84" y="325" width="160" height="5" fill="#2e1808"/>`);

    // Bar Stool
    P.push(`<path d="M200 330 L194 400 L198 400 L204 330 Z" fill="#7f8c8d"/><path d="M216 330 L222 400 L218 400 L212 330 Z" fill="#7f8c8d"/><ellipse cx="208" cy="330" rx="18" ry="6" fill="#e67e22"/>`);
  } else if (s === 'hotel') {
    // Velvet Lobby Sofa
    P.push(`<rect x="88" y="280" width="140" height="35" rx="10" fill="#42264a" stroke="#5a3462" stroke-width="2"/>`);
    P.push(`<rect x="88" y="310" width="140" height="20" rx="8" fill="#362040"/>`);
    P.push(`<rect x="88" y="280" width="16" height="50" rx="8" fill="#3a2044"/><rect x="212" y="280" width="16" height="50" rx="8" fill="#3a2044"/>`);

    // Luggage Cart
    P.push(`<rect x="250" y="250" width="40" height="60" rx="4" fill="#2c3e50"/><rect x="258" y="240" width="24" height="10" rx="2" fill="none" stroke="#7f8c8d" stroke-width="2"/><rect x="254" y="260" width="32" height="4" fill="#34495e"/><rect x="254" y="290" width="32" height="4" fill="#34495e"/>`);
    P.push(`<rect x="240" y="310" width="60" height="6" rx="3" fill="#f1c40f"/><circle cx="250" cy="320" r="4" fill="#333"/><circle cx="290" cy="320" r="4" fill="#333"/>`);
  } else if (s === 'study') {
    // Low Bookshelf
    P.push(`<rect x="90" y="250" width="150" height="80" fill="#3e2723" stroke="#212121" stroke-width="3"/>`);
    P.push(`<rect x="90" y="286" width="150" height="4" fill="#5d4037"/>`);
    const bkCols = ['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad'];
    for(let r=0; r<2; r++) {
      let bx = 95;
      while(bx < 230) {
        let w = 8 + (bx*r)%10;
        P.push(`<rect x="${bx}" y="${256 + r*40}" width="${w}" height="${26 - (r%3)*4}" fill="${bkCols[(bx+r)%5]}"/>`);
        bx += w + 2;
      }
    }

    // Globe
    P.push(`<circle cx="280" cy="270" r="22" fill="#3498db"/><path d="M270 255 Q290 270 280 285" fill="none" stroke="#2ecc71" stroke-width="6"/><path d="M255 270 A25 25 0 0 0 305 270" fill="none" stroke="#f1c40f" stroke-width="3"/><rect x="278" y="295" width="4" height="25" fill="#f1c40f"/><ellipse cx="280" cy="320" rx="14" ry="4" fill="#f1c40f"/>`);
  } else if (s === 'lounge') {
    // Low Fireplace
    P.push(`<rect x="580" y="230" width="140" height="100" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/><rect x="570" y="220" width="160" height="10" fill="#95a5a6"/><rect x="605" y="260" width="90" height="70" rx="4" fill="#2c3e50"/>`);
    P.push(`<path d="M650 330 Q630 290 650 270 Q670 290 650 330" fill="#e74c3c"/><path d="M650 330 Q640 300 650 290 Q660 300 650 330" fill="#f1c40f"/>`);
    P.push(`<rect x="625" y="320" width="50" height="10" rx="3" fill="#5d4037" transform="rotate(8 650 325)"/><rect x="625" y="320" width="50" height="10" rx="3" fill="#4e342e" transform="rotate(-8 650 325)"/>`);
  }
}

// ── full scene renderer ──
function colRender(m){
  const U='cg'+(_colGid++); const W=800,H=500,wallH=330; const P=[];
  const pal=m.pal;
  P.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`);
  P.push(`<defs>
    <linearGradient id="${U}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colShade(pal.wall,1.18)}"/><stop offset="1" stop-color="${colShade(pal.wall,.82)}"/></linearGradient>
    <linearGradient id="${U}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colShade(pal.floor,1.12)}"/><stop offset="1" stop-color="${colShade(pal.floor,.72)}"/></linearGradient>
    <clipPath id="${U}win"><rect x="98" y="58" width="120" height="138"/></clipPath></defs>`);
  P.push(`<rect x="0" y="0" width="${W}" height="${wallH}" fill="url(#${U}w)"/>`);
  P.push(`<rect x="0" y="${wallH}" width="${W}" height="${H-wallH}" fill="url(#${U}f)"/>`);
  P.push(`<rect x="0" y="${wallH-12}" width="${W}" height="12" fill="${colShade(pal.wall,.62)}"/>`);
  for(let x=70;x<W;x+=90) P.push(`<line x1="${x}" y1="${wallH}" x2="${x-46}" y2="${H}" stroke="${colShade(pal.floor,.6)}" stroke-width="2" opacity=".35"/>`);

  // ── wall décor ──
  if(m.window.present){
    P.push(`<rect x="88" y="48" width="140" height="158" rx="4" fill="${colShade(pal.wall,.55)}"/>`);
    P.push(`<g clip-path="url(#${U}win)">${colWindowView(m,U,98,58,120,138)}</g>`);
    P.push(`<rect x="98" y="58" width="120" height="138" fill="none" stroke="${colShade(pal.wall,1.3)}" stroke-width="3"/>`);
    P.push(`<line x1="158" y1="58" x2="158" y2="196" stroke="${colShade(pal.wall,1.2)}" stroke-width="4"/><line x1="98" y1="127" x2="218" y2="127" stroke="${colShade(pal.wall,1.2)}" stroke-width="4"/>`);
  }
  if(m.painting.present){
    const fr=m.painting.frame[1], s=m.painting.subject, px=336,py=44,pw=128,ph=92;
    P.push(`<rect x="${px-7}" y="${py-7}" width="${pw+14}" height="${ph+14}" rx="3" fill="${fr}"/>`);
    P.push(`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#dfe3df"/>`);
    if(s==='portrait'){ P.push(`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#8a93a6"/><circle cx="${px+pw/2}" cy="${py+ph*0.42}" r="22" fill="#e7c6a3"/><path d="M${px+pw/2-28} ${py+ph} q28 -34 56 0 z" fill="#3a3550"/>`); }
    else if(s==='landscape'){ P.push(`<rect x="${px}" y="${py}" width="${pw}" height="${ph*0.6}" fill="#9fd0e8"/><circle cx="${px+pw*0.74}" cy="${py+ph*0.26}" r="13" fill="#ffd76a"/><path d="M${px} ${py+ph} L${px+pw*0.4} ${py+ph*0.5} L${px+pw*0.7} ${py+ph} z" fill="#3f7d44"/><path d="M${px+pw*0.45} ${py+ph} L${px+pw*0.78} ${py+ph*0.56} L${px+pw} ${py+ph} z" fill="#56994f"/>`); }
    else if(s==='ship'){ P.push(`<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#7fa8c9"/><rect x="${px}" y="${py+ph*0.62}" width="${pw}" height="${ph*0.38}" fill="#2f5f87"/><path d="M${px+pw*0.36} ${py+ph*0.62} l24 0 l-6 14 l-12 0 z" fill="#5b3a22"/><rect x="${px+pw*0.47}" y="${py+ph*0.3}" width="3" height="${ph*0.32}" fill="#3a2a1a"/><path d="M${px+pw*0.49} ${py+ph*0.32} l22 12 l-22 8 z" fill="#fff"/>`); }
    else { for(let i=0;i<5;i++) P.push(`<rect x="${px+(i*26)%pw}" y="${py+(i*31)%(ph-26)}" width="34" height="28" fill="${COL_COLORS[(i*5)%COL_COLORS.length][1]}" opacity=".85"/>`); }
  }
  if(m.clock.present){
    const cx=292,cy=86,r=28; const ha=((m.clock.h%12)/12 + m.clock.m/720)*2*Math.PI - Math.PI/2; const ma=(m.clock.m/60)*2*Math.PI - Math.PI/2;
    P.push(`<circle cx="${cx}" cy="${cy}" r="${r+4}" fill="${colShade(pal.wall,.5)}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#f6f3ea" stroke="#2a2a30" stroke-width="2.5"/>`);
    for(let i=0;i<12;i++){ const a=i/12*2*Math.PI; P.push(`<line x1="${cx+Math.cos(a)*(r-4)}" y1="${cy+Math.sin(a)*(r-4)}" x2="${cx+Math.cos(a)*(r-1)}" y2="${cy+Math.sin(a)*(r-1)}" stroke="#555" stroke-width="1.5"/>`); }
    P.push(`<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(ha)*(r*0.5)}" y2="${cy+Math.sin(ha)*(r*0.5)}" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>`);
    P.push(`<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(ma)*(r*0.8)}" y2="${cy+Math.sin(ma)*(r*0.8)}" stroke="#222" stroke-width="2" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="#222"/>`);
  }
  if(m.mirror.present){
    const mx=556,my=52,mw=116,mh=150;
    P.push(`<rect x="${mx-8}" y="${my-8}" width="${mw+16}" height="${mh+16}" rx="14" fill="#b9923f"/><rect x="${mx-4}" y="${my-4}" width="${mw+8}" height="${mh+8}" rx="11" fill="#8a6c2c"/>`);
    P.push(`<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="8" fill="#aeb9c4"/><rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="8" fill="#1b2030" opacity=".42"/>`);
    P.push(`<path d="M${mx+14} ${my} l40 0 l-${mw-8} ${mh} l-32 0 z" fill="#fff" opacity=".1"/>`);
    const rv=m.mirror.reveals;
    if(rv){
      const cx=mx+mw/2, cy=my+mh*0.5;
      if(rv.type==='person'){ P.push(`<rect x="${cx-20}" y="${cy-6}" width="40" height="${mh*0.46}" rx="14" fill="${rv.personShirt[1]}" opacity=".9"/><circle cx="${cx}" cy="${cy-22}" r="17" fill="#cf9f78" opacity=".9"/><path d="M${cx-18} ${cy-22} q18 -22 36 0 z" fill="#2b2b30" opacity=".9"/>`); }
      else if(rv.type==='object'){ P.push(`<g opacity=".92">${colObj(rv.object,cx,cy+mh*0.22,COL_COLORS[3][1])}</g>`); }
      else { const r=26; const ha=((rv.clockH%12)/12+rv.clockM/720)*2*Math.PI-Math.PI/2; const ma=(rv.clockM/60)*2*Math.PI-Math.PI/2; P.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f6f3ea" opacity=".92" stroke="#2a2a30" stroke-width="2"/><line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(ha)*r*0.5}" y2="${cy+Math.sin(ha)*r*0.5}" stroke="#222" stroke-width="3"/><line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(ma)*r*0.8}" y2="${cy+Math.sin(ma)*r*0.8}" stroke="#222" stroke-width="1.8"/>`); }
    }
  }
  // door
  if(m.door.present){
    const dx=706,dw=86,dy=120,dh=210;
    P.push(`<rect x="${dx-4}" y="${dy-6}" width="${dw+8}" height="${dh+6}" fill="${colShade(pal.wall,.5)}"/>`);
    if(m.door.open){ P.push(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" fill="#0a0a12"/><polygon points="${dx},${dy} ${dx+38},${dy+14} ${dx+38},${dy+dh-14} ${dx},${dy+dh}" fill="${m.door.color[1]}"/><polygon points="${dx},${dy} ${dx+38},${dy+14} ${dx+38},${dy+dh-14} ${dx},${dy+dh}" fill="#000" opacity=".18"/>`); }
    else { P.push(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" fill="${m.door.color[1]}"/><rect x="${dx+10}" y="${dy+16}" width="${dw-20}" height="${dh*0.4-10}" rx="3" fill="${colShade(m.door.color[1],.85)}"/><rect x="${dx+10}" y="${dy+dh*0.5}" width="${dw-20}" height="${dh*0.42}" rx="3" fill="${colShade(m.door.color[1],.85)}"/><circle cx="${dx+dw-14}" cy="${dy+dh*0.52}" r="4" fill="#e7c64a"/>`); }
  }
  // setting-specific background decor
  colSettingDecor(m, P);
  // rug
  if(m.rug.present) P.push(`<ellipse cx="400" cy="452" rx="250" ry="44" fill="${m.rug.color[1]}" opacity=".55"/><ellipse cx="400" cy="452" rx="250" ry="44" fill="none" stroke="${colShade(m.rug.color[1],1.3)}" stroke-width="3" opacity=".5"/>`);
  // plant (back-left corner)
  if(m.plant) P.push(`<rect x="44" y="360" width="40" height="46" rx="5" fill="#b5552f"/><path d="M64 360 q-30 -50 -18 -78 q14 18 18 36 q4 -30 22 -44 q2 26 -2 50 q16 -16 30 -10 q-12 22 -30 30 z" fill="#2f8a47"/>`);
  // people
  const n=m.people.length, lo=190, hi=610;
  m.people.forEach((p,i)=>{ const px = n===1?400:Math.round(lo+i*((hi-lo)/(n-1))); colPerson(P,px,p); });
  // table + objects (front)
  const tx=270,tw=260,ty=394;
  P.push(`<ellipse cx="400" cy="${ty+82}" rx="${tw/2+6}" ry="12" fill="rgba(0,0,0,.28)"/>`);
  P.push(`<rect x="${tx}" y="${ty}" width="${tw}" height="14" rx="3" fill="${colShade(pal.floor,1.25)}"/><rect x="${tx}" y="${ty+14}" width="${tw}" height="6" fill="${colShade(pal.floor,.8)}"/>`);
  P.push(`<rect x="${tx+14}" y="${ty+20}" width="12" height="62" fill="${colShade(pal.floor,.9)}"/><rect x="${tx+tw-26}" y="${ty+20}" width="12" height="62" fill="${colShade(pal.floor,.9)}"/>`);
  const objs=m.table.objects, oc=objs.length;
  objs.forEach((o,i)=>{ const ox = tx+34 + i*((tw-68)/Math.max(1,oc-1||1)); colObjEl(P,o.type,oc===1?tx+tw/2:ox,ty+2,o.color[1]); });
  // pet on floor
  if(m.pet==='cat') P.push(`<g transform="translate(150,452)">
      <ellipse cx="0" cy="4" rx="22" ry="7" fill="rgba(0,0,0,.28)"/>
      <ellipse cx="2" cy="-15" rx="16" ry="20" fill="#6b6b78"/>
      <circle cx="0" cy="-42" r="15" fill="#6b6b78"/>

      <!-- Outer Ears (lifted higher on the head) -->
      <polygon points="-13,-62 -5,-53 -14,-45" fill="#5a5a66"/>
      <polygon points="13,-62 14,-45 5,-53" fill="#5a5a66"/>

      <!-- Inner Ears (pink part, matching the new lift) -->
      <polygon points="-12,-58 -6,-52 -12,-47" fill="#e879a8" opacity=".65"/>
      <polygon points="12,-58 12,-47 6,-52" fill="#e879a8" opacity=".65"/>

      <ellipse cx="-6" cy="-44" rx="4" ry="5" fill="#1c1c24"/>
      <ellipse cx="6" cy="-44" rx="4" ry="5" fill="#1c1c24"/>
      <circle cx="-4" cy="-46" r="1.5" fill="white"/>
      <circle cx="8" cy="-46" r="1.5" fill="white"/>
      <path d="M-2,-36 l2 2.5 l2 -2.5 z" fill="#f9a8d4"/>
      <line x1="-14" y1="-38" x2="-3" y2="-37" stroke="#9ca3af" stroke-width="1" opacity=".6"/>
      <line x1="3" y1="-37" x2="14" y2="-38" stroke="#9ca3af" stroke-width="1" opacity=".6"/>
      <ellipse cx="-8" cy="-1" rx="7" ry="5" fill="#6b6b78"/>
      <ellipse cx="8" cy="-1" rx="7" ry="5" fill="#6b6b78"/>
      <path d="M16,-10 q18 -4 16 -24 q0 -10 -6 -8 q6 2 4 10 q-2 16 -16 20 z" fill="#6b6b78"/>
  </g>`);
  else if(m.pet==='dog') P.push(`<g transform="translate(150,452)">
    <ellipse cx="0" cy="4" rx="26" ry="8" fill="rgba(0,0,0,.28)"/>
    <ellipse cx="0" cy="-15" rx="20" ry="24" fill="#b07c3a"/>
    <circle cx="0" cy="-46" r="18" fill="#b07c3a"/>
    <ellipse cx="-18" cy="-42" rx="9" ry="15" fill="#8b6228" transform="rotate(-10 -18 -42)"/>
    <ellipse cx="18" cy="-42" rx="9" ry="15" fill="#8b6228" transform="rotate(10 18 -42)"/>
    <ellipse cx="0" cy="-35" rx="11" ry="9" fill="#c4944e"/>
    <ellipse cx="0" cy="-30" rx="8" ry="6" fill="#b07c3a"/>
    <ellipse cx="0" cy="-36" rx="6" ry="5" fill="#1c1c24"/>
    <circle cx="-9" cy="-50" r="4.5" fill="#1c1c24"/>
    <circle cx="9" cy="-50" r="4.5" fill="#1c1c24"/>
    <circle cx="-7" cy="-52" r="1.8" fill="white"/>
    <circle cx="11" cy="-52" r="1.8" fill="white"/>
    <ellipse cx="-10" cy="-1" rx="9" ry="6" fill="#b07c3a"/>
    <ellipse cx="10" cy="-1" rx="9" ry="6" fill="#b07c3a"/>
    <path d="M18,-10 q16 -2 14 -20 q-2 -8 -8 -6 q6 0 4 8 q-2 14 -12 18 z" fill="#b07c3a"/>
  </g>`);
  // floor clue (detective)
  if(m.clue.type==='footprints'){ for(let i=0;i<4;i++) P.push(`<ellipse cx="${560+i*30}" cy="${470-i*8}" rx="7" ry="12" fill="${m.clue.color[1]}" opacity=".5" transform="rotate(20 ${560+i*30} ${470-i*8})"/>`); }
  else if(m.clue.type==='spill') P.push(`<path d="M180 478 q-30 -6 -34 10 q-2 16 26 14 q30 4 40 -8 q16 -2 10 -14 q-22 -10 -42 -2 z" fill="${m.clue.color[1]}" opacity=".55"/>`);
  else if(m.clue.type==='dropped') P.push(`<g opacity=".95">${colObj(m.clue.object,210,470,m.clue.color[1])}</g>`);

  // time-of-day overlay
  if(m.timeOfDay==='night') P.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#0a1028" opacity=".42"/>`);
  else if(m.timeOfDay==='dusk') P.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#3a1e44" opacity=".2"/>`);
  if(m.lamp){ P.push(`<defs><radialGradient id="${U}lg" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="rgba(255,224,150,.4)"/><stop offset="1" stop-color="rgba(255,224,150,0)"/></radialGradient></defs>`);
    P.push(`<ellipse cx="660" cy="300" rx="150" ry="170" fill="url(#${U}lg)"/>`);
    P.push(`<rect x="654" y="300" width="12" height="118" fill="#3a3a44"/><path d="M636 300 l48 0 l-10 -34 l-28 0 z" fill="#e6c264"/><ellipse cx="660" cy="420" rx="26" ry="7" fill="#2a2a34"/>`); }
  P.push(`</svg>`);
  return P.join('');
}

function colPerson(P,px,p){
  const skin=p.skin, hair=p.hair[1], shirt=p.shirt[1];
  const headY=250, headR=27;
  P.push(`<ellipse cx="${px}" cy="432" rx="40" ry="9" fill="rgba(0,0,0,.26)"/>`);
  // legs
  P.push(`<rect x="${px-17}" y="360" width="13" height="72" rx="5" fill="#33323c"/><rect x="${px+4}" y="360" width="13" height="72" rx="5" fill="#33323c"/>`);
  // arms behind
  P.push(`<rect x="${px-38}" y="292" width="15" height="74" rx="7" fill="${colShade(shirt,.85)}"/>`);
  // torso
  P.push(`<path d="M${px-30} 300 q-2 -18 14 -22 l32 0 q16 4 14 22 l0 66 l-60 0 z" fill="${shirt}"/>`);
  // collar
  P.push(`<path d="M${px-12} 282 l12 16 l12 -16 l-6 -4 l-6 6 l-6 -6 z" fill="${colShade(shirt,1.15)}"/>`);
  if(p.tie) P.push(`<path d="M${px} 290 l-5 8 l5 34 l5 -34 z" fill="${p.tie[1]}"/>`);
  // right arm (holding?)
  if(p.holding){ P.push(`<rect x="${px+24}" y="300" width="14" height="44" rx="7" fill="${shirt}" transform="rotate(28 ${px+24} 300)"/>`); P.push(`<g>${colObj(p.holding,px+48,352,COL_COLORS[6][1])}</g>`); }
  else P.push(`<rect x="${px+23}" y="292" width="15" height="74" rx="7" fill="${colShade(shirt,.85)}"/>`);
  // neck + head
  P.push(`<rect x="${px-7}" y="270" width="14" height="20" fill="${skin}"/>`);
  P.push(`<circle cx="${px-26}" cy="${headY}" r="5" fill="${skin}"/><circle cx="${px+26}" cy="${headY}" r="5" fill="${skin}"/>`);
  P.push(`<circle cx="${px}" cy="${headY}" r="${headR}" fill="${skin}"/>`);
  // hair
  if(p.hairStyle===0) P.push(`<path d="M${px-27} ${headY-2} q0 -30 27 -30 q27 0 27 30 q-14 -16 -27 -14 q-13 -2 -27 14 z" fill="${hair}"/>`);
  else if(p.hairStyle===1){ P.push(`<path d="M${px-27} ${headY-2} q0 -30 27 -30 q27 0 27 30 q-14 -16 -27 -14 q-13 -2 -27 14 z" fill="${hair}"/>`); P.push(`<rect x="${px-30}" y="${headY-6}" width="9" height="42" rx="4" fill="${hair}"/><rect x="${px+21}" y="${headY-6}" width="9" height="42" rx="4" fill="${hair}"/>`); }
  else if(p.hairStyle===3){ P.push(`<ellipse cx="${px}" cy="${headY-22}" rx="36" ry="8" fill="#2a2730"/><path d="M${px-19} ${headY-22} q0 -26 19 -26 q19 0 19 26 z" fill="#36323e"/><rect x="${px-19}" y="${headY-25}" width="38" height="6" fill="#1f1d25"/>`); }
  // face
  P.push(`<ellipse cx="${px-9}" cy="${headY-1}" rx="2.6" ry="3.4" fill="#1c1c24"/><ellipse cx="${px+9}" cy="${headY-1}" rx="2.6" ry="3.4" fill="#1c1c24"/>`);
  P.push(`<path d="M${px-3} ${headY+5} q3 3 6 0" fill="none" stroke="${colShade(skin,.7)}" stroke-width="1.4"/>`);
  P.push(`<path d="M${px-7} ${headY+12} q7 5 14 0" fill="none" stroke="#9b4a3a" stroke-width="1.8" stroke-linecap="round"/>`);
  if(p.mustache) P.push(`<path d="M${px-8} ${headY+9} q8 4 16 0" fill="none" stroke="${hair}" stroke-width="3.4" stroke-linecap="round"/>`);
  if(p.glasses) P.push(`<circle cx="${px-9}" cy="${headY-1}" r="7" fill="none" stroke="#20242c" stroke-width="1.6"/><circle cx="${px+9}" cy="${headY-1}" r="7" fill="none" stroke="#20242c" stroke-width="1.6"/><line x1="${px-2}" y1="${headY-1}" x2="${px+2}" y2="${headY-1}" stroke="#20242c" stroke-width="1.6"/>`);
}
function colObjEl(P,type,x,yb,hex){ P.push(`<ellipse cx="${x}" cy="${yb-1}" rx="17" ry="4" fill="rgba(0,0,0,.2)"/>`); P.push(colObj(type,x,yb,hex)); }

// ── question engine ──
function colName(kind,key){ return t('c'+kind+'_'+key) || key; }
function colPickN(arr,n,rng,exclude){ const pool=arr.filter(x=>x!==exclude); const out=[]; while(out.length<n && pool.length){ out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]); } return out; }

function colQuestions(m,cfg){
  const rng=colMulberry((m.seed*2654435761)>>>0); const rnd=()=>rng();
  const clrKeys=COL_COLORS.map(c=>c[0]);
  const clrName=k=>t('clr_'+k);
  const colorQ=(qKey,correctKey,secret)=>{ const dis=colPickN(clrKeys,3,rng,correctKey); const choices=[...dis,correctKey].sort(()=>rnd()-.5).map(clrName); return {q:t(qKey),a:clrName(correctKey),choices,accept:[clrName(correctKey).toLowerCase()],secret:!!secret}; };
  const poolQ=(qStr,correctKey,allKeys,nameFn,secret)=>{ const dis=colPickN(allKeys,3,rng,correctKey); const choices=[...dis,correctKey].sort(()=>rnd()-.5).map(nameFn); return {q:qStr,a:nameFn(correctKey),choices,accept:[nameFn(correctKey).toLowerCase()],secret:!!secret}; };
  const countQ=(qStr,nVal)=>{ const set=new Set([nVal]); let g=Math.max(0,nVal-2); while(set.size<4){ set.add(g); g++; } const choices=[...set].sort((a,b)=>a-b).map(String); return {q:qStr,a:String(nVal),choices,accept:[String(nVal)]}; };
  const ynQ=(qStr,yes,secret)=>({q:qStr,a:yes?t('col_yes'):t('col_no'),choices:[t('col_yes'),t('col_no')],accept:[(yes?t('col_yes'):t('col_no')).toLowerCase(), yes?'yes':'no'],secret:!!secret});

  const core=[]; const secret=[];
  // always: people count
  core.push(countQ(t('colq_people'), m.people.length));
  // person shirt
  if(m.people.length){ let idx=0,posKey='only'; if(m.people.length>1){ const pos=rnd(); if(pos<.5){idx=0;posKey='left';} else {idx=m.people.length-1;posKey='right';} } core.push(colorQ_pos('colq_shirt',posKey,m.people[idx].shirt[0])); }
  function colorQ_pos(base,posKey,correctKey){ const q=t(base, t('colpos_'+posKey)); const dis=colPickN(clrKeys,3,rng,correctKey); const choices=[...dis,correctKey].sort(()=>rnd()-.5).map(clrName); return {q,a:clrName(correctKey),choices,accept:[clrName(correctKey).toLowerCase()]}; }
  // clock
  if(m.clock.present){ const a=m.clock.h+':'+(m.clock.m<10?'0'+m.clock.m:m.clock.m); const opts=new Set([a]); while(opts.size<4){ const h=1+Math.floor(rnd()*12), mm=[0,15,30,45][Math.floor(rnd()*4)]; opts.add(h+':'+(mm<10?'0'+mm:mm)); } core.push({q:t('colq_clock'),a,choices:[...opts].sort(()=>rnd()-.5),accept:[a, a.replace(':','.'), a.replace(':','h')]}); }
  // table count
  core.push(countQ(t('colq_objcount'), m.table.objects.length));
  // table has (which object was present)
  if(m.table.objects.length){ const present=m.table.objects.map(o=>o.type); const correct=present[Math.floor(rnd()*present.length)]; const absent=COL_HELD.filter(o=>!present.includes(o)); const dis=colPickN(absent,3,rng,null); const choices=[...dis,correct].sort(()=>rnd()-.5).map(k=>colName('obj',k)); core.push({q:t('colq_objhas'),a:colName('obj',correct),choices,accept:[colName('obj',correct).toLowerCase()]}); }
  // painting
  if(m.painting.present) core.push(poolQ(t('colq_painting'), m.painting.subject, COL_PAINT, k=>colName('paint',k)));
  // door
  if(m.door.present) core.push({q:t('colq_door'),a:m.door.open?t('col_open'):t('col_closed'),choices:[t('col_open'),t('col_closed')],accept:[(m.door.open?t('col_open'):t('col_closed')).toLowerCase()]});
  // setting
  core.push(poolQ(t('colq_setting'), m.setting, COL_SETTING_KEYS, k=>colName('set',k)));
  // plant
  core.push(ynQ(t('colq_plant'), m.plant));
  // pet
  { const correct=m.pet||'none'; const choices=[t('cpet_cat'),t('cpet_dog'),t('cpet_none')]; core.push({q:t('colq_pet'),a:t('cpet_'+correct),choices,accept:[t('cpet_'+correct).toLowerCase()]}); }
  // glasses
  if(m.people.length) core.push(ynQ(t('colq_glasses'), m.people.some(p=>p.glasses)));
  // holding
  const holder=m.people.find(p=>p.holding); if(holder) core.push(poolQ(t('colq_holding'), holder.holding, COL_HELD, k=>colName('obj',k)));
  // rug
  if(m.rug.present) core.push(colorQ('colq_rug', m.rug.color[0]));
  // window view
  if(m.window.present) core.push(poolQ(t('colq_window'), m.window.outside, COL_OUTSIDE, k=>colName('out',k)));

  // ── SECRET / detective twists ──
  if(cfg.secret){
    if(m.mirror.present && m.mirror.reveals){ const rv=m.mirror.reveals;
      if(rv.type==='person') secret.push(colorQ('colq_mirror_person', rv.personShirt[0], true));
      else if(rv.type==='object') secret.push(poolQ(t('colq_mirror_object'), rv.object, COL_HELD, k=>colName('obj',k), true));
      else {
        // The TRUE time in the room (the correct detective answer)
        const realA = m.clock.h + ':' + (m.clock.m < 10 ? '0' + m.clock.m : m.clock.m);

        // The ILLUSION time shown on the mirror's face (the trap/distractor)
        const fakeA = rv.clockH + ':' + (rv.clockM < 10 ? '0' + rv.clockM : rv.clockM);

        const opts = new Set([realA, fakeA]);

        // Fill the rest with random times
        while(opts.size < 4) {
          const h = 1 + Math.floor(rnd() * 12);
          const mm = [0, 15, 30, 45][Math.floor(rnd() * 4)];
          opts.add(h + ':' + (mm < 10 ? '0' + mm : mm));
        }

        secret.push({
          q: t('colq_mirror_clock'),
          a: realA, // The correct answer is now the REAL time
          choices: [...opts].sort(() => rnd() - .5),
          accept: [realA, realA.replace(':', '.'), realA.replace(':', 'h')],
          secret: true
        });
      }
    }
    if(m.window.outside==='watcher') secret.push(colorQ('colq_watcher', m.window.watcher[0], true));
    if(m.clue.type!=='none'){ const correct=m.clue.type; const choices=['footprints','spill','dropped','none'].map(k=>colName('clue',k)); secret.push({q:t('colq_clue'),a:colName('clue',correct),choices,accept:[colName('clue',correct).toLowerCase()],secret:true}); }
  }

  // assemble: core (people-count first, rest shuffled), then secret last
  const head=core[0]; const rest=core.slice(1).sort(()=>rnd()-.5);
  const secSel=secret.slice(0,3);
  const coreNeeded=Math.max(1, cfg.questions - secSel.length);
  const final=[head,...rest].slice(0,coreNeeded).concat(secSel);
  return final;
}

// ── game loop ──
function showColomboMenu(){
  showScreen('screen-colombo');
  document.getElementById('col-select').style.display='block';
  document.getElementById('col-study').style.display='none';
  document.getElementById('col-quiz').style.display='none';
  document.getElementById('col-results').style.display='none';
  colTimers.forEach(clearTimeout); colTimers=[];
  // answer style
  const ansLbl=document.getElementById('col-ans-lbl'); if(ansLbl) ansLbl.textContent=t('col_ans_lbl');
  const ansRow=document.getElementById('col-ans-row'); if(ansRow){ ansRow.innerHTML=''; [['choice','col_ans_choice'],['type','col_ans_type']].forEach(([id,key])=>{ const b=document.createElement('div'); b.className='wm-mode-btn'+(colAnsStyle===id?' active':''); b.textContent=t(key); b.onclick=()=>{colAnsStyle=id;localStorage.setItem('membrain_col_ans',id);showColomboMenu();}; ansRow.appendChild(b); }); }
  // secret toggle
  const secLbl=document.getElementById('col-secret-lbl'); if(secLbl) secLbl.textContent=t('col_secret_lbl');
  const secRow=document.getElementById('col-secret-row'); if(secRow){ secRow.innerHTML=''; [[true,'col_secret_on'],[false,'col_secret_off']].forEach(([val,key])=>{ const b=document.createElement('div'); b.className='wm-mode-btn'+(colSecretOpt===val?' active':''); b.textContent=t(key); b.onclick=()=>{colSecretOpt=val;localStorage.setItem('membrain_col_secret',val?'on':'off');showColomboMenu();}; secRow.appendChild(b); }); }
  restoreOpts('col-opts');
  // daily badge
  const stats=colLoadStats(); const tk=mathTodayKey();
  const dBadge=document.getElementById('col-daily-badge'); if(dBadge) dBadge.textContent = stats.daily?.[tk] ? t('col_daily_done') : t('col_daily_open');
  const dLbl=document.getElementById('col-daily-lbl'); if(dLbl) dLbl.textContent=t('col_daily_lbl');
  // level grid
  const grid=document.getElementById('col-level-grid'); grid.innerHTML='';
  COL_LEVELS.forEach((lv,i)=>{ const starsN=stats.stars?.[i]||0; const b=document.createElement('div'); b.className='level-btn'+(lv.secret?' type-lv':''); b.onclick=()=>colStart(i);
    let starStr=''; for(let k=0;k<3;k++) starStr+=`<span style="opacity:${k<starsN?1:.25}">★</span>`;
    b.innerHTML=`${lv.secret?'<span class="lv-badge">🔍</span>':''}<span class="lv-num">${i+1}</span><span class="lv-sub">${(lv.len/1000).toFixed(0)}${t('col_sec')} · ${lv.questions}${t('col_qmark')}</span><span class="lv-stars">${starStr}</span>`;
    grid.appendChild(b); });
  renderColStats();
}

let colCurrent=null;
// ── SOUNDS (noir detective cues; reuse the global playTone from pairs.js) ──
function colSnd(fn){ try{ if(typeof playTone==='function') fn(); }catch(e){} }
function colSndStudy(){   colSnd(()=>{ playTone(150,'sine',0.16,0.45); playTone(225,'sine',0.10,0.50,0.16); }); }      // case opens — low & mysterious
function colSndQuiz(){    colSnd(()=>{ playTone(330,'triangle',0.13,0.12); playTone(440,'triangle',0.12,0.14,0.10); }); } // interrogation begins
function colSndSelect(){  colSnd(()=>{ playTone(520,'sine',0.10,0.045); }); }                                       // pick an answer
function colSndCorrect(d=0){ colSnd(()=>{ playTone(587,'triangle',0.18,0.10,d); playTone(880,'triangle',0.14,0.12,d+0.09); }); }
function colSndWrong(d=0){   colSnd(()=>{ playTone(196,'sawtooth',0.14,0.16,d); playTone(150,'sawtooth',0.10,0.20,d+0.10); }); }
function colSndVerdict(stars){ colSnd(()=>{
  if(stars>=2){ [523,659,784,1047].forEach((f,i)=>playTone(f,'triangle',0.26,0.22,i*0.12)); }           // case closed!
  else if(stars===1){ playTone(440,'triangle',0.20,0.18); playTone(523,'triangle',0.18,0.22,0.16); }    // partial
  else { playTone(330,'sawtooth',0.18,0.26); playTone(247,'sawtooth',0.15,0.30,0.18); playTone(196,'sawtooth',0.12,0.40,0.40); } // case went cold
}); }

function colStart(lvIdx, fixedSeed){
  colLevel = lvIdx==null?colLevel:lvIdx;
  const cfg = lvIdx==null?colCfg(colLevel):colCfg(lvIdx);
  if(fixedSeed!=null) cfg._daily=true;
  const seed = fixedSeed!=null?fixedSeed:(Math.floor(Math.random()*2147483647));
  const model = colBuild(seed, cfg);
  colCurrent = {model, cfg, lvIdx:lvIdx==null?colLevel:lvIdx, daily:fixedSeed!=null};
  showScreen('screen-colombo');
  document.getElementById('col-select').style.display='none';
  document.getElementById('col-study').style.display='block';
  document.getElementById('col-quiz').style.display='none';
  document.getElementById('col-results').style.display='none';
  document.getElementById('col-case-tag').textContent = (fixedSeed!=null?t('col_daily_tag'):t('col_case_tag',(lvIdx==null?colLevel:lvIdx)+1));
  const frame=document.getElementById('col-scene'); frame.innerHTML=colRender(model)+'<div class="col-vignette"></div>';
  document.getElementById('col-study-cap').textContent=t('col_study_cap');
  document.getElementById('col-ready-btn').textContent=t('col_seen_enough');
  document.getElementById('col-ready-btn').onclick=colStartQuiz;
  colSndStudy();
  // countdown
  const bar=document.getElementById('col-timebar'); bar.style.transition='none'; bar.style.width='100%';
  void bar.offsetWidth; bar.style.transition='width '+cfg.len+'ms linear'; bar.style.width='0%';
  colTimers.forEach(clearTimeout); colTimers=[];
  colTimers.push(setTimeout(()=>colStartQuiz(), cfg.len));
  try{ metaTrackGame && metaTrackGame('colombo'); }catch(e){}
}

function colStartQuiz(){
  if(!colCurrent) return;
  colTimers.forEach(clearTimeout); colTimers=[];
  const {model,cfg}=colCurrent;
  const questions = colQuestions(model, cfg);
  colQuiz = {questions, answers:new Array(questions.length).fill(null)};
  document.getElementById('col-study').style.display='none';
  document.getElementById('col-quiz').style.display='block';
  document.getElementById('col-results').style.display='none';
  colSndQuiz();
  setColScroll();
  document.getElementById('col-quiz-title').textContent=t('col_quiz_title');
  document.getElementById('col-quiz-sub').textContent=t('col_quiz_sub');
  document.getElementById('col-submit-btn').textContent=t('col_submit');
  const list=document.getElementById('col-quiz-list'); list.innerHTML='';
  questions.forEach((q,qi)=>{
    const card=document.createElement('div'); card.className='col-q-card'+(q.secret?' secret':'');
    let inner=`<div class="col-q-num">${q.secret?'🔍 '+t('col_twist'):t('col_clue_n',qi+1)}</div><div class="col-q-text">${q.q}</div>`;
    if(colAnsStyle==='choice'){
      inner+=`<div class="col-choices">`+q.choices.map(c=>`<button class="col-choice" data-v="${escapeAttr(c)}">${c}</button>`).join('')+`</div>`;
      card.innerHTML=inner;
      card.querySelectorAll('.col-choice').forEach(btn=>{ btn.onclick=()=>{ card.querySelectorAll('.col-choice').forEach(b=>b.classList.remove('sel')); btn.classList.add('sel'); colQuiz.answers[qi]=btn.dataset.v; colSndSelect(); }; });
    } else {
      inner+=`<input type="text" class="col-type-input" data-qi="${qi}" placeholder="${t('col_type_ph')}" style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border2);background:var(--glass);color:var(--text);font-size:.92rem;font-weight:700;">`;
      card.innerHTML=inner;
      const inp=card.querySelector('input'); inp.oninput=()=>{ colQuiz.answers[qi]=inp.value; };
    }
    list.appendChild(card);
  });
}
function setColScroll(){ document.getElementById('screen-colombo').style.justifyContent='flex-start'; }
function escapeAttr(s){ return String(s).replace(/"/g,'&quot;'); }

function colNorm(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,' '); }
function colCheck(q, ans){ if(ans==null) return false; const a=colNorm(ans); if(colAnsStyle==='choice') return a===colNorm(q.a); return q.accept.some(x=>colNorm(x)===a); }

function colSubmit(){
  if(!colQuiz) return;
  const {questions,answers}=colQuiz;
  let correct=0; questions.forEach((q,i)=>{ if(colCheck(q,answers[i])) correct++; });
  const total=questions.length; const score=Math.round(correct/total*100);
  const stars = score>=90?3:score>=70?2:score>=50?1:0;
  colQuiz.correct=correct; colQuiz.score=score; colQuiz.stars=stars;
  // save stats
  const stats=colLoadStats(); const tk=mathTodayKey();
  stats.days=stats.days||{}; stats.days[tk]=stats.days[tk]||{cases:0,score:0,best:0};
  stats.days[tk].cases++; stats.days[tk].score=Math.max(stats.days[tk].score||0,score);
  stats.stars=stats.stars||{}; const li=colCurrent.lvIdx; stats.stars[li]=Math.max(stats.stars[li]||0,stars);
  if(colCurrent.daily){ stats.daily=stats.daily||{}; stats.daily[tk]={score,correct,total}; }
  colSaveStats(stats);
  try{ if(typeof addXp==='function') addXp(20+score, t('col_mode_title')); }catch(e){}
  try{ checkAchievements && checkAchievements(['col_first']); }catch(e){}
  colShowResults(true);
}

function colShowResults(animate){
  document.getElementById('col-study').style.display='none';
  document.getElementById('col-quiz').style.display='none';
  document.getElementById('col-results').style.display='block';
  const {questions,answers,correct,score,stars}=colQuiz;
  const starEl=document.getElementById('col-stars'); starEl.innerHTML=''; for(let k=0;k<3;k++){ const s=document.createElement('span'); s.textContent='★'; s.style.opacity=k<stars?1:.22; starEl.appendChild(s); }
  document.getElementById('col-score-pct').textContent=score+'%';
  document.getElementById('col-result-label').textContent=t('col_result_label');
  const verdict = score>=90?t('col_verdict_3'):score>=70?t('col_verdict_2'):score>=50?t('col_verdict_1'):t('col_verdict_0');
  document.getElementById('col-verdict').textContent=t('col_solved_n',correct,questions.length)+' · '+verdict;
  const list=document.getElementById('col-result-list'); list.innerHTML='';
  const rows=questions.map((q,i)=>{ const ok=colCheck(q,answers[i]); const row=document.createElement('div'); row.className='col-result-q';
    const yourAns = answers[i]==null||answers[i]===''?t('col_no_answer'):answers[i];
    const ico=document.createElement('div'); ico.className='rq-ico'; ico.textContent=ok?'✅':'❌';
    const body=document.createElement('div'); body.className='rq-body';
    const qEl=document.createElement('div'); qEl.className='rq-q'; qEl.textContent=(q.secret?'🔍 ':'')+q.q;
    const aEl=document.createElement('div'); aEl.className='rq-a '+(ok?'ok':'no');
    aEl.textContent=ok?'✓ '+q.a : t('col_you_said')+' '+yourAns+' · '+t('col_answer_was')+' '+q.a;
    body.appendChild(qEl); body.appendChild(aEl); row.appendChild(ico); row.appendChild(body);
    return {row, ok}; });
  if(animate){
    colTimers.forEach(clearTimeout); colTimers=[];
    rows.forEach((r,i)=>{ r.row.style.opacity='0'; r.row.style.transform='translateY(8px)'; list.appendChild(r.row);
      const tid=setTimeout(()=>{ r.row.style.transition='opacity .25s,transform .25s'; r.row.style.opacity='1'; r.row.style.transform='none'; (r.ok?colSndCorrect():colSndWrong()); }, 240+i*280);
      colTimers.push(tid); });
    const vtid=setTimeout(()=>colSndVerdict(stars), 240+rows.length*280+220);
    colTimers.push(vtid);
  } else {
    rows.forEach(r=>list.appendChild(r.row));
  }
  document.getElementById('col-change-btn').textContent=t('col_new_case');
  document.getElementById('col-replay-btn').textContent=t('col_reexamine');
  document.getElementById('col-next-btn').textContent=t('math_next_level');
}

function colReplayReveal(){
  if(!colCurrent) return;
  document.getElementById('col-results').style.display='none';
  document.getElementById('col-study').style.display='block';
  const frame=document.getElementById('col-scene'); frame.innerHTML=colRender(colCurrent.model)+'<div class="col-vignette"></div>';
  document.getElementById('col-timebar').parentElement.style.visibility='hidden';
  document.getElementById('col-study-cap').textContent=t('col_revealed_cap');
  document.getElementById('col-case-tag').textContent=t('col_evidence_tag');
  const rb=document.getElementById('col-ready-btn'); rb.textContent=t('col_back_verdict'); rb.onclick=()=>{ document.getElementById('col-timebar').parentElement.style.visibility='visible'; colShowResults(); };
}
function colNextCase(){ colLevel=Math.min(COL_LEVELS.length-1, (colCurrent?colCurrent.lvIdx:colLevel)+1); colStart(colLevel); }

function colDailySeed(){ return Math.floor(Date.now()/86400000); }
function colStartDaily(){
  const stats=colLoadStats(); const tk=mathTodayKey();
  // daily uses a fixed mid-high config with twists on
  const lvIdx=4;
  const prevSecret=colSecretOpt; colSecretOpt=true;
  colStart(lvIdx, colDailySeed());
  colSecretOpt=prevSecret;
}

function colLoadStats(){ try{ return JSON.parse(localStorage.getItem('membrain_colombo_v1'))||{}; }catch(e){ return {}; } }
function colSaveStats(s){ try{ localStorage.setItem('membrain_colombo_v1', JSON.stringify(s)); }catch(e){} }
function colStreak(s){ s.days=s.days||{}; let n=0; const d=new Date(); for(;;){ const k=mathDayKey(d); if(s.days[k]&&s.days[k].cases){ n++; d.setDate(d.getDate()-1); } else break; } return n; }
function renderColStats(){
  const s=colLoadStats(); s.days=s.days||{};
  document.getElementById('col-streak').textContent=t('wm_day_streak', colStreak(s));
  const bars=document.getElementById('col-bars'); bars.innerHTML=''; const base=new Date(); const days=[];
  for(let i=6;i>=0;i--){ const dd=new Date(base); dd.setDate(base.getDate()-i); days.push(dd); }
  const counts=days.map(dd=>s.days[mathDayKey(dd)]?.cases||0); const maxT=Math.max(5,...counts); const tk=mathTodayKey(); const dow=t('dow');
  days.forEach(dd=>{ const c=s.days[mathDayKey(dd)]?.cases||0; const el=document.createElement('div'); el.className='bar7'+(mathDayKey(dd)===tk?' today':''); el.innerHTML=`<div class="bval">${c||''}</div><div class="bcol" style="height:${Math.round(c/maxT*100)}%"></div><div class="bday">${dow[dd.getDay()]}</div>`; bars.appendChild(el); });
  const totalCases=Object.values(s.days).reduce((a,x)=>a+(x.cases||0),0);
  const totalStars=Object.values(s.stars||{}).reduce((a,x)=>a+x,0);
  const bestScore=Object.values(s.days).reduce((a,x)=>Math.max(a,x.score||0),0);
  document.getElementById('col-daily-stats').innerHTML=`
    <div class="stat-box"><div class="sv">${s.days[tk]?.cases||0}</div><div class="sl">${t('col_today')}</div></div>
    <div class="stat-box"><div class="sv">${totalCases}</div><div class="sl">${t('col_cases')}</div></div>
    <div class="stat-box"><div class="sv">${bestScore}%</div><div class="sl">${t('col_best')}</div></div>
    <div class="stat-box"><div class="sv">${totalStars}/${COL_LEVELS.length*3}</div><div class="sl">⭐ Stars</div></div>`;
}

