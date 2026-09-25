# V5.2 增量交付与验证边界

本轮以 V5.1 的 `dbdc9a2` 为起点，保留原通话状态机、半句话草稿、修正需求后撤销确认、紧急优先、严格 CSP、五账号审核与回滚。没有另做 Demo。

## 已接入的代码

| 路径 | 行为 |
| --- | --- |
| `v5/realtime.js` | LiveKit 浏览器媒体连接、主动授权、麦克风释放、音频输出、断线恢复、SDK 事件到现有页面 |
| `voice-worker/agent.ts` | 独立 LiveKit Agents worker，流式 STT/TTS、音频回合检测、自然打断及误打断恢复选项；所有正式事实回传 V5 服务 |
| `v5/realtime-server.js` | 登录与同意后发短期、单房间、仅麦克风的令牌；worker 使用独立房间凭据，不能操作运营接口 |
| `v5/storage.js` | SQLite WAL、写事务、审核人唯一约束、持久化幂等键、旧 JSON 一次迁移、会话恢复 |
| `v5/identity.js` | OIDC 授权码、PKCE、state、nonce；按 issuer + sub 绑定管理员和审核人，不能靠 email 或请求自报身份 |
| `v5/guides.js` | 复用 V4 官方检索器、来源白名单、robots 规则与 DeepSeek 节点校验，直接显示在 V5 行动卡 |
| `v5/platform.test.js` | 跨进程第五票、存储恢复、语音重放、房间隔离、草稿、挂断与指南失效等新测试 |

声音输出只读服务端的 `spoken_text`，页面内容来自独立的 `display_blocks`。正式语音带 `event_id / session_id / base_revision`；晚到的语音遇到新选择时返回草稿。临时转写只显示，不落为事实。查看指南发送 context 事件，既不改变 revision，也不触发新口播。网页选择在服务端确认后让 worker 取消旧音频并播报新回复。

## 可运行的部分与待联调的部分

- 自动化测试覆盖真实 Node HTTP、SQLite、多 Node 进程及 Chromium 页面；语音输入/输出使用测试替身。
- 已按安装的 `@livekit/agents 1.9.0` 类型检查并编译 worker，已验证 CLI 可以加载。没有 LiveKit 凭据，未建立真实 WebRTC 媒体会话。
- 音频回合检测、adaptive interruption、误打断恢复和回声抑制是已接线的 SDK 配置，尚无真实手机、口音、扬声器回声、长停顿或弱网成绩。
- DeepSeek 保持既有“带引用的事实提议 → 用户确认”边界。它不是自由聊天模型接管全流程；节点生成要求确认后的需求和适用的联网依据，支付节点不交给模型生成收费规则。
- OIDC 接入代码已完成，但没有选定组织身份平台，未做真实 IdP 往返或人员身份审计。五个测试账号不是五位真人。
- SQLite 适用于**同一主机、同一本地持久磁盘**上的进程。它不是跨主机共享数据库；需要多机部署时仍须迁移到 PostgreSQL 等服务并迁移事务实现。
- 会话恢复保留旅程和固定策略。应用进程中的模型调用取消与速率预算仍有单进程范围；部署不要宣称具备全局分布式计费控制。
- 没有 OTA、寄存或充电库存授权；任何平台入口、参考信息都不等于成交或实时库存。

## 配置与运行

Node >= 22.13（本轮本地 Node 24.15）。保持已有 `.env` 与 `data/runtime`。首次运行从旧 `governance-v5.json` 导入数据库，旧文件不删除、不覆盖；此后 SQLite 是唯一权威记录。迁移后不要同时运行写旧 JSON 的 V5.1 服务。

```bash
npm ci
npm test
npm run voice:check
npm run build
npm start
```

默认本机地址 `http://127.0.0.1:8787`。要使用 LiveKit，先把 `.env.example` 中 LiveKit 变量填入本地 `.env`，不要发到聊天或提交 Git。使用 LiveKit Cloud Inference 提供流式识别和合成；自托管 LiveKit 需要另外配置 STT/TTS 插件，当前 worker 不能被描述为已支持任意自托管组合。

```bash
npm run voice:build
npm run voice:download
npm run voice:dev
```

第二个终端保持 `npm start`。在 Operations 登录被授权的账号，选择 LiveKit，主动勾选音频服务同意并开始通话。首次模型文件下载、首次 worker 启动可能较慢；先等 worker 就绪再点开始。没有配置时 LiveKit 选项不可用，浏览器语音仍可选择。开启 DeepSeek 还需独立的文字处理同意。

组织部署设置 `OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET / OIDC_REDIRECT_URI`；回调固定为 HTTPS 的 `/api/v5/auth/callback`。`OIDC_ADMIN_SUBJECTS` 和 `OIDC_REVIEWER_SUBJECTS` 是该 issuer 下不可变 subject 的 JSON 数组。使用 SSO 时禁用本地密码登录及 V4 旧的写接口；V4 资料浏览仍保留。撤销身份名单需重启相关进程。不要把展示名称或 email 当成唯一审核身份。

## 部署

Vercel 只发布 `dist` 静态预览。完整服务要有持久 Node 主机、同机 SQLite 持久卷、组织登录、HTTPS 和独立媒体 worker；本轮没有把这些冒充为静态预览的一部分。Vercel 的 WebSocket 功能不是这里选择独立 worker 的唯一理由，媒体处理、状态持久化和身份管理仍是独立职责。

准备预览时确认 Vercel 账户和 Git 仓库绑定，只创建/使用 `visit-china-ai-agent` 独立项目。不得替换其他项目。发布后核对 URL、`build-info.json`、源 commit 和页面资源；`READY` 只代表相应构建完成。

## 后续真实设备验收

在中英文手机/电脑上记录：最后一个用户音节到首个可听助手音节的 P50/P95、误打断数/总打断数、字段纠正成功数/总纠正数、任务完成口径。至少覆盖权限拒绝、静音/恢复、挂断立即停录、播报中点选、半句话点选、假打断后继续、长停顿、外放回声、后台人声、弱网重连。未测的数据填 `null / 未测`，不填 0 或模拟耗时。

## 失败与限制记录

本轮曾遇到 Windows 测试清理早于 SQLite 关闭、测试同时占用固定端口、Playwright 对 option 的 disabled 判断差异，以及 token 未含 iat 的测试假设。分别改为等待关闭、独立端口、直接检查 disabled 属性和检查实际到期时间，保留相关测试。指南被取消时改为 409，防止旧结果显示为普通服务失败。

最初部署检查：本地 Vercel CLI 报令牌失效，MCP 新连接需要登录，旧连接未返回可用团队。部署是否最终完成以本轮交付报告为准。

## 核对过的官方资料

- [LiveKit turn detector](https://docs.livekit.io/agents/logic/turns/turn-detector/)
- [LiveKit voice quickstart](https://docs.livekit.io/agents/start/voice-ai/)
- [LiveKit pipeline hooks](https://docs.livekit.io/agents/logic/nodes/)
- [DeepSeek plugin reference](https://docs.livekit.io/agents/models/llm/deepseek/)
- [openid-client official implementation](https://github.com/panva/openid-client)

最终代码同时以 npm 安装包的类型定义校验接口，不只依赖网页示例。
