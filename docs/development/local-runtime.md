# 本地运行与 Origin 约定

## 目的

本文件定义本地原型和后续本地 API 调试时的 origin、端口和 CORS 约定，避免浏览器 QA 中混用 `127.0.0.1`、`localhost`、不同端口或 `file://` 导致跨域、客户端拦截或不可复现问题。

## 配置文件

本地运行配置位于仓库根目录：

```json
{
  "origin": "localhost",
  "port": 0,
  "apiBasePath": "/api"
}
```

- `origin` 默认为 `localhost`。
- `port` 默认为 `0`，表示由系统自动选择可用端口。
- 端口只在程序启动时选择一次，并在本次程序运行期间保持固定。
- `apiBasePath` 默认为 `/api`，前端必须使用同源相对路径访问 API。

启动命令：

```bash
node tools/local-runtime.mjs
```

启动后使用命令输出的 `http://localhost:<port>/` 作为唯一浏览器 QA 入口。

## 前端约定

前端页面不得写死以下地址：

- `http://127.0.0.1:<port>`
- `http://localhost:<固定端口>`
- `file://...`
- 任何跨 origin API 地址

前端统一通过同源相对路径访问 API，例如：

```js
fetch("/api/runtime-config")
```

这样页面、静态资源和 API 都位于同一个 `http://localhost:<port>` origin 下，浏览器不会因为主机名或端口不一致触发 CORS。

## API CORS 约定

API 端仍需要 CORS 保护作为双保险：

- 只允许当前运行实际 origin，例如 `http://localhost:<port>`。
- 对允许的跨源请求返回 `Access-Control-Allow-Origin: http://localhost:<port>`。
- 返回 `Vary: Origin`，避免缓存把一个 origin 的响应复用给另一个 origin。
- 对 `http://127.0.0.1:<port>`、其他端口或其他站点返回拒绝响应，并且不返回 `Access-Control-Allow-Origin`。
- 预检请求只允许当前运行 origin、必要方法和必要请求头。

## 验证

本地运行层和前端同源 API helper 的自动化测试：

```bash
node tests/local-runtime.test.mjs
```

原型结构和交互烟测：

```bash
node tests/prototype-smoke.test.mjs
```
