# 医院信息系统（HIS）设计规格

## 1. 项目概述

医院信息系统（Hospital Information System），内部客户管理平台，用于记录以医院为单位的客户信息，支持工单流转、报表统计、公告管理等功能。

**用户规模：** 50-100 人内部员工 + 外部医院客户
**部署方式：** Docker Compose（预留 K8s 迁移空间）

## 2. 系统架构

### 2.1 整体架构

单体分层架构（Clean Architecture），一个 Go API 服务 + 两个 React SPA 前端。

```
┌─────────────┐  ┌──────────────┐
│ 管理端 SPA   │  │ 客户门户 SPA  │
│ React+shadcn │  │ React+shadcn  │
└──────┬──────┘  └──────┬───────┘
       │                │
       ▼                ▼
   Nginx 反向代理（HTTPS）
       │
       ▼
┌──────────────────────────────┐
│  Go API 服务（Gin）           │
│  ├── middleware（JWT/RBAC/CORS）│
│  ├── handler/admin  (管理端API) │
│  ├── handler/portal (客户端API) │
│  ├── service   (业务逻辑)      │
│  ├── repository(数据访问)      │
│  └── models    (实体)          │
└──────────┬───────────────────┘
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
PostgreSQL Redis  MinIO
           │
     Asynq Worker（异步任务）
           │
     企业微信 API（SSO + 推送）
```

### 2.2 技术栈

**后端：**
- 语言/框架：Go + Gin
- 数据库：PostgreSQL
- ORM：GORM v2
- 缓存/队列：Redis + Asynq
- 权限：Casbin（RBAC，角色 → API/菜单权限）
- 文件存储：MinIO（S3 兼容，可迁移阿里云 OSS）
- 导出：excelize（Excel）、PDF 生成
- API 文档：Swaggo（自动生成 Swagger → TS 类型）
- 认证：JWT + 企业微信 OAuth SSO + 账号密码备选

**前端：**
- 框架：React 18/19 + TypeScript
- 构建：Vite
- UI：shadcn/ui + Tailwind CSS v4
- 状态管理：Zustand + TanStack Query
- 表格：TanStack Table（虚拟滚动、排序、过滤）
- 图表：ECharts（React 封装）
- 表单：React Hook Form + Zod
- 路由：React Router
- HTTP：Axios + TanStack Query
- 图标：Lucide React（stroke-width 1.5，线性扁平）
- 主题：暗黑/日间/跟随系统（Tailwind class 策略 + CSS Variables）
- Monorepo：pnpm workspace

**部署：**
- Docker Compose（Nginx + Go API + PostgreSQL + Redis + MinIO + Asynq Worker）
- 服务拆分清晰，预留 K8s 迁移

### 2.3 后端项目结构

```
hospital-server/
├── cmd/
│   ├── server/main.go            # API 服务入口
│   └── worker/main.go            # Asynq 异步任务 worker
├── internal/
│   ├── config/                   # 配置加载（Viper）
│   ├── middleware/               # JWT、RBAC、CORS、日志、限流
│   ├── router/                   # 路由注册
│   ├── models/                   # GORM 数据模型（所有实体）
│   ├── dto/                      # 请求/响应 DTO
│   ├── handler/                  # Gin 路由处理器（按域分子包）
│   │   ├── admin/                # 管理端 API
│   │   │   ├── hospital.go
│   │   │   ├── ticket.go
│   │   │   ├── report.go
│   │   │   ├── user.go
│   │   │   ├── bulletin.go
│   │   │   ├── notification.go
│   │   │   └── system.go
│   │   └── portal/               # 客户门户 API
│   │       ├── ticket.go
│   │       └── profile.go
│   ├── service/                  # 业务逻辑层（按域分子包）
│   │   ├── hospital/
│   │   ├── ticket/               # 含状态机逻辑
│   │   ├── report/
│   │   ├── user/
│   │   ├── bulletin/
│   │   ├── notification/
│   │   └── system/
│   └── repository/               # 数据访问层（按域分子包）
│       ├── hospital/
│       ├── ticket/
│       ├── report/
│       ├── user/
│       ├── bulletin/
│       ├── notification/
│       └── system/
├── pkg/
│   ├── auth/                     # JWT + 企微 OAuth
│   ├── casbin/                   # Casbin 初始化
│   ├── storage/                  # MinIO 客户端封装
│   ├── wechat/                   # 企业微信 SDK 封装
│   └── export/                   # Excel/PDF 导出
├── migrations/                   # 数据库迁移脚本
├── docs/                         # Swagger 文档
├── deploy/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── nginx.conf
└── go.mod
```

