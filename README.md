# V5.2: LiveKit integration and durable review workflow

Incremental upgrade from V5.1: optional LiveKit WebRTC media worker, V4 official-source checks inside V5 cards, SQLite transactions and persistent sessions, and OIDC organization-login configuration. See [setup and precise limits](docs/V5_2_HANDOFF.md) and [resume boundaries](docs/V5_2_RESUME.md).

**Real microphone, LiveKit-provider and organization SSO acceptance are still pending.** This is not a measured full-duplex release. SQLite supports processes on one persistent host, not multiple cloud hosts. Vercel remains a static preview.

The browser-voice fallback and original regression behavior below remain available. Node >= 22.13 is required.

## V5.1 release verification

Continuous browser-call loop, speech/click shared state, unfinished transcript recovery, and five-distinct-account approvals are now verified. See [measured results](evidence/v5/release-report.json), [voice research](docs/V5_1_VOICE_RESEARCH.md), [Codex handoff](docs/V5_1_CODEX_HANDOFF.md), and [resume wording](docs/V5_1_RESUME.md). No real microphone, paid model or Vercel deployment is claimed.

# Visit China AI V5 · Call-first travel companion

**主动开口，边聊边选，逐步记住需求；运营变更经过五个不同审核账号同意后发布。**

个人产品项目 · 多轮原型迭代 · AI辅助实现。不是携程、机场或政府的正式系统。

## Start locally

```bash
npm ci
npm test
npm run build
npm start
# http://127.0.0.1:8787
```

Node.js 22+。保留你自己的 `.env` 和 `data/runtime`，更新代码不覆盖凭据。Operations管理员默认 `admin / demo2026`，对外使用前必须替换。

点击 **Start a call** 并明确同意麦克风：助手先询问，随后自动在播报和收听之间轮转。播报未结束也可点击选项或“打断并说话”；语音、文字和点击进入同一份带版本的行程状态。用户选择不会因为通道切换而重填。默认规则不需要模型Key，复杂文字可通过服务端DeepSeek提出带原文的补充，需确认后提交。

**当前是浏览器自动轮流通话，不是WebRTC全双工或PSTN电话。** 未测试真实麦克风音质、声学自动打断或付费模型质量。浏览器识别服务不可用时真实报错，仍可使用文字和按钮。不要把合成语音测试当作豆包级体验成绩。

## Human-in-the-loop release gate

```
反馈 → 聚合问题 → 模板/DeepSeek提议 → 受限配置验证
 → 回归 → 5个不同有权账号同意同一hash → 发布到新通话
 → 审计 / 修改清票 / 回滚
```

- 作者不能自批；重复投票只算一次；否决阻止发布。
- 修改后原评测和投票均失效；旧基线不得覆盖新版本。
- 已进行的通话保留原策略快照。回滚生成新的版本号。
- 允许改动提问顺序、播报预算、推荐开关和受限prompt片段；不执行AI生成的任意代码，不改变政策金额或工具权限。

本机建立五个独立审核账号：

```bash
node v5/provision.js reviewer1 reviewer2 reviewer3 reviewer4 reviewer5
```

密码仅在你的终端生成，分配给指定审核者后重启服务。私有哈希文件不上传。五个测试账号不等于已经组织五位自然人，真实组织部署需接SSO及持久数据库。

## What is retained

V4完整保留：`npm run start:v4`，或V5页面的Source library进入 `/v4/`。官方索引仍为 **1,114条独立页面记录（上海600，北京514）**，包含目的地与历史活动，并非1,114条现行政策全部人工复核。V5指南卡是保存的摘要；V4执行实时官网检索和基于原文的模型节点生成。未把两者混称每轮语音都联网。

[采集报告](data/official/collection-report.json) · [V4产品及来源说明](docs/V4_PRODUCT_AND_RESEARCH.md)

没有真实OTA订单、充电库存、寄存预订、地图交易或支付合作；第三方链接只是跳转。政策收费优先官方/运营商来源，普通旅行建议保留经验属性。

## Research, deployment and handoff

- [V5产品与演示](docs/V5_PRODUCT.md)
- [LiveKit / Pipecat / Retell官方方案调研](docs/V5_VOICE_RESEARCH.md)
- [本地启动、DeepSeek和审核者配置](docs/V5_DEPLOYMENT.md)
- [完整Codex提示词与文件地图](docs/V5_CODEX_HANDOFF.md)
- [简历项目表述](docs/V5_RESUME.md)
- [指标口径](docs/V5_METRICS.md)
- [本次源码与浏览器测试工作流](.github/workflows/release-v5.yml)

Vercel构建配置提供静态前端；完整模型/审核后端当前运行于本机单进程。公网网页不能自动读取你电脑的localhost。没有验证过的部署URL不视为已发布。长期方向建议WebRTC会话服务加流式STT/DeepSeek/TTS，当前只借鉴其设计，没有声称运行这些SDK。

`v5/` 为普通源码；`prompts/` 为从运行代码导出的提示词；`evidence/v5/` 存放实际开发测试。回归测试和浏览器中的模型/语音均用测试替身；真人效果独立验证。旧 `.bootstrap` 是历史失败传输，不是当前运行依赖。

不包含Key、DCG、内部公司材料、真实旅客对话、录音、证件、reviewer注册表或字体文件。
