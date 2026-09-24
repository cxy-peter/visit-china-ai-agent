请在当前cxy-peter/visit-china-ai-agent仓库增量开发，不另做无关联Demo。先阅读docs/V5_1_CODEX_HANDOFF.md、docs/V5_1_VOICE_RESEARCH.md和v5/voice.js、engine.js、server.js、governance.js；查看evidence/v5/release-report.json确认现有边界。先git status保护用户.env、data/runtime和未提交代码，再建分支。

主目标是把现有自动轮流浏览器语音升级为可实测的持续WebRTC会话。优先评估LiveKit Agents + 流式STT + DeepSeek文本模型 + 流式TTS，也可比较Pipecat/RTVI；按当前官方文档验证版本和接口，不捏造API。用户点开始且同意后主动问候；语音结束自动提交；页面选项随时可点。选择或新的完整语音改变事实，浏览资料只更新背景，不强制产生新回答。临时转写不入正式状态。音频和页面共享event_id、revision和同一旅程状态；spoken_text与display_blocks分开。加入自然打断、误打断恢复、回声/长停顿、重连与挂断取消，用真实手机/麦克风验收。不要将浏览器循环冒称全双工。

保留政策引用和紧急优先的硬性边界；将V4真实官网检索、DeepSeek节点生成接入V5卡片，保存摘要不可冒称刚联网。旅游灵感、运营商供给与政策分开标注；无库存授权时只给入口，不假装成交。保留可纠正的“我理解你有这些事要做”和语音确认，避免每项强迫点击。

运营闭环迁移为SSO+持久数据库，五个不同审核人批准同一候选hash且回归通过/无否决才发布；作者不可自批，改稿清票与评测，版本固定、幂等事务及回滚保留。AI仅生成受限声明式workflow/skill参数与prompt补丁，不得执行未知代码、删安全限制或批准自己。测试并发第五票与新旧会话隔离。

Vercel已连接但当前部署动作not found，可用用户授权的本地CLI/控制台新建独立项目，不改金枢；确认账户与Git绑定。2026-06已有WebSocket beta，不能引用过时的全盘不支持结论，仍需数据库、媒体worker及会话恢复。输出真实URL及build-info，不把静态READY当完整云端服务。无Key时标记未联调，不让用户把Key贴入聊天。

禁止上传DCG（含义待确认，先排除）、.env、API Key、reviewers.local.json、data/runtime、录音、真实对话、证件照片、字体。更新测试、prompt导出、简历边界和部署文档。最终报告变更文件、实际测试/音频指标、已实现/待验证功能和所有失败，不虚构五名真人、准确率或收益。
