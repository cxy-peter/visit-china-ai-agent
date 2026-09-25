# Visit China AI V6.4 · 直接回答、服务分流与可追溯运营

本轮统一解决反馈，加入20个可点问题、历史高铁时间筛选与相关产品入口，修复车站充电误触发铁路行程、付款咨询被路线工具覆盖。机场到站由DeepSeek结合正文解释；近期官方活动每日发现、限量读取与核验。详见[V6.4交付与限制](docs/V6_4_RELEASE.md)。

**个人项目 · 产品与运营设计 · AI辅助实现。** 语音和文字共用对话与资料库，DeepSeek负责语义理解及有据回答；地铁路线、车费和来源校验由应用工具执行。Operations把用户反馈、相关上下文、问题分类、技能候选、自动验收、回放与人工发布连起来。

- **20,000条中英文回归用例**：组合合成与公开资料改写，支持每轮不同问法、版本指纹和失败重放；不是20,000名用户、付费模型调用或模型准确率成绩。
- **5,000个去重官方网页URL**：保留原1,114条正文抓取元数据，新增3,886条官方链接发现；未抓取、未核验正文不能进入事实回答。
- **20条核对过的地点／服务记录**：6家酒店、5家餐饮、9条交通便民服务，10个公开商务电话，关联上海站、虹桥枢纽、人民广场和浦东机场。地址、电话、地图与官网直接出现在相关回答下方；未接实时房态、余票、价格或柜机库存。
- **资料证据分达到60才可自动引用**，低于60待核验；仍检查城市、有效期、停用与版本状态。模型自评分单独显示，不是真实正确率。
- **运营入口**：可选分享最多8轮脱敏上下文，定位事实、意图、流程等问题；管理员可总结、补资料、建技能候选、回放、发布或回滚。新增有期限和调用上限的 `VC-…` 体验码，区别于仅保存在服务端的 `sk-…` API密钥。
- **每日活动发现与三天精选资料检查**：每日新增官方活动候选，每轮最多评估两篇正文，过期活动隐藏；每日调度检查是否到期，按72小时门槛发现新闻候选并轮转检查已收录来源，也支持手动更新；新标题不会自动成为已核实事实。

- **新增5,000条评测问法**：50个主题的中英文组合改写，目标资料召回4,485/5,000；不是5,000条社交媒体原话。独立新轮12,000条Loop改善175条、退化0，完整旧20,000条回归通过；候选保留人工发布。

[V6.1架构与运营使用说明](docs/V6_1_ARCHITECTURE.md) · [20,000条评测构成与限制](docs/V6_1_EVALUATION.md) · [5,000条索引、TenPayGo及新闻更新](docs/V6_1_SOURCE_RESEARCH.md) · [真实地点、电话和来源清单](docs/V6_1_VERIFIED_SERVICES.md)

当前保留轻量执行图和站点关系，检索为 **BM25 + 稀疏TF-IDF + RRF + 确定性重排**；没有部署Neo4j，也未接入学习型embedding或模型权重训练。V6.1已发布：程序/接口299项、旧浏览器168项、本地新界面25项、合成语音18项、正式站浏览器16项通过；8类真实DeepSeek问题另有高铁端点补测。范围与具体结果见[发布验收报告](docs/V6_1_RELEASE.md)。

下方为各版本交付历史；其中的索引数量、测试规模、连接与部署说明保留当时口径，当前行为以V6.4说明及最终验收记录为准。

# V6: automatic RAG and an editable Operations Harness

Private DeepSeek access now supports credential-document import and authenticated administrator connection. Reviewed sources are chunked and automatically retrieved with BM25, sparse TF-IDF, RRF and evidence-aware reranking. Operations adds bounded skill versions, automatic acceptance, rollback, execution traces and quality metrics with explicit denominators. Location-based hotel, power-bank, luggage, train and metro-ticket queries distinguish real sources from unconnected inventory.

