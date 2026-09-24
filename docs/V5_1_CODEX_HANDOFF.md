# Codex 接续：V5.1 通话与五账号审核
## 当前状态
恢复中断的V5发布，修正CSP下浏览器测试方式，保留严格script-src，不开放unsafe-eval；处理说话中点选导致未完成转写丢失。先运行现有项目，不重写旁路Demo。
V5.1代码在v5/；V4官方检索与DeepSeek生成在v4/，通过/v4/保留。V5日常口播是受限流程，不等于每轮自由模型生成。没有真实声学全双工验收。

## 文件位置
| 文件 | 用途 |
|---|---|
| v5/voice.js | Call状态机、自动收听、字幕、取消epoch、未发送草稿 |
| v5/app.js | 文字/语音/选项共享状态，队列、revision、实时页面、同意与记忆 |
| v5/engine.js | 事实、下一问题、确认、任务及延伸服务、紧急降级 |
| v5/server.js | 本机鉴权、DeepSeek提取/候选、审核API；EXTRACT/IMPROVE为实际prompt源头 |
| v5/governance.js | 候选hash、十条固定回归、五不同账号批准、发布及回滚 |
| v5/ops.js / provision.js | 审核UI及本地初始化账号 |
| v5/tests.js / concurrency.test.js / browser_test.py | 程序、并发与浏览器HTTP测试 |
| prompts/V5_EXTRACTION.txt / V5_WORKFLOW_CANDIDATE.txt | 从运行代码导出的prompt副本 |
| prompts/CODEX_NEXT_TASK_V5_1.md | 可直接交给Codex的任务 |
| data/official/records.jsonl | 1,114条官方网页索引，非逐条现行政策审核 |
| docs/V5_1_VOICE_RESEARCH.md / V5_1_RESUME.md | 调研及简历替换段 |
| evidence/v5/release-report.json | 实际测试范围与构建来源 |

## 本地更新
先git status、git diff，再建分支；保护.env和data/runtime，不覆盖用户未提交修改。源码包不含个人配置。
Node22+：npm ci → npm test → npm run build → npm start。
http://127.0.0.1:8787；V4入口/v4/。未另设密码时本机演示admin / demo2026。更新文件后需Ctrl+C停止旧服务并重新npm start；旧Node进程不会自动切换版本。
Operations配置Key进入服务内存；环境变量可用.env。禁止日志/截图/聊天暴露Key。
`npm run reviewers:init -- reviewer1 reviewer2 reviewer3 reviewer4 reviewer5`生成各自随机密码和哈希，重启服务加载。测试账号不是五个真人的证明。

## 通话验收
开始并同意麦克风后主动问目的地；未播完点Shanghai，取消旧声但不挂断。说机票已订酒店未订，最终识别自动发送；再补父母同行保留选择。半句转写时点选保留未提交草稿，不写成确定事实。说确认/点确认生成卡片；继续提出新需求允许更新。3%电量暂停无必要语音和模型、停止延伸推荐、给可读文字。挂断后旧识别与音频回调失效；权限失败不能假装仍在听。

## 五账号审核验收
管理员提交聚合反馈候选；无Key是template，有Key和同意才调用模型。候选只改口播上限、提问次序、是否推荐和受限prompt后缀，不能执行代码、改政策或扩工具。
先回归后投票，五个名单内不同账号批准同一hash、无人否决才生效。作者自批、重复身份、客户端伪造reviewer、旧hash/基线都不通过；改稿清票和评测。已开始会话锁定旧版本；回滚恢复配置但版本递增。
十条回归是自编规则检查，非独立LLM语义评估。组织上线需独立评测集、SSO、数据库事务和唯一约束。

## Vercel实际状态
连接能读取项目；可见项目没有Visit China，部署动作返回Tool deploy_to_vercel not found。不要再说未安装，不替换金枢等无关项目。目前无已验证的新网址。
可用用户授权的本地CLI/控制台新建独立visit-china-ai-agent项目，Git绑定本仓库。Framework Other、npm run build、Output dist，先发布静态通话预览。静态版不能写共享审核或存Key。
2026-06-22官方宣布WebSocket beta，不能引用过时的完全不支持结论。完整云端仍需持久会话、SSO和凭据隔离；不把localhost写进公网前端。

## 验收边界
程序与CI浏览器结果见release-report；语音API及供应商为测试替身。不是已完成真实麦克风、口音、扬声器回声、DeepSeek付费质量、OTA/寄存/充电库存或公网多用户审核。请让用户在实际设备测听感后再决定上线。
