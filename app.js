/* 出师吧 · 前端主程序（无框架，单文件）
 * - SQL 在浏览器里用 sql.js（SQLite WebAssembly）运行，不经过服务器
 * - AI 导师走 /api/chat（服务器上的函数转发给 DeepSeek，Key 不在前端）
 * - 账号、进度、讨论保存在本机浏览器 localStorage（演示版，正式版需要后端）
 */
(function () {
  'use strict';
  var D = window.DATA, SEED = window.SEED_POSTS || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function today(off) { var d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayDiff(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  function addDaysStr(s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).toUpperCase(); }

  /* ================= 状态 ================= */
  var ACC_KEY = 'sqlintern.accounts.v1', CUR_KEY = 'sqlintern.current.v1';
  var DAILY_TARGET = 5, REBATE_DAYS = 20;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 隐私模式下可能写不进去 */ } }
  var ACC = {}; try { ACC = JSON.parse(lsGet(ACC_KEY) || '{}') || {}; } catch (e) { ACC = {}; }
  var CUR = lsGet(CUR_KEY);
  var S = CUR && ACC[CUR] ? ACC[CUR] : null;

  function fresh(user) {
    var xp = {}; D.DIMS.forEach(function (d) { xp[d[0]] = 0; });
    return {
      user: user, schoolDone: false, tested: false, unlockedTo: 0, startLevel: 0,
      xp: xp, solved: {}, attempts: {}, drafts: {}, mistakes: [], variants: {},
      daily: { date: today(), done: 0 }, streak: { count: 0, last: null },
      pet: { weight: 60 }, vip: { until: null, source: null },
      rebate: { month: today().slice(0, 7), days: 0 }, rewards: [], badges: {},
      projects: {}, customs: [], posts: [], likes: {}, settings: { ranking: false, notify: true }, invitedBy: null
    };
  }
  function migrate() { if (!S) return; S.customs = S.customs || []; S.likes = S.likes || {}; S.posts = S.posts || []; }
  migrate();
  function save() { if (!S) return; ACC[S.user.email] = S; lsSet(ACC_KEY, JSON.stringify(ACC)); lsSet(CUR_KEY, S.user.email); }
  function isVip() { return !!(S && S.vip.until && S.vip.until >= today()); }
  function myCode() { return hash(S.user.email).slice(0, 6); }

  function rollover() {
    if (!S || S.daily.date === today()) return;
    var days = Math.max(0, dayDiff(S.daily.date, today()));
    var missed = S.daily.done >= DAILY_TARGET ? days - 1 : days;
    S.pet.weight = Math.max(5, S.pet.weight - 14 * Math.max(0, missed));
    S.daily = { date: today(), done: 0 };
    if (S.rebate.month !== today().slice(0, 7)) S.rebate = { month: today().slice(0, 7), days: 0 };
    save();
  }
  function streakNow() { if (!S.streak.last) return 0; return (S.streak.last === today() || S.streak.last === today(-1)) ? S.streak.count : 0; }
  function progress() {
    S.daily.done++;
    S.pet.weight = Math.min(100, S.pet.weight + 6);
    if (S.daily.done === DAILY_TARGET) {
      S.streak.count = S.streak.last === today(-1) ? S.streak.count + 1 : 1;
      S.streak.last = today();
      var msg = '今日任务完成，统子吃饱了';
      if (isVip()) {
        S.rebate.days++;
        msg += ' · 本月返利进度 ' + S.rebate.days + '/' + REBATE_DAYS;
        if (S.rebate.days === REBATE_DAYS) { S.rewards.push({ type: '咖啡券', name: '9.9 元咖啡券', month: S.rebate.month, status: '待发放' }); msg = '本月额度完成，咖啡券已到账'; }
      }
      if (S.streak.count >= 3) S.badges.streak3 = today();
      if (S.streak.count >= 7) S.badges.streak7 = today();
      setTimeout(function () { toast(msg); }, 900);
    }
  }

  /* ================= 项目与数据库 ================= */
  var CUSTOM_CACHE = {};
  function findProject(pid) {
    var p = D.PROJECTS.filter(function (x) { return x.id === pid; })[0];
    if (p) return p;
    if (!S) return null;
    var c = S.customs.filter(function (x) { return 'C' + String(x.seed).slice(-5) === pid; })[0];
    if (!c) return null;
    if (!CUSTOM_CACHE[pid]) CUSTOM_CACHE[pid] = D.customSpec(c);
    return CUSTOM_CACHE[pid];
  }
  var DB = {}, SCHEMA = {};
  function db(name) {
    if (!DB[name]) {
      if (name === 'waimai') DB[name] = D.buildWaimai(window.SQLLIB);
      else if (name === 'shenglang') DB[name] = D.buildShenglang(window.SQLLIB);
      else DB[name] = D.buildEngine(window.SQLLIB, findProject(name.slice(1)));
    }
    return DB[name];
  }
  function schemaOf(name) {
    if (SCHEMA[name]) return SCHEMA[name];
    var d = db(name), tabs = d.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY rowid")[0].values.map(function (r) { return r[0]; });
    SCHEMA[name] = tabs.map(function (t) {
      var cols = d.exec('PRAGMA table_info(' + t + ')')[0].values.map(function (r) { return { name: r[1], type: r[2] }; });
      return { table: t, cols: cols, rows: d.exec('SELECT COUNT(*) FROM ' + t)[0].values[0][0] };
    });
    return SCHEMA[name];
  }
  function schemaText(name) { return schemaOf(name).map(function (t) { return t.table + '(' + t.cols.map(function (c) { return c.name; }).join(', ') + ')'; }).join('; '); }

  var WRITE_RE = /\b(drop|delete|update|insert|alter|create|replace|attach|detach|vacuum|pragma)\b/i;
  function run(dbname, sql) {
    var clean = sql.replace(/--[^\n]*/g, '').trim();
    if (!clean) throw new Error('先写一条 SQL 再运行');
    if (WRITE_RE.test(clean.replace(/'(?:[^']|'')*'/g, "''"))) throw new Error('练习库是只读的：这里只能用 SELECT / WITH 查询');
    var res = db(dbname).exec(clean), last = res[res.length - 1];
    return last ? { cols: last.columns, rows: last.values } : { cols: [], rows: [] };
  }
  function cnErr(m) {
    var x;
    if ((x = m.match(/no such column: (.+)/))) return '找不到列 ' + x[1] + '：检查拼写，或者它在别的表里（需要 JOIN）';
    if ((x = m.match(/no such table: (.+)/))) return '找不到表 ' + x[1] + '：看看右边的表结构，表名拼对了吗';
    if ((x = m.match(/near "(.+?)": syntax error/))) return '语法错误，问题在 "' + x[1] + '" 附近（常见原因：少了逗号、关键字顺序不对、括号没配对）';
    if ((x = m.match(/ambiguous column name: (.+)/))) return '列名 ' + x[1] + ' 有歧义：多张表都有这个列，写成 表名.' + x[1];
    if (/misuse of aggregate/.test(m)) return '聚合函数用错位置了：WHERE 里不能用 COUNT / SUM，试试 HAVING';
    if (/incomplete input/.test(m)) return 'SQL 没写完整（是不是少了右括号或引号）';
    return m;
  }
  function nv(v) { if (v === null || v === undefined) return '∅'; if (typeof v === 'number') return String(Math.round(v * 100) / 100); return String(v).trim(); }
  function rowKey(r) { return r.map(nv).sort().join('\u0001'); }
  function compare(u, ref, ordered) {
    if (!u.cols.length) return { ok: false, why: '没有返回任何结果' };
    if (u.cols.length !== ref.cols.length) return { ok: false, why: '列数不对：你返回了 ' + u.cols.length + ' 列，题目需要 ' + ref.cols.length + ' 列' };
    if (u.rows.length !== ref.rows.length) return { ok: false, why: '行数不对：你返回了 ' + u.rows.length + ' 行，正确结果是 ' + ref.rows.length + ' 行' };
    var a = u.rows.map(rowKey), b = ref.rows.map(rowKey);
    if (ordered) {
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) {
        return { ok: false, why: a.slice().sort().join('|') === b.slice().sort().join('|') ? '数据对了，但排序不对（看看题目要求的顺序）' : '第 ' + (i + 1) + ' 行的数据和正确结果不一样' };
      }
      return { ok: true };
    }
    a.sort(); b.sort();
    for (var j = 0; j < a.length; j++) if (a[j] !== b[j]) return { ok: false, why: '行数对了，但有些数值不一样（检查筛选条件和计算方式）' };
    return { ok: true };
  }
  function preview(r, n) { if (!r || !r.cols) return ''; return [r.cols.join(' | ')].concat(r.rows.slice(0, n || 5).map(function (x) { return x.map(nv).join(' | '); })).join('\n'); }
  function prettySql(s) { return s.replace(/\s+(FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|LEFT JOIN|JOIN|UNION)\s+/g, '\n$1 ').replace(/\)\s*,\s*(\w+) AS \(/g, '),\n$1 AS (').replace(/\) SELECT /g, ')\nSELECT '); }

  /* ================= AI 导师 ================= */
  var aiState = { down: false, why: '' };
  function normSql(s) { return String(s || '').toLowerCase().replace(/[\s;`]+/g, ''); }
  function ai(body) {
    return fetch('api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { error: 'bad' }; }).then(function (j) { j._status = r.status; return j; }); })
      .then(function (j) {
        if (j.error) {
          if (j._status === 429) throw new Error('busy');
          aiState.down = true; aiState.why = j.error === 'no_key' ? '服务器还没配置 DeepSeek Key' : 'AI 服务暂时连不上';
          throw new Error('down');
        }
        aiState.down = false;
        var t = String(j.text || '').trim();
        if (body.referenceSql && normSql(t).indexOf(normSql(body.referenceSql)) >= 0) throw new Error('leak');
        return t;
      });
  }
  function fallbackHint(q, lv, err) {
    if (lv === 1) return (err ? '先读一下报错：' + err.replace(/[。？?！!]$/, '') + '。\n' : '') + '先想清楚三件事：结果要显示哪几列？数据在哪张表？需不需要筛选、分组或排序？';
    if (lv === 2) return '这道题的关键是：' + (q.k || '把问题拆成"取哪些数据 → 怎么筛 → 怎么算"') + '。';
    var words = q.ref.split(/\s+/); return '给你开个头，剩下的自己补完：\n' + words.slice(0, Math.max(3, Math.floor(words.length * 0.4))).join(' ') + ' …';
  }

  /* ================= 小组件 ================= */
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  function modal(html) {
    var m = $('#modal'); m.innerHTML = '<div class="card">' + html + '</div>'; m.hidden = false;
    m.onclick = function (e) { if (e.target === m || e.target.closest('[data-close]')) { m.hidden = true; m.innerHTML = ''; } };
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  function moodOf(w) { return w >= 70 ? 3 : w >= 45 ? 2 : w >= 25 ? 1 : 0; }
  var MOOD = ['快不行了', '饿了', '还行', '超开心'];
  var MOOD_LINE = ['统子好几天没吃饭了，写一道题救救它。', '统子饿了，今天还没练够。', '统子状态还行，再练几题就能吃饱。', '统子吃得圆滚滚的，很开心。'];
  // 原创宠物"统子"：一个会胖会瘦的白色数据库圆柱。越练越圆，不练会瘦、垂头丧气
  function petSVG(w) {
    var m = moodOf(w), hw = 26 + w * 0.2, cx = 80, topY = 40 + (m <= 1 ? 6 : 0), botY = 128, ey = 9 + w * 0.03;
    var ink = '#1d1d1f', fill = '#ffffff', shade = '#eef0f3', st = ' stroke="' + ink + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    var L = cx - hw, R = cx + hw, midA = topY + (botY - topY) * 0.36, midB = topY + (botY - topY) * 0.68;
    var bodyPath = 'M' + L + ' ' + topY + ' L' + L + ' ' + botY + ' A' + hw + ' ' + ey + ' 0 0 0 ' + R + ' ' + botY + ' L' + R + ' ' + topY;
    var faceY = (topY + midA) / 2 + 8;
    var eyes = m === 3 ? '<path d="M' + (cx - 15) + ' ' + faceY + ' q5 -6 10 0 M' + (cx + 5) + ' ' + faceY + ' q5 -6 10 0"' + st + '/>'
      : m === 2 ? '<circle cx="' + (cx - 10) + '" cy="' + faceY + '" r="3" fill="' + ink + '"/><circle cx="' + (cx + 10) + '" cy="' + faceY + '" r="3" fill="' + ink + '"/>'
        : m === 1 ? '<path d="M' + (cx - 14) + ' ' + (faceY + 1) + ' h8 M' + (cx + 6) + ' ' + (faceY + 1) + ' h8"' + st + '/>'
          : '<path d="M' + (cx - 14) + ' ' + (faceY - 3) + ' l6 6 M' + (cx - 8) + ' ' + (faceY - 3) + ' l-6 6 M' + (cx + 8) + ' ' + (faceY - 3) + ' l6 6 M' + (cx + 14) + ' ' + (faceY - 3) + ' l-6 6"' + st + '/>';
    var my = faceY + 9;
    var mouth = m === 3 ? '<path d="M' + (cx - 5) + ' ' + my + ' q5 5 10 0"' + st + '/>' : m === 2 ? '<path d="M' + (cx - 3) + ' ' + my + ' h6"' + st + '/>'
      : m === 1 ? '<path d="M' + (cx - 4) + ' ' + (my + 1) + ' q4 -2 8 0"' + st + '/>' : '<path d="M' + (cx - 5) + ' ' + (my + 2) + ' q5 -5 10 0"' + st + '/>';
    var armY = (midA + midB) / 2, armUp = m === 3;
    var arms = '<path d="M' + L + ' ' + armY + ' q' + (armUp ? '-12 -10 -10 -20' : '-10 6 -6 16') + '"' + st + '/><path d="M' + R + ' ' + armY + ' q' + (armUp ? '12 -10 10 -20' : '10 6 6 16') + '"' + st + '/>';
    var extra = m === 3 ? '<path d="M' + (R + 18) + ' 34 v8 M' + (R + 14) + ' 38 h8 M' + (L - 16) + ' 50 v6 M' + (L - 19) + ' 53 h6"' + st + '/>'
      : m === 0 ? '<path d="M' + (R - 4) + ' ' + (topY + 16) + ' q5 8 0 11 q-5 -3 0 -11z" fill="#d6e6f5" stroke="' + ink + '" stroke-width="1.6"/>' : '';
    return '<svg class="pet-svg ' + (m <= 1 ? 'sad' : '') + '" viewBox="0 0 160 160" role="img" aria-label="统子：' + MOOD[m] + '">' +
      '<ellipse cx="80" cy="148" rx="' + (hw * 1.05).toFixed(1) + '" ry="5" fill="rgba(0,0,0,.08)"/>' +
      '<g class="bob">' + arms +
      '<path d="' + bodyPath + ' Z" fill="' + fill + '" stroke="none"/>' +
      '<path d="M' + (R - hw * 0.35) + ' ' + (topY + 4) + ' L' + (R - hw * 0.35) + ' ' + (botY + ey * 0.6) + ' A' + hw + ' ' + ey + ' 0 0 0 ' + R + ' ' + botY + ' L' + R + ' ' + topY + ' Z" fill="' + shade + '"/>' +
      '<path d="' + bodyPath + '"' + st + '/>' +
      '<path d="M' + L + ' ' + midA + ' A' + hw + ' ' + ey + ' 0 0 0 ' + R + ' ' + midA + ' M' + L + ' ' + midB + ' A' + hw + ' ' + ey + ' 0 0 0 ' + R + ' ' + midB + '" stroke="' + ink + '" stroke-width="1.6" fill="none" opacity=".35"/>' +
      '<ellipse cx="' + cx + '" cy="' + topY + '" rx="' + hw + '" ry="' + ey + '" fill="' + fill + '"' + st.replace(' fill="none"', '') + '/>' +
      '<ellipse cx="' + (cx - 20) + '" cy="' + (faceY + 6) + '" rx="5" ry="3" fill="#ffc9d2" opacity=".7"/><ellipse cx="' + (cx + 20) + '" cy="' + (faceY + 6) + '" rx="5" ry="3" fill="#ffc9d2" opacity=".7"/>' +
      eyes + mouth + extra + '</g></svg>';
  }

  function dimsOf(q) { if (q.dims) return q.dims; var d = D.LEVELS[q.lv].dim; return [d || 'select']; }
  var DIM_MAX = (function () {
    var m = {}; D.DIMS.forEach(function (d) { m[d[0]] = 0; });
    D.QUESTIONS.forEach(function (q) { dimsOf(q).forEach(function (k) { m[k] += 10; }); });
    m.business += 300;
    return m;
  })();
  function pct(k) { return Math.min(1, (S.xp[k] || 0) / (DIM_MAX[k] || 1)); }
  function radarSVG(size) {
    size = size || 280; var c = size / 2, R = c - 44, n = D.DIMS.length, i, out = '';
    function pt(i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + r * Math.cos(a), c + r * Math.sin(a)]; }
    for (var ring = 1; ring <= 4; ring++) { var ps = []; for (i = 0; i < n; i++) ps.push(pt(i, R * ring / 4).join(',')); out += '<polygon class="web" points="' + ps.join(' ') + '"/>'; }
    for (i = 0; i < n; i++) { var e = pt(i, R); out += '<line class="axis" x1="' + c + '" y1="' + c + '" x2="' + e[0] + '" y2="' + e[1] + '"/>'; var l = pt(i, R + 24); out += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="middle">' + D.DIMS[i][1] + '</text>'; }
    var ap = []; for (i = 0; i < n; i++) ap.push(pt(i, Math.max(0.04, pct(D.DIMS[i][0])) * R).join(','));
    out += '<polygon class="area" points="' + ap.join(' ') + '"/>';
    return '<svg class="radar" viewBox="0 0 ' + size + ' ' + size + '" width="100%" style="max-width:' + size + 'px">' + out + '</svg>';
  }
  function xpBars() {
    return '<div class="xp-list">' + D.DIMS.map(function (d) {
      return '<div class="xp"><span class="lbl">' + d[1] + '</span><div class="meter ' + (d[0] === 'business' ? 'green' : '') + '"><i style="width:' + Math.round(pct(d[0]) * 100) + '%"></i></div><span class="val">' + (S.xp[d[0]] || 0) + ' xp</span></div>';
    }).join('') + '</div>';
  }
  function tableHTML(r, max) {
    if (!r.cols.length) return '<div class="note">语句执行成功，但没有返回结果。</div>';
    max = max || 100;
    return '<div class="table-wrap"><table class="data"><thead><tr>' + r.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      r.rows.slice(0, max).map(function (row) { return '<tr>' + row.map(function (v) { return v === null ? '<td class="null">NULL</td>' : '<td>' + esc(nv(v)) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div><div class="faint xs" style="margin-top:8px">共 ' + r.rows.length + ' 行' + (r.rows.length > max ? '，只显示前 ' + max + ' 行' : '') + '</div>';
  }
  function schemaHTML(name, note) {
    return (note ? '<p class="note" style="margin:10px 0 4px">' + esc(note) + '</p>' : '') + '<div class="schema">' + schemaOf(name).map(function (t, i) {
      return '<details ' + (i < 2 ? 'open' : '') + '><summary><span>' + t.table + '</span><span>' + t.rows + ' 行</span></summary><div class="cols">' +
        t.cols.map(function (c) { return '<span class="col-tag" data-ins="' + c.name + '">' + c.name + '<em>' + (c.type || '').toLowerCase() + '</em></span>'; }).join('') + '</div></details>';
    }).join('') + '</div>';
  }
  function stars(n) { return '<span class="stars">' + '★★★★★'.slice(0, n) + '<em>' + '★★★★★'.slice(n) + '</em></span>'; }

  /* SQL 编辑器 */
  var KW = 'SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN LEFT RIGHT INNER OUTER CROSS GROUP BY ORDER HAVING LIMIT OFFSET DISTINCT CASE WHEN THEN ELSE END WITH OVER PARTITION ROWS RANGE PRECEDING FOLLOWING CURRENT ROW UNBOUNDED BETWEEN UNION ALL ASC DESC LIKE EXISTS'.split(' ');
  var FN = 'COUNT SUM AVG MIN MAX ROUND COALESCE IFNULL STRFTIME JULIANDAY DATE ROW_NUMBER RANK DENSE_RANK LAG LEAD NTILE FIRST_VALUE LAST_VALUE UPPER LOWER LENGTH SUBSTR ABS CAST TRIM REPLACE'.split(' ');
  function highlight(src) {
    var out = '', re = /('(?:[^']|'')*'?)|(--[^\n]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)|([\s\S])/g, m;
    while ((m = re.exec(src))) {
      if (m[1]) out += '<span class="tk-s">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tk-c">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tk-n">' + m[3] + '</span>';
      else if (m[4]) { var u = m[4].toUpperCase(); out += KW.indexOf(u) >= 0 ? '<span class="tk-k">' + esc(m[4]) + '</span>' : FN.indexOf(u) >= 0 ? '<span class="tk-f">' + esc(m[4]) + '</span>' : esc(m[4]); }
      else out += esc(m[5]);
    }
    return out + '\n';
  }
  function editorHTML(value, label) {
    return '<div class="editor"><div class="editor-bar"><i></i><i></i><i></i><span style="margin-left:8px">' + esc(label || 'query.sql') + '</span><span class="spacer"></span><span>SQLite · 在你的浏览器里运行</span></div>' +
      '<div class="code-wrap"><pre aria-hidden="true"></pre><textarea id="sql" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="在这里写 SQL，例如：SELECT * FROM customers LIMIT 5">' + esc(value || '') + '</textarea></div>' +
      '<div class="editor-actions"><button class="btn sm" data-act="run">运行 <span class="kbd">⌘↵</span></button><button class="btn sm primary" data-act="submit">提交答案</button><button class="btn sm" data-act="hint">要提示</button><span class="spacer"></span><button class="btn sm" data-act="clear">清空</button></div></div>';
  }
  function bindEditor(root, onChange, onRun) {
    var ta = $('#sql', root), pre = $('.code-wrap pre', root);
    function sync() { pre.innerHTML = highlight(ta.value); ta.style.height = 'auto'; ta.style.height = Math.max(200, ta.scrollHeight) + 'px'; }
    ta.addEventListener('input', function () { sync(); if (onChange) onChange(ta.value); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); sync(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (onRun) onRun(); }
    });
    $$('[data-ins]', root).forEach(function (el) { el.addEventListener('click', function () { ta.focus(); ta.setRangeText(el.dataset.ins, ta.selectionStart, ta.selectionEnd, 'end'); sync(); if (onChange) onChange(ta.value); }); });
    sync();
    return ta;
  }

  /* ================= 讨论区 ================= */
  var PALETTE = ['#ff9f0a', '#30d158', '#0a84ff', '#5e5ce6', '#ff375f', '#64d2ff', '#bf5af2', '#ac8e68'];
  function avColor(n) { return PALETTE[parseInt(hash(n).slice(-2), 36) % PALETTE.length]; }
  function threadLabel(t) {
    var k = t.split(':'), id = k[1];
    if (k[0] === 'q') { var q = D.QUESTIONS.filter(function (x) { return x.id === id; })[0]; return q ? { href: '#/q/' + id, text: '练习 ' + id + ' · ' + q.title.replace(/【.+?】/, '').slice(0, 22) + '…' } : null; }
    var p = findProject(id); return p ? { href: '#/p/' + id, text: '实习项目 ' + id + ' · ' + p.title } : null;
  }
  function postsOf(thread) {
    var groups = [], last = null;
    SEED.forEach(function (p, i) {
      if (thread && p.thread !== thread) return;
      var item = { key: 's' + i, p: p, seed: true };
      if (p.reply && last && last.p.thread === p.thread) last.replies.push(item);
      else { last = { key: item.key, p: p, seed: true, replies: [] }; groups.push(last); }
    });
    groups.sort(function (a, b) { return b.p.likes - a.p.likes; });
    var mine = S.posts.filter(function (p) { return !thread || p.thread === thread; }).map(function (p) { return { key: 'u' + p.id, p: { thread: p.thread, user: S.user.nickname, meta: [S.user.grade, S.user.major].filter(Boolean).join(' · ') || '我', time: p.at === today() ? '今天' : p.at, likes: 0, text: p.text }, mine: true, replies: [] }; });
    return mine.concat(groups);
  }
  function postHTML(g, showFrom, isReply) {
    var p = g.p, liked = !!S.likes[g.key], lk = p.likes + (liked ? 1 : 0), from = showFrom ? threadLabel(p.thread) : null;
    return '<div class="post' + (isReply ? ' reply' : '') + '"><div class="av" style="background:' + avColor(p.user) + '">' + esc(p.user.slice(0, 1)) + '</div><div>' +
      '<div class="who">' + esc(p.user) + (g.seed ? '<span class="sample">示例</span>' : '') + '<span>' + esc(p.meta || '') + ' · ' + esc(p.time) + '</span></div>' +
      (from ? '<a class="from" href="' + from.href + '">' + esc(from.text) + '</a>' : '') +
      '<div class="txt">' + esc(p.text) + '</div><div class="ops"><button data-like="' + g.key + '" class="' + (liked ? 'on' : '') + '">♥ ' + lk + '</button>' + (g.mine ? '<span>我发布的</span>' : '') + '</div></div></div>' +
      (g.replies || []).map(function (r) { return postHTML(r, false, true); }).join('');
  }
  function discussHTML(thread, unlocked, pinned) {
    var list = postsOf(thread), n = list.reduce(function (s, g) { return s + 1 + (g.replies ? g.replies.length : 0); }, 0);
    return '<div class="card discuss" id="disc"><div class="row" style="margin-bottom:16px"><h3>讨论区</h3><span class="faint small">' + n + ' 条</span></div>' +
      '<div class="pin ' + (unlocked ? '' : 'locked') + '"><div class="pin-body"><span class="pin-tag">置顶 · 官方题解</span><div style="font-weight:600;margin-top:6px">' + esc(pinned.title) + '</div>' +
      pinned.blocks.map(function (b) { return (b.label ? '<div class="small muted" style="margin-top:12px">' + esc(b.label) + '</div>' : '') + '<pre>' + highlight(prettySql(b.sql)) + '</pre>'; }).join('') +
      '<div class="small muted"><b style="color:var(--text)">思路：</b>' + esc(pinned.tip) + '</div></div>' +
      (unlocked ? '' : '<div class="pin-lock"><div><b>完成后解锁官方题解</b><span class="small muted">先自己做出来，再来对答案</span></div></div>') + '</div>' +
      '<form class="row" data-post style="flex-wrap:nowrap;align-items:flex-start"><textarea class="input" name="t" rows="2" style="min-height:48px;font-size:15px" maxlength="500" placeholder="分享你的思路或踩过的坑（别直接贴完整答案哦）"></textarea><button class="btn primary sm" style="margin-top:8px">发布</button></form>' +
      '<div class="posts" style="margin-top:6px">' + (list.length ? list.map(function (g) { return postHTML(g, false); }).join('') : '<p class="faint small" style="padding:14px 0 0">还没有人讨论，来说第一句吧。</p>') + '</div></div>';
  }
  function bindDiscuss(root, thread, rerender) {
    var f = $('[data-post]', root);
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault(); var t = $('textarea', f).value.trim(); if (!t) return;
      S.posts.unshift({ id: Date.now(), thread: thread, text: t, at: today() }); save(); rerender(); toast('已发布');
    });
    $$('[data-like]', root).forEach(function (b) { b.onclick = function () { var k = b.dataset.like; if (S.likes[k]) delete S.likes[k]; else S.likes[k] = 1; save(); rerender(); }; });
  }

  /* ================= 导航 ================= */
  var NAV = [['home', '首页'], ['practice', '练习'], ['projects', '实习项目'], ['community', '社区'], ['vip', '会员'], ['me', '我的']];
  function chrome(route) {
    var nav = $('#topnav');
    if (!S || !S.tested) { nav.hidden = true; return; }
    nav.hidden = false;
    var sec = { q: 'practice', level: 'practice', p: 'projects', custom: 'projects', v: 'me', result: 'home' }[route] || route;
    nav.innerHTML = '<div class="nav-in"><a class="nav-brand" href="#/home"><span class="logo-stack"><b>出师吧</b><i>PRENTICE</i></span></a><nav class="nav-links">' +
      NAV.map(function (n) { return '<a href="#/' + n[0] + '" class="' + (sec === n[0] ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') + '</nav>' +
      '<div class="nav-me"><a class="pill-vip ' + (isVip() ? 'on' : '') + '" href="#/vip">' + (isVip() ? 'VIP' : '免费版') + '</a><a class="avatar-sm" href="#/me" title="' + esc(S.user.nickname) + '">' + esc(S.user.nickname.slice(0, 1)) + '</a></div></div>';
  }

  /* ================= 页面 ================= */
  var V = {};

  V.login = function (p) {
    var invite = p.invite;
    return {
      html: '<div class="page"><section class="auth-hero wrap"><div class="wordmark"><b>出师吧</b><i>PRENTICE</i></div><h1 style="margin-top:8px">今天，你是一名<br><span class="grad">数据分析实习生</span>。</h1>' +
        '<p class="sub">不是刷题，是上班。业务方丢来一个问题，你用 SQL 找到原因，再写成一段能放进简历的项目经历。</p>' +
        (invite ? '<div class="offer">同学邀请你加入：注册即送 VIP 3 天</div>' : '') + '</section>' +
        '<section class="wrap" style="padding-bottom:30px"><form class="card auth-form" id="f" novalidate><h3 style="margin-bottom:18px;text-align:center">注册或登录</h3>' +
        '<div class="field"><label for="em">邮箱</label><input class="input" id="em" type="email" placeholder="you@example.com" autocomplete="email" required></div>' +
        '<div class="field"><label for="nk">昵称</label><input class="input" id="nk" placeholder="排名和讨论区里显示这个" maxlength="16"></div>' +
        '<button class="btn primary lg" style="width:100%" type="submit">继续</button>' +
        '<p class="faint xs" style="margin:14px 0 0;text-align:center">演示版：账号保存在这台设备的浏览器里，不需要密码。</p></form>' +
        '<div class="features"><div class="card"><div class="feat-ico" style="background:#0a84ff">SQL</div><b>打开即练</b><span class="muted small">不用装任何软件，数据库就在你的浏览器里。第 0–8 关、' + D.QUESTIONS.length + ' 道题全部免费。</span></div>' +
        '<div class="card"><div class="feat-ico" style="background:#30d158">AI</div><b>只给提示的导师</b><span class="muted small">先指方向，再点语法，最后才给半句代码。答对之后还会追问业务问题。</span></div>' +
        '<div class="card"><div class="feat-ico" style="background:#ff9f0a">100</div><b>100 个实习项目</b><span class="muted small">外卖、出海、SaaS、游戏……按"描述 → 拆解 → 归因 → 结论"完成一次真实感的分析。</span></div></div></section>' +
        '<div class="footer">所有公司与数据均为虚构，仅用于练习。</div></div>',
      bind: function (el) {
        $('#f', el).addEventListener('submit', function (e) {
          e.preventDefault();
          var email = $('#em', el).value.trim().toLowerCase(), nick = $('#nk', el).value.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('邮箱格式不太对'); return; }
          if (ACC[email]) { S = ACC[email]; migrate(); if (nick) S.user.nickname = nick; save(); toast('欢迎回来，' + S.user.nickname); go('#/home'); return; }
          S = fresh({ email: email, nickname: nick || email.split('@')[0], school: '', major: '', grade: '', rivals: '' });
          if (invite && invite !== hash(email).slice(0, 6)) { S.invitedBy = invite; S.vip = { until: addDaysStr(today(), 2), source: '邀请体验' }; }
          save(); go('#/school');
        });
      }
    };
  };

  V.school = function () {
    var u = S.user;
    return {
      html: '<div class="page wrap narrow"><section class="hero"><div class="kicker gray">第 2 步，共 3 步</div><h1>填写学校信息</h1><p class="sub">用来做本校排名、推荐同校同学的讨论。不需要学校邮箱，也可以先跳过。</p></section>' +
        '<form class="card" id="f" style="margin-bottom:60px">' +
        '<div class="field"><label>学校</label><input class="input" id="sc" value="' + esc(u.school) + '" placeholder="例如：某某大学"></div>' +
        '<div class="grid g2" style="gap:14px"><div class="field"><label>专业</label><input class="input" id="mj" value="' + esc(u.major) + '" placeholder="例如：市场营销"></div>' +
        '<div class="field"><label>年级</label><select class="input" id="gr">' + ['', '大一', '大二', '大三', '大四', '研一', '研二', '研三'].map(function (g) { return '<option ' + (g === u.grade ? 'selected' : '') + '>' + g + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="field"><label>想比一比的学校（选填）</label><input class="input" id="rv" value="' + esc(u.rivals) + '" placeholder="用逗号分隔"><small>排名默认关闭，可以之后在"社区"里开启</small></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn" type="button" id="skip">先跳过</button><button class="btn primary" type="submit">下一步</button></div></form></div>',
      bind: function (el) {
        function done() { S.schoolDone = true; save(); go('#/test'); }
        $('#skip', el).onclick = done;
        $('#f', el).addEventListener('submit', function (e) { e.preventDefault(); u.school = $('#sc', el).value.trim(); u.major = $('#mj', el).value.trim(); u.grade = $('#gr', el).value; u.rivals = $('#rv', el).value.trim(); done(); });
      }
    };
  };

  var TEST = [
    { q: '哪条语句能查出 products 表里价格超过 200 的商品？', o: ['<code>SELECT * FROM products WHERE price > 200</code>', '<code>SELECT price > 200 FROM products</code>', '<code>SELECT * FROM products HAVING > 200</code>'], a: 0, dims: ['select', 'where'] },
    { q: '想统计"每个国家有多少用户"，最关键的语法是？', o: ['ORDER BY', 'GROUP BY', 'DISTINCT'], a: 1, dims: ['groupby'] },
    { q: '<code>customers LEFT JOIN orders</code> 之后，从没下过单的用户会怎样？', o: ['不出现在结果里', '会出现，订单相关的列是空值', '直接报错'], a: 1, dims: ['join'] },
    { q: '<code>ROW_NUMBER() OVER (PARTITION BY country ORDER BY sales DESC)</code> 在做什么？', o: ['按国家去重', '计算每个国家的总销售额', '在每个国家内部按销售额排名'], a: 2, dims: ['window'] }
  ];
  V.test = function () {
    var i = 0, score = 0, got = [];
    function q() {
      var t = TEST[i];
      return '<div class="progress-dots">' + TEST.map(function (_, k) { return '<i class="' + (k <= i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<h3 style="margin-bottom:20px;line-height:1.5">' + t.q + '</h3>' + t.o.map(function (o, k) { return '<button class="opt" data-k="' + k + '">' + o + '</button>'; }).join('') +
        '<button class="opt" data-k="-1" style="background:transparent;box-shadow:inset 0 0 0 1px var(--line2)">没学过 / 不确定</button>';
    }
    return {
      html: '<div class="page wrap narrow"><section class="hero"><div class="kicker gray">第 3 步，共 3 步</div><h1>测一下你的起点</h1><p class="sub">4 道题，不计分、不排名，只用来推荐你从第几关开始。</p></section><div class="card" id="box" style="margin-bottom:60px">' + q() + '</div></div>',
      bind: function (el) {
        var box = $('#box', el);
        box.addEventListener('click', function (e) {
          var b = e.target.closest('.opt'); if (!b) return;
          var t = TEST[i]; if (+b.dataset.k === t.a) { score++; got.push(t.dims); }
          i++;
          if (i < TEST.length) { box.innerHTML = q(); return; }
          var start = [0, 2, 4, 5, 7][score];
          S.tested = true; S.startLevel = start; S.unlockedTo = start;
          got.forEach(function (ds) { ds.forEach(function (d) { S.xp[d] += 10; }); });
          save(); go('#/result');
        });
      }
    };
  };

  V.result = function () {
    var lv = D.LEVELS[S.startLevel];
    return {
      html: '<div class="page"><section class="hero wrap"><div class="kicker blue">你的 SQL 能力画像</div><h1>建议从第 ' + lv.no + ' 关开始</h1><p class="sub">' + lv.name + '。第 0–' + S.startLevel + ' 关已为你解锁。</p></section>' +
        '<div class="wrap" style="padding-bottom:60px"><div class="grid g2"><div class="card" style="display:grid;place-items:center">' + radarSVG(320) + '</div><div class="card"><h3 style="margin-bottom:18px">经验值</h3>' + xpBars() +
        '<p class="note" style="margin-top:18px">每答对一题，对应知识点的经验条就会涨；用的提示越少，涨得越多。</p><a class="btn primary" href="#/home" style="margin-top:6px">去见见统子</a></div></div></div></div>'
    };
  };

  function nextQuestion() {
    for (var i = 0; i < D.QUESTIONS.length; i++) { var q = D.QUESTIONS[i]; if (q.lv >= S.startLevel && q.lv <= S.unlockedTo && !S.solved[q.id]) return q; }
    for (var j = 0; j < D.QUESTIONS.length; j++) if (!S.solved[D.QUESTIONS[j].id]) return D.QUESTIONS[j];
    return null;
  }
  function solvedCount() { return D.QUESTIONS.filter(function (q) { return S.solved[q.id]; }).length; }
  function projDone(pid) { var st = S.projects[pid]; return !!(st && st.score != null); }

  V.home = function () {
    var w = S.pet.weight, m = moodOf(w), done = Math.min(S.daily.done, DAILY_TARGET), nq = nextQuestion(), vip = isVip();
    var hr = new Date().getHours(), hi = hr < 6 ? '夜深了' : hr < 11 ? '早上好' : hr < 14 ? '中午好' : hr < 18 ? '下午好' : '晚上好';
    var p1 = S.projects['001'] || {}, p1done = (p1.done || []).filter(Boolean).length;
    return {
      html: '<div class="page"><section class="section white" style="padding-bottom:40px"><div class="wrap">' +
        (m <= 1 && S.settings.notify ? '<div class="banner"><span>' + MOOD_LINE[m] + '</span><span class="spacer"></span>' + (nq ? '<a class="btn sm dark" href="#/q/' + nq.id + '">去喂它</a>' : '') + '</div>' : '') +
        '<div class="head" style="margin:0"><div><div class="kicker gray">' + today() + '</div><h1 style="margin-top:6px;font-size:48px">' + hi + '，' + esc(S.user.nickname) + '。</h1></div>' +
        (nq ? '<a class="btn primary lg" href="#/q/' + nq.id + '">继续学习 · ' + nq.id + '</a>' : '<a class="btn primary lg" href="#/projects">去做实习项目</a>') + '</div></div></section>' +
        '<section class="section"><div class="wrap"><div class="grid g-home">' +
        '<div class="card pet-wrap"><div class="pet-stage">' + petSVG(w) + '</div><div class="row" style="justify-content:center"><h2>统子</h2><span class="mood m' + m + '">' + MOOD[m] + '</span></div>' +
        '<p class="muted small" style="margin:8px 0 14px">' + MOOD_LINE[m] + '</p><div style="width:100%;max-width:280px"><div class="row xs faint" style="justify-content:space-between"><span>饱腹值</span><span>' + w + ' / 100</span></div><div class="meter orange" style="margin-top:6px"><i style="width:' + w + '%"></i></div></div>' +
        '<div class="stats3" style="width:100%;margin-top:24px;padding-top:20px;border-top:1px solid var(--line2)"><div class="stat"><b>' + streakNow() + '</b><span>连续打卡</span></div><div class="stat"><b>' + solvedCount() + '</b><span>答对题数</span></div><div class="stat"><b>' + Object.keys(S.projects).filter(projDone).length + '</b><span>完成项目</span></div></div></div>' +
        '<div class="card"><div class="tile-title">任务仪表盘</div><div class="row" style="gap:26px;align-items:center;margin-bottom:24px"><div class="ring" style="--p:' + Math.round(done / DAILY_TARGET * 100) + '"><div><span><b>' + done + '</b><small> / ' + DAILY_TARGET + '</small><br><small>今日任务</small></span></div></div>' +
        '<div style="flex:1;min-width:200px"><h3>今天完成 ' + DAILY_TARGET + ' 道题或项目步骤</h3><p class="muted small" style="margin:6px 0 0">已完成 ' + done + ' · 完成度 ' + Math.round(done / DAILY_TARGET * 100) + '%' + (vip ? ' · 本月咖啡返利 ' + S.rebate.days + '/' + REBATE_DAYS + ' 天' : '') + '</p></div></div>' + xpBars() + '</div>' +
        '</div><div class="grid g2" style="margin-top:20px">' +
        '<a class="card link proj" href="#/p/001"><div class="row"><span class="chip free">免费体验</span><span class="chip">TASK 001</span></div><div class="co">某外卖平台 · 数据分析实习生</div><h3 style="font-size:24px">北京外卖订单量下降，找原因</h3><div class="foot"><span>' + (p1done ? '进行中 ' + p1done + ' / 6 步' : '业务方：9 月北京的单量少了不少，周五前给个结论。') + '</span><span class="more">打开工单</span></div></a>' +
        (vip ? '<a class="card link proj" href="#/custom"><div class="row"><span class="chip vip">VIP</span></div><div class="co">会员有效期至 ' + S.vip.until + '</div><h3 style="font-size:24px">生成一套只属于你的实习数据</h3><div class="foot"><span>选行业和岗位，原因每次都不一样</span><span class="more">定制数据</span></div></a>'
          : '<a class="card link proj" href="#/vip"><div class="row"><span class="chip vip">VIP · 9.9 元 / 月</span></div><div class="co">练满一个月，返你一杯咖啡</div><h3 style="font-size:24px">100 个实习项目、AI 错题本、定制数据</h3><div class="foot"><span>' + (S.mistakes.length ? '你已经有 ' + S.mistakes.length + ' 道错题等着整理' : '当月完成 ' + REBATE_DAYS + ' 天任务返 9.9 元') + '</span><span class="more">了解会员</span></div></a>') +
        '</div></div></section></div>'
    };
  };

  V.practice = function () {
    function card(L) {
      var qs = D.QUESTIONS.filter(function (q) { return q.lv === L.no; }), ok = qs.filter(function (q) { return S.solved[q.id]; }).length, locked = L.no > S.unlockedTo;
      return '<a class="card link level ' + (locked ? 'locked' : '') + (ok === qs.length ? ' done' : '') + '" href="#/level/' + L.no + '"><span class="no">第 ' + L.no + ' 关' + (ok === qs.length ? ' · 已完成' : '') + '</span><h3>' + L.name + '</h3><span class="desc">' + L.intro + '</span>' +
        '<div class="meter ' + (ok === qs.length ? 'green' : '') + '"><i style="width:' + Math.round(ok / qs.length * 100) + '%"></i></div><span class="row xs faint" style="justify-content:space-between"><span>' + ok + ' / ' + qs.length + ' 题</span>' + (locked ? '<span>未解锁</span>' : '<span style="color:var(--green)">免费</span>') + '</span></a>';
    }
    var L8 = D.LEVELS[8], q8 = D.QUESTIONS.filter(function (q) { return q.lv === 8; }), ok8 = q8.filter(function (q) { return S.solved[q.id]; }).length;
    return {
      html: '<div class="page"><section class="hero wrap"><div class="kicker">练习</div><h1>由浅到深，十关。</h1><p class="sub">' + D.QUESTIONS.length + ' 道题，全部基于同一个虚构的出海消费电子品牌"声浪科技"。第 0–8 关免费，完成一关解锁下一关。</p></section>' +
        '<div class="wrap" style="padding-bottom:60px"><div class="levels">' + D.LEVELS.slice(0, 8).map(card).join('') + '</div>' +
        '<h2 style="margin:56px 0 8px">综合项目练习</h2><p class="muted" style="margin:0 0 22px">学完语法，用项目把它们串起来。</p>' +
        '<a class="card link feature" href="#/level/8" style="margin-bottom:20px"><div><span class="chip new">第 8 关 · 项目专题 · 免费</span><h2 style="margin:14px 0 10px">8 个业务项目 · 16 道题</h2><p class="muted" style="margin:0 0 16px">' + L8.intro + '</p>' +
        '<div class="row">' + q8.filter(function (q) { return q.step === 1; }).map(function (q) { var both = S.solved[q.id] && S.solved['8-' + (+q.id.split('-')[1] + 1)]; return '<span class="chip ' + (both ? 'free' : '') + '">' + q.project + '</span>'; }).join('') + '</div><p class="small faint" style="margin:16px 0 0">' + ok8 + ' / ' + q8.length + ' 已完成</p></div>' +
        '<div class="art">-- 连续登录 3 天的用户\n<b>WITH</b> t <b>AS</b> (\n  <b>SELECT</b> customer_id,\n    julianday(login_date)\n    - <b>ROW_NUMBER</b>() <b>OVER</b> (...) <b>AS</b> grp\n  <b>FROM</b> user_logins\n)\n<b>SELECT DISTINCT</b> customer_id ...</div></a>' +
        '<a class="card link feature dark" href="#/projects"><div><span class="chip" style="background:#1d1d1f;color:#f5f5f7">第 9 关 · 实习项目</span><h2 style="margin:14px 0 10px">100 个完整的模拟实习项目</h2><p class="muted" style="margin:0 0 16px">' + D.LEVELS[9].intro + ' 2 个免费体验，VIP 还能定制自己的数据。</p><span class="more" style="color:#2997ff">查看全部项目</span></div>' +
        '<div class="art" style="background:#1d1d1f">TASK 001  某外卖平台\n北京外卖订单量下降，找原因\n\n01 描述  8 月 vs 9 月订单量\n02 拆解  按用户类型\n03 拆解  按区域\n04 归因  优惠金额变化\n05 归因  排除配送时长\n06 结论  写给业务方</div></a></div></div>'
    };
  };

  V.level = function (p) {
    var n = +p.id, L = D.LEVELS[n]; if (!L || n === 9) { go('#/practice'); return { html: '' }; }
    var qs = D.QUESTIONS.filter(function (q) { return q.lv === n; });
    return {
      html: '<div class="page"><section class="hero wrap" style="padding-bottom:30px"><div class="kicker">' + (n === 8 ? '项目专题' : '第 ' + n + ' 关') + '</div><h1>' + L.name + '</h1><p class="sub">' + L.intro + '</p></section>' +
        '<div class="wrap narrow" style="padding-bottom:60px"><a href="#/practice" class="back">‹ 全部关卡</a>' + (n > S.unlockedTo ? '<div class="banner">建议先完成第 ' + (n - 1) + ' 关。也可以直接进去试试。</div>' : '') +
        '<div class="qlist">' + qs.map(function (q) { var ok = S.solved[q.id]; return '<a class="qitem ' + (ok ? 'ok' : '') + '" href="#/q/' + q.id + '"><span class="id">' + q.id + '</span><span class="t">' + (q.project ? '<span class="chip new" style="margin-right:8px">' + q.project + ' · ' + q.step + '/2</span>' : '') + esc(q.title.replace(/【.+?】/, '')) + '</span><span class="check">✓</span></a>'; }).join('') + '</div></div></div>'
    };
  };

  /* 题目工作台（练习题 / 变式题 / 项目步骤共用） */
  function workbench(opt) {
    var key = opt.key, attempts = S.attempts[key] || 0, solvedAlready = !!S.solved[key];
    var html = '<div class="page wrap" style="padding-top:28px;padding-bottom:60px">' + (opt.back || '') +
      '<div class="grid g-q"><div><div class="card ' + (solvedAlready ? 'has-pass' : '') + '" id="qcard">' + (solvedAlready ? '<span class="passed">已通过</span>' : '') + (opt.extraTop || '') +
      '<div class="qhead"><span class="qid">' + esc(opt.idTag) + '</span><div class="qtitle">' + esc(opt.title) + '</div></div>' +
      editorHTML(S.drafts[key] || '', opt.label) + '<div class="result" id="res"></div></div>' +
      '<div class="row" style="margin:16px 0 0">' + (opt.prev ? '<a class="btn sm" href="' + opt.prev + '">‹ 上一题</a>' : '') + '<span class="spacer"></span>' + (opt.next ? '<a class="btn sm" href="' + opt.next + '">' + (opt.nextLabel || '下一题') + ' ›</a>' : '') + '</div>' +
      (opt.thread ? '<div id="discbox"></div>' : '') + '</div>' +
      '<div class="grid" style="gap:20px;position:sticky;top:72px"><div class="card tutor"><div class="tutor-head"><div class="avatar">导</div><div><b>AI 导师</b><div class="faint xs" id="aist">只给提示，不给答案</div></div></div>' +
      '<div class="msgs" id="msgs"><div class="msg ai">先自己写写看。卡住了点"要提示"，我会从思路开始，一点点带你。</div></div>' +
      '<form class="row" id="ask" style="flex-wrap:nowrap"><input class="input" id="askq" style="font-size:15px;padding:10px 14px" placeholder="问导师一个问题" maxlength="300"><button class="btn primary sm">发送</button></form></div>' +
      '<div class="card"><h3>表结构</h3><p class="faint xs" style="margin:4px 0 0">点列名可以直接插进编辑器</p>' + schemaHTML(opt.dbname, opt.schemaNote) + '</div></div></div></div>';

    function bind(el) {
      var msgs = $('#msgs', el), res = $('#res', el), last = null, refRes = null, solvedNow = solvedAlready, followupQ = null;
      function drawDiscuss() {
        if (!opt.thread) return;
        var box = $('#discbox', el); box.innerHTML = discussHTML(opt.thread, solvedNow, opt.pinned);
        bindDiscuss(box, opt.thread, drawDiscuss);
      }
      drawDiscuss();
      function getRef() { if (!refRes) refRes = run(opt.dbname, opt.ref); return refRes; }
      function say(text, who, tag) { var d = document.createElement('div'); d.className = 'msg ' + (who || 'ai'); d.innerHTML = (tag ? '<span class="lvl">' + esc(tag) + '</span><br>' : '') + esc(text); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
      function typing() { var d = say('', 'ai typing'); d.innerHTML = '导师正在看你的 SQL<span class="dots"></span>'; return d; }
      function ctx(extra) {
        var b = { question: opt.title, schema: schemaText(opt.dbname), referenceSql: opt.ref, userSql: ta.value };
        if (last && last.error) b.error = last.error; if (last && last.res) b.resultPreview = preview(last.res);
        try { b.expectedPreview = preview(getRef()); } catch (e) { /* ignore */ }
        for (var k in extra) b[k] = extra[k];
        return b;
      }
      function status() { $('#aist', el).textContent = aiState.down ? 'AI 离线（' + aiState.why + '），先用内置提示' : '只给提示，不给答案'; }
      function hint(lv) {
        var t = typing();
        ai(ctx({ mode: 'hint', hintLevel: lv })).then(function (txt) { t.remove(); say(txt, 'ai', '第 ' + lv + ' 级提示'); })
          .catch(function (e) {
            t.remove();
            if (e.message === 'busy') say('高峰期排队中，导师稍后回来（VIP 优先）。先看内置提示：\n' + fallbackHint(opt, lv, last && last.error), 'ai', '第 ' + lv + ' 级提示');
            else say(fallbackHint(opt, lv, last && last.error), 'ai', '第 ' + lv + ' 级提示 · 内置');
          }).then(status);
      }
      var ta = bindEditor(el, function (v) { S.drafts[key] = v; clearTimeout(bind._t); bind._t = setTimeout(save, 400); }, function () { doRun(false); });
      function show(r, verdict) { res.innerHTML = (verdict || '') + (r ? tableHTML(r) : ''); }
      function doRun(submit) {
        var r;
        try { r = run(opt.dbname, ta.value); last = { res: r }; }
        catch (e) { last = { error: cnErr(e.message) }; show(null, '<div class="verdict err">报错：' + esc(last.error) + '</div>'); if (submit) fail(last.error); return; }
        if (!submit) { show(r, '<div class="verdict info">运行成功。确认没问题后点"提交答案"。</div>'); return; }
        var c = compare(r, getRef(), opt.ordered);
        if (c.ok) win(r); else { show(r, '<div class="verdict bad">还差一点：' + esc(c.why) + '</div>'); fail(c.why); }
      }
      function fail(why) {
        attempts = S.attempts[key] = (S.attempts[key] || 0) + 1;
        S.mistakes = S.mistakes.filter(function (m) { return m.key !== key; });
        S.mistakes.unshift({ key: key, title: opt.title, sql: ta.value, why: why, at: today(), db: opt.dbname, ref: opt.ref, route: location.hash });
        if (S.mistakes.length > 200) S.mistakes.length = 200;
        save(); hint(Math.min(3, attempts));
      }
      function win(r) {
        show(r, '<div class="verdict ok">答对了。' + (solvedNow ? '（之前已经通过）' : '') + '</div>');
        var qc = $('#qcard', el);
        if (!$('.passed', el)) { qc.classList.add('has-pass'); qc.insertAdjacentHTML('afterbegin', '<span class="passed">已通过</span>'); }
        if (!solvedNow) {
          solvedNow = true;
          var gain = Math.max(4, 10 - 3 * Math.min(2, attempts));
          S.solved[key] = { at: today(), attempts: attempts };
          S.mistakes = S.mistakes.filter(function (m) { return m.key !== key; });
          (opt.dims || []).forEach(function (d) { S.xp[d] = (S.xp[d] || 0) + gain; });
          progress();
          if (opt.onSolved) opt.onSolved();
          save(); chrome(currentRoute); drawDiscuss();
          toast('+' + gain + ' 经验值 · 官方题解已解锁');
        }
        var t = typing();
        ai(ctx({ mode: 'followup' })).then(function (txt) { t.remove(); followupQ = txt; say(txt, 'ai', '业务追问'); })
          .catch(function () { t.remove(); followupQ = '答对了。追问一句：这个结果说明了什么？如果你是业务负责人，下一步会看什么？'; say(followupQ, 'ai', '业务追问'); }).then(status);
      }
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        var a = b.dataset.act;
        if (a === 'run') doRun(false);
        if (a === 'submit') doRun(true);
        if (a === 'hint') { S.attempts[key] = (S.attempts[key] || 0) + 1; save(); hint(Math.min(3, S.attempts[key])); }
        if (a === 'clear') { ta.value = ''; ta.dispatchEvent(new Event('input')); }
      });
      $('#ask', el).addEventListener('submit', function (e) {
        e.preventDefault(); var v = $('#askq', el).value.trim(); if (!v) return;
        $('#askq', el).value = ''; say(v, 'me');
        var t = typing(), mode = followupQ ? 'grade_followup' : 'ask';
        ai(ctx({ mode: mode, studentText: v })).then(function (txt) {
          t.remove(); say(txt, 'ai', mode === 'grade_followup' ? '点评' : '');
          if (mode === 'grade_followup') { S.xp.business += 2; save(); followupQ = null; toast('+2 业务思维经验'); }
        }).catch(function () { t.remove(); say('导师暂时不在线。可以先去下面的讨论区问问同学。'); }).then(status);
      });
    }
    return { html: html, bind: bind };
  }

  V.q = function (p) {
    var idx = -1; D.QUESTIONS.forEach(function (q, i) { if (q.id === p.id) idx = i; });
    if (idx < 0) { go('#/practice'); return { html: '' }; }
    var q = D.QUESTIONS[idx], L = D.LEVELS[q.lv], prev = D.QUESTIONS[idx - 1], next = D.QUESTIONS[idx + 1];
    return workbench({
      key: q.id, dbname: 'shenglang', label: '练习数据库 · 声浪科技（虚构公司）', title: q.title, idTag: q.id, ref: q.ref, ordered: q.ordered, k: q.k, dims: dimsOf(q),
      prev: prev ? '#/q/' + prev.id : null, next: next ? '#/q/' + next.id : null,
      back: '<a href="#/level/' + q.lv + '" class="back">‹ ' + (q.lv === 8 ? '项目专题' : '第 ' + q.lv + ' 关 · ' + L.name) + '</a>',
      thread: 'q:' + q.id, pinned: { title: q.title.replace(/【.+?】/, ''), blocks: [{ sql: q.ref }], tip: q.k },
      onSolved: function () {
        var qs = D.QUESTIONS.filter(function (x) { return x.lv === q.lv; });
        if (!S.badges.first) S.badges.first = today();
        if (qs.every(function (x) { return S.solved[x.id]; })) {
          if (q.lv === 4) S.badges.lv4 = today();
          if (S.unlockedTo <= q.lv && q.lv < 8) { S.unlockedTo = q.lv + 1; setTimeout(function () { toast('第 ' + (q.lv + 1) + ' 关已解锁' + (q.lv + 1 === 5 ? ' · 实习项目也解锁了' : '')); }, 1500); }
        }
      }
    });
  };

  V.v = function (p) {
    var vq = S.variants[p.id]; if (!vq) { go('#/me'); return { html: '' }; }
    return workbench({
      key: 'v-' + p.id, dbname: vq.db || 'shenglang', label: 'AI 变式题', title: vq.title, idTag: '变式', ref: vq.ref, k: vq.k, dims: vq.dims || ['select'],
      back: '<a href="#/me" class="back">‹ 错题本</a>', extraTop: '<p class="note" style="margin-top:0">这道题由 AI 根据你的错题现出，考同一个知识点。</p>'
    });
  };

  /* ---------- 实习项目 ---------- */
  function canOpen(P) { return P.free || isVip(); }
  function projCard(P) {
    var st = S.projects[P.id] || {}, n = P.steps.length, d = (st.done || []).filter(Boolean).length, open = canOpen(P);
    return '<a class="card link proj" href="' + (open ? '#/p/' + P.id : '#/vip') + '"><div class="row">' + (P.free ? '<span class="chip free">免费体验</span>' : P.custom ? '<span class="chip blue">我的定制</span>' : '<span class="chip vip">VIP</span>') + '<span class="chip">' + (P.industry || (P.id === '001' ? '本地生活' : '出海')) + '</span></div>' +
      '<div class="co">TASK ' + P.id + ' · ' + esc(P.company) + '</div><h3>' + esc(P.title) + '</h3>' +
      (d ? '<div class="meter green"><i style="width:' + Math.round(d / n * 100) + '%"></i></div>' : '') +
      '<div class="foot">' + stars(P.stars) + '<span>' + (st.score != null ? '已完成 · ' + st.score + ' 分' : d ? d + ' / ' + n + ' 步' : open ? n + ' 步' : '开通 VIP 解锁') + '</span></div></a>';
  }
  V.projects = function (p) {
    var vip = isVip(), filter = p.f || '全部', diff = +(p.d || 0);
    var customs = S.customs.map(function (c) { return findProject('C' + String(c.seed).slice(-5)); }).filter(Boolean);
    var all = D.PROJECTS.concat(customs);
    var shown = all.filter(function (P) { return (filter === '全部' ? !P.custom : filter === '我的定制' ? P.custom : filter === '免费' ? P.free : (P.industry === filter && !P.custom)) && (!diff || P.stars === diff); });
    var dtabs = [[0, '全部难度'], [2, '入门 ★2'], [3, '进阶 ★3'], [4, '挑战 ★4'], [5, '专家 ★5']];
    var qs = function (f, d) { return '#/projects?f=' + encodeURIComponent(f) + '&d=' + d; };
    var tabs = ['全部', '免费'].concat(D.INDUSTRIES).concat(customs.length ? ['我的定制'] : []);
    return {
      html: '<div class="page"><section class="hero wrap" style="padding-bottom:30px"><div class="kicker">第 9 关 · 实习项目</div><h1>100 个实习项目。<br>一次真实的分析工作。</h1><p class="sub">业务方丢来一个问题，你按"描述 → 拆解 → 归因 → 结论"把它做完。所有公司和数据均为虚构。</p></section>' +
        '<div class="wrap" style="padding-bottom:60px">' +
        '<div class="vip-hero"><div class="glow"></div><div style="position:relative"><span class="chip vip">VIP 专属</span><h2 style="margin:16px 0 12px">定制数据。<br>只属于你的实习项目。</h2><p class="muted" style="margin:0 0 24px;font-size:17px">选一个你想去的行业和岗位，系统现场生成一整套业务数据，并在里面藏好一个原因。每次生成都不一样，别人的题解帮不了你。</p>' +
        (vip ? '<a class="btn primary lg" href="#/custom">开始定制</a>' : '<a class="btn primary lg" href="#/vip">开通 VIP 使用</a><span class="muted small" style="margin-left:14px">9.9 元 / 月</span>') + '</div>' +
        '<div class="mock"><b>定制项目 · 出海 B2B SaaS · GTM 实习生</b>\n\n<span class="hl">leads</span>       1,600 行   region, company_size\n<span class="hl">lead_events</span> 1,600 行   is_qualified, response_hours\n\n6 月 MQL→SQL 转化率下降，找出原因\n01 描述   02 拆解   03 拆解\n04 归因   05 对照   06 周趋势\n07 结论 → 简历描述</div></div>' +
        (S.unlockedTo < 5 ? '<div class="banner">建议先完成第 4 关（聚合与分组）再来做项目。现在也可以先进去看看。</div>' : '') +
        '<div class="filters" style="margin-bottom:10px">' + tabs.map(function (t) { return '<button data-go="' + qs(t, diff) + '" class="' + (t === filter ? 'on' : '') + '">' + t + '</button>'; }).join('') + '</div>' +
        '<div class="filters">' + dtabs.map(function (t) { return '<button data-go="' + qs(filter, t[0]) + '" class="' + (t[0] === diff ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '<span class="faint small" style="align-self:center;margin-left:6px">共 ' + shown.length + ' 个</span></div>' +
        '<div class="grid g3">' + (shown.length ? shown.map(projCard).join('') : '<p class="muted">这个组合下还没有项目。</p>') + '</div></div></div>',
      bind: function (el) { $$('[data-go]', el).forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; }); }
    };
  };

  V.custom = function () {
    if (!isVip()) { go('#/vip'); return { html: '' }; }
    var roles = ['数据分析实习生', '市场 / 品牌实习生', 'GTM 实习生', '用户运营实习生', '产品分析实习生'];
    var mine = S.customs.map(function (c) { return findProject('C' + String(c.seed).slice(-5)); }).filter(Boolean);
    return {
      html: '<div class="page"><section class="hero wrap" style="padding-bottom:30px"><div class="kicker" style="color:var(--gold)">VIP · 定制数据</div><h1>生成你的实习项目</h1><p class="sub">系统会现场生成一套业务数据，随机藏一个原因，并配好分析步骤。</p></section>' +
        '<div class="wrap narrow" style="padding-bottom:60px"><form class="card" id="cf">' +
        '<div class="field"><label>行业</label><select class="input" id="ind"><option value="">随机</option>' + D.INDUSTRIES.map(function (i) { return '<option>' + i + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>你的岗位</label><select class="input" id="role">' + roles.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select><small>会写进项目背景和简历描述里</small></div>' +
        '<div class="field"><label>难度</label><select class="input" id="lv"><option value="2">入门 ★2 · 描述、拆解、归因</option><option value="3" selected>进阶 ★3 · 加对照组</option><option value="4">挑战 ★4 · 加周趋势和 LAG</option><option value="5">专家 ★5 · 交叉拆解、贡献度、次要原因</option></select></div>' +
        '<button class="btn primary lg" style="width:100%">生成项目</button></form>' +
        (mine.length ? '<h3 style="margin:36px 0 14px">我生成过的项目</h3><div class="grid g2">' + mine.map(projCard).join('') + '</div>' : '') + '</div></div>',
      bind: function (el) {
        $('#cf', el).addEventListener('submit', function (e) {
          e.preventDefault();
          var opt = { seed: 10000 + Math.floor(Math.random() * 89990000), industry: $('#ind', el).value, role: $('#role', el).value, stars: +$('#lv', el).value, at: today() };
          S.customs.unshift(opt); save();
          toast('数据生成好了');
          go('#/p/C' + String(opt.seed).slice(-5));
        });
      }
    };
  };

  function projState(pid) { var P = findProject(pid); if (P && !S.projects[pid]) S.projects[pid] = { done: [] }; return { P: P, st: S.projects[pid] }; }
  function projPinned(P) {
    return { title: '各步骤参考 SQL', blocks: P.steps.filter(function (s) { return s.kind === 'sql'; }).map(function (s, i) { return { label: '第 ' + (i + 1) + ' 步 · ' + s.stage, sql: s.ref }; }), tip: '先看总量变化，再挑维度一个个拆，找到变化最大的那一块，最后用一个"驱动指标"验证原因。写结论时把排除掉的维度也写上。' };
  }
  V.p = function (p) {
    var o = projState(p.id), P = o.P, st = o.st;
    if (!P) { go('#/projects'); return { html: '' }; }
    if (!canOpen(P)) { go('#/vip'); return { html: '' }; }
    var stepNo = p.sub != null ? +p.sub : null;
    var firstOpen = 0; while (firstOpen < P.steps.length && st.done[firstOpen]) firstOpen++;
    var note = P.gen && P.gen.metric.note ? P.gen.metric.note : (P.db === 'waimai' ? '某外卖平台 · 2026 年 8–9 月 · 模拟数据' : P.db === 'shenglang' ? '声浪科技 · 和练习题同一个库' : '');
    if (stepNo == null) {
      var all = firstOpen >= P.steps.length, done = projDone(P.id);
      return {
        html: '<div class="page"><section class="section white" style="padding:44px 0 40px"><div class="wrap"><a href="#/projects" class="back">‹ 全部项目</a><div class="kicker gray">TASK ' + P.id + ' · ' + esc(P.company) + ' · ' + esc(P.role) + '</div>' +
          '<div class="head" style="margin:8px 0 0"><h1 style="max-width:760px">' + esc(P.title) + '</h1>' + (!all ? '<a class="btn primary lg" href="#/p/' + P.id + '/' + firstOpen + '">' + (firstOpen ? '继续第 ' + (firstOpen + 1) + ' 步' : '开始工作') + '</a>' : '') + '</div>' +
          '<p class="brief" style="max-width:760px;margin:18px 0 0">' + esc(P.brief) + '</p></div></section>' +
          '<section class="section"><div class="wrap"><div class="grid g-q"><div><h3 style="margin-bottom:14px">工作步骤</h3><div class="steps">' + P.steps.map(function (s, i) {
            var cls = st.done[i] ? 'done' : i === firstOpen ? 'cur' : i > firstOpen ? 'lock' : '';
            return '<a class="step ' + cls + '" href="#/p/' + P.id + '/' + i + '"><span class="sn">' + pad(i + 1) + '</span><span class="st">' + s.stage + '</span><span class="sq">' + esc(s.q) + '</span><span class="check">✓</span></a>';
          }).join('') + '</div>' + (all ? finishCard(P, st) : '') + '<div id="discbox"></div></div>' +
          '<div class="card" style="position:sticky;top:72px"><h3>项目数据库</h3>' + schemaHTML(P.db, note) + '</div></div></div></section></div>',
        bind: function (el) {
          bindFinish(P, st)(el);
          (function draw() { var box = $('#discbox', el); box.innerHTML = discussHTML('p:' + P.id, done, projPinned(P)); bindDiscuss(box, 'p:' + P.id, draw); })();
        }
      };
    }
    if (stepNo > firstOpen) { go('#/p/' + P.id + '/' + firstOpen); return { html: '' }; }
    var s = P.steps[stepNo];
    var back = '<a href="#/p/' + P.id + '" class="back">‹ TASK ' + P.id + ' · ' + esc(P.title) + '</a>';
    var top = '<div class="row" style="margin-bottom:14px"><span class="chip blue">第 ' + (stepNo + 1) + ' / ' + P.steps.length + ' 步 · ' + s.stage + '</span><span class="faint xs">' + esc(P.company) + '</span></div>';
    if (s.kind === 'sql') {
      return workbench({
        key: 'p' + P.id + '-' + stepNo, dbname: P.db, label: '项目数据库 · ' + P.company, title: s.q, idTag: pad(stepNo + 1), ref: s.ref, ordered: s.ordered, schemaNote: note,
        k: '先想清楚要按什么维度分组、需要哪几张表 JOIN', dims: ['business', 'groupby'], back: back, extraTop: top,
        next: '#/p/' + P.id, nextLabel: '回到工单', onSolved: function () { st.done[stepNo] = true; setTimeout(function () { toast('这一步完成了，回到工单看下一步'); }, 1200); }
      });
    }
    return {
      html: '<div class="page wrap narrow" style="padding-top:28px;padding-bottom:60px">' + back + '<div class="card">' + top +
        '<div class="qhead"><span class="qid">' + pad(stepNo + 1) + '</span><div class="qtitle">' + esc(s.q) + '</div></div>' +
        '<p class="note" style="margin-top:16px">写结论时用上前面几步查到的数字。导师会从"有没有用数据说话""有没有找到主要原因""建议能不能落地"三个角度打分。</p>' +
        '<textarea class="input" id="concl" style="min-height:200px;margin-top:8px" placeholder="例如：9 月的指标比 8 月下降了约 X%，主要来自……">' + esc(st.conclusion || '') + '</textarea>' +
        '<div class="row" style="margin-top:14px"><span class="faint xs" id="cn">0 字</span><span class="spacer"></span><button class="btn primary" id="sub">提交给导师</button></div><div id="out" style="margin-top:16px"></div></div></div>',
      bind: function (el) {
        var ta = $('#concl', el);
        function cnt() { $('#cn', el).textContent = ta.value.trim().length + ' 字'; }
        ta.addEventListener('input', function () { st.conclusion = ta.value; cnt(); save(); }); cnt();
        $('#sub', el).onclick = function () {
          var v = ta.value.trim(); if (v.length < 30) { toast('再多写几句，至少 30 字'); return; }
          this.disabled = true; $('#out', el).innerHTML = '<div class="msg ai typing">导师正在看你的结论<span class="dots"></span></div>';
          var ev = P.steps.filter(function (x) { return x.kind === 'sql'; }).map(function (x, i) { return '步骤' + (i + 1) + '：' + x.q + '\n' + preview(run(P.db, x.ref), 12); }).join('\n\n');
          ai({ mode: 'grade_conclusion', question: P.title + '：' + P.brief, studentText: v, evidence: ev })
            .then(function (txt) { return JSON.parse(txt.replace(/^[^{]*/, '').replace(/[^}]*$/, '')); })
            .catch(function () { var hasNum = /\d/.test(v), hasWhy = /(因为|原因|由于|导致)/.test(v), hasDo = /(建议|下一步|可以|应该)/.test(v); return { score: 40 + (hasNum ? 20 : 0) + (hasWhy ? 20 : 0) + (hasDo ? 20 : 0), good: hasNum ? '用了数据描述变化' : '结构完整', improve: !hasNum ? '加上具体数字（变化了多少、哪部分用户）' : !hasWhy ? '说明你认为的原因' : '建议可以更具体，比如先做什么验证', offline: true }; })
            .then(function (j) {
              var sc = Math.max(0, Math.min(100, parseInt(j.score, 10) || 0)), first = st.score == null;
              st.score = sc; st.good = j.good; st.improve = j.improve; st.done[stepNo] = true;
              if (first) { S.xp.business += sc; progress(); S.badges.proj = today(); }
              save(); go('#/p/' + P.id);
              toast('出师一步！项目完成 · 业务思维 +' + (first ? sc : 0) + (j.offline ? '（离线评分）' : ''));
            });
        };
      }
    };
  };
  function finishCard(P, st) {
    return '<div class="card" style="margin-top:20px"><div class="row" style="align-items:flex-end;gap:24px"><div><div class="tile-title">导师评分</div><div class="score">' + st.score + '</div></div><div style="flex:1;min-width:220px">' +
      '<p style="margin:0"><b>做得好：</b>' + esc(st.good || '') + '</p><p style="margin:6px 0 0"><b>可以补充：</b>' + esc(st.improve || '') + '</p></div></div>' +
      '<div class="row" style="margin-top:20px"><button class="btn sm" data-poster>生成项目海报</button><button class="btn sm ' + (isVip() ? 'primary' : '') + '" data-resume>项目复盘 + 简历描述' + (isVip() ? '' : '（VIP）') + '</button><a class="btn sm" href="#/p/' + P.id + '/' + (P.steps.length - 1) + '">修改结论</a></div><div id="resume" style="margin-top:14px">' + (st.resume ? resumeHTML(st.resume) : '') + '</div></div>';
  }
  function resumeHTML(t) { return '<div class="note" style="white-space:pre-wrap;background:#fff;box-shadow:inset 0 0 0 1px var(--line2)">' + esc(t) + '</div><p class="faint xs">写进简历时请保留"基于模拟数据"的说明，面试时如实介绍项目背景。</p>'; }
  function bindFinish(P, st) {
    return function (el) {
      var pb = $('[data-poster]', el), rb = $('[data-resume]', el);
      if (pb) pb.onclick = function () { posterModal(P, st); };
      if (rb) rb.onclick = function () {
        if (!isVip()) { go('#/vip'); return; }
        $('#resume', el).innerHTML = '<div class="msg ai typing">正在整理项目复盘<span class="dots"></span></div>';
        ai({ mode: 'resume', question: P.company + '：' + P.title + '（岗位：' + P.role + '）', studentText: st.conclusion || '' })
          .catch(function () { return '· 基于模拟数据，用 SQL（JOIN / GROUP BY / 条件聚合）完成「' + P.title + '」分析，按多个维度拆解指标变化\n· 定位主要变化来源并用驱动指标做归因验证，输出业务结论与下一步建议'; })
          .then(function (t) { st.resume = t; save(); $('#resume', el).innerHTML = resumeHTML(t); });
      };
    };
  }
  function posterModal(P, st) {
    modal('<div class="poster"><div class="xs" style="color:#a1a1a6;position:relative;z-index:1">出师吧 · ' + (P ? '项目海报' : '能力卡片') + '</div><h2 style="margin:10px 0 6px">' + esc(P ? P.title : '我的 SQL 能力卡片') + '</h2>' +
      '<p class="muted small" style="margin:0 0 22px">' + esc(S.user.nickname) + (S.user.school ? ' · ' + esc(S.user.school) : '') + (P ? ' · ' + esc(P.role) + '（模拟）' : '') + '</p>' +
      '<div class="row" style="gap:34px;position:relative;z-index:1"><div class="stat"><b>' + (P ? st.score : solvedCount()) + '</b><span style="color:#a1a1a6">' + (P ? '导师评分' : '答对题数') + '</span></div><div class="stat"><b>' + streakNow() + '</b><span style="color:#a1a1a6">连续打卡</span></div><div class="stat"><b>' + (S.xp.business || 0) + '</b><span style="color:#a1a1a6">业务思维 xp</span></div></div>' +
      '<p class="xs" style="color:#6e6e73;margin:24px 0 0;position:relative;z-index:1">出师吧 · 实习之前，先来练一遍</p></div>' +
      '<div class="row" style="margin-top:16px"><span class="muted small">截图后分享到小红书、朋友圈或校园墙</span><span class="spacer"></span><button class="btn sm" data-close>关闭</button></div>');
  }

  /* ---------- 我的 ---------- */
  V.me = function () {
    var vip = isVip(), mk = S.mistakes;
    var badges = [['first', '第一题'], ['lv4', '会分组了'], ['proj', '首个项目'], ['streak3', '三天不断'], ['streak7', '一周全勤']];
    return {
      html: '<div class="page"><section class="hero wrap" style="padding-bottom:30px"><div class="avatar-sm" style="width:72px;height:72px;font-size:30px;margin:0 auto 14px">' + esc(S.user.nickname.slice(0, 1)) + '</div><h1 style="font-size:40px">' + esc(S.user.nickname) + '</h1><p class="sub" style="font-size:19px">' + esc(S.user.school || '未填写学校') + (vip ? ' · VIP 至 ' + S.vip.until : ' · 免费版') + '</p><div class="ctas"><button class="btn" id="card">生成能力卡片</button></div></section>' +
        '<div class="wrap" style="padding-bottom:60px"><div class="grid g2"><div class="card"><h3>SQL 能力画像</h3><div style="display:grid;place-items:center;margin-top:10px">' + radarSVG(320) + '</div></div><div class="card"><h3 style="margin-bottom:18px">经验值详情</h3>' + xpBars() + '<p class="note" style="margin-top:18px">答对一题 +10，用了 1 次提示 +7，2 次及以上 +4。实习项目按导师评分计入"业务思维"。</p></div></div>' +
        '<div class="card" style="margin-top:20px"><div class="row"><h3>AI 错题本</h3><span class="chip vip">VIP</span><span class="spacer"></span><span class="faint small">' + mk.length + ' 道</span></div>' +
        (vip ? (mk.length ? '<div class="list" style="margin-top:10px">' + mk.slice(0, 30).map(function (m, i) {
          return '<div class="li"><div style="flex:1;min-width:0"><div style="font-weight:500">' + esc(m.title) + '</div><div class="faint xs">' + esc(m.why) + ' · ' + m.at + '</div></div><a class="btn sm" href="' + esc(m.route) + '">重做</a><button class="btn sm primary" data-var="' + i + '">AI 变式题</button></div>';
        }).join('') + '</div>' : '<p class="muted">还没有错题。做错的题会自动收进来。</p>')
          : '<div class="lockbox" style="margin-top:16px"><h3>' + (mk.length ? '已经为你记下 ' + mk.length + ' 道错题' : '做错的题会自动收进错题本') + '</h3><p class="muted small">开通 VIP 后可以查看错因，并让 AI 按你的错题现出变式题巩固。</p><a class="btn primary" href="#/vip">9.9 元 / 月 开通</a></div>') + '</div>' +
        '<div class="grid g2" style="margin-top:20px"><div class="card"><h3 style="margin-bottom:14px">成就与奖励</h3><div class="row" style="gap:8px">' + badges.map(function (b) { return '<span class="chip ' + (S.badges[b[0]] ? 'dark' : '') + '">' + b[1] + '</span>'; }).join('') + '</div>' +
        '<div style="margin-top:16px">' + (S.rewards.length ? S.rewards.map(function (r) { return '<div class="li"><b>' + esc(r.name) + '</b><span class="faint small">' + r.month + '</span><span class="spacer"></span><span class="chip">' + r.status + '</span></div>'; }).join('') : '<p class="muted small" style="margin:0">咖啡券：VIP 当月完成 ' + REBATE_DAYS + ' 天每日任务后发放。</p>') + '</div></div>' +
        '<form class="card" id="set"><h3 style="margin-bottom:14px">设置</h3><div class="grid g2" style="gap:12px"><div class="field"><label>昵称</label><input class="input" id="s-nk" value="' + esc(S.user.nickname) + '"></div><div class="field"><label>学校</label><input class="input" id="s-sc" value="' + esc(S.user.school) + '"></div></div>' +
        '<label class="row small"><input type="checkbox" id="s-rk" ' + (S.settings.ranking ? 'checked' : '') + '> 参与校园排名（只显示昵称）</label><label class="row small" style="margin-top:8px"><input type="checkbox" id="s-nt" ' + (S.settings.notify ? 'checked' : '') + '> 宠物饿了时提醒我（每天最多一次）</label>' +
        '<div class="row" style="margin-top:18px"><button class="btn primary sm">保存</button><span class="spacer"></span><button class="btn sm" type="button" id="out">退出登录</button></div><p class="faint xs" style="margin:12px 0 0">登录邮箱：' + esc(S.user.email) + '</p></form></div></div></div>',
      bind: function (el) {
        $('#card', el).onclick = function () { posterModal(null); };
        $('#set', el).addEventListener('submit', function (e) { e.preventDefault(); S.user.nickname = $('#s-nk', el).value.trim() || S.user.nickname; S.user.school = $('#s-sc', el).value.trim(); S.settings.ranking = $('#s-rk', el).checked; S.settings.notify = $('#s-nt', el).checked; save(); chrome('me'); toast('已保存'); });
        $('#out', el).onclick = function () { lsSet(CUR_KEY, ''); S = null; go('#/login'); };
        $$('[data-var]', el).forEach(function (b) {
          b.onclick = function () {
            var m = S.mistakes[+b.dataset.var]; b.disabled = true; b.textContent = '出题中…';
            ai({ mode: 'variant', question: m.title, schema: schemaText(m.db), referenceSql: m.ref, studentText: m.why })
              .then(function (txt) {
                var j = JSON.parse(txt.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
                if (!run(m.db, j.ref).rows.length) throw new Error('empty');
                var id = hash(j.title + Date.now()).slice(0, 6), src = D.QUESTIONS.filter(function (q) { return q.id === m.key; })[0];
                S.variants[id] = { title: j.title, ref: j.ref, db: m.db, dims: src ? dimsOf(src) : ['business'], k: src && src.k };
                save(); go('#/v/' + id);
              }).catch(function () { b.disabled = false; b.textContent = 'AI 变式题'; toast(aiState.down ? 'AI 导师离线，暂时出不了题' : '这次没出好，再点一次试试'); });
          };
        });
      }
    };
  };

  /* ---------- 社区 ---------- */
  V.community = function (p) {
    var link = location.origin + location.pathname + '#/login?invite=' + myCode(), f = p.f || '全部';
    var list = postsOf(null).filter(function (g) { return f === '全部' || (f === '练习题' ? g.p.thread[0] === 'q' : g.p.thread[0] === 'p'); });
    return {
      html: '<div class="page"><section class="hero wrap" style="padding-bottom:30px"><div class="kicker">社区</div><h1>一起练，更快上手。</h1><p class="sub">每道题和每个项目下面都有讨论区。题解置顶，做完才能看。</p></section>' +
        '<div class="wrap" style="padding-bottom:60px"><div class="grid g-q"><div class="card"><div class="row" style="margin-bottom:6px"><h3>最新讨论</h3><span class="spacer"></span><div class="filters" style="margin:0">' + ['全部', '练习题', '实习项目'].map(function (t) { return '<button data-f="' + t + '" class="' + (t === f ? 'on' : '') + '">' + t + '</button>'; }).join('') + '</div></div>' +
        '<p class="faint xs" style="margin:0 0 4px">内测期间部分讨论为团队整理的示例内容，已标注"示例"。</p>' +
        '<div class="posts">' + list.map(function (g) { return postHTML(g, true); }).join('') + '</div></div>' +
        '<div class="grid" style="gap:20px;position:sticky;top:72px"><div class="card"><div class="row"><h3>邀请同学</h3><span class="chip vip">VIP 3 天</span></div><p class="muted small" style="margin:8px 0 14px">被邀请的同学注册后免费体验 VIP 3 天。</p><div class="row" style="flex-wrap:nowrap"><input class="input mono" id="lnk" readonly value="' + esc(link) + '" style="font-size:12px;padding:9px 12px"><button class="btn primary sm" id="cp">复制</button></div></div>' +
        '<div class="card"><div class="row"><h3>校园排名</h3><span class="chip free">免费</span></div>' + (S.settings.ranking ? '<p class="muted small">你已开启排名' + (S.user.school ? '（' + esc(S.user.school) + '）' : '') + '。榜单需要汇总所有同学的数据，正式上线后在这里显示。</p>' : '<p class="muted small">默认关闭，开启后只显示昵称。</p><button class="btn sm" id="rk">开启排名</button>') + '</div>' +
        '<div class="card"><h3>分享能力卡片</h3><p class="muted small" style="margin:8px 0 14px">截图发小红书、朋友圈或校园墙。</p><button class="btn sm" id="sh">生成卡片</button></div></div></div></div></div>',
      bind: function (el) {
        $$('.filters [data-f]', el).forEach(function (b) { b.onclick = function () { go('#/community?f=' + encodeURIComponent(b.dataset.f)); }; });
        $$('[data-like]', el).forEach(function (b) { b.onclick = function () { var k = b.dataset.like; if (S.likes[k]) delete S.likes[k]; else S.likes[k] = 1; save(); render(); }; });
        $('#cp', el).onclick = function () { var i = $('#lnk', el); i.select(); try { navigator.clipboard.writeText(i.value).then(function () { toast('邀请链接已复制'); }, function () { document.execCommand('copy'); toast('邀请链接已复制'); }); } catch (e) { document.execCommand('copy'); toast('邀请链接已复制'); } };
        var rk = $('#rk', el); if (rk) rk.onclick = function () { S.settings.ranking = true; save(); render(); };
        $('#sh', el).onclick = function () { posterModal(null); };
      }
    };
  };

  /* ---------- 会员 ---------- */
  V.vip = function () {
    var vip = isVip();
    var rows = [['第 0–8 关全部 ' + D.QUESTIONS.length + ' 道练习题', '✓', '✓'], ['AI 导师三级提示 + 业务追问', '✓', '✓'], ['讨论区 + 官方题解（做完解锁）', '✓', '✓'], ['实习项目', '2 个', '全部 100 个'], ['定制数据：生成专属实习项目', '—', '✓'],
      ['AI 错题本 + 按错题出变式题', '—', '✓'], ['项目复盘 + 简历描述', '—', '✓'], ['高峰期 AI 导师', '排队', '优先'], ['咖啡返利', '—', '当月完成 ' + REBATE_DAYS + ' 天任务返 9.9 元']];
    return {
      html: '<div class="page"><section class="hero wrap"><div class="kicker" style="color:var(--gold)">VIP 会员</div><h1>练满一个月，<br>等于白练。</h1><p class="sub">9.9 元 / 月。当月完成 ' + REBATE_DAYS + ' 天每日任务，返你一张 9.9 元咖啡券。</p>' +
        '<div class="ctas">' + (vip ? '<span class="chip vip" style="font-size:15px;padding:8px 18px">已开通 · 有效期至 ' + S.vip.until + (S.vip.source ? '（' + S.vip.source + '）' : '') + '</span>' : '<button class="btn primary lg" id="buy">开通 VIP（演示）</button>') + '</div><p class="faint xs" style="margin-top:12px">演示版未接入支付，点击直接开通 30 天</p></section>' +
        '<div class="wrap narrow" style="padding-bottom:60px"><table class="cmp"><thead><tr><th>权益</th><th>免费</th><th class="v">VIP</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="' + (r[1] === '—' ? 'n' : 'y') + '">' + r[1] + '</td><td class="y">' + r[2] + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<div class="card" style="margin-top:20px"><h3>返利规则</h3><ol class="muted" style="margin:12px 0 0;padding-left:20px;line-height:1.9"><li>每天完成 ' + DAILY_TARGET + ' 道题或项目步骤，算完成当天任务。</li><li>VIP 有效期内，一个自然月累计完成 ' + REBATE_DAYS + ' 天，发放一张 9.9 元咖啡券。</li><li>重复提交已通过的题不计入；每月最多返一次。</li></ol>' +
        (vip ? '<p style="margin:14px 0 0">本月进度：<b>' + S.rebate.days + ' / ' + REBATE_DAYS + '</b> 天</p>' : '') + '</div></div></div>',
      bind: function (el) { var b = $('#buy', el); if (b) b.onclick = function () { S.vip = { until: addDaysStr(today(), 29), source: '付费（演示）' }; save(); chrome('vip'); render(); toast('VIP 已开通'); }; }
    };
  };

  /* ================= 路由 ================= */
  var currentRoute = '';
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), qs = {};
    var qi = h.indexOf('?'); if (qi >= 0) { h.slice(qi + 1).split('&').forEach(function (kv) { var a = kv.split('='); qs[a[0]] = decodeURIComponent(a[1] || ''); }); h = h.slice(0, qi); }
    var parts = h.split('/').filter(Boolean);
    qs.route = parts[0] || 'home'; qs.id = parts[1]; qs.sub = parts[2];
    return qs;
  }
  function render() {
    var p = parse(), r = p.route;
    if (!V[r]) r = 'home';
    if (!S && r !== 'login') r = 'login';
    else if (S && r === 'login' && !p.invite) r = 'home';
    else if (S && !S.schoolDone && r !== 'school' && r !== 'login') r = 'school';
    else if (S && S.schoolDone && !S.tested && r !== 'test' && r !== 'login') r = 'test';
    if (S) rollover();
    currentRoute = r;
    chrome(r);
    var view = V[r](p) || { html: '' };
    var app = $('#app'), box = document.createElement('div');
    box.innerHTML = view.html;
    app.replaceChildren(box);
    if (view.bind) view.bind(box);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  initSqlJs({ locateFile: function (f) { return 'assets/' + f; } }).then(function (SQL) { window.SQLLIB = SQL; render(); })
    .catch(function (e) { $('#app').innerHTML = '<div class="wrap" style="padding:60px 22px"><div class="card"><h2>数据库加载失败</h2><p class="muted">' + esc(e.message) + '</p><p>请换用最新版 Chrome / Edge / Safari，或刷新重试。</p></div></div>'; });
})();