组织方式：按层（handler → service → repository）分顶级目录，每层内按业务域分子包。handler 层因为要区分管理端/客户端路由，所以先分 admin/portal 再按域分文件。

### 2.4 前端项目结构

```
hospital-web/
├── packages/
│   ├── shared/                 # 共享组件库 + API 类型
│   │   ├── components/         # 通用 UI 组件
│   │   ├── api/                # API 客户端（Swagger 生成 TS 类型）
│   │   ├── hooks/              # 共享 hooks
│   │   └── utils/
│   ├── admin/                  # 管理端 SPA
│   │   └── src/
│   │       ├── pages/          # 页面（dashboard/hospital/ticket/report/bulletin/user/system）
│   │       ├── layouts/        # 布局（侧边栏/响应式）
│   │       └── stores/         # Zustand 状态
│   └── portal/                 # 客户门户 SPA
│       └── src/
│           ├── pages/          # 页面（ticket/profile）
│           └── layouts/
├── pnpm-workspace.yaml
└── package.json
```

## 3. 数据模型

### 3.1 组织架构

**regions（大区）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | VARCHAR | 大区名称 |
| code | VARCHAR UQ | 大区编码 |
| status | SMALLINT | 状态 |
| sort_order | INT | 排序 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**provinces（省）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| region_id | UUID FK→regions | 所属大区 |
| name | VARCHAR | 省名称 |
| code | VARCHAR UQ | 省编码 |
| default_handler | UUID FK→users | 默认工单处理人 |
| status | SMALLINT | |
| sort_order | INT | |

大区和省均为可配置管理，支持增删改查。

### 3.2 用户与权限

**users（用户）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| username | VARCHAR UQ | 登录用户名 |
| password_hash | VARCHAR | 密码哈希 |
| real_name | VARCHAR | 真实姓名 |
| phone | VARCHAR | 手机 |
| email | VARCHAR | 邮箱 |
| avatar_url | VARCHAR | 头像 |
| region_id | UUID FK | 所属大区 |
| province_id | UUID FK | 所属省 |
| wechat_userid | VARCHAR | 企业微信 UserID |
| status | SMALLINT | active/disabled |
| last_login_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | 软删除 |

**roles（角色）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | VARCHAR | 角色名称 |
| code | VARCHAR UQ | 角色编码 |
| description | TEXT | |
| is_system | BOOL | 系统内置角色 |

**user_roles（用户-角色关联）**：user_id + role_id 复合主键。

权限通过 Casbin 管理，role → API 路径 + 菜单权限映射，不单独建权限表。

预设角色：系统管理员、大区负责人、省负责人、销售、售前、售后、支持人员、客户。

### 3.3 医院信息

**hospitals（医院）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | VARCHAR | 医院名称 |
| code | VARCHAR UQ | 医院编码 |
| category_id | UUID FK | 分类 |
| level | VARCHAR | 等级（三甲/二甲等） |
| province_id | UUID FK | 所属省 |
| city | VARCHAR | 城市 |
| address | TEXT | 地址 |
| contact_name | VARCHAR | 联系人 |
| contact_phone | VARCHAR | 联系电话 |
| contact_email | VARCHAR | 联系邮箱 |
| bed_count | INT | 床位数 |
| department_count | INT | 科室数 |
| is_specialized | BOOL | 是否专科医院 |
| specialty_type | VARCHAR | 专科类型 |
| owner_user_id | UUID FK | 负责销售 |
| status | SMALLINT | |
| remark | TEXT | 备注 |
| extra | JSONB | 扩展字段（快速扩展） |

