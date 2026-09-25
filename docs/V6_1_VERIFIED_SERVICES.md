# V6.1 上海真实地点与交通服务记录

核对日期：2026-09-25。资料限定为上海政府、机场、国铁和物业运营方网站。共 **20 条记录：6 家酒店、5 家餐饮、9 条交通或便民服务**，覆盖上海站、虹桥枢纽、人民广场、浦东机场。10 条有来源明确的公开商务电话。

这批数据是网页事实核对，不是电话实拨、到店确认或实时接口接入。不能据此宣称有空房、空桌、空柜、可借充电宝、可用插座、余票、即时价格或已完成预订。营业和服务安排以出发时运营方信息为准。

## 数据与接入

`v5/verified-services-data.js` 导出浏览器全局 `VerifiedTravelServices`，同时支持 Node `require`。

- `items`：20 个双语实体／服务，保留地址、公开电话用途与分机、来源日期、核对日期、关联站点和依据。
- `records`：20 条 Source Library / RAG 可消费记录，包含双语摘要。酒店／餐厅为 `recordType: place`，其余为 `service`；`serviceKind` 保留具体类别。
- `places`：11 个实际酒店或餐饮场所，兼容现有地点字段。线上12306指南不作为实体门店。
- `cards(kind, location, language, pool)`：按明确站点关联筛选服务卡；支持中英文站名、上海站、PVG等别名。未知地点不返回本地场所，不用其他区域补位；国铁12306是全国适用线上入口，可保留。上海／空地点显示覆盖目录，不宣称就在用户附近。
- `pool` 应传当前资料库，以保留暂停、变更待审、过期、候选未发布状态的拦截。单纯基于原始静态 `records` 渲染会遗漏运营修改。
- `stationEvidence` 可直接作为站点图关联边：`station` 是现有 `metro-data.js` 的稳定ID，`basis` 区分运营方邻近、物业内场所、官方设施位置；每条边带中英文解释和原始来源。
- `phoneRole` 区分酒店总机、订房电话、餐厅电话、餐厅分机、仅酒店总机。不可把酒店总机标为餐厅直拨。
- `sourcePublishedAt`、`sourceUpdatedAt` 与 `reviewedAt` 分开。机场交通页给出的是更新时间，不伪装成发布日期；再次读到旧网页也不等于网页发布了新消息。

`verified-marriott-city-centre` 带 `replacementOf: sh-marriott-city-centre`，与原来的万豪市中心记录是同一物业。Source Library、服务模块与地点模块统一使用旧的稳定引用ID，库查询也支持新ID别名，同一家酒店只保留一条来源记录。

`service-data.js` 已合并真实服务；`library.js` 合并服务与新闻；`discovery.js` 将新餐厅纳入按站点推荐并保留源状态筛选。`service-ui.js` 在对话下方显示双语地址、电话用途／分机、地图及官方入口；免费模式的明确服务提问也能使用相同记录。地点不明或未覆盖时，不用其他地区补位。对话卡片和资料检索均读取当前运营资料池；已暂停、过期、变更待审或未发布版本不能显示为已核对推荐。

## 核对清单

