(function () {
  const taskTransitions = {
    pending_start: {
      start: "preparing",
      start_after_confirm: "backing_up",
      delete: "deleted",
    },
    preparing: {
      scan_completed: "deduping",
      pause: "paused",
      delete: "confirm_required",
      fail: "failed",
    },
    deduping: {
      confirm_created: "pending_start",
      pause: "paused",
      delete: "confirm_required",
      fail: "failed",
    },
    backing_up: {
      pause: "paused",
      delete: "confirm_required",
      recoverable_error: "interrupted",
      unrecoverable_error: "failed",
      all_required_items_done: "completed",
      interrupt: "interrupted",
      complete: "completed",
    },
    paused: {
      resume: "resuming",
      delete: "deleted",
    },
    resuming: {
      recovery_check_passed: "backing_up",
      pause: "paused",
      delete: "confirm_required",
      recovery_check_failed: "failed",
    },
    interrupted: {
      continue_after_interruption: "resuming",
      delete: "deleted",
    },
    failed: {
      delete: "deleted",
      retry: "resuming",
      continue_after_interruption: "resuming",
    },
    completed: {
      delete_record: "deleted",
      delete: "deleted",
    },
    deleted: {
      start: "rejected",
      resume: "rejected",
      delete: "rejected",
    },
  };

  const highImpactActions = new Set([
    "disable_encryption",
    "delete_task",
    "unbind_device",
    "unbind_cloud",
  ]);

  function nextTaskState(currentState, action) {
    const stateMap = taskTransitions[currentState] || {};
    return stateMap[action] || "rejected";
  }

  function requiresConfirmation(action) {
    return highImpactActions.has(action);
  }

  function query(selector, root = document) {
    return root ? root.querySelector(selector) : null;
  }

  function queryAll(selector, root = document) {
    return root ? Array.from(root.querySelectorAll(selector)) : [];
  }

  function showToast(message) {
    const toast = query("[data-toast]");
    if (!toast) return;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    toast.textContent = message;
    toast.dataset.open = "true";
    window.setTimeout(() => {
      toast.dataset.open = "false";
    }, 2400);
  }

  function openConfirm(options) {
    const backdrop = query("[data-confirm-modal]");
    if (!backdrop) return;
    backdrop.setAttribute("aria-hidden", "false");
    query("[data-confirm-title]", backdrop).textContent = options.title;
    query("[data-confirm-message]", backdrop).textContent = options.message;
    const confirmButton = query("[data-confirm-accept]", backdrop);
    const cancelButton = query("[data-confirm-cancel]", backdrop);
    confirmButton.textContent = options.acceptLabel || "确认";
    cancelButton.textContent = options.cancelLabel || "取消";
    backdrop.dataset.open = "true";
    const cleanup = () => {
      confirmButton.onclick = null;
      cancelButton.onclick = null;
      backdrop.dataset.open = "false";
      backdrop.setAttribute("aria-hidden", "true");
    };
    confirmButton.onclick = () => {
      cleanup();
      options.onAccept?.();
    };
    cancelButton.onclick = () => {
      cleanup();
      options.onCancel?.();
    };
  }

  function bindEncryptionSwitches() {
    queryAll("[data-encryption-switch]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) {
          showToast("已保持加密备份，任务完成后会显示“已加密”。");
          return;
        }
        openConfirm({
          title: "确认关闭加密",
          message: "关闭加密后，备份内容将以未加密形式保存。请确认该任务不包含敏感资料。",
          acceptLabel: "确认关闭加密",
          cancelLabel: "取消，保持加密",
          onAccept: () => {
            input.checked = false;
            document.body.dataset.encryption = "off";
            showToast("已关闭本任务加密，完成后会标记为“未加密”。");
          },
          onCancel: () => {
            input.checked = true;
            document.body.dataset.encryption = "on";
          },
        });
      });
    });
  }

  function bindDangerActions() {
    queryAll("[data-confirm-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.confirmAction;
        const copy = {
          delete_task: {
            title: "删除任务记录",
            message: "删除后，该任务将不再显示在任务列表中。已完成上传到百度网盘的备份文件不会自动删除。",
            acceptLabel: "确认删除记录",
          },
          unbind_device: {
            title: "解绑设备",
            message: "解绑后该设备再次使用需要重新绑定，历史备份记录仍可查看，百度网盘中的备份文件不会被删除。",
            acceptLabel: "确认解绑设备",
          },
          unbind_cloud: {
            title: "解除百度网盘绑定",
            message: "解除绑定后，未完成任务将无法继续，后续备份需要重新授权，已完成备份文件不会自动删除。",
            acceptLabel: "确认解除绑定",
          },
          disable_default_encryption: {
            title: "关闭默认加密",
            message: "关闭默认加密后，新建任务可能以未加密形式保存。建议只在确认资料不敏感时关闭。",
            acceptLabel: "确认关闭默认加密",
          },
        }[action];

        if (!copy) return;
        openConfirm({
          ...copy,
          cancelLabel: "取消",
          onAccept: () => {
            button.dataset.confirmed = "true";
            showToast(`${copy.title}已确认。`);
          },
        });
      });
    });
  }

  function bindTaskActions() {
    queryAll("[data-task-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const row = button.closest("[data-task-state]");
        if (!row) return;
        const current = row.dataset.taskState;
        const action = button.dataset.taskAction;
        const next = nextTaskState(current, action);
        if (next === "confirm_required") {
          openConfirm({
            title: "删除正在备份的任务",
            message: "任务正在备份中。删除前建议先暂停，若继续删除，已完成上传到百度网盘的备份文件不会自动删除。",
            acceptLabel: "确认删除记录",
            cancelLabel: "先不删除",
            onAccept: () => {
              row.dataset.taskState = "deleted";
              row.hidden = true;
              showToast("任务记录已删除，云盘文件未删除。");
            },
          });
          return;
        }
        if (next === "rejected") {
          showToast("当前状态不支持这个操作。");
          return;
        }
        row.dataset.taskState = next;
        const stateLabel = query("[data-state-label]", row);
        if (stateLabel) {
          const labels = {
            preparing: "准备中",
            deduping: "对比去重中",
            backing_up: "备份中",
            paused: "已暂停",
            resuming: "恢复中",
            interrupted: "异常中断",
            failed: "备份失败",
            completed: "已完成",
            deleted: "已删除",
          };
          stateLabel.textContent = labels[next] || next;
        }
        showToast(`任务状态已更新为：${next}`);
      });
    });
  }

  function bindTabs() {
    queryAll("[data-tab-group]").forEach((group) => {
      group.setAttribute("role", "tablist");
      const buttons = queryAll("[data-tab-target]", group);
      buttons.forEach((button) => {
        const targetId = button.dataset.tabTarget;
        const panel = query(`#${targetId}`);
        button.setAttribute("type", "button");
        button.setAttribute("role", "tab");
        button.setAttribute("aria-controls", targetId);
        if (panel) {
          panel.setAttribute("role", "tabpanel");
          panel.setAttribute("aria-labelledby", button.id || `${targetId}-tab`);
          if (!button.id) button.id = `${targetId}-tab`;
        }
        button.addEventListener("click", () => {
          buttons.forEach((item) => item.setAttribute("aria-selected", "false"));
          button.setAttribute("aria-selected", "true");
          queryAll("[data-tab-panel]").forEach((panel) => {
            panel.hidden = panel.id !== targetId;
          });
        });
      });
    });
  }

  function bindExpandableRows() {
    queryAll("[data-expand-row]").forEach((button) => {
      const row = button.closest(".detail-row");
      const detail = query(".detail-hidden", row);
      if (detail) {
        const detailId = detail.id || `detail-${Math.random().toString(36).slice(2, 9)}`;
        detail.id = detailId;
        button.setAttribute("aria-controls", detailId);
      }
      button.setAttribute("type", "button");
      button.setAttribute("aria-expanded", row?.dataset.open === "true" ? "true" : "false");
      button.addEventListener("click", () => {
        const row = button.closest(".detail-row");
        if (!row) return;
        const isOpen = row.dataset.open === "true";
        row.dataset.open = isOpen ? "false" : "true";
        button.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  function enhanceResponsiveTables() {
    queryAll("table").forEach((table) => {
      const headers = queryAll("thead th", table).map((header) => header.textContent.trim());
      if (!headers.length) return;
      queryAll("tbody tr", table).forEach((row) => {
        queryAll("td", row).forEach((cell, index) => {
          if (!cell.dataset.label && headers[index]) {
            cell.dataset.label = headers[index];
          }
        });
      });
    });
  }

  function enhanceFeedbackSurfaces() {
    queryAll("[data-confirm-modal]").forEach((backdrop) => {
      backdrop.setAttribute("aria-hidden", backdrop.dataset.open === "true" ? "false" : "true");
    });
    queryAll("[data-toast]").forEach((toast) => {
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.setAttribute("aria-atomic", "true");
    });
  }

  function bindSearch() {
    queryAll("[data-filter-input]").forEach((input) => {
      input.addEventListener("input", () => {
        const target = input.dataset.filterInput;
        const keyword = input.value.trim().toLowerCase();
        queryAll(`[data-filter-scope="${target}"] [data-filter-row]`).forEach((row) => {
          row.hidden = keyword.length > 0 && !row.textContent.toLowerCase().includes(keyword);
        });
      });
    });
  }

  function bindLoginDemo() {
    const form = query("[data-login-form]");
    if (!form) return;
    const authState = query("[data-auth-state]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const account = query("[name='account']", form)?.value.trim();
      const password = query("[name='password']", form)?.value.trim();
      const error = query("[data-login-error]");
      if (!account || !password) {
        error.textContent = "请输入账号和密码。";
        error.hidden = false;
        return;
      }
      error.hidden = true;
      showToast("登录成功，正在检查授权和设备绑定。");
      if (authState) authState.hidden = false;
    });
  }

  function bindAuthActions() {
    const authState = query("[data-auth-state]");
    queryAll("[data-register-success]").forEach((button) => {
      button.addEventListener("click", () => {
        if (authState) authState.hidden = false;
        showToast("注册成功，已自动登录。");
      });
    });
    queryAll("[data-logout-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (authState) authState.hidden = true;
        showToast("已退出登录，可以返回首页或重新登录。");
      });
    });
  }

  function init() {
    if (!document) return;
    enhanceResponsiveTables();
    enhanceFeedbackSurfaces();
    bindEncryptionSwitches();
    bindDangerActions();
    bindTaskActions();
    bindTabs();
    bindExpandableRows();
    bindSearch();
    bindLoginDemo();
    bindAuthActions();
  }

  window.BaiduDedupePrototype = {
    nextTaskState,
    requiresConfirmation,
    openConfirm,
    showToast,
    init,
  };

  if (document) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