**hospital_categories（医院分类）**：id / name / code / parent_id（自引用树形） / sort_order

**field_definitions（自定义字段定义）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| field_key | VARCHAR UQ | 字段标识 |
| field_name | VARCHAR | 显示名称 |
| field_type | VARCHAR | text/number/select/date |
| options | JSONB | 下拉选项 |
| is_required | BOOL | 是否必填 |
| is_filterable | BOOL | 是否可筛选 |
| sort_order | INT | |

**hospital_fields（医院动态字段值）**：hospital_id + field_key + field_value

所有固定字段和动态字段均可作为筛选条件，支持多条件组合查询和导出。

### 3.4 工单系统

**ticket_types（工单类型 - 可配置）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | VARCHAR | 类型名称 |
| code | VARCHAR UQ | 类型编码 |
| icon | VARCHAR | 图标 |
| description | TEXT | |
| is_active | BOOL | 是否启用 |
| sort_order | INT | |

默认类型：故障处理、功能需求、市场反馈、客户之声、内部支持、售前调研。支持后台增删改。

**ticket_statuses（工单状态 - 可配置）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| name | VARCHAR | 状态名称 |
| code | VARCHAR UQ | 状态编码 |
| color | VARCHAR | 状态颜色 |
| is_initial | BOOL | 是否初始状态 |
| is_terminal | BOOL | 是否终态 |

默认状态：待处理(open)、处理中(in_progress)、已完结(resolved)、已挂起(suspended)、已转派(reassigned)、已关闭(closed)。

**ticket_transitions（状态流转规则 - 可配置）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| from_status | UUID FK | 起始状态 |
| to_status | UUID FK | 目标状态 |
| name | VARCHAR | 操作名称（如"接单"、"完结"） |
| allowed_roles | JSONB | 允许操作的角色列表 |

默认流转：
- open → in_progress（接单/指派）
- in_progress → resolved（完结）
- in_progress → suspended（挂起）
- in_progress → reassigned → in_progress（转派）
- suspended → in_progress（恢复）
- suspended → closed（关闭）

**tickets（工单）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| ticket_no | VARCHAR UQ | 工单号（自动生成） |
| title | VARCHAR | 标题 |
| description | TEXT | 描述 |
| type_id | UUID FK | 工单类型 |
| status_id | UUID FK | 当前状态 |
| priority | SMALLINT | 优先级 |
| hospital_id | UUID FK | 关联医院 |
| creator_id | UUID FK | 创建人 |
| assignee_id | UUID FK | 处理人 |
| province_id | UUID FK | 所属省 |
| region_id | UUID FK | 所属大区 |
| resolved_at | TIMESTAMP | 完结时间 |

任何人可创建工单并手动指派处理人。未指派时按区域默认处理人（province.default_handler）自动派单。管理员可转派。

**ticket_comments（工单留言）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| ticket_id | UUID FK | |
| user_id | UUID FK | 留言人 |
| content | TEXT | 内容 |
| is_internal | BOOL | 内部备注（客户门户不可见） |

**ticket_attachments（附件）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| ticket_id | UUID FK | |
| comment_id | UUID FK（可选）| 关联留言 |
| file_name | VARCHAR | 文件名 |
| file_url | VARCHAR | MinIO 存储路径 |
| file_size | BIGINT | 文件大小 |
| file_type | VARCHAR | 文件类型（image/video/document） |
| uploader_id | UUID FK | 上传人 |

