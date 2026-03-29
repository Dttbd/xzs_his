---
name: API Reference
description: 已实现的后端 API 端点清单 — Phase 1+2 共 50+ 个接口
type: reference
---

## 已实现的 API 端点

### 认证 (/api/auth)
```
POST /api/auth/login          # 账号密码登录
POST /api/auth/logout         # 登出
```

### 管理端 (/api/admin/v1) — 需 JWT 认证

**用户管理**
```
GET/POST          /users
GET/PUT/DELETE    /users/:id
PUT               /users/:id/roles
POST              /auth/refresh
```

**组织架构**
```
GET/POST          /regions
GET/PUT/DELETE    /regions/:id
GET/POST          /provinces
GET/PUT/DELETE    /provinces/:id
```

**角色管理**
```
GET/POST          /roles
GET/PUT/DELETE    /roles/:id
PUT               /roles/:id/permissions
```

**医院管理**
```
GET/POST          /hospitals
GET               /hospitals/summary    # 汇总统计
GET               /hospitals/export     # Excel 导出
GET/PUT/DELETE    /hospitals/:id
GET/POST          /hospital-categories
GET/PUT/DELETE    /hospital-categories/:id
GET/POST          /field-definitions
GET/PUT/DELETE    /field-definitions/:id
```

**工单系统**
```
GET/POST          /tickets
GET               /tickets/:id
PUT               /tickets/:id/transition    # 状态流转
PUT               /tickets/:id/assign        # 转派
POST              /tickets/:id/comments      # 留言
POST              /tickets/:id/attachments   # 附件
```

**工单配置**
```
GET/POST          /ticket-types
GET/PUT/DELETE    /ticket-types/:id
GET/POST          /ticket-statuses
GET/PUT/DELETE    /ticket-statuses/:id
GET/POST          /ticket-transitions
GET/PUT/DELETE    /ticket-transitions/:id
```

### 通用 (/api/common/v1)
```
POST /upload         # 文件上传 (→MinIO)
GET  /files/:id      # 文件预览/下载
```

**公告管理**
```
GET/POST          /bulletins
GET/PUT/DELETE    /bulletins/:id
PUT               /bulletins/:id/publish
```

**通知系统**
```
GET               /notifications
GET               /notifications/unread-count
PUT               /notifications/read-all
PUT               /notifications/:id/read
```

**报表中心**
```
GET  /reports/overview          # 总览仪表盘
GET  /reports/hospital-stats    # 医院统计 (group_by=province|region|category|specialty_type)
GET  /reports/ticket-stats      # 工单统计 (group_by=type|status|assignee)
GET  /reports/ticket-trend      # 工单趋势 (interval=day|week|month)
GET  /reports/sales-stats       # 销售业绩
```

### 待实现 (Phase 4-6)
- 客户门户 API (/api/portal/v1/*)
- 前端 SPA (admin + portal)
