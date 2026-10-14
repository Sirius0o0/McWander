---
name: mcwander
description: Plan a local Citywalk with McDonald's rest stops using the McWander project, Amap walking routes and McDonald's MCP menu and price queries. Use for city strolls with time, walking-distance and dining-budget limits.
---

# McWander · 麦步

在本项目目录工作，使用现有脚本规划城市散步。网页和 CLI 共用规划模块，需保留整个项目。不要把本文件单独复制出去后假定脚本仍可用。

收集城市、具体出发点、出发时间、可用小时数、目标步行公里数、每人餐饮预算和兴趣。缺失时可采用上海、武康大楼、14:00、3 小时、8 公里、25 元、建筑与拍照的默认值，并说明假设。真实规划的城市和出发点应使用用户选择。目标接受 75%–112.5% 的范围；8 km 对应 6–9 km。

运行环境为 Node.js 22+。凭证使用本机环境变量 `MCD_MCP_TOKEN`、`AMAP_WEB_SERVICE_KEY`，可从 `.env.local` 加载。不要读取或输出凭证内容。

- 演示：`node --env-file=.env.local scripts/plan.mjs --demo`。
- 真实：`node --env-file=.env.local scripts/plan.mjs --stdin`，通过标准输入发送一个 JSON 对象，不把凭证放进参数。

输入示例：

```json
{"city":"上海","start":"武康大楼","departure":"14:00","hours":3,"targetKm":8,"budget":25,"interests":["architecture","photo"]}
```

兴趣枚举为 `architecture`、`nature`、`culture`、`photo`。输出是 JSON，包含站点时间轴、道路距离、停留估计、门店绕路时间、餐品核价与来源说明。失败时展示原因；不要把演示结果当成真实查询。

用结果中的实际数字解释路线。营业与价格是查询快照，景点开放时间、设施和未来库存未核验。不要承诺座位、厕所、充电设施、未来库存或准时取餐。比较套餐、单点和当前门店可用券，按餐品类型解释选项，不把饮品当作完整用餐。原价或同品单点差额只能使用核价结果。

CLI 只查询和核价。网页的领券入口需要用户主动点击并确认；不要在规划阶段替用户领券。不提供下单、付款或积分操作。更多接口边界见 [MCP_INTEGRATION.md](MCP_INTEGRATION.md)。
