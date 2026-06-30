# 原型设计审计意见与优化建议

## 1. 审计结论

本次审计基于项目全部产品与开发文档、当前桌面原型源码、原型交互脚本和现有烟测用例完成。

总体结论：当前原型整体符合 `多设备去重备份项目PRD.md`、`docs/spec.md` 和 `docs/design.md` 的核心要求，已经覆盖 V1.0 基础可用版和 V1.1 多设备增强版的主要页面与核心流程，可作为阶段性产品评审稿继续推进。

视觉结论：原型整体清爽、克制、专业，适合桌面工具类产品。当前设计强调状态、表格、卡片和确认弹窗，能支撑“默认安全、异常可恢复、多设备统一”的产品定位。但品牌记忆点、关键主行动层级、完整状态覆盖和真实桌面质感仍有优化空间。

建议优先级：先补齐产品验收和流程一致性问题，再做视觉精修。尤其要优先处理任务状态机、空/加载/错误态、首次引导阻断感和关键高风险操作的可见性。

## 2. 审计范围

### 2.1 已阅读文档

- `README.md`
- `agents.md`
- `多设备去重备份项目PRD.md`
- `docs/spec.md`
- `docs/design.md`
- `docs/development/README.md`
- `docs/development/architecture.md`
- `docs/development/data-model.md`
- `docs/development/dedupe-strategy.md`
- `docs/development/api-contracts.md`
- `docs/development/state-and-errors.md`
- `docs/development/security-privacy.md`
- `docs/development/test-strategy.md`
- `docs/development/roadmap.md`

### 2.2 已审计原型文件

- `index.html`
- `prototype/assets/prototype.css`
- `prototype/assets/prototype.js`
- `prototype/screens/login.html`
- `prototype/screens/onboarding.html`
- `prototype/screens/dashboard.html`
- `prototype/screens/create-task.html`
- `prototype/screens/dedupe.html`
- `prototype/screens/tasks.html`
- `prototype/screens/task-detail.html`
- `prototype/screens/devices.html`
- `prototype/screens/cloud.html`
- `prototype/screens/records.html`
- `prototype/screens/notifications.html`
- `prototype/screens/settings.html`
- `tests/prototype-smoke.test.mjs`

### 2.3 验证说明

已运行原型烟测：

```bash
node tests/prototype-smoke.test.mjs
```

结果：全部通过。

说明：尝试用浏览器打开本地 `file://` 和 `127.0.0.1` 原型页面时，被当前浏览器安全策略或客户端策略拦截，因此本次未完成截图级视觉 QA。当前审计结论来自文档、源码、样式、交互脚本和烟测结果。

## 3. 符合要求的部分

### 3.1 页面覆盖较完整

当前入口页已经将原型拆成 12 个独立屏幕，覆盖登录注册、授权绑定、工作台、创建任务、去重分析、任务列表、任务详情、设备管理、百度网盘管理、备份记录、通知中心和设置。

对应文件：

- `index.html`
- `prototype/screens/*.html`

评价：符合 PRD 中首期页面范围和 V1.1 多设备增强版范围。

### 3.2 默认安全原则落实较好

创建任务页默认开启加密，关闭加密时会触发风险确认弹窗，确认按钮文案也较明确。

对应文件：

- `prototype/screens/create-task.html`
- `prototype/assets/prototype.js`

评价：符合“默认安全”和“关闭加密必须二次确认”的核心原则。

### 3.3 去重解释面向普通用户

去重分析页展示了本次选择、需备份、重复跳过、预计节省空间、重复来源、异常待确认，并说明不根据文件名或路径直接跳过。

对应文件：

- `prototype/screens/dedupe.html`

评价：符合“用户可理解”和“多设备去重结果要可解释”的要求。

### 3.4 异常恢复入口明确

工作台、任务列表、任务详情和通知中心都体现了异常中断后的继续备份入口，并强调已完成内容不会重复处理。

对应文件：

- `prototype/screens/dashboard.html`
- `prototype/screens/tasks.html`
- `prototype/screens/task-detail.html`
- `prototype/screens/notifications.html`

评价：符合“异常可恢复”的产品原则。

### 3.5 高影响操作确认基本覆盖

原型中已包含删除任务、解绑设备、解绑百度网盘、关闭默认加密等高影响操作确认。

