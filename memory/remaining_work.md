---
name: Remaining Work Items
description: v1.0 完成后的待办事项清单 — Portal 后端 API、企微集成、生产优化等
type: project
---

## 高优先级

### ~~1. Portal 后端 API~~ ✅ 已完成
已创建 `handler/portal/`（auth.go, ticket.go, profile.go），注册了 7 个路由。工单强制所有权校验 + 内部留言过滤。

### ~~2. 企业微信 SSO~~ 🟡 抽象层已完成，仅余凭证联调
`pkg/wechat/` 已建（接口+工厂，`WECHAT_ENABLED` 切换 real/mock）。真实 OAuth 流程已完整实现（AuthURL / CodeToUserID via `/cgi-bin/auth/getuserinfo`）：
- `/api/auth/wechat/url`、`/api/auth/wechat/callback` 已实现，`LoginByWechatCode` → `LoginByWechatUserID` 用 `wechat_user_id`(已加索引) 匹配系统用户 → 签发 JWT
- 开发期无凭证用 `/api/auth/wechat/dev-login`（仅 `WECHAT_ENABLED=false` 时注册），跑通匹配+发 token 后半段
- 前端管理端登录页已加「企业微信登录」按钮 + `/wechat/callback` 回调页
- **剩余：** 配 `WECHAT_CORP_ID/AGENT_ID/SECRET/CALLBACK` + `WECHAT_ENABLED=true`，按官方文档复核端点联调

**Why:** 用户明确要求企微 SSO 作为主要登录方式。

### ~~3. 企业微信消息推送~~ 🟡 抽象层已完成，仅余凭证联调
`HandleSendWechatMsg` 已方法化（持有 `wechat.Messenger`）。真实发消息已完整实现（textcard via `/cgi-bin/message/send`，access_token 走 Redis 共享缓存 + SETNX 单飞 + 42001 重试）：
- ticket 4 处事件已并排入队 `EnqueueWechatMsg`（与站内信对等双通道）
- mock 模式把「本会推送的内容」落库为 `type=wechat_mock` 可见站内信（管理端可见）
- **剩余：** 同 SSO，配凭证 + `WECHAT_ENABLED=true` 即生效
- **已知小限制：** textcard 的 `url` 用常量兜底（无深链 base URL），深链为后续增强

**Why:** 用户要求站内信 + 企微推送双通道通知。

> 设计/计划见 `docs/superpowers/specs|plans/2026-06-08-wechat-integration-abstraction*.md`；merge commit `805a2fa`。

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

### ~~10. 前端测试~~ ✅ 基础框架已完成
Vitest starter suite + Playwright 登录冒烟已在 `hospital-web` 配置完成：
- **Vitest**（`@hospital/shared`）：12 个测试 — `cn()` 工具函数、`StatusBadge` 组件、`loginApi`（vi.mock axios）、`useAuthStore` 状态变更
- **Playwright**（仓库根）：2 个 E2E 冒烟——登录成功跳转、登录失败显示错误（后端全部 mock，无需真实服务）
- 运行命令：`pnpm test`（Vitest）、`pnpm test:e2e`（Playwright）

### ~~11. 生产部署优化~~ ✅ 部分完成
- ECharts code splitting 已完成（主 bundle 1.66MB → 501KB）
- Nginx 生产配置和 Docker Compose 生产 profile 保留为 TODO

## How to apply
- 开发 Portal 后端时直接复用 admin 的 service/repository 层，只需新建 handler/portal 层
- 企微集成抽象层已完成（mock/real 可插拔）；拿到企业微信应用凭证后只需配 env + `WECHAT_ENABLED=true` 即可上线联调
- 其他中低优先级可按需逐步补充