支持图片、视频、文档等附件上传，通过 MinIO 存储。

**ticket_logs（操作日志）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| ticket_id | UUID FK | |
| user_id | UUID FK | 操作人 |
| action | VARCHAR | create/assign/transition/comment |
| from_status | VARCHAR | 原状态 |
| to_status | VARCHAR | 新状态 |
| detail | JSONB | 详细信息 |

### 3.5 公告

**bulletins（公告）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| title | VARCHAR | 标题 |
| content | TEXT | 富文本内容 |
| scope_type | VARCHAR | region / province |
| scope_id | UUID | 大区ID 或 省ID |
| author_id | UUID FK | 发布者 |
| is_pinned | BOOL | 是否置顶 |
| published_at | TIMESTAMP | 发布时间 |
| expires_at | TIMESTAMP | 过期时间（可选） |
| status | SMALLINT | draft/published/archived |

大区负责人可发布大区级公告（大区内所有省可见），省负责人可发布省级公告（仅该省可见）。

### 3.6 通知

**notifications（站内通知）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK | 接收人 |
| title | VARCHAR | 标题 |
| content | TEXT | 内容 |
| type | VARCHAR | ticket/bulletin/system |
| ref_type | VARCHAR | 引用类型 |
| ref_id | UUID | 引用 ID |
| is_read | BOOL | 是否已读 |

通知触发（通过 Asynq 异步执行）：
- 工单创建/转派/状态变更 → 站内信 + 企业微信消息推送
- 公告发布 → 区域内用户站内信 + 企业微信推送
- 系统通知 → 站内信

### 3.7 系统配置

**system_configs（系统配置）**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| group | VARCHAR | 配置分组 |
| key | VARCHAR | 配置键 |
| value | JSONB | 配置值 |
| description | TEXT | 说明 |
| UQ | (group, key) | |

用途：工单类型/状态配置、字段定义、医院等级/分类选项、其他系统级键值配置。

## 4. API 设计

### 4.1 认证

```
POST   /api/auth/login              # 账号密码登录
POST   /api/auth/wechat/callback    # 企微 SSO 回调
POST   /api/auth/refresh            # 刷新 Token
POST   /api/auth/logout             # 登出
```

### 4.2 管理端 API（/api/admin/v1）

**用户管理**
```
GET    /api/admin/v1/users           # 用户列表（分页/筛选）
POST   /api/admin/v1/users           # 创建用户
PUT    /api/admin/v1/users/:id       # 编辑用户
DELETE /api/admin/v1/users/:id       # 注销用户（软删除）
PUT    /api/admin/v1/users/:id/roles # 分配角色
```

**组织架构**
```
CRUD   /api/admin/v1/regions         # 大区管理
CRUD   /api/admin/v1/provinces       # 省管理（含默认处理人）
```

**医院信息**
```
GET    /api/admin/v1/hospitals               # 医院列表（多条件筛选）
POST   /api/admin/v1/hospitals               # 新建医院
PUT    /api/admin/v1/hospitals/:id           # 编辑医院
DELETE /api/admin/v1/hospitals/:id           # 删除医院
GET    /api/admin/v1/hospitals/summary       # 汇总统计
GET    /api/admin/v1/hospitals/export        # 导出 Excel/PDF
CRUD   /api/admin/v1/hospital-categories     # 医院分类管理
CRUD   /api/admin/v1/field-definitions       # 自定义字段管理
```

**工单系统**
```
GET    /api/admin/v1/tickets                 # 工单列表
POST   /api/admin/v1/tickets                 # 创建工单
GET    /api/admin/v1/tickets/:id             # 工单详情
PUT    /api/admin/v1/tickets/:id/transition  # 状态流转
PUT    /api/admin/v1/tickets/:id/assign      # 转派
POST   /api/admin/v1/tickets/:id/comments    # 添加留言
POST   /api/admin/v1/tickets/:id/attachments # 上传附件
```

