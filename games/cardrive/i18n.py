"""
Tiny localisation layer (English / Ukrainian).

Usage:
    from i18n import t, toggle_lang, get_lang
    label = t("home.start")
    label = t("hud.speed", v="3.4")     # strings may contain {placeholders}

Language is a module-level setting toggled by the flag widget.
"""

_LANG = {"cur": "en"}


def get_lang() -> str:
    return _LANG["cur"]


def set_lang(lang: str):
    if lang in ("en", "uk"):
        _LANG["cur"] = lang


def toggle_lang():
    _LANG["cur"] = "uk" if _LANG["cur"] == "en" else "en"


def t(key: str, **kw) -> str:
    entry = _STRINGS.get(key)
    if entry is None:
        return key
    s = entry.get(_LANG["cur"]) or entry.get("en") or key
    return s.format(**kw) if kw else s


def narrative(title: str) -> str | None:
    """Localised dispatcher line for a level (keyed by its English title)."""
    entry = _NARRATIVE.get(title)
    if entry is None:
        return None
    return entry.get(_LANG["cur"]) or entry.get("en")


# ---------------------------------------------------------------------------
# UI strings
# ---------------------------------------------------------------------------

_STRINGS = {
    # ---- Home screen ----
    "home.subtitle":      {"en": "a top-down driving challenge",
                           "uk": "аркадний драйв із висоти пташиного польоту"},
    "home.howto":         {"en": "HOW TO PLAY", "uk": "ЯК ГРАТИ"},
    "home.modes":         {"en": "MODES & HAZARDS", "uk": "РЕЖИМИ ТА НЕБЕЗПЕКИ"},
    "home.k.arrows":      {"en": "Arrows",   "uk": "Стрілки"},
    "home.v.arrows":      {"en": "drive (Up gas, Down brake)",
                           "uk": "кермуй (вгору газ, вниз гальмо)"},
    "home.k.lr":          {"en": "L / R",    "uk": "Л / П"},
    "home.v.lr":          {"en": "steer when moving", "uk": "кермо лише в русі"},
    "home.k.honk":        {"en": "H",        "uk": "H"},
    "home.v.honk":        {"en": "honk, make others go away",
                           "uk": "сигналь, щоб роз'їхались"},
    "home.k.goal":        {"en": "Goal",     "uk": "Ціль"},
    "home.v.goal":        {"en": "reach the gold B marker",
                           "uk": "дістатись золотої позначки B"},
    "home.k.red":         {"en": "Red light", "uk": "Червоне"},
    "home.v.red":         {"en": "stop — running it costs points",
                           "uk": "стій — проїзд коштує балів"},
    "home.k.people":      {"en": "People",   "uk": "Люди"},
    "home.v.people":      {"en": "never hit them — game over",
                           "uk": "не збивай — це кінець гри"},
    "home.k.restart":     {"en": "R / ESC",  "uk": "R / ESC"},
    "home.v.restart":     {"en": "restart  /  menu", "uk": "рестарт  /  меню"},
    "home.m.taxi":        {"en": "Taxi",  "uk": "Таксі"},
    "home.mv.taxi":       {"en": "carry a fare from P to B",
                           "uk": "вези пасажира з P до B"},
    "home.m.fuel":        {"en": "Fuel",  "uk": "Пальне"},
    "home.mv.fuel":       {"en": "refuel at FUEL stations",
                           "uk": "заправляйся на FUEL"},
    "home.m.night":       {"en": "Night", "uk": "Ніч"},
    "home.mv.night":      {"en": "headlights only", "uk": "лише фари"},
    "home.m.rain":        {"en": "Rain",  "uk": "Дощ"},
    "home.mv.rain":       {"en": "less grip, longer slides",
                           "uk": "менше зчеплення, заноси"},
    "home.start":         {"en": "Press  ENTER  to start",
                           "uk": "Натисни  ENTER  щоб почати"},
    "home.code_prompt":   {"en": "Have a level code?  Type it:",
                           "uk": "Маєш код рівня?  Введи:"},
    "home.code_bad":      {"en": '"{code}" is not a valid code',
                           "uk": '"{code}" — невірний код'},

    # ---- Garage ----
    "garage.title":       {"en": "CHOOSE YOUR CAR", "uk": "ОБЕРИ АВТО"},
    "garage.spd":         {"en": "SPD", "uk": "ШВД"},
    "garage.acc":         {"en": "ACC", "uk": "ПРС"},
    "garage.hnd":         {"en": "HND", "uk": "КЕР"},
    "garage.hint":        {"en": "LEFT / RIGHT: choose       ENTER: drive",
                           "uk": "ЛІВО / ПРАВО: вибір       ENTER: поїхали"},
    "garage.fwd":         {"en": "front-wheel drive", "uk": "передній привід"},
    "garage.rwd":         {"en": "rear-wheel drive",  "uk": "задній привід"},

    # ---- Intro screen ----
    "intro.level":        {"en": "LEVEL {n}", "uk": "РІВЕНЬ {n}"},
    "intro.goal.taxi":    {"en": "Pick up your passenger at P, then deliver to B.",
                           "uk": "Забери пасажира на P і довези до B."},
    "intro.goal.chase":   {"en": "Reach B before the police catch you.",
                           "uk": "Дістанься B, поки поліція не спіймала."},
    "intro.goal.race":    {"en": "Drive from A to the gold B marker as fast as you can.",
                           "uk": "Мчи від A до золотої B якомога швидше."},
    "intro.tip1":         {"en": "When the rear slides:  steer INTO the slide.",
                           "uk": "Коли зад заносить — кермуй У БІК заносу."},
    "intro.tip2":         {"en": "FWD car: press GAS to recover.   RWD car: LIFT OFF gas.",
                           "uk": "Передній привід: ДОДАЙ ГАЗ.   Задній: ВІДПУСТИ газ."},
    "intro.code":         {"en": "Level code:  {code}   (note it to resume here later)",
                           "uk": "Код рівня:  {code}   (запиши, щоб продовжити пізніше)"},
    "intro.begin":        {"en": "Press  SPACE  to begin",
                           "uk": "Натисни  SPACE  щоб почати"},
    # chips
    "chip.map":           {"en": "Map", "uk": "Мапа"},
    "chip.streets":       {"en": "Streets", "uk": "Вулиці"},
    "chip.traffic":       {"en": "Traffic", "uk": "Трафік"},
    "chip.time":          {"en": "Time", "uk": "Час"},
    "chip.hazards":       {"en": "Hazards", "uk": "Небезпеки"},
    "chip.rooms":         {"en": "{w}x{h} rooms", "uk": "{w}x{h} кімнат"},
    "street.very_narrow": {"en": "very narrow", "uk": "дуже вузькі"},
    "street.narrow":      {"en": "narrow", "uk": "вузькі"},
    "street.wide":        {"en": "wide", "uk": "широкі"},
    "traffic.light":      {"en": "light", "uk": "слабкий"},
    "traffic.moderate":   {"en": "moderate", "uk": "середній"},
    "traffic.heavy":      {"en": "heavy", "uk": "щільний"},
    "traffic.cars":       {"en": "{lvl} ({n} cars)", "uk": "{lvl} ({n} авто)"},
    "time.nolimit":       {"en": "no limit", "uk": "без ліміту"},
    "time.secs":          {"en": "{n}s", "uk": "{n}с"},
    "hazard.night":       {"en": "night", "uk": "ніч"},
    "hazard.rain":        {"en": "rain", "uk": "дощ"},
    "hazard.winter":      {"en": "ice + snow", "uk": "лід і сніг"},
    "hazard.fuel":        {"en": "fuel limit", "uk": "ліміт пального"},

    # ---- HUD ----
    "hud.speed":          {"en": "Speed: {v}", "uk": "Швидкість: {v}"},
    "hud.fuel":           {"en": "Fuel {p}%", "uk": "Пальне {p}%"},
    "hud.level":          {"en": "Level {n}", "uk": "Рівень {n}"},
    "hud.level_title":    {"en": "Level {n}: {title}", "uk": "Рівень {n}: {title}"},
    "hud.score":          {"en": "Score: {s}", "uk": "Бали: {s}"},
    "hud.violations":     {"en": "Violations: {v}", "uk": "Порушення: {v}"},
    "hud.press_up":       {"en": "Press UP to start", "uk": "Натисни ВГОРУ"},
    "hud.best":           {"en": "Best: {t}", "uk": "Рекорд: {t}"},
    "hud.iq":             {"en": "Traffic IQ {iq}   jams solved {r}",
                           "uk": "IQ трафіку {iq}   заторів вирішено {r}"},
    "hud.damage":         {"en": "Damage {d}%", "uk": "Пошкодження {d}%"},
    "hud.controls":       {"en": "Arrows: drive   H: honk   P: pause   R: restart   ESC: menu",
                           "uk": "Стрілки: їзда   H: сигнал   P: пауза   R: рестарт   ESC: меню"},
    "hud.crashed":        {"en": "CRASHED!  Press R to respawn",
                           "uk": "АВАРІЯ!  Натисни R щоб відродитись"},
    "hud.level_done":     {"en": "LEVEL COMPLETE!  {t}", "uk": "РІВЕНЬ ПРОЙДЕНО!  {t}"},
    "hud.next_hint":      {"en": "SPACE: next level     R: replay     H: home",
                           "uk": "SPACE: далі     R: повтор     H: меню"},
    "hud.gameover":       {"en": "GAME OVER", "uk": "КІНЕЦЬ ГРИ"},
    "hud.gameover_hint":  {"en": "Press R or H for the menu  (resume with a level code)",
                           "uk": "R або H — меню  (продовжити за кодом рівня)"},
    "hud.start_race":     {"en": "Drive from  A  to  B  as fast as possible!",
                           "uk": "Мчи від  A  до  B  якнайшвидше!"},
    "hud.start_taxi":     {"en": "Pick up the passenger at  P,  then deliver to  B !",
                           "uk": "Забери пасажира на  P  і довези до  B !"},
    "hud.banner_aboard":  {"en": "Passenger aboard → deliver to  B",
                           "uk": "Пасажир у авто → вези до  B"},
    "hud.banner_topickup":{"en": "Head to  P  to pick up your passenger",
                           "uk": "Прямуй до  P  за пасажиром"},

    # ---- Victory ----
    "win.title":          {"en": "CONGRATULATIONS!", "uk": "ВІТАЄМО!"},
    "win.body":           {"en": "You completed all {n} levels of CarDrive!",
                           "uk": "Ти пройшов усі {n} рівнів CarDrive!"},
    "win.score":          {"en": "Final score:  {s}", "uk": "Підсумок:  {s}"},
    "win.menu":           {"en": "Press SPACE for the menu", "uk": "SPACE — меню"},

    # ---- Pause ----
    "pause.title":        {"en": "PAUSED", "uk": "ПАУЗА"},
    "pause.hint":         {"en": "P: resume      ESC: menu",
                           "uk": "P: продовжити      ESC: меню"},

    # ---- Notifications / reasons ----
    "note.redlight":      {"en": "RED LIGHT  -{n} pts", "uk": "ЧЕРВОНЕ  -{n} балів"},
    "note.clean":         {"en": "Clean run!  +{n} pts", "uk": "Чистий заїзд!  +{n}"},
    "note.smooth":        {"en": "Smooth ride!  +{n} pts", "uk": "Плавна їзда!  +{n}"},
    "note.boarding":      {"en": "Passenger boarding…", "uk": "Пасажир сідає…"},
    "note.aboard":        {"en": "Passenger aboard — go!", "uk": "Пасажир у авто — поїхали!"},
    "note.gameover":      {"en": "GAME OVER – {reason}", "uk": "КІНЕЦЬ – {reason}"},
    "note.camera":        {"en": "SPEED CAMERA  -{n} pts", "uk": "КАМЕРА  -{n} балів"},
    "note.beep":          {"en": "BEEP!", "uk": "БІП!"},
    "note.god_on":        {"en": "GOD MODE  ON", "uk": "БОГ-РЕЖИМ УВІМК"},
    "note.god_off":       {"en": "God mode OFF", "uk": "Бог-режим вимк"},
    "reason.pedestrian":  {"en": "Pedestrian hit!", "uk": "Збито пішохода!"},
    "reason.time":        {"en": "Time's up!", "uk": "Час вийшов!"},
    "reason.fuel":        {"en": "Out of fuel!", "uk": "Скінчилось пальне!"},
    "reason.police":      {"en": "Caught by police!", "uk": "Спіймала поліція!"},
    "reason.totalled":    {"en": "Car totalled!", "uk": "Авто розбито!"},
}


