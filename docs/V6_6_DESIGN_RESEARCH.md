# V6.6｜对话服务推荐与自动验收设计调研

查阅日期2026-09-25。下面是对官方公开描述的对照，不是登录App后的完整可用性测试；采用的是交互机制，没有复制品牌资产或把厂商转化率当成本项目收益。

## TripGenie：语言输入进入实际页面

[Trip.com原始介绍（2023-07-25）](https://www.trip.com/newsroom/introducing-tripgenie-groundbreaking-ai-travel-assistant/)描述文字/语音输入、图文与链接、筛选字段以及浮动对话与浏览结合。采用“先理解需求，再把下一步做成页面动作”。本项目保留显式选择和查询条件，但没有Trip的库存或自动预填能力；公开平台入口要注明需重新核对。

## Mindtrip：建议可以保留，再加入计划

[Mindtrip官网](https://mindtrip.ai/)展示偏好对话、照片/地图/评论、收藏和行程组织。采用“查看选项”和“先留作备选”分离，避免看了一眼就被当成已决定。本站仅做当前标签页与答案关联的选项记忆，没有复制多人行程、票据导入或真实预订。官网部分功能仍标为coming soon，不把整页视为全部功能已经上线。

## Google对话设计：选择用来推进，而非重复

[Conversation Design—Chips](https://developers.google.com/assistant/conversation-design/chips)提出用简短、相关、行动导向的选择帮助澄清目标和采取下一步，不重复已有列表。采用时段快选、“暂无需要”等少量动作，与对话同屏。这里只参考历史设计文档，不建议接入已终止的旧Conversational Actions运行平台。

## Agent验收：评测最终状态而不是只看回答

[Anthropic：Demystifying evals for AI agents（2026-01-09）](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)区分执行轨迹与环境结果，并结合代码、模型与人工检查。采用后，测试不只断言“已发布”字样，还检查实际配置、下一次检索和回滚；不把自动检索通过当作语义正确，也不把打开提供商页面当作预订。

## 本项目选择与未采用部分

采用：情境卡、明确的收藏/查询/平台跳转状态、铁路条件一致性、一次结果反馈、受限运营目标、同批对照和指纹绑定。

未采用：无授权复制OTA库存、自动购买、伪造产品价格、自动多模型赛马、依据点击率自动上线规则，以及范文中的K8s/HPA吞吐与准确率。产品增量需要独立验收；框架或模式名称本身不是收益。
