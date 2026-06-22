// ── Multimeter defusal mini-game ─────────────────────────────────────────
import { lang } from './i18n.js?v=12';

// Measurement modes
const MODE = { V: 'V', OHM: 'Ω', CONT: 'CONT' };

const WIRE_C = {
  red:    { hex: '#dc2626', uk: 'Червоний',     en: 'Red'    },
  blue:   { hex: '#2563eb', uk: 'Синій',         en: 'Blue'   },
  green:  { hex: '#16a34a', uk: 'Зелений',       en: 'Green'  },
  yellow: { hex: '#ca8a04', uk: 'Жовтий',        en: 'Yellow' },
  black:  { hex: '#6b7280', uk: 'Чорний',        en: 'Black'  },
  white:  { hex: '#e2e8f0', uk: 'Білий',         en: 'White'  },
  orange: { hex: '#ea580c', uk: 'Помаранчевий',  en: 'Orange' },
  purple: { hex: '#7c3aed', uk: 'Фіолетовий',   en: 'Purple' },
};

// ── Puzzle catalogue ──────────────────────────────────────────────────────
// Measurement key format: 'MODE:nodeA:nodeB' (nodes sorted alphabetically)
// Unmeasured pairs return OL (open) by default.
// solution: [{wire, cutAfterMeasure}] — order matters for multi-step puzzles.