# ---------------------------------------------------------------------------
# Per-level narrative lines (keyed by English level title)
# ---------------------------------------------------------------------------

_NARRATIVE = {
    "First Drive": {
        "uk": "Перший день за кермом. Не поспішай — спершу відчуй машину.",
        "en": "First day behind the wheel. Take it slow — get a feel for the car."},
    "Rush": {
        "uk": "Година пік. Усі кудись запізнюються — крім тебе. (тобі теж пора.)",
        "en": "Rush hour. Everyone's late — except you. (you're late too.)"},
    "Be carefull": {
        "uk": "На кожному кроці камери!",
        "en": "Speed cameras at every corner!"},
    "Out of time": {
        "uk": "Диспетчер дзвонить уже втретє. Поспішай — але дивись на камери.",
        "en": "Dispatch is calling for the third time. Hurry — but mind the cameras."},
    "Downtown": {
        "uk": "Старе місто. Тут диспетчер не любить, коли затримуються.",
        "en": "Old town. The dispatcher hates it when you're late here."},
    "Night Shift": {
        "uk": "Вулиці тихі. Фари у фари — і нічого більше.",
        "en": "Quiet streets. Headlights to headlights — nothing more."},
    "Storm": {
        "uk": "Гроза прийшла з заходу. Не геройствуй — поверни додому.",
        "en": "A storm rolled in from the west. Don't play hero — just get home."},
    "First Snow": {
        "uk": "Перший сніжок. Гальмуй заздалегідь — кермом виправляй заноси.",
        "en": "First snow. Brake early — catch the slides with the wheel."},
    "Frosty Fare": {
        "uk": "Сніг ліпиться до лобового. Пасажир хоче додому без сюрпризів.",
        "en": "Snow on the windshield. Your fare just wants a calm ride home."},
    "Blizzard Night": {
        "uk": "Завірюха. Бачиш — фари, чуєш — серце. Решта — занос.",
        "en": "A blizzard. You see headlights, you hear your heartbeat. The rest is drift."},
    "Cop Chase": {
        "uk": "Сирени за спиною. Без причини — але це не врятує.",
        "en": "Sirens behind you. No reason given — but that won't help."},
    "The Gauntlet": {
        "uk": "Остання зміна. Дощ, ніч, бак напівпорожній. Усе як завжди.",
        "en": "Last shift. Rain, night, half a tank. Same as always."},
}
