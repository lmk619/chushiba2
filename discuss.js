/* 讨论区示例内容（内测期占位）。
 * 这些是团队写的示例讨论，界面上会标注"示例"。正式上线后请替换为真实用户的帖子，
 * 不要把它们当成真实用户评价对外宣传。
 * thread：'q:题号' 对应练习题，'p:项目号' 对应实习项目。
 */
(function (global) {
  global.SEED_POSTS = [
    { thread: 'q:0-1', user: '早八人今天也没起来', meta: '大二 · 市场营销', time: '5 天前', likes: 46, text: '第一次在网页里跑出结果有点感动……之前装 MySQL 装了一下午都没装好，直接劝退' },
    { thread: 'q:0-1', user: '芒果不加冰', meta: '大三 · 国际经贸', time: '4 天前', likes: 12, text: '同！！而且右边能直接看表结构，不用自己 DESC 半天', reply: true },
    { thread: 'q:1-4', user: '数分小白在努力', meta: '大三 · 会计学', time: '6 天前', likes: 23, text: '原来 SELECT 里面可以直接乘……我一直以为计算要在 Excel 里做完再导进来 hhh' },
    { thread: 'q:2-3', user: '凌晨三点的WHERE', meta: '研一 · 应用统计', time: '3 天前', likes: 88, text: '血泪教训：AND 和 OR 一起用一定要加括号！！我没加括号，结果把英国所有用户都查出来了，行数对不上找了半小时' },
    { thread: 'q:2-3', user: 'Kiki的SQL日记', meta: '大四 · 金融学', time: '3 天前', likes: 31, text: '+1 导师第二级提示直接点出来了"AND 的优先级比 OR 高"，面试好像也问过这个', reply: true },
    { thread: 'q:2-6', user: '一只想进大厂的鹅', meta: '大三 · 新闻传播', time: '1 周前', likes: 54, text: '我写的 city = NULL 一直返回 0 行……原来 NULL 不能用等号判断，要写 IS NULL。这个坑记住了' },
    { thread: 'q:3-6', user: '周末不想上班', meta: '大三 · 工商管理', time: '2 天前', likes: 9, text: 'SQLite 没有 DATEDIFF 有点不习惯，要用 julianday 相减。MySQL 里是 DATEDIFF(a, b)，面试写 MySQL 的同学注意一下区别' },
    { thread: 'q:4-4', user: '隔壁学数分的阿杰', meta: '大四 · 经济学', time: '4 天前', likes: 67, text: 'WHERE 和 HAVING 终于分清了：WHERE 是分组前筛行，HAVING 是分组后筛组。顺序是 FROM → WHERE → GROUP BY → HAVING → SELECT，背下来就不会乱' },
    { thread: 'q:4-4', user: '小鹿乱撞学SQL', meta: '大二 · 统计学', time: '4 天前', likes: 14, text: '谢谢楼上，这个执行顺序比我们老师讲得清楚', reply: true },
    { thread: 'q:4-5', user: '奶茶续命中', meta: '大三 · 市场营销', time: '2 天前', likes: 19, text: '算占比算出来全是 0？？后来发现整数除整数会变成 0，要先 * 1.0。这个真的太隐蔽了' },
    { thread: 'q:5-2', user: '想去出海公司的Lynn', meta: '研一 · 国际商务', time: '6 天前', likes: 73, text: 'LEFT JOIN + IS NULL 找"没下过单的人"这个套路太好用了，实习面试真的被问过"怎么找注册未转化用户"，当时没答上来（哭）' },
    { thread: 'q:5-3', user: '数分小白在努力', meta: '大三 · 会计学', time: '5 天前', likes: 28, text: '三表 JOIN 第一次写对！小技巧：先画一下表之间用哪个字段连，orders 在中间当桥，然后一个一个 JOIN 上去' },
    { thread: 'q:5-3', user: '芋泥波波', meta: '大二 · 电子商务', time: '5 天前', likes: 6, text: '我销售额一直偏大，后来发现忘了只算"已完成"……题目里写了我没看到', reply: true },
    { thread: 'q:6-3', user: '凌晨三点的WHERE', meta: '研一 · 应用统计', time: '1 天前', likes: 41, text: 'NOT IN 有个坑：子查询结果里只要有一个 NULL，整个 NOT IN 就会返回空。这题数据里没有 NULL 所以没事，但真实工作中建议用 NOT EXISTS 更稳' },
    { thread: 'q:7-1', user: 'Kiki的SQL日记', meta: '大四 · 金融学', time: '3 天前', likes: 36, text: '窗口函数入门题。ROW_NUMBER、RANK、DENSE_RANK 的区别建议去 7-4 自己跑一遍对比，比看十篇文章都清楚' },
    { thread: 'q:7-2', user: '早八人今天也没起来', meta: '大二 · 市场营销', time: '2 天前', likes: 17, text: '第一次用 WITH，感觉像是先在草稿纸上算好一个中间表，再拿来用。可读性比嵌套子查询好太多了' },
    { thread: 'q:8-1', user: '一只想进大厂的鹅', meta: '大三 · 新闻传播', time: '2 天前', likes: 112, text: '连续登录这题真的是面试高频！！"日期减行号"这个思路第一次看到的时候惊了，连续的日期减去连续的行号会得到同一个值，用它分组就行' },
    { thread: 'q:8-1', user: '隔壁学数分的阿杰', meta: '大四 · 经济学', time: '2 天前', likes: 25, text: '补充：一定要先按用户 PARTITION，再按日期排序，不然不同用户的行号会混在一起', reply: true },
    { thread: 'q:8-7', user: '想去出海公司的Lynn', meta: '研一 · 国际商务', time: '1 天前', likes: 33, text: "次日留存用自连接：b.login_date = date(a.login_date, '+1 day')。注意要 LEFT JOIN，不然第二天没登录的人直接被去掉了，留存率会变成 100%" },
    { thread: 'q:8-15', user: '奶茶续命中', meta: '大三 · 市场营销', time: '今天 10:21', likes: 8, text: 'SQLite 居然没有 MEDIAN 函数，只能自己用 ROW_NUMBER 排。不过这样反而更理解中位数的定义了' },
    { thread: 'p:001', user: '数分小白在努力', meta: '大三 · 会计学', time: '4 天前', likes: 95, text: '做完外卖这个项目才明白业务分析是什么感觉：先看总量掉了多少，再按用户类型拆，发现学生掉得最狠，再去看优惠……一步步像破案' },
    { thread: 'p:001', user: '周末不想上班', meta: '大三 · 工商管理', time: '4 天前', likes: 22, text: '注意 8 月 31 天、9 月 30 天！我结论里直接用总量比，被导师提醒要换成日均才公平', reply: true },
    { thread: 'p:001', user: '芒果不加冰', meta: '大三 · 国际经贸', time: '3 天前', likes: 18, text: '配送时长那一步是"排除法"，数据没变化也是结论。导师说写结论的时候要把排除掉的原因也写上，显得考虑全面' },
    { thread: 'p:002', user: '想去出海公司的Lynn', meta: '研一 · 国际商务', time: '5 天前', likes: 61, text: '声浪这个项目对想做出海的同学很有用。一开始以为是某款耳机不行，按商品拆发现每款都在掉，再按渠道拆才看到 TikTok 掉得最多。说明不是产品问题，是获客渠道的问题' },
    { thread: 'p:002', user: 'Kiki的SQL日记', meta: '大四 · 金融学', time: '5 天前', likes: 15, text: '这个项目写进简历可以写成"渠道归因分析"，面试官挺爱问的', reply: true },
    { thread: 'p:020', user: '一只想进大厂的鹅', meta: '大三 · 新闻传播', time: '1 天前', likes: 27, text: 'MQL → SQL 这个项目太 GTM 了，之前完全不知道这两个词。做完才知道市场部和销售之间还有个"线索交接"的环节，响应慢了转化就掉' },
    { thread: 'p:006', user: '凌晨三点的WHERE', meta: '研一 · 应用统计', time: '2 天前', likes: 12, text: '按周看趋势那一步用 LAG 算变化，能看出是从哪一周开始掉的，结论里可以写"从第 X 周开始"，比只说"9 月下降"有说服力' },
    { thread: 'p:009', user: '小鹿乱撞学SQL', meta: '大二 · 统计学', time: '今天 09:02', likes: 5, text: '流失率是越高越差，和别的项目方向相反，写结论的时候差点写反了 hhh' },
    { thread: 'q:4-2', user: '芋泥波波', meta: '大二 · 电子商务', time: '6 天前', likes: 11, text: 'GROUP BY 之后 SELECT 里只能放分组的列和聚合函数，我把 name 也放进去了，SQLite 没报错但结果很奇怪。MySQL 严格模式会直接报错' },
    { thread: 'q:1-3', user: '小鹿乱撞学SQL', meta: '大二 · 统计学', time: '1 周前', likes: 7, text: 'DESC 是降序，ASC 是升序，默认是升序。我一开始以为 DESC 是 describe 的意思……' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
