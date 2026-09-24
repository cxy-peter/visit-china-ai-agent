# Codex 接续任务｜从V5继续，不要重写一个新Demo

## 先读与运行

仓库：cxy-peter/visit-china-ai-agent。普通源码在v5/，V4资料工作台在v4/。本次没有使用旧.bootstrap分包。先git status与diff，保留用户本地.env、data/runtime和未提交代码，切分支再改。DCG含义尚未确认，按排除项处理，不上传。

Node22+：npm ci → npm test → npm run build → npm start。默认http://127.0.0.1:8787；V4为/v4/。不要直接改成0.0.0.0暴露带演示密码的服务。

## 文件地图

| 路径 | 职责 |
|---|---|
| v5/voice.js | 持续web-call会话、自动收听/播报、字幕、显式打断、权限/错误、挂断、epoch取消 |
| v5/engine.js | 共享语音/文字/选项reducer、revision、facts、当前问题、确认、行动及延伸服务 |
| v5/app.js | 立即本地显示、串行后端提交、防旧响应覆盖、来源/图片入口、记忆与模型同意 |
| v5/server.js | HTTP会话、DeepSeek提取/候选、EXTRACT/IMPROVE提示词、审核身份与限额 |
| v5/governance.js | 候选hash、回归、5票门槛、否决、修改清票、版本快照、发布与回滚 |
| v5/ops.js | 管理员与审核者UI、diff、评测、投票、Key配置 |
| v5/provision.js | 仅本地生成不同审核者的随机密码和加盐哈希 |
| v5/index.html / style.css | 通话屏幕及响应式布局 |
| v5/tests.js / browser_test.py | 程序+真实NodeHTTP、浏览器交互；语音与模型使用替身 |
| v4/server.js / data.js | 已保留的官网检索、模型节点生成、来源卡；不是V5每次自动调用 |
| data/official | 已有1,114条页面索引与V4采集报告，不等于现行政策全部复核 |
| prompts/V5_EXTRACTION.txt / V5_WORKFLOW_CANDIDATE.txt | 从运行代码导出的提示词副本；源头仍为v5/server.js常量 |
| docs/V5_VOICE_RESEARCH.md | 成熟语音框架、可复用模式与未实现项 |
| docs/V5_RESUME.md / V5_METRICS.md | 简历边界与指标口径 |

## 可直接作为下一次Codex任务的提示词

你在现有Visit China AI V5仓库工作，请先阅读上述文件和测试，不要新建不关联的Demo。第一优先级是把浏览器自动轮流语音，升级为真实低延迟WebRTC语音会话。建议使用LiveKit Agents作为主会话层，流式STT→DeepSeek文本模型→流式TTS；先依据当前官方SDK文档验证兼容版本，不捏造可调用API。保留现有共享reducer、revision、候选确认和治理模块。网页点击与最终转写都提交同一类事件；临时转写仅显示。回声、自然打断、误打断恢复、语音停顿检测、连接恢复、挂断取消必须有独立验收。先实现用户主动点击开始后的问候，再接续追问；不能隐藏录音或让用户每轮按发送。耳机/扬声器、英语/中文、权限拒绝和移动端实测后，才报告延迟。

第二优先级：将真正的官网检索和V4节点生成嵌入V5行动卡；当前V5来源卡是保存摘要，不要把它当成每次实时访问。UI先显示已确认需求和“正在查什么”的执行摘要，不暴露隐藏思维链。返回的sourceId必须存在；政策金额按经过核对的运营商规则，普通旅行灵感保留来源类型和适用范围。

第三优先级：让运营治理可安全云端使用。用组织SSO及持久数据库替代本机会话/文件存储，使用事务与唯一约束(session/user/candidateHash)，作者不可自批，5位指定审核人同意且测试通过/无否决后才能发布。修改候选必须撤销旧评测和投票；旧基线不能覆盖更新版本。现有会话固定版本，新会话才采用新配置，支持可审计回滚。模型只能修改允许的声明式配置，不能因为获得5票就执行未知代码或修改政策。

Vercel只承载前端和适合短请求的鉴权/API；持续语音worker及WebRTC媒体放到支持常驻会话的服务。不要把本机localhost写进公网前端；不替换用户的金枢或其他既有项目。先检查当前项目与Git绑定再部署，核对实际公网URL、build-info、权限和回归，不把READY静态页面当成云端共享审核已经实现。

保留用户所有本地Key；只使用环境变量/secret store，不在回复或日志打印Key。不提交DCG、真实对话、录音、证件图片、reviewers.local.json、.env、data/runtime、字体文件。结束时提供变更文件列表、实际测试命令、已通过范围、未验证边界、部署URL以及真实测试数据。不得使用虚构的真人数、延迟、成功率或净利润。

## 当前明确边界

已有的是浏览器自动轮流通话和按钮打断，不是全双工声学barge-in；SpeechRecognition可能依赖浏览器服务。模型提议需Key/同意和权限，当前无真实付费联调记录。五人门槛验证的是不同认证测试账号，不是已组织五位自然人。反馈驱动的改动是受限策略配置，不是任意程序自写。真实OTA、寄存和充电库存、地图点位交易均未接通。
