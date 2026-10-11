// 从 public/assets/data.js 自动生成 docs/内容清单.md，保证文档和代码一致
// 用法：node scripts/gen-catalog.cjs
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '../public/assets/data.js'));
const D = globalThis.DATA;
const esc = s => String(s).replace(/\|/g, '\\|');
const L = [];
L.push('# 内容清单', '', '> 本文件由 `scripts/gen-catalog.cjs` 根据 `public/assets/data.js` 自动生成，请勿手动修改。', '');
L.push('## 一、练习题（第 0–8 关，全部免费）', '', `共 **${D.QUESTIONS.length}** 道，全部基于虚构的出海消费电子品牌"声浪科技"的同一个数据库。`, '');
L.push('| 关卡 | 主题 | 题数 | 对应能力维度 |', '|---|---|---|---|');
D.LEVELS.slice(0, 9).forEach(l => { const n = D.QUESTIONS.filter(q => q.lv === l.no).length; L.push(`| 第 ${l.no} 关 | ${l.name} | ${n} | ${l.dim ? (D.DIMS.find(d => d[0] === l.dim) || [, l.dim])[1] : '—'} |`); });
L.push('');
D.LEVELS.slice(0, 9).forEach(l => {
  L.push(`### 第 ${l.no} 关 · ${l.name}`, '', l.intro, '', '| 题号 | 题目 | 考点 |', '|---|---|---|');
  D.QUESTIONS.filter(q => q.lv === l.no).forEach(q => L.push(`| ${q.id} | ${esc(q.title)} | ${esc(q.k || '')} |`));
  L.push('');
});
const P = D.PROJECTS;
const star = n => '★'.repeat(n);
L.push('## 二、实习项目（第 9 关）', '', `共 **${P.length}** 个，001、002 免费，其余为 VIP。`, '');
const byStar = {}; P.forEach(p => byStar[p.stars] = (byStar[p.stars] || 0) + 1);
const byInd = {}; P.forEach(p => { const k = p.industry || (p.id === '001' ? '本地生活' : '出海'); byInd[k] = (byInd[k] || 0) + 1; });
L.push('**难度分布：** ' + Object.keys(byStar).sort().map(k => `${star(+k)} ${byStar[k]} 个`).join('，'), '');
L.push('**行业分布：** ' + Object.entries(byInd).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('，'), '');
L.push('**难度说明：**', '', '| 难度 | 步骤 |', '|---|---|',
  '| ★2 | 描述 → 两个维度拆解 → 驱动指标归因 → 结论 |',
  '| ★3 | ★2 + 对照组（问题组 vs 其他） |',
  '| ★4 | ★3 + 周趋势与 LAG 环比 |',
  '| ★5 | ★4 + 第三个拆解维度 + 交叉拆解 + 贡献度（数量 / 金额类指标）；部分项目埋入次要原因 |', '');
L.push('| 编号 | 公司（虚构） | 行业 | 项目 | 难度 | 步骤数 | 免费 |', '|---|---|---|---|---|---|---|');
P.forEach(p => L.push(`| ${p.id} | ${esc(p.company)} | ${p.industry || (p.id === '001' ? '本地生活' : '出海')} | ${esc(p.title)} | ${star(p.stars)} | ${p.steps.length} | ${p.free ? '✓' : ''} |`));
L.push('', '## 三、项目引擎是怎么造数据的', '',
  '1. 每个模板定义一张维度表（用户 / 门店 / 线索…）和一张事实表（订单 / 会话 / 申请…），以及可拆的维度、指标类型（数量、金额、平均值、比例）和一个驱动指标（优惠、价格、等待时长…）。',
  '2. 第二个月里，某个维度取某个值的那部分数据被乘上一个系数——这就是要学生找出的"真正原因"；同时驱动指标跟着变化，用来做归因验证。',
  '3. 另选一个维度作为"干扰项"，它的数据没有被改动，学生需要通过拆解排除它。',
  '4. ★5 项目可能再埋一个影响更小的次要原因。',
  '5. 所有步骤的题目和参考 SQL 由引擎根据模板自动生成；用固定随机种子，每次打开数据都一样。VIP 定制项目换一个随机种子，生成全新的一套。', '');
fs.writeFileSync(path.join(__dirname, '../docs/内容清单.md'), L.join('\n'));
console.log('written', D.QUESTIONS.length, 'questions', P.length, 'projects');