| ID 后缀 | 双语地点／服务 | 地址与站点关联依据 | 公开电话 |
|---|---|---|---|
| pullman-jingan | 上海静安铂尔曼 / Pullman Shanghai Jing'an | 梅园路330号；[运营方说明可从上海火车站步行前往](https://pullman.accor.com/en/hotels/shanghai/7598.html) | +86 21 6353 5555，酒店 |
| courtyard-central | 上海浦西万怡 / Courtyard Shanghai Central | 恒丰路338号；[官网附近站点列出汉中路及上海火车站](https://www.marriott.com/en-us/hotels/shapx-courtyard-shanghai-central/overview/) | +86 21 2215 3888，酒店 |
| marriott-city-centre | 雅居乐万豪侯爵 / Marriott Marquis City Centre | 西藏中路555号；[官网列出人民广场地铁枢纽](https://www.marriott.com/en-us/hotels/shamc-shanghai-marriott-marquis-city-centre/overview/) | +86 21 2312 9888，酒店 |
| jw-tomorrow-square | 明天广场JW万豪 / JW Marriott at Tomorrow Square | 南京西路399号；[官网附近地铁站为人民广场](https://www.marriott.com/en-us/hotels/shajw-jw-marriott-hotel-shanghai-at-tomorrow-square/overview/) | +86 21 5359 4969，酒店 |
| hyatt-place-hongqiao | 虹桥商务区凯悦嘉轩 / Hyatt Place Shanghai Hongqiao CBD | 申虹路9号；[官网说明邻近虹桥交通枢纽](https://www.hyatt.com/hyatt-place/zh-CN/shazh-hyatt-place-shanghai-hongqiao-cbd) | +86 21 3329 5588，酒店 |
| dazhong-airport | 大众空港宾馆 / Dazhong Airport Hotel | 迎宾大道6001号；[集团官网定位在浦东T1与T2之间](https://www.96822.com/Choose1_Details.aspx?DetailID=20&ID=11)；页面原始发布时间为2017年 | +86 21 3879 9999，订房，未实拨 |
| momo-cafe | MoMo Café | 万怡酒店内，恒丰路338号；[餐厅官网](https://www.marriott.com/en-us/hotels/shapx-courtyard-shanghai-central/dining/)与酒店交通页共同支持上海站／汉中路关联 | +86 21 2215 3888 转6710 |
| man-bao-lou | 满宝楼 / Man Bao Lou | 万豪侯爵酒店内，西藏中路555号；[当前官网名称](https://www.marriott.com/en-us/hotels/shamc-shanghai-marriott-marquis-city-centre/dining/)为满宝楼，未沿用第三方旧称Man Ho | +86 21 2312 9732，餐厅 |
| wan-hao-xuan | 万豪轩中餐厅 / Wan Hao Xuan | 明天广场酒店内，南京西路399号；[餐饮页](https://www.marriott.com/en-us/hotels/shajw-jw-marriott-hotel-shanghai-at-tomorrow-square/dining/)与酒店交通页支持人民广场关联 | +86 21 5359 4969 转6436 |
| hyatt-kitchen | 嘉味餐厅 / The Kitchen Menu | 凯悦嘉轩酒店内，申虹路9号；[官网餐饮页](https://www.hyatt.com/hyatt-place/en-US/shazh-hyatt-place-shanghai-hongqiao-cbd/dining)；随物业关联虹桥枢纽 | +86 21 3329 5588，**酒店总机**，非餐厅直拨 |
| mstand-pvg-t1 | M Stand / Pudong T1 Arrivals | [政府指南](https://english.shanghai.gov.cn/en-Cafes/20240718/2d6c75b52aad47cba2e60fff2548358e.html)给出浦东T1到达4号门附近；需核对当前营业 | 无，未补造 |
| pvg-taxi | 浦东机场出租车点 / Pudong taxi pickup | [2026年更新的政府机场指南](https://english.shanghai.gov.cn/en-Transportation/20231214/649e06ea38f74aaeb573fa2debbe97d3.html)：T1到达12号门外、T2到达25号门外 | 无 |
| hongqiao-airport-taxi | 虹桥机场出租车点 / Hongqiao Airport taxi pickup | [机场官网](https://www.shanghaiairport.com/enhq/czc/index.html)：T1到达1号门外、T2到达4号门外；不是虹桥火车站的出租车点 | 无 |
| shanghai-rail-station | 上海站 / Shanghai Railway Station | [政府铁路站场指南](https://english.shanghai.gov.cn/en-Transportation/20250126/484b92f86eeb49d7b26086d25010d782.html)：静安秣陵路、地铁1/3/4号线 | 无 |
| hongqiao-rail-station | 上海虹桥站 / Shanghai Hongqiao Railway Station | [同一政府指南](https://english.shanghai.gov.cn/en-Transportation/20250126/484b92f86eeb49d7b26086d25010d782.html)：闵行申贵路、地铁2/10/17号线 | 无 |
| rail-12306 | 国铁英文购票 / China Railway English booking | [12306官方FAQ](https://www.12306.cn/en/faq.html)：实名购票、证件、购票渠道；线上服务，无实体位置 | 无 |
| hongqiao-indoor-navigation | 虹桥室内导航 / SH MaaS Indoor Navigation | [政府交通委来源指南](https://english.shanghai.gov.cn/en-LatestNews/20251107/2ee190bc581c4b53b953b64eb3749534.html)：随申行→枢纽通→虹桥火车站→室内导航 | 无 |
| hongqiao-p10-charging | 虹桥P10充电设施 / Hongqiao P10 phone charging | [2026-08-02政府报道](https://english.shanghai.gov.cn/en-Latest-WhatsNew/20260802/f314cad958d4426f832031a1c87fe1e9.html)：P10地下一层网约车候车区有手机充电设施 | 无 |
| metro-lockers | 地铁站寄存 / Metro station lockers | [2026年官方服务指南](https://english.shanghai.gov.cn/en-EasyShanghai/20260909/7ff66d198288406e8fd17c5c4c430eea.html)：明确列出上海站、虹桥站、南京东路、徐家汇、豫园、迪士尼；真实柜位与余量在Metro大都会查询 | 无 |
| pvg-rest-charging | 浦东休息区充电 / Pudong rest-area charging | [政府机场服务报道](https://english.shanghai.gov.cn/en-Latest-WhatsNew/20250710/4da2065f8ff94173bd996ad69f1e99cd.html)：T1/T2过夜休息区提供充电设施，未给插座级坐标 | 无 |

## 明确没有推断的部分

1. 没有凭空生成GPS坐标、距离排序、最近地铁出口、步行分钟或直线距离。来源有“可步行抵达”时只保留这一级关系；酒店内餐厅通过“餐厅在物业内 + 物业与站点关系”两条证据关联。
2. 没有把虹桥机场T2出租车点、虹桥火车站出租车点、P10网约车区合并。卡片按实际站点筛选。
3. 没有把上海站等同于上海虹桥站，地铁乘车和国铁高铁购票继续分开；具体车次、票价、座位以12306的日期查询为准。
4. P10和浦东休息区是有资料支持的充电设施，并不证明存在某品牌充电宝租赁柜或当前插座空闲。
5. 寄存来源没有明确列出人民广场，不能自动把“上海地铁有寄存柜”推演为“人民广场本站有空柜”。
6. 不引入实习照片、内部流程地址、私人联系方式，也没有从旅行聚合站补造官方事实。

## 验收

`node --test v5/verified-services.test.js` 检查站点ID能连接到现有路网、主来源和关联依据可回溯、电话类型与分机保留、未知地点不补位、持有／过期资料不出卡、线上指引不变成实体门店。自动测试验证数据约束；网页事实仍由本次人工核对与后续来源刷新负责。
