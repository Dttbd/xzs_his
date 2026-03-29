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
- 前端 React/TS 代码: 71 个文件, shared/admin/portal 三个包
- 54 个 git commits
- 15 个集成测试 + 4 个单元测试，全部通过
- Asynq 异步任务 worker（独立进程）
- Admin SPA: 1.66MB JS (含ECharts, gzip 521KB)
- Portal SPA: 357KB JS (gzip 115KB)
- Docker Compose: PostgreSQL 16 + Redis 7 + MinIO

## How to apply

- 后续开发从 Phase 3 或 Phase 4 继续
- Phase 3 和 Phase 4 可以并行（后端和前端独立）
- Phase 5 依赖 Phase 3 + 4，Phase 6 同理