**工单配置**
```
CRUD   /api/admin/v1/ticket-types            # 工单类型管理
CRUD   /api/admin/v1/ticket-statuses         # 工单状态管理
CRUD   /api/admin/v1/ticket-transitions      # 状态流转规则管理
```

**公告**
```
GET    /api/admin/v1/bulletins               # 公告列表
POST   /api/admin/v1/bulletins               # 发布公告
PUT    /api/admin/v1/bulletins/:id           # 编辑公告
DELETE /api/admin/v1/bulletins/:id           # 删除公告
```

**报表**
```
GET    /api/admin/v1/reports/hospital-stats   # 医院统计
GET    /api/admin/v1/reports/ticket-stats     # 工单统计
GET    /api/admin/v1/reports/sales-stats      # 销售业绩统计
GET    /api/admin/v1/reports/overview         # 总览仪表盘
GET    /api/admin/v1/reports/export           # 报表导出
```

**通知**
```
GET    /api/admin/v1/notifications            # 通知列表
PUT    /api/admin/v1/notifications/:id/read   # 标记已读
PUT    /api/admin/v1/notifications/read-all   # 全部已读
```

**文件（通用）**
```
POST   /api/common/v1/upload                  # 文件上传（→MinIO）
GET    /api/common/v1/files/:id               # 文件下载/预览
```

**系统配置**
```
CRUD   /api/admin/v1/configs                  # 系统键值配置
CRUD   /api/admin/v1/roles                    # 角色管理
PUT    /api/admin/v1/roles/:id/permissions    # 角色权限设置
GET    /api/admin/v1/menus                    # 菜单列表
```

### 4.3 客户门户 API（/api/portal/v1）

```
POST   /api/portal/auth/login                 # 客户登录
POST   /api/portal/auth/refresh               # 刷新 Token
GET    /api/portal/v1/tickets                 # 我的工单列表
POST   /api/portal/v1/tickets                 # 提交工单
GET    /api/portal/v1/tickets/:id             # 工单详情（过滤内部备注）
POST   /api/portal/v1/tickets/:id/comments    # 客户留言
POST   /api/portal/v1/tickets/:id/attachments # 客户上传附件
GET    /api/portal/v1/profile                 # 个人信息
PUT    /api/portal/v1/profile                 # 更新个人信息
```

共用：`/api/common/v1/upload`、`/api/common/v1/files/:id`

## 5. 前端设计

### 5.1 管理端页面

| 模块 | 页面 | 核心功能 |
|------|------|----------|
| 工作台 | Dashboard | 统计卡片 + 工单趋势图 + 类型分布图 + 最近工单 + 区域公告 |
| 医院管理 | 列表/详情/汇总 | TanStack Table 多条件筛选 + 虚拟滚动 + 动态自定义字段 + 汇总图表 + 导出 |
| 工单中心 | 列表/创建/详情/我的 | 筛选（类型/状态/处理人/日期） + 状态流转 + 留言时间线 + 附件 + 日志 |
| 公告管理 | 列表/发布/详情 | 按大区/省筛选 + 富文本编辑器 + scope 选择 |
| 报表中心 | 医院统计/工单统计/销售业绩/自定义汇总 | ECharts 图表 + 多维筛选 + Excel/PDF 导出 |
| 用户管理 | 用户列表/角色管理 | 创建/编辑/注销 + 角色分配 + Casbin 权限配置 |
| 系统设置 | 组织架构/工单配置/字段配置/系统参数 | 大区/省管理 + 类型/状态/流转规则 + 自定义字段 |

### 5.2 客户门户页面

| 页面 | 功能 |
|------|------|
| 我的工单 | 工单列表 + 提交工单 + 查看进度 + 留言 + 附件（不可见内部备注） |
| 个人信息 | 查看/编辑 |

### 5.3 响应式布局

三断点策略（Tailwind mobile-first）：

