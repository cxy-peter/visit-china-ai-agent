# V6.2 · JCB证据纠正与有来源的特色路线

资料正文核对日期：2026-09-25。以下是本轮实际打开的政府或运营方原文；没有把搜索标题转换成全文，也没有将核对日期当成新闻发布日期。

## JCB：先回答支持，再说明卡片条件

上海市口岸服务办公室2025-06-30发布的[地铁拍卡过闸问答](https://kab.sww.sh.gov.cn/xwzx/001001/20250630/e8cb8615-cf77-4c64-b41c-de4039d6a798.html)说明，自2025-06-28起试点扩展到轨道交通全网，包括市域线。JCB在支持品牌中；适用的是可在国内使用的芯片闪付卡，小额免密需已开启，余额或可用信用额度需充足，不包括TYPE-B芯片或无ODA功能的卡。

[JCB自己的2025-06-30公告](https://www.global.jcb/en/press/2025/202506301200_alliance.html)交叉确认上海、北京的直接拍卡乘地铁功能，包含机场线路，无需预先购票。没有沿用该旧公告的线路/站点总数当作当前网络规模。

应回答“符合条件的JCB卡可以直接拍卡坐上海地铁”，再说明卡片条件。用户没有透露账户额度，不能推导为不支持JCB，也无需让用户在聊天里提供额度或卡号。直接拍卡、刷卡购票、绑定支付应用是三种不同场景，不能拿其中一种证据否定另一种。手机钱包的具体兼容性和境外发行卡的交易结果，不由品牌支持这一事实单独证明。

两条记录分别为`sh-metro-jcb-contactless`、`operator-jcb-shanghai-contactless`，含短原文定位片段、双语人工归纳、正文核对日期与原发布时间，可由共享RAG自然召回。

## 地点与路线来源

|记录|原文证据|使用范围|
|---|---|---|
|theme-changning-walking-map|[长宁区慢行地图](https://www.shcn.gov.cn/col5685/20240826/1265407.html)，正文发布日期2024-08-12|愚园路、中山公园、华政步道等同片区路线关联；未直接复制地图预计用时|
|theme-changning-yuyuan-food|[愚园路玩法](https://www.shcn.gov.cn/col6991/20251009/1299696.html)，正文日期2025-10-03，不使用URL里的10-09作为发布日期|江苏路一侧起点、公共市集、董记庐春/过乐喜/宜小蘭/Onita的街区关联；不沿用旧快闪、市集活动时间|
|theme-changning-huazheng|[苏河华政步道](https://www.shcn.gov.cn/col314/20230128/1229393.html)，正文日期2023-01-27|中山公园与步道衔接，万航渡路/华阳路及公园3号门对面入口；不把公共步道等同于教学楼随意开放|
|theme-changning-renaissance|[万豪官网](https://www.marriott.com/en-us/hotels/shabz-renaissance-shanghai-zhongshan-park-hotel/overview/)，无明确发布日期|长宁路1018号、酒店总机+86 21 3135 8888、位于中山公园站上方、Azur及Zpark餐饮；没有查房态或实时报价|
|theme-sihang-memorial|[静安区政府回复](https://www.jingan.gov.cn/govxxgk/JA0/2020-08-27/8b99354e-6c58-4503-9b5f-ff637facde1a.html)，2020-08-27|四行仓库地址、保卫战主题、西墙及晋元纪念广场；与现有place-sihang复用|
|theme-songhu-memorial|[上海市纪委监委场馆介绍](https://www.shjjjc.gov.cn/2015jjw/n2346/n2349/u1ai63692.html)，2017-10-14|宝山场馆地址、园内姚子青营牺牲处；不把旧开放时间作为今天承诺|
|theme-songhu-current-directory|[2025年度博物馆名单](https://whlyj.sh.gov.cn/bwg/20260106/265b828de4394054bdc2e61e1599ed4c.html)，2026-01-06|对淞沪抗战纪念馆名称和友谊路1号地址作较新交叉核查|
|theme-jinshan-landing|[市政府金山区介绍](https://www.shanghai.gov.cn/jinshan/index.html)，无明确发布日期|金山卫沿海1937年11月登陆史、南安路87号纪念园；独立安排一天|

路线复用旧目录中的四行仓库、人民咖啡馆、满宝楼及市中心酒店。已存在的来源hold、正文变化、过期、酒店电话角色和无实时库存边界均保留。宝山/金山尚无本轮实际核验的同片区吃住记录，因此不把中心城区酒店包装成附近酒店。

## 对话输出与导出

`theme-routes.js`为独立只读规划工具，不控制主对话意图：

- `build({theme,language,startTime,days,includeFood,includeHotel,sourcePool})`返回结构化路线。主题为`changning`或`wwii-shanghai`，必须把当前全量共享资料传入`sourcePool`才能同步运营停用状态。
- 每个stop含顺序、计划到达/离开、预留移动时间、真实地址、地图查询链接与来源。时间是可以修改的规划分配，不是实时算路结果或开馆时间。
- 顶层`sourceIds`最多3项；`allSourceIds`、`sources`和每个stop的`sourceIds/sourceUrls`保留完整依据。
- 参观历史路线的次序按今天的出行安排组织，不声称还原日军进攻行军顺序。默认中心城区、宝山、金山分3天；压缩天数时裁剪整天，不将远距离片区塞进紧凑步行线路。
- `answer(plan)`给出双语简述；`exportPlan(plan, 'markdown' | 'json' | 'csv')`提供可下载内容。CSV屏蔽表格公式注入，导出保留来源与时间性质。
- 其他主题返回`null`，由调用方用检索到的证据继续规划，不把未知区域套成长宁。标题匹配仅为离线或模型缺theme时的补充。

## 本轮独立验证

`node --test v5/theme-routes.test.js`：15/15通过，覆盖JCB条件边界、来源发布时间、主题与地铁查询区分、参观顺序、区域分天、英语、缺源/停用/过期、晚间跨天时刻、吃住开关以及三种导出格式。它们验证本地规划和证据约束，不代表新增15次真实DeepSeek调用或真实街道步行验收。
