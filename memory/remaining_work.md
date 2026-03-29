---
name: Remaining Work Items
description: v1.0 完成后的待办事项清单 — Portal 后端 API、企微集成、生产优化等
type: project
---

## 高优先级

### 1. Portal 后端 API
`handler/portal/` 目录未实现，前端 Portal 调用的 `/api/portal/v1/*` 接口不存在。需要创建：
- `internal/handler/portal/auth.go` — 客户登录（独立于 admin 登录）
- `internal/handler/portal/ticket.go` — 工单列表/提交/详情/留言/附件（过滤 is_internal 留言）
- `internal/handler/portal/profile.go` — 个人信息查看/编辑
- 在 `router.go` 中注册 `/api/portal/v1/*` 路由组

**Why:** 客户门户前端已就绪但后端 API 不存在，Portal 无法正常工作。

### 2. 企业微信 SSO
`pkg/wechat/` 未创建。需要：
- 企业微信 OAuth 2.0 授权码流程
- `/api/auth/wechat/callback` 回调接口
- 用 `wechat_userid` 匹配系统用户
- 需要企业微信应用 AppID/Secret 才能开发和测试

**Why:** 用户明确要求企微 SSO 作为主要登录方式。

### 3. 企业微信消息推送
Worker 中 `HandleSendWechatMsg` 是 stub（只打日志）。需要：
- 对接企业微信应用消息 API
- 发送文本卡片消息通知（工单/公告事件）
- 需要企业微信应用配置

**Why:** 用户要求站内信 + 企微推送双通道通知。

## 中优先级

### 4. Swagger API 文档
设计中指定 Swaggo 自动生成 → 前端 TS 类型。未集成。
- 安装 `swaggo/swag`，给 handler 加注释，生成 `/docs/swagger.json`

### 5. 数据库版本化迁移
目前用 GORM AutoMigrate（仅增量加列，不支持删列/改列）。生产环境应使用 `golang-migrate` 管理迁移脚本。

### 6. 报表导出完善
- Excel 导出框架已有，报表页面的导出按钮需要接通
- PDF 导出未实现（计划用 excelize 或 wkhtmltopdf）

### 7. React Hook Form + Zod 表单验证
设计中指定但未集成。当前用原生 state 管理表单。影响：表单校验不够严格，复杂表单维护成本高。

## 低优先级

### 8. shadcn/ui 组件替换
当前手写 Tailwind 组件功能等价，但缺少无障碍访问(a11y)。可逐步用 shadcn/ui 替换。

### 9. 密码修改
DTO 已定义 `ChangePasswordReq`，但接口和页面未实现。

### 10. 前端测试
无前端测试。可加 Vitest（单元）+ Playwright（E2E）。

### 11. 生产部署优化
- ECharts 动态 import / code splitting（Admin bundle 1.66MB）
- Nginx 生产配置（gzip、缓存、HTTPS 证书）
- Docker Compose 生产 profile（资源限制、日志）

## How to apply
- 开发 Portal 后端时直接复用 admin 的 service/repository 层，只需新建 handler/portal 层
- 企微集成需要用户提供企业微信应用凭证才能开始
- 其他中低优先级可按需逐步补充
