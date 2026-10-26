(function () {
'use strict';

/* ── данные ──────────────────────────────────────── */
const TOPICS = window.TOPICS;
const DEF_P = { single: 1, multi: 2, match: 2, order: 2, fill: 1, open: 3 };
const SRC = { leak: 'Слив 2025', teacher: 'Пример преподавателя', mine: 'Новое задание' };
const SRC_LONG = { leak: 'Задание с экзамена 25.10.2025 (фото сливов)', teacher: 'Пример из лекции 16 «Подготовка к экзамену»', mine: 'Составлено по лекциям в формате экзамена' };
const TYPE_NAME = { single: 'Один ответ', multi: 'Несколько ответов', match: 'Соответствие', order: 'Порядок', fill: 'Вставить слово', open: 'Открытый' };
const TYPE_HINT = {
  single: 'Выберите один ответ.', multi: 'Выберите все правильные ответы.', match: 'Подберите пару к каждому пункту. Лишние варианты бывают.',
  order: 'Расставьте пункты по порядку стрелками.', fill: 'Впишите пропущенные слова.', open: 'Ответьте своими словами, как на экзамене.'
};
const ALLQ = [];
TOPICS.forEach(function (t, ti) {
  t.n = ti + 1;
  t.qs.forEach(function (q, i) { q.id = t.id + ':' + i; q.topic = t; q.pts = q.p || DEF_P[q.t]; ALLQ.push(q); });
});
const QBY = {}; ALLQ.forEach(function (q) { QBY[q.id] = q; });
const TBY = {}; TOPICS.forEach(function (t) { TBY[t.id] = t; });

/* ── состояние (localStorage) ────────────────────── */
const KEY = 'orgpov-prep-v1';
function fresh() { return { v: 1, q: {}, box: {}, read: {}, exams: [], cards: {}, plan: {}, log: {}, pos: {}, exam: null, theme: null, sprint: null, short: false }; }
let S = fresh();
let storageOK = true;
try { localStorage.setItem(KEY + ':t', '1'); storageOK = localStorage.getItem(KEY + ':t') === '1'; localStorage.removeItem(KEY + ':t'); } catch (e) { storageOK = false; }
function load() { try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') S = Object.assign(fresh(), o); } } catch (e) {} }
function save() {
  try {
    // Слить с тем, что уже лежит в хранилище: ответы из другой вкладки не пропадут.
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.q) Object.keys(o.q).forEach(function (k) { if (!S.q[k]) S.q[k] = o.q[k]; }); if (o && o.read) Object.keys(o.read).forEach(function (k) { if (!S.read[k] && !wiping) S.read[k] = o.read[k]; }); }
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) { storageOK = false; }
}
let wiping = false;
load();
// Другая вкладка сохранила прогресс — подхватываем его, чтобы эта вкладка не затёрла его старой копией.
window.addEventListener('storage', function (e) { if (e.key === KEY) { const th = S.theme; load(); S.theme = S.theme || th; if (typeof route === 'function' && !(EX && !EX.done)) route(); } });
function applyTheme() { document.documentElement.setAttribute('data-theme', S.theme === 'dark' ? 'dark' : 'light'); }
applyTheme();
function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

function record(q, ok, fromBox) {
  const r = S.q[q.id] || { c: 0, w: 0 };
  if (ok) { r.c++; if (!r.last) S.log[today()] = (S.log[today()] || 0) + 1; } else r.w++;
  r.last = ok ? 1 : 0; S.q[q.id] = r;
  if (!ok) S.box[q.id] = 0;
  else if (S.box[q.id] != null && fromBox) { S.box[q.id]++; if (S.box[q.id] >= 2) delete S.box[q.id]; }
  save();
}
function topicStat(t) { let ok = 0, seen = 0; t.qs.forEach(function (q) { const r = S.q[q.id]; if (r) { seen++; if (r.last) ok++; } }); return { ok: ok, seen: seen, n: t.qs.length }; }
function boxIds() { return Object.keys(S.box).filter(function (id) { return QBY[id]; }); }
function solved(list) { return list.filter(function (q) { const r = S.q[q.id]; return r && r.last; }).length; }
function courseProgress() {
  const read = TOPICS.filter(function (t) { return S.read[t.id]; }).length / TOPICS.length;
  return Math.round((read * 0.4 + solved(ALLQ) / ALLQ.length * 0.6) * 100);
}
function topicDone(t) { const s = topicStat(t); return S.read[t.id] && s.ok >= Math.ceil(s.n * 0.7); }
function nextTopic() { return TOPICS.find(function (t) { return !topicDone(t); }) || TOPICS[0]; }

/* ── утилиты ─────────────────────────────────────── */
const esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[«»"'.,;:!?()\-–—]/g, ' ').replace(/\s+/g, ' ').trim(); }
function fmt(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }
function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b; return c; }
function toast(msg) { const t = document.querySelector('.toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('on'); }, 2200); }
function srcChip(q) { return '<span class="chip ' + q.src + '" title="' + esc(SRC_LONG[q.src]) + '"><span class="dot"></span>' + SRC[q.src] + '</span>'; }
function rightOf(p) { return p[1].trim(); }
function matchOk(p, v) { return v === rightOf(p) || (p[2] || []).indexOf(v) >= 0; }

const ICO = {
  home: '<rect x="3.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2.2"/>',
  leak: '<path d="M7 4.5h6.5L18 9v10a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6a1.5 1.5 0 0 1 1-1.5z"/><path d="M13 4.5V9h5"/><path d="M9.5 14l2 2 3.5-4"/>',
  teacher: '<path d="M3 9l9-4.5L21 9l-9 4.5z"/><path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11"/><path d="M21 9v5"/>',
  spark: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  redo: '<path d="M19.5 11a7.5 7.5 0 0 0-13.4-4.4L4.5 8.5"/><path d="M4.5 4v4.5H9"/><path d="M4.5 13a7.5 7.5 0 0 0 13.4 4.4l1.6-1.9"/><path d="M19.5 20v-4.5H15"/>',
  exam: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5"/><path d="M9.5 2.5h5"/>',
  cards: '<rect x="3.5" y="7" width="13" height="13.5" rx="2.5"/><path d="M8 3.5h10a2.5 2.5 0 0 1 2.5 2.5v11"/>',
  sheet: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6M9 16h3.5"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  sync: '<path d="M4.5 8h14l-3.5-3.5M19.5 16h-14l3.5 3.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
};
function ico(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[k] + '</svg>'; }
function go() { return '<span class="go" aria-hidden="true">' + ico('arrow') + '</span>'; }

/* точечные цифры 5×7 */
const DOT = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '%': ['11000', '11001', '00010', '00100', '01000', '10011', '00011'], '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  ':': ['00000', '00100', '00000', '00000', '00000', '00100', '00000'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};
function dots(str, label, still) {
  let x = 0, out = '', k = 0;
  String(str).split('').forEach(function (ch) {
    const g = DOT[ch] || DOT[' '];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      const on = g[r][c] === '1';
      out += '<circle cx="' + (x + c + .5) + '" cy="' + (r + .5) + '" r=".36" class="' + (on ? 'on' : 'off') + '"' + (on ? (still ? ' style="animation:none"' : ' style="animation-delay:' + (k++ * 9) + 'ms"') : '') + '/>';
    }
    x += 6;
  });
  return '<svg class="dm" viewBox="0 0 ' + (x - 1) + ' 7" role="img" aria-label="' + esc(label || str) + '">' + out + '</svg>';
}

/* ── каркас ──────────────────────────────────────── */
const app = document.getElementById('app');
const NAV = [
  ['home', '#home', 'Пульт'], ['leak', '#bank/leak', 'Сливы'], ['redo', '#mistakes', 'Ошибки'], ['exam', '#exam', 'Пробный экзамен'],
  ['cards', '#cards', 'Карточки'], ['sheet', '#cheat', 'Шпаргалка'], ['book', '#materials', 'Материалы']
];
function shell() {
  app.innerHTML =
    '<div class="frame">' +
      '<aside class="rail" aria-label="Темы курса">' +
        '<a class="logo" href="#home" aria-label="На пульт"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="15" cy="20" r="10" fill="var(--lime)"/><circle cx="25" cy="20" r="10" fill="none" stroke="var(--ink)" stroke-width="2.4"/></svg></a>' +
        '<nav class="rail-topics"></nav>' +
        '<div class="rail-foot"><a class="iconbtn" href="#sync" title="Перенести прогресс" aria-label="Перенести прогресс">' + ico('sync') + '</a><div class="avatar" aria-hidden="true">Е</div></div>' +
      '</aside>' +
      '<div class="screen">' +
        '<header class="top"><nav class="pills" aria-label="Разделы"></nav><button class="iconbtn" id="theme" type="button"></button></header>' +
        (storageOK ? '' : '<div class="storage-warn" role="alert">Этот браузер не даёт сохранять данные (например, приватный режим). Прогресс пропадёт после закрытия вкладки — открой платформу в обычном окне.</div>') +
        '<main id="main" tabindex="-1"></main>' +
      '</div>' +
    '</div><div class="toast" role="status" aria-live="polite"></div>';
  document.getElementById('theme').onclick = function () { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); paintTheme(); };
  paintTheme();
}
function paintTheme() { const b = document.getElementById('theme'); b.innerHTML = ico(S.theme === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', S.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'); }
function paintNav(cur) {
  const nb = boxIds().length;
  document.querySelector('.pills').innerHTML = NAV.map(function (n) {
    return '<a href="' + n[1] + '"' + (cur === n[0] ? ' aria-current="page"' : '') + '>' + ico(n[0]) + n[2] + (n[0] === 'redo' && nb ? '<span class="count">' + nb + '</span>' : '') + (n[0] === 'exam' && S.exam ? '<span class="count">идёт</span>' : '') + '</a>';
  }).join('');
}
function paintRail(cur) {
  document.querySelector('.rail-topics').innerHTML = TOPICS.map(function (t) {
    const s = topicStat(t); const p = Math.round(s.ok / s.n * 100);
    return '<a class="rbtn pr-' + priority(t) + (topicDone(t) ? ' done' : p ? ' prog' : '') + '" style="--p:' + p + '" href="#t/' + t.id + '"' + (cur === t.id ? ' aria-current="page"' : '') + ' title="' + t.n + '. ' + esc(t.title) + ' (' + PRI_NAME[priority(t)] + ') — ' + s.ok + ' из ' + s.n + ' верно" aria-label="Тема ' + t.n + ': ' + esc(t.title) + '">' + t.n + '</a>';
  }).join('');
}

/* ── пульт ───────────────────────────────────────── */
/* Спринт на 6–8 часов: порядок по весу темы на экзамене (сколько вопросов было в сливах). */
const SPRINT = [
  { id: 's1', at: 0, min: 25, title: 'Все сливы 2025 подряд', note: 'Не бойся ошибок: они уйдут в повтор', href: '#bank/leak' },
  { id: 's2', at: 25, min: 45, title: 'Организационная культура', note: '5 вопросов в сливах — самая дорогая тема', href: '#t/culture', topics: ['culture'] },
  { id: 's3', at: 70, min: 40, title: 'Мотивация: понятия и теории', note: '4 вопроса в сливах', href: '#t/motivation', topics: ['motivation'] },
  { id: 's4', at: 110, min: 30, title: 'Власть в организации', note: 'Хиршман и позитивная/негативная власть', href: '#t/power', topics: ['power'] },
  { id: 's5', at: 140, min: 15, title: 'Перерыв и «Ошибки»', note: 'Встать, вода, потом 5 минут на ошибки', href: '#mistakes', brk: true },
  { id: 's6', at: 155, min: 35, title: 'Лидерство', note: 'Херси–Бланшар и трансформационное', href: '#t/leadership', topics: ['leadership'] },
  { id: 's7', at: 190, min: 30, title: 'Изменения', note: 'Коттер по порядку, Грейнер, ADKAR', href: '#t/change', topics: ['change'] },
  { id: 's8', at: 220, min: 40, title: 'Группы и команды', note: 'Плюсы и минусы группы, команда vs группа', href: '#t/groups', topics: ['groups', 'teams'] },
  { id: 's9', at: 260, min: 15, title: 'Перерыв и «Ошибки»', note: 'Еда и короткий повтор', href: '#mistakes', brk: true },
  { id: 's10', at: 275, min: 45, title: 'Поведение, установки, личность', note: 'Темы 2, 3, 4, 5 в режиме «Кратко»', href: '#t/behavior', topics: ['behavior', 'attitudes', 'personality', 'perception'] },
  { id: 's11', at: 320, min: 30, title: 'Организация, введение, поколения', note: 'Темы 1, 7, 12 в режиме «Кратко»', href: '#t/organization', topics: ['organization', 'intro', 'generations'], skip: true },
  { id: 's12', at: 350, min: 50, title: 'Пробный экзамен и разбор', note: 'Цель — от 80%', href: '#exam' },
  { id: 's13', at: 400, min: 30, title: 'Ошибки до нуля и открытые вслух', note: 'Потом карточки «кто автор?»', href: '#mistakes' }
];
const SPRINT_MIN = 430;
/* Приоритет темы = сколько вопросов по ней было в сливах. */
function priority(t) { const n = t.qs.filter(function (q) { return q.src === 'leak'; }).length; return n >= 3 ? 'top' : n >= 2 ? 'mid' : 'low'; }
const PRI_NAME = { top: 'главное', mid: 'важно', low: 'быстро' };
function priChip(t) { const p = priority(t); return '<span class="chip pri-' + p + '">' + PRI_NAME[p] + '</span>'; }
function hm(m) { m = Math.max(0, Math.round(m)); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }
function curStep() { return SPRINT.find(function (s) { return !S.plan[s.id]; }) || null; }
function srcCard(k, cls, icon, name) {
  const list = ALLQ.filter(function (q) { return q.src === k; });
  const ok = solved(list); const wrong = list.filter(function (q) { return S.box[q.id] != null; }).length;
  return '<a class="src paper ' + cls + '" href="#bank/' + k + '">' +
    '<div class="head"><div><span class="ic">' + ico(icon) + '</span><div class="name">' + name + '</div></div>' + go() + '</div>' +
    '<div><div class="lbl muted">Решено верно</div><div class="amt thin">' + ok + '<small> / ' + list.length + '</small></div></div>' +
    '<div class="foot"><span class="dots" aria-hidden="true">' + list.map(function (q) { const r = S.q[q.id]; return '<i class="' + (r && r.last ? 'on' : '') + '"></i>'; }).join('') + '</span><span class="muted">' + (wrong ? 'на повтор ' + wrong : 'ошибок нет') + '</span></div></a>';
}
function barsChart(nt) {
  return '<div class="bars">' + TOPICS.map(function (t) {
    const s = topicStat(t); const p = Math.round(s.ok / s.n * 100); const h = Math.max(6, p);
    return '<a class="b' + (t === nt ? ' hi' : '') + '" href="#t/' + t.id + '" style="--h:' + h + '%" title="' + t.n + '. ' + esc(t.title) + ': ' + p + '%" aria-label="Тема ' + t.n + ', ' + p + '% верно"><span class="v">' + p + '%</span><i style="height:' + h + '%"></i></a>';
  }).join('') + '</div><div class="bars-x">' + TOPICS.map(function (t) { return '<span>' + t.n + '</span>'; }).join('') + '</div>';
}
function lineChart() {
  const ex = S.exams.slice(-8);
  if (!ex.length) return '<p class="muted" style="margin:10px 0 14px">Попыток пока нет. Первая попытка до конца теории — нормально: ошибки покажут, куда смотреть.</p><a class="btn pri" href="#exam">Начать пробный экзамен ' + ico('arrow') + '</a>';
  const W = 320, H = 150, L = 26, R = 14, T = 16, B = 16;
  const x = function (i) { return ex.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (ex.length - 1); };
  const y = function (v) { return T + (100 - v) / 100 * (H - T - B); };
  let s = '<svg class="lc" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Результаты пробных экзаменов">';
  [40, 60, 80].forEach(function (v) { s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ax" x="0" y="' + (y(v) + 3) + '">' + v + '%</text>'; });
  s += '<polyline class="path" points="' + ex.map(function (e, i) { return x(i) + ',' + y(e.pct); }).join(' ') + '"/>';
  ex.forEach(function (e, i) { if (i < ex.length - 1) s += '<circle class="pt" r="3" cx="' + x(i) + '" cy="' + y(e.pct) + '"/>'; });
  const l = ex[ex.length - 1];
  s += '<circle class="last" r="14" cx="' + x(ex.length - 1) + '" cy="' + y(l.pct) + '"/><text class="lastlbl" text-anchor="middle" x="' + x(ex.length - 1) + '" y="' + (y(l.pct) + 3.5) + '">' + l.pct + '</text>';
  return s + '</svg>';
}
function sprintCard(where) {
  const cur = curStep(); const done = SPRINT.filter(function (s) { return S.plan[s.id]; }).length;
  const t0 = S.sprint && S.sprint.t0; const el = t0 ? (Date.now() - t0) / 60000 : 0;
  const planned = cur ? cur.at : SPRINT_MIN; const lag = t0 ? Math.round(el - planned) : 0;
  let status = '';
  if (t0 && cur) status = lag > 20 ? '<span class="chip pri-top">отстаёшь на ' + hm(lag) + '</span>' : lag < -20 ? '<span class="chip lime">опережаешь на ' + hm(-lag) + '</span>' : '<span class="chip lime">идёшь по плану</span>';
  return '<section class="card sprint ' + (where || '') + '" aria-label="Спринт">' +
    '<div class="head"><div class="ttl"><span class="ic">' + ico('cal') + '</span><div><h2>Спринт на 7 часов</h2><div class="faint" style="font-size:12.5px">порядок — по числу вопросов в сливах</div></div></div>' +
    (t0 ? '<button type="button" class="btn ghost sprint-reset">Сбросить таймер</button>' : '<button type="button" class="btn pri sprint-start">Старт ' + ico('arrow') + '</button>') + '</div>' +
    '<div class="sprint-meter"><div class="nums"><span class="thin big">' + (t0 ? hm(el) : '0:00') + '</span><span class="faint">из ~' + hm(SPRINT_MIN) + '</span></div><div class="chips">' + status + '<span class="chip out">шагов ' + done + ' из ' + SPRINT.length + '</span></div></div>' +
    '<div class="bar sbar"><i style="width:' + Math.min(100, Math.round((t0 ? el : 0) / SPRINT_MIN * 100)) + '%"></i><b style="left:' + Math.round(planned / SPRINT_MIN * 100) + '%" title="где ты должна быть по плану"></b></div>' +
    '<ol class="tl">' + SPRINT.map(function (s) {
      const on = !!S.plan[s.id]; const isCur = cur && cur.id === s.id;
      return '<li class="tli' + (on ? ' done' : '') + (isCur ? ' now' : '') + (s.brk ? ' brk' : '') + '"><span class="at num">' + hm(s.at) + '</span><span class="dotline" aria-hidden="true"></span>' +
        '<a class="what" href="' + s.href + '"><b>' + s.title + '</b><span>' + s.note + ' · ' + s.min + ' мин' + (s.skip ? ' · <em>если осталось 6 часов — пропусти</em>' : '') + '</span></a>' +
        '<button type="button" class="chk" data-step="' + s.id + '" aria-pressed="' + on + '" aria-label="Шаг «' + s.title + '» выполнен"></button></li>';
    }).join('') + '</ol></section>';
}
function viewHome() {
  const p = courseProgress(); const nb = boxIds().length; const cur = curStep();
  const read = TOPICS.filter(function (t) { return S.read[t.id]; }).length;
  const td = S.log[today()] || 0;
  const zone = p >= 80 ? 'Уровень «8 и выше»' : p >= 60 ? 'Уровень «6 и выше»' : p >= 40 ? 'Уровень «4 и выше»' : 'Пока ниже порога 40%';
  return '<div class="view dash"><div class="col">' +
    '<div class="greet"><h1>Привет, Екатерина!<span>До экзамена 6–8 часов. Идём по самым дорогим темам</span></h1></div>' +
    (cur ? '<a class="card glow green now-card" href="' + cur.href + '"><div class="head"><span class="chip lime">сейчас · шаг ' + (SPRINT.indexOf(cur) + 1) + ' из ' + SPRINT.length + '</span>' + go() + '</div><div><h2>' + cur.title + '</h2><p class="muted">' + cur.note + '</p></div><div class="row"><span class="thin big">' + cur.min + '<small> мин</small></span><span class="btn pri" aria-hidden="true">Начать ' + ico('arrow') + '</span></div></a>'
      : '<div class="card glow green now-card"><h2>Спринт пройден</h2><p class="muted">Последний круг: <a href="#mistakes">ошибки</a>, <a href="#cheat">шпаргалка</a> и сон.</p></div>') +
    sprintCard('only-narrow') +
    '<section class="score" aria-label="Готовность">' +
      '<span class="label">' + ico('trend') + 'Готовность к экзамену</span>' +
      '<div class="score-row"><div class="score-big thin">' + p + '<small>%</small></div>' +
      '<div class="score-side">' + (td ? '<span class="up">+' + td + '</span> верных сегодня<br>' : '') + '<b>' + zone + '</b><br>прочитано тем ' + read + ' из ' + TOPICS.length + ' · решено ' + solved(ALLQ) + ' из ' + ALLQ.length + '</div></div>' +
      '<div><div class="scale"><div class="seg"></div><div class="seg"></div><div class="seg"></div><div class="seg"></div><span class="marker" style="left:' + p + '%" aria-hidden="true"></span></div>' +
      '<div class="scale-lbl"><span>0 · не сдано</span><span>40 · «4»</span><span>60 · «6»</span><span>80 · «8»</span></div></div>' +
    '</section>' +
    '<section><div class="utabs" aria-hidden="true"><span>Задания по источнику <span class="badge">' + ALLQ.length + '</span></span><span>Типы как на StartExam <span class="badge">6</span></span></div>' +
      '<div class="srcs">' + srcCard('leak', 'olive', 'leak', 'Сливы экзамена 2025') + srcCard('teacher', 'rose', 'teacher', 'Примеры преподавателя') + srcCard('mine', 'amber', 'spark', 'Новые задания') + '</div></section>' +
    '<section class="card listcard"><div class="head"><h2>Темы курса</h2><span class="faint" style="font-size:12.5px">«главное» — 3+ вопроса в сливах</span></div>' +
      TOPICS.map(function (t) {
        const s = topicStat(t); const nl = t.qs.filter(function (q) { return q.src === 'leak'; }).length;
        return '<a class="lrow' + (topicDone(t) ? ' done' : '') + '" href="#t/' + t.id + '"><span class="n">' + t.n + '</span><span><div class="t">' + esc(t.title) + ' ' + priChip(t) + '</div><div class="m">' + t.lectures + ' · кратко ~' + Math.round(t.min / 2) + ' мин' + (nl ? ' · ' + nl + ' из сливов' : '') + (S.read[t.id] ? ' · прочитано' : '') + '</div></span><span class="r">' + s.ok + '/' + s.n + '<small>верно</small></span></a>';
      }).join('') +
    '</section></div>' +
    '<div class="col">' +
      sprintCard('only-wide') +
      '<div class="tiles">' +
        '<a class="tile" href="#mistakes"><div class="head"><span class="ic">' + ico('redo') + (nb ? '<span class="alert"></span>' : '') + '</span>' + go() + '</div><h3>Ошибки на повтор</h3><div class="row"><div class="big thin">' + nb + '</div>' + dots(String(nb), nb + ' на повтор') + '</div></a>' +
        '<a class="tile" href="#exam"><div class="head"><span class="ic">' + ico('exam') + '</span>' + go() + '</div><h3>Лучший пробный</h3><div class="row"><div class="big thin">' + (S.exams.length ? Math.max.apply(null, S.exams.map(function (e) { return e.pct; })) + '<small>%</small>' : '—') + '</div>' + (S.exams.length ? dots(String(Math.max.apply(null, S.exams.map(function (e) { return e.pct; }))), 'лучший результат') : '') + '</div></a>' +
      '</div>' +
      '<section class="card chartcard"><div class="head"><div class="ttl"><span class="ic">' + ico('chart') + '</span><h2>Верно по темам</h2></div><span class="chip out">% решённых</span></div>' + barsChart(TBY[(cur && cur.topics) ? cur.topics[0] : nextTopic().id] || nextTopic()) + '</section>' +
      '<section class="card chartcard line"><div class="head"><div class="ttl"><span class="ic">' + ico('exam') + '</span><h2>Пробные экзамены</h2></div>' + (S.exams.length ? '<a class="btn ghost" href="#exam">Ещё попытка</a>' : '') + '</div>' + lineChart() + '</section>' +
      '<section class="card glow green"><h2>Как устроен экзамен</h2><div class="mini-tbl"><span>30 вопросов на StartExam, 6 блоков</span><span>45% оценки</span><span>Один ответ</span><span>1 балл</span><span>Несколько ответов, соответствие</span><span>2 балла</span><span>Открытый вопрос</span><span>3–4 балла</span><span>Пороги «4», «6», «8»</span><span>40 · 60 · 80%</span></div>' +
        '<p class="muted" style="font-size:13px;margin:12px 0 0">Экзамен блокирующий. Открытые вопросы дают до 4 баллов — их выгоднее всего учить по образцовым ответам. Ключи к фото сливов восстановлены по слайдам 2026 года и разбору преподавателя.</p></section>' +
    '</div></div>';
}
let sprintTick;
function bindHome() {
  document.querySelectorAll('[data-step]').forEach(function (b) {
    b.onclick = function () { const k = b.dataset.step; const on = !S.plan[k]; if (on) S.plan[k] = 1; else delete S.plan[k]; if (on && !(S.sprint && S.sprint.t0)) S.sprint = { t0: Date.now() }; save(); route(); };
  });
  document.querySelectorAll('.sprint-start').forEach(function (b) { b.onclick = function () { S.sprint = { t0: Date.now() }; save(); route(); }; });
  document.querySelectorAll('.sprint-reset').forEach(function (b) { b.onclick = function () { S.sprint = null; save(); route(); }; });
  clearInterval(sprintTick);
  if (S.sprint && S.sprint.t0) sprintTick = setInterval(function () { if (location.hash.slice(1) !== 'home' && location.hash) return clearInterval(sprintTick); document.querySelectorAll('.sprint-meter .big').forEach(function (n) { n.textContent = hm((Date.now() - S.sprint.t0) / 60000); }); }, 30000);
}
function viewTopicsList() {
  return '<div class="view"><div class="card listcard"><div class="head"><h2>Темы курса</h2></div>' + TOPICS.map(function (t) { const s = topicStat(t); return '<a class="lrow' + (topicDone(t) ? ' done' : '') + '" href="#t/' + t.id + '"><span class="n">' + t.n + '</span><span><div class="t">' + esc(t.title) + '</div><div class="m">' + t.lectures + '</div></span><span class="r">' + s.ok + '/' + s.n + '</span></a>'; }).join('') + '</div></div>';
}

/* ── тема ───────────────────────────────────────── */
const GLOWS = ['green', 'orange', 'pink', 'violet'];
function topicHead(t, tab) {
  const s = topicStat(t); const nl = t.qs.filter(function (q) { return q.src === 'leak'; }).length;
  return '<header class="card glow ' + GLOWS[(t.n - 1) % 4] + ' thero"><div><h1>' + esc(t.title) + '</h1><p class="lead">' + esc(t.lead) + '</p>' +
    '<div class="chips">' + priChip(t) + '<span class="chip out">' + t.lectures + '</span><span class="chip out">кратко ~' + Math.round(t.min / 2) + ' мин · полностью ~' + t.min + '</span><span class="chip out">' + t.qs.length + ' ' + plural(t.qs.length, 'задание', 'задания', 'заданий') + '</span>' + (nl ? '<span class="chip leak"><span class="dot"></span>' + nl + ' из сливов</span>' : '') + '<span class="chip lime num">' + s.ok + ' из ' + s.n + ' верно</span>' + (S.read[t.id] ? '<span class="chip mine">теория прочитана</span>' : '') + '</div></div>' +
    '<div class="no thin" aria-hidden="true">' + String(t.n).padStart(2, '0') + '</div></header>' +
    '<div class="tabbar"><nav class="tabs" aria-label="Режим"><a href="#t/' + t.id + '"' + (tab === 'th' ? ' aria-current="page"' : '') + '>Теория</a><a href="#t/' + t.id + '/q"' + (tab === 'q' ? ' aria-current="page"' : '') + '>Задания <span class="count">' + t.qs.length + '</span></a></nav>' +
    (tab === 'th' ? '<div class="seg2" role="group" aria-label="Объём теории"><button type="button" data-brief="1" aria-pressed="' + (S.short === true) + '">Кратко</button><button type="button" data-brief="0" aria-pressed="' + (S.short !== true) + '">Полностью</button></div>' : '') + '</div>';
}
function viewTheory(t) {
  const nx = TOPICS[TOPICS.indexOf(t) + 1]; const brief = S.short === true;
  return '<div class="view">' + topicHead(t, 'th') + '<div class="theory' + (brief ? ' brief' : '') + '">' +
    (brief ? '<p class="faint" style="margin:0 4px;font-size:13.5px">Режим «Кратко»: суть и схемы каждого раздела, ловушки и запоминалка. Определения и таблицы — по кнопке «Подробнее».</p>' : '') +
    t.sections.map(function (s) {
      return '<section class="card tsec"><h2>' + esc(s.h) + '</h2><div class="simple"><b>Проще</b><span>' + esc(s.simple) + '</span></div>' + (s.fig ? '<div class="figs">' + [].concat(s.fig).join('') + '</div>' : '') +
        (brief ? '<details class="more"><summary>Подробнее для экзамена</summary><div class="body">' + s.body + '</div></details>' : '<div class="body">' + s.body + '</div>') + '</section>';
    }).join('') +
    '<div class="traps"><div class="card"><h2>Ловушки</h2><ul>' + t.traps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
    '<div class="card paper olive"><h2>Запоминалка</h2><p class="mnemo">' + esc(t.mnemonic) + '</p></div></div>' +
    '<div class="card endbar"><div><h3>' + (S.read[t.id] ? 'Тема прочитана' : 'Дочитала до конца?') + '</h3><p class="muted" style="margin:4px 0 0;font-size:14px">Сразу проверь себя: вспоминание закрепляет лучше перечитывания.</p></div>' +
      '<div class="btns"><a class="btn pri" href="#t/' + t.id + '/q" data-read="' + t.id + '">Отметить и перейти к заданиям ' + ico('arrow') + '</a>' + (nx ? '<a class="btn ghost" href="#t/' + nx.id + '">Следующая тема</a>' : '') + '</div></div>' +
  '</div></div>';
}

/* ── виджет вопроса ──────────────────────────────── */
function renderQ(host, q, opts) {
  opts = opts || {};
  const exam = !!opts.exam;
  const prev = S.q[q.id];
  const card = el('<article class="card qcard"><div class="qmeta">' + srcChip(q) + '<span class="chip">' + TYPE_NAME[q.t] + '</span><span class="chip out num">' + q.pts + ' ' + plural(q.pts, 'балл', 'балла', 'баллов') + '</span>' +
    (!exam && prev ? '<span class="chip ' + (prev.last ? 'lime' : '') + '">' + (prev.last ? 'раньше: верно' : 'раньше: ошибка') + '</span>' : '') + (exam ? '' : '<span class="ref">' + esc(q.ref) + '</span>') + '</div>' +
    '<p class="qtext"></p><div class="qhint">' + TYPE_HINT[q.t] + '</div><div class="body"></div><div class="fbh" aria-live="polite"></div><div class="qfoot"><div class="btns l"></div><div class="btns r"></div></div></article>');
  card.querySelector('.qtext').textContent = q.q;
  if (q.t === 'fill') card.querySelector('.qtext').style.display = 'none';
  host.innerHTML = ''; host.appendChild(card);
  const body = card.querySelector('.body'), fbh = card.querySelector('.fbh'), L = card.querySelector('.l'), R = card.querySelector('.r');
  let checked = false, getRes, reveal, ready;
  const prior = opts.prior;

  if (q.t === 'single' || q.t === 'multi') {
    const multi = q.t === 'multi'; const ans = multi ? q.a : [q.a];
    const order = prior && prior.order ? prior.order : shuffle(q.o.map(function (_, i) { return i; }));
    const sel = new Set(prior && prior.sel ? prior.sel : []);
    const wrap = el('<div class="opts" role="' + (multi ? 'group' : 'radiogroup') + '"></div>'); body.appendChild(wrap);
    const btns = order.map(function (oi, k) {
      const b = el('<button type="button" class="opt' + (multi ? '' : ' radio') + '" role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="false"><span class="mk">' + String.fromCharCode(65 + k) + '</span><span></span></button>');
      b.lastChild.textContent = q.o[oi];
      b.onclick = function () { if (checked) return; if (multi) { sel.has(oi) ? sel.delete(oi) : sel.add(oi); } else { sel.clear(); sel.add(oi); } paint(); upd(); };
      wrap.appendChild(b); return b;
    });
    function paint() { btns.forEach(function (x, k) { const on = sel.has(order[k]); x.classList.toggle('sel', on); x.setAttribute('aria-checked', on); }); }
    paint();
    ready = function () { return sel.size > 0; };
    getRes = function () { const ok = sel.size === ans.length && ans.every(function (a) { return sel.has(a); }); return { ok: ok, score: ok ? q.pts : 0, state: { order: order, sel: Array.from(sel) } }; };
    reveal = function () {
      btns.forEach(function (x, k) {
        const oi = order[k]; const isA = ans.indexOf(oi) >= 0;
        x.disabled = true; x.classList.remove('sel');
        if (isA) { x.classList.add('right'); if (!sel.has(oi)) x.classList.add('missed'); }
        else if (sel.has(oi)) x.classList.add('wrong');
      });
    };
  } else if (q.t === 'match') {
    const rights = []; q.pairs.forEach(function (p) { if (rights.indexOf(rightOf(p)) < 0) rights.push(rightOf(p)); }); (q.extra || []).forEach(function (e) { if (rights.indexOf(e) < 0) rights.push(e); });
    const ropts = prior && prior.ropts ? prior.ropts : shuffle(rights);
    const vals = prior && prior.vals ? prior.vals.slice() : q.pairs.map(function () { return ''; });
    let pick = null;
    const hint = el('<p class="faint" style="font-size:13px;margin:0">Нажми вариант ответа, затем ячейку. Нажатие на заполненную ячейку очищает её.</p>');
    body.appendChild(hint);
    const rows = q.pairs.map(function (p, i) {
      const r = el('<div class="mrow"><div class="l"></div><button type="button" class="slot"></button></div>');
      r.querySelector('.l').textContent = p[0];
      r.querySelector('.slot').onclick = function () { if (checked) return; if (pick != null) { vals[i] = pick; pick = null; } else vals[i] = ''; paintM(); upd(); };
      body.appendChild(r); return r;
    });
    const pool = el('<div class="pool" role="group" aria-label="Варианты ответов"></div>'); body.appendChild(pool);
    const chips = ropts.map(function (o) {
      const c = el('<button type="button" class="mchip" aria-pressed="false"></button>'); c.textContent = o;
      c.onclick = function () { if (checked) return; pick = pick === o ? null : o; paintM(); };
      pool.appendChild(c); return c;
    });
    function paintM() {
      rows.forEach(function (r, i) { const b = r.querySelector('.slot'); b.textContent = vals[i] || (pick != null ? 'Поставить сюда' : '— пусто —'); b.classList.toggle('filled', !!vals[i]); b.classList.toggle('target', pick != null); });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', pick === c.textContent); c.classList.toggle('used', vals.indexOf(c.textContent) >= 0); });
    }
    paintM();
    ready = function () { return vals.every(Boolean); };
    getRes = function () {
      const hits = vals.filter(function (v, i) { return matchOk(q.pairs[i], v); }).length; const ok = hits === q.pairs.length;
      return { ok: ok, score: ok ? q.pts : 0, part: hits + ' из ' + q.pairs.length + ' пар', state: { ropts: ropts, vals: vals.slice() } };
    };
    reveal = function () {
      hint.remove(); pool.remove();
      rows.forEach(function (r, i) { const b = r.querySelector('.slot'); b.disabled = true; b.textContent = vals[i] || '— без ответа —'; const good = matchOk(q.pairs[i], vals[i]); r.classList.add(good ? 'right' : 'wrong'); if (!good) { const f = el('<div class="fix"></div>'); f.textContent = 'Верно: ' + rightOf(q.pairs[i]) + (q.pairs[i][2] ? ' (или ' + q.pairs[i][2].join(', ') + ')' : ''); r.appendChild(f); } });
    };
  } else if (q.t === 'order') {
    const cur = prior && prior.cur ? prior.cur.slice() : (function () { let s; do { s = shuffle(q.order.map(function (_, i) { return i; })); } while (q.order.length > 1 && s.every(function (v, i) { return v === i; })); return s; })();
    const list = el('<div class="olist"></div>'); body.appendChild(list);
    function draw(focusIdx, dir) {
      list.innerHTML = '';
      cur.forEach(function (oi, k) {
        const it = el('<div class="oitem"><span class="pos num">' + (k + 1) + '</span><span></span><span class="mv"><button type="button" aria-label="Выше">' + ico('up') + '</button><button type="button" aria-label="Ниже">' + ico('down') + '</button></span></div>');
        it.children[1].textContent = q.order[oi];
        const bu = it.querySelectorAll('button');
        bu[0].disabled = checked || k === 0; bu[1].disabled = checked || k === cur.length - 1;
        bu[0].onclick = function () { const x = cur[k - 1]; cur[k - 1] = cur[k]; cur[k] = x; draw(k - 1, 0); upd(); };
        bu[1].onclick = function () { const x = cur[k + 1]; cur[k + 1] = cur[k]; cur[k] = x; draw(k + 1, 1); upd(); };
        if (checked) it.classList.add(oi === k ? 'right' : 'wrong');
        list.appendChild(it);
        if (focusIdx === k) { const b = bu[dir]; (b.disabled ? bu[1 - dir] : b).focus(); }
      });
    }
    draw();
    ready = function () { return true; };
    getRes = function () { const hits = cur.filter(function (v, i) { return v === i; }).length; const ok = hits === cur.length; return { ok: ok, score: ok ? q.pts : 0, part: hits + ' из ' + cur.length + ' на своём месте', state: { cur: cur.slice() } }; };
    reveal = function () { draw(); };
  } else if (q.t === 'fill') {
    const wrap = el('<p class="fill-text"></p>'); body.appendChild(wrap);
    const inputs = [];
    q.q.split(/(\{\d\})/).forEach(function (p) {
      const m = p.match(/^\{(\d)\}$/);
      if (m) { const i = el('<input type="text" autocomplete="off" spellcheck="false" aria-label="Пропуск ' + m[1] + '">'); i.dataset.k = m[1] - 1; if (prior && prior.vals) i.value = prior.vals[inputs.length] || ''; i.oninput = upd; i.onkeydown = function (e) { if (e.key === 'Enter') checkBtn.click(); }; inputs.push(i); wrap.appendChild(i); }
      else wrap.appendChild(document.createTextNode(p));
    });
    const good = function (i) { return q.fill[+i.dataset.k].some(function (a) { return norm(a) === norm(i.value); }); };
    ready = function () { return inputs.every(function (i) { return i.value.trim(); }); };
    getRes = function () { const ok = inputs.every(good); return { ok: ok, score: ok ? q.pts : 0, state: { vals: inputs.map(function (i) { return i.value; }) } }; };
    reveal = function () { inputs.forEach(function (i) { i.disabled = true; i.classList.add(good(i) ? 'right' : 'wrong'); }); };
  } else if (q.t === 'open') {
    const ta = el('<textarea placeholder="Ответ своими словами. Не уверена — всё равно попробуй: попытка вспомнить укрепляет память." aria-label="Ваш ответ"></textarea>');
    if (prior && prior.text) ta.value = prior.text; ta.oninput = upd; body.appendChild(ta);
    const keys = q.keys.map(function (k) { const p = k.split('|'); return { t: p[0], st: p[1].split(',').map(norm).filter(Boolean) }; });
    ready = function () { return ta.value.trim().length > 0; };
    getRes = function () {
      const v = norm(ta.value); const hits = keys.map(function (k) { return k.st.some(function (s) { return v.indexOf(s) >= 0; }); });
      const n = hits.filter(Boolean).length; const need = Math.max(1, Math.ceil(keys.length * 0.8));
      const sc = Math.round(q.pts * Math.min(1, n / need) * 2) / 2;
      return { ok: sc >= q.pts, score: sc, part: n + ' из ' + keys.length + ' ключевых мыслей', hits: hits, state: { text: ta.value } };
    };
    reveal = function () { ta.disabled = true; };
    card._keysHtml = function (h) { return '<ul class="keys">' + keys.map(function (k, i) { return '<li class="' + (h && h[i] ? 'hit' : '') + '">' + esc(k.t) + '</li>'; }).join('') + '</ul>'; };
  }

  const checkBtn = el('<button type="button" class="btn pri">' + (exam ? 'Ответить' : 'Проверить') + '</button>');
  const skipBtn = el('<button type="button" class="btn ghost">' + (exam ? 'Пропустить' : 'Не знаю, покажи ответ') + '</button>');
  function upd() { checkBtn.disabled = !ready(); if (exam && opts.onDraft) opts.onDraft(getRes().state); }
  R.appendChild(checkBtn); L.appendChild(skipBtn);
  if (opts.prev) { const pb = el('<button type="button" class="btn ghost">' + ico('back') + 'Назад</button>'); pb.onclick = opts.prev; L.insertBefore(pb, skipBtn); }
  checkBtn.disabled = !ready();

  function feedback(res, skipped) {
    const cls = skipped ? 'info' : res.ok ? 'ok' : (res.score > 0 ? 'part' : 'bad');
    const st = skipped ? 'Правильный ответ' : res.ok ? 'Верно' : (res.score > 0 ? 'Частично' : 'Неверно');
    let h = '<div class="fb ' + cls + '"><div class="st">' + st + (res.part && !skipped ? ' · ' + res.part : '') + (q.t === 'open' && !skipped ? ' · ' + fmt(res.score) + ' из ' + q.pts : '') + '</div>';
    if (q.t === 'open') {
      h += '<div>Ключевые мысли, которые ждёт проверяющий:</div>' + card._keysHtml(skipped ? null : res.hits) + '<div class="model"><b>Образцовый ответ.</b> ' + esc(q.model) + '</div>';
      if (!skipped) h += '<div class="selfgrade"><span class="faint" style="font-size:13px">Проверка ищет ключевые слова. Оцени себя честно:</span><button type="button" class="btn" data-g="1">Полностью</button><button type="button" class="btn" data-g="0.5">Наполовину</button><button type="button" class="btn" data-g="0">Ноль</button></div>';
    } else if (q.t === 'fill') {
      h += '<div>Верно: <b>' + q.fill.map(function (f) { return esc(f[0]); }).join(' · ') + '</b></div>';
    } else if (q.t === 'order') {
      h += '<ol style="margin:0;padding-left:20px">' + q.order.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ol>';
    } else if (q.t === 'match' && skipped) {
      h += '<ul style="margin:0;padding-left:20px">' + q.pairs.map(function (p) { return '<li>' + esc(p[0]) + ' → <b>' + esc(rightOf(p)) + '</b></li>'; }).join('') + '</ul>';
    }
    if (q.x) h += '<div>' + esc(q.x) + '</div>';
    if (!exam) h += '<div class="faint" style="font-size:12.5px">' + esc(q.ref) + '</div>';
    fbh.innerHTML = h + '</div>';
    fbh.querySelectorAll('[data-g]').forEach(function (b) {
      b.onclick = function () {
        const g = +b.dataset.g; res.score = q.pts * g; res.ok = g === 1; res.self = true;
        fbh.querySelectorAll('[data-g]').forEach(function (x) { x.classList.toggle('pri', x === b); });
        if (opts.onRegrade) opts.onRegrade(res);
      };
    });
  }
  function nextBtn() { if (opts.next) { const nb = el('<button type="button" class="btn pri">' + opts.nextLabel + ' ' + ico('arrow') + '</button>'); nb.onclick = opts.next; R.appendChild(nb); } }
  checkBtn.onclick = function () {
    if (checked || !ready()) return;
    const res = getRes();
    if (exam) { opts.onAnswer && opts.onAnswer(res); return; }
    checked = true; reveal(); feedback(res, false); L.innerHTML = ''; checkBtn.remove();
    opts.onAnswer && opts.onAnswer(res); nextBtn();
  };
  skipBtn.onclick = function () {
    if (exam) { opts.onSkip && opts.onSkip(); return; }
    if (checked) return; checked = true;
    const res = { ok: false, score: 0 };
    reveal(); feedback(res, true); L.innerHTML = ''; checkBtn.remove();
    opts.onAnswer && opts.onAnswer(res, true); nextBtn();
  };
  return { reveal: function (res) { checked = true; reveal(); feedback(res, false); L.innerHTML = ''; R.innerHTML = ''; } };
}

/* ── прогон заданий (позиция и отметки сохраняются) ── */
function runner(host, list, o) {
  o = o || {};
  const key = o.key;
  function status(q) { const r = S.q[q.id]; return r ? (r.last ? 'ok' : 'bad') : ''; }
  let i = key && S.pos[key] != null && S.pos[key] < list.length ? S.pos[key] : list.findIndex(function (q) { return status(q) !== 'ok'; });
  if (i < 0) i = 0;
  function dotsHtml() {
    return '<div class="progress-dots" aria-label="Задания">' + list.map(function (q, k) {
      return '<button type="button" data-k="' + k + '" class="' + status(q) + (k === i ? ' cur' : '') + '" aria-label="Задание ' + (k + 1) + '">' + (k + 1) + '</button>';
    }).join('') + '</div>';
  }
  function show() {
    if (i >= list.length) return finish();
    if (key) { S.pos[key] = i; save(); }
    const q = list[i];
    host.innerHTML = '<div class="runner"><div class="rhead"><span class="faint num">Задание ' + (i + 1) + ' из ' + list.length + (o.topicLabel ? ' · ' + esc(q.topic.short) : '') + '</span><span class="faint num" id="rcount">верно ' + solved(list) + ' из ' + list.length + '</span></div>' + dotsHtml() + '<div class="qhost"></div></div>';
    host.querySelectorAll('.progress-dots button').forEach(function (b) { b.onclick = function () { i = +b.dataset.k; show(); }; });
    renderQ(host.querySelector('.qhost'), q, {
      onAnswer: function (res) {
        record(q, res.ok, o.box); paintNav(curNav); paintRail(curSide);
        const d = host.querySelector('.progress-dots button[data-k="' + i + '"]'); if (d) d.className = (res.ok ? 'ok' : 'bad') + ' cur';
        const c = host.querySelector('#rcount'); if (c) c.textContent = 'верно ' + solved(list) + ' из ' + list.length;
        if (key) { S.pos[key] = i + 1; save(); }
      },
      onRegrade: function (res) { const r = S.q[q.id]; if (r) { r.last = res.ok ? 1 : 0; if (res.ok) delete S.box[q.id]; else S.box[q.id] = 0; save(); paintNav(curNav); paintRail(curSide); } },
      next: function () { i++; show(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, nextLabel: i + 1 < list.length ? 'Дальше' : 'Итог'
    });
  }
  function finish() {
    if (key) { S.pos[key] = 0; save(); }
    const ok = solved(list);
    host.innerHTML = '<div class="runner"><div class="card glow green empty"><div class="big">' + dots(ok + '/' + list.length, ok + ' из ' + list.length) + '</div><h2>' + (ok === list.length ? 'Всё верно' : 'Круг пройден') + '</h2><p class="muted">Верно ' + ok + ' из ' + list.length + '. Ошибки уже в разделе «Ошибки».</p><div class="btns" style="justify-content:center"><button type="button" class="btn pri" id="again">Пройти ещё раз</button>' + (o.after || '') + '</div></div></div>';
    host.querySelector('#again').onclick = function () { i = 0; if (o.reshuffle) list = o.reshuffle(); show(); };
  }
  show();
}
function viewQuiz(t) { return '<div class="view">' + topicHead(t, 'q') + '<div id="qroot"></div></div>'; }
function bindQuiz(t) {
  const nx = TOPICS[TOPICS.indexOf(t) + 1]; const order = { leak: 0, teacher: 1, mine: 2 };
  const list = t.qs.slice().sort(function (a, b) { return order[a.src] - order[b.src]; });
  runner(document.getElementById('qroot'), list, { key: 't:' + t.id, after: nx ? '<a class="btn" href="#t/' + nx.id + '">Следующая тема</a>' : '<a class="btn" href="#exam">К пробному экзамену</a>' });
}

/* ── банк заданий ────────────────────────────────── */
function parseBank(r) { const p = r.split('/'); return { src: p[1] || 'all', type: p[2] || 'all' }; }
function pool(f) { return ALLQ.filter(function (q) { return (f.src === 'all' || q.src === f.src) && (f.type === 'all' || q.t === f.type); }); }
function viewBank(r) {
  const f = parseBank(r); const list = pool(f);
  const cnt = function (s, ty) { return pool({ src: s, type: ty }).length; };
  const title = f.src === 'leak' ? 'Сливы экзамена 2025' : f.src === 'teacher' ? 'Примеры преподавателя' : f.src === 'mine' ? 'Новые задания' : 'Все задания';
  const lead = f.src === 'leak' ? 'Задания, сфотографированные на экзамене 25.10.2025. Ответов на фото нет — ключи восстановлены по слайдам, в пояснениях сказано откуда.' : 'Фильтруй по источнику и типу вопроса. Порядок — по темам курса.';
  return '<div class="view"><header class="card glow ' + (f.src === 'leak' ? 'orange' : f.src === 'teacher' ? 'violet' : 'green') + ' thero"><div><h1>' + title + '</h1><p class="lead">' + lead + '</p>' +
    '<div class="filters" role="group" aria-label="Источник" style="margin-bottom:8px">' + [['all', 'Все'], ['leak', SRC.leak], ['teacher', SRC.teacher], ['mine', SRC.mine]].map(function (s) { return '<a class="fchip" href="#bank/' + s[0] + '/' + f.type + '" aria-pressed="' + (f.src === s[0]) + '">' + s[1] + '<span class="c">' + cnt(s[0], f.type) + '</span></a>'; }).join('') + '</div>' +
    '<div class="filters" role="group" aria-label="Тип">' + [['all', 'Любой тип']].concat(Object.keys(TYPE_NAME).map(function (k) { return [k, TYPE_NAME[k]]; })).map(function (s) { return '<a class="fchip" href="#bank/' + f.src + '/' + s[0] + '" aria-pressed="' + (f.type === s[0]) + '">' + s[1] + '<span class="c">' + cnt(f.src, s[0]) + '</span></a>'; }).join('') + '</div></div>' +
    '<div class="no thin" aria-hidden="true">' + solved(list) + '/' + list.length + '</div></header><div id="qroot">' + (list.length ? '' : '<div class="card empty"><h2>Таких заданий нет</h2><p class="muted">Смени фильтр.</p></div>') + '</div></div>';
}
function bindBank(r) { const f = parseBank(r); const list = pool(f); if (list.length) runner(document.getElementById('qroot'), list, { topicLabel: true, key: 'b:' + f.src + ':' + f.type }); }

/* ── ошибки ──────────────────────────────────────── */
function viewMistakes() {
  const ids = boxIds();
  const head = '<header class="card glow pink thero"><div><h1>Ошибки</h1><p class="lead">Сюда попадает каждый неверный ответ. Вопрос уходит, когда ответишь на него верно два раза подряд.</p></div><div class="no thin" aria-hidden="true">' + ids.length + '</div></header>';
  if (!ids.length) return '<div class="view">' + head + '<div class="card empty"><h2>Повторять нечего</h2><p class="muted">Реши задания по темам или пробный экзамен — ошибки появятся здесь.</p><div class="btns" style="justify-content:center"><a class="btn pri" href="#t/' + nextTopic().id + '">К следующей теме</a></div></div></div>';
  return '<div class="view">' + head + '<div id="qroot"></div></div>';
}
function bindMistakes() {
  const ids = boxIds(); if (!ids.length) return;
  runner(document.getElementById('qroot'), shuffle(ids.map(function (id) { return QBY[id]; })), { box: true, topicLabel: true, reshuffle: function () { return shuffle(boxIds().map(function (id) { return QBY[id]; })); }, after: '<a class="btn" href="#home">На пульт</a>' });
}

/* ── пробный экзамен (сохраняется в S.exam) ───────── */
const EXAM_MIX = { open: 5, match: 6, order: 2, multi: 8, single: 7, fill: 2 };
function buildExam() {
  const picked = []; const used = {};
  Object.keys(EXAM_MIX).forEach(function (ty) {
    const pl = shuffle(ALLQ.filter(function (q) { return q.t === ty; }));
    pl.sort(function (a, b) { return (b.src === 'leak') - (a.src === 'leak') + (Math.random() - .5) * 1.4; });
    let need = EXAM_MIX[ty];
    for (let k = 0; k < pl.length && need > 0; k++) if (!used[pl[k].id]) { used[pl[k].id] = 1; picked.push(pl[k]); need--; }
  });
  while (picked.length < 30) { const q = ALLQ[Math.floor(Math.random() * ALLQ.length)]; if (!used[q.id]) { used[q.id] = 1; picked.push(q); } }
  return shuffle(picked);
}
function gradeOf(pct) {
  if (pct >= 80) return { g: '8–10', t: 'выше порога «8 и выше»' };
  if (pct >= 60) return { g: '6–7', t: 'выше порога «6 и выше»' };
  if (pct >= 40) return { g: '4–5', t: 'выше порога «4 и выше»' };
  return { g: 'ниже 4', t: 'ниже порога сдачи (40%)' };
}
let EX = null;
function restoreExam() {
  if (EX || !S.exam) return;
  const qs = S.exam.ids.map(function (id) { return QBY[id]; });
  if (qs.some(function (q) { return !q; })) { S.exam = null; save(); return; }
  EX = { qs: qs, ans: S.exam.ans || {}, draft: S.exam.draft || {}, i: S.exam.i || 0, t0: S.exam.t0, done: false };
}
function persistExam() { if (!EX || EX.done) return; S.exam = { ids: EX.qs.map(function (q) { return q.id; }), ans: EX.ans, draft: EX.draft, i: EX.i, t0: EX.t0 }; save(); }
function viewExam() {
  restoreExam();
  if (EX && !EX.done) return '<div class="view" id="examroot"></div>';
  const last = S.exams.slice(-5).reverse();
  return '<div class="view"><div class="grid2"><div class="card glow green bigcard"><div><h1>Пробный экзамен</h1><p class="muted" style="margin-top:12px;max-width:46ch">30 вопросов вперемешку, как на StartExam: 1 балл за один ответ, 2 — за множественный выбор, соответствие и порядок, 3–4 — за открытый. Сливы попадают чаще. Ответы — в конце.</p></div>' +
    '<ul class="muted" style="padding-left:18px;margin:0;font-size:14px"><li>Таймер 60 минут — ориентир.</li><li>Можно пропускать и возвращаться по номерам.</li><li>Если закроешь вкладку, попытка продолжится с того же места.</li><li>Ошибки попадут в «Ошибки».</li></ul>' +
    '<div><button type="button" class="btn pri" id="start">Начать экзамен ' + ico('arrow') + '</button></div></div>' +
    '<div class="card chartcard line"><div class="head"><div class="ttl"><span class="ic">' + ico('trend') + '</span><h2>Прошлые попытки</h2></div></div>' + (last.length ? lineChart() + '<div class="tbl-wrap"><table class="tbl"><tr><th>Когда</th><th>Баллы</th><th>%</th><th>Оценка</th></tr>' + last.map(function (e) { return '<tr><td>' + esc(e.date) + '</td><td class="num">' + fmt(e.score) + ' / ' + e.max + '</td><td class="num">' + e.pct + '%</td><td>' + gradeOf(e.pct).g + '</td></tr>'; }).join('') + '</table></div>' : '<p class="muted" style="margin-top:10px">Попыток пока нет. Первая попытка до конца теории — нормально: ошибки покажут, куда смотреть.</p>') + '</div></div></div>';
}
function bindExam() {
  const st = document.getElementById('start');
  if (st) st.onclick = function () { EX = { qs: buildExam(), ans: {}, draft: {}, i: 0, t0: Date.now(), done: false }; persistExam(); route(); };
  if (EX && !EX.done) examStep();
}
function examStep() {
  const root = document.getElementById('examroot'); if (!root) return;
  persistExam(); paintNav('exam');
  const q = EX.qs[EX.i]; const answered = Object.keys(EX.ans).length;
  root.innerHTML = '<div class="exam-grid"><div class="qhost"></div><aside class="exam-panel"><div class="card glow orange"><div class="faint" style="font-size:13px">Осталось</div><div class="timer" id="timer"></div><div class="bar" style="margin-top:14px"><i style="width:' + Math.round(answered / 30 * 100) + '%"></i></div><div class="faint num" style="font-size:13px;margin-top:6px">Отвечено ' + answered + ' из 30</div></div>' +
    '<div class="card"><div class="progress-dots">' + EX.qs.map(function (x, k) { return '<button type="button" data-k="' + k + '" class="' + (EX.ans[x.id] ? 'ans' : '') + (k === EX.i ? ' cur' : '') + '" aria-label="Вопрос ' + (k + 1) + '">' + (k + 1) + '</button>'; }).join('') + '</div><button type="button" class="btn pri" id="finish" style="width:100%;margin-top:14px">Завершить</button></div></aside></div>';
  root.querySelectorAll('.progress-dots button').forEach(function (b) { b.onclick = function () { EX.i = +b.dataset.k; examStep(); }; });
  root.querySelector('#finish').onclick = function () {
    const left = 30 - Object.keys(EX.ans).length;
    if (!left) return finishExam();
    const box = el('<div class="confirm" role="alert"><p>Без ответа ' + left + ' ' + plural(left, 'вопрос', 'вопроса', 'вопросов') + '. Они будут засчитаны как ноль.</p><div class="btns"><button type="button" class="btn pri">Завершить</button><button type="button" class="btn ghost">Вернуться</button></div></div>');
    this.replaceWith(box);
    const b = box.querySelectorAll('button'); b[0].onclick = finishExam; b[1].onclick = examStep; b[1].focus();
  };
  const pr = EX.ans[q.id] ? EX.ans[q.id].state : EX.draft[q.id];
  renderQ(root.querySelector('.qhost'), q, {
    exam: true, prior: pr || null,
    onDraft: function (s) { EX.draft[q.id] = s; persistExam(); },
    onAnswer: function (res) { EX.ans[q.id] = res; EX.i = nextOpen(EX.i); examStep(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    onSkip: function () { EX.i = (EX.i + 1) % 30; examStep(); },
    prev: EX.i > 0 ? function () { EX.i--; examStep(); } : null
  });
  tick();
}
function nextOpen(i) { for (let k = 1; k <= 30; k++) { const j = (i + k) % 30; if (!EX.ans[EX.qs[j].id]) return j; } return Math.min(i + 1, 29); }
let tickH;
function tick() {
  clearInterval(tickH);
  const paint = function () { const t = document.getElementById('timer'); if (!t || !EX || EX.done) { clearInterval(tickH); return; } const left = Math.max(0, 3600 - Math.floor((Date.now() - EX.t0) / 1000)); const m = Math.floor(left / 60), s = left % 60; t.innerHTML = dots(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'), m + ' минут ' + s + ' секунд', true); };
  paint(); tickH = setInterval(paint, 1000);
}
function finishExam() {
  EX.done = true; clearInterval(tickH);
  let score = 0, max = 0;
  EX.qs.forEach(function (q) { max += q.pts; const r = EX.ans[q.id]; if (r) score += r.score; record(q, !!(r && r.ok)); });
  const pct = Math.round(score / max * 100);
  S.exams.push({ date: new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), score: score, max: max, pct: pct });
  S.exam = null;
  EX.result = { score: score, max: max, pct: pct, rec: S.exams.length - 1 };
  save(); paintNav('exam'); paintRail(null); showResult();
}
function showResult() {
  const main = document.getElementById('main'); const R = EX.result; const g = gradeOf(R.pct);
  const byT = {}; EX.qs.forEach(function (q) { const k = q.topic.id; byT[k] = byT[k] || { s: 0, m: 0 }; byT[k].m += q.pts; const r = EX.ans[q.id]; if (r) byT[k].s += r.score; });
  const weak = Object.keys(byT).filter(function (k) { return byT[k].s / byT[k].m < .6; });
  main.innerHTML = '<div class="view"><section class="result-hero"><div class="card glow ' + (R.pct >= 80 ? 'green' : R.pct >= 60 ? 'orange' : 'pink') + ' bigcard"><h1>Результат</h1><div class="big thin" id="pctbig">' + R.pct + '%</div><p id="pctline" style="margin:0;font-size:16px"><b class="num">' + fmt(R.score) + ' из ' + R.max + '</b> баллов · оценка <b>' + g.g + '</b>, ' + g.t + '</p></div>' +
    '<div class="card"><h2>Что подтянуть</h2>' + (weak.length ? '<p class="muted" style="margin-top:8px">Темы, где меньше 60% баллов:</p><div class="btns" style="margin-top:10px">' + weak.map(function (k) { return '<a class="btn" href="#t/' + k + '">' + esc(TBY[k].short) + '</a>'; }).join('') + '</div>' : '<p class="muted" style="margin-top:8px">Слабых тем нет.</p>') + '<div class="btns" style="margin-top:18px"><button type="button" class="btn pri" id="again">Новая попытка</button><a class="btn ghost" href="#mistakes">Разобрать ошибки</a></div></div></section>' +
    '<section class="sec"><div class="head"><h2>Разбор</h2><span class="faint">открытые ответы можно переоценить</span></div><div class="review">' +
    EX.qs.map(function (q, k) { const r = EX.ans[q.id]; const cls = !r ? 'bad' : r.ok ? 'ok' : r.score > 0 ? 'part' : 'bad'; return '<div class="ritem ' + cls + '" data-k="' + k + '"><span class="n">' + (k + 1) + '</span><div><div style="font-size:14.5px">' + esc(q.t === 'fill' ? q.q.replace(/\{\d\}/g, '____') : q.q) + '</div><div class="chips" style="margin-top:6px">' + srcChip(q) + '<span class="chip">' + esc(q.topic.short) + '</span></div><details><summary>' + (r ? 'Мой ответ и правильный' : 'Без ответа — показать правильный') + '</summary><div class="rq"></div></details></div><span class="sc">' + fmt(r ? r.score : 0) + ' / ' + q.pts + '</span></div>'; }).join('') +
    '</div></section></div>';
  main.querySelector('#again').onclick = function () { EX = null; route(); };
  main.querySelectorAll('.ritem details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open || d._done) return; d._done = true;
      const k = +d.closest('.ritem').dataset.k; const q = EX.qs[k]; const r = EX.ans[q.id];
      renderQ(d.querySelector('.rq'), q, { prior: r ? r.state : null, onRegrade: function (nr) { EX.ans[q.id] = nr; regrade(); } }).reveal(r || { ok: false, score: 0 });
    });
  });
  function regrade() {
    let score = 0; EX.qs.forEach(function (q) { const r = EX.ans[q.id]; if (r) score += r.score; });
    const pct = Math.round(score / R.max * 100); R.score = score; R.pct = pct; S.exams[R.rec].score = score; S.exams[R.rec].pct = pct; save();
    EX.qs.forEach(function (q, k) { const r = EX.ans[q.id]; main.querySelector('.ritem[data-k="' + k + '"] .sc').textContent = fmt(r ? r.score : 0) + ' / ' + q.pts; });
    main.querySelector('#pctbig').textContent = pct + '%';
    const g2 = gradeOf(pct); main.querySelector('#pctline').innerHTML = '<b class="num">' + fmt(score) + ' из ' + R.max + '</b> баллов · оценка <b>' + g2.g + '</b>, ' + g2.t;
  }
}

/* ── карточки ────────────────────────────────────── */
function viewCards() {
  return '<div class="view"><header class="card glow orange thero"><div><h1>Кто автор?</h1><p class="lead">Экзамен любит «установите соответствие между автором и теорией». Нажми на карточку, чтобы перевернуть.</p>' +
    '<div class="filters"><button type="button" class="fchip" id="dir" aria-pressed="false">Сначала идея, потом автор</button><button type="button" class="fchip" id="onlyNew" aria-pressed="false">Только невыученные</button></div></div></header><div id="croot"></div></div>';
}
function bindCards() {
  const root = document.getElementById('croot'); let rev = false, onlyNew = false, i = 0, deck;
  function make() { deck = shuffle(window.CARDS.filter(function (c) { return !onlyNew || !S.cards[c[0]]; })); i = 0; }
  make();
  document.getElementById('dir').onclick = function () { rev = !rev; this.setAttribute('aria-pressed', rev); draw(); };
  document.getElementById('onlyNew').onclick = function () { onlyNew = !onlyNew; this.setAttribute('aria-pressed', onlyNew); make(); draw(); };
  function draw() {
    const known = window.CARDS.filter(function (c) { return S.cards[c[0]]; }).length;
    if (!deck.length || i >= deck.length) { root.innerHTML = '<div class="card empty"><div class="big">' + dots(known + '/' + window.CARDS.length, 'Выучено ' + known) + '</div><h2>Колода пройдена</h2><div class="btns" style="justify-content:center"><button type="button" class="btn pri" id="re">Перемешать заново</button></div></div>'; root.querySelector('#re').onclick = function () { make(); draw(); }; return; }
    const c = deck[i]; const front = rev ? c[1] : c[0], back = rev ? c[0] : c[1];
    root.innerHTML = '<div class="flash" tabindex="0" role="button" aria-label="Перевернуть карточку"><div class="inner"><div class="face front paper amber"><span class="muted num">' + (i + 1) + ' / ' + deck.length + '</span><div class="q"></div><span class="muted">нажми, чтобы увидеть ответ</span></div><div class="face back paper olive"><span class="muted">' + (rev ? 'автор' : 'чем известен') + '</span><div class="q"></div><span class="muted num">выучено ' + known + ' из ' + window.CARDS.length + '</span></div></div></div>' +
      '<div class="btns" style="margin-top:16px;max-width:640px"><button type="button" class="btn" id="again">Ещё повторю</button><button type="button" class="btn pri" id="know">Знаю ' + ico('arrow') + '</button></div>';
    root.querySelector('.front .q').textContent = front; root.querySelector('.back .q').textContent = back;
    const f = root.querySelector('.flash'); f.onclick = function () { f.classList.toggle('flipped'); };
    f.onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); f.click(); } };
    root.querySelector('#know').onclick = function () { S.cards[c[0]] = 1; save(); i++; draw(); };
    root.querySelector('#again').onclick = function () { delete S.cards[c[0]]; save(); deck.push(c); i++; draw(); };
  }
  draw();
}

/* ── шпаргалка и материалы ───────────────────────── */
function viewCheat() {
  return '<div class="view"><header class="card glow violet thero"><div><h1>Шпаргалка</h1><p class="lead">Ловушки и запоминалки всех тем на одной странице. Читай вслух утром перед экзаменом.</p></div></header>' +
    '<div class="cheat">' + TOPICS.map(function (t) { return '<div class="card"><h3><span class="faint num">' + t.n + '.</span> ' + esc(t.title) + '</h3><div class="simple" style="grid-template-columns:1fr;margin:8px 0">' + esc(t.mnemonic) + '</div><ul>' + t.traps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; }).join('') + '</div>' +
    '<section class="sec card"><h2 style="margin-bottom:12px">Авторы и их идеи</h2><div class="authors">' + window.CARDS.map(function (c) { return '<div><b>' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></div>'; }).join('') + '</div></section></div>';
}
function viewMaterials() {
  return '<div class="view"><header class="card glow green thero"><div><h1>Материалы</h1><p class="lead">Обязательные книги, фильмы и статьи из лекции 1 — о чём они и к каким темам относятся, чтобы сослаться на них в открытом ответе.</p></div></header><div class="grid2">' +
    window.MATERIALS.map(function (m) {
      return '<article class="card mat"><div class="chips"><span class="chip ' + (m.kind === 'Книга' ? 'teacher' : m.kind === 'Фильм' ? 'leak' : 'mine') + '"><span class="dot"></span>' + m.kind + '</span><span class="chip out">' + (m.must ? 'обязательно' : 'к семинару 1') + '</span></div><h3>' + esc(m.title) + '</h3><p class="muted" style="margin:0">' + esc(m.about) + '</p><div class="chips">' + m.link.map(function (l) { return '<span class="chip">' + esc(l) + '</span>'; }).join('') + '</div>' + (m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener" style="font-size:14px">Открыть статью</a>' : '') + '</article>';
    }).join('') + '</div></div>';
}

/* ── перенос прогресса ───────────────────────────── */
function b64(u) { let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
async function enc(o) {
  const u = new TextEncoder().encode(JSON.stringify(o));
  try { if (window.CompressionStream) { const z = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); return 'z' + b64(z); } } catch (e) {}
  return 'p' + b64(u);
}
async function dec(s) {
  let u = unb64(s.slice(1));
  if (s[0] === 'z') u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  return JSON.parse(new TextDecoder().decode(u));
}
function packState() { return { v: 1, q: S.q, box: S.box, read: S.read, exams: S.exams, cards: S.cards, plan: S.plan, log: S.log }; }
function merge(o) {
  Object.keys(o.q || {}).forEach(function (k) { const a = S.q[k], b = o.q[k]; S.q[k] = !a ? b : { c: Math.max(a.c, b.c), w: Math.max(a.w, b.w), last: a.last || b.last }; });
  Object.keys(o.box || {}).forEach(function (k) { if (!(S.q[k] && S.q[k].last && S.box[k] == null)) S.box[k] = Math.min(S.box[k] == null ? 9 : S.box[k], o.box[k]); });
  ['read', 'cards', 'plan'].forEach(function (f) { Object.assign(S[f], o[f] || {}); });
  Object.keys(o.log || {}).forEach(function (d) { S.log[d] = Math.max(S.log[d] || 0, o.log[d]); });
  const seen = {}; S.exams = S.exams.concat(o.exams || []).filter(function (e) { const k = e.date + e.score; if (seen[k]) return false; seen[k] = 1; return true; });
  save();
}
function viewSync() {
  return '<div class="view"><header class="card glow violet thero"><div><h1>Перенести прогресс</h1><p class="lead">Прогресс хранится в этом браузере и не сбрасывается при перезагрузке. Чтобы продолжить на другом устройстве, скопируй код и вставь его там — прогресс сложится.</p></div></header>' +
    '<div class="grid2"><div class="card"><h2>Отсюда</h2><p class="muted" style="margin-top:8px">Отправь код себе в «Избранное».</p><textarea id="code" readonly style="min-height:120px;font-size:13px"></textarea><div class="btns" style="margin-top:10px"><button type="button" class="btn pri" id="copy">Скопировать код</button></div></div>' +
    '<div class="card"><h2>Сюда</h2><p class="muted" style="margin-top:8px">Вставь код с другого устройства.</p><textarea id="incode" style="min-height:120px;font-size:13px" placeholder="Вставь код сюда"></textarea><div class="btns" style="margin-top:10px"><button type="button" class="btn pri" id="imp">Добавить прогресс</button></div></div></div>' +
    '<div class="card" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><span class="muted">Начать подготовку с нуля на этом устройстве</span><a class="btn ghost" href="#reset">Стереть прогресс</a></div></div>';
}
function bindSync() {
  enc(packState()).then(function (c) { const t = document.getElementById('code'); if (t) t.value = c; });
  document.getElementById('copy').onclick = function () {
    const v = document.getElementById('code').value;
    const fallback = function () { const t = document.getElementById('code'); t.focus(); t.select(); toast('Код выделен — скопируй его'); };
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { toast('Скопировано'); }, fallback); else fallback();
  };
  document.getElementById('imp').onclick = function () { importCode(document.getElementById('incode').value.trim()); };
}
function importCode(c) {
  if (!c) return toast('Код пустой');
  dec(c).then(function (o) { merge(o); toast('Прогресс добавлен'); location.hash = '#home'; }, function () { toast('Не получилось прочитать код. Скопируй его целиком.'); });
}

/* ── роутер ──────────────────────────────────────── */
let curNav = 'home', curSide = null;
function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || 'home';
  if (h.indexOf('sync=') === 0) { importCode(h.slice(5)); return; }
  const main = document.getElementById('main');
  let html = '', bind = null, nav = '', side = null;
  if (h === 'home') { html = viewHome(); bind = bindHome; nav = 'home'; }
  else if (h === 'topics') { html = viewTopicsList(); }
  else if (h.indexOf('t/') === 0) {
    const p = h.split('/'); const t = TBY[p[1]];
    if (!t) { location.hash = '#home'; return; }
    side = t.id;
    if (p[2] === 'q') { html = viewQuiz(t); bind = function () { bindQuiz(t); }; }
    else { html = viewTheory(t); bind = function () { const b = main.querySelector('[data-read]'); if (b) b.onclick = function () { S.read[t.id] = 1; save(); }; main.querySelectorAll('[data-brief]').forEach(function (x) { x.onclick = function () { S.short = x.dataset.brief === '1'; save(); route(); }; }); }; }
  }
  else if (h.indexOf('bank') === 0) { html = viewBank(h); bind = function () { bindBank(h); }; nav = parseBank(h).src === 'leak' ? 'leak' : ''; }
  else if (h === 'mistakes') { html = viewMistakes(); bind = bindMistakes; nav = 'redo'; }
  else if (h === 'exam') { if (EX && EX.done) EX = null; html = viewExam(); bind = bindExam; nav = 'exam'; }
  else if (h === 'cards') { html = viewCards(); bind = bindCards; nav = 'cards'; }
  else if (h === 'cheat') { html = viewCheat(); nav = 'sheet'; }
  else if (h === 'materials') { html = viewMaterials(); nav = 'book'; }
  else if (h === 'sync') { html = viewSync(); bind = bindSync; }
  else if (h === 'reset') {
    html = '<div class="view"><div class="card empty"><h2>Стереть прогресс?</h2><p class="muted">Удалятся ответы, ошибки, прочитанные темы, попытки экзамена и отметки плана на этом устройстве. Отменить это нельзя. Сначала можно <a href="#sync">сохранить код прогресса</a>.</p><div class="btns" style="justify-content:center"><button type="button" class="btn pri" id="wipe">Стереть всё</button><a class="btn ghost" href="#home">Оставить</a></div></div></div>';
    bind = function () { document.getElementById('wipe').onclick = function () { const th = S.theme; S = fresh(); S.theme = th; EX = null; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} toast('Прогресс стёрт'); location.hash = '#home'; }; };
  }
  else { location.hash = '#home'; return; }
  curNav = nav; curSide = side; paintNav(nav); paintRail(side);
  main.innerHTML = html; if (bind) bind();
  window.scrollTo(0, 0);
  const t = side ? TBY[side] : null;
  document.title = (t ? t.short + ' · ' : '') + 'Экзамен по оргповедению';
}
shell();
window.addEventListener('hashchange', route);
route();
})();
