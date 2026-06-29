# API 合同草案

## 1. 文档目的

本文档定义 Baidu Dedupe Backup 首期客户端与服务端之间的 API 合同草案，用于前后端并行开发、Mock 数据构造和接口验收。具体协议可采用 REST、RPC 或 GraphQL，但请求响应语义应保持一致。

以下示例以 REST 风格描述。

## 2. 通用约定

### 2.1 认证

需要登录的接口必须携带访问令牌。未登录或登录态失效时返回统一错误码 `AUTH_REQUIRED` 或 `SESSION_EXPIRED`。

### 2.2 响应格式

成功响应：

```json
{
  "success": true,
  "data": {}
}
```

失败响应：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "用户可理解的错误说明",
    "action": "用户下一步建议"
  }
}
```

### 2.3 分页格式

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 100
}
```

## 3. 账号接口

### 3.1 注册

`POST /auth/register`

请求：

```json
{
  "account": "user@example.com",
  "accountType": "email",
  "verificationCode": "123456",
  "password": "Password123!",
  "acceptedTerms": true
}
```

响应：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_001",
      "account": "user@example.com",
      "accountType": "email",
      "status": "active"
    },
    "session": {
      "accessToken": "access_token",
      "expiresIn": 7200
    }
  }
}
```

### 3.2 登录

`POST /auth/login`

请求：

```json
{
  "account": "user@example.com",
  "password": "Password123!",
  "rememberMe": true
}
```

响应：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_001",
      "account": "user@example.com",
      "accountType": "email",
      "status": "active"
    },
    "session": {
      "accessToken": "access_token",
      "expiresIn": 7200
    }
  }
}
```

### 3.3 获取当前会话摘要

`GET /me/bootstrap`

响应：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_001",
      "account": "user@example.com"
    },
    "cloudAuthorization": {
      "status": "authorized",
      "providerAccountName": "百度网盘昵称",
      "lastCheckedAt": "2026-06-29T10:00:00Z"
    },
    "currentDevice": {
      "id": "device_001",
      "name": "Office PC",
      "status": "current_online"
    },
    "taskSummary": {
      "total": 12,
      "running": 1,
      "interrupted": 1,
      "completed": 9
    }
  }
}
```

### 3.4 退出登录

`POST /auth/logout`

响应：

```json
{
  "success": true,
  "data": {
    "loggedOut": true
  }
}
```

## 4. 百度网盘授权接口

### 4.1 获取授权状态

`GET /cloud/baidu/authorization`

响应：

```json
{
  "success": true,
  "data": {
    "provider": "baidu_netdisk",
    "status": "authorized",
    "providerAccountName": "百度网盘昵称",
    "authorizedAt": "2026-06-29T10:00:00Z",
    "expiresAt": "2026-07-29T10:00:00Z",
    "space": {
      "totalBytes": 2199023255552,
      "usedBytes": 1099511627776
    }
  }
}
```

### 4.2 创建授权地址

`POST /cloud/baidu/authorization-url`

请求：

```json
{
  "redirectTarget": "desktop_callback"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://example.baidu.com/oauth/authorize?...",
    "state": "oauth_state"
  }
}
```

### 4.3 完成授权回调

`POST /cloud/baidu/authorization/callback`

请求：

```json
{
  "code": "oauth_code",
  "state": "oauth_state"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "status": "authorized",
    "providerAccountName": "百度网盘昵称",
    "authorizedAt": "2026-06-29T10:00:00Z"
  }
}
```

### 4.4 解除绑定

`POST /cloud/baidu/unbind`

请求：

```json
{
  "confirmed": true
}
```

响应：

```json
{
  "success": true,
  "data": {
    "status": "unbound",
    "affectedUnfinishedTaskCount": 2
  }
}
```

## 5. 设备接口

### 5.1 绑定当前设备

`POST /devices/bind-current`

请求：

```json
{
  "localFingerprint": "device_fingerprint_hash",
  "name": "Office PC",
  "type": "desktop",
  "platform": "windows"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "device_001",
    "name": "Office PC",
    "type": "desktop",
    "platform": "windows",
    "status": "current_online",
    "firstBoundAt": "2026-06-29T10:00:00Z"
  }
}
```

### 5.2 获取设备列表

`GET /devices`

响应：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "device_001",
        "name": "Office PC",
        "type": "desktop",
        "isCurrent": true,
        "status": "current_online",
        "lastOnlineAt": "2026-06-29T10:00:00Z",
        "lastBackupAt": "2026-06-28T09:00:00Z",
        "taskCount": 8,
        "completedTaskCount": 6,
        "interruptedTaskCount": 1
      }
    ]
  }
}
```

### 5.3 重命名设备

`PATCH /devices/{deviceId}`

请求：

```json
{
  "name": "Home Laptop"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "device_001",
    "name": "Home Laptop"
  }
}
```

### 5.4 解绑设备

`POST /devices/{deviceId}/unbind`

请求：

```json
{
  "confirmed": true
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "device_001",
    "status": "unbound",
    "historyRecordRetained": true
  }
}
```

## 6. 备份任务接口

### 6.1 创建任务草稿

`POST /backup-tasks/draft`

文件项中的 `fingerprint` 应为源文件内容指纹，生成规则见 `dedupe-strategy.md`。服务端不得仅根据文件名、路径或修改时间判定重复。

