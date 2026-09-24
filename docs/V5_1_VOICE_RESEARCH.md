# 语音 Agent 实现调研与采用决策
核对日期：2026-09-24。对象：Visit China AI。区分公开文档能力、产品设计决定和本项目实际实现，不以厂商介绍代替实测。

## 结论
下一轮优先评估 LiveKit Agents 的 WebRTC 媒体会话，搭配流式 STT → DeepSeek 文本模型 → 流式 TTS；保留独立、受权限控制的旅程状态与五人审核服务。Pipecat/RTVI适合参考事件合同；快速托管试验也可评估ElevenLabs Agents或Vapi。尚未接入这些供应商；本次运行的是浏览器自动轮流语音基线。DeepSeek文本API本身不是原始音频服务，不能只填一个Key就宣称全双工。

## 实现模式，不作未经实测的性能排名
| 方案 | 官方文档能力 | 本产品借鉴 | 尚未实现 |
|---|---|---|---|
| LiveKit Agents | VAD之外的回合终止判断、打断控制、媒体与数据并行 | 独立call/session，语音播放epoch与旅程revision分离，生产版减少抢话 | 无LiveKit联调，无真实声学打断/重连/延迟成绩 |
| Pipecat / RTVI | 临时/最终转写、spoken/unspoken输出、文字输入是否立刻运行、工具事件 | 临时字幕只显示，点选与最终语音走同一状态提交，短口播和完整页面分开 | 未实现RTVI协议兼容，不冒充已引入SDK |
| ElevenLabs Agents | contextual_update追加背景而不打断，user_activity提供交互活动 | 重要选择取消旧口播，仅查看资料不必立即触发新回答 | 无ElevenLabs凭据/真实语音/签名URL接入 |
| Vapi | JSON Schema抽取并写入通话artifact | 通话后摘要和质检可以结构化；即时槽位是独立需求 | 文档所述Structured Outputs在通话后，不拿它冒充实时状态同步 |

主要来源：
- https://docs.livekit.io/agents/logic/turns/turn-detector/
- https://docs.livekit.io/frontends/build/media-data/
- https://docs.pipecat.ai/client/rtvi-standard
- https://elevenlabs.io/docs/eleven-agents/customization/events/client-to-server-events
- https://docs.vapi.ai/assistants/structured-outputs
- 豆包实时语音官方接入入口：https://www.volcengine.com/docs/6561/1594356 。本轮未完整解析动态文档，不据此声称验证了参数或内部实现。

## 路线取舍
级联STT→DeepSeek→TTS便于分离文本、工具、证据与审计，也有组件累计延迟、STT误差和回声处理成本。端到端实时语音可作为另一条路线，但仍需服务端工具权限、旅程快照和重要操作确认。先用真实设备比较，不报告未经实测的低延迟或准确率。

## 本次实际采用
1. 开始后主动问候，说完自动收听；最终识别自动提交，不必每轮按发送。
2. 口播未完可点选，立即更新页面，取消旧口播但不挂断；旧识别/模型响应不能覆盖新选择。
3. 点击发生在临时转写阶段时，保留未提交可编辑草稿，不把半句自动存为事实。
4. 页面概要、行动卡与口播分开。临时字幕并非提交记录，建议并非用户选择，自述预订并非供应商确认。
5. 已知字段不反复索要；电量/网络问题可中断规划并暂停延伸服务。
6. 进入Operations暂停麦克风；审核新版本不改变已开始通话的固定策略快照。

## 下一轮事件合同（设计，非已接通云端协议）
session.started、speech.interim、speech.final、ui.choice、context.update、state.patch、assistant.output、tool.started/result、speech.interrupted、session.ended。
事实变更携带event_id、session_id、base_revision、source、schema_version；身份由服务端认证而不是事件自报。interim和查看资料不自动改写事实。assistant.output分spoken_text和display_blocks。被取消的旧音频不能被当作用户已经听过。

## Vercel资料纠正
2026-06-22官方更新已宣布Functions WebSocket public beta，不能再写“Vercel绝对不支持WebSocket”。但连接支持不等于跨实例持久会话；本机JSON、内存session和演示密码不能冒充云端组织审核。目前构建配置仍是静态预览。
https://vercel.com/changelog/websocket-support-is-now-in-public-beta

## 后续独立验收
中英口语、酒店名/日期、长停顿、背景人声、扬声器回声、连续打断、快速选择、弱网、锁屏、权限拒绝和挂断后停录。报告回合结束至首段可听音频的P50/P95、误打断率、字段纠正率与任务结果；按钮测试耗时不能当音频成绩。
