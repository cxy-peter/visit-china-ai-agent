# 语音Agent实现调研与采用决策

核查日期2026-09-24。以下是官方实现文档，不是对厂商市场份额、实际延迟或成功率的背书。

## LiveKit：优先借鉴会话、轮次与打断

官方事件模型分别报告转写是否最终、Agent状态、会话关闭、工具结果和中断。应将这些事件与业务状态分开。用户开始出声不一定已经说完整句；“嗯”也不一定要打断。LiveKit支持轮次检测、VAD或自适应打断、误打断恢复等配置。V5借鉴状态事件、最终转写提交、迟到事件拒绝、显式取消；未安装或运行LiveKit SDK，也未宣称实现自适应声学打断。

来源：
- https://docs.livekit.io/reference/agents/events/
- https://docs.livekit.io/reference/agents/turn-handling-options/
- https://livekit.com/blog/turn-detection-and-interruption-handling

下一阶段建议路线（架构建议，未部署）：网页WebRTC → LiveKit会话/回声与轮次处理 → 流式STT → DeepSeek文字推理与受限工具 → 流式TTS → 音频及结构化UI事件。网页选项也提交相同的任务事件，不能再创建另一份独立状态。

## Pipecat Flows：对话图与业务代码分离

Flows将对话拆成有明确任务和工具边界的节点，支持运行时JSON/YAML配置与状态管理。适合把可审核的业务参数和不可随意改写的代码分开。其当前文档明确：Flows需要STT→支持function calling的文字LLM→TTS链路，不适配原生speech-to-speech模型。这不是Pipecat整体不支持后者，而是Flows模块的特定限制。

V5借鉴声明式工作流、固定工具边界和受限策略候选；没有直接引入Pipecat运行时。下一阶段在LiveKit或Pipecat中选一个主要编排底座，避免两套状态机互相控制。

来源：https://docs.pipecat.ai/pipecat/flows/introduction

## Retell：业务流、函数和分支各司其职

Retell Conversation Flow区分对话、子Agent、函数、逻辑和结束节点；条件边、回退路径和上下文路由是显式组件。共享flow的更新可能影响多个Agent，应先测试后发布。V5采用“普通规划可切换，问题处理可插入；发布不改变正在进行的通话快照”的设计。没有创建Retell账户、电话线路或付费服务。

来源：https://docs.retellai.com/build/conversation-flow/overview

## 当前浏览器方案为什么只是起点

SpeechRecognition并非所有主流浏览器都可用，部分浏览器会把音频发往服务端，因此不能保证离线。abort停止识别且不尝试返回结果；这些语义适合挂断及取消旧轮次。V5对不支持、权限拒绝和网络错误提供真实状态及文字退路，不显示假的“正在听”。

来源：
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/abort

## 意图输出合同

不要让模型直接操作页面或把自然语言直接当交易指令。建议统一事件：{sessionId,eventId,baseRevision,type,payload}。先对白名单事实做类型、来源及版本检查，再提交状态；输出独立的spokenText、question、options、plan、needsConfirmation。V5已以共享reducer和revision实现其中的确定性部分，模型扩展是带逐字段原文的facts提议。原文子串吻合不等于语义正确，仍须确认。

官方DeepSeek参考：https://api-docs.deepseek.com/api/create-chat-completion/

## 真正上线前要量什么

首段音频时间、用户停说到开始回复的P50/P95、打断停止音频耗时、误打断率、转写修改率、重复追问率、任务完成率、每完成任务的语音/模型/人工成本。V5没有把合成语音事件的毫秒数当成真实用户延迟成绩。
