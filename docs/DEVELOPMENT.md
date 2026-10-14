# McWander 开发说明

## 项目结构

```text
McWander/
├── public/                  # 移动端网页、地图交互与 SVG 插画
├── lib/
│   ├── routes.mjs           # 候选景点、里程约束、门店插入与时间安排
│   ├── meals.mjs            # 套餐选配、券商品和实际核价比较
│   ├── services.mjs         # 高德请求、MCP 握手、白名单与错误处理
│   ├── preview-access.mjs   # 本机与局域网 Host 校验
│   └── planner.mjs          # 网页与 CLI 共用的规划入口
├── server.mjs               # 静态资源、查询接口与本机领券入口
├── scripts/                 # CLI、连接检查、浏览器 QA 与局域网工具
├── tests/                   # Node.js 内置测试，无外部请求
├── pics/                    # README 原始界面截图与项目图标
├── references/              # 公开实现思路来源
├── .env.example             # 空白凭证模板
├── SKILL.md                 # 智能体使用说明
├── MCP_INTEGRATION.md       # 实际 MCP 工具及业务流程
└── CONTEST_DECLARATION.md    # 官方参赛声明原文
```

应用没有第三方运行时依赖。`artifacts/` 用于本机检查结果与生成的截图，不提交到 Git；`.env.local` 同样不提交。

## 常用命令

| 命令 | 用途 | 外部请求 |
| :--- | :--- | :--- |
| `npm run dev` | 本机预览，监听 `127.0.0.1:4173` | 生成实时路线时发起 |
| `npm run dev:lan` | 局域网预览，监听 `0.0.0.0:4173` | 生成实时路线时发起 |
| `npm test` | 单元测试 | 无 |
| `npm run doctor` | 检查服务连接与 MCP 工具 schema | 高德与麦当劳，只查询 |
| `node scripts/plan.mjs --demo` | 输出固定示例 JSON | 无 |
| `node --env-file=.env.local scripts/check-planning.mjs 8` | 验证一次 8 km 实时规划 | 高德与麦当劳，只查询 |

`PORT` 环境变量可以覆盖默认端口。防火墙辅助脚本固定使用 4173；若更换端口，需同步调整防火墙配置。

## CLI 实时规划

`--stdin` 从标准输入接收一个 JSON 对象，不从命令行参数接收凭证。兴趣字段支持 `architecture`、`nature`、`culture`、`photo`。

先将以下内容保存为本机文件 `artifacts/input.json`（如目录不存在，请先创建）：

```json
{
  "city": "上海",
  "start": "武康大楼",
  "departure": "14:00",
  "hours": 3,
  "targetKm": 8,
  "budget": 25,
  "interests": ["architecture", "photo"]
}
```

PowerShell：

```powershell
Get-Content -Raw artifacts/input.json | node --env-file=.env.local scripts/plan.mjs --stdin
```

Bash：

```bash
node --env-file=.env.local scripts/plan.mjs --stdin < artifacts/input.json
```

输出包含站点、时间轴、道路距离、估计停留、门店绕路成本、核价餐品和来源说明。CLI 仅查询与核价，不提供领券、下单或付款操作。

## 验证

### 单元测试

```bash
npm test
```

覆盖输入约束、目标距离范围、路线搜索、跨夜营业时间、套餐 roundList、核价数据过滤、MCP 响应解包、工具权限、地图坐标和标记避让、预览 Host 校验。

### 浏览器 QA（可选）

需要本机安装 Microsoft Edge 和 Playwright。Playwright 仅用于开发检查，应用运行不依赖它。

```bash
npm install --no-save --package-lock=false playwright
# 在另一个终端中启动 npm run dev，然后执行：
node scripts/qa.mjs
```

QA 检查 320、375、390 与 1440 像素宽度、页面溢出、设置、收藏、地图与行程切换，以及 PNG 导出。可通过 `PLAYWRIGHT_MODULE_PATH` 指定已有的 Playwright 模块目录，通过 `PREVIEW_URL` 指定预览地址；默认访问 `http://127.0.0.1:4173`。

```bash
# 额外生成一次真实路线，并检查地图交互与核价界面；需要有效凭证
node scripts/qa.mjs --live
```

即使检查领券确认界面，脚本也不会提交领券操作。`--replay` 复用 `artifacts/revision-live.json`，其中地图 ID 依赖同一个仍在运行的服务实例，服务重启后不可直接复用。

### 局域网检查

启动 `npm run dev:lan` 后，将下面地址替换为终端输出的实际地址：

```bash
node scripts/check-lan.mjs http://<电脑IPv4>:4173
```

检查页面和资源可访问、实时查询配置就绪、领券操作被拒绝、凭证文件不可访问。需要两项服务凭证已配置；省略地址则通过本机回环地址检查正在运行的局域网模式。

Windows 可在管理员 PowerShell 中运行 `scripts/enable-lan-firewall.ps1`，为当前默认网络接口的 IPv4、同一子网与 Node.js 配置 TCP 4173 放行规则。脚本复用已有规则，结果写入 `artifacts/lan-firewall-result.json`；为兼容已有安装，规则内部名称保留旧名称。它不启动服务，网络地址改变后需重新执行并重启局域网服务。

## 数据与权限

服务端只允许明确列出的静态资源和业务接口。查询时读取本机环境变量；不向网页发送地图 Key、MCP Token 或账号券凭证。

MCP 查询使用工具白名单。领券有单独的确认入口，局域网模式拒绝该入口；本项目不开放下单、支付、兑换和任意 MCP 工具调用。实时查询异常会显示错误并保留此前结果。

收藏保存在浏览器的 `localStorage`。内部存储键保留早期名称，以继续读取已有收藏。
