---
name: Backend Architecture Decisions
description: 后端架构决策记录 — Clean Architecture分层、模块划分、认证方案、状态机设计
type: project
---

## 架构选择

单体分层架构（Clean Architecture），一个 Go API 服务，内部按层组织：

```
handler (Gin路由) → service (业务逻辑) → repository (数据访问) → models (GORM实体)
```

**Why:** 50-100人规模的内部系统，单体足够。模块边界清晰，未来可沿模块切割微服务。

## 关键决策

### 认证: JWT + 企业微信 SSO
- JWT 无状态认证，access token 24h 过期
- 企业微信 OAuth SSO（Phase 3 实现）
- 账号密码作为备选

### 权限: Casbin v3
- RBAC 模型，role → API 路径 + 方法
- keyMatch2 匹配器支持通配符路径
- 不单独建权限表，Casbin 自管理策略

### 工单状态机: 可配置
- ticket_statuses 表定义状态（is_initial/is_terminal 标记首尾态）
- ticket_transitions 表定义合法流转（from→to + allowed_roles）
- 服务层校验：查询当前状态的合法转换，不在列表内则拒绝
- 所有状态变更记录 ticket_logs

### 医院动态字段
- field_definitions 表定义字段元数据（key/name/type/options）
- hospital_fields 表存储值（hospital_id + field_key + field_value）
- 所有字段（固定+动态）均可作为筛选条件

### 文件存储: MinIO (S3 兼容)
- 上传生成 UUID 路径，按日期分目录
- PresignedURL 提供临时访问链接
- 后续可无缝切换阿里云 OSS

## How to apply

- 新增业务模块遵循相同分层：dto → repository → service → handler
- handler 层 admin/ 和 portal/ 分端，共享 service/repository
- 可配置项（类型/状态/字段）走 CRUD 管理接口，不硬编码
