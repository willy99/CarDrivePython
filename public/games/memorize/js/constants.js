// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const WORD_BANKS = {
  animals: ['cat','dog','bird','fish','lion','bear','wolf','deer','frog','snake','fox','owl','crab','duck','moth','hawk','bat','bee','ant','ram','hen','cow','pig','rat','elk','emu','swan','mole','robin','crane','zebra','panda','eagle','gecko','hippo','parrot','walrus','camel','tiger','horse','sheep','mouse','rhino','shark','whale','koala','lemur','sloth','hyena','badger','otter','skunk','bison','puma','seal','squid','toad','worm'],
  colors:  ['red','blue','green','gold','pink','cyan','gray','lime','navy','teal','rose','jade','ivory','amber','coral','violet','maroon','olive','silver','bronze','magenta','crimson','scarlet','indigo','beige','khaki','peach','lilac','sienna','plum','salmon','azure','ruby','mint','mustard','orchid','slate','rust','sepia','aqua'],
  food:    ['apple','bread','cake','milk','rice','soup','corn','plum','mango','lemon','cherry','grape','melon','basil','pear','kiwi','fig','oat','egg','tofu','beet','jam','pie','taco','sushi','pasta','steak','pizza','curry','noodle','waffle','bagel','donut','cream','cheese','onion','garlic','bean','pork','honey','sugar','salt','pepper','olive','bacon','candy','fudge','toast','syrup','salad','beef'],
  nature:  ['tree','rock','lake','rain','wind','snow','fire','leaf','cloud','storm','river','stone','forest','hill','mud','fog','ice','soil','moss','sand','cave','tide','reef','mist','peak','dawn','dune','marsh','glacier','cactus','pebble','thorn','swamp','brook','beach','ocean','grass','bush','weed','vine','wood','clay','star','moon','gulf','pond','cliff','dust','ash','wave'],
  objects: ['book','door','lamp','ring','shoe','bell','coin','desk','mirror','key','clock','phone','pen','hat','chain','bag','cup','mat','pot','net','box','axe','jar','bow','ink','map','fan','rod','vase','rope','flag','mask','brush','hook','lens','bolt','wire','tube','comb','fork','spoon','plate','bowl','glass','tool','nail','lock','tape','mug','plug','cord','soap'],
  space:   ['comet','orbit','rocket','galaxy','planet','meteor','cosmos','nebula','lunar','solar','venus','mars','star','void','dust','beam','aurora','quasar','pulsar','eclipse','gravity','asteroid','saturn','crater','photon','wormhole','sun','nova','ring','ship','probe','alien','zenith','ufo','pluto','earth','moon'],
  music:   ['drum','flute','piano','violin','tempo','chord','melody','banjo','cello','organ','harp','tuba','bass','beat','jazz','rock','note','tune','solo','duet','choir','opera','lyric','rhyme','pitch','riff','groove','clef','song','rest','brass','horn','gong','reed','band','vinyl','synth','pop'],
  clothing:['shirt','shoe','sock','hat','coat','belt','vest','boot','scarf','robe','suit','tie','gown','cap','hood','glove','jeans','cape','skirt','dress','heel','shawl','cuff','zip','button','yarn','silk'],
  body:    ['head','hand','foot','eye','ear','nose','lip','arm','leg','knee','toe','neck','hair','chin','jaw','skin','bone','rib','spine','blood','vein','nail','thumb','wrist','heel','palm','lung'],
  professions: ['chef','cop','vet','nurse','judge','pilot','actor','baker','coach','guard','mayor','poet','clerk','spy','hero','maid','smith','king','queen','duke','boss','monk','thief','singer','driver'],
  transport: ['car','bus','bike','boat','ship','jet','train','tram','cab','cart','raft','sled','truck','van','tank','yacht','sub','plane','ferry','drone','glider','canoe','scooter'],
  buildings: ['house','barn','hut','tent','fort','shop','mall','bank','pub','cafe','dome','shed','mill','tower','base','hotel','motel','ruin','tomb','camp','hall','room','roof']
};