[Architecture, operating guide, data contracts, references and limitations](docs/V6_HARNESS_RAG_OPERATIONS.md). Existing metro, voice, source-review and concurrency safeguards are preserved; no Neo4j service or learned embedding provider is claimed.

# V5.8: model intent, Shanghai metro routing and outcome feedback

DeepSeek now identifies the current intent and route endpoints before read-only tools run. Shanghai metro routing uses a dated 418-station public network snapshot with bilingual maps, editable endpoints and via stations. Per-answer solved/unsolved feedback feeds the Operations quality dashboard and triage queue. [Scope, data provenance and verification](docs/V5_8_METRO_AND_FEEDBACK.md).

# V5.7: durable Operations and a shared reviewed source library

Operations now provides live/demo metrics, ordered product funnels, source submission and five-account publication review, automatic source-change checks, and workflow/prompt evaluation. Travel assistance starts from the user's specific need and uses the approved cloud library, bilingual metro diagrams and deterministic taxi/rail guidance. See [operation, setup, boundaries and references](docs/V5_7_OPERATIONS.md).

# V5.6: deployed DeepSeek chat and metro routes

The public site now has a private-access, stateless DeepSeek chat endpoint shared by voice and text. Live captions move into a larger conversation area; accidental voice fragments stay silent; Yu Garden metro diagrams and directional Shanghai train/flight examples appear below the relevant turn. See [setup, behavior and verification](docs/V5_6_CLOUD_CHAT.md). Historical release sections below describe their original scope.

# V5.5: unified conversation and source library

Search the original official-source catalog inside the active chat, attach references to text or voice turns, and open source details without losing the trip. Both views share one model status/consent control and the existing backend DeepSeek client. Public static mode stays explicit about its missing model backend. See [behavior, open-source references and verification](docs/V5_5_UNIFIED_WORKSPACE.md).

# V5.4: chat-first travel companion

Pastel message bubbles, full conversation context, top call controls, independent input/output languages, simulated hotel/flight/rail/restaurant cards, and a transparent taxi estimate. New chat clears the previous scenario and carries preferences only when requested. See [V5.4 behavior, verification and limits](docs/V5_4_CHAT.md).

# V5.3: free local voice, visible transcripts and opening request

Vosk now transcribes English/Chinese speech locally in the browser without a paid voice API. The microphone has a real level meter; live captions, both sides of the conversation and the first overall request stay visible. Optional browser memory restores the conversation on reload. See [setup, reference designs, verified behavior and limits](docs/V5_3_FREE_VOICE.md).

The public static site supports this local voice path. LiveKit is optional and is not needed for it. Real human microphone quality remains unmeasured; bilingual synthetic PCM has been decoded with the actual WASM models.

## V5.2: LiveKit integration and durable review workflow

Incremental upgrade from V5.1: optional LiveKit WebRTC media worker, V4 official-source checks inside V5 cards, SQLite transactions and persistent sessions, and OIDC organization-login configuration. See [setup and precise limits](docs/V5_2_HANDOFF.md) and [resume boundaries](docs/V5_2_RESUME.md).

**Real microphone, LiveKit-provider and organization SSO acceptance are still pending.** This is not a measured full-duplex release. SQLite supports processes on one persistent host, not multiple cloud hosts. That V5.2 deployment was a static preview; V5.6 adds cloud chat while the persistent review/SSO backend remains separate.

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


## V5.9: real places and source operations

Shanghai station records and 19 sourced places share the library with the assistant. The sidebar follows the current destination, offers grounded nearby places and adds via stations. DeepSeek intent self-ratings and evidence scores are separate, with low-confidence review material in Operations. Admin source submissions publish directly with audit/rollback; government excerpts require fetched exact-text verification for automatic confirmation.

The downloadable corpus contains 1,221 synthetic/source-adapted cases (184 source-adapted, 1,037 authored), plus 10 historical scenarios. These are local regressions, not 1,221 paid model calls or a measured model accuracy claim. See [V5.9 design and validation](docs/V5_9_DISCOVERY_AND_OPERATIONS.md).
