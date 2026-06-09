# Hospital Information System (HIS)

内部客户管理平台，以医院为单位记录客户信息，支持工单流转、报表统计、公告管理等功能。

## 项目结构

```
hospital/
├── hospital-server/       # Go 后端（Gin + GORM + PostgreSQL）
├── hospital-web/          # React 前端（已完成，Phase 4-6）
│   ├── packages/admin/    # 管理端 SPA
│   ├── packages/portal/   # 客户门户 SPA
│   └── packages/shared/   # 共享组件库
├── docs/                  # 设计规格 + 实施计划
│   └── superpowers/
│       ├── specs/         # 设计规格文档
│       └── plans/         # 分阶段实施计划
├── memory/                # 项目记忆文件
└── deploy/                # 部署配置（在 hospital-server/deploy/）
```

## 项目记忆

本项目的记忆文件存放在**项目根目录的 `memory/` 下**（不是 Claude 默认的 harness 记忆目录）。开始新会话时应先通读 `memory/*.md` 了解项目背景、架构决策、API、数据模型、已修 bug 与待办；推进工作后同步更新对应文件。

- `memory/MEMORY.md` — 索引（每条记忆一行）
- `project_overview` / `backend_architecture` / `data_models` / `api_reference` / `design_style` / `bugs_fixed` / `remaining_work`

## 技术栈

**后端:** Go 1.22 + Gin + GORM v2 + PostgreSQL 16 + Redis 7 + Casbin v3 + Asynq + MinIO
**前端:** React 18/19 + TypeScript + Vite + shadcn/ui + Tailwind CSS v4 + ECharts + TanStack Table/Query
**部署:** Docker Compose（预留 K8s 迁移）

## 开发命令

```bash
# 启动基础设施
cd hospital-server && docker compose -f deploy/docker-compose.yml up -d postgres redis minio

# 运行后端
cd hospital-server && go run ./cmd/server/

# 运行测试
cd hospital-server && go test ./pkg/auth/ -v          # 单元测试
cd hospital-server && go test ./tests/integration/ -v  # 集成测试（需要 PostgreSQL）

# 构建
cd hospital-server && go build ./cmd/server/
```

## 默认账号

- 管理员: admin / admin123
- API 基础路径: http://localhost:8080
- MinIO 控制台: http://localhost:9001 (minioadmin / minioadmin123)

## 编码规范

- 后端按层分目录: handler → service → repository → models
- handler 层按 admin/portal 分端，层内按业务域分文件
- DTO 用 pointer 字段实现 partial update
- UUID 主键，软删除，BaseModel 统一时间戳
- Casbin 管理权限，不单独建权限表
- 前端设计: 现代扁平化，Lucide 线性图标(stroke-width 1.5)，无阴影，大圆角