const WM_ALL_CATS = Object.keys(WORD_BANKS);

const WORD_BANKS_UK = {
  animals: ['кіт','пес','птах','риба','лев','ведмідь','вовк','олень','жаба','змія','лис','сова','краб','качка','метелик','яструб','кажан','бджола','мураха','баран','курка','корова','свиня','щур','лось','ему','лебідь','кріт','малинівка','журавель','зебра','панда','орел','гекон','бегемот','папуга','морж','верблюд','тигр','кінь','вівця','миша','носоріг','акула','кит','коала','лемур','лінивець','гієна','борсук','видра','скунс','бізон','пума','тюлень','кальмар','ропуха','хробак'],
  colors:  ['червоний','синій','зелений','золотий','рожевий','блакитний','сірий','жовтий','білий','чорний','бузковий','брунатний','коричневий','бежевий','малиновий','фіолетовий','бордовий','оливковий','срібний','бронзовий','пурпурний','індиго','персиковий','сієна','сливовий','лососевий','лазурний','рубіновий','м\'ятний','гірчичний','орхідея','сланцевий','іржавий','сепія','аква'],
  food:    ['яблуко','хліб','торт','молоко','рис','суп','слива','манго','лимон','вишня','виноград','диня','базилік','пшениця','груша','ківі','інжир','овес','яйце','тофу','буряк','джем','пиріг','тако','суші','паста','стейк','піца','карі','локшина','вафля','бублик','пончик','крем','сир','цибуля','часник','біб','свинина','мед','цукор','сіль','перець','оливка','бекон','цукерка','тост','сироп','салат','яловичина'],
  nature:  ['дерево','камінь','озеро','дощ','вітер','сніг','вогонь','листок','хмара','буря','річка','скеля','ліс','пагорб','болото','туман','лід','ґрунт','мох','пісок','печера','прибій','риф','імла','вершина','світанок','дюна','трясовина','льодовик','кактус','галька','шип','бурелом','струмок','пляж','океан','трава','кущ','бур\'ян','лоза','деревина','глина','зоря','місяць','затока','ставок','урвище','пил','попіл','хвиля'],
  objects: ['книга','двері','лампа','перстень','черевик','дзвін','монета','стіл','дзеркало','ключ','годинник','телефон','ручка','капелюх','ланцюг','сумка','кухоль','мат','горщик','сіть','ящик','сокира','глечик','лук','чорнило','карта','віяло','жезл','ваза','мотузка','прапор','маска','щітка','гак','лінза','болт','дріт','труба','гребінець','виделка','ложка','тарілка','миска','склянка','інструмент','цвях','замок','стрічка','горнятко','штекер','кабель','мило'],
  space:   ['комета','орбіта','ракета','галактика','планета','метеор','космос','туманність','місяць','сонце','венера','марс','зірка','порожнеча','пил','промінь','аврора','квазар','пульсар','затемнення','гравітація','астероїд','сатурн','кратер','фотон','хроботочина','нова','кільце','корабель','зонд','прибулець','зеніт','нло','плутон','земля'],
  music:   ['барабан','флейта','піано','скрипка','темп','акорд','мелодія','банджо','віолончель','орган','арфа','туба','бас','ритм','джаз','рок','нота','мотив','соло','дует','хор','опера','лірика','рима','тон','риф','грув','ключ','пісня','пауза','мідь','ріжок','гонг','тростина','гурт','вініл','синт','поп'],
  clothing:['сорочка','взуття','шкарпетка','капелюх','пальто','пояс','жилет','чобіт','шарф','халат','костюм','краватка','сукня','кепка','каптур','рукавиця','джинси','плащ','спідниця','каблук','шаль','манжет','замок','ґудзик','пряжа','шовк'],
  body:    ['голова','рука','нога','око','вухо','ніс','губа','коліно','палець','шия','волосся','підборіддя','щелепа','шкіра','кістка','ребро','хребет','кров','вена','ніготь','зап\'ястя','п\'ята','долоня','легеня'],
  professions: ['кухар','коп','лікар','медбрат','суддя','пілот','актор','пекар','тренер','охоронець','мер','поет','клерк','шпигун','герой','покоївка','коваль','король','королева','герцог','бос','монах','злодій','співак','водій'],
  transport: ['авто','автобус','велосипед','човен','корабель','джет','потяг','трамвай','таксі','візок','пліт','сани','вантажівка','фургон','танк','яхта','метро','літак','паром','дрон','планер','каное','скутер'],
  buildings: ['дім','сарай','хатина','намет','форт','крамниця','тц','банк','паб','кафе','купол','навіс','млин','вежа','база','готель','мотель','руїна','гробниця','табір','зал','кімната','дах']
};