对应文件：

- `prototype/screens/tasks.html`
- `prototype/screens/task-detail.html`
- `prototype/screens/devices.html`
- `prototype/screens/cloud.html`
- `prototype/screens/settings.html`
- `prototype/assets/prototype.js`

评价：符合“高影响操作需确认”和“删除要克制”的产品原则。

### 3.6 视觉系统统一

原型使用统一的颜色变量、卡片、表格、状态标签、进度条、弹窗、toast、响应式断点，页面之间一致性较好。

对应文件：

- `prototype/assets/prototype.css`

评价：整体有产品化雏形，不像一次性演示稿。

## 4. 主要问题与修改建议

### P0. 任务状态机原型与开发文档不完全一致

问题描述：开发文档中的任务状态机包含 `preparing → deduping → pending_start → backing_up` 等流转，但原型脚本中 `preparing` 通过 `ready` 直接进入 `backing_up`，没有体现 `deduping` 和 `confirm_created` 等关键节点。

影响：

- 后续研发可能按原型理解状态，导致与 `docs/development/state-and-errors.md` 不一致。
- 去重分析在流程中的位置容易被弱化。
- 验收测试可能漏掉“对比去重中”状态。

建议：

1. 调整 `prototype/assets/prototype.js` 中的 `taskTransitions`，与 `docs/development/state-and-errors.md` 对齐。
2. 在任务列表中增加 `准备中`、`对比去重中`、`恢复中`、`备份失败` 状态样例。
3. 在烟测中补充 `deduping`、`failed`、`resuming` 状态断言。

涉及文件：

- `prototype/assets/prototype.js`
- `prototype/screens/tasks.html`
- `tests/prototype-smoke.test.mjs`

### P0. 缺少系统化空状态、加载状态和错误状态

问题描述：PRD 和 spec 明确要求各页面具备空状态、加载状态和错误状态，但当前原型主要展示“正常样例数据”和部分异常提醒，尚未系统化覆盖。

影响：

- 产品验收会缺少关键场景。
- 研发无法清晰理解空数据、加载中、失败重试的展示标准。
- 对新用户、首次使用、无备份记录、授权失败、设备绑定失败等场景支撑不足。

建议：

1. 为任务列表补充“还没有备份任务”的空状态。
2. 为备份记录页补充“暂无备份记录”的空状态。
3. 为设备管理页补充“未绑定设备”的空状态。
4. 为授权页补充授权失败和重新授权错误态。
5. 为去重分析页补充“正在分析重复项目”的加载态。
6. 为任务详情页补充恢复失败状态，包含发生了什么、可能原因、下一步建议和重试入口。

涉及文件：

- `prototype/screens/dashboard.html`
- `prototype/screens/tasks.html`
- `prototype/screens/records.html`
- `prototype/screens/devices.html`
- `prototype/screens/cloud.html`
- `prototype/screens/dedupe.html`
- `prototype/screens/task-detail.html`

### P0. 首次引导流程的阻断感不够强

问题描述：首次引导页展示未授权和待绑定状态，但顶部仍提供“进入工作台”按钮。虽然文案说明未完成授权或绑定时不能创建任务，但视觉上仍容易让用户跳过关键步骤。

影响：

- 与“未授权不能创建或开始备份”“当前设备未绑定不能创建或执行任务”的规则表达不够一致。
- 首次使用流程可能显得不够线性。

建议：

1. 未授权时，将“进入工作台”弱化为“稍后查看账号信息”，并明确不可创建备份任务。
2. 授权完成前禁用设备绑定操作，或用步骤状态表达必须先授权。
3. 设备绑定完成前禁用“创建备份任务”入口。
4. 增加“当前还差 2 步可开始备份”的进度提示。

涉及文件：

- `prototype/screens/onboarding.html`
- `prototype/screens/dashboard.html`

### P1. 登录注册错误态不够完整

问题描述：登录页仅有基础的“请输入账号和密码”和默认隐藏的账号密码错误提示。注册页没有展示协议未勾选、密码不一致、验证码错误或账号已存在等错误状态。

影响：

- 与 PRD 中注册登录异常提示不完全匹配。
- 后续研发对表单校验细节缺少可视参考。

建议：

