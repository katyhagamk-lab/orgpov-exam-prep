/* Набор схем в стиле слайдов: матрицы 2×2, пирамиды, цепочки, лестницы, циклы, кривые, айсберг, луковица.
   Каждая функция возвращает HTML-строку. Цвета — классы c-* (см. styles.css). */
window.D = (function () {
  const e = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  const C = ['lime', 'violet', 'rose', 'amber', 'sky', 'olive', 'sand', 'mint'];
  const col = function (it, i) { return 'c-' + (it.c || C[i % C.length]); };
  const tx = function (it) { return typeof it === 'string' ? { t: it } : it; };
  const box = function (it, i, extra) { it = tx(it); return '<div class="dx ' + col(it, i) + (extra ? ' ' + extra : '') + '">' + (it.k ? '<span class="dk">' + e(it.k) + '</span>' : '') + '<b>' + e(it.t) + '</b>' + (it.d ? '<span>' + e(it.d) + '</span>' : '') + '</div>'; };

  function fig(title, inner, cap) {
    return '<figure class="fig">' + (title ? '<figcaption>' + e(title) + '</figcaption>' : '') + inner + (cap ? '<p class="cap">' + e(cap) + '</p>' : '') + '</figure>';
  }
  /* матрица 2×2: cells = [левый-верх, правый-верх, левый-низ, правый-низ] */
  function matrix(o) {
    return '<div class="mx">' +
      '<div class="mx-y"><span>' + e(o.y) + '</span></div>' +
      '<div class="mx-yl"><span>' + e((o.yl || ['', ''])[1]) + '</span><span>' + e((o.yl || ['', ''])[0]) + '</span></div>' +
      '<div class="mx-g">' + o.cells.map(function (c, i) { return box(c, i, o.hi === i ? 'hi' : ''); }).join('') + '</div>' +
      '<div class="mx-xl"><span>' + e((o.xl || ['', ''])[0]) + '</span><span>' + e((o.xl || ['', ''])[1]) + '</span></div>' +
      '<div class="mx-x">' + e(o.x) + ' →</div></div>';
  }
  /* пирамида: уровни сверху вниз */
  function pyramid(levels, o) {
    o = o || {}; const n = levels.length;
    return '<div class="pyr' + (o.side ? ' side' : '') + '">' + levels.map(function (l, i) {
      l = tx(l); const w = o.inverse ? 100 - i * (55 / Math.max(1, n - 1)) : 45 + i * (55 / Math.max(1, n - 1));
      return '<div class="pyr-r"><div class="pyr-b ' + col(l, i) + '" style="width:' + w.toFixed(1) + '%">' + (l.k ? '<span class="dk">' + e(l.k) + '</span>' : '') + '<b>' + e(l.t) + '</b></div>' + (l.d ? '<div class="pyr-d">' + e(l.d) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  /* цепочка со стрелками или знаками */
  function chain(items, o) {
    o = o || {};
    return '<div class="chain' + (o.vertical ? ' v' : '') + '">' + items.map(function (it, i) { return (i ? '<span class="op">' + (o.ops ? e(o.ops[i - 1]) : (o.op || '→')) + '</span>' : '') + box(it, i); }).join('') + '</div>';
  }
  /* лестница вверх */
  function steps(items, o) {
    o = o || {}; const n = items.length;
    return '<div class="stairs" style="--n:' + n + '">' + items.map(function (it, i) {
      it = tx(it); return '<div class="st ' + col(it, i) + '" style="--h:' + (o.flat ? 100 : Math.round(30 + 70 * i / Math.max(1, n - 1))) + '%"><span class="sn">' + (o.noNum ? '' : (i + 1)) + '</span><b>' + e(it.t) + '</b>' + (it.d ? '<span>' + e(it.d) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  /* цикл */
  function cycle(items, center) {
    const n = items.length;
    return '<div class="cyc" style="--n:' + n + '"><svg class="cyc-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="36"/></svg>' +
      (center ? '<div class="cyc-c">' + e(center) + '</div>' : '') +
      items.map(function (it, i) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return '<div class="cyc-i" style="left:' + (50 + 36 * Math.cos(a)).toFixed(1) + '%;top:' + (50 + 36 * Math.sin(a)).toFixed(1) + '%">' + box(it, i) + '</div>'; }).join('') + '</div>';
  }
  /* кольцо узлов (шестиугольник Холланда и т. п.) */
  function ring(items, center) {
    const n = items.length; const pts = items.map(function (_, i) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [50 + 38 * Math.cos(a), 50 + 38 * Math.sin(a)]; });
    return '<div class="cyc ring" style="--n:' + n + '"><svg class="cyc-ring" viewBox="0 0 100 100" aria-hidden="true"><polygon points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/></svg>' +
      (center ? '<div class="cyc-c">' + e(center) + '</div>' : '') +
      items.map(function (it, i) { return '<div class="cyc-i" style="left:' + pts[i][0].toFixed(1) + '%;top:' + pts[i][1].toFixed(1) + '%">' + box(it, i) + '</div>'; }).join('') + '</div>';
  }
  /* три пересекающихся круга */
  function venn(a, b, c, center) {
    return '<div class="venn"><div class="vc c-lime v1"><b>' + e(a) + '</b></div><div class="vc c-violet v2"><b>' + e(b) + '</b></div><div class="vc c-rose v3"><b>' + e(c) + '</b></div>' + (center ? '<div class="v-center">' + e(center) + '</div>' : '') + '</div>';
  }
  /* луковица: слои снаружи внутрь */
  function onion(layers) {
    let h = ''; const n = layers.length;
    layers.slice().reverse().forEach(function (l, ri) { const i = n - 1 - ri; l = tx(l); h = '<div class="on-l ' + col(l, i) + '"><span class="on-t"><b>' + e(l.t) + '</b>' + (l.d ? '<i>' + e(l.d) + '</i>' : '') + '</span>' + h + '</div>'; });
    return '<div class="onion">' + h + '</div>';
  }
  /* айсберг */
  function iceberg(above, below, o) {
    o = o || {};
    return '<div class="ice"><div class="ice-top"><span class="ice-lbl">' + e(o.topLabel || 'видно') + '</span>' + above.map(function (x, i) { return box(x, i, 'sm'); }).join('') + '</div>' +
      '<div class="ice-water"><span>' + e(o.water || 'уровень воды') + '</span></div>' +
      '<div class="ice-bot"><span class="ice-lbl">' + e(o.botLabel || 'не видно') + '</span>' + below.map(function (x, i) { return box(x, i + 2, 'sm'); }).join('') + '</div></div>';
  }
  /* цветная шкала */
  function spectrum(items, o) {
    o = o || {};
    return '<div class="spec">' + (o.from ? '<div class="spec-ends"><span>' + e(o.from) + '</span><span>' + e(o.to) + '</span></div>' : '') + '<div class="spec-row">' + items.map(function (it, i) { it = tx(it); return '<div class="sp ' + col(it, i) + (o.hi === i ? ' hi' : '') + '"' + (it.bg ? ' style="--sbg:' + it.bg + '"' : '') + '><b>' + e(it.t) + '</b>' + (it.d ? '<span>' + e(it.d) + '</span>' : '') + '</div>'; }).join('') + '</div></div>';
  }
  /* сравнение двух колонок */
  function compare(l, r, vs) {
    const side = function (s, i) { return '<div class="cmp-s ' + col(s, i) + '"><b>' + e(s.t) + '</b><ul>' + s.items.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul></div>'; };
    return '<div class="cmp">' + side(l, 0) + '<div class="cmp-vs">' + e(vs || 'vs') + '</div>' + side(r, 2) + '</div>';
  }
  /* дерево: корень и ветви */
  function tree(root, children, o) {
    o = o || {};
    return '<div class="tree"><div class="tree-root">' + box(root, o.rc || 4) + '</div><div class="tree-kids" style="--n:' + children.length + '">' + children.map(function (c, i) { return '<div class="tree-k">' + box(c, i) + (c.kids ? '<div class="tree-g">' + c.kids.map(function (g, j) { return box(g, i, 'sm'); }).join('') + '</div>' : '') + '</div>'; }).join('') + '</div></div>';
  }
  /* сетка карточек-плиток */
  function tiles(items, cols) {
    return '<div class="dtiles" style="--c:' + (cols || Math.min(items.length, 4)) + '">' + items.map(function (it, i) { return box(it, i); }).join('') + '</div>';
  }
  /* сглаженная кривая: pts в координатах 0..100 (y вверх), labels {x,y,t,a} */
  function curve(o) {
    const W = 600, H = 260, L = 46, R = 20, T = 22, B = 40;
    const X = function (x) { return L + x / 100 * (W - L - R); }, Y = function (y) { return T + (100 - y) / 100 * (H - T - B); };
    const p = o.pts.map(function (q) { return [X(q[0]), Y(q[1])]; });
    let d = 'M' + p[0][0] + ',' + p[0][1];
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    let s = '<svg class="crv" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + e(o.aria || o.ylab || '') + '">';
    (o.zones || []).forEach(function (z) { s += '<rect class="zone" x="' + X(z[0]) + '" y="' + T + '" width="' + (X(z[1]) - X(z[0])) + '" height="' + (H - T - B) + '"/><text class="zt" x="' + ((X(z[0]) + X(z[1])) / 2) + '" y="' + (H - B + 28) + '" text-anchor="middle">' + e(z[2]) + '</text>'; });
    (o.vlines || []).forEach(function (v) { s += '<line class="vl" x1="' + X(v) + '" x2="' + X(v) + '" y1="' + T + '" y2="' + (H - B) + '"/>'; });
    s += '<line class="ax" x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '"/><line class="ax" x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (H - B) + '"/>';
    s += '<text class="axl" x="' + (W - R) + '" y="' + (H - B + (o.zones ? 14 : 18)) + '" text-anchor="end">' + e(o.xlab || '') + '</text>';
    s += '<text class="axl" transform="translate(' + (L - 14) + ',' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">' + e(o.ylab || '') + '</text>';
    s += '<path class="ln" d="' + d + '"/>';
    (o.labels || []).forEach(function (l) { const x = X(l.x), y = Y(l.y); s += '<circle class="dt" cx="' + x + '" cy="' + y + '" r="5"/><text class="lb" x="' + (x + (l.dx || 0)) + '" y="' + (y + (l.dy || -12)) + '" text-anchor="' + (l.a || 'middle') + '">' + e(l.t) + '</text>'; });
    return s + '</svg>';
  }
  /* решётка Блейка–Моутон */
  function grid9(points) {
    let s = '<div class="g9"><div class="g9-y">Забота о людях →</div><div class="g9-g">';
    for (let r = 9; r >= 1; r--) for (let c = 1; c <= 9; c++) s += '<i></i>';
    s += points.map(function (p, i) { return '<div class="g9-p ' + col(p, i) + '" style="left:' + ((p.x - .5) / 9 * 100) + '%;bottom:' + ((p.y - .5) / 9 * 100) + '%"><b>' + e(p.x + '.' + p.y) + '</b><span>' + e(p.t) + '</span></div>'; }).join('');
    return s + '</div><div class="g9-x">Забота о производстве (задаче) →</div></div>';
  }
  function formula(parts) { return '<div class="formula-d">' + parts.map(function (p, i) { return typeof p === 'string' ? '<span class="fo">' + e(p) + '</span>' : box(p, i); }).join('') + '</div>'; }
  function example(title, text) { return '<div class="ex"><b>' + e(title || 'Пример') + '</b><p>' + e(text) + '</p></div>'; }
  function answer(text) { return '<div class="ans"><b>Как ответить на экзамене</b><p>' + e(text) + '</p></div>'; }
  return { fig: fig, matrix: matrix, pyramid: pyramid, chain: chain, steps: steps, cycle: cycle, ring: ring, venn: venn, onion: onion, iceberg: iceberg, spectrum: spectrum, compare: compare, tree: tree, tiles: tiles, curve: curve, grid9: grid9, formula: formula, example: example, answer: answer };
})();
