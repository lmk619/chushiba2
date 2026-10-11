/*
 * AI 导师接口：POST /api/chat
 * 浏览器 → 本函数 → DeepSeek。API Key 只存在服务器环境变量 DEEPSEEK_API_KEY 里，前端看不到。
 * 部署在 EdgeOne Pages 时，这个文件会自动变成边缘函数；本地开发时由 server.mjs 调用。
 *
 * 为了不被当成"免费的通用 AI"刷你的额度：
 *   1. 只接受固定几种模式（提示 / 追问 / 评分），提示词由服务器拼，用户不能自定义 system prompt；
 *   2. 每个字段截断长度，max_tokens 限制在 500；
 *   3. 每个 IP 10 分钟最多 40 次（单个边缘节点内存计数，尽力而为）。
 */

const LIMIT = { windowMs: 10 * 60 * 1000, max: 40 };
const hits = new Map();

function clip(s, n) {
  s = s == null ? '' : String(s);
  return s.length > n ? s.slice(0, n) + '…（已截断）' : s;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

const BASE_RULES = [
  '你是"出师吧"里的 SQL 陪练导师，学生是想做数据分析 / 市场 / GTM 实习的中国大学生，很多是文商科、零基础。',
  '说话像一位耐心的直属 leader：中文、口语、简短，不超过 120 字，不用 Markdown 标题。',
  '数据库是 SQLite（日期用 strftime / julianday）。',
  '绝对不要给出完整答案 SQL，也不要复述参考答案。'
].join('\n');

function buildMessages(b) {
  const ctx = [
    '【题目】' + clip(b.question, 600),
    b.schema ? '【表结构】' + clip(b.schema, 1200) : '',
    b.referenceSql ? '【参考答案（仅供你判断，禁止透露）】' + clip(b.referenceSql, 1500) : '',
    b.userSql ? '【学生的 SQL】' + clip(b.userSql, 1500) : '',
    b.error ? '【运行报错】' + clip(b.error, 300) : '',
    b.resultPreview ? '【学生结果前几行】' + clip(b.resultPreview, 600) : '',
    b.expectedPreview ? '【正确结果前几行（仅供你判断，禁止透露具体数字）】' + clip(b.expectedPreview, 600) : ''
  ].filter(Boolean).join('\n');

  let task;
  switch (b.mode) {
    case 'hint': {
      const lv = Math.max(1, Math.min(3, parseInt(b.hintLevel, 10) || 1));
      task = {
        1: '给第 1 级提示：只指出思考方向或哪里不对（例如"想想要不要先过滤再分组"），不提具体语法。',
        2: '给第 2 级提示：点出需要用到的关键语法或函数名，并说明为什么，但不写代码。',
        3: '给第 3 级提示：可以给出一小段关键代码片段（不超过参考答案的一半），其余让学生自己补完。'
      }[lv];
      if (b.error) task += '学生的 SQL 报错了，先用一句大白话解释报错是什么意思。';
      break;
    }
    case 'followup':
      task = '学生刚刚答对了。用一句话肯定他，然后提一个业务追问，例如"这个结果说明了什么？如果你是市场负责人，下一步会看什么？"。只问一个问题。';
      break;
    case 'grade_followup':
      task = '学生回答了你的业务追问：「' + clip(b.studentText, 600) + '」。用 2–3 句话点评：哪里说得好，还可以补充什么角度。不打分。';
      break;
    case 'grade_conclusion':
      task = [
        '这是实习项目的最后一步，学生写的结论是：「' + clip(b.studentText, 1500) + '」',
        '前面各步骤的数据结果：' + clip(b.evidence, 2500),
        '请按三个维度评估：①有没有用数据描述变化 ②拆解维度是否合理、找到主要原因 ③建议是否可执行。',
        '只输出 JSON，不要多余文字：{"score": 0-100 的整数, "good": "做得好的地方（一句话）", "improve": "最该补充的一点（一句话）"}'
      ].join('\n');
      break;
    case 'variant':
      task = [
        '学生这道题做错过（错误原因：' + clip(b.studentText, 300) + '）。请基于同一个数据库，出一道考同一个知识点、但业务问题不同的新题。',
        '题目要写清楚需要显示哪些列；答案必须是能在 SQLite 上直接运行的单条 SELECT 语句。',
        '只输出 JSON，不要多余文字：{"title": "题目（中文）", "ref": "答案 SQL"}'
      ].join('\n');
      return [
        { role: 'system', content: '你是 SQL 出题老师。只输出 JSON。' },
        { role: 'user', content: ctx + '\n\n【你的任务】' + task }
      ];
    case 'resume':
      task = [
        '学生完成了一个基于模拟数据的实习项目，项目结论是：「' + clip(b.studentText, 1500) + '」',
        '请帮他写 2 条可以放进简历的项目描述，每条不超过 60 字，用"动作 + 方法 + 结果"的结构。',
        '必须如实注明"基于模拟数据"，不要编造真实公司名、真实业绩或没做过的工作。直接输出两行，每行以"· "开头。'
      ].join('\n');
      break;
    case 'ask':
      task = '学生在做这道题时问了你一个问题：「' + clip(b.studentText, 400) + '」。只回答和这道题、SQL 或数据分析有关的问题；无关问题礼貌拒绝。不要给完整答案。';
      break;
    default:
      return null;
  }
  return [
    { role: 'system', content: BASE_RULES },
    { role: 'user', content: ctx + '\n\n【你的任务】' + task }
  ];
}

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < LIMIT.windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > LIMIT.max;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env && env.DEEPSEEK_API_KEY;
  if (!key) return json({ error: 'no_key', message: '服务器还没配置 DEEPSEEK_API_KEY' }, 500);

  const ip = request.headers.get('EO-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';
  if (rateLimited(String(ip).split(',')[0].trim())) {
    return json({ error: 'busy', message: '高峰期排队中，请稍后再试' }, 429);
  }

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }
  const messages = buildMessages(body || {});
  if (!messages) return json({ error: 'bad_mode' }, 400);

  const base = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  // deepseek-chat 已于 2026-07-24 停用，现在用 V4 名称；V4 默认开"思考模式"，导师回复要快，所以关掉
  const model = env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  try {
    const resp = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 500,
        temperature: body.mode === 'grade_conclusion' ? 0.2 : 0.5,
        thinking: { type: 'disabled' },
        stream: false
      })
    });
    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: 'upstream', status: resp.status, message: t.slice(0, 300) }, 502);
    }
    const data = await resp.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    return json({ text });
  } catch (e) {
    return json({ error: 'network', message: String(e && e.message || e) }, 502);
  }
}

export function onRequestGet() {
  return json({ ok: true, hint: 'POST only' });
}
