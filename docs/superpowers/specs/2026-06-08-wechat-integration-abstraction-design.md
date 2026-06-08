# 企业微信集成抽象层设计规格

> 日期：2026-06-08
> 目标：在**无法接入企业微信、拿不到凭证**的前提下，把企微 SSO 登录与消息推送做成「可插拔抽象层」，使周边逻辑现在就全部写完、测完。拿到凭证后只需填配置（`WECHAT_ENABLED=true` + 凭证），无需改业务代码即可上线。

## 1. 背景与目标

企微在 HIS 中承担两个**可选增强**角色，二者都已有降级路径（账号密码登录、站内信通知），因此企微缺位不阻塞系统使用，但需要把集成代码预先建好。

| 企微能力 | 降级方案 | 本设计提供 |
|---------|---------|-----------|
| SSO 登录 | 账号密码登录（已有） | 真实 OAuth 回调（完整实现）+ dev 模拟端点（开发跑通） |
| 消息推送 | 站内信（已有，独立工作） | 真实发消息（完整实现）+ Mock 落库为可见站内信 |

**已确认的关键决策：**
1. 覆盖范围：SSO + 消息推送 **两者都做**
2. 真实实现度：按官方文档**完整写出真实 API 调用代码**（未联调；用 httptest 覆盖契约）
3. Mock 推送：落库为 `type=wechat_mock` 的**可见站内信**（管理端可见「本会推什么」）
4. Dev SSO：提供 **dev 模拟回调端点**，仅 `WECHAT_ENABLED=false` 时存在，生产禁用
5. 架构：**接口 + 工厂**（方案 A），消费方只依赖小接口、不判断 enabled
6. 前端：本次顺带为管理端登录页加「企业微信登录」按钮

## 2. 架构

方案 A：接口 + 工厂。`pkg/wechat` 是纯工具包（不 import 任何 `internal/*`），通过构造时注入的微型接口完成依赖反转。工厂按 `cfg.Enabled` 返回 real 或 mock 实现，消费方（Auth / Worker）只依赖所需小接口，**不感知 mock 还是 real**。

```
                    ┌─────────────── pkg/wechat（纯包）─────────────────┐
 cmd/*/main.go  →   │  New(cfg, resolver, sink, rdb) Client             │
 (装配注入)          │    ├── realClient (real.go + token.go)  → 企微 HTTP  │
                    │    │                                    ↘ Redis(token) │
                    │    └── mockClient (mock.go)            → MockSink   │
                    │  接口: SSOClient / Messenger / Client             │
                    │  注入: UserResolver, MockSink, *redis.Client      │
                    └──────────────────────────────────────────────────┘
        ▲ SSOClient                              ▲ Messenger
 AuthService (登录)                        WechatHandler (worker)
```

### 2.1 包结构

```
pkg/wechat/
├── wechat.go        # 接口定义（SSOClient/Messenger/Client）+ 注入接口（UserResolver/MockSink）+ 工厂 New()
├── real.go          # realClient：AuthURL / CodeToUserID / SendTextCard（真实 HTTP）
├── token.go         # access_token 获取与进程内缓存（real 专用）
├── mock.go          # mockClient：CodeToUserID 报错；SendTextCard 经 MockSink 落库
└── wechat_test.go   # 单元测试（httptest 伪造企微服务）
```

### 2.2 接口定义

```go
package wechat

// 消费方依赖的能力接口（接口隔离：各取所需）
type SSOClient interface {
    AuthURL(state string) string
    CodeToUserID(ctx context.Context, code string) (wechatUserID string, err error)
}
type Messenger interface {
    SendTextCard(ctx context.Context, userIDs []uuid.UUID, title, content, url string) error
}
type Client interface {
    SSOClient
    Messenger
    Enabled() bool
}

// 由 internal 实现并注入，pkg/wechat 不反向依赖 internal
type UserResolver interface { // real 用：系统用户 UUID → wechat_userid（空值剔除）
    WechatUserIDs(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]string, error)
}
type MockSink interface {     // mock 用：把"本会推送的内容"落库为站内信
    RecordMockPush(userIDs []uuid.UUID, title, content string) error
}

// 工厂：real 用 resolver + rdb（Redis 共享 token 缓存）、忽略 sink；mock 用 sink、忽略其余
func New(cfg config.WeChatConfig, resolver UserResolver, sink MockSink, rdb *redis.Client) Client {
    if cfg.Enabled {
        return newRealClient(cfg, resolver, rdb)
    }
    return newMockClient(sink)
}
```

