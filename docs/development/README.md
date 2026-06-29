# 开发文档索引

本目录用于承接 PRD、spec 和 design 之后的研发准备工作。这里的文档帮助开发者理解“怎么拆、怎么建、怎么测、怎么防风险”。

## 文档列表

- `architecture.md`：开发架构说明，定义客户端、服务端、云盘适配、本地状态和模块边界。
- `data-model.md`：数据模型说明，定义核心实体、字段、关系、枚举和数据保留规则。
- `dedupe-strategy.md`：多设备去重技术方案，定义文件级内容指纹、去重索引、加密关系、异常处理和测试验收。
- `api-contracts.md`：API 合同草案，定义客户端与服务端的主要接口、请求响应和错误格式。
- `state-and-errors.md`：状态机与错误码，定义任务状态流转、操作权限、错误码和用户提示。
- `security-privacy.md`：安全与隐私开发要求，定义账号、授权、文件访问、加密、日志和高影响操作要求。
- `test-strategy.md`：测试策略，定义测试层级、关键场景、状态机矩阵和验收清单。
- `roadmap.md`：开发路线图，定义 V1.0、V1.1、V1.2 范围、里程碑和风险。

## 推荐阅读顺序

1. `../spec.md`
2. `../design.md`
3. `architecture.md`
4. `data-model.md`
5. `dedupe-strategy.md`
6. `state-and-errors.md`
7. `api-contracts.md`
8. `security-privacy.md`
9. `test-strategy.md`
10. `roadmap.md`