export const MM_DEVICES = {

  // ════════════════════════════════════════════════════════════════════════
  // TIER 1 — Simple voltage reading (level 5+)
  // Rule: find the wire that reads 0 V and cut it (disconnected from power)
  // ════════════════════════════════════════════════════════════════════════
  mm_t1: {
    tier: 1,
    minLevel: 5,
    nameEn: 'Voltage Probe',
    nameUk: 'Перевірка напруги',
    modes: [MODE.V],
    variants: [
      {
        wires: ['red', 'blue', 'black'],
        // Named nodes on the schematic; type: 'rail' = terminal, 'wire' = midpoint on a wire
        nodes: [
          { id: 'PWR', label: 'PWR', type: 'rail', desc: { en: 'Power +12V', uk: 'Живлення +12В' } },
          { id: 'GND', label: 'GND', type: 'rail', desc: { en: 'Ground 0V',  uk: 'Земля 0В'   } },
          { id: 'A',   label: 'A',   type: 'wire', wire: 'red'   },
          { id: 'B',   label: 'B',   type: 'wire', wire: 'blue'  },
          { id: 'C',   label: 'C',   type: 'wire', wire: 'black' },
        ],
        readings: {
          'V:A:PWR':   { d: '12.04 V', sev: 'armed'  },
          'V:B:PWR':   { d: ' 0.00 V', sev: 'safe'   },  // blue disconnected
          'V:C:PWR':   { d: '12.04 V', sev: 'armed'  },
          'V:A:GND':   { d: '12.04 V', sev: 'armed'  },
          'V:B:GND':   { d: ' 0.00 V', sev: 'safe'   },
          'V:C:GND':   { d: '12.04 V', sev: 'armed'  },
          'V:A:B':     { d: '12.04 V', sev: 'armed'  },
          'V:A:C':     { d: ' 0.00 V', sev: 'safe'   },
          'V:B:C':     { d: '12.04 V', sev: 'armed'  },
        },
        solution: [{ wire: 'blue', step: 1 }],
        ruleEn: [
          '🔋 Select V (voltage) mode. Touch RED probe to PWR (+), BLACK to each wire node.',
          '✅ A wire reading ~0 V is disconnected from the power circuit — SAFE to cut.',
          '⚡ Wires at ~12 V are armed — cutting them triggers the detonator.',
          '✂️ Identify the 0 V wire and cut it.',
        ],
        ruleUk: [
          '🔋 Режим V (напруга). ЧЕРВОНИЙ щуп → PWR (+), ЧОРНИЙ → вузол кожного дроту.',
          '✅ Дріт з ~0 В відключений від ланцюга живлення — БЕЗПЕЧНО різати.',
          '⚡ Дроти з ~12 В збройовані — їх розріз активує детонатор.',
          '✂️ Знайди дріт з 0 В і відріж його.',
        ],
      },
      {
        wires: ['red', 'green', 'black'],
        nodes: [
          { id: 'PWR', label: 'PWR', type: 'rail', desc: { en: 'Power +12V', uk: 'Живлення +12В' } },
          { id: 'GND', label: 'GND', type: 'rail', desc: { en: 'Ground 0V',  uk: 'Земля 0В'   } },
          { id: 'A',   label: 'A',   type: 'wire', wire: 'red'   },
          { id: 'B',   label: 'B',   type: 'wire', wire: 'green' },
          { id: 'C',   label: 'C',   type: 'wire', wire: 'black' },
        ],
        readings: {
          'V:A:PWR':  { d: '12.04 V', sev: 'armed' },
          'V:B:PWR':  { d: '12.04 V', sev: 'armed' },
          'V:C:PWR':  { d: ' 0.00 V', sev: 'safe'  },
          'V:A:GND':  { d: '12.04 V', sev: 'armed' },
          'V:B:GND':  { d: '12.04 V', sev: 'armed' },
          'V:C:GND':  { d: ' 0.00 V', sev: 'safe'  },
        },
        solution: [{ wire: 'black', step: 1 }],
        ruleEn: [
          '🔋 V mode. RED probe → PWR, BLACK probe → each wire node.',
          '✅ The wire at 0 V is disconnected — it\'s safe to cut.',
          '✂️ Cut the 0 V wire.',
        ],
        ruleUk: [
          '🔋 Режим V. ЧЕРВОНИЙ → PWR, ЧОРНИЙ → кожен вузол.',
          '✅ Дріт з 0 В відключений — безпечно різати.',
          '✂️ Відріж дріт з 0 В.',
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // TIER 2 — Signal wire identification (level 15+)
  // New concept: intermediate voltage (~5V) = signal trigger wire.
  // Two cuts required: signal wire first, then ground bypass.
  // ════════════════════════════════════════════════════════════════════════
  mm_t2: {
    tier: 2,
    minLevel: 15,
    nameEn: 'Signal Trace',
    nameUk: 'Трасування сигналу',
    modes: [MODE.V],
    variants: [
      {
        wires: ['red', 'blue', 'yellow', 'black'],
        nodes: [
          { id: 'PWR', label: 'PWR', type: 'rail', desc: { en: 'Power +12V', uk: '+12В' } },
          { id: 'GND', label: 'GND', type: 'rail', desc: { en: 'Ground 0V',  uk: '0В'   } },
          { id: 'A',   label: 'A',   type: 'wire', wire: 'red'    },
          { id: 'B',   label: 'B',   type: 'wire', wire: 'blue'   },
          { id: 'C',   label: 'C',   type: 'wire', wire: 'yellow' },
          { id: 'D',   label: 'D',   type: 'wire', wire: 'black'  },
        ],
        readings: {
          'V:A:PWR':  { d: '12.04 V', sev: 'armed'  },
          'V:B:PWR':  { d: ' 5.02 V', sev: 'signal' },  // SIGNAL trigger
          'V:C:PWR':  { d: ' 0.00 V', sev: 'safe'   },  // ground bypass
          'V:D:PWR':  { d: '12.04 V', sev: 'armed'  },
          'V:A:GND':  { d: '12.04 V', sev: 'armed'  },
          'V:B:GND':  { d: ' 5.02 V', sev: 'signal' },
          'V:C:GND':  { d: ' 0.00 V', sev: 'safe'   },
          'V:D:GND':  { d: '12.04 V', sev: 'armed'  },
        },
        // Step 1: cut signal wire first to stop trigger. Step 2: cut ground bypass.
        solution: [
          { wire: 'blue',   step: 1 },
          { wire: 'yellow', step: 2 },
        ],
        ruleEn: [
          '🔋 V mode: RED probe → PWR, BLACK probe → each wire node.',
          '⚡ 12V wires = power rail (armed). 0V wire = ground bypass.',
          '🟡 ~5V wire = SIGNAL TRIGGER — detonator fires on this logic signal.',
          '✂️ Cut the ~5V wire FIRST (kills the trigger), then the 0V bypass. TWO cuts, in order.',
        ],
        ruleUk: [
          '🔋 Режим V: ЧЕРВОНИЙ → PWR, ЧОРНИЙ → кожен вузол.',
          '⚡ 12В = силова шина. 0В = шунт землі.',
          '🟡 ~5В = СИГНАЛЬНИЙ ТРИГЕР — детонатор спрацює на цьому сигналі.',
          '✂️ Спочатку дріт ~5В (вбиває тригер), потім дріт 0В. ДВА розрізи по черзі.',
        ],
      },
      {
        wires: ['red', 'orange', 'green', 'black'],
        nodes: [
          { id: 'PWR', label: 'PWR', type: 'rail', desc: { en: 'Power +12V', uk: '+12В' } },
          { id: 'GND', label: 'GND', type: 'rail', desc: { en: 'Ground 0V',  uk: '0В'   } },
          { id: 'A',   label: 'A',   type: 'wire', wire: 'red'    },
          { id: 'B',   label: 'B',   type: 'wire', wire: 'orange' },
          { id: 'C',   label: 'C',   type: 'wire', wire: 'green'  },
          { id: 'D',   label: 'D',   type: 'wire', wire: 'black'  },
        ],
        readings: {
          'V:A:PWR':  { d: '12.04 V', sev: 'armed'  },
          'V:B:PWR':  { d: '12.04 V', sev: 'armed'  },
          'V:C:PWR':  { d: ' 5.02 V', sev: 'signal' },
          'V:D:PWR':  { d: ' 0.00 V', sev: 'safe'   },
          'V:A:GND':  { d: '12.04 V', sev: 'armed'  },
          'V:B:GND':  { d: '12.04 V', sev: 'armed'  },
          'V:C:GND':  { d: ' 5.02 V', sev: 'signal' },
          'V:D:GND':  { d: ' 0.00 V', sev: 'safe'   },
        },
        solution: [
          { wire: 'green', step: 1 },
          { wire: 'black', step: 2 },
        ],
        ruleEn: [
          '🔋 V mode: RED → PWR, BLACK → each wire node.',
          '🟢 ~5V = signal trigger wire. 0V = ground bypass.',
          '✂️ Cut 5V first, then 0V. Order matters.',
        ],
        ruleUk: [
          '🔋 Режим V: ЧЕРВОНИЙ → PWR, ЧОРНИЙ → кожен вузол.',
          '🟢 ~5В = сигнальний тригер. 0В = шунт землі.',
          '✂️ Спочатку 5В, потім 0В. Порядок важливий.',
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // TIER 3 — Multi-mode: voltage + continuity (level 22+)
  // Two steps: voltage to narrow candidates, continuity to identify DET path.
  // ════════════════════════════════════════════════════════════════════════
  mm_t3: {
    tier: 3,
    minLevel: 22,
    nameEn: 'Circuit Analysis',
    nameUk: 'Аналіз ланцюга',
    modes: [MODE.V, MODE.CONT],
    variants: [
      {
        wires: ['red', 'blue', 'white', 'green', 'black'],
        nodes: [
          { id: 'PWR', label: 'PWR', type: 'rail', desc: { en: 'Power +12V', uk: '+12В' } },
          { id: 'GND', label: 'GND', type: 'rail', desc: { en: 'Ground 0V',  uk: '0В'  } },
          { id: 'DET', label: 'DET', type: 'rail', desc: { en: 'Detonator terminal', uk: 'Термінал детонатора' } },
          { id: 'A',   label: 'A',   type: 'wire', wire: 'red'   },
          { id: 'B',   label: 'B',   type: 'wire', wire: 'blue'  },
          { id: 'C',   label: 'C',   type: 'wire', wire: 'white' },
          { id: 'D',   label: 'D',   type: 'wire', wire: 'green' },
          { id: 'E',   label: 'E',   type: 'wire', wire: 'black' },
        ],
        readings: {
          // Voltage: narrow to 3.3V candidates
          'V:A:PWR': { d: '12.04 V', sev: 'armed'  },
          'V:B:PWR': { d: '12.04 V', sev: 'armed'  },
          'V:C:PWR': { d: ' 3.30 V', sev: 'signal' },  // signal bus candidate
          'V:D:PWR': { d: ' 3.30 V', sev: 'signal' },  // DECOY — also 3.3V
          'V:E:PWR': { d: ' 0.00 V', sev: 'safe'   },
          'V:A:GND': { d: '12.04 V', sev: 'armed'  },
          'V:C:GND': { d: ' 3.30 V', sev: 'signal' },
          'V:D:GND': { d: ' 3.30 V', sev: 'signal' },
          'V:E:GND': { d: ' 0.00 V', sev: 'safe'   },
          // Continuity: identify which 3.3V wire connects to DET
          'CONT:C:DET': { d: '◼ CONT ♪', sev: 'cont', beep: true  },  // white → DET: trigger!
          'CONT:D:DET': { d: '○ OPEN',   sev: 'open', beep: false },  // decoy — no DET path
          'CONT:A:DET': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:B:DET': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:E:DET': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:E:GND': { d: '◼ CONT ♪', sev: 'cont', beep: true  },  // E is ground
          'CONT:C:GND': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:D:GND': { d: '○ OPEN',   sev: 'open', beep: false },
        },
        solution: [{ wire: 'white', step: 1 }],
        ruleEn: [
          '🔋 STEP 1 — Voltage mode (V): RED → PWR. Identify all ~3.3 V wires.',
          '   3.3V = logic signal bus. Multiple wires may show 3.3V (decoys exist).',
          '🔊 STEP 2 — Continuity mode (CONT): test each 3.3V wire against DET terminal.',
          '   ◼ CONT (beep) = wire is connected to detonator = TRIGGER wire.',
          '   ○ OPEN = decoy, not connected to detonator.',
          '✂️ Cut the wire that showed CONT to DET. One cut.',
        ],
        ruleUk: [
          '🔋 КРОК 1 — Режим напруги (V): ЧЕРВОНИЙ → PWR. Знайди дроти з ~3.3В.',
          '   3.3В = шина логічного сигналу. Можуть бути хибні кандидати (ловушки).',
          '🔊 КРОК 2 — Безперервність (CONT): перевір кожен дріт 3.3В до вузла DET.',
          '   ◼ CONT (звук) = дріт з\'єднаний з детонатором = ТРИГЕР.',
          '   ○ OPEN = ловушка, немає шляху до детонатора.',
          '✂️ Відріж дріт з CONT до DET. Один розріз.',
        ],
      },
      {
        wires: ['red', 'blue', 'orange', 'white', 'black'],
        nodes: [
          { id: 'PWR', label: 'PWR', type: 'rail', desc: { en: 'Power +12V', uk: '+12В' } },
          { id: 'GND', label: 'GND', type: 'rail', desc: { en: 'Ground 0V',  uk: '0В'  } },
          { id: 'DET', label: 'DET', type: 'rail', desc: { en: 'Detonator terminal', uk: 'Термінал детонатора' } },
          { id: 'A',   label: 'A',   type: 'wire', wire: 'red'    },
          { id: 'B',   label: 'B',   type: 'wire', wire: 'blue'   },
          { id: 'C',   label: 'C',   type: 'wire', wire: 'orange' },
          { id: 'D',   label: 'D',   type: 'wire', wire: 'white'  },
          { id: 'E',   label: 'E',   type: 'wire', wire: 'black'  },
        ],
        readings: {
          'V:A:PWR':    { d: '12.04 V', sev: 'armed'  },
          'V:B:PWR':    { d: ' 3.30 V', sev: 'signal' },
          'V:C:PWR':    { d: '12.04 V', sev: 'armed'  },
          'V:D:PWR':    { d: ' 3.30 V', sev: 'signal' },
          'V:E:PWR':    { d: ' 0.00 V', sev: 'safe'   },
          'CONT:B:DET': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:D:DET': { d: '◼ CONT ♪', sev: 'cont', beep: true  },
          'CONT:A:DET': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:C:DET': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:E:DET': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:E:GND': { d: '◼ CONT ♪', sev: 'cont', beep: true  },
        },
        solution: [{ wire: 'white', step: 1 }],
        ruleEn: [
          '🔋 V mode: find the ~3.3V wires.',
          '🔊 CONT mode: test 3.3V wires against DET. CONT = trigger, OPEN = decoy.',
          '✂️ Cut the wire with CONT to DET.',
        ],
        ruleUk: [
          '🔋 Режим V: знайди дроти ~3.3В.',
          '🔊 Режим CONT: перевір дроти 3.3В до DET. CONT = тригер, OPEN = ловушка.',
          '✂️ Відріж дріт з CONT до DET.',
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // TIER 4 — Full 3-mode analysis + time pressure (level 27+)
  // Three modes: V, Ω (resistance), CONT.
  // Two decoy wires show same voltage. Resistance distinguishes real from fake.
  // Two cuts required in specific order: ARM wire first, then TRIGGER wire.
  // ════════════════════════════════════════════════════════════════════════
  mm_t4: {
    tier: 4,
    minLevel: 27,
    timerSec: 90,
    nameEn: 'Advanced Circuit Analysis',
    nameUk: 'Поглиблений аналіз ланцюга',
    modes: [MODE.V, MODE.OHM, MODE.CONT],
    variants: [
      {
        wires: ['red', 'blue', 'white', 'orange', 'green', 'black'],
        nodes: [
          { id: 'PWR', label: 'PWR', type: 'rail', desc: { en: 'Power +12V', uk: '+12В' } },
          { id: 'GND', label: 'GND', type: 'rail', desc: { en: 'Ground 0V',  uk: '0В'  } },
          { id: 'DET', label: 'DET', type: 'rail', desc: { en: 'Detonator',  uk: 'Детонатор' } },
          { id: 'ARM', label: 'ARM', type: 'rail', desc: { en: 'Arming bus', uk: 'Шина взведення' } },
          { id: 'A',   label: 'A',   type: 'wire', wire: 'red'    },
          { id: 'B',   label: 'B',   type: 'wire', wire: 'blue'   },
          { id: 'C',   label: 'C',   type: 'wire', wire: 'white'  },
          { id: 'D',   label: 'D',   type: 'wire', wire: 'orange' },
          { id: 'E',   label: 'E',   type: 'wire', wire: 'green'  },
          { id: 'F',   label: 'F',   type: 'wire', wire: 'black'  },
        ],
        readings: {
          // Voltage
          'V:A:PWR':    { d: '12.04 V', sev: 'armed'  },
          'V:B:PWR':    { d: '12.04 V', sev: 'armed'  },
          'V:C:PWR':    { d: ' 3.30 V', sev: 'signal' },  // real trigger
          'V:D:PWR':    { d: ' 3.30 V', sev: 'signal' },  // DECOY
          'V:E:PWR':    { d: ' 3.30 V', sev: 'signal' },  // DECOY
          'V:F:PWR':    { d: ' 0.00 V', sev: 'safe'   },
          // Resistance: distinguish real trigger (low Ω to DET) from decoys (high kΩ)
          'OHM:C:DET':  { d: '  47 Ω',  sev: 'signal' },  // real — low resistance path to DET
          'OHM:D:DET':  { d: '10.2 kΩ', sev: 'armed'  },  // decoy
          'OHM:E:DET':  { d: ' 8.7 kΩ', sev: 'armed'  },  // decoy
          'OHM:A:DET':  { d: 'OL',       sev: 'open'   },
          'OHM:B:DET':  { d: 'OL',       sev: 'open'   },
          'OHM:F:DET':  { d: 'OL',       sev: 'open'   },
          // Continuity: find arming wire
          'CONT:D:ARM': { d: '◼ CONT ♪', sev: 'cont', beep: true  },  // orange = ARM wire
          'CONT:A:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:B:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:C:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:E:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:F:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:C:DET': { d: '◼ CONT ♪', sev: 'cont', beep: true  },
          'CONT:D:DET': { d: '○ OPEN',   sev: 'open', beep: false },
        },
        // ARM wire (orange) must be cut first to disarm, then trigger wire (white)
        solution: [
          { wire: 'orange', step: 1 },
          { wire: 'white',  step: 2 },
        ],
        ruleEn: [
          '⚠️ TWO-STAGE device. Wrong order = instant detonation.',
          '🔋 Step 1 — Voltage (V): RED → PWR. Three wires read 3.3V — identify all candidates.',
          '🔌 Step 2 — Resistance (Ω): Probe each 3.3V candidate against DET.',
          '   < 100 Ω to DET = TRUE TRIGGER. > 1 kΩ = decoy.',
          '🔊 Step 3 — Continuity (CONT): Find the wire with CONT to ARM terminal.',
          '   ARM wire keeps the detonator armed while trigger is live.',
          '✂️ Cut ARM wire FIRST (disarms), then cut TRIGGER wire. Both in order.',
        ],
        ruleUk: [
          '⚠️ ДВОСТУПЕНЕВИЙ пристрій. Неправильний порядок = миттєва детонація.',
          '🔋 Крок 1 — Напруга (V): ЧЕРВОНИЙ → PWR. Три дроти дають 3.3В — знайди всіх кандидатів.',
          '🔌 Крок 2 — Опір (Ω): вимір кожен кандидат 3.3В до вузла DET.',
          '   < 100 Ом до DET = СПРАВЖНІЙ ТРИГЕР. > 1 кОм = ловушка.',
          '🔊 Крок 3 — Безперервність (CONT): знайди дріт з CONT до вузла ARM.',
          '   ARM дріт тримає детонатор у бойовому стані.',
          '✂️ Спочатку ARM дріт (знезброює), потім TRIGGER дріт. Порядок суворий.',
        ],
      },
      {
        wires: ['red', 'blue', 'purple', 'yellow', 'white', 'black'],
        nodes: [
          { id: 'PWR', label: 'PWR', type: 'rail', desc: { en: 'Power +12V', uk: '+12В' } },
          { id: 'GND', label: 'GND', type: 'rail', desc: { en: 'Ground 0V',  uk: '0В'  } },
          { id: 'DET', label: 'DET', type: 'rail', desc: { en: 'Detonator',  uk: 'Детонатор' } },
          { id: 'ARM', label: 'ARM', type: 'rail', desc: { en: 'Arming bus', uk: 'Шина взведення' } },
          { id: 'A',   label: 'A',   type: 'wire', wire: 'red'    },
          { id: 'B',   label: 'B',   type: 'wire', wire: 'blue'   },
          { id: 'C',   label: 'C',   type: 'wire', wire: 'purple' },
          { id: 'D',   label: 'D',   type: 'wire', wire: 'yellow' },
          { id: 'E',   label: 'E',   type: 'wire', wire: 'white'  },
          { id: 'F',   label: 'F',   type: 'wire', wire: 'black'  },
        ],
        readings: {
          'V:A:PWR':    { d: '12.04 V', sev: 'armed'  },
          'V:B:PWR':    { d: ' 3.30 V', sev: 'signal' },
          'V:C:PWR':    { d: ' 3.30 V', sev: 'signal' },
          'V:D:PWR':    { d: ' 0.00 V', sev: 'safe'   },
          'V:E:PWR':    { d: '12.04 V', sev: 'armed'  },
          'V:F:PWR':    { d: ' 3.30 V', sev: 'signal' },
          'OHM:B:DET':  { d: ' 8.2 kΩ', sev: 'armed'  },
          'OHM:C:DET':  { d: '  33 Ω',  sev: 'signal' },  // real trigger
          'OHM:F:DET':  { d: '15.6 kΩ', sev: 'armed'  },
          'OHM:A:DET':  { d: 'OL',       sev: 'open'   },
          'OHM:E:DET':  { d: 'OL',       sev: 'open'   },
          'CONT:E:ARM': { d: '◼ CONT ♪', sev: 'cont', beep: true  },  // white = ARM wire
          'CONT:A:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:B:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:C:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:D:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:F:ARM': { d: '○ OPEN',   sev: 'open', beep: false },
          'CONT:C:DET': { d: '◼ CONT ♪', sev: 'cont', beep: true  },
        },
        solution: [
          { wire: 'white',  step: 1 },
          { wire: 'purple', step: 2 },
        ],
        ruleEn: [
          '⚠️ Two-stage device — wrong order detonates.',
          '🔋 Step 1 (V): find all 3.3V wires.',
          '🔌 Step 2 (Ω): resistance to DET — < 100 Ω = TRUE trigger.',
          '🔊 Step 3 (CONT): CONT to ARM = arming wire.',
          '✂️ ARM wire first, TRIGGER wire second.',
        ],
        ruleUk: [
          '⚠️ Двоступеневий — неправильний порядок = підрив.',
          '🔋 Крок 1 (V): знайди всі дроти 3.3В.',
          '🔌 Крок 2 (Ω): опір до DET — < 100 Ом = СПРАВЖНІЙ тригер.',
          '🔊 Крок 3 (CONT): CONT до ARM = дріт взведення.',
          '✂️ Спочатку ARM, потім TRIGGER.',
        ],
      },
    ],
  },
};

// ── Node layout engine ────────────────────────────────────────────────────
// Assigns SVG positions to nodes. The schematic lives in x:[95,430] y:[60,220].
function layoutNodes(nodes, wires) {
  const wireNodes = nodes.filter(n => n.type === 'wire');
  const railNodes = nodes.filter(n => n.type === 'rail');
  const n = wireNodes.length;
  const yStart = 80, yEnd = 210;
  const yStep = n > 1 ? (yEnd - yStart) / (n - 1) : 0;

  const pos = {};

  // Wire midpoint nodes — evenly spaced vertically at x=270
  wireNodes.forEach((nd, i) => {
    pos[nd.id] = { x: 270, y: yStart + i * yStep };
  });

  // Rail nodes — positioned on the left connector block
  const RAIL_X = {
    PWR: { x: 91, y: 108 },
    GND: { x: 91, y: 148 },
    DET: { x: 429, y: 118 },
    ARM: { x: 429, y: 148 },
    SIG: { x: 429, y: 178 },
  };
  railNodes.forEach(nd => {
    if (RAIL_X[nd.id]) pos[nd.id] = RAIL_X[nd.id];
  });

  return pos;
}

// ── SVG builder ───────────────────────────────────────────────────────────
function buildSchemSVG(puzzle, variant, nodePositions, redNode, blackNode, cut) {
  const wires = variant.wires;
  const nodes = variant.nodes;
  const wireNodes = nodes.filter(n => n.type === 'wire');

  // Draw wires as bezier curves from left connector to node, then to right
  const WIRE_LEFT_X = 91;
  const NODE_X = 270;
  const DET_X = 429;

  const wireLines = wires.map((wid, i) => {
    const nd = wireNodes[i];
    if (!nd || !nodePositions[nd.id]) return '';
    const ny = nodePositions[nd.id].y;
    const wc = WIRE_C[wid];
    const isCut = cut && cut.includes(wid);
    const stroke = isCut ? '#333' : wc.hex;
    const dash = isCut ? 'stroke-dasharray="8,6"' : '';
    const opacity = isCut ? '0.3' : '1';
    const ctrl1x = (WIRE_LEFT_X + NODE_X) / 2;
    const ctrl2x = (NODE_X + DET_X) / 2;

    // Left half: connector → node
    const left = `<path d="M ${WIRE_LEFT_X},${ny} C ${ctrl1x},${ny} ${ctrl1x},${ny} ${NODE_X},${ny}"
      stroke="${stroke}" stroke-width="4.5" fill="none" stroke-linecap="round" ${dash} opacity="${opacity}"/>`;
    // Right half: node → detonator
    const right = `<path d="M ${NODE_X},${ny} C ${ctrl2x},${ny} ${ctrl2x},${ny} ${DET_X},${ny}"
      stroke="${stroke}" stroke-width="4.5" fill="none" stroke-linecap="round" ${dash} opacity="${opacity}"/>`;
    return left + right;
  }).join('');

  // Draw nodes
  const nodeCircles = nodes.map(nd => {
    const p = nodePositions[nd.id];
    if (!p) return '';
    const isRed   = redNode   === nd.id;
    const isBlack = blackNode === nd.id;
    const waiting = !redNode && !blackNode; // no probe placed yet → pulse wire nodes
    let fill = '#1a2d1a';
    let stroke = '#4a6a4a';
    let textColor = '#8ecf9a';
    if (nd.type === 'wire') {
      const wc = WIRE_C[nd.wire];
      fill = wc ? wc.hex + '33' : fill;
      stroke = wc ? wc.hex : stroke;
    }
    if (nd.id === 'PWR') { fill = '#3a2a00'; stroke = '#ca8a04'; textColor = '#fde047'; }
    if (nd.id === 'GND') { fill = '#1a1a1a'; stroke = '#6b7280'; textColor = '#9ca3af'; }
    if (nd.id === 'DET') { fill = '#2a0505'; stroke = '#7f1d1d'; textColor = '#f87171'; }
    if (nd.id === 'ARM') { fill = '#1a200a'; stroke = '#4d7c0f'; textColor = '#86efac'; }

    const probeRing = isRed
      ? `<circle cx="${p.x}" cy="${p.y}" r="14" fill="none" stroke="#ff4444" stroke-width="2.5" opacity="0.9"/>`
      : isBlack
      ? `<circle cx="${p.x}" cy="${p.y}" r="14" fill="none" stroke="#9ca3af" stroke-width="2.5" opacity="0.9"/>`
      : '';
    // Pulse hint ring when player hasn't touched any node yet
    const pulseRing = (!isRed && !isBlack && waiting)
      ? `<circle cx="${p.x}" cy="${p.y}" r="14" fill="none" stroke="${stroke}" stroke-width="1.5"
           opacity="0.55" class="mm-node-pulse"/>`
      : '';

    return `${probeRing}${pulseRing}
<circle class="mm-node" data-node="${nd.id}" cx="${p.x}" cy="${p.y}" r="13"
  fill="${fill}" stroke="${stroke}" stroke-width="2" style="cursor:pointer"/>
<circle class="mm-node-hit" data-node="${nd.id}" cx="${p.x}" cy="${p.y}" r="20"
  fill="transparent" style="cursor:pointer"/>
<text class="mm-node-lbl" x="${p.x}" y="${p.y + 4}" text-anchor="middle"
  font-size="9" font-weight="700" font-family="monospace" fill="${textColor}">${nd.label}</text>`;
  }).join('');

  return `<svg id="mm-schem" viewBox="0 0 520 280" xmlns="http://www.w3.org/2000/svg">
<!-- Case body -->
<rect x="8" y="8" width="504" height="264" rx="12" fill="#1a2d1a" stroke="#3a5a3a" stroke-width="2.5"/>
<rect x="14" y="14" width="492" height="252" rx="9" fill="none" stroke="#0a180a" stroke-width="1.5" opacity="0.6"/>
<!-- Corner bolts -->
<circle cx="26" cy="26" r="5" fill="#2d4a2d" stroke="#1a2a1a" stroke-width="1.5"/>
<circle cx="494" cy="26" r="5" fill="#2d4a2d" stroke="#1a2a1a" stroke-width="1.5"/>
<circle cx="26" cy="254" r="5" fill="#2d4a2d" stroke="#1a2a1a" stroke-width="1.5"/>
<circle cx="494" cy="254" r="5" fill="#2d4a2d" stroke="#1a2a1a" stroke-width="1.5"/>
<!-- Battery block -->
<rect x="28" y="64" width="54" height="88" rx="7" fill="#c4a020" stroke="#a08010" stroke-width="2"/>
<rect x="34" y="56" width="42" height="12" rx="3" fill="#888" stroke="#666" stroke-width="1"/>
<rect x="38" y="49" width="13" height="10" rx="2" fill="#888" stroke="#666" stroke-width="1"/>
<rect x="55" y="51" width="10" height="8" rx="2" fill="#888" stroke="#666" stroke-width="1"/>
<text x="55" y="105" text-anchor="middle" fill="#2d1a00" font-size="12" font-weight="900" font-family="monospace">9V</text>
<text x="55" y="120" text-anchor="middle" fill="#2d1a00" font-size="7" font-family="monospace">BATTERY</text>
<!-- Left connector block -->
<rect x="83" y="74" width="13" height="106" rx="3" fill="#1e1e1e" stroke="#3a3a3a" stroke-width="1.5"/>
<circle cx="89" cy="100" r="3.5" fill="#ca8a04"/>
<circle cx="89" cy="118" r="3.5" fill="#ca8a04"/>
<circle cx="89" cy="136" r="3.5" fill="#6b7280"/>
<circle cx="89" cy="154" r="3.5" fill="#6b7280"/>
<!-- Right connector block -->
<rect x="424" y="74" width="13" height="106" rx="3" fill="#1e1e1e" stroke="#3a3a3a" stroke-width="1.5"/>
<circle cx="430" cy="100" r="3.5" fill="#7f1d1d"/>
<circle cx="430" cy="118" r="3.5" fill="#7f1d1d"/>
<circle cx="430" cy="136" r="3.5" fill="#4d7c0f"/>
<circle cx="430" cy="154" r="3.5" fill="#4d7c0f"/>
<!-- Detonator -->
<ellipse cx="471" cy="62" rx="23" ry="11" fill="#9aaa9a" stroke="#6a8a6a" stroke-width="1.5"/>
<rect x="448" y="62" width="46" height="120" fill="#b0c0b0" stroke="#8aaa8a" stroke-width="1.5"/>
<ellipse cx="471" cy="182" rx="23" ry="11" fill="#8a9a8a" stroke="#6a8a6a" stroke-width="1.5"/>
<text x="471" y="118" text-anchor="middle" fill="#2a4a2a" font-size="10" font-weight="900" font-family="monospace">DET</text>
<text x="471" y="135" text-anchor="middle" font-size="15">⚡</text>
<!-- Wires -->
${wireLines}
<!-- Probe nodes (on top) -->
${nodeCircles}
</svg>`;
}

// ── Multimeter display ────────────────────────────────────────────────────
function buildMeterHTML(reading, mode, modes, timerSec, timeLeft) {
  const sevColor = {
    armed:  '#f87171',
    safe:   '#4ade80',
    signal: '#fde047',
    cont:   '#4ade80',
    open:   '#6b7280',
    '':     '#22c55e',
  };
  const displayColor = reading ? sevColor[reading.sev] || '#22c55e' : '#22c55e';
  const displayText = reading ? reading.d : (mode === MODE.CONT ? '○ OPEN' : '--- ');

  const modeBtns = modes.map(m =>
    `<button class="mm-mode-btn${m === mode ? ' mm-mode-active' : ''}" data-mode="${m}">${m === 'CONT' ? 'CONT' : m}</button>`
  ).join('');

  const timerHTML = timerSec
    ? `<div id="mm-timer" class="${timeLeft <= 15 ? 'mm-timer-crit' : ''}">${String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}</div>`
    : '';

  return `<div id="mm-meter">
  <div id="mm-meter-brand">⚡ FLUKE-87</div>
  <div id="mm-display" style="color:${displayColor}">${displayText}</div>
  ${timerHTML}
  <div id="mm-mode-row">${modeBtns}</div>
  <div id="mm-probe-row">
    <button id="mm-probe-red" class="mm-probe mm-probe-r" data-probe="red">🔴 <span id="mm-red-label">—</span></button>
    <button id="mm-probe-black" class="mm-probe mm-probe-b" data-probe="black">⚫ <span id="mm-black-label">—</span></button>
  </div>
</div>`;
}

// ── Main exported function ────────────────────────────────────────────────
export function showMultimeter(cell, onSuccess, onFail) {
  const isUk = lang === 'uk';
  const devType = MM_DEVICES[cell.device.type];
  const variant = devType.variants[cell.device.variantIdx];
  const modes = devType.modes;

  let modal = document.getElementById('mm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mm-modal';
    document.body.appendChild(modal);
  }

  // State
  let curMode = modes[0];
  let redNode = null, blackNode = null;
  let lastReading = null;
  let nextCutStep = 1;
  let resolved = false;
  let timeLeft = devType.timerSec || 0;
  let timerInterval = null;
  const cutDone = new Set();
  const measLog = [];  // history of {key, result} for display

  const nodePositions = layoutNodes(variant.nodes, variant.wires);

  function readingKey(mode, n1, n2) {
    // Sort node IDs alphabetically for consistent lookup
    return `${mode}:${[n1, n2].sort().join(':')}`;
  }

  function getReading(n1, n2) {
    const key = readingKey(curMode, n1, n2);
    return variant.readings[key] || null;
  }

  function nodeName(id) {
    const nd = variant.nodes.find(n => n.id === id);
    if (!nd) return id;
    if (nd.type === 'wire') {
      const wc = WIRE_C[nd.wire];
      return isUk ? wc.uk : wc.en;
    }
    const desc = nd.desc;
    return desc ? (isUk ? desc.uk : desc.en) : nd.label;
  }

  function wireName(wid) {
    const wc = WIRE_C[wid];
    return wc ? (isUk ? wc.uk : wc.en) : wid;
  }

  function buildStepGuide() {
    const cutsLeft = variant.solution.length - cutDone.size;
    if (!redNode && measLog.length === 0) {
      // Very first interaction — explain what to do
      return `<div id="mm-step-guide" class="mm-sg-probe1">
        <span class="mm-sg-step">1</span>
        <span>${isUk
          ? '👆 Тицни на кружечок (вузол) на схемі ліворуч — покладеш ЧЕРВОНИЙ щуп'
          : '👆 Tap a node circle on the diagram — places RED probe'}</span>
      </div>`;
    }
    if (redNode && !blackNode) {
      return `<div id="mm-step-guide" class="mm-sg-probe2">
        <span class="mm-sg-step">2</span>
        <span>${isUk
          ? '⚫ Тепер тицни на ДРУГИЙ вузол — чорний щуп → вимірювання відбудеться автоматично'
          : '⚫ Now tap a SECOND node — black probe → reading fires automatically'}</span>
      </div>`;
    }
    if (measLog.length > 0 && cutsLeft > 0) {
      return `<div id="mm-step-guide" class="mm-sg-cut">
        <span class="mm-sg-step">✂</span>
        <span>${isUk
          ? `Аналізуй показники → вибери правильний дріт нижче. Помилка = підрив.`
          : `Analyse readings → cut the right wire below. Wrong cut = detonation.`}</span>
      </div>`;
    }
    if (!redNode) {
      return `<div id="mm-step-guide" class="mm-sg-probe1">
        <span class="mm-sg-step">+</span>
        <span>${isUk
          ? '👆 Тицни ще раз на два вузли для наступного вимірювання'
          : '👆 Tap two more nodes for another measurement'}</span>
      </div>`;
    }
    return '';
  }

  function updateStepGuide() {
    const el = document.getElementById('mm-step-guide');
    if (el) el.outerHTML = buildStepGuide();
  }

  function render() {
    const cutArr = [...cutDone];
    const schemSVG = buildSchemSVG(devType, variant, nodePositions, redNode, blackNode, cutArr);
    const meterHTML = buildMeterHTML(lastReading, curMode, modes, devType.timerSec, timeLeft);

    const deviceName = isUk ? devType.nameUk : devType.nameEn;
    const tierLabel = ['', isUk ? 'Легкий' : 'Easy', isUk ? 'Середній' : 'Medium',
                           isUk ? 'Складний' : 'Hard', isUk ? 'Експерт' : 'Expert'][devType.tier] || '';
    const hintLabel = isUk ? '📋 Інструкція' : '📋 Manual';

    // Measurement log (last 4)
    const logItems = measLog.slice(-4).map(m => {
      const sevCls = { armed: 'mm-log-armed', safe: 'mm-log-safe', signal: 'mm-log-signal',
                       cont: 'mm-log-safe', open: 'mm-log-open' };
      return `<div class="mm-log-item ${sevCls[m.sev] || ''}">
        <span class="mm-log-key">${m.mode} [${m.n1}↔${m.n2}]</span>
        <span class="mm-log-val">${m.d}</span>
      </div>`;
    }).join('');

    // Wire cut panel — show ALL wires so player must figure out which from measurements
    const cutPanel = (() => {
      const cutsNeeded = variant.solution.length;
      const cutsDone = cutDone.size;
      const panelLabel = isUk
        ? `✂️ Вибери дріт для розрізання (${cutsDone}/${cutsNeeded}):`
        : `✂️ Select wire to cut (${cutsDone}/${cutsNeeded}):`;
      const btns = variant.wires.map(wid => {
        const wc = WIRE_C[wid];
        const label = wireName(wid);
        if (cutDone.has(wid)) {
          return `<div class="mm-cut-done" style="color:${wc.hex}88">✂️ ${label} ✓</div>`;
        }
        return `<button class="mm-cut-btn mm-cut-ready" data-wire="${wid}"
          style="border-color:${wc.hex}; color:${wc.hex}">
          ✂️ ${label}
        </button>`;
      }).join('');
      return `<div id="mm-cut-panel"><div class="mm-cut-label">${panelLabel}</div>${btns}</div>`;
    })();

    const timerBar = devType.timerSec
      ? `<span id="mm-hdr-timer" class="${timeLeft <= 15 ? 'mm-timer-crit' : ''}">${
          String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}</span>`
      : '';

    modal.innerHTML = `
<div id="mm-box">
  <div id="mm-header">
    <span id="mm-devname">${deviceName}</span>
    <span class="mm-tier-badge mm-tier-${devType.tier}">${tierLabel}</span>
    ${timerBar}
    <button id="mm-hint-btn" class="btn">${hintLabel}</button>
  </div>
  ${buildStepGuide()}
  <div id="mm-body">
    <div id="mm-schem-wrap">${schemSVG}</div>
    <div id="mm-panel">
      ${meterHTML}
      <div id="mm-log">${logItems || `<div class="mm-log-empty">${isUk ? 'Немає вимірювань' : 'No measurements yet'}</div>`}</div>
      ${cutPanel}
    </div>
  </div>
  <div id="mm-hint-panel">
    <ul>${(isUk ? variant.ruleUk : variant.ruleEn).map(r => `<li>${r}</li>`).join('')}</ul>
  </div>
</div>`;

    modal.style.display = 'flex';

    // Wire up mode buttons
    modal.querySelectorAll('.mm-mode-btn').forEach(btn => {
      btn.onclick = () => {
        curMode = btn.dataset.mode;
        redNode = null; blackNode = null; lastReading = null;
        setStatus(isUk ? `Режим: ${curMode}. Оберіть два вузли.` : `Mode: ${curMode}. Select two nodes.`, '');
        render();
      };
    });

    // Wire up node clicks (visible circle + invisible hit-area overlay)
    modal.querySelectorAll('.mm-node, .mm-node-hit').forEach(el => {
      el.onclick = () => onNodeClick(el.dataset.node);
    });

    // Wire up probe buttons — click to deselect
    const probeRed = document.getElementById('mm-probe-red');
    const probeBlack = document.getElementById('mm-probe-black');
    if (probeRed) probeRed.onclick = () => {
      if (resolved || !redNode) return;
      redNode = null; blackNode = null; lastReading = null;
      updateProbeLabels(); refreshNodeHighlights(); updateStepGuide();
    };
    if (probeBlack) probeBlack.onclick = () => {
      if (resolved || !blackNode) return;
      blackNode = null; lastReading = null;
      updateProbeLabels(); refreshNodeHighlights(); updateStepGuide();
    };

    // Wire up cut buttons
    modal.querySelectorAll('.mm-cut-btn:not([disabled])').forEach(btn => {
      btn.onclick = () => onCut(btn.dataset.wire);
    });

    // Hint panel toggle
    const hintBtn = document.getElementById('mm-hint-btn');
    if (hintBtn) hintBtn.onclick = () => {
      const p = document.getElementById('mm-hint-panel');
      if (p) p.classList.toggle('mm-hint-open');
    };
  }

  function onNodeClick(nodeId) {
    if (resolved) return;
    if (!redNode) {
      redNode = nodeId;
      updateProbeLabels();
      refreshNodeHighlights();
      updateStepGuide();
      return;
    }
    if (nodeId === redNode) {
      // Deselect red
      redNode = null; blackNode = null; lastReading = null;
      updateProbeLabels();
      refreshNodeHighlights();
      updateStepGuide();
      return;
    }
    blackNode = nodeId;
    updateProbeLabels();
    refreshNodeHighlights();
    measure();
  }

  function measure() {
    if (!redNode || !blackNode || resolved) return;
    const reading = getReading(redNode, blackNode);
    lastReading = reading;

    const n1Label = variant.nodes.find(n => n.id === redNode)?.label || redNode;
    const n2Label = variant.nodes.find(n => n.id === blackNode)?.label || blackNode;

    if (reading) {
      measLog.push({ mode: curMode, n1: n1Label, n2: n2Label, d: reading.d, sev: reading.sev });
      if (reading.beep) playBeep();

      const sevMsg = {
        armed:  isUk ? '⚡ Збройований ланцюг!' : '⚡ Armed circuit!',
        safe:   isUk ? '✅ Безпечний дріт' : '✅ Safe wire',
        signal: isUk ? '🟡 Сигнальний ланцюг' : '🟡 Signal circuit',
        cont:   isUk ? '◼ Є з\'єднання!' : '◼ Continuity detected!',
        open:   isUk ? '○ Розрив ланцюга' : '○ Open circuit',
      };
      setStatus(sevMsg[reading.sev] || reading.d, reading.sev);
    } else {
      // OL — open/unmeasured
      measLog.push({ mode: curMode, n1: n1Label, n2: n2Label, d: 'OL', sev: 'open' });
      setStatus(isUk ? '○ OL — розрив / не підключено' : '○ OL — open circuit / not connected', 'open');
    }

    // Reset probes after measurement
    redNode = null; blackNode = null;
    render();
  }

  function onCut(wireId) {
    if (resolved) return;
    const expected = variant.solution.find(s => s.step === nextCutStep);
    if (!expected || expected.wire !== wireId) {
      // Wrong wire — immediate detonation
      setStatus(isUk ? `💥 ${wireName(wireId)} — НЕПРАВИЛЬНИЙ ДРІТ! Детонація!`
                     : `💥 ${wireName(wireId)} — WRONG WIRE! Detonation!`, 'armed');
      setTimeout(() => resolve(false), 800);
      return;
    }
    cutDone.add(wireId);
    nextCutStep++;
    if (nextCutStep > variant.solution.length) {
      setStatus(isUk ? '✅ Пристрій знешкоджено!' : '✅ Device neutralized!', 'safe');
      setTimeout(() => resolve(true), 600);
    } else {
      setStatus(isUk ? '✅ Є! Обери наступний дріт.' : '✅ Good! Select next wire.', 'signal');
      render();
    }
  }

  function setStatus(text, cls) {
    const el = document.getElementById('mm-status');
    if (!el) return;
    el.textContent = text;
    const map = { armed: 'mm-s-error', safe: 'mm-s-success', signal: 'mm-s-warn',
                  cont: 'mm-s-success', open: 'mm-s-muted', '': '' };
    el.className = map[cls] || '';
  }

  function updateProbeLabels() {
    const rEl = document.getElementById('mm-red-label');
    const bEl = document.getElementById('mm-black-label');
    const rNd = redNode   ? variant.nodes.find(n => n.id === redNode)?.label   || redNode   : '—';
    const bNd = blackNode ? variant.nodes.find(n => n.id === blackNode)?.label || blackNode : '—';
    if (rEl) rEl.textContent = rNd;
    if (bEl) bEl.textContent = bNd;
  }

  function refreshNodeHighlights() {
    modal.querySelectorAll('.mm-node').forEach(c => {
      const id = c.dataset.node;
      c.style.filter = (id === redNode || id === blackNode) ? 'brightness(1.6)' : '';
    });
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } catch (_) {}
  }

  if (devType.timerSec) {
    timerInterval = setInterval(() => {
      timeLeft--;
      const hdrTimer = document.getElementById('mm-hdr-timer');
      const fmt = `${String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}`;
      if (hdrTimer) { hdrTimer.textContent = fmt; if (timeLeft <= 15) hdrTimer.classList.add('mm-timer-crit'); }
      if (timeLeft <= 0) { clearInterval(timerInterval); resolve(false); }
    }, 1000);
  }

  function resolve(success) {
    if (resolved) return;
    resolved = true;
    if (timerInterval) clearInterval(timerInterval);
    setTimeout(() => {
      modal.style.display = 'none';
      modal.innerHTML = '';
      if (success) onSuccess({ hasTimer: !!devType.timerSec, secsLeft: timeLeft });
      else onFail();
    }, success ? 400 : 700);
  }

  render();
}
