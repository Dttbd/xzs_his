---
name: HIS Project Overview
description: 医院信息系统总览 — 技术栈、6阶段路线图、当前完成进度、团队规模
type: project
---

## 项目背景

医院信息系统（HIS）— 50-100人内部员工 + 外部医院客户使用的客户管理平台。

**Why:** 公司需要集中管理医院客户信息，支持工单流转、区域公告、数据报表等业务流程。

## 6阶段路线图

| 阶段 | 名称 | 状态 |
|------|------|------|
| Phase 1 | 后端基础（脚手架/认证/用户/组织/RBAC） | ✅ 完成 |
| Phase 2 | 核心业务（医院CRUD/工单系统/文件上传） | ✅ 完成 |
| Phase 3 | 支撑系统（公告/通知/报表聚合/Asynq） | ✅ 完成 |
| Phase 4 | 前端基础（Monorepo/共享组件/布局/认证） | ✅ 完成 |
| Phase 5 | 管理端 SPA（仪表盘/医院/工单/报表页面） | ✅ 完成 |
| Phase 6 | 客户门户 SPA（工单提交/进度/留言） | ✅ 完成 |

## 当前代码统计

- 后端 Go 代码: 71 个文件
- 前端 React/TS 代码: 75+ 个文件, shared/admin/portal 三个包
- Asynq 异步任务 worker（独立进程）
- Docker Compose: PostgreSQL 16 + Redis 7 + MinIO
- 共享 UI 组件库: 17 个 shadcn/ui 风格组件（含 Popover、DatePicker）

## 近期改动（2026-04-13）

- 修复前端 API 分页数据类型不匹配（8 个函数）
- 登录页重设计（左右分栏布局，admin + portal）
- 侧边栏可收起/展开
- 自定义 DatePicker 替换原生日期输入
- 公告支持 scope_type="all" 全局发布
- 手机端弹窗/通知间距优化

## How to apply

- 6 阶段全部完成，进入测试和 bug 修复阶段
- 高优先级：企微 SSO → 企微消息推送（需凭证）
- 低优先级：前端测试、Nginx 配置、PDF 导出
- 详见 remaining_work.md