// 12 levels. 1–6 = click words from a pool (easier). 7–12 = TYPE each word
// from memory with the keyboard (no pool to lean on → much harder).
const WM_LEVELS = [
  // ─── РЕЖИМ ВИБОРУ (Кліки) ───
  // Рівень 1: Базові, найзвичніші слова
  {words:3,  time:3500, mode:'pool', cats:['animals', 'colors']},
  // Рівень 2: Особистий простір (їжа, тіло, одяг)
  {words:4,  time:3200, mode:'pool', cats:['food', 'body', 'clothing']},
  // Рівень 3: Навколишній світ (природа, тварини, космос)
  {words:5,  time:2900, mode:'pool', cats:['nature', 'animals', 'space']},
  // Рівень 4: Місто та інфраструктура (будівлі, транспорт, предмети)
  {words:6,  time:2600, mode:'pool', cats:['buildings', 'transport', 'objects']},
  // Рівень 5: Люди і культура (професії, музика, їжа, одяг)
  {words:8,  time:2200, mode:'pool', cats:['professions', 'music', 'food', 'clothing']},
  // Рівень 6: Фінал першого етапу (всі 12 категорій разом)
  {words:10, time:1900, mode:'pool', cats:WM_ALL_CATS},

  // ─── РЕЖИМ ДРУКУВАННЯ (Клавіатура - набагато складніше) ───
  // Рівень 7: Легкий старт друкування (прості короткі слова)
  {words:4,  time:3000, mode:'type', cats:['animals', 'colors', 'body'], introKey:'wm_type_intro'},
  // Рівень 8: Побут
  {words:5,  time:2600, mode:'type', cats:['food', 'clothing', 'objects']},
  // Рівень 9: Вулиця і світ
  {words:6,  time:2300, mode:'type', cats:['nature', 'buildings', 'transport']},
  // Рівень 10: Складніші абстрактні слова
  {words:7,  time:2000, mode:'type', cats:['professions', 'space', 'music']},
  // Рівень 11: Солянка (всі категорії)
  {words:8,  time:1700, mode:'type', cats:WM_ALL_CATS},
  // Рівень 12: Абсолютний хардкор пам'яті та швидкості друку
  {words:10, time:1400, mode:'type', cats:WM_ALL_CATS},
];

const WM_DIFF_DEFS = [
  { id:'short',  filter: w => w.length <= 4 },
  { id:'medium', filter: w => w.length >= 4 && w.length <= 6 },
  { id:'long',   filter: w => w.length >= 5 },
  { id:'all',    filter: () => true },
];

