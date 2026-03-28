---
name: Design Style Preferences
description: 前端视觉风格偏好 — 现代扁平化，柔和暗色(非纯黑)，Lucide线性图标，双主题
type: feedback
---

用户要求现代扁平化设计，拒绝老旧风格和花哨彩色。

**Why:** 用户明确拒绝了纯黑(#09090b)暗色模式("太黑了")、emoji图标("太老套")、以及纯黑白配色("不够清爽，缺少色彩层次")。

**How to apply:**

### 暗黑模式（Soft Dark）
- 背景: #121218（柔和深蓝灰，非纯黑）
- 卡片: #1a1a24（带微蓝）
- 边框: rgba(148,163,184,0.08)（半透明，柔和）
- 文字: #e2e8f0 / #94a3b8 / #64748b（三级灰度）
- 强调色: #818cf8 (indigo-400)

### 日间模式（Clean Light）
- 背景: #f8fafc（微灰白，不刺眼）
- 卡片: #ffffff
- 边框: #e2e8f0
- 文字: #0f172a / #64748b / #94a3b8
- 强调色: #6366f1 (indigo-500)

### 设计原则
- 零阴影: 用 1px border 代替 box-shadow
- 大圆角: 卡片 12px, 按钮 8px, 状态徽章 99px (pill)
- 图标: Lucide React, stroke-width 1.5, 纯线条无填充
- 选中态用品牌色，未选中用 muted 灰
- 状态色: 待处理(indigo) / 处理中(orange) / 已完结(emerald) / 已挂起(amber) / 已关闭(slate)
- 主题切换: 暗黑/日间/跟随系统，Tailwind class 策略 + CSS Variables
