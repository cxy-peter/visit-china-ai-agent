# V6.1 官方资料发现与便民服务更新

核查日期：2026-09-25。网页索引、新闻报道、适用政策和服务实时库存分别记录。政府发布不等于每个历史事实今天仍适用；供应商介绍也不等于本项目已经接入该供应商的交易接口。

## 1. Tengopay 的名称与最近更新

用户输入的 `Tengopay` / `TengoPay` 很可能指 **TenPayGo**。检索别名可以帮助召回，但回答需要说“你可能指 TenPayGo”，不能将任意同名钱包自动等同于腾讯产品。

- [TenPayGo 官网](https://tenpaygo.com/)：页面的官方介绍元数据写明，可用支持的国际银行卡、Apple Pay、境外电子钱包，在微信支付商户消费，不需要中国手机号或微信账号。
- [腾讯发布的 App Store 正文](https://apps.apple.com/us/app/tenpaygo/id6778755338)：开发者为 Tencent Technology (Shenzhen) Company Limited，介绍微信支付商户付款、日常消费、交易记录；明确更多交通和生活服务逐步推出。
- [2026-09-24 官方微信派公告链接](https://mp.weixin.qq.com/s/Xk95ohQHyVr4ul27yyvLvQ)：通过[香港商报当日发布报道](https://hkcd.com/hkcdweb/content/2026/09/24/content_8776909.html)及多个报道相互核对到该公告。**本次未能打开微信公告正文**，所以产品功能只采用可打开的官网元数据和腾讯 App Store 正文；发布日期有公开发布报道交叉支持，不宣称成功抓取了官方公告全文。

落盘记录为 `news-tenpaygo-20260924`，`sourceType: operator`，全国服务资料 `city: China`，而不是伪装成政府政策。没有找到可直接引用的政府网站 TenPayGo 报道；后续政府报道可作为新候选。

当前证据**不能证明** TenPayGo 已支持上海地铁闸机、所有境外钱包、所有交易零手续费或完全无需身份核验。报道中提到的深圳通与逐步接入钱包，也不能泛化成全国已开通。应用可用性、费率及身份要求需要按照用户实际卡种与当下应用条款判断。

## 2. 可直接引用的新资料

| 记录 | 原文日期 | 已核对的适用内容 | 边界 |
|---|---|---|---|
| `news-nihao-china-shanghai-20260817` | 2026-08-17 | 上海商务委介绍 Nihao China 的外卡充值、上海地铁/公交乘车码、ATM/兑换点检索和翻译 | URL 日期为 08-19，正文发布日期为 08-17，以正文为准；不承诺实时额度、费率或全部商户可用 |
| `news-go-beijing-20260430` | 2026-04-30 | 北京英文门户介绍 GO BEIJING 的打车、订票、酒店、公共服务及 Travel Wallet | 北京服务不能推定上海可用；不把历史国家数量、费率宣传作为永久规则 |
| `news-shanghai-transit-code-guide` | 2024-04-24 | 上海交通委乘车码开通、先乘后付、支付宝异常行程补登 | 历史官方操作指引；应用入口变化时提示核对当前页面或车站工作人员 |

主来源：

- [上海商务委 Nihao China 报道](https://sww.sh.gov.cn/swdt/20260819/e184b804c7c141ae80d5d4f2c3e80d25.html)，正文实际打开；由官方栏目转载上观新闻，保存为官方发布的服务新闻。
- [中国银联 Nihao China 服务页](https://www.unionpayintl.com/ZT/en/NHCAPP/)，运营方交叉核对。
- [上海市政府关于 Nihao China 上线的报道](https://www.shanghai.gov.cn/nw31406/20251230/add4a4de4d5f4412b18b529f145b321a.html)，正文实际打开。
- [北京 GO BEIJING 报道](https://english.beijing.gov.cn/specials/paymentservices/news/202604/t20260430_4624215.html)，正文实际打开。
- [上海市交通委乘车码问答](https://jtw.sh.gov.cn/zsk/20240424/f502895cea0f46bea5975842cfbfac16.html)，正文实际打开。

上述摘要为重新整理的中英文简述，没有复制整篇新闻。`reviewedAt` 与 `verifiedAt` 为 2026-09-25，`reviewDays` 为 3；`policyOverride: false` 保持新闻与政策版本隔离。

## 3. 5,000 条索引的准确口径

原 `tools/collect_official.py` 保留不改：它按文章正文成功抓取、正文摘要与内容 hash 去重，原有 **1,114** 条（上海 600、北京 514）。新脚本 `tools/collect-official-v61.py` 保留这些记录，再通过官方发布的 HTML 链接、网页中真实引用的 JSON 列表和 robots 声明的 sitemap 增量发现文章 URL。

本轮最终 **5,000 个去重官方 URL**：上海 3,011、北京 514、全国 1,475（国家移民局英文站 363、中国政府网 1,112）。其中 1,114 条保留原有正文抓取元数据，新增 3,886 条为真实链接发现。主题还包括历史活动、一般政府新闻和公共服务，不把这 5,000 条全部宣称为旅行操作指引或现行政策。数据与 hash 校验 9/9 通过。

**索引数不等于当前有效知识条数。** 新增 URL 只要未抓取正文，一律：

- `fetch_status: null`、`content_sha256: null`、`operational_status: body_not_fetched`；
- 保留真实 `discovered_on` 父页面或 JSON feed 与该发现文件的 SHA-256；
- 没有 `summary` / `summaryZh`，`excerpt` 为空，不把标题变成事实；
- `editorial_status: not_reviewed`，不会进入已批准正文 RAG；
- 按实际来源与主题归档，中央便民/政府新闻属于 China，不伪标上海本地资料。

执行命令：

```powershell
python tools/collect-official-v61.py --target 5000 --minutes 30 --max-pages 900
python tools/collect-official-v61.py --target 5000 --verify-only
```

脚本不生成文章 URL 或分页路径。仅跟随实际页面中出现的 URL，不登录、不绕过 CAPTCHA，不在遇到 401/403/429 后继续该域名；同域请求至少相隔 1 秒，服从更长的 robots Crawl-delay。robots 404/410 按没有声明规则处理，其他无法识别或不可获取状态停止。重定向必须仍在该已批准域名且通过 robots。

这次首次通用 requests 探针访问上海/北京 robots 均为 403；正式采集器使用项目透明研究 UA 后，上海英文站 robots 返回 404，可进行常规发现；北京英文站仍为 403，已停用。没有使用代理、隐藏身份、验证码破解或会话凭证绕过网站保护。最终数量、来源分布与停止原因见 `data/official/collection-report.json`；逐页发现和 hash 见 `data/official/audit-v61/`。不要只引用目标参数声称完成。

`--verify-only` 不联网，检查目标数量、唯一 URL/ID、报告 hash、政府域名、发现证据和未抓正文条目没有摘要等 9 项。原 1,114 条记录已逐条与本轮修改前 Git 版本比对，内容未改变。

## 4. 每三天更新应是“发现 → 获取正文 → 验证 → 发布”

`v5/news-data.js` 导出 `records` 和 `discoveryFeeds`，浏览器全局为 `TravelNews`。发现源有两个：

- `https://www.gov.cn/lianbo/YAOWENLIEBIAO.json`，来自 `https://www.gov.cn/lianbo/` 实际页面代码。
- `https://www.gov.cn/zhengce/zuixin/ZUIXINZHENGCE.json`，来自 `https://www.gov.cn/zhengce/zuixin/` 实际页面代码。

字段为 `TITLE`、`URL`、`DOCRELPUBTIME`。消费者按交通、旅游、支付、便民、入境等主题筛选新 URL，写入候选队列并保存发现时间，随后取得正文、确认地区与有效时间、比对旧版本和冲突。标题发现不直接自动发布，也不直接覆盖既有政策。

服务端 `v5/news-discovery.js` 提供 `discover({fetcher, now})`，返回 `{at, candidates, checks}`。每个 feed 最多 20 条、全局 URL 去重；候选固定为 `needs_body_review` 和 `requiresBodyFetch: true`，无已发布摘要。保持 HTTPS/精确主机允许列表、每跳重定向验证、robots、至少 1 秒间隔、7 秒请求超时和 1 MB 正文上限。每个 feed 独立报告失败；403/429 会停止该主机后续请求。10 项 fixture 测试覆盖预算、字段、去重、候选不能冒充事实、URL/日期校验、robots、重定向、大小和失败隔离。后续增量扩展索引时将 `--target` 设置为大于已有总量；日常新闻候选更新由服务端发现器执行。

新闻互证检查应使用来源内容和出处关系：两个报道都转载同一篇稿件，不算两个独立事实来源。可以由发现任务和核验任务分别完成，但增加 agent 数量本身不能提高证据可信度。人审用于矛盾、范围不明、低证据或事实变化；机器通过的高证据资料仍须保留来源、日期和版本。

## 5. GitHub 既有项目的可复用内容

2026-09-25 使用已登录 GitHub 的只读接口核对公开仓库和 README：

- [customer-service-agent](https://github.com/cxy-peter/customer-service-agent)：README 明确描述 FastAPI/Vue、RAG/Agent 和 Neo4j 电商商品图查询。确认“有 Neo4j 实现描述”，不等于当前线上已运行 Neo4j。
- [jinshu-fintech-agent](https://github.com/cxy-peter/jinshu-fintech-agent)：README 明确可信 RAG、BM25、RRF、可选 reranker、Harness 约束和反馈 Loop。复用其“正文版本与有效状态优先、候选与发布隔离”的结构。
- [visit-china-ai-agent](https://github.com/cxy-peter/visit-china-ai-agent)：GitHub 默认分支 README 仍含 V5.1 / 1,114 条历史描述，而本次工作在持续更新的 PR 分支；不能用默认分支旧说明覆盖当前验收状态。

本次仓库列表中未发现能够确定为独立“政府问答 Agent”的另一个仓库，不猜测归属，不把金融或电商系统改称已交付政务系统。
