# V4 启动、DeepSeek 与 Codex 接续

## 最短启动路径

安装 Node.js 22 或更高版本。首次克隆：

```bash
git clone https://github.com/cxy-peter/visit-china-ai-agent.git
cd visit-china-ai-agent
npm ci
npm test
npm start
```

从源码ZIP解压也可以，进入包含package.json的目录执行后三行。然后打开 http://127.0.0.1:8787 。前端和API由同一个本机Node进程提供；不是仅启动静态文件服务。停止时在终端按Ctrl+C。

单文件预览：执行 `npm run build` 后打开 `dist/Visit_China_AI_V4_Demo.html`。它包含离线索引、需求确认和摘要演示，但不能安全地携带API Key或绕过浏览器跨域策略访问所有官网。

## 在本机接入DeepSeek

打开Operations，管理员用户名admin、初始密码demo2026；通过ADMIN_PASSWORD更改。登录后：

1. 填自己的DeepSeek API Key，模型先选deepseek-flash，Max tokens先1600。
2. 点击保存。Key保存在服务进程内存，输入框清空；服务重启后需要重填。
3. 返回对话，勾选允许DeepSeek处理脱敏需求与官方片段。
4. 输入需求。第一阶段模型整理编号需求；确认后，服务端查验官方原文，并在有合格原文时调用模型生成节点。
5. 看节点标签：deepseek-grounded才表示该节点实际来自模型结果；source-summary是默认摘要回退。请求失败时不会假装生成成功。

也可以复制.env.example为.env，在本机编辑。不要把.env、Key或真实对话上传GitHub。部署者可以设置DEMO_ACCESS_TOKEN为至少16位随机访问码，供非管理员同意调用模型；访问码不等于模型Key。

本轮使用正式API请求代码，但没有真实Key，没有付费模型质量验收。密钥格式正确不保证账号有余额、模型可用或地区网络可达。遇401检查Key，429检查配额／限速；JSON为空、截断或不符合合同会退回默认路径。后台Token统计是供应商回执，不是账户余额、完整计费账单或净利润。

参考官方文档：
- https://api-docs.deepseek.com/api/create-chat-completion/
- https://api-docs.deepseek.com/guides/json_mode/

## 会话、日志与容量限制

本版为单进程开发服务，HttpOnly会话cookie、同源JSON接口、管理员鉴权、访问限流和模型小时预算。对话、Key设置、来源停用状态和交互日志在内存，重启丢失；刷新页面会开始新的对话，避免浏览器界面和旧服务端确认状态错位。不是多人生产数据库。

默认仅监听127.0.0.1。不要把HOST改成0.0.0.0并直接开放公网。生产需HTTPS、真正的账户、CSRF/Host校验、分布式限流、租户隔离、可撤回留存、数据库和密钥管理。

## 官方库如何更新

`data/official/records.json` 是1114条真实已抓取的索引快照。公开包只包含短片段、哈希和来源，不包含完整第三方文章镜像。`tools/collect_official.py` 为有边界的公开站点采集器：robots、限速、失败停止、去重和审计。

本机扩展命令：

```bash
python -m pip install requests beautifulsoup4
python tools/collect_official.py --target 5000 --minutes 90 --output data/official-next
```

5000是请求上限，不是保证条数；查看collection-report.json。当前仅配置上海、北京两个官方站点，广度和时效依赖网站可访问内容。先写入official-next并审核，不直接覆盖生产语料。确认后再替换official，重启Node，再npm run build。没有自动长期监控或定时采集任务。

静态构建把索引写入corpus.js，Node也会在启动时加载索引。如果界面显示0，检查records.json是否存在于项目data/official目录；仅下载早期CI包可能不含完整采集结果。

## Vercel

当前V4提供Vercel静态前端构建：Framework Other、Build npm run build、Output dist。公开网页用于离线索引和默认演示；Key不能放前端，也不能把本机127.0.0.1当成公网后端。

要在Vercel上完整运行真实对话，需要将服务端会话、确认令牌、事件与预算迁移到持久数据库，并适配云函数/流式任务网关；或者连接有HTTPS和正确鉴权的独立Node后端。不要把当前内存Map原封不动塞进多个无状态函数并宣称数据一致。此次没有实际Vercel线上部署，也没有进入用户电脑启动服务。

## 给Codex的下一轮要求

请先运行现有源码，不重写另一套玩具：

- 保留`v4/core.js`的需求确认与来源校验，先用真实Key做有限调用，保存脱敏结果、延迟和Token；未被独立评审的准确率显示未知。
- 将关键词索引扩展成结构化元数据过滤＋混合检索。先用city、airport、terminal、zone、date、service_type过滤，再做重排。不要把相关性分数当事实正确概率。
- 强化官网解析：目前是受控HTML清洗，不是完整网页理解；已有日期、脚注、新旧规则混排、子页面、图片说明都要评测。PDF应使用独立解析流程并保存页码，不把PDF切片计为新页面。
- 补支付宝现行运营商收费原文。未核实前保留fee_gap，不套用微信规则。微信基础收费使用固定工具，不让LLM自由计算或编造个人优惠。
- 将公开社交线索接入受授权数据源，去标识化、注明发布时间和原文，避免自动把经验升级为现行规则；不绕过登录或反爬。
- 保留生成过程中补充需求与取消；迟到结果必须和revision及planController绑定，不覆盖新状态。支持持久会话时补刷新/重连测试。
- 视用户需要合并V3旧的模拟借还、充电商户和回放功能。V4没有重建这些模块，不把模拟订单当接通了美团或携程。
- 建立独立评测集：需求覆盖、约束满足、证据支持、时效适用、语义错误、超时、用户完成率、成本。研究基准和现行官方事实分库存储。

主文件：data.js来源卡，core.js合同与默认流程，server.js真实接口，app.js交互，tools/collect_official.py采集；测试tests.js、browser_test.py；真实网络检查live_smoke.js。首次V4 CI已成功；最终结果应以对应commit的Actions和evidence文件为准。
