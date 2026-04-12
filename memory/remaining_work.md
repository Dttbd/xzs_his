---
name: Remaining Work Items
description: v1.0 完成后的待办事项清单 — Portal 后端 API、企微集成、生产优化等
type: project
---

## 高优先级

### ~~1. Portal 后端 API~~ ✅ 已完成
已创建 `handler/portal/`（auth.go, ticket.go, profile.go），注册了 7 个路由。工单强制所有权校验 + 内部留言过滤。

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

### ~~4. Swagger API 文档~~ ✅ 已完成
Swaggo 集成，Swagger UI 在 /swagger/index.html，主要 handler 已添加注释。

### ~~5. 数据库版本化迁移~~ ✅ 已完成
golang-migrate 集成，初始 schema 迁移脚本。`--migrate` 标志切换模式。

### ~~6. 报表导出~~ ✅ 已完成
医院统计页 + 医院列表页的 Excel 导出按钮已接通。PDF 导出归为低优先级。

### ~~7. React Hook Form + Zod~~ ✅ 已完成
登录(admin+portal)、医院新建/编辑、工单创建表单已用 RHF+Zod 重构。

## 低优先级

### ~~8. shadcn/ui 组件替换~~ ✅ 已完成
全部 UI 组件统一为 shadcn/ui（Button/Input/Dialog/Select/Badge/Card/Tabs/DropdownMenu 等），40+ 文件重构完成。

### ~~9. 密码修改~~ ✅ 已完成
后端 API + 管理端顶栏下拉菜单中的修改密码对话框。Portal 也支持。

### ~~10. 前端测试~~ → 保留为 TODO
后续按需添加 Vitest + Playwright。

### ~~11. 生产部署优化~~ ✅ 部分完成
- ECharts code splitting 已完成（主 bundle 1.66MB → 501KB）
- Nginx 生产配置和 Docker Compose 生产 profile 保留为 TODO

## How to apply
- 开发 Portal 后端时直接复用 admin 的 service/repository 层，只需新建 handler/portal 层
- 企微集成需要用户提供企业微信应用凭证才能开始
- 其他中低优先级可按需逐步补充