const SPOT_LEVELS = [
  // warmup
  {count:5,  memorize:10000, blackout:2500},
  {count:7,  memorize:8000,  blackout:2500},
  {count:9,  memorize:7000,  blackout:2000},
  {count:12, memorize:6000,  blackout:2000},
  {count:15, memorize:5500,  blackout:2000},
  // medium
  {count:8,  memorize:8000,  blackout:2500},
  {count:10, memorize:6500,  blackout:2000},
  {count:12, memorize:6000,  blackout:2000},
  {count:14, memorize:5500,  blackout:2000},
  {count:16, memorize:5500,  blackout:1800},
  // harder
  {count:10, memorize:5000,  blackout:1800},
  {count:14, memorize:5000,  blackout:1800},
  {count:16, memorize:4500,  blackout:1800},
  {count:18, memorize:4500,  blackout:1500},
  {count:20, memorize:5000,  blackout:1500},
  // expert
  {count:14, memorize:3500,  blackout:1500},
  {count:16, memorize:3500,  blackout:1500},
  {count:18, memorize:4000,  blackout:1500},
  {count:20, memorize:4000,  blackout:1500},
  {count:22, memorize:4500,  blackout:1500},
];

// Object definitions for spotting & pairs
const OBJECTS = [
  {id:'duck',      name:'Duck',      color:'#FFD700', glow:'rgba(255,215,0,.4)'},
  {id:'ball',      name:'Ball',      color:'#ff4444', glow:'rgba(255,68,68,.4)'},
  {id:'star',      name:'Star',      color:'#FFD700', glow:'rgba(255,215,0,.45)'},
  {id:'heart',     name:'Heart',     color:'#ff2d55', glow:'rgba(255,45,85,.4)'},
  {id:'diamond',   name:'Diamond',   color:'#00d4ff', glow:'rgba(0,212,255,.4)'},
  {id:'crown',     name:'Crown',     color:'#fbbf24', glow:'rgba(251,191,36,.4)'},
  {id:'rocket',    name:'Rocket',    color:'#c0c0c0', glow:'rgba(192,192,192,.35)'},
  {id:'moon',      name:'Moon',      color:'#FFFACD', glow:'rgba(255,250,205,.35)'},
  {id:'flower',    name:'Flower',    color:'#ff69b4', glow:'rgba(255,105,180,.4)'},
  {id:'butterfly', name:'Butterfly', color:'#ff8c00', glow:'rgba(255,140,0,.4)'},
  {id:'apple',     name:'Apple',     color:'#ff3b30', glow:'rgba(255,59,48,.4)'},
  {id:'cloud',     name:'Cloud',     color:'#c8d8e8', glow:'rgba(200,216,232,.3)'},
  {id:'fish',      name:'Fish',      color:'#0099ff', glow:'rgba(0,153,255,.4)'},
  {id:'mushroom',  name:'Mushroom',  color:'#ff3b30', glow:'rgba(255,59,48,.4)'},
  {id:'snowflake', name:'Snowflake', color:'#a0d8ef', glow:'rgba(160,216,239,.4)'},
  {id:'sun',       name:'Sun',       color:'#FFD700', glow:'rgba(255,215,0,.45)'},
  {id:'turtle',    name:'Turtle',    color:'#4CAF50', glow:'rgba(76,175,80,.4)'},
  {id:'balloon',   name:'Balloon',   color:'#ff2d55', glow:'rgba(255,45,85,.4)'},
  {id:'icecream',  name:'Ice Cream', color:'#ffd54f', glow:'rgba(255,213,79,.4)'},
  {id:'lightning', name:'Lightning', color:'#FFD700', glow:'rgba(255,215,0,.5)'},
  {id:'planet',    name:'Planet',    color:'#9c27b0', glow:'rgba(156,39,176,.4)'},
  {id:'gift',      name:'Gift',      color:'#f44336', glow:'rgba(244,67,54,.4)'},
  {id:'cat',       name:'Cat',       color:'#ff9800', glow:'rgba(255,152,0,.4)'},
  {id:'tree',      name:'Tree',      color:'#4CAF50', glow:'rgba(76,175,80,.4)'},
];

