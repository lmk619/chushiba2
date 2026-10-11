/* 数据层：生成练习数据库 + 题库 + 实习项目。所有数据均为虚构，用固定随机种子生成，每个人看到的数据一样。 */
(function (global) {
  'use strict';

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickW(r, items) { // items: [[value, weight], ...]
    var s = 0, i; for (i = 0; i < items.length; i++) s += items[i][1];
    var x = r() * s;
    for (i = 0; i < items.length; i++) { x -= items[i][1]; if (x <= 0) return items[i][0]; }
    return items[items.length - 1][0];
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function int(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  var DAY = 86400000;
  function d2s(t) { return new Date(t).toISOString().slice(0, 10); }
  function s2d(s) { return Date.parse(s + 'T00:00:00Z'); }
  function addDays(s, n) { return d2s(s2d(s) + n * DAY); }
  function daysBetween(a, b) { return Math.round((s2d(b) - s2d(a)) / DAY); }

  function insertAll(db, table, cols, rows) {
    var st = db.prepare('INSERT INTO ' + table + ' (' + cols.join(',') + ') VALUES (' + cols.map(function () { return '?'; }).join(',') + ')');
    db.exec('BEGIN');
    rows.forEach(function (row) { st.run(row); });
    db.exec('COMMIT');
    st.free();
  }

  /* ---------- 声浪科技（练习题 + 项目 002） ---------- */
  function buildShenglang(SQL) {
    var r = rng(20261006);
    var db = new SQL.Database();
    db.exec([
      'CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT, country TEXT, city TEXT, signup_date TEXT, channel TEXT, gender TEXT, age INTEGER);',
      'CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name TEXT, category TEXT, price INTEGER, launch_date TEXT);',
      'CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, status TEXT, payment_method TEXT);',
      'CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price INTEGER);',
      'CREATE TABLE user_logins (customer_id INTEGER, login_date TEXT);',
      'CREATE TABLE events (customer_id INTEGER, event_date TEXT, event_type TEXT);'
    ].join('\n'));

    var products = [
      [1, '声浪 Air 无线耳机', '耳机', 299, '2024-03-01'],
      [2, '声浪 Air Pro 降噪耳机', '耳机', 599, '2024-09-01'],
      [3, '声浪 Sport 运动耳机', '耳机', 199, '2024-05-15'],
      [4, '声浪 Mini 耳机', '耳机', 129, '2025-01-10'],
      [5, '声浪 Studio 头戴耳机', '耳机', 899, '2025-04-01'],
      [6, '声浪 Kids 儿童耳机', '耳机', 159, '2025-06-01'],
      [7, '快充头 65W', '充电', 149, '2024-02-01'],
      [8, '快充头 30W', '充电', 89, '2024-02-01'],
      [9, '磁吸充电宝 10000mAh', '充电', 219, '2024-08-01'],
      [10, '编织数据线 2 米', '充电', 39, '2024-01-15'],
      [11, '三合一无线充电座', '充电', 269, '2025-03-01'],
      [12, '声浪 Go 运动相机', '相机', 1299, '2024-10-01'],
      [13, '声浪 Go Lite 相机', '相机', 799, '2025-02-01'],
      [14, '口袋云台相机', '相机', 1099, '2025-05-01'],
      [15, '相机防水壳', '相机', 109, '2024-10-01']
    ];
    insertAll(db, 'products', ['product_id', 'product_name', 'category', 'price', 'launch_date'], products);

    var first = ['Alice', 'Ben', 'Chloe', 'David', 'Emma', 'Felix', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Ruby', 'Sam', 'Tina', 'Umar', 'Vera', 'Will', 'Xena', 'Yuki', 'Zoe', 'Hana', 'Kenji', 'Lena', 'Max'];
    var cities = {
      US: ['New York', 'Los Angeles', 'Chicago', 'Seattle', 'Austin'],
      UK: ['London', 'Manchester', 'Bristol'],
      DE: ['Berlin', 'Munich', 'Hamburg'],
      JP: ['Tokyo', 'Osaka'],
      FR: ['Paris', 'Lyon'],
      CA: ['Toronto', 'Vancouver']
    };
    var customers = [];
    var start = s2d('2025-01-01'), span = daysBetween('2025-01-01', '2026-08-31');
    for (var id = 1; id <= 320; id++) {
      var country = pickW(r, [['US', 36], ['UK', 15], ['DE', 14], ['JP', 12], ['FR', 10], ['CA', 13]]);
      var city = r() < 0.06 ? null : pick(r, cities[country]);
      var signup = d2s(start + Math.floor(r() * (span + 1)) * DAY);
      var channel = pickW(r, [['TikTok', 30], ['Google', 22], ['Instagram', 18], ['Amazon', 18], ['自然流量', 12]]);
      customers.push([id, pick(r, first) + ' ' + String.fromCharCode(65 + int(r, 0, 25)) + '.', country, city, signup, channel, r() < 0.5 ? 'F' : 'M', int(r, 18, 50)]);
    }
    insertAll(db, 'customers', ['customer_id', 'name', 'country', 'city', 'signup_date', 'channel', 'gender', 'age'], customers);

    var prodW = products.map(function (p) {
      var w = p[2] === '耳机' ? 10 : p[2] === '充电' ? 6 : 3;
      if (p[0] === 1 || p[0] === 3) w += 6;
      return [p, w];
    });
    var orders = [], items = [], oid = 1000;
    var months = [];
    for (var y = 2025; y <= 2026; y++) for (var m = 1; m <= 12; m++) { if (y === 2026 && m > 9) break; months.push([y, m]); }
    customers.forEach(function (c) {
      if (r() < 0.14) return; // 一部分用户注册后从不下单
      var activity = 0.18 + r() * 0.3;
      var usTik = c[2] === 'US' && c[5] === 'TikTok';
      months.forEach(function (ym) {
        var mStart = ym[0] + '-' + String(ym[1]).padStart(2, '0') + '-01';
        var mDays = new Date(Date.UTC(ym[0], ym[1], 0)).getUTCDate();
        var p = activity;
        // 埋点：美国 TikTok 渠道原本是耳机主力；2026 年 7 月起该渠道用户购买大幅减少（投放停了，内容热度下降）
        if (usTik) p = (ym[0] === 2026 && ym[1] >= 7) ? p * 0.2 : Math.min(0.95, p * 1.6);
        if (r() > p) return;
        var day = int(r, 0, mDays - 1);
        var od = addDays(mStart, day);
        if (od < c[4]) return;
        oid++;
        var status = r() < 0.1 ? '已退款' : '已完成';
        var pay = r() < 0.05 ? null : pickW(r, [['信用卡', 50], ['PayPal', 30], ['Apple Pay', 20]]);
        orders.push([oid, c[0], od, status, pay]);
        var n = pickW(r, [[1, 70], [2, 24], [3, 6]]), used = {};
        for (var k = 0; k < n; k++) {
          var prod = pickW(r, prodW);
          if (used[prod[0]]) continue; used[prod[0]] = 1;
          items.push([oid, prod[0], pickW(r, [[1, 80], [2, 17], [3, 3]]), prod[3]]);
        }
      });
    });
    insertAll(db, 'orders', ['order_id', 'customer_id', 'order_date', 'status', 'payment_method'], orders);
    insertAll(db, 'order_items', ['order_id', 'product_id', 'quantity', 'unit_price'], items);

    var logins = [], events = [];
    customers.forEach(function (c) {
      if (c[4] > '2026-08-31') return;
      var loginUser = r() < 0.45, prev = false;
      for (var d = 0; d < 30; d++) {
        var day = addDays('2026-09-01', d);
        if (loginUser) {
          var on = r() < (prev ? 0.62 : 0.22);
          if (on) logins.push([c[0], day]);
          prev = on;
        }
      }
      var sessions = int(r, 0, 4);
      for (var s = 0; s < sessions; s++) {
        var ed = addDays('2026-09-01', int(r, 0, 29));
        events.push([c[0], ed, '浏览']);
        if (r() < 0.42) { events.push([c[0], ed, '加购']);
          if (r() < 0.55) { events.push([c[0], ed, '下单']);
            if (r() < 0.86) events.push([c[0], ed, '支付']); } }
      }
    });
    insertAll(db, 'user_logins', ['customer_id', 'login_date'], logins);
    insertAll(db, 'events', ['customer_id', 'event_date', 'event_type'], events);
    return db;
  }

  /* ---------- 某外卖平台（项目 001） ---------- */
  function buildWaimai(SQL) {
    var r = rng(1001);
    var db = new SQL.Database();
    db.exec([
      'CREATE TABLE users (user_id INTEGER PRIMARY KEY, city TEXT, district TEXT, user_type TEXT, signup_date TEXT);',
      'CREATE TABLE restaurants (restaurant_id INTEGER PRIMARY KEY, restaurant_name TEXT, city TEXT, district TEXT, category TEXT);',
      'CREATE TABLE orders (order_id INTEGER PRIMARY KEY, user_id INTEGER, restaurant_id INTEGER, order_date TEXT, amount REAL);',
      'CREATE TABLE payments (order_id INTEGER, coupon_amount REAL, pay_amount REAL);',
      'CREATE TABLE delivery (order_id INTEGER, delivery_minutes INTEGER);'
    ].join('\n'));
    var bjD = ['海淀', '朝阳', '东城', '西城', '丰台'], shD = ['浦东', '徐汇', '静安'];
    var users = [];
    for (var u = 1; u <= 420; u++) {
      var city = r() < 0.78 ? '北京' : '上海';
      var district = city === '北京' ? pickW(r, [['海淀', 34], ['朝阳', 28], ['东城', 12], ['西城', 12], ['丰台', 14]]) : pick(r, shD);
      var type = pickW(r, [['学生', 32], ['白领', 48], ['其他', 20]]);
      if (city === '北京' && district === '海淀' && r() < 0.35) type = '学生';
      users.push([u, city, district, type, addDays('2025-01-01', int(r, 0, 540))]);
    }
    insertAll(db, 'users', ['user_id', 'city', 'district', 'user_type', 'signup_date'], users);

    var names = ['张记麻辣烫', '老李黄焖鸡', '小周轻食', '一品饺子馆', '晨光便当', '阿香米线', '川味小炒', '鲜榨果茶铺', '炸鸡研究所', '粥铺小厨', '牛肉面工坊', '寿司小站'];
    var cats = { '张记麻辣烫': '快餐', '老李黄焖鸡': '快餐', '小周轻食': '轻食', '一品饺子馆': '快餐', '晨光便当': '便当', '阿香米线': '快餐', '川味小炒': '中餐', '鲜榨果茶铺': '奶茶', '炸鸡研究所': '快餐', '粥铺小厨': '中餐', '牛肉面工坊': '快餐', '寿司小站': '日料' };
    var rests = [], rid = 0;
    bjD.concat(shD).forEach(function (d) {
      var n = d === '海淀' ? 8 : d === '朝阳' ? 7 : 4;
      for (var i = 0; i < n; i++) {
        var nm = names[(rid * 7 + i) % names.length];
        rid++;
        rests.push([rid, nm + '（' + d + '店）', bjD.indexOf(d) >= 0 ? '北京' : '上海', d, cats[nm]]);
      }
    });
    insertAll(db, 'restaurants', ['restaurant_id', 'restaurant_name', 'city', 'district', 'category'], rests);

    var orders = [], pays = [], dels = [], oid = 50000;
    users.forEach(function (us) {
      var base = us[3] === '学生' ? 0.2 : us[3] === '白领' ? 0.15 : 0.08;
      var local = rests.filter(function (x) { return x[3] === us[2]; });
      if (!local.length) local = rests.filter(function (x) { return x[2] === us[1]; });
      for (var d = 0; d < 61; d++) {
        var day = addDays('2026-08-01', d);
        var sep = day >= '2026-09-01';
        var p = base;
        // 埋点：9 月起北京学生新客补贴退坡，学生下单明显减少
        if (sep && us[1] === '北京' && us[3] === '学生') p *= 0.45;
        if (r() > p) continue;
        var rs = us[3] === '学生' && r() < 0.6 ? (local.filter(function (x) { return x[4] === '快餐' || x[4] === '奶茶'; })[0] || pick(r, local)) : pick(r, local);
        if (r() < 0.5) rs = pick(r, local);
        oid++;
        var amount = Math.round((18 + r() * 42) * 10) / 10;
        var coupon = us[3] === '学生' && us[1] === '北京' ? (sep ? 1 + r() * 2 : 6 + r() * 4) : 2 + r() * 2;
        coupon = Math.round(coupon * 10) / 10;
        orders.push([oid, us[0], rs[0], day, amount]);
        pays.push([oid, coupon, Math.round((amount - coupon) * 10) / 10]);
        dels.push([oid, int(r, 24, 42)]);
      }
    });
    insertAll(db, 'orders', ['order_id', 'user_id', 'restaurant_id', 'order_date', 'amount'], orders);
    insertAll(db, 'payments', ['order_id', 'coupon_amount', 'pay_amount'], pays);
    insertAll(db, 'delivery', ['order_id', 'delivery_minutes'], dels);
    return db;
  }

  /* ---------- 题库：第 0–8 关（全部免费） ---------- */
  var SALES = "（销售额 = 数量 × 单价，只算 status = '已完成' 的订单）";
  var LEVELS = [
    { no: 0, name: '认识数据库', dim: null, intro: '表、行、列、主键。先熟悉"声浪科技"的数据长什么样。' },
    { no: 1, name: '查询基础', dim: 'select', intro: 'SELECT、别名、DISTINCT、ORDER BY、LIMIT、计算字段。' },
    { no: 2, name: '条件筛选', dim: 'where', intro: 'WHERE、AND / OR、IN、BETWEEN、LIKE、NULL。' },
    { no: 3, name: '函数与 CASE WHEN', dim: 'where', intro: '日期函数、字符串拼接、ROUND、COALESCE、CASE WHEN。' },
    { no: 4, name: '聚合与分组', dim: 'groupby', intro: 'COUNT / SUM / AVG、GROUP BY、HAVING、条件聚合。' },
    { no: 5, name: '多表连接', dim: 'join', intro: 'INNER JOIN、LEFT JOIN、三表连接。' },
    { no: 6, name: '子查询', dim: 'subquery', intro: '标量子查询、IN / NOT IN、EXISTS、派生表。' },
    { no: 7, name: 'CTE 与窗口函数', dim: 'window', intro: 'WITH、ROW_NUMBER / RANK、累计、移动平均、LAG。' },
    { no: 8, name: '项目专题', dim: 'business', intro: '8 个业务项目、16 道题。每个项目两步：先做基础版，再在它的基础上做进阶版。' },
    { no: 9, name: '实习项目', dim: 'business', intro: '100 个完整的模拟实习项目：描述 → 拆解 → 归因 → 结论。' }
  ];

  var COMPLETED_AMT = "SELECT o.order_id, SUM(oi.quantity * oi.unit_price) AS amount FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY o.order_id";
  var MONTHLY_2026 = "SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS sales FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' AND o.order_date >= '2026-01-01' GROUP BY month";
  var CUST_TOTAL = "SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY o.customer_id";

  var Q = [
    // 第 0 关
    { id: '0-1', lv: 0, title: '先看看 customers 表长什么样：查出前 5 行全部列', k: 'SELECT * 表示所有列，LIMIT 5 只取前 5 行', ordered: true, ref: 'SELECT * FROM customers LIMIT 5' },
    { id: '0-2', lv: 0, title: 'orders 表里，order_id 能唯一确定一笔订单（主键）。查出前 5 行的 order_id 和 order_date', k: '只选需要的列，用逗号隔开', ordered: true, ref: 'SELECT order_id, order_date FROM orders LIMIT 5' },
    { id: '0-3', lv: 0, title: 'orders 通过 customer_id 和 customers 关联。查出 orders 前 5 行的 order_id 和 customer_id', k: 'customer_id 在 orders 里是"外键"，指向 customers 的主键', ordered: true, ref: 'SELECT order_id, customer_id FROM orders LIMIT 5' },
    { id: '0-4', lv: 0, title: 'user_logins 记录了用户每天的登录。看看它的前 5 行全部列', k: '每一行 = 某个用户在某一天登录过一次', ordered: true, ref: 'SELECT * FROM user_logins LIMIT 5' },
    // 第 1 关
    { id: '1-1', lv: 1, title: '列出所有商品的名称和价格', k: 'SELECT 指定列', ref: 'SELECT product_name, price FROM products' },
    { id: '1-2', lv: 1, title: '我们的用户来自哪些国家？（不要重复）', k: 'DISTINCT 去重', ref: 'SELECT DISTINCT country FROM customers' },
    { id: '1-3', lv: 1, title: '价格最高的 3 个商品是什么？显示名称和价格，从高到低', k: 'ORDER BY ... DESC 再 LIMIT', ordered: true, ref: 'SELECT product_name, price FROM products ORDER BY price DESC LIMIT 3' },
    { id: '1-4', lv: 1, title: '计算每条订单明细的金额：显示 order_id、product_id 和 金额（单价 × 数量）', k: 'SELECT 里可以直接做计算，并用 AS 起别名', ref: 'SELECT order_id, product_id, quantity * unit_price AS amount FROM order_items' },
    { id: '1-5', lv: 1, title: '商品打 8 折后各是多少钱？显示名称和折后价（保留两位小数）', k: 'ROUND(数值, 2)', ref: 'SELECT product_name, ROUND(price * 0.8, 2) AS sale_price FROM products' },
    { id: '1-6', lv: 1, title: '找出最早注册的 5 位用户：显示 customer_id、name、signup_date，按注册时间从早到晚', k: 'ORDER BY 默认升序', ordered: true, ref: 'SELECT customer_id, name, signup_date FROM customers ORDER BY signup_date, customer_id LIMIT 5' },
    { id: '1-7', lv: 1, title: '把所有商品按价格从低到高排列：显示名称、品类、价格', k: 'ORDER BY price（ASC 可以省略）', ordered: true, ref: 'SELECT product_name, category, price FROM products ORDER BY price' },
    { id: '1-8', lv: 1, title: '最新上市的 3 个商品是哪些？显示名称和上市日期（launch_date），从新到旧', k: '日期按 YYYY-MM-DD 存储，可以直接排序', ordered: true, ref: 'SELECT product_name, launch_date FROM products ORDER BY launch_date DESC LIMIT 3' },
    // 第 2 关
    { id: '2-1', lv: 2, title: "找出来自美国（country = 'US'）的用户：显示 customer_id 和 name", k: '文本要加单引号', ref: "SELECT customer_id, name FROM customers WHERE country = 'US'" },
    { id: '2-2', lv: 2, title: '价格超过 200 元的商品有哪些？显示名称和价格', k: '比较运算 >', ref: 'SELECT product_name, price FROM products WHERE price > 200' },
    { id: '2-3', lv: 2, title: "找出来自美国或英国（'US' / 'UK'）、并且通过 TikTok 渠道注册的用户：显示 customer_id、name、country", k: 'AND 比 OR 先算，混用时要加括号', ref: "SELECT customer_id, name, country FROM customers WHERE (country = 'US' OR country = 'UK') AND channel = 'TikTok'" },
    { id: '2-4', lv: 2, title: '2026 年 3 月的订单有哪些？显示 order_id 和 order_date', k: "BETWEEN '2026-03-01' AND '2026-03-31'（两端都包含）", ref: "SELECT order_id, order_date FROM orders WHERE order_date BETWEEN '2026-03-01' AND '2026-03-31'" },
    { id: '2-5', lv: 2, title: '名称里带"耳机"的商品有哪些？显示名称', k: "LIKE '%耳机%'，% 代表任意字符", ref: "SELECT product_name FROM products WHERE product_name LIKE '%耳机%'" },
    { id: '2-6', lv: 2, title: '哪些用户没有填写城市？显示 customer_id 和 name', k: '判断空值要用 IS NULL，不能用 = NULL', ref: 'SELECT customer_id, name FROM customers WHERE city IS NULL' },
    { id: '2-7', lv: 2, title: "找出除了'已退款'以外的所有订单：显示 order_id 和 status", k: '不等于用 <> 或 !=', ref: "SELECT order_id, status FROM orders WHERE status <> '已退款'" },
    { id: '2-8', lv: 2, title: "找出 18 到 24 岁（含）的女性用户（gender = 'F'）：显示 customer_id 和 age", k: 'BETWEEN 18 AND 24 再 AND 性别条件', ref: "SELECT customer_id, age FROM customers WHERE age BETWEEN 18 AND 24 AND gender = 'F'" },
    // 第 3 关
    { id: '3-1', lv: 3, title: "提取每笔订单的下单月份：显示 order_id 和 月份（格式如 2026-03）", k: "SQLite 用 strftime('%Y-%m', 日期)", ref: "SELECT order_id, strftime('%Y-%m', order_date) AS month FROM orders" },
    { id: '3-2', lv: 3, title: '按价格给商品分档：低于 150 为"低价"，150–600 为"中价"，高于 600 为"高价"。显示名称和档位', k: 'CASE WHEN ... THEN ... WHEN ... ELSE ... END', ref: "SELECT product_name, CASE WHEN price < 150 THEN '低价' WHEN price <= 600 THEN '中价' ELSE '高价' END AS tier FROM products" },
    { id: '3-3', lv: 3, title: '按年龄把用户分成 "18–24"、"25–34"、"35 岁以上"：显示 customer_id 和年龄段', k: 'CASE WHEN 从小到大依次判断', ref: "SELECT customer_id, CASE WHEN age <= 24 THEN '18–24' WHEN age <= 34 THEN '25–34' ELSE '35 岁以上' END AS age_group FROM customers" },
    { id: '3-4', lv: 3, title: '把支付方式为空的显示为"未知"：显示 order_id 和支付方式', k: 'COALESCE(列, 默认值)', ref: "SELECT order_id, COALESCE(payment_method, '未知') AS payment_method FROM orders" },
    { id: '3-5', lv: 3, title: '把用户姓名和国家拼成 "Alice A.（US）" 的样子：显示 customer_id 和拼好的文字（括号用中文括号）', k: 'SQLite 用 || 拼接字符串', ref: "SELECT customer_id, name || '（' || country || '）' AS label FROM customers" },
    { id: '3-6', lv: 3, title: "以 2026-10-01 为准，每位用户注册了多少天？显示 customer_id 和天数（整数）", k: "julianday('2026-10-01') - julianday(signup_date)", ref: "SELECT customer_id, CAST(julianday('2026-10-01') - julianday(signup_date) AS INTEGER) AS days FROM customers" },
    { id: '3-7', lv: 3, title: '标记每笔订单是"周末"还是"工作日"下的单：显示 order_id 和标记', k: "strftime('%w', 日期) 返回 0–6，0 是周日、6 是周六", ref: "SELECT order_id, CASE WHEN strftime('%w', order_date) IN ('0', '6') THEN '周末' ELSE '工作日' END AS day_type FROM orders" },
    { id: '3-8', lv: 3, title: '每个商品名称有几个字？显示名称和字数', k: 'LENGTH(文本)', ref: 'SELECT product_name, LENGTH(product_name) FROM products' },
    // 第 4 关
    { id: '4-1', lv: 4, title: '我们一共有多少用户？', k: 'COUNT(*) 数行数', ref: 'SELECT COUNT(*) FROM customers' },
    { id: '4-2', lv: 4, title: '每个国家各有多少用户？显示国家和用户数', k: 'GROUP BY 国家，再 COUNT', ref: 'SELECT country, COUNT(*) AS users FROM customers GROUP BY country' },
    { id: '4-3', lv: 4, title: '有多少用户下过单？（同一个用户只算一次）', k: 'COUNT(DISTINCT 列) 去重计数', ref: 'SELECT COUNT(DISTINCT customer_id) FROM orders' },
    { id: '4-4', lv: 4, title: "只看已完成订单，找出下单次数 ≥ 5 次的用户：显示 customer_id 和订单数", k: 'WHERE 先过滤行，HAVING 再过滤分组', ref: "SELECT customer_id, COUNT(*) AS cnt FROM orders WHERE status = '已完成' GROUP BY customer_id HAVING COUNT(*) >= 5" },
    { id: '4-5', lv: 4, title: '每种支付方式的退款订单占比是多少？显示支付方式和占比（小数，保留两位，如 0.12；支付方式为空的单独算一组）', k: "SUM(CASE WHEN status = '已退款' THEN 1 ELSE 0 END) * 1.0 / COUNT(*)", ref: "SELECT payment_method, ROUND(SUM(CASE WHEN status = '已退款' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 2) AS refund_rate FROM orders GROUP BY payment_method" },
    { id: '4-6', lv: 4, title: '每个月的新注册用户数是多少？显示月份（如 2026-03）和人数', k: '先用 strftime 取月份，再 GROUP BY', ref: "SELECT strftime('%Y-%m', signup_date) AS month, COUNT(*) FROM customers GROUP BY month" },
    { id: '4-7', lv: 4, title: '每个商品一共卖出多少件？只看 order_items，不管订单状态。显示 product_id 和件数', k: 'SUM(quantity) + GROUP BY product_id', ref: 'SELECT product_id, SUM(quantity) FROM order_items GROUP BY product_id' },
    { id: '4-8', lv: 4, title: '每个获客渠道的用户平均年龄是多少？显示渠道和平均年龄（保留一位小数）', k: 'ROUND(AVG(age), 1)', ref: 'SELECT channel, ROUND(AVG(age), 1) FROM customers GROUP BY channel' },
    { id: '4-9', lv: 4, title: '哪些国家的用户数超过 40 人？显示国家和用户数', k: '对分组结果筛选要用 HAVING', ref: 'SELECT country, COUNT(*) FROM customers GROUP BY country HAVING COUNT(*) > 40' },
    // 第 5 关
    { id: '5-1', lv: 5, title: '列出每笔订单对应的用户姓名：显示 order_id 和 name', k: 'JOIN ... ON 两张表的关联列', ref: 'SELECT o.order_id, c.name FROM orders o JOIN customers c ON o.customer_id = c.customer_id' },
    { id: '5-2', lv: 5, title: '哪些用户注册了但从来没下过单？显示 customer_id 和 name', k: 'LEFT JOIN 后，右表为空的就是没匹配上的', ref: 'SELECT c.customer_id, c.name FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL' },
    { id: '5-3', lv: 5, title: '每个获客渠道带来的销售额是多少？显示渠道和销售额' + SALES, k: '三张表：orders、customers、order_items', ref: "SELECT c.channel, SUM(oi.quantity * oi.unit_price) AS sales FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY c.channel" },
    { id: '5-4', lv: 5, title: "每个品类一共卖了多少件？显示品类和件数（只算已完成订单）", k: 'orders → order_items → products 依次连接', ref: "SELECT p.category, SUM(oi.quantity) AS qty FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = '已完成' GROUP BY p.category" },
    { id: '5-5', lv: 5, title: '每个国家的销售额是多少？显示国家和销售额' + SALES, k: '国家在 customers，金额在 order_items', ref: "SELECT c.country, SUM(oi.quantity * oi.unit_price) FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY c.country" },
    { id: '5-6', lv: 5, title: '列出所有用户的下单次数（没下过单的显示 0，不限订单状态）：显示 customer_id 和次数', k: 'LEFT JOIN 后 COUNT(o.order_id)，空值不计数', ref: 'SELECT c.customer_id, COUNT(o.order_id) FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id' },
    { id: '5-7', lv: 5, title: '每笔订单的总金额是多少（订单里所有商品金额之和，不限状态）？显示 order_id 和金额', k: 'order_items 按 order_id 分组求和', ref: 'SELECT o.order_id, SUM(oi.quantity * oi.unit_price) FROM orders o JOIN order_items oi ON o.order_id = oi.order_id GROUP BY o.order_id' },
    { id: '5-8', lv: 5, title: '哪些用户买过"声浪 Air Pro 降噪耳机"？显示用户姓名（同名的只算一次，不限订单状态）', k: '四张表连接，最后 DISTINCT', ref: "SELECT DISTINCT c.name FROM customers c JOIN orders o ON c.customer_id = o.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE p.product_name = '声浪 Air Pro 降噪耳机'" },
    // 第 6 关
    { id: '6-1', lv: 6, title: '哪些商品的价格高于所有商品的平均价格？显示名称和价格', k: 'WHERE price > (SELECT AVG(price) FROM products)', ref: 'SELECT product_name, price FROM products WHERE price > (SELECT AVG(price) FROM products)' },
    { id: '6-2', lv: 6, title: '找出下过"耳机"品类订单的用户：显示 customer_id（不重复，不限订单状态）', k: 'WHERE order_id IN (子查询)', ref: "SELECT DISTINCT customer_id FROM orders WHERE order_id IN (SELECT oi.order_id FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE p.category = '耳机')" },
    { id: '6-3', lv: 6, title: '找出从来没买过"相机"品类的用户（包括没下过单的）：显示 customer_id 和 name', k: 'NOT IN (买过相机的用户)', ref: "SELECT customer_id, name FROM customers WHERE customer_id NOT IN (SELECT o.customer_id FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE p.category = '相机')" },
    { id: '6-4', lv: 6, title: '用 EXISTS 找出至少下过一单的用户：显示 customer_id 和 name', k: 'WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)', ref: 'SELECT c.customer_id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)' },
    { id: '6-5', lv: 6, title: '哪些用户的总消费高于"所有下过单用户的平均总消费"？显示 customer_id 和总消费' + SALES, k: '先在子查询里算出每人总消费（派生表），再和平均值比较', ref: 'SELECT customer_id, total FROM (' + CUST_TOTAL + ') t WHERE total > (SELECT AVG(total) FROM (' + CUST_TOTAL + '))' },
    { id: '6-6', lv: 6, title: '价格最高的那个商品属于哪个品类？只显示品类', k: 'WHERE price = (SELECT MAX(price) ...)', ref: 'SELECT category FROM products WHERE price = (SELECT MAX(price) FROM products)' },
    { id: '6-7', lv: 6, title: '每个国家里，年龄高于本国平均年龄的用户有哪些？显示 customer_id、country、age', k: '相关子查询：子查询里引用外层的 country', ref: 'SELECT c.customer_id, c.country, c.age FROM customers c WHERE c.age > (SELECT AVG(c2.age) FROM customers c2 WHERE c2.country = c.country)' },
    // 第 7 关
    { id: '7-1', lv: 7, title: '每个品类中价格最高的商品：显示品类、名称、价格', k: 'ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC)', dims: ['window'], ref: 'SELECT category, product_name, price FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn FROM products) WHERE rn = 1' },
    { id: '7-2', lv: 7, title: '2026 年每月销售额，以及截至当月的累计销售额：显示月份、当月销售额、累计销售额，按月份排序' + SALES, k: 'WITH 先算月度销售额，再 SUM(sales) OVER (ORDER BY month)', ordered: true, dims: ['cte', 'window'], ref: 'WITH m AS (' + MONTHLY_2026 + ') SELECT month, sales, SUM(sales) OVER (ORDER BY month) AS cum_sales FROM m ORDER BY month' },
    { id: '7-3', lv: 7, title: '2026 年每月销售额比上个月多了多少？显示月份、当月销售额、与上月的差值（1 月显示空），按月份排序' + SALES, k: 'sales - LAG(sales) OVER (ORDER BY month)', ordered: true, dims: ['cte', 'window'], ref: 'WITH m AS (' + MONTHLY_2026 + ') SELECT month, sales, sales - LAG(sales) OVER (ORDER BY month) AS diff FROM m ORDER BY month' },
    { id: '7-4', lv: 7, title: '用 RANK 给所有商品按价格从高到低排名：显示名称、价格、排名，按排名排序', k: 'RANK() OVER (ORDER BY price DESC)', ordered: true, dims: ['window'], ref: 'SELECT product_name, price, RANK() OVER (ORDER BY price DESC) AS rk FROM products ORDER BY rk' },
    { id: '7-5', lv: 7, title: '2026 年每月销售额的 3 个月移动平均（当月和前两个月的平均，保留两位小数）：显示月份和移动平均，按月份排序' + SALES, k: 'AVG(sales) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)', ordered: true, dims: ['cte', 'window'], ref: 'WITH m AS (' + MONTHLY_2026 + ') SELECT month, ROUND(AVG(sales) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) FROM m ORDER BY month' },
    { id: '7-6', lv: 7, title: '每位用户的第一笔订单是哪天、订单号是多少（不限状态）？显示 customer_id、order_id、order_date', k: 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) = 1', dims: ['window'], ref: 'SELECT customer_id, order_id, order_date FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders) WHERE rn = 1' },
    { id: '7-7', lv: 7, title: '每个品类的销售额占全部销售额的比例（小数，保留两位）：显示品类和占比' + SALES, k: 'SUM(sales) OVER () 得到全部销售额', dims: ['cte', 'window'], ref: "WITH s AS (SELECT p.category, SUM(oi.quantity * oi.unit_price) AS sales FROM orders o JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = '已完成' GROUP BY p.category) SELECT category, ROUND(sales * 1.0 / SUM(sales) OVER (), 2) FROM s" },
    { id: '7-8', lv: 7, title: '用 CTE 改写：先算出每位用户的总消费，再找出总消费最高的 5 位用户。显示 customer_id 和总消费，从高到低' + SALES, k: 'WITH t AS (...) SELECT ... FROM t ORDER BY total DESC LIMIT 5', ordered: true, dims: ['cte'], ref: 'WITH t AS (' + CUST_TOTAL + ') SELECT customer_id, total FROM t ORDER BY total DESC, customer_id LIMIT 5' },
    // ---- 扩充题（各关追加） ----
    { id: '1-9', lv: 1, title: '把所有商品按品类排序，同一品类内价格从高到低：显示品类、名称、价格', k: 'ORDER BY 可以写多列：ORDER BY category, price DESC', ordered: true, ref: 'SELECT category, product_name, price FROM products ORDER BY category, price DESC' },
    { id: '1-10', lv: 1, title: '订单一共有哪几种状态？（不要重复）', k: 'DISTINCT status', ref: 'SELECT DISTINCT status FROM orders' },
    { id: '2-9', lv: 2, title: "2026 年上半年（1 月 1 日到 6 月 30 日）通过 Google 或 Instagram 注册的用户：显示 customer_id、signup_date、channel", k: 'IN 列表 + BETWEEN 日期，用 AND 连起来', ref: "SELECT customer_id, signup_date, channel FROM customers WHERE channel IN ('Google', 'Instagram') AND signup_date BETWEEN '2026-01-01' AND '2026-06-30'" },
    { id: '2-10', lv: 2, title: '价格在 100 到 300 元之间（含）、而且不是耳机的商品：显示名称、品类、价格', k: "BETWEEN 100 AND 300 AND category <> '耳机'", ref: "SELECT product_name, category, price FROM products WHERE price BETWEEN 100 AND 300 AND category <> '耳机'" },
    { id: '3-9', lv: 3, title: "把下单日期写成 '2026年03月' 这样的格式：显示 order_id 和格式化后的月份", k: "strftime('%Y年%m月', 日期)：格式串里可以直接写中文", ref: "SELECT order_id, strftime('%Y年%m月', order_date) FROM orders" },
    { id: '3-10', lv: 3, title: "2026 年注册的用户标记为'新用户'，更早注册的标记为'老用户'：显示 customer_id 和标记", k: "CASE WHEN signup_date >= '2026-01-01' THEN ...", ref: "SELECT customer_id, CASE WHEN signup_date >= '2026-01-01' THEN '新用户' ELSE '老用户' END FROM customers" },
    { id: '4-10', lv: 4, title: '每个品类有几个商品、平均价格（保留两位）、最高价是多少？显示品类、商品数、平均价、最高价', k: '一个 GROUP BY 里可以同时用多个聚合函数', ref: 'SELECT category, COUNT(*), ROUND(AVG(price), 2), MAX(price) FROM products GROUP BY category' },
    { id: '4-11', lv: 4, title: '每个国家的男女用户各有多少人？显示国家、性别、人数', k: 'GROUP BY country, gender', ref: 'SELECT country, gender, COUNT(*) FROM customers GROUP BY country, gender' },
    { id: '4-12', lv: 4, title: "2026 年每个月的订单数和其中的退款订单数：显示月份、订单数、退款数", k: "COUNT(*) 和 SUM(CASE WHEN status = '已退款' THEN 1 ELSE 0 END) 放在一起", ref: "SELECT strftime('%Y-%m', order_date) AS month, COUNT(*), SUM(CASE WHEN status = '已退款' THEN 1 ELSE 0 END) FROM orders WHERE order_date >= '2026-01-01' GROUP BY month" },
    { id: '5-9', lv: 5, title: '每位用户的已完成订单数和总消费：显示 customer_id、name、订单数、总消费（没有已完成订单的不显示）', k: '一对多连接后，订单数要用 COUNT(DISTINCT o.order_id)，否则会被明细放大', ref: "SELECT c.customer_id, c.name, COUNT(DISTINCT o.order_id), SUM(oi.quantity * oi.unit_price) FROM customers c JOIN orders o ON c.customer_id = o.customer_id JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY c.customer_id, c.name" },
    { id: '5-10', lv: 5, title: '每个获客渠道、每个品类的销售额是多少？显示渠道、品类、销售额' + SALES, k: '四张表连接，GROUP BY 两列', ref: "SELECT c.channel, p.category, SUM(oi.quantity * oi.unit_price) FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = '已完成' GROUP BY c.channel, p.category" },
    { id: '5-11', lv: 5, title: '列出每个商品被下单的次数（没人买过的也要显示为 0，不限状态）：显示名称和次数', k: 'products LEFT JOIN order_items，再 COUNT(oi.order_id)', ref: 'SELECT p.product_name, COUNT(oi.order_id) FROM products p LEFT JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.product_id, p.product_name' },
    { id: '6-8', lv: 6, title: '哪些用户下过单、但从来没有退过款？显示 customer_id（不重复）', k: "WHERE customer_id NOT IN (有过'已退款'订单的用户)", ref: "SELECT DISTINCT customer_id FROM orders WHERE customer_id NOT IN (SELECT customer_id FROM orders WHERE status = '已退款')" },
    { id: '6-9', lv: 6, title: '每个品类里，价格高于本品类平均价的商品有哪些？显示品类、名称、价格', k: '相关子查询：WHERE price > (SELECT AVG(price) FROM products p2 WHERE p2.category = p.category)', ref: 'SELECT p.category, p.product_name, p.price FROM products p WHERE p.price > (SELECT AVG(p2.price) FROM products p2 WHERE p2.category = p.category)' },
    { id: '6-10', lv: 6, title: '下单次数（不限状态）最多的用户是谁？如果并列都要显示。显示 customer_id 和次数', k: '先算每人次数，再用 = (SELECT MAX(...)) 取出最大的', ref: 'SELECT customer_id, cnt FROM (SELECT customer_id, COUNT(*) AS cnt FROM orders GROUP BY customer_id) WHERE cnt = (SELECT MAX(cnt) FROM (SELECT COUNT(*) AS cnt FROM orders GROUP BY customer_id))' },
    { id: '7-9', lv: 7, title: '用 DENSE_RANK 给每个品类内的商品按价格从高到低排名：显示品类、名称、价格、排名', k: 'DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC)', dims: ['window'], ref: 'SELECT category, product_name, price, DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC) FROM products' },
    { id: '7-10', lv: 7, title: '每位用户相邻两次下单隔了几天（不限状态，第一次显示空）：显示 customer_id、order_date、间隔天数（整数）', k: "julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id))", dims: ['window'], ref: 'SELECT customer_id, order_date, CAST(julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id)) AS INTEGER) FROM orders' },
    { id: '7-11', lv: 7, title: '每个国家的销售额、占全部销售额的比例（小数，保留两位）和排名：显示国家、销售额、占比、排名' + SALES, k: 'CTE 先算国家销售额，再 SUM() OVER () 和 RANK() OVER (ORDER BY sales DESC)', dims: ['cte', 'window'], ref: "WITH s AS (SELECT c.country, SUM(oi.quantity * oi.unit_price) AS sales FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY c.country) SELECT country, sales, ROUND(sales * 1.0 / SUM(sales) OVER (), 2), RANK() OVER (ORDER BY sales DESC) FROM s" },
    { id: '7-12', lv: 7, title: '把下过已完成订单的用户按总消费从高到低分成 4 档（NTILE，1 档最高；消费相同按 customer_id 从小到大）：显示 customer_id、总消费、档位' + SALES, k: 'NTILE(4) OVER (ORDER BY total DESC, customer_id)', dims: ['cte', 'window'], ref: 'WITH t AS (' + CUST_TOTAL + ') SELECT customer_id, total, NTILE(4) OVER (ORDER BY total DESC, customer_id) FROM t' },
    // 第 8 关：项目专题（8 个业务项目，每个两步：先做基础版，再做进阶版）
    { id: '8-1', lv: 8, project: '用户活跃', step: 1, title: '【用户活跃 · 1/2】运营要给 9 月"连续登录 3 天及以上"的用户发奖励，名单是哪些人？显示 customer_id（不重复）', k: '日期减去行号：连续的日期会得到同一个值，用它分组', dims: ['window', 'cte', 'business'], ref: "WITH t AS (SELECT customer_id, login_date, julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY login_date) AS grp FROM user_logins) SELECT DISTINCT customer_id FROM t GROUP BY customer_id, grp HAVING COUNT(*) >= 3" },
    { id: '8-2', lv: 8, project: '用户活跃', step: 2, title: '【用户活跃 · 2/2】奖励要按"最长连续登录天数"分档。9 月登录过的每位用户，最长连续登录了几天？显示 customer_id 和最长天数', k: '在上一题分组的基础上，先算每段的长度，再取每人的 MAX', dims: ['window', 'cte', 'business'], ref: "WITH t AS (SELECT customer_id, julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY login_date) AS grp FROM user_logins), g AS (SELECT customer_id, grp, COUNT(*) AS len FROM t GROUP BY customer_id, grp) SELECT customer_id, MAX(len) FROM g GROUP BY customer_id" },
    { id: '8-3', lv: 8, project: '选品', step: 1, title: '【选品 · 1/2】各国站点要做首页推荐位，每个国家销售额前 2 的商品是什么？显示国家、商品名、销售额' + SALES, k: '先算国家 × 商品的销售额，再 ROW_NUMBER 分国家排名', dims: ['window', 'join', 'business'], ref: "WITH s AS (SELECT c.country, p.product_name, SUM(oi.quantity * oi.unit_price) AS sales FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = '已完成' GROUP BY c.country, p.product_name), r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY country ORDER BY sales DESC) AS rn FROM s) SELECT country, product_name, sales FROM r WHERE rn <= 2" },
    { id: '8-4', lv: 8, project: '选品', step: 2, title: '【选品 · 2/2】推荐位值不值得给？算一下每个国家前 2 名商品的销售额，占该国总销售额的比例（小数，保留两位）。显示国家和占比', k: 'ROW_NUMBER 排名的同时用 SUM(sales) OVER (PARTITION BY country) 算国家总额', dims: ['window', 'cte', 'business'], ref: "WITH s AS (SELECT c.country, p.product_name, SUM(oi.quantity * oi.unit_price) AS sales FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = '已完成' GROUP BY c.country, p.product_name), r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY country ORDER BY sales DESC) AS rn, SUM(sales) OVER (PARTITION BY country) AS tot FROM s) SELECT country, ROUND(SUM(CASE WHEN rn <= 2 THEN sales ELSE 0 END) * 1.0 / MAX(tot), 2) FROM r GROUP BY country" },
    { id: '8-5', lv: 8, project: '转化漏斗', step: 1, title: '【转化漏斗 · 1/2】9 月浏览、加购、下单、支付各有多少人（去重）？用一行显示四个数', k: "COUNT(DISTINCT CASE WHEN event_type = '浏览' THEN customer_id END)", dims: ['groupby', 'business'], ref: "SELECT COUNT(DISTINCT CASE WHEN event_type = '浏览' THEN customer_id END), COUNT(DISTINCT CASE WHEN event_type = '加购' THEN customer_id END), COUNT(DISTINCT CASE WHEN event_type = '下单' THEN customer_id END), COUNT(DISTINCT CASE WHEN event_type = '支付' THEN customer_id END) FROM events" },
    { id: '8-6', lv: 8, project: '转化漏斗', step: 2, title: '【转化漏斗 · 2/2】哪一步流失最严重？算出 浏览→加购、加购→下单、下单→支付 三个转化率（小数，保留两位），一行显示三个数', k: '先用 CTE 存下四个人数，再两两相除（记得 * 1.0）', dims: ['cte', 'groupby', 'business'], ref: "WITH f AS (SELECT COUNT(DISTINCT CASE WHEN event_type = '浏览' THEN customer_id END) AS b, COUNT(DISTINCT CASE WHEN event_type = '加购' THEN customer_id END) AS c, COUNT(DISTINCT CASE WHEN event_type = '下单' THEN customer_id END) AS o, COUNT(DISTINCT CASE WHEN event_type = '支付' THEN customer_id END) AS p FROM events) SELECT ROUND(c * 1.0 / b, 2), ROUND(o * 1.0 / c, 2), ROUND(p * 1.0 / o, 2) FROM f" },
    { id: '8-7', lv: 8, project: '次日留存', step: 1, title: "【次日留存 · 1/2】9 月 1 日到 29 日，每天登录的用户里，第二天也登录的比例是多少？显示日期和比例（小数，保留两位）", k: "LEFT JOIN 自己：b.login_date = date(a.login_date, '+1 day')", dims: ['join', 'groupby', 'business'], ref: "SELECT a.login_date, ROUND(COUNT(b.customer_id) * 1.0 / COUNT(*), 2) FROM user_logins a LEFT JOIN user_logins b ON a.customer_id = b.customer_id AND b.login_date = date(a.login_date, '+1 day') WHERE a.login_date <= '2026-09-29' GROUP BY a.login_date" },
    { id: '8-8', lv: 8, project: '次日留存', step: 2, title: '【次日留存 · 2/2】周报只放一个数：把上一题每天的次日留存率（先不四舍五入）求平均，再保留两位小数。工作日和周末分开算，显示"工作日 / 周末"和平均留存率', k: '把上一题放进 CTE，再按 strftime(\'%w\') 分成工作日和周末两组求 AVG', dims: ['cte', 'join', 'business'], ref: "WITH d AS (SELECT a.login_date AS dt, COUNT(b.customer_id) * 1.0 / COUNT(*) AS r FROM user_logins a LEFT JOIN user_logins b ON a.customer_id = b.customer_id AND b.login_date = date(a.login_date, '+1 day') WHERE a.login_date <= '2026-09-29' GROUP BY a.login_date) SELECT CASE WHEN strftime('%w', dt) IN ('0', '6') THEN '周末' ELSE '工作日' END AS t, ROUND(AVG(r), 2) FROM d GROUP BY t" },
    { id: '8-9', lv: 8, project: '复购', step: 1, title: "【复购 · 1/2】2026 年下过已完成订单的用户里，下过 2 次及以上的占多少？显示比例（小数，保留两位）", k: '先按用户数订单，再 AVG(CASE WHEN cnt >= 2 THEN 1.0 ELSE 0 END)', dims: ['cte', 'groupby', 'business'], ref: "WITH t AS (SELECT customer_id, COUNT(*) AS cnt FROM orders WHERE status = '已完成' AND order_date >= '2026-01-01' GROUP BY customer_id) SELECT ROUND(AVG(CASE WHEN cnt >= 2 THEN 1.0 ELSE 0 END), 2) FROM t" },
    { id: '8-10', lv: 8, project: '复购', step: 2, title: '【复购 · 2/2】哪个获客渠道带来的用户最爱复购？按渠道算 2026 年的复购率（定义同上题，保留两位），显示渠道和复购率', k: '在 CTE 里把渠道一起带上：JOIN customers 后 GROUP BY customer_id, channel', dims: ['cte', 'join', 'business'], ref: "WITH t AS (SELECT o.customer_id, c.channel, COUNT(*) AS cnt FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.status = '已完成' AND o.order_date >= '2026-01-01' GROUP BY o.customer_id, c.channel) SELECT channel, ROUND(AVG(CASE WHEN cnt >= 2 THEN 1.0 ELSE 0 END), 2) FROM t GROUP BY channel" },
    { id: '8-11', lv: 8, project: '月报', step: 1, title: '【月报 · 1/2】2026 年每月销售额的环比增长率是多少？显示月份和增长率（小数，保留两位，1 月显示空），按月份排序' + SALES, k: '(本月 - 上月) * 1.0 / 上月，上月用 LAG', ordered: true, dims: ['cte', 'window', 'business'], ref: 'WITH m AS (' + MONTHLY_2026 + ') SELECT month, ROUND((sales - LAG(sales) OVER (ORDER BY month)) * 1.0 / LAG(sales) OVER (ORDER BY month), 2) FROM m ORDER BY month' },
    { id: '8-12', lv: 8, project: '月报', step: 2, title: "【月报 · 2/2】环比会受季节影响，老板更想看同比。2026 年 1–9 月每月销售额和 2025 年同月相比增长了多少？显示月份（01–09）、2026 年销售额、2025 年销售额、增长率（小数，保留两位），按月份排序" + SALES, k: "CTE 按 strftime('%Y') 和 strftime('%m') 汇总，再把 2026 和 2025 按月份自连接", ordered: true, dims: ['cte', 'join', 'business'], ref: "WITH m AS (SELECT strftime('%Y', o.order_date) AS y, strftime('%m', o.order_date) AS mo, SUM(oi.quantity * oi.unit_price) AS sales FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY y, mo) SELECT a.mo, a.sales, b.sales, ROUND((a.sales - b.sales) * 1.0 / b.sales, 2) FROM m a JOIN m b ON a.mo = b.mo AND a.y = '2026' AND b.y = '2025' ORDER BY a.mo" },
    { id: '8-13', lv: 8, project: '用户分层', step: 1, title: "【用户分层 · 1/2】以 2026-10-01 为基准，给下过已完成订单的用户分层：最近 30 天（9 月 1 日及以后）下过单且总消费 ≥ 1000 为'重要价值'；最近 30 天下过单但消费不到 1000 为'活跃'；其余为'沉睡'。显示 customer_id 和分层", k: '先用 CTE 算每人最后下单日期和总消费，再 CASE WHEN', dims: ['cte', 'groupby', 'business'], ref: "WITH t AS (SELECT o.customer_id, MAX(o.order_date) AS last_date, SUM(oi.quantity * oi.unit_price) AS total FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY o.customer_id) SELECT customer_id, CASE WHEN last_date >= '2026-09-01' AND total >= 1000 THEN '重要价值' WHEN last_date >= '2026-09-01' THEN '活跃' ELSE '沉睡' END FROM t" },
    { id: '8-14', lv: 8, project: '用户分层', step: 2, title: '【用户分层 · 2/2】运营要给每一层定预算：每层有多少人、平均总消费多少（保留两位）？显示分层、人数、平均消费', k: '把上一题再包一层 CTE，然后 GROUP BY 分层', dims: ['cte', 'groupby', 'business'], ref: "WITH t AS (SELECT o.customer_id, MAX(o.order_date) AS last_date, SUM(oi.quantity * oi.unit_price) AS total FROM orders o JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY o.customer_id), l AS (SELECT total, CASE WHEN last_date >= '2026-09-01' AND total >= 1000 THEN '重要价值' WHEN last_date >= '2026-09-01' THEN '活跃' ELSE '沉睡' END AS tier FROM t) SELECT tier, COUNT(*), ROUND(AVG(total), 2) FROM l GROUP BY tier" },
    { id: '8-15', lv: 8, project: '客单价', step: 1, title: '【客单价 · 1/2】平均值容易被大单拉高。已完成订单金额的中位数是多少？（订单金额 = 该订单所有商品金额之和）', k: 'ROW_NUMBER() 排序 + COUNT(*) OVER () 总数，取中间一个或两个的平均', dims: ['cte', 'window', 'business'], ref: 'WITH a AS (' + COMPLETED_AMT + '), r AS (SELECT amount, ROW_NUMBER() OVER (ORDER BY amount) AS rn, COUNT(*) OVER () AS n FROM a) SELECT AVG(amount) FROM r WHERE rn IN ((n + 1) / 2, (n + 2) / 2)' },
    { id: '8-16', lv: 8, project: '客单价', step: 2, title: '【客单价 · 2/2】定价团队想按国家看：每个国家已完成订单金额的中位数和平均数各是多少（平均数保留两位）？显示国家、中位数、平均数', k: '中位数和上一题一样，只是窗口函数里加 PARTITION BY country', dims: ['cte', 'window', 'business'], ref: "WITH a AS (SELECT o.order_id, c.country, SUM(oi.quantity * oi.unit_price) AS amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = '已完成' GROUP BY o.order_id, c.country), r AS (SELECT country, amount, ROW_NUMBER() OVER (PARTITION BY country ORDER BY amount) AS rn, COUNT(*) OVER (PARTITION BY country) AS n, AVG(amount) OVER (PARTITION BY country) AS av FROM a) SELECT country, AVG(amount), ROUND(MAX(av), 2) FROM r WHERE rn IN ((n + 1) / 2, (n + 2) / 2) GROUP BY country" }
  ];
  Q.sort(function (a, b) { var x = a.id.split('-'), y = b.id.split('-'); return (+x[0] - +y[0]) || (+x[1] - +y[1]); });

  /* ---------- 实习项目（第 9 关）：001、002 手工设计，其余由引擎生成 ---------- */
  var HAND = [
    {
      id: '001', free: true, stars: 2, db: 'waimai',
      company: '某外卖平台', role: '数据分析实习生',
      title: '北京外卖订单量下降，找原因',
      brief: '业务方在周会上说：9 月北京的外卖订单好像少了不少，帮忙看一下是怎么回事，周五前给个结论。',
      steps: [
        { kind: 'sql', stage: '描述', q: '北京 8 月和 9 月的订单量分别是多少？显示月份和订单数。', ordered: false, ref: "SELECT strftime('%Y-%m', o.order_date) AS month, COUNT(*) FROM orders o JOIN users u ON o.user_id = u.user_id WHERE u.city = '北京' GROUP BY month" },
        { kind: 'sql', stage: '拆解', q: '按用户类型（user_type）拆开看：北京每类用户 8 月和 9 月各有多少订单？显示用户类型、月份、订单数。', ref: "SELECT u.user_type, strftime('%Y-%m', o.order_date) AS month, COUNT(*) FROM orders o JOIN users u ON o.user_id = u.user_id WHERE u.city = '北京' GROUP BY u.user_type, month" },
        { kind: 'sql', stage: '拆解', q: '再按区（district）看：北京各区 8 月和 9 月的订单数。显示区、月份、订单数。', ref: "SELECT u.district, strftime('%Y-%m', o.order_date) AS month, COUNT(*) FROM orders o JOIN users u ON o.user_id = u.user_id WHERE u.city = '北京' GROUP BY u.district, month" },
        { kind: 'sql', stage: '归因', q: '看看钱的问题：北京学生用户 8 月和 9 月的平均优惠金额（coupon_amount）各是多少？保留两位小数。显示月份和平均优惠。', ref: "SELECT strftime('%Y-%m', o.order_date) AS month, ROUND(AVG(p.coupon_amount), 2) FROM orders o JOIN users u ON o.user_id = u.user_id JOIN payments p ON o.order_id = p.order_id WHERE u.city = '北京' AND u.user_type = '学生' GROUP BY month" },
        { kind: 'sql', stage: '归因', q: '排除一个可能性：北京 8 月和 9 月的平均配送时长有没有变化？保留两位小数。显示月份和平均配送分钟数。', ref: "SELECT strftime('%Y-%m', o.order_date) AS month, ROUND(AVG(d.delivery_minutes), 2) FROM orders o JOIN users u ON o.user_id = u.user_id JOIN delivery d ON o.order_id = d.order_id WHERE u.city = '北京' GROUP BY month" },
        { kind: 'text', stage: '结论', q: '用 3–5 句话给业务方写结论：订单下降了多少、主要是谁下降、你认为原因是什么、建议下一步做什么。注意 8 月 31 天、9 月 30 天。' }
      ]
    },
    {
      id: '002', free: true, stars: 2, db: 'shenglang',
      company: '声浪科技', role: '海外市场分析实习生',
      title: '美国市场耳机销量下滑：渠道、商品还是别的问题？',
      brief: '美国区负责人发来消息：今年 7 月以来美国的耳机卖得不太好，是不是某款耳机出问题了？帮忙拆一下。用的还是你练习时熟悉的声浪科技数据库。',
      steps: [
        { kind: 'sql', stage: '描述', q: "美国用户 2026 年 4–6 月和 7–9 月分别买了多少件耳机（已完成订单）？显示时间段（'4-6月' / '7-9月'）和件数。", ref: "SELECT CASE WHEN o.order_date < '2026-07-01' THEN '4-6月' ELSE '7-9月' END AS period, SUM(oi.quantity) FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE c.country = 'US' AND p.category = '耳机' AND o.status = '已完成' AND o.order_date BETWEEN '2026-04-01' AND '2026-09-30' GROUP BY period" },
        { kind: 'sql', stage: '拆解', q: '按获客渠道拆：美国各渠道用户在两个时间段分别买了多少件耳机？显示渠道、时间段、件数。', ref: "SELECT c.channel, CASE WHEN o.order_date < '2026-07-01' THEN '4-6月' ELSE '7-9月' END AS period, SUM(oi.quantity) FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE c.country = 'US' AND p.category = '耳机' AND o.status = '已完成' AND o.order_date BETWEEN '2026-04-01' AND '2026-09-30' GROUP BY c.channel, period" },
        { kind: 'sql', stage: '拆解', q: '按商品拆：美国每款耳机在两个时间段分别卖了多少件？显示商品名、时间段、件数。', ref: "SELECT p.product_name, CASE WHEN o.order_date < '2026-07-01' THEN '4-6月' ELSE '7-9月' END AS period, SUM(oi.quantity) FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id WHERE c.country = 'US' AND p.category = '耳机' AND o.status = '已完成' AND o.order_date BETWEEN '2026-04-01' AND '2026-09-30' GROUP BY p.product_name, period" },
        { kind: 'text', stage: '结论', q: '回复美国区负责人：是不是某款耳机的问题？下滑主要来自哪里？你会建议做什么？3–5 句话。' }
      ]
    }
  ];

  /* ---------- 项目引擎：按参数生成"埋了一个原因"的模拟业务数据，并自动生成分析步骤 ----------
   * 每个项目 = 一张维度表（用户/门店/线索…）+ 一张事实表（订单/会话/申请…）
   * 指标类型：count（数量）、sum（金额）、avg（平均值）、rate（比例，0/1 标记列取平均 × 100）
   * 第二个月里，某个维度取某个值的那部分数据被乘上一个系数 f（这就是"真正的原因"），
   * 同时有一个"驱动列"（优惠、价格、等待时长…）跟着变化，用来做归因验证。
   */
  var AGE = [['18-24', 35], ['25-34', 40], ['35+', 25]];
  var TIER = [['一线', 25], ['新一线', 30], ['二线', 25], ['三四线', 20]];
  var DEVICE = [['iOS', 45], ['Android', 55]];
  function monthEnd(ym) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7); return ym + '-' + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0'); }
  function nextMonth(ym) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + '-' + String(m).padStart(2, '0'); }
  function monthCn(ym) { return +ym.slice(5, 7) + ' 月'; }

  function buildEngine(SQL, spec) {
    var g = spec.gen, r = rng(g.seed), db = new SQL.Database();
    var dD = g.dims.filter(function (d) { return d.at === 'd'; }), dF = g.dims.filter(function (d) { return d.at === 'f'; });
    var mType = g.metric.type, measureCol = g.metric.col;
    db.exec('CREATE TABLE ' + g.dimTable + ' (' + g.dimKey + ' INTEGER PRIMARY KEY, ' + dD.map(function (d) { return d.col + ' TEXT'; }).concat(['signup_date TEXT']).join(', ') + ');');
    var fcols = [g.factKey + ' INTEGER PRIMARY KEY', g.dimKey + ' INTEGER', g.dateCol + ' TEXT'].concat(dF.map(function (d) { return d.col + ' TEXT'; }));
    if (mType !== 'count') fcols.push(measureCol + (mType === 'rate' ? ' INTEGER' : ' REAL'));
    fcols.push(g.driver.col + ' REAL');
    db.exec('CREATE TABLE ' + g.factTable + ' (' + fcols.join(', ') + ');');

    var start = g.p1 + '-01', end = monthEnd(g.p2), nDays = daysBetween(start, end) + 1, p2start = g.p2 + '-01';
    var dims = [];
    for (var i = 1; i <= g.n; i++) {
      var row = [i];
      dD.forEach(function (d) { row.push(pickW(r, d.vals)); });
      row.push(addDays('2025-06-01', int(r, 0, 300)));
      dims.push(row);
    }
    insertAll(db, g.dimTable, [g.dimKey].concat(dD.map(function (d) { return d.col; })).concat(['signup_date']), dims);

    var dCols = dD.map(function (d) { return d.col; }), fCols = dF.map(function (d) { return d.col; });
    function hit(cz, drow, fvals) {
      if (!cz) return false;
      var di = dCols.indexOf(cz.col); if (di >= 0) return drow[di + 1] === cz.val;
      var fi = fCols.indexOf(cz.col); return fi >= 0 && fvals[fi] === cz.val;
    }
    var facts = [], fid = 100000;
    function emit(drow, day) {
      var fvals = dF.map(function (d) { return pickW(r, d.vals); });
      var p2 = day >= p2start, h1 = p2 && hit(g.cause, drow, fvals), h2 = p2 && hit(g.cause2, drow, fvals);
      var f = (h1 ? g.cause.f : 1) * (h2 ? g.cause2.f : 1);
      if (mType === 'count' || mType === 'sum') {
        if (f < 1 && r() > f) return;
        if (f > 1 && r() < f - 1) push(drow, day, fvals, 1, h1);
        push(drow, day, fvals, 1, h1);
      } else push(drow, day, fvals, f, h1);
    }
    function push(drow, day, fvals, f, h1) {
      fid++;
      var row = [fid, drow[0], day].concat(fvals), m = g.metric;
      if (mType === 'rate') row.push(r() < Math.min(0.98, m.base * f) ? 1 : 0);
      else if (mType === 'sum') row.push(Math.round(m.base * (0.5 + r()) * 100) / 100);
      else if (mType === 'avg') row.push(Math.round(m.base * (0.6 + 0.8 * r()) * f * 10) / 10);
      var dv = g.driver.base + (r() * 2 - 1) * (g.driver.noise || 0);
      if (h1) dv *= g.driver.shift;
      row.push(Math.round(dv * 10) / 10);
      facts.push(row);
    }
    dims.forEach(function (drow) {
      if (g.mode === 'once') { emit(drow, addDays(start, int(r, 0, nDays - 1))); return; }
      if (g.mode === 'monthly') { [g.p1, g.p2].forEach(function (ym) { emit(drow, addDays(ym + '-01', int(r, 0, 27))); }); return; }
      for (var dd = 0; dd < nDays; dd++) if (r() < g.freq) emit(drow, addDays(start, dd));
    });
    var cols = [g.factKey, g.dimKey, g.dateCol].concat(fCols);
    if (mType !== 'count') cols.push(measureCol);
    cols.push(g.driver.col);
    insertAll(db, g.factTable, cols, facts);
    return db;
  }

  function engineSteps(spec) {
    var g = spec.gen, m = g.metric, c = g.cause;
    var dimOf = function (col) { return g.dims.filter(function (d) { return d.col === col; })[0]; };
    var ref = function (col) { return (dimOf(col).at === 'd' ? 'd.' : 'f.') + col; };
    var FROM = ' FROM ' + g.factTable + ' f JOIN ' + g.dimTable + ' d ON f.' + g.dimKey + ' = d.' + g.dimKey;
    var MON = "strftime('%Y-%m', f." + g.dateCol + ')';
    var MET = { count: 'COUNT(*)', sum: 'ROUND(SUM(f.' + m.col + '), 2)', avg: 'ROUND(AVG(f.' + m.col + '), 2)', rate: 'ROUND(AVG(f.' + m.col + ') * 100, 2)' }[m.type];
    var RAW = { count: 'COUNT(*)', sum: 'SUM(f.' + m.col + ')' }[m.type];
    var HINT = { count: '', sum: '（保留两位小数）', avg: '（保留两位小数）', rate: '（百分数，保留两位小数，如 85.32）' }[m.type];
    var cd = dimOf(c.col), hd = dimOf(g.herring);
    var mm = monthCn(g.p1) + '和 ' + monthCn(g.p2);
    var split = function (d) {
      return { kind: 'sql', stage: '拆解', q: '按' + d.label + '（' + d.col + '）拆开看：各' + d.label + '在' + mm + '的' + m.name + '分别是多少？显示' + d.label + '、月份、' + m.name + HINT + '。', ref: 'SELECT ' + ref(d.col) + ', ' + MON + ' AS month, ' + MET + FROM + ' GROUP BY ' + ref(d.col) + ', month' };
    };
    var steps = [{ kind: 'sql', stage: '描述', q: mm + '的' + m.name + '分别是多少？显示月份和' + m.name + HINT + '。', ref: 'SELECT ' + MON + ' AS month, ' + MET + FROM + ' GROUP BY month' }];
    var others = g.dims.filter(function (d) { return d.col !== c.col && d.col !== g.herring; });
    var pair = [split(hd), split(cd)];
    if (spec.stars >= 5 && others.length) pair.push(split(others[0]));
    if (g.seed % 2) pair.reverse();
    steps = steps.concat(pair);
    var who = cd.label + '为"' + c.val + '"', WHERE_C = ' WHERE ' + ref(c.col) + " = '" + c.val + "'";
    steps.push({ kind: 'sql', stage: '归因', q: '看看' + who + '的这部分数据：' + mm + '的平均' + g.driver.label + '（' + g.driver.col + '）各是多少？保留两位小数。显示月份和平均值。', ref: 'SELECT ' + MON + ' AS month, ROUND(AVG(f.' + g.driver.col + '), 2)' + FROM + WHERE_C + ' GROUP BY month' });
    if (spec.stars >= 3) {
      steps.push({ kind: 'sql', stage: '归因', q: '做个对照：把' + cd.label + '分成"' + c.val + '"和"其他"两组，对比两组在' + mm + '的' + m.name + '。显示分组、月份、' + m.name + HINT + '。', ref: 'SELECT CASE WHEN ' + ref(c.col) + " = '" + c.val + "' THEN '" + c.val + "' ELSE '其他' END AS grp, " + MON + ' AS month, ' + MET + FROM + ' GROUP BY grp, month' });
    }
    if (spec.stars >= 4) {
      steps.push({ kind: 'sql', stage: '归因', q: '看趋势：' + who + '的' + m.name + "按周（strftime('%W', 日期)）是多少？再用 LAG 算出每周比上周变化了多少（保留两位小数，第一周为空）。显示周数、" + m.name + '、变化，按周排序。', ordered: true, ref: "WITH w AS (SELECT strftime('%W', f." + g.dateCol + ') AS wk, ' + MET + ' AS v' + FROM + WHERE_C + ' GROUP BY wk) SELECT wk, v, ROUND(v - LAG(v) OVER (ORDER BY wk), 2) FROM w ORDER BY wk' });
    }
    if (spec.stars >= 5) {
      steps.push({ kind: 'sql', stage: '归因', q: '排除"混在一起"的可能：把' + cd.label + '和' + hd.label + '交叉起来，看每个组合在' + mm + '的' + m.name + '。如果' + who + '在每个' + hd.label + '里都变差了，说明原因确实在' + cd.label + '。显示' + cd.label + '、' + hd.label + '、月份、' + m.name + HINT + '。', ref: 'SELECT ' + ref(c.col) + ', ' + ref(g.herring) + ', ' + MON + ' AS month, ' + MET + FROM + ' GROUP BY ' + ref(c.col) + ', ' + ref(g.herring) + ', month' });
      if (RAW) {
        steps.push({ kind: 'sql', stage: '归因', q: '量化贡献：各' + cd.label + '的' + m.name + '从' + monthCn(g.p1) + '到' + monthCn(g.p2) + '变化了多少，各占总变化的百分之几（保留两位小数，如 62.50）？显示' + cd.label + '、变化量（保留两位）、占比。', ref: "WITH t AS (SELECT " + ref(c.col) + " AS k, SUM(CASE WHEN " + MON + " = '" + g.p1 + "' THEN " + (m.type === 'count' ? '1' : 'f.' + m.col) + " ELSE 0 END) AS a, SUM(CASE WHEN " + MON + " = '" + g.p2 + "' THEN " + (m.type === 'count' ? '1' : 'f.' + m.col) + " ELSE 0 END) AS b" + FROM + " GROUP BY k) SELECT k, ROUND(b - a, 2), ROUND((b - a) * 100.0 / SUM(b - a) OVER (), 2) FROM t" });
      }
    }
    var concl = '给' + spec.audience + '写结论：' + m.name + '变化了多少、主要来自哪里、你认为的原因是什么、下一步建议做什么。';
    if (g.cause2) concl += '注意：这次的数据里除了主要原因，可能还有一个影响小一些的次要原因，找到了也写上。';
    steps.push({ kind: 'text', stage: '结论', q: concl + '3–5 句话，用上前面查到的数字。' });
    return steps;
  }

  function D_(col, label, at, vals) { return { col: col, label: label, at: at, vals: vals }; }
  var TEMPLATES = [
    { id: '003', stars: 3, industry: '电商', company: '某电商平台', role: '用户增长实习生', audience: '增长负责人',
      title: '新用户 7 日留存下降，是哪批用户出了问题？',
      brief: '增长负责人在周报里看到：9 月新用户的 7 日留存比 8 月掉了一截。她想知道是哪批用户出了问题，下周一的增长会上要讨论。',
      gen: { seed: 3003, n: 1700, mode: 'once', dimTable: 'users', dimKey: 'user_id', factTable: 'first_orders', factKey: 'order_id', dateCol: 'order_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('channel', '注册渠道', 'd', [['抖音', 30], ['微信', 25], ['应用商店', 25], ['小红书', 20]]), D_('city_tier', '城市等级', 'd', TIER), D_('device', '设备', 'd', DEVICE)],
        metric: { type: 'rate', col: 'retained_7d', name: '7 日留存率', base: 0.42, note: 'retained_7d = 1 表示首单后 7 天内又下了单' },
        driver: { col: 'delivery_days', label: '首单配送天数', base: 2.2, noise: 0.8, shift: 2.0 }, cause: { col: 'channel', val: '抖音', f: 0.5 }, herring: 'device' } },
    { id: '004', stars: 3, industry: '内容', company: '某内容 App', role: '产品分析实习生', audience: '首页产品经理',
      title: '新版首页上线后，人均观看时长反而下降了',
      brief: '9 月 1 日新版首页全量上线，产品经理本来等着看好数据，结果 9 月每次打开 App 的平均观看时长下降了。他想知道是改版本身不好，还是别的问题。',
      gen: { seed: 3004, n: 320, freq: 0.24, dimTable: 'users', dimKey: 'user_id', factTable: 'sessions', factKey: 'session_id', dateCol: 'session_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('device', '设备', 'd', [['iOS', 40], ['Android', 60]]), D_('age_group', '年龄段', 'd', AGE), D_('city_tier', '城市等级', 'd', TIER)],
        metric: { type: 'avg', col: 'watch_minutes', name: '平均观看时长（分钟）', base: 22 },
        driver: { col: 'load_seconds', label: '首页加载时长（秒）', base: 1.2, noise: 0.4, shift: 2.8 }, cause: { col: 'device', val: 'Android', f: 0.62 }, herring: 'age_group' } },
    { id: '005', stars: 3, industry: '出海', company: '某出海消费电子品牌', role: '海外电商运营实习生', audience: '海外电商负责人',
      title: '11 月大促 GMV 不升反降，问题出在哪个品类？',
      brief: '11 月有黑五大促，GMV 本该比 10 月高，结果反而下降了。负责人怀疑是流量不够，让你先把 GMV 拆开看看。',
      gen: { seed: 3005, n: 800, freq: 0.032, dimTable: 'customers', dimKey: 'customer_id', factTable: 'orders', factKey: 'order_id', dateCol: 'order_date', p1: '2026-10', p2: '2026-11',
        dims: [D_('country', '国家', 'd', [['US', 35], ['UK', 20], ['DE', 20], ['JP', 25]]), D_('sales_channel', '销售渠道', 'd', [['Amazon', 40], ['独立站', 35], ['TikTok Shop', 25]]), D_('category', '品类', 'f', [['耳机', 40], ['充电', 30], ['相机', 30]])],
        metric: { type: 'sum', col: 'gmv', name: 'GMV', base: 120 },
        driver: { col: 'unit_price', label: '成交单价', base: 300, noise: 40, shift: 1.25 }, cause: { col: 'category', val: '耳机', f: 0.5 }, herring: 'sales_channel' } },
    { id: '006', stars: 4, industry: '出行', company: '某出行平台', role: '策略分析实习生', audience: '北京城市运营',
      title: '晚高峰司乘匹配率下降：是哪个片区出了问题？',
      brief: '北京城市运营反馈：9 月晚高峰打车越来越难，乘客投诉变多。用叫车记录看看匹配率哪里掉了，是全城都变差，还是某个片区。',
      gen: { seed: 3006, n: 500, freq: 0.12, dimTable: 'passengers', dimKey: 'passenger_id', factTable: 'ride_requests', factKey: 'request_id', dateCol: 'request_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('member_level', '会员等级', 'd', [['普通', 70], ['会员', 30]]), D_('district', '片区', 'f', [['国贸', 25], ['中关村', 25], ['望京', 20], ['西二旗', 15], ['亦庄', 15]]), D_('time_slot', '时段', 'f', [['晚高峰', 35], ['其他', 65]])],
        metric: { type: 'rate', col: 'is_matched', name: '匹配率', base: 0.86, note: 'is_matched = 1 表示这次叫车匹配到了司机' },
        driver: { col: 'nearby_drivers', label: '附近空闲司机数', base: 8, noise: 2, shift: 0.4 }, cause: { col: 'district', val: '西二旗', f: 0.68 }, herring: 'member_level' } },
    { id: '007', stars: 3, industry: '游戏', company: '某手游公司', role: '游戏数据分析实习生', audience: '商业化策划',
      title: '版本更新后首充付费率下降',
      brief: '8 月版本更新后，首充礼包的付费率掉了。商业化策划说礼包内容没变，让你看看到底是哪类玩家不买了。',
      gen: { seed: 3007, n: 500, freq: 0.1, dimTable: 'players', dimKey: 'player_id', factTable: 'pay_offers', factKey: 'offer_id', dateCol: 'offer_date', p1: '2026-07', p2: '2026-08',
        dims: [D_('server', '服务器', 'd', [['华东一区', 30], ['华南一区', 30], ['华北一区', 40]]), D_('level_group', '玩家等级', 'd', [['新手', 40], ['中级', 35], ['高级', 25]]), D_('device', '设备', 'd', DEVICE)],
        metric: { type: 'rate', col: 'is_paid', name: '付费率', base: 0.18, note: 'is_paid = 1 表示玩家看到礼包后买了' },
        driver: { col: 'offer_price', label: '礼包价格（元）', base: 6, noise: 0, shift: 5 }, cause: { col: 'level_group', val: '新手', f: 0.45 }, herring: 'server' } },
    { id: '008', stars: 2, industry: '教育', company: '某在线教育平台', role: '教学运营实习生', audience: '教学运营主管',
      title: '暑期班续费率下降',
      brief: '8 月暑期班结束后，续报秋季班的比例比 7 月那批低了不少。教学运营主管让你看看是哪个年级的问题。',
      gen: { seed: 3008, n: 1500, mode: 'once', dimTable: 'students', dimKey: 'student_id', factTable: 'renewals', factKey: 'renewal_id', dateCol: 'renew_date', p1: '2026-07', p2: '2026-08',
        dims: [D_('grade', '年级', 'd', [['初一', 30], ['初二', 35], ['初三', 35]]), D_('city_tier', '城市等级', 'd', TIER)],
        metric: { type: 'rate', col: 'renewed', name: '续费率', base: 0.55, note: 'renewed = 1 表示续报了下一期' },
        driver: { col: 'class_size', label: '班级人数', base: 12, noise: 2, shift: 2.0 }, cause: { col: 'grade', val: '初三', f: 0.6 }, herring: 'city_tier' } },
    { id: '009', stars: 3, industry: 'SaaS', company: '某 SaaS 公司', role: '客户成功实习生', audience: '客户成功负责人',
      title: '客户月流失率上升，哪类客户在离开？',
      brief: '9 月客户流失率明显上升，CEO 在周会上点名要原因。客户成功负责人让你先查清楚是哪类客户在流失。',
      gen: { seed: 3009, n: 900, mode: 'monthly', dimTable: 'accounts', dimKey: 'account_id', factTable: 'monthly_status', factKey: 'status_id', dateCol: 'status_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('plan', '套餐', 'd', [['基础版', 45], ['专业版', 35], ['企业版', 20]]), D_('industry', '客户行业', 'd', [['零售', 30], ['教育', 25], ['制造', 25], ['互联网', 20]])],
        metric: { type: 'rate', col: 'churned', name: '流失率', base: 0.05, note: 'churned = 1 表示这个月退订了' },
        driver: { col: 'ticket_wait_hours', label: '工单等待时长（小时）', base: 6, noise: 3, shift: 3 }, cause: { col: 'plan', val: '基础版', f: 2.6 }, herring: 'industry' } },
    { id: '010', stars: 2, industry: '餐饮', company: '某咖啡连锁品牌', role: '门店运营实习生', audience: '区域运营经理',
      title: '9 月杯量下降，是哪种下单方式少了？',
      brief: '区域运营经理发现 9 月总杯量比 8 月少了，门店说堂食和自提都正常。你来拆一下看看。',
      gen: { seed: 3010, n: 420, freq: 0.12, dimTable: 'customers', dimKey: 'customer_id', factTable: 'orders', factKey: 'order_id', dateCol: 'order_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('member', '会员', 'd', [['会员', 40], ['非会员', 60]]), D_('order_channel', '下单方式', 'f', [['门店自提', 45], ['外卖', 35], ['堂食', 20]])],
        metric: { type: 'count', name: '杯量（订单数）' },
        driver: { col: 'delivery_fee', label: '配送费（元）', base: 3, noise: 1, shift: 2.3 }, cause: { col: 'order_channel', val: '外卖', f: 0.55 }, herring: 'member' } },
    { id: '011', stars: 3, industry: '出海', company: '某出海 DTC 品牌', role: '海外投放实习生', audience: '投放负责人',
      title: '广告点击后的购买转化率下降',
      brief: '投放负责人发现 9 月广告点击量正常，但点击后的购买转化率掉了。预算是按平台分的，他想知道要不要调整预算。',
      gen: { seed: 3011, n: 600, freq: 0.1, dimTable: 'visitors', dimKey: 'visitor_id', factTable: 'ad_clicks', factKey: 'click_id', dateCol: 'click_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('country', '国家', 'd', [['US', 40], ['UK', 20], ['DE', 20], ['FR', 20]]), D_('platform', '广告平台', 'f', [['Google', 35], ['Meta', 35], ['TikTok', 30]])],
        metric: { type: 'rate', col: 'is_purchased', name: '购买转化率', base: 0.06, note: 'is_purchased = 1 表示点击后下单了' },
        driver: { col: 'landing_load_seconds', label: '落地页加载时长（秒）', base: 1.5, noise: 0.5, shift: 2.6 }, cause: { col: 'platform', val: 'TikTok', f: 0.4 }, herring: 'country' } },
    { id: '012', stars: 2, industry: '内容', company: '某短视频平台', role: '创作者运营实习生', audience: '创作者运营负责人',
      title: '创作者发布量下降',
      brief: '9 月平台每天新发布的视频数下降了。创作者运营负责人担心是头部创作者流失，让你先看数据。',
      gen: { seed: 3012, n: 400, freq: 0.12, dimTable: 'creators', dimKey: 'creator_id', factTable: 'posts', factKey: 'post_id', dateCol: 'post_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('creator_level', '创作者等级', 'd', [['新人', 45], ['成长', 35], ['头部', 20]]), D_('content_category', '内容类别', 'd', [['美食', 25], ['美妆', 25], ['知识', 25], ['游戏', 25]])],
        metric: { type: 'count', name: '发布量' },
        driver: { col: 'review_hours', label: '审核时长（小时）', base: 2, noise: 0.8, shift: 4 }, cause: { col: 'creator_level', val: '新人', f: 0.5 }, herring: 'content_category' } },
    { id: '013', stars: 3, industry: '金融', company: '某银行信用卡中心', role: '营销分析实习生', audience: '获客团队',
      title: '新发信用卡的激活率下降',
      brief: '9 月新发卡片的激活率比 8 月低。获客团队想知道是哪个申请渠道出了问题，好决定下个月的营销预算。',
      gen: { seed: 3013, n: 1600, mode: 'once', dimTable: 'applicants', dimKey: 'applicant_id', factTable: 'cards', factKey: 'card_id', dateCol: 'issue_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('apply_channel', '申请渠道', 'd', [['手机银行', 45], ['线下网点', 30], ['地推', 25]]), D_('age_group', '年龄段', 'd', AGE)],
        metric: { type: 'rate', col: 'activated', name: '激活率', base: 0.72, note: 'activated = 1 表示收到卡后 30 天内激活了' },
        driver: { col: 'delivery_days', label: '寄卡天数', base: 3, noise: 1, shift: 2.3 }, cause: { col: 'apply_channel', val: '地推', f: 0.6 }, herring: 'age_group' } },
    { id: '014', stars: 2, industry: '零售', company: '某社区团购平台', role: '用户运营实习生', audience: '用户运营负责人',
      title: '新用户 14 日复购率下降',
      brief: '9 月新用户首单后 14 天内再次下单的比例掉了。用户运营负责人怀疑是新开的社区团长服务没跟上。',
      gen: { seed: 3014, n: 1500, mode: 'once', dimTable: 'users', dimKey: 'user_id', factTable: 'first_orders', factKey: 'order_id', dateCol: 'order_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('community_type', '社区类型', 'd', [['成熟社区', 60], ['新开社区', 40]]), D_('age_group', '年龄段', 'd', AGE)],
        metric: { type: 'rate', col: 'repurchased_14d', name: '14 日复购率', base: 0.38, note: 'repurchased_14d = 1 表示 14 天内又下了单' },
        driver: { col: 'delivery_days', label: '到货天数', base: 1, noise: 0.3, shift: 2.5 }, cause: { col: 'community_type', val: '新开社区', f: 0.55 }, herring: 'age_group' } },
    { id: '015', stars: 3, industry: '旅游', company: '某在线旅游平台', role: '酒店业务分析实习生', audience: '酒店业务负责人',
      title: '酒店预订取消率上升',
      brief: '9 月酒店订单的取消率明显上升，商家投诉变多。业务负责人让你先查是哪类酒店、哪些订单在取消。',
      gen: { seed: 3015, n: 500, freq: 0.1, dimTable: 'users', dimKey: 'user_id', factTable: 'bookings', factKey: 'booking_id', dateCol: 'booking_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('member_level', '会员等级', 'd', [['普通', 60], ['金卡', 28], ['铂金', 12]]), D_('hotel_type', '酒店类型', 'f', [['经济型', 45], ['舒适型', 35], ['高档型', 20]])],
        metric: { type: 'rate', col: 'cancelled', name: '取消率', base: 0.12, note: 'cancelled = 1 表示订单被取消' },
        driver: { col: 'lead_days', label: '提前预订天数', base: 5, noise: 2, shift: 2.4 }, cause: { col: 'hotel_type', val: '经济型', f: 2.2 }, herring: 'member_level' } },
    { id: '016', stars: 3, industry: '美妆', company: '某国货美妆品牌', role: '品牌营销实习生', audience: '品牌营销经理',
      title: '小红书种草笔记的转化率下降',
      brief: '9 月品牌在小红书投的笔记点击量不错，但点进商品页后下单的比例低了。营销经理想知道该砍哪类达人的预算。',
      gen: { seed: 3016, n: 600, freq: 0.1, dimTable: 'users', dimKey: 'user_id', factTable: 'note_clicks', factKey: 'click_id', dateCol: 'click_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('city_tier', '城市等级', 'd', TIER), D_('kol_tier', '达人等级', 'f', [['头部达人', 25], ['腰部达人', 35], ['素人', 40]])],
        metric: { type: 'rate', col: 'is_converted', name: '下单转化率', base: 0.08, note: 'is_converted = 1 表示点击后下单了' },
        driver: { col: 'discount_rate', label: '专属折扣力度（%）', base: 20, noise: 4, shift: 0.3 }, cause: { col: 'kol_tier', val: '头部达人', f: 0.45 }, herring: 'city_tier' } },
    { id: '017', stars: 4, industry: '物流', company: '某快递公司', role: '服务质量分析实习生', audience: '客服中心负责人',
      title: '快递投诉率上升',
      brief: '9 月客服中心接到的投诉明显变多。负责人想知道是哪个区域出了问题，好安排专项整改。',
      gen: { seed: 3017, n: 500, freq: 0.12, dimTable: 'customers', dimKey: 'customer_id', factTable: 'parcels', factKey: 'parcel_id', dateCol: 'ship_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('customer_type', '客户类型', 'd', [['个人', 70], ['商家', 30]]), D_('region', '区域', 'f', [['华东', 30], ['华南', 25], ['华北', 25], ['西南', 20]])],
        metric: { type: 'rate', col: 'complained', name: '投诉率', base: 0.04, note: 'complained = 1 表示这单被投诉了' },
        driver: { col: 'delivery_hours', label: '配送时长（小时）', base: 36, noise: 8, shift: 1.6 }, cause: { col: 'region', val: '华南', f: 2.8 }, herring: 'customer_type' } },
    { id: '018', stars: 3, industry: '汽车', company: '某新能源车品牌', role: '销售运营实习生', audience: '销售运营总监',
      title: '试驾后下单转化率下降',
      brief: '9 月试驾后下定的比例比 8 月低。销售运营总监想知道是哪座城市的问题，下周要去门店巡检。',
      gen: { seed: 3018, n: 1400, mode: 'once', dimTable: 'leads', dimKey: 'lead_id', factTable: 'test_drives', factKey: 'drive_id', dateCol: 'drive_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('city', '城市', 'd', [['成都', 25], ['上海', 25], ['杭州', 25], ['深圳', 25]]), D_('lead_source', '线索来源', 'd', [['官网', 35], ['门店', 35], ['抖音', 30]])],
        metric: { type: 'rate', col: 'is_ordered', name: '下定转化率', base: 0.2, note: 'is_ordered = 1 表示试驾后下了定金' },
        driver: { col: 'wait_weeks', label: '交付等待（周）', base: 4, noise: 1, shift: 2.0 }, cause: { col: 'city', val: '成都', f: 0.5 }, herring: 'lead_source' } },
    { id: '019', stars: 2, industry: '内容', company: '某音乐 App', role: '会员运营实习生', audience: '会员业务负责人',
      title: '会员续费率下降',
      brief: '9 月会员续费率下降，会员业务负责人想知道是不是 9 月的调价影响了续费。',
      gen: { seed: 3019, n: 900, mode: 'monthly', dimTable: 'members', dimKey: 'member_id', factTable: 'renewals', factKey: 'renewal_id', dateCol: 'renew_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('pay_type', '付费方式', 'd', [['连续包月', 55], ['单月购买', 45]]), D_('age_group', '年龄段', 'd', AGE)],
        metric: { type: 'rate', col: 'renewed', name: '续费率', base: 0.7, note: 'renewed = 1 表示这个月续费了' },
        driver: { col: 'price', label: '月费（元）', base: 15, noise: 0, shift: 1.2 }, cause: { col: 'pay_type', val: '单月购买', f: 0.65 }, herring: 'age_group' } },
    { id: '020', stars: 4, industry: '出海', company: '某出海 B2B SaaS 公司', role: 'GTM 实习生', audience: '海外销售负责人',
      title: '海外线索转化率下降：MQL 到 SQL 卡在哪里？',
      brief: '9 月市场部带来的线索（MQL）数量正常，但被销售认可为有效商机（SQL）的比例掉了。海外销售负责人要你找出卡在哪个区域、为什么。',
      gen: { seed: 3020, n: 1600, mode: 'once', dimTable: 'leads', dimKey: 'lead_id', factTable: 'lead_events', factKey: 'event_id', dateCol: 'created_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('region', '区域', 'd', [['北美', 30], ['欧洲', 25], ['东南亚', 25], ['中东', 20]]), D_('company_size', '公司规模', 'd', [['中小企业', 60], ['大型企业', 40]])],
        metric: { type: 'rate', col: 'is_qualified', name: 'MQL→SQL 转化率', base: 0.3, note: 'is_qualified = 1 表示线索被销售认可为有效商机' },
        driver: { col: 'response_hours', label: '销售首次响应时长（小时）', base: 6, noise: 2, shift: 3.5 }, cause: { col: 'region', val: '东南亚', f: 0.5 }, herring: 'company_size' } },
    { id: '021', stars: 3, industry: '健身', company: '某健身 App', role: '增长分析实习生', audience: '会员增长负责人',
      title: '体验课结束后，付费转化率下降',
      brief: '9 月体验课用户转成付费会员的比例掉了。会员增长负责人想知道是哪类用户不买账，以及体验课本身有没有出问题。',
      gen: { seed: 3021, n: 1500, mode: 'once', dimTable: 'users', dimKey: 'user_id', factTable: 'trials', factKey: 'trial_id', dateCol: 'trial_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('city_tier', '城市等级', 'd', TIER), D_('age_group', '年龄段', 'd', AGE), D_('goal', '健身目标', 'd', [['减脂', 45], ['增肌', 30], ['塑形', 25]])],
        metric: { type: 'rate', col: 'is_paid', name: '付费转化率', base: 0.26, note: 'is_paid = 1 表示体验结束后买了会员' },
        driver: { col: 'trial_classes', label: '体验课节数', base: 3, noise: 0, shift: 0.34 }, cause: { col: 'goal', val: '减脂', f: 0.55 }, herring: 'age_group' } },
    { id: '022', stars: 3, industry: '直播电商', company: '某直播电商平台', role: '直播运营实习生', audience: '直播业务负责人',
      title: '直播间 GMV 下滑，是主播的问题还是流量的问题？',
      brief: '9 月直播间 GMV 比 8 月少了一截。直播业务负责人收到两种说法：一种说是流量少了，一种说是达人带货不行了。你来用数据判断。',
      gen: { seed: 3022, n: 700, freq: 0.04, dimTable: 'viewers', dimKey: 'viewer_id', factTable: 'live_orders', factKey: 'order_id', dateCol: 'order_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('fan_status', '是否粉丝', 'd', [['粉丝', 40], ['非粉丝', 60]]), D_('device', '设备', 'd', DEVICE), D_('host_type', '直播类型', 'f', [['品牌自播', 45], ['达人直播', 55]])],
        metric: { type: 'sum', col: 'gmv', name: 'GMV', base: 160 },
        driver: { col: 'coupon', label: '直播间优惠券面额（元）', base: 30, noise: 6, shift: 0.3 }, cause: { col: 'host_type', val: '达人直播', f: 0.5 }, herring: 'device' } },
    { id: '023', stars: 2, industry: '出行', company: '某共享单车公司', role: '城市运营实习生', audience: '城市运营经理',
      title: '9 月骑行量下降，哪些点位出了问题？',
      brief: '城市运营经理发现 9 月的骑行订单比 8 月少了，天气其实差不多。他让你看看是不是某类点位出了问题。',
      gen: { seed: 3023, n: 450, freq: 0.12, dimTable: 'riders', dimKey: 'rider_id', factTable: 'rides', factKey: 'ride_id', dateCol: 'ride_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('member', '会员类型', 'd', [['月卡会员', 40], ['普通用户', 60]]), D_('zone', '点位类型', 'f', [['地铁口', 30], ['写字楼', 25], ['高校', 20], ['居民区', 25]])],
        metric: { type: 'count', name: '骑行量' },
        driver: { col: 'bikes_available', label: '可用车辆数', base: 20, noise: 4, shift: 0.35 }, cause: { col: 'zone', val: '地铁口', f: 0.55 }, herring: 'member' } },
    { id: '024', stars: 3, industry: '医疗', company: '某互联网医院', role: '运营分析实习生', audience: '门诊运营主管',
      title: '预约挂号的爽约率上升',
      brief: '9 月预约后不来就诊的比例明显上升，医生排班被浪费。门诊运营主管想知道是哪个科室、哪类病人在爽约。',
      gen: { seed: 3024, n: 500, freq: 0.1, dimTable: 'patients', dimKey: 'patient_id', factTable: 'appointments', factKey: 'appt_id', dateCol: 'appt_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('age_group', '年龄段', 'd', AGE), D_('insurance', '支付方式', 'd', [['医保', 65], ['自费', 35]]), D_('dept', '科室', 'f', [['儿科', 25], ['内科', 30], ['皮肤科', 25], ['口腔科', 20]])],
        metric: { type: 'rate', col: 'no_show', name: '爽约率', base: 0.08, note: 'no_show = 1 表示预约了但没来' },
        driver: { col: 'wait_days', label: '预约等待天数', base: 3, noise: 1, shift: 2.5 }, cause: { col: 'dept', val: '皮肤科', f: 2.4 }, herring: 'insurance' } },
    { id: '025', stars: 3, industry: '招聘', company: '某招聘平台', role: '产品分析实习生', audience: '求职端产品经理',
      title: '职位浏览后的投递率下降',
      brief: '9 月求职者看了职位之后点"投递"的比例下降了。求职端产品经理怀疑是新上线的申请表太长，让你用数据验证。',
      gen: { seed: 3025, n: 600, freq: 0.1, dimTable: 'seekers', dimKey: 'seeker_id', factTable: 'job_views', factKey: 'view_id', dateCol: 'view_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('degree', '学历', 'd', [['本科', 50], ['硕士', 25], ['大专', 25]]), D_('city_tier', '城市等级', 'd', TIER), D_('job_type', '职位类型', 'f', [['技术', 30], ['市场', 25], ['运营', 25], ['销售', 20]])],
        metric: { type: 'rate', col: 'is_applied', name: '投递率', base: 0.12, note: 'is_applied = 1 表示看完职位后投递了' },
        driver: { col: 'form_fields', label: '申请表字段数', base: 8, noise: 1, shift: 2 }, cause: { col: 'job_type', val: '市场', f: 0.5 }, herring: 'degree' } },
    { id: '026', stars: 4, industry: '出海', company: '某跨境物流公司', role: '海外运营实习生', audience: '海外线路负责人',
      title: '跨境包裹准时妥投率下降',
      brief: '9 月准时送达的包裹比例下降了，大卖家开始投诉。海外线路负责人要你找出是哪条线路出了问题、卡在哪个环节。',
      gen: { seed: 3026, n: 400, freq: 0.15, dimTable: 'shippers', dimKey: 'shipper_id', factTable: 'shipments', factKey: 'shipment_id', dateCol: 'ship_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('shipper_size', '卖家规模', 'd', [['中小卖家', 65], ['大卖家', 35]]), D_('dest', '目的国', 'f', [['美国', 35], ['英国', 20], ['德国', 25], ['日本', 20]])],
        metric: { type: 'rate', col: 'on_time', name: '准时妥投率', base: 0.9, note: 'on_time = 1 表示在承诺时效内送达' },
        driver: { col: 'customs_hours', label: '清关时长（小时）', base: 24, noise: 6, shift: 2.6 }, cause: { col: 'dest', val: '德国', f: 0.7 }, herring: 'shipper_size' } },
    { id: '027', stars: 3, industry: '本地生活', company: '某外卖平台', role: '配送策略实习生', audience: '配送运营负责人',
      title: '骑手准时率下降，是天气还是运力？',
      brief: '9 月骑手准时送达率下降，大家第一反应是"下雨多了"。配送运营负责人让你别急着下结论，用数据拆一下。',
      gen: { seed: 3027, n: 300, freq: 0.3, dimTable: 'riders', dimKey: 'rider_id', factTable: 'deliveries', factKey: 'delivery_id', dateCol: 'delivery_date', p1: '2026-08', p2: '2026-09',
        dims: [D_('rider_type', '骑手类型', 'd', [['专送', 55], ['众包', 45]]), D_('tenure', '骑手资历', 'd', [['新骑手', 35], ['老骑手', 65]]), D_('weather', '天气', 'f', [['晴', 75], ['雨', 25]])],
        metric: { type: 'rate', col: 'is_on_time', name: '准时率', base: 0.93, note: 'is_on_time = 1 表示准时送达' },
        driver: { col: 'orders_per_hour', label: '每小时接单量', base: 2.5, noise: 0.5, shift: 1.6 }, cause: { col: 'rider_type', val: '众包', f: 0.78 }, herring: 'weather' } }
  ];
  TEMPLATES.forEach(function (s) { s.engine = true; s.free = false; s.db = 'p' + s.id; s.steps = engineSteps(s); });

  /* 由模板派生出更多项目：换一个原因、换月份、换难度，每个项目的数据和答案都不一样 */
  var MONTHS = [['2026-03', '2026-04'], ['2026-04', '2026-05'], ['2026-05', '2026-06'], ['2026-06', '2026-07'], ['2026-07', '2026-08'], ['2026-08', '2026-09'], ['2026-09', '2026-10'], ['2026-10', '2026-11']];
  var T_DOWN = ['问题出在哪？', '是谁拖了后腿？', '找出真正的原因', '先拆开再下结论', '别急着怪大盘'];
  var T_UP = ['是谁在拉高？', '原因藏在哪？', '找出真正的原因', '先拆开再下结论', '是个别现象还是全面变差？'];
  var B_WHERE = ['周会', '月度复盘会', '业务群', '周报', '和老板的 1 对 1'];
  var B_ASK = ['想知道问题出在哪一部分。', '让你先把数据拆开看看。', '需要你在下周前给出原因和建议。', '怀疑是某一类用户出了问题，让你验证一下。', '让你给一个能落地的改进建议。'];
  function sp(a, b) { return a + (/^[A-Za-z0-9]/.test(b) ? ' ' : '') + b; }
  function variant(base, k, seed, opts) {
    opts = opts || {};
    var r = rng(seed), g = JSON.parse(JSON.stringify(base.gen));
    g.seed = seed;
    var bad = base.gen.cause.f < 1 ? 'down' : 'up';
    var cands = [];
    g.dims.forEach(function (d) { d.vals.forEach(function (v) { if (v[1] >= 20 && !(d.col === base.gen.cause.col && v[0] === base.gen.cause.val)) cands.push([d.col, v[0]]); }); });
    var pick1 = cands[(k * 7 + Math.floor(r() * cands.length)) % cands.length];
    var f = bad === 'down' ? 0.42 + r() * 0.2 : 1.9 + r() * 0.8;
    if (base.gen.metric.type === 'rate' && bad === 'down' && base.gen.metric.base > 0.85) f = 0.68 + r() * 0.1;
    if (base.gen.metric.type === 'rate' && bad === 'down' && base.gen.metric.base < 0.1) f = 0.25 + r() * 0.1;
    g.cause = { col: pick1[0], val: pick1[1], f: Math.round(f * 100) / 100 };
    var rest = g.dims.filter(function (d) { return d.col !== g.cause.col; });
    g.herring = rest[Math.floor(r() * rest.length)].col;
    var stars = opts.stars || [3, 4, 5, 2, 4][k % 5];
    var third = g.dims.filter(function (d) { return d.col !== g.cause.col && d.col !== g.herring; })[0];
    if (stars >= 5 && third) {
      var tv = third.vals.filter(function (v) { return v[1] >= 20; }); tv = tv.length ? tv : third.vals;
      g.cause2 = { col: third.col, val: tv[Math.floor(r() * tv.length)][0], f: bad === 'down' ? 0.8 : 1.35 };
    }
    var mp = MONTHS[(k * 3 + Math.floor(r() * MONTHS.length)) % MONTHS.length]; g.p1 = mp[0]; g.p2 = mp[1];
    var m1 = monthCn(g.p1), m2 = monthCn(g.p2), mn = g.metric.name;
    var spec = {
      id: opts.id, stars: stars, industry: base.industry, company: base.company, role: opts.role || base.role, audience: base.audience,
      title: sp(m2, mn) + (bad === 'down' ? '下降' : '上升') + '：' + (bad === 'down' ? T_DOWN : T_UP)[(k + seed) % 5],
      brief: base.audience + '在' + B_WHERE[(seed + k) % 5] + '里提到：' + m2 + '的' + sp('', mn) + '和 ' + m1 + '比明显' + (bad === 'down' ? '变差了' : '升高了') + '，' + B_ASK[(seed + 2 * k) % 5],
      gen: g, engine: true, free: false
    };
    spec.db = 'p' + spec.id;
    spec.steps = engineSteps(spec);
    return spec;
  }
  var ENGINE = TEMPLATES.slice();
  (function () {
    var next = 28, k = 1;
    while (next <= 100) {
      for (var t = 0; t < TEMPLATES.length && next <= 100; t++) {
        var id = String(next).padStart(3, '0');
        ENGINE.push(variant(TEMPLATES[t], k, 5000 + next * 37, { id: id }));
        next++;
      }
      k++;
    }
  })();

  /* VIP 定制：选行业 + 岗位 + 难度，系统换一个随机种子生成新数据 */
  function customSpec(opt) {
    var pool = TEMPLATES.filter(function (s) { return !opt.industry || s.industry === opt.industry; });
    if (!pool.length) pool = TEMPLATES;
    var r = rng(opt.seed), base = pool[Math.floor(r() * pool.length)];
    var id = 'C' + String(opt.seed).slice(-5);
    var spec = variant(base, Math.floor(r() * 5), opt.seed, { id: id, stars: opt.stars, role: opt.role });
    spec.custom = true;
    spec.title = '定制：' + spec.title;
    spec.brief = '这是为你定制的一套新数据。' + spec.brief + '原因藏在数据里，每次生成都不一样。';
    return spec;
  }

  var PROJECTS = HAND.concat(ENGINE);
  var INDUSTRIES = TEMPLATES.map(function (s) { return s.industry; }).filter(function (v, i, a) { return a.indexOf(v) === i; });

  var DIMS = [
    ['select', 'SELECT'], ['where', 'WHERE'], ['groupby', 'GROUP BY'], ['join', 'JOIN'],
    ['subquery', '子查询'], ['cte', 'CTE'], ['window', '窗口函数'], ['business', '业务思维']
  ];

  global.DATA = { buildShenglang: buildShenglang, buildWaimai: buildWaimai, buildEngine: buildEngine, customSpec: customSpec, INDUSTRIES: INDUSTRIES, LEVELS: LEVELS, QUESTIONS: Q, PROJECTS: PROJECTS, DIMS: DIMS };
})(typeof window !== 'undefined' ? window : globalThis);