**设计要点：** `Messenger.SendTextCard` 入参是系统用户 UUID 而非 wechat_userid 字符串——UUID→wechat_userid 的映射是内部领域知识，封装在 real 客户端内（经 `UserResolver`）；mock 落库站内信也需要 UUID。调用方完全不做 enabled 分支。

## 3. 配置与环境变量

沿用现有中心化 `envVars` 声明 + 类型化 `Config` 子结构模式。

```go
// internal/config/config.go
type WeChatConfig struct {
    Enabled  bool
    CorpID   string
    AgentID  int
    Secret   string
    Callback string // OAuth 回调 URL
}
// 挂到 Config： WeChat WeChatConfig
```

新增 env var（加入 `envVars` 切片，默认值保证本地零配置启动 Mock 模式）：

```go
{Key: "WECHAT_ENABLED", Default: "false", Desc: "启用企业微信集成；false=mock 模式"},
{Key: "WECHAT_CORP_ID",  Default: "", Desc: "企业微信 CorpID（enabled 时必填）"},
{Key: "WECHAT_AGENT_ID", Default: "0", Desc: "应用 AgentId"},
{Key: "WECHAT_SECRET",   Default: "", Desc: "应用 Secret"},
{Key: "WECHAT_CALLBACK", Default: "", Desc: "OAuth 回调 URL"},
```

**条件必填校验：** 现有 `loadEnvVars` 只支持无条件 required。企微字段是「仅当 `Enabled=true` 时必填」，因此在 `Load()` 组装出 `Config` 后追加显式校验：若 `WeChat.Enabled` 为 true 但 `CorpID/AgentID/Secret/Callback` 任一为空，返回带清晰用法提示的 error（fail-fast）。

`.env.example` 同步追加这 5 个变量及注释。

## 4. 消息推送流程

> 现状：工单流程当前**只**入队站内信（`internal/service/ticket.go` 4 处 `EnqueueNotification`），**没有任何地方入队企微推送**，`queue/client.go` 也无 `EnqueueWechatMsg`。推送通道目前完全断开，需接上。

### 4.1 入队层（`internal/queue`）
- `WechatMsgPayload` 改为 `{UserIDs []uuid.UUID, Title, Content, URL string}`（原为 `[]string`）
- `queue/client.go` 新增 `EnqueueWechatMsg(payload *WechatMsgPayload) error`

### 4.2 触发点（`internal/service/ticket.go` 现有 4 处）
每个现在调用 `EnqueueNotification` 的位置，**并排**追加 `EnqueueWechatMsg`，使用相同的 UserIDs / 标题 / 内容。站内信与企微推送成为对等双通道。

> 说明：`BulletinService.Publish` 当前**未入队任何通知**（既无站内信也无推送，不持有 asynq 客户端）。为公告增加通知需先解析 scope（region/province）→ 目标用户列表，属于独立功能，**不在本次企微抽象层范围**。本次只在已有站内信入队的 ticket 流程并排接通推送；待公告通知功能落地时，沿用本抽象层同样并排追加一行 `EnqueueWechatMsg` 即可。

### 4.3 Worker handler（`internal/worker/notification.go`）
`HandleSendWechatMsg` 从自由函数改为 `WechatHandler` 方法，持有 `wechat.Messenger`：