请求：

```json
{
  "deviceId": "device_001",
  "name": "工作资料备份",
  "note": "6 月项目文件",
  "encryptionEnabled": true,
  "dedupeEnabled": true,
  "items": [
    {
      "sourcePath": "D:/Work/project-a",
      "displayName": "project-a",
      "itemType": "folder",
      "sizeBytes": 1024000,
      "modifiedAt": "2026-06-29T09:00:00Z",
      "fingerprint": "fingerprint_hash"
    }
  ]
}
```

响应：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "status": "deduping"
  }
}
```

### 6.2 获取去重结果

`GET /backup-tasks/{taskId}/dedupe-result`

去重结果应体现文件级内容指纹匹配结果，并返回可解释的来源设备和历史任务。异常待确认项目不得静默归入重复跳过。

响应：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "totalItemCount": 10,
    "needBackupCount": 7,
    "alreadyBackedUpCount": 3,
    "duplicateSkippedCount": 3,
    "pendingReviewCount": 0,
    "estimatedSavedBytes": 2048000,
    "items": [
      {
        "id": "item_001",
        "displayName": "report.docx",
        "status": "duplicate_skipped",
        "duplicateSourceDevice": {
          "id": "device_002",
          "name": "Home Laptop"
        },
        "duplicateSourceTask": {
          "id": "task_000",
          "name": "历史备份"
        }
      }
    ]
  }
}
```

### 6.3 确认创建任务

`POST /backup-tasks/{taskId}/confirm`

请求：

```json
{
  "confirmed": true,
  "pendingReviewItemAction": "skip"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "status": "pending_start"
  }
}
```

### 6.4 获取任务列表

`GET /backup-tasks?status=backing_up&deviceId=device_001&page=1&pageSize=20`

响应：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "task_001",
        "name": "工作资料备份",
        "deviceName": "Office PC",
        "status": "backing_up",
        "encryptionEnabled": true,
        "progress": {
          "totalItemCount": 10,
          "completedItemCount": 4,
          "skippedDuplicateCount": 3,
          "uploadedBytes": 409600,
          "totalBytes": 1024000
        },
        "createdAt": "2026-06-29T10:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### 6.5 获取任务详情

`GET /backup-tasks/{taskId}`

响应：

```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "name": "工作资料备份",
    "note": "6 月项目文件",
    "deviceId": "device_001",
    "deviceName": "Office PC",
    "status": "backing_up",
    "encryptionEnabled": true,
    "dedupeEnabled": true,
    "cloudTargetPath": "/apps/baidu-dedupe-backup/task_001",
    "progress": {
      "totalItemCount": 10,
      "backupItemCount": 7,
      "completedItemCount": 4,
      "skippedDuplicateCount": 3,
      "failedItemCount": 0,
      "currentItemName": "report.docx",
      "uploadedBytes": 409600,
      "totalBytes": 1024000
    },
    "createdAt": "2026-06-29T10:00:00Z",
    "startedAt": "2026-06-29T10:10:00Z"
  }
}
```

### 6.6 更新任务状态操作

`POST /backup-tasks/{taskId}/actions`

请求：

```json
{
  "action": "pause"
}
```

可用 `action`：

- `start`
- `pause`
- `resume`
- `continue_after_interruption`
- `delete`

响应：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "status": "paused"
  }
}
```

### 6.7 上报任务进度

`POST /backup-tasks/{taskId}/progress`

请求：

```json
{
  "status": "backing_up",
  "completedItemCount": 4,
  "failedItemCount": 0,
  "uploadedBytes": 409600,
  "totalBytes": 1024000,
  "currentItemName": "report.docx",
  "checkpointRef": "local_checkpoint_001"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "accepted": true
  }
}
```

### 6.8 完成任务

`POST /backup-tasks/{taskId}/complete`

请求：

```json
{
  "cloudTargetPath": "/apps/baidu-dedupe-backup/task_001",
  "completedItemCount": 7,
  "skippedDuplicateCount": 3,
  "failedItemCount": 0,
  "savedBytes": 2048000
}
```

响应：

```json
{
  "success": true,
  "data": {
    "taskId": "task_001",
    "status": "completed",
    "recordId": "record_001"
  }
}
```

## 7. 备份记录接口

### 7.1 获取记录列表

`GET /backup-records?deviceId=device_001&status=completed&encrypted=true&page=1&pageSize=20`

响应：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "record_001",
        "taskId": "task_001",
        "taskName": "工作资料备份",
        "deviceName": "Office PC",
        "status": "completed",
        "encryptionEnabled": true,
        "backupItemCount": 7,
        "skippedDuplicateCount": 3,
        "cloudTargetPath": "/apps/baidu-dedupe-backup/task_001",
        "completedAt": "2026-06-29T11:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

## 8. 通知接口

### 8.1 获取通知列表

`GET /notifications?status=unread&page=1&pageSize=20`

响应：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "notification_001",
        "type": "task_interrupted",
        "title": "备份任务异常中断",
        "message": "上次备份未正常完成，你可以继续备份。",
        "relatedTaskId": "task_001",
        "status": "unread",
        "createdAt": "2026-06-29T10:30:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### 8.2 更新通知状态

`PATCH /notifications/{notificationId}`

请求：

```json
{
  "status": "resolved"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "notification_001",
    "status": "resolved"
  }
}
```
