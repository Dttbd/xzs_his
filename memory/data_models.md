---
name: Data Models
description: 数据库实体关系 — 15个GORM模型，UUID主键，软删除，关键关系说明
type: reference
---

## 已实现的数据模型 (15个)

### 组织架构
- **Region** (大区) — name, code, status, sort_order
- **Province** (省) — region_id→Region, default_handler→User

### 用户权限
- **User** — username, password_hash, real_name, region_id, province_id, wechat_userid
- **Role** — name, code, is_system (系统内置不可删)
- user_roles (多对多关联表，GORM 自动管理)

### 医院信息
- **Hospital** — 20+固定字段, category_id→HospitalCategory, province_id, owner_user_id
- **HospitalCategory** — 树形结构 (parent_id 自引用)
- **FieldDefinition** — 自定义字段定义 (field_key, field_type, options, is_filterable)
- **HospitalField** — 医院动态字段值 (hospital_id + field_key + field_value)

### 工单系统
- **TicketType** — 可配置工单类型 (故障处理/功能需求/市场反馈/客户之声/内部支持/售前调研)
- **TicketStatus** — 可配置状态 (is_initial/is_terminal 标记)
- **TicketTransition** — 状态流转规则 (from→to + allowed_roles JSON)
- **Ticket** — ticket_no(TK-YYYYMMDD-XXXX), type_id, status_id, creator_id, assignee_id, hospital_id
- **TicketComment** — 留言 (is_internal: 内部备注客户不可见)
- **TicketAttachment** — 附件 (file_url 指向 MinIO)
- **TicketLog** — 操作日志 (action: create/assign/transition/comment)

### 待实现 (Phase 3)
- Bulletin (公告) — scope_type(region/province) + scope_id
- Notification (站内通知) — user_id, type, ref_type, ref_id, is_read

## 关键设计

- 所有模型继承 BaseModel (UUID PK + created_at + updated_at + soft delete)
- 使用 `gen_random_uuid()` PostgreSQL 函数生成 UUID
- PasswordHash 字段 `json:"-"` 永不序列化到 API 响应
