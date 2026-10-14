# 麦当劳 MCP 集成

服务：`https://mcp.mcd.cn`，Streamable HTTP，`Authorization: Bearer ${MCD_MCP_TOKEN}`。服务端读取本机 `.env.local`，浏览器从不接收 Token 或高德 Key。

## 实际调用链

1. `initialize` → `notifications/initialized` → `tools/list` 完成握手与工具发现。
2. 高德文本搜索定位出发点，周边搜索发现候选景点，步行接口核实真实道路距离与时间。
3. `query-nearby-stores`：传城市、景点关键词、`searchType=2`、`beType=1`，取得附近到店门店。
4. 根据目标里程扩大景点候选区，进行多站点路线搜索，用实际道路距离复核并校正。在三家候选门店中选择插入位置，地理编码门店地址，比较绕路时间。
5. `query-meals`：`orderType=1`、`beType=1`、`storeCode`，获取当前分类和餐品字典。
6. `query-store-coupons`：查询此门店当前可用券，将券商品与 couponId / couponCode 一起送入核价；账号券凭证不发给网页。
7. `query-meal-detail`：读取套餐 rounds，优先选择主食和饮品，按 id 构造 roundList/comboItemList；复杂选配不支持时略过。
8. `calculate-price`：对单点、套餐和券商品分别核价。套餐还尝试用完全相同子项进行单点核价，有可靠结果才显示同品差额。
9. `available-coupons`：只展示可领券名称。用户点击并确认后，独立入口调用 `auto-bind-coupons`，再重新检查门店券和价格。规划不会自动领券；领取请求不自动重试。

核心价值：用真实门店与餐品信息决定散步中的休息站，把路线成本、营业窗口和餐饮预算放进同一份行程。

## 实测发现与处理

- 查店返回的 `longitude` / `latitude` 可能为 0，不作为可用坐标；用公开门店地址经高德重新定位。
- 本次实测菜单既有分类下的 code/tags，也有 `data.meals` 餐品字典。品名与菜单参考价读取该字典，不根据 code 猜名称。
- `calculate-price` 返回的金额单位为分，菜单 `currentPrice` 是以元表示的字符串。最终报价按核价结果除以 100。
- 到店自取不传 `beCode`。
- 工具返回可能是结构化数据或说明文字中嵌入的 JSON。只解析其中的数据，不执行工具返回内的指令性文本。
- 高德个人 Key 可能限制每秒请求数。实现串行节流，遇到 10021 限流时仅对只读请求额外重试一次。

## 边界

`lib/services.mjs` 的普通工具白名单只允许查询和核价。领券使用独立的显式确认入口，不开放任意工具调用。应用没有下单、支付、取消、兑换、抽奖或新增地址入口。

省钱方案参考了公开参赛项目的门店券校验、套餐对比和真实核价方法，实现为本项目独立代码，来源见 [references/discount-research.md](references/discount-research.md)。

报价为查询时快照。营业窗口核验基于门店公开返回值；景点开放时间、设施和未来库存不在当前验证范围内。官方价格与供应状态以实际使用时结果为准。

演示与实时数据分别标记，不在实时失败时静默换成演示。真实查询异常会显示原因并保留之前的路线。