| 断点 | 导航 | 表格 | 布局 |
|------|------|------|------|
| <768px（手机） | 底部 Tab Bar + 抽屉菜单 | 卡片列表模式 | 单列全宽 |
| 768-1024px（平板） | 侧边栏折叠（icon-only） | 保留表格 | 顶部导航 |
| ≥1024px（桌面） | 侧边栏展开 | 完整表格 | 顶部导航 |

关键适配：
- 手机端筛选项折叠为「筛选」按钮 → 弹出 Sheet
- 手机端工单详情留言时间线纵向排列
- 图表响应式 resize，手机端简化图例

### 5.4 视觉风格

**设计原则：** 现代扁平化、干净、大留白

- 零阴影：用 1px border 代替 box-shadow
- 大圆角：卡片 12px、按钮/标签 8px、状态徽章 99px（pill）
- 图标：Lucide React，stroke-width 1.5，纯线条无填充无彩色
- 图标选中态用品牌色，未选中用 muted 灰

**主题系统：** 暗黑 / 日间 / 跟随系统

| Token | 暗黑模式 | 日间模式 |
|-------|----------|----------|
| background | #121218（柔和深蓝灰） | #f8fafc（微灰白） |
| card | #1a1a24（带微蓝） | #ffffff |
| border | rgba(148,163,184,0.08) | #e2e8f0 |
| foreground | #e2e8f0 | #0f172a |
| muted | #94a3b8 | #64748b |
| muted-foreground | #64748b | #94a3b8 |
| accent | #818cf8（indigo-400） | #6366f1（indigo-500） |

**状态色：**
| 状态 | 暗黑 | 日间 |
|------|------|------|
| 待处理 | #818cf8 | #6366f1 |
| 处理中 | #fb923c | #ea580c |
| 已完结 | #34d399 | #059669 |
| 已挂起 | #fbbf24 | #d97706 |
| 已关闭 | #64748b | #94a3b8 |
| 告警/删除 | #f87171 | #dc2626 |

技术实现：Tailwind CSS dark: 前缀（class 策略），CSS Variables 定义色彩，localStorage 持久化用户选择，优先级：用户选择 > 系统偏好。

## 6. 通知系统

### 6.1 通知渠道

- **站内信：** 系统内通知列表，支持已读/未读、全部已读
- **企业微信推送：** 通过企业微信 API 发送消息卡片，确保及时触达

### 6.2 触发场景

| 场景 | 站内信 | 企微推送 |
|------|--------|----------|
| 工单创建（通知处理人） | ✓ | ✓ |
| 工单转派（通知新处理人） | ✓ | ✓ |
| 工单状态变更（通知创建人） | ✓ | ✓ |
| 工单留言（通知相关人） | ✓ | ✓ |
| 公告发布（通知区域用户） | ✓ | ✓ |
| 系统通知 | ✓ | - |

所有通知通过 Asynq 异步任务队列处理，不阻塞主流程。

## 7. 外部集成

### 7.1 企业微信

- **SSO 登录：** OAuth 2.0 授权码模式，获取企业微信 UserID 匹配系统用户
- **消息推送：** 应用消息 API，发送文本卡片消息

### 7.2 MinIO

- S3 兼容 API，后续可无缝切换阿里云 OSS
- 文件上传生成预签名 URL，前端直传
- 支持图片、视频、文档等格式

## 8. 部署架构

```yaml
# docker-compose.yml 服务清单
services:
  nginx:        # 反向代理，静态文件服务
  api:          # Go API 服务
  worker:       # Asynq 异步任务 worker
  postgres:     # PostgreSQL 数据库
  redis:        # Redis 缓存/队列
  minio:        # MinIO 文件存储
```

每个服务独立容器，通过 Docker 网络通信。数据持久化通过 volumes 挂载。预留 K8s 迁移：每个服务已独立拆分，迁移时只需编写 K8s manifests。
