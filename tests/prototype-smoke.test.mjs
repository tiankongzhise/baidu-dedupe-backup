import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const screenFiles = [
  "prototype/screens/login.html",
  "prototype/screens/onboarding.html",
  "prototype/screens/dashboard.html",
  "prototype/screens/create-task.html",
  "prototype/screens/dedupe.html",
  "prototype/screens/tasks.html",
  "prototype/screens/task-detail.html",
  "prototype/screens/devices.html",
  "prototype/screens/cloud.html",
  "prototype/screens/records.html",
  "prototype/screens/notifications.html",
  "prototype/screens/settings.html",
];

const rootScreenFiles = [
  "login.html",
  "onboarding.html",
  "dashboard.html",
  "create-task.html",
  "dedupe.html",
  "tasks.html",
  "task-detail.html",
  "devices.html",
  "cloud.html",
  "records.html",
  "notifications.html",
  "settings.html",
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test("每个桌面应用屏幕都以独立 HTML 文件交付", () => {
  assert.equal(fs.existsSync(path.join(root, "index.html")), true, "根目录入口 index.html 不存在");
  assert.equal(fs.existsSync(path.join(root, "prototype/assets/prototype.css")), true, "共享样式应位于 prototype/assets");
  assert.equal(fs.existsSync(path.join(root, "prototype/assets/prototype.js")), true, "共享脚本应位于 prototype/assets");
  for (const file of screenFiles) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} 不存在`);
    const html = read(file);
    assert.match(html, /<!doctype html>/i, `${file} 缺少 doctype`);
    assert.match(html, /lang="zh-CN"/, `${file} 需要使用简体中文 locale`);
    assert.match(html, /href="\.\.\/assets\/prototype\.css"/, `${file} 需要引用 prototype/assets 样式`);
    assert.match(html, /src="\.\.\/assets\/prototype\.js"/, `${file} 需要引用 prototype/assets 脚本`);
  }
  for (const file of rootScreenFiles) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `${file} 不应继续堆在根目录`);
  }
});

test("入口页只作为桌面原型启动器，不承载全部产品屏幕", () => {
  const html = read("index.html");
  assert.match(html, /桌面程序原型/);
  assert.match(html, /prototype\/screens\/dashboard\.html/);
  assert.match(html, /入口页只负责启动和屏幕导航/);
  assert.doesNotMatch(html, /总体进度|恢复前检查|授权状态，网盘空间和重新授权入口/);
});

test("创建任务页默认加密并包含关闭加密二次确认", () => {
  const html = read("prototype/screens/create-task.html");
  assert.match(html, /加密备份/);
  assert.match(html, /checked/);
  assert.match(html, /关闭加密后，备份内容将以未加密形式保存/);
  assert.match(html, /确认关闭加密/);
  assert.match(html, /取消，保持加密/);
  assert.match(html, /本地临时空间/);
});

test("去重分析页解释多设备重复来源和预计节省空间", () => {
  const html = read("prototype/screens/dedupe.html");
  assert.match(html, /预计节省空间/);
  assert.match(html, /重复来源/);
  assert.match(html, /办公电脑/);
  assert.match(html, /历史任务/);
  assert.match(html, /异常待确认/);
  assert.match(html, /不根据文件名或路径直接跳过/);
  assert.match(html, /同名不同内容不会自动跳过/);
});

test("任务列表和详情覆盖开始、暂停、恢复、继续、删除路径", () => {
  const combined = `${read("prototype/screens/tasks.html")}\n${read("prototype/screens/task-detail.html")}`;
  for (const text of ["开始", "暂停", "恢复", "继续备份", "删除"]) {
    assert.match(combined, new RegExp(text), `缺少操作：${text}`);
  }
  assert.match(combined, /已完成的内容不会重复处理/);
  assert.match(combined, /已完成上传到百度网盘的备份文件不会自动删除/);
  assert.match(combined, /压缩包完整性测试/);
  assert.match(combined, /解包一致性校验/);
  assert.match(combined, /本地临时空间/);
});

test("设备与网盘高影响操作都有二次确认说明", () => {
  assert.match(read("prototype/screens/devices.html"), /解绑设备/);
  assert.match(read("prototype/screens/devices.html"), /历史备份记录仍可查看/);
  assert.match(read("prototype/screens/cloud.html"), /解除绑定/);
  assert.match(read("prototype/screens/cloud.html"), /后续备份需要重新授权/);
});

test("原型交互脚本暴露可验证状态机与确认动作", () => {
  const js = read("prototype/assets/prototype.js");
  const sandbox = { window: {}, document: null, console };
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);
  const api = sandbox.window.BaiduDedupePrototype;
  assert.equal(api.nextTaskState("pending_start", "start"), "preparing");
  assert.equal(api.nextTaskState("backing_up", "pause"), "paused");
  assert.equal(api.nextTaskState("paused", "resume"), "resuming");
  assert.equal(api.nextTaskState("interrupted", "continue_after_interruption"), "resuming");
  assert.equal(api.nextTaskState("completed", "delete"), "deleted");
  assert.equal(api.nextTaskState("deleted", "start"), "rejected");
  assert.equal(api.requiresConfirmation("disable_encryption"), true);
  assert.equal(api.requiresConfirmation("delete_task"), true);
  assert.equal(api.requiresConfirmation("unbind_device"), true);
  assert.equal(api.requiresConfirmation("unbind_cloud"), true);
});

test("仓库原型不包含真实授权凭据或明显敏感占位", () => {
  const files = screenFiles.concat(["index.html", "prototype/assets/prototype.js", "prototype/assets/prototype.css"]);
  const forbidden = /(access_token|refresh_token|client_secret|真实用户|真实路径|AKIA[0-9A-Z]{16})/i;
  for (const file of files) {
    assert.doesNotMatch(read(file), forbidden, `${file} 出现敏感数据模式`);
  }
});

test("产品屏幕不暴露设计过程或演示控件文案", () => {
  const forbidden = /(预览|演示|demo only|设计过程|平台输出|target count|screen count)/i;
  for (const file of screenFiles) {
    assert.doesNotMatch(read(file), forbidden, `${file} 出现非产品文案`);
  }
});
