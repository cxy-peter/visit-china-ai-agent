# V6.6｜最终合并与验收记录

2026-09-25，PR #4 已合并到main，合并提交 `2d27d327da097c1fb874b23c511b73f254d262cc`。通过验收的head为 `672d18121fb0402163b32da4be15a4af1b84c61d`；CI实际检查的PR合并树提交为 `0d0e50c4d54c544308725ba9d1e80d5e213720e7`。本文件仅记录状态，不改变应用或自动发布技能候选。

## 最终检查

| 检查 | 结果 |
|---|---:|
| 原Prompt/模型路由、预算及关键模块契约 | 23/23 |
| 程序与接口（包含原20,000条合成/资料改写回归） | 455/455；0失败、0跳过 |
| V6.6服务卡、时段与运营浏览器检查 | 24/24 |
| 五城KB与运营浏览器兼容 | 29/29 |
| V6.4关键交互浏览器兼容 | 19/19 |
| 原V6.4完整工作流 | 成功 |
| 原V6.5完整工作流 | 成功 |

- 当前V6.6： https://github.com/cxy-peter/visit-china-ai-agent/actions/runs/36182535600
- 原V6.5： https://github.com/cxy-peter/visit-china-ai-agent/actions/runs/36182535528
- 原V6.4： https://github.com/cxy-peter/visit-china-ai-agent/actions/runs/36182535583
- PR： https://github.com/cxy-peter/visit-china-ai-agent/pull/4

`v66-validation-evidence`工件含`v6.6/acceptance.json`、程序日志、各浏览器报告、截图及`prompt-preservation.json`；`v66-verified-source`是CI验收的源码。检查存在重叠，不相加为独立问题或用户数量。

## 失败与修复

初轮候选位于折叠区导致重验收按钮不可见，产品改为自动展开最新待审候选；未使用force-click。随后统一铁路表格与模拟请求的出发时段交集，保留“一日团”原有用户术语。旧完整Harness浏览器脚本仍无条件点击展开区域，反而把新的已展开候选关上：测试改为断言发布按钮可见，保留实际发布/回滚，并新增“取消人工确认不得发布”的检查。所有原有行为验收保留，最终三套工作流均成功。

## 能证明和不能证明的事

原意图7,123字符及V6.5新增五城说明保留，生成/提取/候选改进提示、DeepSeek适配、模型路由、预算和语音/行为审核关键模块由脚本核对。新UI不降低模型能力或调用预算，但原文不变并不能证明真实回答质量绝无退化。

本轮没有真实付费模型调用、真人麦克风、商户库存、真实订单、随机在线A/B或生产端验收。模拟产品接口不会向Trip.com、美团或其他服务商发请求；公开入口不是集成预订。自动技能验收不是自动发布，也不是语义正确概率。Vercel部署应另行核对，不把GitHub合并当作生产成功。

完整流程见[V6.6实现与产品交接](V6_6_IMPLEMENTATION_AND_PRODUCT.md)、[设计调研](V6_6_DESIGN_RESEARCH.md)和[项目简历表述](V6_6_RESUME_PUBLIC.md)。私人的Bitget材料、OCR/OKR、简历联系方式、密钥、录音与DCG材料不在仓库中。
