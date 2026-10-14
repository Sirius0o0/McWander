# 优惠比价方法来源

2026-10-14 读取以下公开参赛项目，以理解接口调用方法。本项目没有复制其源代码，价格结论均以本机真实 MCP 核价为准。

- [麦麦省钱营养师，Issue #87](https://github.com/M-China/mcd-developer-innovation-challenge/issues/87) / [项目说明](https://github.com/AAA-EE/mcd-budget-planner)：券包资产不等于当前门店可用券；用 query-store-coupons 进行门店校验，把 couponId、couponCode 与对应的券商品放入 calculate-price。
- [麦门省钱助手，Issue #314](https://github.com/M-China/mcd-developer-innovation-challenge/issues/314) / [项目说明](https://github.com/TXX-XXY/mcd-saving-assistant)：对同一餐品组成比较套餐和单点价格，使用真实核价而不是菜单价求和。
- [麦麦省钱管家，Issue #288](https://github.com/M-China/mcd-developer-innovation-challenge/issues/288) / [项目说明](https://github.com/skillajiang-web/mcd-savings-butler)：可领取不代表已经到账；领券后重新验证。麦步保留用户主动确认步骤，规划时不自动领券。

具体实现：`lib/meals.mjs`。套餐根据真实 rounds 构造选择；个人券凭证留在后端；主食、小食、饮品分组展示。报价查询不创建订单，不消耗券。