1. 登录表单补充账号不存在、密码错误、网络异常等样例。
2. 注册表单补充协议未勾选、验证码错误、密码不一致、账号已存在样例。
3. 在页面中明确连续登录错误后的安全验证或短暂限制提示。
4. 将“忘记密码”从普通链接扩展成明确入口说明。

涉及文件：

- `prototype/screens/login.html`

### P1. 任务列表操作权限需要更贴合状态矩阵

问题描述：当前任务列表覆盖了开始、暂停、恢复、继续备份、删除、详情，但尚未完整体现 `docs/development/state-and-errors.md` 中各状态的可用操作矩阵。

影响：

- 研发可能误以为所有删除都同一逻辑。
- `preparing`、`deduping`、`resuming` 状态下的暂停和删除二次确认不够明确。
- `failed` 状态下“恢复/继续按原因决定”的产品规则未体现。

建议：

1. 增加状态矩阵展示区，列出每种状态下可用操作。
2. 为 `preparing`、`deduping`、`resuming` 增加“暂停”和“二次确认删除”的样例。
3. 为 `failed` 增加“查看原因”“重新检查”“删除记录”等操作样例。
4. 删除操作按钮文案建议统一为“删除记录”，避免误以为删除云盘文件。

涉及文件：

- `prototype/screens/tasks.html`
- `prototype/screens/task-detail.html`

### P1. 任务详情还可以更明确“已完成什么、将继续什么”

问题描述：任务详情页已经展示进度、分项阶段和恢复检查，但“已完成内容”和“继续后将处理的内容”还可以更直观。

影响：

- 异常恢复场景下，用户最关心任务是否丢失、是否重复上传。
- 当前表达正确，但可解释性还有提升空间。

建议：

1. 增加“恢复摘要”模块：已完成 56 项、已跳过 34 项、剩余需继续 35 项、异常待处理 3 项。
2. 将“继续后从恢复点上传剩余项目”扩展为更具体的列表或说明。
3. 增加“恢复前检查未通过”的样例，例如授权失效、网盘空间不足、文件不可访问。

涉及文件：

- `prototype/screens/task-detail.html`

### P1. 备份记录页缺少操作和状态丰富度

问题描述：备份记录页目前主要是查询表格，没有明显操作按钮，也没有空状态、失败记录、删除前记录等更多样例。

影响：

- PRD 要求支持查看已完成、失败、删除前记录，当前表达偏弱。
- 历史记录和任务删除的关系可以更清楚。

建议：

1. 增加“查看详情”操作。
2. 增加失败记录样例。
3. 增加“任务记录已删除，但历史备份文件仍保留”的记录样例。
4. 增加空状态。

涉及文件：

- `prototype/screens/records.html`

### P1. 百度网盘授权状态样例不足

问题描述：百度网盘管理页展示了已授权和空间接近上限，但未展示未授权、授权已失效、授权异常、已解除绑定等完整状态。

影响：

- 授权失效是核心异常恢复前置条件，缺少可视化样例。
- 解除绑定后的任务影响可以更清楚。

建议：

1. 增加授权状态切换样例或状态卡：未授权、已授权、授权已失效、授权异常、已解除绑定。
2. 增加授权失效时任务不可继续的提示样例。
3. 增加解除绑定后未完成任务数量的影响提示。

涉及文件：

- `prototype/screens/cloud.html`

### P1. 设备管理缺少设备重命名编辑态和绑定失败态

问题描述：设备管理页展示了重命名按钮，但没有实际编辑态；首次引导页也只用文字提到绑定失败。

影响：

- 设备重命名交互不够可验收。
- 绑定失败和重试入口不够明确。

建议：

1. 在设备列表中增加一行处于“重命名中”的样例。
2. 增加设备名称重复或不易识别的提示。
3. 增加设备绑定失败的错误提示和重试入口。

涉及文件：

- `prototype/screens/devices.html`
- `prototype/screens/onboarding.html`

### P2. 视觉品牌记忆点偏弱

问题描述：当前品牌标识为 `BD` 字母块，整体视觉干净但识别性有限。作为“多设备 + 百度网盘 + 加密 + 去重”的工具，品牌符号还可以更贴合产品心智。

影响：