// ═══════════════════════════════════════════════════
// CARD COLLECTIONS (Pairs Battle)
// "classic" is drawn on canvas; every other pack is colorful emoji.
// pool.length = how many distinct cards → caps the largest grid you can pick.
// Keep this list IN SYNC with worker/GameServer.js COLLECTIONS.
// ═══════════════════════════════════════════════════
const COLLECTIONS = [
  {id:'classic',  name:'Classic',     kind:'canvas', pool:OBJECTS.map(o=>o.id)},
  {id:'animals',  name:'Animals',     kind:'emoji',  pool:['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦄','🐴','🐗','🐺','🦓','🦒']},
  {id:'sealife',  name:'Sea Life',    kind:'emoji',  pool:['🐠','🐟','🐡','🦈','🐙','🦑','🦐','🦞','🦀','🐬','🐳','🐋','🐢','🐊','🦭','🐚','🦦','🪼','🦩','🦆','🦢','🐸','🦫','🪸']},
  {id:'fruits',   name:'Fruits',      kind:'emoji',  pool:['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🌽']},
  {id:'food',     name:'Fast Food',   kind:'emoji',  pool:['🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥙','🧆','🥚','🍳','🥞','🧇','🥓','🍗','🍖','🥨','🧀','🥗','🍝','🍜','🍣','🍱','🍙']},
  {id:'sweets',   name:'Sweets',      kind:'emoji',  pool:['🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍡','🥮','🥠','🍢','🧋','🍵','🌰','🥜','🍓','🫐']},
  {id:'flora',    name:'Flora',       kind:'emoji',  pool:['🌸','🌹','🌺','🌻','🌷','🌼','💐','🏵️','🌳','🌲','🌴','🌵','🌿','🍀','🍁','🍂','🍃','🌱','🪴','🌾','🪷','🍄','🎍','🌰']},
  {id:'kitchen',  name:'Kitchen',     kind:'emoji',  pool:['🍴','🥄','🔪','🍳','🥘','🫕','🍲','🥣','🥢','🧂','🫖','🍵','☕','🥤','🧋','🍶','🍽️','🧊','🧈','🧇','🍞','🥖','🥡','🧁']},
  {id:'devices',  name:'Electronics', kind:'emoji',  pool:['💻','🖥️','⌨️','🖱️','🖨️','📱','☎️','📞','📟','📠','📷','📹','🎥','📺','📻','🎙️','⏰','⌚','🔋','🔌','💡','🔦','🧮','🎮']},
  {id:'transport',name:'Vehicles',    kind:'emoji',  pool:['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','✈️','🚀','🚁','⛵','🚤','🚢','🚂']},
  {id:'sports',   name:'Sports',      kind:'emoji',  pool:['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥅','🏒','🏑','🥍','🏏','⛳','🏹','🎣','🥊','🥋','🎽','⛸️']},
  {id:'smileys',  name:'Smileys',     kind:'emoji',  pool:['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😗','😋','😜','🤪','😎','🤩','🥳','😏']},
  {id:'funpoop',  name:'Fun & Poop',  kind:'emoji',  pool:['💩','😈','👿','👹','👺','🤡','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🤓','🥶']},
  {id:'cats',     name:'Cat Smiles',  kind:'emoji',  pool:['😺','😸','😹','😻','😼','😽','🙀','😿','😾','🐱','🐈','🐈‍⬛','🦁','🐯','🐅','🐆']},
];
function collById(id){ return COLLECTIONS.find(c=>c.id===id) || COLLECTIONS[0]; }
function isEmojiToken(tok){ return !OBJECTS.some(o=>o.id===tok); }

// ═══════════════════════════════════════════════════
// BACKGROUND PARTICLES
// ═══════════════════════════════════════════════════
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const particles = [];
function initBg() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  particles.length = 0;
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.3 - 0.05,
      alpha: Math.random() * 0.5 + 0.1,
    });
  }
}
function animBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.y < -4) { p.y = bgCanvas.height + 4; p.x = Math.random() * bgCanvas.width; }
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(168,85,247,${p.alpha})`;
    bgCtx.fill();
  }
  requestAnimationFrame(animBg);
}
window.addEventListener('resize', initBg);
initBg(); animBg();

