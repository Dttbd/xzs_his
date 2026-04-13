---
name: Bugs Fixed During Development
description: 开发过程中发现并修复的 bug 记录，避免重复踩坑
type: feedback
---

### 1. Casbin v2 → v3 兼容性问题
**问题:** `gorm-adapter/v3` 最新版内部使用 `casbin/v3`，与项目中 `casbin/v2` 不兼容，导致运行时 panic。
**修复:** 所有引用 casbin 的文件从 `casbin/v2` 改为 `casbin/v3`。
**How to apply:** 新增 casbin 相关代码时始终使用 `github.com/casbin/casbin/v3`。

### 2. GORM Save() 预加载关联导致更新静默失败
**问题:** `db.Save(ticket)` 在 ticket 有预加载关联(Status, Type, Comments 等)时，GORM 会尝试 upsert 所有嵌套关联，导致主表字段更新静默失败。工单状态流转返回 200 但状态实际未变。
**修复:** 改用 `db.Model(ticket).Select("status_id", "assignee_id", "resolved_at", "updated_at").Updates(ticket)` 显式指定更新列。
**How to apply:** 对有预加载关联的模型做更新时，避免 `db.Save()`，使用 `Model().Select().Updates()` 指定列。

### 3. 前端 API 分页数据类型不匹配
**问题:** 后端所有列表接口统一返回 `PageOK()` 分页格式 `{list, total, page, page_size}`，但前端 8 个 API 函数（listCategories、listRegions、listProvinces、listTicketTypes、listTicketStatuses、listTransitions、listRoles、listFieldDefinitions）类型声明为返回数组，导致 `.map is not a function` 运行时错误。
**修复:** 改为 `ApiResponse<PageResult<T>>` 类型并提取 `.list`。同时 `page_size` 从 200 改为 100（后端上限）。
**How to apply:** 新增列表 API 时，确认后端是用 `dto.OK()` 还是 `dto.PageOK()`，前端类型要对应。

### 4. Portal 残留 .js 编译文件覆盖 .tsx 源码
**问题:** Portal 包中存在早期编译产物 .js 文件与 .tsx 文件并存，Vite 优先加载 .js 导致新代码不生效。
**修复:** 删除所有 `packages/portal/src/**/*.js` 残留文件。
**How to apply:** 项目中所有源码统一使用 .ts/.tsx，不提交编译产物。