- 产品可记忆性不足。
- 页面之间虽然统一，但缺少一个能被用户记住的视觉锚点。

建议：

1. 设计轻量图标系统：设备、云盘、锁、去重、恢复点。
2. 品牌标识可从 `BD` 升级为“云盘 + 设备节点 + 锁”的抽象图形。
3. 首页和启动页增加更明确的产品一句话价值表达。

涉及文件：

- `index.html`
- `prototype/assets/prototype.css`
- 全部 `prototype/screens/*.html`

### P2. 关键主行动层级还可以更强

问题描述：很多页面都有多个同等级按钮，工具属性明确，但“下一步最该做什么”的视觉引导可以更强。

影响：

- 首次使用和异常恢复时，用户可能需要多看几秒才知道下一步。
- 工作台的主行动可以更聚焦。

建议：

1. 工作台优先级按状态排序：有异常任务时突出“继续备份”；无异常时突出“创建备份任务”。
2. 创建任务页突出“下一步：去重分析”，弱化“查看去重分析”。
3. 去重分析页底部增加固定确认区，避免长页面滚动后找不到确认按钮。

涉及文件：

- `prototype/screens/dashboard.html`
- `prototype/screens/create-task.html`
- `prototype/screens/dedupe.html`

### P2. 移动/窄屏只是基础适配，桌面应用质感还可提升

问题描述：CSS 已包含响应式断点，表格也有横向滚动容器。但作为桌面端优先原型，窗口缩小时的导航、表格密度、操作按钮堆叠仍建议进一步检查。

影响：

- 桌面应用用户可能缩小窗口使用。
- 任务表格和设备表格字段较多，窄屏下可读性可能下降。

建议：

1. 对任务列表、设备列表、记录页增加卡片式窄屏展示方案。
2. 对顶部操作区增加更稳定的换行与间距策略。
3. 确认最小窗口宽度下不会出现按钮挤压或重要信息被隐藏。

涉及文件：

- `prototype/assets/prototype.css`
- 表格较多的页面

## 5. 建议调整顺序

### 第一批：必须先修

1. 对齐任务状态机。
2. 补齐任务列表的完整状态样例。
3. 补齐空状态、加载状态、错误状态。
4. 强化首次引导的授权和设备绑定阻断感。

### 第二批：产品验收增强

1. 完善登录注册错误态。
2. 完善任务详情恢复摘要。
3. 完善备份记录状态和操作。
4. 完善百度网盘授权状态样例。
5. 完善设备重命名和绑定失败态。

### 第三批：视觉体验优化

1. 强化品牌符号和图标体系。
2. 优化主行动层级。
3. 优化窄屏表格和桌面窗口缩放体验。
4. 做一次浏览器截图级视觉 QA。

## 6. 可交付检查清单

调整完成后，建议按以下清单验收：

- 登录页包含登录失败、账号不存在、网络异常提示。
- 注册页包含协议未勾选、验证码错误、密码不一致、账号已存在提示。
- 首次引导页清楚表达未授权和未绑定时不能创建备份任务。
- 工作台能根据异常任务、未授权、未绑定、无任务等状态给出不同主行动。
- 创建任务页默认加密，关闭加密必须二次确认。
- 去重分析页包含分析中、分析完成、异常待确认、重复来源展开。
- 任务列表覆盖所有状态：待开始、准备中、对比去重中、备份中、已暂停、恢复中、异常中断、备份失败、已完成、已删除。
- 任务详情页明确展示已完成内容、将继续内容、恢复前检查和恢复失败处理。
- 删除任务记录前明确说明不会自动删除百度网盘文件。
- 设备解绑前明确说明历史记录保留、云盘文件不删除。
- 百度网盘解绑前明确说明未完成任务无法继续、后续需重新授权。
- 备份记录页包含已完成、失败、删除前记录和空状态。
- 通知中心覆盖任务异常、授权失效、空间不足、文件不可访问、备份完成。
- 窄屏窗口下导航、表格和按钮不出现明显遮挡或不可读。
- `node tests/prototype-smoke.test.mjs` 通过。

## 7. 备注

当前原型已经具备较好的结构基础，不建议推倒重做。后续调整应以“补状态、补流程、补验收样例”为主，视觉层面只做增强，不要破坏现有清爽克制的工具产品气质。
