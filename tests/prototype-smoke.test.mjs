import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const screenFiles = [
  "index.html",
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
  for (const file of screenFiles) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} 不存在`);
    const html = read(file);
    assert.match(html, /<!doctype html>/i, `${file} 缺少 doctype`);
    assert.match(html, /lang="zh-CN"/, `${file} 需要使用简体中文 locale`);
  }
});

test("入口页只作为桌面原型启动器，不承载全部产品屏幕", () => {
  const html = read("index.html");
  assert.match(html, /桌面程序原型/);
  assert.match(html, /dashboard\.html/);
  assert.match(html, /入口页只负责启动和评审导航/);
  assert.doesNotMatch(html, /总体进度|恢复前检查|授权状态，网盘空间和重新授权入口/);
});

test("创建任务页默认加密并包含关闭加密二次确认", () => {
  const html = read("create-task.html");
  assert.match(html, /加密备份/);
  assert.match(html, /checked/);
  assert.match(html, /关闭加密后，备份内容将以未加密形式保存/);
  assert.match(html, /确认关闭加密/);
  assert.match(html, /取消，保持加密/);
});

test("去重分析页解释多设备重复来源和预计节省空间", () => {
  const html = read("dedupe.html");
  assert.match(html, /预计节省空间/);
  assert.match(html, /重复来源/);
  assert.match(html, /办公电脑/);
  assert.match(html, /历史任务/);
  assert.match(html, /异常待确认/);
});

test("任务列表和详情覆盖开始、暂停、恢复、继续、删除路径", () => {
  const combined = `${read("tasks.html")}\n${read("task-detail.html")}`;
  for (const text of ["开始", "暂停", "恢复", "继续备份", "删除"]) {
    assert.match(combined, new RegExp(text), `缺少操作：${text}`);
  }
  assert.match(combined, /已完成的内容不会重复处理/);
  assert.match(combined, /已完成上传到百度网盘的备份文件不会自动删除/);
});

test("设备与网盘高影响操作都有二次确认说明", () => {
  assert.match(read("devices.html"), /解绑设备/);
  assert.match(read("devices.html"), /历史备份记录仍可查看/);
  assert.match(read("cloud.html"), /解除绑定/);
  assert.match(read("cloud.html"), /后续备份需要重新授权/);
});

test("原型交互脚本暴露可验证状态机与确认动作", () => {
  const js = read("assets/prototype.js");
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
  const files = screenFiles.concat(["assets/prototype.js", "assets/prototype.css"]);
  const forbidden = /(access_token|refresh_token|client_secret|真实用户|真实路径|AKIA[0-9A-Z]{16})/i;
  for (const file of files) {
    assert.doesNotMatch(read(file), forbidden, `${file} 出现敏感数据模式`);
  }
});