```go
type WechatHandler struct { messenger wechat.Messenger }

func (h *WechatHandler) HandleSendWechatMsg(ctx context.Context, t *asynq.Task) error {
    var p queue.WechatMsgPayload
    if err := json.Unmarshal(t.Payload(), &p); err != nil { return err }
    return h.messenger.SendTextCard(ctx, p.UserIDs, p.Title, p.Content, p.URL)
}
```
- enabled=true：real 经 `UserResolver` 解析 UUID→wechat_userid（剔除空值）→ POST 企微发消息 API
- enabled=false：mock 经 `MockSink` 落库为 `type=wechat_mock` 站内信

### 4.4 装配（`cmd/worker/main.go` + `cmd/server/main.go`）
构造 `wechat.New(cfg.WeChat, userResolver, mockSink, rdb)`。`UserResolver` 由 user repository 实现，`MockSink` 由 notification service 实现（薄适配，复用 `SendNotification`，type 传 `wechat_mock`）。`rdb` 复用现有 Redis 客户端，供 real 客户端共享 token 缓存（见 §6.1）；mock 模式传入但不使用。

## 5. SSO 登录流程

SSO 面向**内部员工**（`wechat_userid` 匹配系统用户），仅作用于**管理端**；客户门户保持账号密码。

### 5.1 真实 OAuth 流程
```
GET  /api/auth/wechat/url?state=xxx   → 返回 client.AuthURL(state)
                                        前端跳转 → 企微授权 → 重定向回 Callback?code=&state=
POST /api/auth/wechat/callback        body:{code,state} → 登录
```
回调 `AuthService.LoginByWechatCode(ctx, code)`：
1. `wechatUserID := ssoClient.CodeToUserID(ctx, code)`
2. 按 `wechat_userid` 查 `status=1` 用户；查不到 → 「该企业微信未绑定系统账号」
3. 签发 JWT、更新 `last_login_at`，返回与密码登录一致的 `LoginResp`

### 5.2 共享后半段（关键重构）
```go
LoginByWechatCode(ctx, code)        // code → wechatUserID（调 ssoClient）→ 调下方
LoginByWechatUserID(ctx, wxUserID)  // 匹配用户 + 发 token（真实回调与 dev 端点共用）
```
保证 dev 端点与真实回调走**同一套匹配 + 发 token 逻辑**，仅差「code 换 userid」一步。

### 5.3 Dev 模拟端点（生产禁用）
```
POST /api/auth/wechat/dev-login   body:{wechat_userid} → 直接 LoginByWechatUserID
```
**生产禁用方式：条件注册**——仅当 `cfg.WeChat.Enabled == false` 时注册此路由；enabled=true 时该路由不存在。

### 5.4 DTO / Handler / 路由
- DTO（`internal/dto`）：新增 `WechatCallbackReq{Code, State string}`、`WechatDevLoginReq{WechatUserID string}`；复用 `LoginResp`
- 管理端 `AuthHandler` 增加 `WechatURL` / `WechatCallback` / `WechatDevLogin` 方法（持有 `wechat.SSOClient` 以调 `AuthURL` 与判 `Enabled`）
- 路由在 `/api/auth` 公开组注册；`dev-login` 条件注册

### 5.5 前端（管理端）
登录页加「企业微信登录」按钮：点击调 `/api/auth/wechat/url` 取地址并跳转；新增回调接收页处理 `?code=&state=` 并调 `/wechat/callback`，成功后写入 auth store。开发期可用 dev-login 直接登录验证。

## 6. 真实企微 API 实现细节

### 6.1 access_token 缓存（`token.go`，Redis 共享）
- `GET https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=&corpsecret=` → `{access_token, expires_in}`（约 7200s）
- **为什么用 Redis 共享而非进程内：** server（SSO）与 worker（推送）两个进程都要用 token；企微同一应用重复调 `gettoken` 会使上一个 token 失效。两个进程各自进程内缓存 = 各自独立刷新，会互相顶掉对方的 token 造成抖动（42001）。企微官方亦建议中控统一获取。项目本就强依赖 Redis（`REDIS_URL` 必填），故共享缓存几乎零额外成本。
- **实现：** token 与过期时间存 Redis key `wechat:access_token`（带 TTL，提前 60s 视为过期）。刷新时用 `SETNX` 短锁（如 `wechat:token:lock`，TTL 数秒）保证同一时刻只有一个进程在调 `gettoken`，单飞（single-flight）；未抢到锁的进程短暂退避后重读缓存。
- 仅 real 模式使用；mock 模式不取 token。

