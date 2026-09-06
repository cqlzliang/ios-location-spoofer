# Location Picker — Cloudflare Worker

与 `../server.js` API 完全兼容，免 VPS、自带 HTTPS，支持 **Loon / Shadowrocket / Surge** 的 `configUrl`。

## 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 地图选点网页（URL 加 `?token=` 才能保存） |
| `/loc.json?token=` | GET | 读取坐标 JSON |
| `/set?token=` | POST | 保存坐标 |
| `/enable?token=` | POST | 开启/恢复定位伪造 |
| `/favorites?token=` | GET | 读取全局收藏定位点 |
| `/favorites?token=` | POST | 新增收藏定位点 |
| `/favorites/:id?token=` | PATCH | 修改收藏名称和地址（坐标不变） |
| `/favorites/:id?token=` | DELETE | 删除收藏定位点 |
| `/health` | GET | 健康检查（无需 token） |

## 部署

> 只想用 Cloudflare 网页后台复制粘贴、不想装 npm / Wrangler 的用户，看这里：[`../cloudflare-webui/`](../cloudflare-webui/)。

### 1. 安装依赖

```bash
cd location-picker/worker
npm install
```

### 2. 创建 KV 命名空间

```bash
npx wrangler kv namespace create LOC_KV
npx wrangler kv namespace create LOC_KV --preview
```

把输出的 `id` 填进 `wrangler.jsonc` 的 `id` 和 `preview_id`。

### 3. 设置访问口令

```bash
npx wrangler secret put TOKEN
# 输入随机字符串，例如 openssl rand -hex 24 生成的值
```

本地开发可复制 `.dev.vars.example` 为 `.dev.vars` 并填写 `TOKEN=...`。

### 4. 部署

```bash
npm run deploy
```

记下输出的地址，例如 `https://ios-location-picker.你的账号.workers.dev`。

### 本地运行与验证

```bash
npm run dev
```

默认地址为 `http://localhost:8787`。如果不使用 `.dev.vars`，也可以临时传入口令：

```bash
npx wrangler dev --local --port 8787 --var TOKEN:test-token
```

本地页面地址：

```
http://localhost:8787/?token=test-token
```

## Loon 插件配置

Loon → 设置 → 插件 → iOS Location Spoofer → **远程配置 URL**：

```
https://ios-location-picker.你的账号.workers.dev/loc.json?token=你的TOKEN
```

保存后，在 iPhone 浏览器打开地图页：

```
https://ios-location-picker.你的账号.workers.dev/?token=你的TOKEN
```

点地图或搜索结果 → **保存定位** → 关开 iPhone 定位服务生效（Loon 约 60 秒内刷新缓存）。搜索结果会直接更新页面主坐标，但不会自动保存；可以直接点击 **收藏此点**。

网页中的收藏定位点保存在 Worker KV 中，不使用浏览器本地缓存。点击收藏名称只在地图上预览，点击“应用”才会将收藏点写入当前定位并开启伪造。

收藏操作说明：

- **收藏此点**：打开一个弹窗，同时编辑名称和地址，只提交一次；
- **应用**：将收藏点写入当前定位并开启伪造；
- **编辑**：只修改名称和地址，坐标、海拔和精度保持不变；
- **删除**：删除收藏，不影响已经生效的当前定位；
- 当前正在伪造的收藏点会显示“当前”标记；
- **当前位置**：伪造开启时重新读取当前生效定位，恢复真实定位后获取设备 GPS 位置；
- 所有定位到某个地点的入口默认使用缩放级别 18。

## Shadowrocket 配置

模块 `argument=` 末尾追加：

```
&configUrl=https://ios-location-picker.你的账号.workers.dev/loc.json?token=你的TOKEN
```

## 自定义域名（可选）

在 Cloudflare Dashboard → Workers → 你的 Worker → Settings → Domains 绑定子域即可，例如 `loc.example.com`。

## 与 Node 版差异

- 数据存在 **KV**（非本地文件），个人用量免费额度足够
- KV 有秒级最终一致性，保存后 Loon 最多等约 60 秒缓存刷新
- 无需自行管理 HTTPS 证书
