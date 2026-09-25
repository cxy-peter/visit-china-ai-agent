/* Editorial place facts from linked public sources; no live opening or inventory claims. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.ShanghaiPlaces=f();})(globalThis,function(){
'use strict';
const checkedAt='2026-09-25';
const sources={
 m50:'https://english.shanghai.gov.cn/en-ScenicSpots/20231208/4a9c2830891541c68fb5b3143964eec8.html',
 parks:'https://english.shanghai.gov.cn/en-ArtExhibitions/20250710/248ddbe5a0054f1297b5bac426c1d4e4.html',
 sihang:'https://english.shanghai.gov.cn/en-ScenicSpots/20250220/48accefa828c45bd908dab51fdd77bcc.html',
 walk:'https://english.shanghai.gov.cn/en-citywalk/20240118/7663535633d248b0acc5e278a80e0da3.html',
 peoples:'https://english.shanghai.gov.cn/en-CityTour/20240306/78e6a001aed842d6b8c37607764bdbee.html',
 history:'https://english.shanghai.gov.cn/en-ArtExhibitions/20260506/45a00430e4a64c5eaa9d9aeeb418b3a6.html',
 huangpu:'https://english.shanghai.gov.cn/en-CityTour/20250325/a0b2498d73b74b658da4f279ee3d3684.html',
 garden:'https://english.shanghai.gov.cn/en-ScenicSpots/20231205/dc76893b94c248d195eaf7f4d44c6597.html',
 hefeng:'https://english.shanghai.gov.cn/en-SpecialtyFood/20251127/9119cbd6f6934ff3ad80b11850739fa6.html',
 tianzifang:'https://english.shanghai.gov.cn/en-SpecialtyShoppingAreas/20250806/744a5d61cd9644279abbac8f34678416.html',
 jingan:'https://english.shanghai.gov.cn/en-CityTour/20240905/017087a65ef54c5e92a474c42ed2dd84.html',
 square:'https://english.shanghai.gov.cn/en-CityTour/20250221/414f2867fb754414b20e1db057908162.html'
};
const rows=[
 ['m50','M50创意园','M50 Creative Park','江宁路','art','普陀区莫干山路50号','50 Moganshan Road, Putuo','纺织厂改造的艺术园区，可逛画廊与工作室。','Former textile factory with galleries and studios.','m50'],
 ['sculpture','静安雕塑公园',"Jing’an Sculpture Park",'自然博物馆','park','静安区北京西路510号','510 West Beijing Road, Jing’an','看雕塑、散步；与自然博物馆可组合安排。','Sculptures and a stroll, with the Natural History Museum nearby.','parks'],
 ['natural','上海自然博物馆','Shanghai Natural History Museum','自然博物馆','museum','静安雕塑公园内','Inside Jing’an Sculpture Park','自然历史展陈，适合对生物与地球感兴趣的旅客。','Natural history collections for visitors interested in life and Earth.','parks'],
 ['sihang','四行仓库抗战纪念馆','Sihang Warehouse Battle Memorial','曲阜路','museum','静安区光复路21号','21 Guangfu Road, Jing’an','了解四行仓库历史，毗邻苏州河。','Explore the history of Sihang Warehouse beside Suzhou Creek.','sihang'],
 ['coffee','人民咖啡馆（四行仓库）',"People’s Coffee House at Sihang Warehouse",'曲阜路','food','静安区光复路9号','9 Guangfu Road, Jing’an','政府城市漫步指南收录的咖啡馆；出发前核对门店状态。','A café listed in a government city-walk guide; check current operation.','walk'],
 ['joycity','上海大悦城','Shanghai Joy City','曲阜路','shopping','静安区西藏北路198号','198 North Xizang Road, Jing’an','商场休息与逛街；店铺名单以现场为准。','A mall stop for a break and browsing; check the current directory.','walk'],
 ['peoplespark','人民公园',"People’s Park",'人民广场','park','黄浦区南京西路231号','231 West Nanjing Road, Huangpu','市中心公园，可安排一段散步。','A central park for a walking break.','peoples'],
 ['history','上海市历史博物馆','Shanghai History Museum','人民广场','museum','黄浦区南京西路325号','325 West Nanjing Road, Huangpu','了解上海城市历史；具体展览另查官方安排。','Shanghai city history; check the museum for current exhibitions.','history'],
 ['bund','外滩','The Bund','南京东路','walk','黄浦区中山东一路沿江区域','Zhongshan East First Road waterfront, Huangpu','看滨江与历史建筑，可与南京路步行街组合。','Riverfront and historic buildings, combinable with Nanjing Road.','huangpu'],
 ['nanjing','南京路步行街','Nanjing Road Pedestrian Street','南京东路','shopping','黄浦区南京东路步行街','East Nanjing Road pedestrian area, Huangpu','城市商业步行街，适合逛街与寻找餐饮。','A central shopping street with dining options.','huangpu'],
 ['yuyuan','豫园','Yuyuan Garden','豫园','garden','黄浦区福佑路168号','168 Fuyou Road, Huangpu','传统园林；园内参观与外围商城分别安排。','Classical garden; garden admission and the surrounding mall are separate.','garden'],
 ['bazaar','豫园商城','Yuyuan Garden Malls','豫园','shopping','黄浦区豫园及城隍庙周边','Yuyuan / City God Temple area, Huangpu','园林外围的街区与餐饮购物，不等同于进入豫园。','Shopping and dining outside the garden, distinct from garden admission.','garden'],
 ['hefeng','豫园和丰楼','Hefenglou at Yuyuan','豫园','food','黄浦区豫园商城内','Inside Yuyuan Garden Malls, Huangpu','可查锅贴、葱油饼等本地小吃；店内供应另核对。','Look for local snacks such as potstickers and scallion pancakes; confirm availability.','hefeng'],
 ['xintiandi','新天地','Xintiandi','新天地','walk','黄浦区新天地街区','Xintiandi area, Huangpu','可安排街区漫步与餐饮。','A neighborhood walk with dining options.','huangpu'],
 ['tianzifang','田子坊','Tianzifang','打浦桥','art','黄浦区泰康路街区','Taikang Road area, Huangpu','石库门弄堂里的创意商铺与餐饮。','Creative shops and food in traditional lanes.','huangpu'],
 ['weixiang','味香斋（泰康路）','Wei Xiang Zhai, Taikang Road','打浦桥','food','黄浦区泰康路220号','220 Taikang Road, Huangpu','麻酱面等上海风味；不预设素食或过敏原条件。','Shanghai-style noodles; ask about dietary needs and allergens.','tianzifang'],
 ['pongciao','Pongciao巧克力店','Pongciao chocolate shop','打浦桥','food','黄浦区泰康路258号','258 Taikang Road, Huangpu','巧克力与伴手礼门店，出发前查询营业。','Chocolate and gifts; check opening before visiting.','tianzifang'],
 ['jinganpark','静安公园',"Jing’an Park",'静安寺','park','静安寺商圈、华山路一侧','Huashan Road side of Jing’an Temple area','绿荫公园与下沉式广场，可作为休息点。','A leafy park with a sunken square for a break.','jingan'],
 ['taikoosquare','兴业太古汇北广场','HKRI Taikoo Hui North Square','南京西路','square','静安区南京西路兴业太古汇北侧','North side of HKRI Taikoo Hui, West Nanjing Road','城市公共广场，可结合南京西路街区漫步。','An urban square combinable with a West Nanjing Road walk.','square']
];
return{checkedAt,sources,places:rows.map(([key,zh,en,station,category,address,addressEn,summaryZh,summary,source])=>({id:'place-'+key,zh,en,station,category,address,addressEn,summaryZh,summary,url:sources[source],checkedAt}))};
});