### 6.2 API 调用（`real.go`）
| 能力 | 企微 API |
|------|---------|
| AuthURL | `https://open.weixin.qq.com/connect/oauth2/authorize?appid=CorpID&redirect_uri=<urlencode Callback>&response_type=code&scope=snsapi_base&state=&agentid=#wechat_redirect` |
| CodeToUserID | `GET /cgi-bin/auth/getuserinfo?access_token=&code=` → `userid` |
| SendTextCard | `POST /cgi-bin/message/send?access_token=` body `{touser:"id1\|id2", msgtype:"textcard", agentid, textcard:{title,description,url,btntxt:"详情"}}`，touser 上限 1000 |

### 6.3 统一响应处理
企微响应均带 `errcode/errmsg`，`errcode==0` 为成功；非 0 包装 error 返回。`42001`（token 过期）→ 失效缓存 + 重试一次。

## 7. 错误处理

- 真实客户端：网络错误 / `errcode!=0` → 包装 error；Worker 依赖 Asynq 既有重试；42001 内联重试一次
- SSO 回调：`CodeToUserID` 失败或用户未绑定 → 401 通用提示，不泄漏细节
- Mock：尽力而为，`MockSink` 落库失败仅打日志，不阻断
- 配置：`enabled=true` 缺凭证 → 启动 fail-fast

## 8. 测试策略

- **`pkg/wechat` 单元测试**（`httptest` 伪造企微服务，无需凭证）：
  - `AuthURL` 拼接与 URL 转义
  - token 缓存（命中 / 过期刷新 / SETNX 单飞）——用 `miniredis` 内存 Redis，无需真实 Redis
  - `SendTextCard` / `CodeToUserID` 请求构造 + `errcode` 处理 + 42001 重试
  - mock：`SendTextCard` 调 MockSink；`CodeToUserID` 返回「mock 模式不可用」
- **集成测试**（`tests/integration`）：
  - dev-login：seed 带 `wechat_userid` 用户 → POST `/dev-login` → 断言返回 token + user
  - wechat_mock 站内信：直接调 `WechatHandler.HandleSendWechatMsg`（mock 模式）→ 断言生成 `type=wechat_mock` 站内信
- **诚实标注**：真实企微 API 无凭证无法联调；单测以 httptest 覆盖请求/响应契约，真实连通性待凭证到位验证。

## 9. 影响文件清单

**新增**
- `pkg/wechat/{wechat,real,token,mock,wechat_test}.go`

**修改**
- `internal/config/config.go`（WeChatConfig + 5 env var + 条件校验）、`.env.example`
- `internal/queue/{tasks,client}.go`（WechatMsgPayload 改型 + EnqueueWechatMsg）
- `internal/service/ticket.go`（4 处并排入队推送）
- `internal/service/auth.go`（LoginByWechatCode / LoginByWechatUserID）
- `internal/service/notification.go`（实现 MockSink 适配）
- `internal/repository/user*.go`（实现 UserResolver）
- `internal/worker/notification.go`（WechatHandler 方法化）、`internal/worker/tasks.go`
- `internal/dto`（WechatCallbackReq / WechatDevLoginReq）
- `internal/handler/admin/auth.go`、路由注册文件
- `cmd/server/main.go`、`cmd/worker/main.go`（装配 wechat.New + 注入 Redis 客户端 + 条件注册 dev-login）
- `pkg/wechat/token.go`：token 缓存依赖 Redis（`redis.Client` 注入，key `wechat:access_token` + SETNX 单飞锁）
- 前端管理端：登录页按钮 + 回调接收页 + shared api

## 10. 非目标（YAGNI）

- 不实现客户门户的企微登录（客户用账号密码）
- 不做企微通讯录同步 / 部门导入
- 不做除 textcard 外的消息类型
