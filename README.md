# Baidu Dedupe Backup

多设备去重备份项目 PRD。

本项目用于规划一个面向个人和小团队用户的多设备备份产品：用户选择文件或文件夹后，可默认加密打包并备份到百度网盘，同时对比多设备历史备份项目，跳过重复内容，减少云盘空间浪费。

## 当前内容

- 产品需求文档 PRD
- 产品功能规格文档：`docs/spec.md`
- 产品设计文档：`docs/design.md`
- 开发文档索引：`docs/development/README.md`
- 开发架构说明：`docs/development/architecture.md`
- 数据模型说明：`docs/development/data-model.md`
- 多设备去重技术方案：`docs/development/dedupe-strategy.md`
- API 合同草案：`docs/development/api-contracts.md`
- 状态机与错误码：`docs/development/state-and-errors.md`
- 安全与隐私开发要求：`docs/development/security-privacy.md`
- 测试策略：`docs/development/test-strategy.md`
- 开发路线图：`docs/development/roadmap.md`
- 功能范围说明
- 前台页面功能描述
- 任务管理、设备管理、百度网盘授权、异常恢复等产品规则

## 推荐阅读顺序

1. `多设备去重备份项目PRD.md`
2. `docs/spec.md`
3. `docs/design.md`
4. `docs/development/README.md`

## 本地原型运行

本地浏览器 QA 请使用项目运行层，避免手动混用 `127.0.0.1`、`localhost` 或 `file://`：

```bash
node tools/local-runtime.mjs
```

默认配置位于 `local-runtime.config.json`。`origin` 默认为 `localhost`，`port` 默认为 `0`，表示由系统自动选择可用端口；端口在本次 Node 进程运行期间固定。前端统一通过同源相对路径 `/api/...` 访问 API，运行层 API 同时只允许当前实际 origin 的 CORS 请求。
