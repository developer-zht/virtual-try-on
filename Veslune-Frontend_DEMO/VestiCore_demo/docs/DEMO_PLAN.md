# Veslune Demo 技术方案

> **穿搭智能推荐助手** — 2.5 周 Demo 实施计划  
> 版本：v1.0 · 日期：2026-06-21 · 团队：4 人 · 状态：草案

---

## 目录

- [1. 项目背景](#1-项目背景)
- [2. Demo 目标](#2-demo-目标)
- [3. 核心演示路径](#3-核心演示路径)
- [4. 功能范围](#4-功能范围)
- [5. AI 能力方案](#5-ai-能力方案)
- [6. 技术架构](#6-技术架构)
- [7. 数据模型](#7-数据模型)
- [8. API 设计](#8-api-设计)
- [9. 推荐引擎（简化版）](#9-推荐引擎简化版)
- [10. 团队分工](#10-团队分工)
- [11. 排期计划](#11-排期计划)
- [12. Demo 脚本](#12-demo-脚本)
- [13. 质量保障与降级策略](#13-质量保障与降级策略)
- [14. 风险与应对](#14-风险与应对)
- [15. 版本路线图（Demo 之后）](#15-版本路线图demo-之后)

---

## 1. 项目背景

**Veslune（穿搭智能推荐助手）** 旨在解决用户每日「今天穿什么」的决策问题。与天气 App、时尚媒体、电商推荐不同，Veslune 的核心价值是：

> **用衣柜里已有的衣服，结合天气与场合，给出可执行的穿搭建议。**

完整产品愿景包含「风格灵感 → 衣柜匹配 → 虚拟试穿 → 穿搭决策」闭环。但 Demo 阶段资源有限（**2.5 周 · 4 人**），需聚焦最小可行演示，**AI 品类识别是 Demo 的核心亮点，不可妥协**。

### 与 PRD 原 MVP 的差异

| 维度 | PRD 原 MVP | Demo 方案 |
|------|-----------|-----------|
| 工期 | 12 周 | **2.5 周** |
| 团队 | 7 人 | **4 人** |
| AI 识别 | 第三方 API + 抠图 | **大模型（Qwen-VL）品类 + 颜色识别** |
| 登录 | 手机号 + 微信 | 邮箱 / Demo 账号 |
| 推荐套数 | 1–3 套 | **1 套**（有时间可加第 2 套） |
| 架构 | 微服务 + MQ | **单体 + 异步 Goroutine** |

---

## 2. Demo 目标

### 2.1 要证明什么

Demo 需要向观众证明：

1. **AI 能看懂衣服** — 拍照上传后，大模型自动识别品类和颜色
2. **系统能用已有衣物做决策** — 不是推荐购买，而是从数字衣橱里搭配
3. **场景感知** — 结合实时天气和场合生成穿搭方案

### 2.2 不追求什么

- 生产级稳定性、完整用户体系、数据埋点
- 风格拆解、虚拟试穿等差异化功能
- 完美的 UI 打磨和全平台适配

---

## 3. 核心演示路径

```
用户登录
  → 拍照/上传衣物
  → 大模型识别品类 + 颜色（2–5 秒）
  → 用户确认/修正识别结果
  → 衣物入库（数字衣橱）
  → 首页展示天气 + 选择场合
  → 系统从衣橱生成 1 套穿搭推荐 + Tips
  → 查看穿搭详情
```

**Demo 时长约 3 分钟**，AI 识别环节是全场高光。

---

## 4. 功能范围

### 4.1 必须实现（Must Have）

| 模块 | 功能 | 说明 |
|------|------|------|
| **登录** | 邮箱 + 密码 / Demo 固定账号 | 不做微信、短信验证码 |
| **衣物上传** | 拍照 / 相册选图 | Expo Camera / ImagePicker |
| **AI 识别** | 大模型品类 + 主色识别 | Qwen-VL-Plus，异步任务 + 轮询 |
| **识别确认** | 展示结果，支持手动修正 | 低置信度时必须可编辑 |
| **数字衣橱** | 网格列表 + 品类 Tab（6 类） | 原图展示，不做抠图 |
| **天气** | 当前城市实时天气 | 和风天气 API，默认北京 |
| **穿搭推荐** | 场合选择 → 生成 1 套方案 | 简化规则引擎 |
| **穿搭详情** | 单品清单 + 搭配理由 + Tips | 2 条预设 Tips |
| **保存穿搭** | 可选，保存最近一次 | 不做完整日历 |

### 4.2 明确砍掉（Won't Have）

| 功能 | 原 PRD 优先级 | 砍掉理由 |
|------|--------------|----------|
| 风格拆解 F3 | P1 | 开发量大，与 Demo 主线无关 |
| 风格匹配 F4 | P1 | 依赖向量检索，2.5 周无法完成 |
| 虚拟试穿 F5 | P1 | 需 GPU + 扩散模型，单独 2–4 周 |
| 自定义替换 F6 | P1 | 交互复杂，口播「后续支持」即可 |
| 背景抠图 | MVP | 大模型不负责抠图，原图展示 |
| 材质 / 品牌 / 风格标签 | 暂缓 | 需额外 LLM 调用 |
| 微信 / 短信登录 | MVP | OAuth + 企业资质，至少 3–5 天 |
| 分享图生成 | MVP | 截图即可 |
| 推送通知 | 依赖 | 前端轮询任务状态 |
| 埋点 / 数据看板 | MVP | Demo 不需要 |
| 生产 CI/CD / 监控 | MVP | Docker 本地或单台测试服 |
| 穿搭日历 / 历史统计 | P2 | 不做 |
| 3 套推荐滑动 | MVP | 先 1 套 |
| 微服务 / API Gateway | 架构 | 单体足够 |
| 向量数据库 | V2.0 | 不需要 |

### 4.3 页面清单（5 页）

| # | 页面 | 核心元素 |
|---|------|----------|
| 1 | 登录页 | 邮箱 + 密码 |
| 2 | 首页 | 天气卡片 + 场合选择 + 推荐卡片 |
| 3 | 数字衣橱 | 品类 Tab + 网格列表 + 添加按钮 |
| 4 | 衣物上传 | 拍照/选图 + AI 识别 Loading + 结果确认 |
| 5 | 穿搭详情 | 单品清单 + 理由 + Tips + 保存 |

---

## 5. AI 能力方案

### 5.1 模型选型

| 方案 | 模型 | 推荐度 | 说明 |
|------|------|--------|------|
| **首选** | 通义千问 **Qwen-VL-Plus**（阿里云 DashScope） | ⭐⭐⭐⭐⭐ | 国内低延迟、Vision 成熟、按量计费 |
| 备选 1 | GLM-4V（智谱 AI） | ⭐⭐⭐⭐ | 国内多模态 |
| 备选 2 | 豆包 Vision（火山引擎） | ⭐⭐⭐⭐ | 国内、成本较低 |
| 备选 3 | GPT-4o | ⭐⭐⭐ | 识别准确，国内需考虑网络 |

**Demo 采用 DashScope Qwen-VL-Plus**：

- 开通快，有免费额度
- 单次识别约 2–4 秒
- 支持图片 URL / Base64
- 中文 Prompt 效果好

### 5.2 识别范围

| 字段 | 枚举值 | 说明 |
|------|--------|------|
| `category` | 上衣 / 裤装 / 裙装 / 外套 / 鞋履 / 配饰 / 无法识别 | 6 大类 + 兜底 |
| `primary_color` | 黑 / 白 / 灰 / 红 / 蓝 / 绿 / 黄 / 紫 / 粉 / 棕 / 卡其 / 牛仔蓝 | 12 色 |
| `confidence` | 0.0 – 1.0 | 低于 0.7 提示用户确认 |
| `reason` | 字符串 | 判断依据，用于 Debug 和 Demo 展示 |

### 5.3 Prompt 模板

```
你是专业的服装识别助手。请分析图片中的主要衣物单品。

只返回 JSON，不要其他文字：
{
  "category": "上衣|裤装|裙装|外套|鞋履|配饰|无法识别",
  "primary_color": "黑|白|灰|红|蓝|绿|黄|紫|粉|棕|卡其|牛仔蓝",
  "confidence": 0.0-1.0,
  "reason": "一句话说明判断依据"
}

规则：
- 若图片中有多件衣物，识别最突出的一件
- 若无法判断，category 填"无法识别"，confidence 填 0
- confidence < 0.7 时应在 reason 中说明不确定原因
```

### 5.4 识别流程

```
客户端上传图片
  → 后端存储原图（MinIO / 本地）
  → 创建 ai_task（status: pending）
  → 返回 task_id
  → 异步 Goroutine 调用 Qwen-VL API
  → 解析 JSON，校验枚举值
  → 更新 ai_task（status: done / failed）
  → 客户端轮询 GET /garments/tasks/:id
  → 展示识别结果，用户确认/修正
  → POST /garments 保存入库
```

### 5.5 准确率目标

| 指标 | Demo 目标 | 评估方法 |
|------|-----------|----------|
| 品类 Top-1 准确率 | **≥ 85%** | 30 张测试图人工标注对比 |
| 颜色准确率 | **≥ 80%** | 同上 |
| 识别响应时间 | **< 5 秒（P95）** | 接口日志 |
| API 可用率 | **≥ 95%** | 降级策略保障 |

### 5.6 后端 AI 模块结构

```
internal/ai/
├── client.go       # DashScope HTTP 客户端
├── recognize.go    # 识别逻辑 + Prompt 管理
├── parser.go       # JSON 解析 + 枚举校验
└── fallback.go     # 超时/失败降级
```

---

## 6. 技术架构

### 6.1 架构图

```
┌─────────────────────────────────────────────────┐
│                   客户端                         │
│            Expo (React Native)                   │
│     iOS / Android / 手机浏览器                    │
└────────────────────┬────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────┐
│              Veslune-Backend                     │
│              Go + Gin（单体）                     │
│  ┌─────────┬──────────┬──────────┬────────────┐ │
│  │  auth   │ wardrobe │ recommend│  weather   │ │
│  └─────────┴──────────┴──────────┴────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │              internal/ai                     │ │
│  │         Qwen-VL 调用 + 异步任务               │ │
│  └─────────────────────────────────────────────┘ │
└──────┬──────────────┬──────────────┬─────────────┘
       │              │              │
  ┌────▼────┐   ┌─────▼─────┐  ┌────▼──────────┐
  │PostgreSQL│   │   Redis   │  │ MinIO / 本地  │
  │ 业务数据  │   │ 天气缓存   │  │   图片存储    │
  └──────────┘   └───────────┘  └───────────────┘
       │
  ┌────▼────────────┐    ┌──────────────────┐
  │  和风天气 API    │    │ DashScope API    │
  │  实时天气数据    │    │ Qwen-VL-Plus     │
  └─────────────────┘    └──────────────────┘
```

### 6.2 技术选型

| 层 | 选型 | 说明 |
|----|------|------|
| 前端 | **Expo + React Native** | 跨平台，相机/相册 SDK 成熟 |
| 后端 | **Go 1.22+ / Gin** | 高性能，直接 HTTP 调 DashScope |
| ORM | **GORM** 或 **sqlc** | 快速开发 |
| 数据库 | **PostgreSQL 16** | Docker 一键启动 |
| 缓存 | **Redis 7** | 天气数据缓存（30 分钟 TTL） |
| 对象存储 | **MinIO**（开发）/ 本地目录 | 零配置 |
| 大模型 | **Qwen-VL-Plus** | DashScope API |
| 天气 | **和风天气** | 国内低延迟 |
| 部署 | **Docker Compose** | 本地联调 + Demo 演示 |

### 6.3 项目目录结构

```
veslune-backend/
├── cmd/
│   └── api/main.go              # HTTP 入口
├── internal/
│   ├── auth/                    # 认证模块
│   ├── user/                    # 用户模块
│   ├── wardrobe/                # 衣橱模块
│   ├── outfit/                  # 穿搭方案模块
│   ├── recommend/               # 推荐引擎
│   ├── weather/                 # 天气聚合
│   ├── media/                   # 图片上传
│   ├── ai/                      # 大模型识别
│   └── task/                    # 异步任务管理
├── pkg/                         # 公共库
│   ├── jwt/
│   ├── response/
│   └── errors/
├── migrations/                  # 数据库迁移
├── docker-compose.yml
├── Dockerfile
└── docs/
    └── DEMO_PLAN.md             # 本文档
```

---

## 7. 数据模型

### 7.1 核心表

```sql
-- 用户
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    nickname    VARCHAR(100),
    avatar_url  TEXT,
    city_code   VARCHAR(20) DEFAULT '101010100',  -- 默认北京
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 衣物
CREATE TABLE garments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    image_url       TEXT NOT NULL,
    category        VARCHAR(20) NOT NULL,  -- 上衣/裤装/裙装/外套/鞋履/配饰
    primary_color   VARCHAR(20) NOT NULL,
    ai_confidence   FLOAT,
    ai_reason       TEXT,
    is_manually_edited BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- AI 识别任务
CREATE TABLE ai_tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    image_url   TEXT NOT NULL,
    status      VARCHAR(20) DEFAULT 'pending',  -- pending/processing/done/failed
    result      JSONB,
    error_msg   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 穿搭方案
CREATE TABLE outfits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    occasion        VARCHAR(20) NOT NULL,  -- commute/casual/date
    weather         JSONB,
    garment_ids     UUID[] NOT NULL,
    reason          TEXT,
    tips            TEXT[],
    is_saved        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 索引

```sql
CREATE INDEX idx_garments_user_category ON garments(user_id, category);
CREATE INDEX idx_ai_tasks_user_status ON ai_tasks(user_id, status);
CREATE INDEX idx_outfits_user_created ON outfits(user_id, created_at DESC);
```

---

## 8. API 设计

### 8.1 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 邮箱注册 |
| POST | `/api/v1/auth/login` | 登录，返回 JWT |
| GET | `/api/v1/auth/me` | 当前用户信息 |

### 8.2 衣物 / AI 识别

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/garments/upload` | 上传图片，返回 `task_id` |
| GET | `/api/v1/garments/tasks/:id` | 轮询 AI 识别结果 |
| POST | `/api/v1/garments` | 确认识别结果并保存 |
| GET | `/api/v1/garments` | 衣橱列表（支持 `?category=` 筛选） |
| GET | `/api/v1/garments/:id` | 单品详情 |
| PUT | `/api/v1/garments/:id` | 编辑属性 |
| DELETE | `/api/v1/garments/:id` | 删除 |
| GET | `/api/v1/garments/stats` | 衣柜统计（总数/分类数） |

### 8.3 天气与推荐

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/weather` | 当前天气（`?city_code=` 或 `?lat=&lng=`） |
| POST | `/api/v1/recommend/outfits` | 生成穿搭推荐 |
| GET | `/api/v1/outfits/:id` | 穿搭详情 |
| POST | `/api/v1/outfits/:id/save` | 保存穿搭 |

### 8.4 关键接口示例

**上传图片**

```http
POST /api/v1/garments/upload
Content-Type: multipart/form-data

Response 200:
{
  "task_id": "uuid",
  "status": "pending"
}
```

**轮询识别结果**

```http
GET /api/v1/garments/tasks/:id

Response 200 (进行中):
{
  "task_id": "uuid",
  "status": "processing"
}

Response 200 (完成):
{
  "task_id": "uuid",
  "status": "done",
  "result": {
    "category": "上衣",
    "primary_color": "白",
    "confidence": 0.92,
    "reason": "图片主体为一件白色衬衫，领型和对襟设计明确"
  }
}
```

**保存衣物（用户确认后）**

```http
POST /api/v1/garments
Content-Type: application/json

{
  "task_id": "uuid",
  "category": "上衣",
  "primary_color": "白"
}

Response 201:
{
  "id": "uuid",
  "image_url": "https://...",
  "category": "上衣",
  "primary_color": "白",
  "ai_confidence": 0.92,
  "is_manually_edited": false
}
```

**生成推荐**

```http
POST /api/v1/recommend/outfits
Content-Type: application/json

{
  "occasion": "commute"
}

Response 200:
{
  "outfit": {
    "id": "uuid",
    "garments": [
      { "id": "...", "category": "上衣", "primary_color": "白", "image_url": "..." },
      { "id": "...", "category": "裤装", "primary_color": "黑", "image_url": "..." },
      { "id": "...", "category": "鞋履", "primary_color": "棕", "image_url": "..." }
    ],
    "reason": "今日北京 22°C 晴，通勤场合建议清爽干练风格",
    "tips": [
      "可将衬衫塞进裤腰，提升整体利落感",
      "建议搭配简约手表或皮带作为点缀"
    ]
  },
  "weather": {
    "temp": 22,
    "condition": "晴",
    "humidity": 45
  }
}
```

---

## 9. 推荐引擎（简化版）

Demo 阶段使用**规则引擎**，不做 ML 模型。

### 9.1 输入

- 实时天气（温度、天气状况）
- 用户选择的场合（通勤 / 休闲 / 约会）
- 用户数字衣橱中的所有衣物

### 9.2 规则逻辑

```
Step 1: 前置检查
  → 衣柜 < 5 件 → 返回错误，引导上传

Step 2: 温度 → 厚度过滤
  → < 10°C  → 需要外套
  → 10–25°C → 可选薄外套
  → > 25°C  → 不需要外套

Step 3: 场合 → 品类约束
  → 通勤 → 禁运动类，优先正式款
  → 休闲 → 无限制
  → 约会 → 禁运动类，优先裙装/半裙

Step 4: 组合生成
  → 上衣 + 下装 + 鞋履（必须）
  → + 外套（按温度，可选）
  → 颜色不冲突（同色系 / 邻近色 / 中性色搭配）

Step 5: 输出
  → 1 套方案 + 2 条 Tips（从预设模板按场合抽取）
```

### 9.3 场合-品类映射

| 场合 | 推荐上装 | 推荐下装 | 推荐鞋履 |
|------|----------|----------|----------|
| 通勤 | 衬衫、针织衫、Blazer | 西裤、直筒裤 | 皮鞋、乐福鞋 |
| 休闲 | T 恤、卫衣、Polo | 牛仔裤、休闲裤 | 运动鞋、板鞋 |
| 约会 | 连衣裙、Blouse、半袖 | 半裙、阔腿裤 | 高跟鞋、短靴 |

### 9.4 Tips 模板（预设 10 条，按场合匹配）

```
通勤:
- "可将衬衫塞进裤腰，提升整体利落感"
- "建议搭配简约手表或皮带作为点缀"
- "选择同色系包袋，避免颜色过于跳跃"

休闲:
- "卷起袖口，增加随意感"
- "搭配棒球帽或帆布包，强化休闲氛围"

约会:
- "选择一处配饰作为视觉焦点，不宜过多"
- "适当露肤（手腕/锁骨）可增加精致感"
```

---

## 10. 团队分工

**4 人配置：1 AI/后端 + 1 后端 + 1 前端 + 1 产品/设计**

| 角色 | 人数 | 核心职责 |
|------|------|----------|
| **AI / 后端** | 1 | DashScope 对接、Prompt 调优、识别准确率测试、异步任务模块 |
| **后端** | 1 | 用户/衣橱/推荐/天气 API、图片上传、DB Schema、Docker |
| **前端** | 1 | Expo 五页 UI、拍照上传、识别 Loading/确认页、首页推荐流、联调 |
| **产品 / 设计** | 1 | UI 稿、Demo 脚本、30 张测试图标注、预置演示数据、彩排 |

### 关键协作节点

| 节点 | 时间 | 参与人 | 产出 |
|------|------|--------|------|
| AI 原型验证 | Day 2 | AI/后端 + 产品 | 单脚本识别 10 张图，准确率 > 80% |
| 前后端联调 v1 | Day 5 | 全员 | 上传 → 识别 → 保存 全流程跑通 |
| 推荐联调 | Day 9 | 后端 + 前端 + 产品 | 首页推荐完整展示 |
| Demo 彩排 | Day 11 | 全员 | 3 分钟 Demo 脚本完整走通 |

---

## 11. 排期计划

**总工期：12 个工作日（2.5 周）**

### 阶段一：基础 + AI 验证（Day 1–4）

| 天 | AI/后端 | 后端 | 前端 | 产品 |
|----|---------|------|------|------|
| D1 | DashScope 账号、单脚本识别验证 | Go 脚手架、DB Schema、Docker Compose | Expo 脚手架、登录页 | UI 稿、准备 30 张测试图 |
| D2 | Prompt v1、10 张图测试 | 用户注册/登录 API、JWT | 登录联调 | 标注测试集 ground truth |
| D3 | 上传接口 + 异步 LLM 调用 | 图片存储（MinIO） | 拍照/选图页面 | — |
| D4 | task 轮询接口、枚举校验 | 衣物 CRUD 接口 | 识别 Loading + 轮询 | **AI 准确率评估** |

> **里程碑 M1（Day 4）**：上传一张图 → Qwen-VL 返回品类 JSON → 前端展示结果

### 阶段二：衣橱 + 推荐（Day 5–10）

| 天 | AI/后端 | 后端 | 前端 | 产品 |
|----|---------|------|------|------|
| D5 | Prompt 调优（目标 85%） | 衣橱列表/筛选/统计 API | 识别确认页（可编辑） | 准确率报告 |
| D6 | 识别超时降级逻辑 | 和风天气 API + Redis 缓存 | 衣橱网格 + 品类 Tab | 预置 10 件演示衣物 |
| D7 | — | 推荐规则引擎 v1 | 首页天气卡片 | — |
| D8 | — | 推荐 API + Tips 模板 | 场合选择 + 推荐卡片 | — |
| D9 | — | 穿搭详情/保存 API | 穿搭详情页 | — |
| D10 | Bug 修复 | 接口联调优化 | UI 打磨 | Demo 脚本 v1 |

> **里程碑 M2（Day 10）**：完整路径跑通（登录 → 上传 → 识别 → 推荐 → 详情）

### 阶段三：Demo 准备（Day 11–12）

| 天 | 全员 |
|----|------|
| D11 | Bug 修复、识别边界 case 处理、Demo 彩排（路径 A + 路径 B） |
| D12 | 最终彩排、准备演示设备、备份方案确认 |

> **里程碑 M3（Day 12）**：Demo Ready

---

## 12. Demo 脚本

### 12.1 理想路径（3 分钟）

| 步骤 | 时间 | 动作 | 话术 |
|------|------|------|------|
| 1. 开场 | 15s | 展示 App 首页 | 「每天出门前，你是否也在想：今天穿什么？Veslune 用 AI 帮你从已有衣柜里找到最佳答案。」 |
| 2. AI 识别 | 60s | 拍一件上衣 → 等待识别 → 展示结果 | 「只需拍一张照片，AI 大模型自动识别品类和颜色。看，它识别这是一件白色上衣，置信度 92%。」 |
| 3. 数字衣橱 | 20s | 展示已有 8–10 件衣物 | 「所有衣物数字化管理，按品类分类，就是你的专属数字衣橱。」 |
| 4. 穿搭推荐 | 60s | 展示天气 → 选「通勤」→ 生成推荐 | 「结合今日 22°C 晴天和通勤场合，AI 从你的衣柜里搭配出一套：白衬衫 + 黑西裤 + 乐福鞋。」 |
| 5. 收尾 | 15s | 展示 Tips | 「后续我们还会上线风格模仿和虚拟试穿。Veslune — 让每天的穿搭决策，从 15 分钟变成 15 秒。」 |

### 12.2 保底路径（网络/API 异常时）

1. 跳过上传，直接展示**预置衣橱**（10 件已识别好的衣物）
2. 口播：「刚才已演示过 AI 识别，现在直接看推荐效果」
3. 继续演示天气 + 场合 + 推荐

---

## 13. 质量保障与降级策略

### 13.1 AI 识别降级

| 场景 | 触发条件 | 处理方式 |
|------|----------|----------|
| API 超时 | 响应 > 8 秒 | 返回 `status: failed`，前端提示「识别超时，请手动选择品类」 |
| 低置信度 | confidence < 0.7 | 前端高亮品类字段，提示「请确认识别结果」 |
| 无法识别 | category = 无法识别 | 直接进入手动选择，不阻塞流程 |
| API 不可用 | 连续 3 次失败 | 全局降级为手动标注模式，Banner 提示 |
| 网络异常 | 请求失败 | 切换保底路径（预置衣橱） |

### 13.2 推荐引擎降级

| 场景 | 处理方式 |
|------|----------|
| 衣柜 < 5 件 | 返回提示「请先添加至少 5 件衣物」 |
| 无合法组合 | 返回提示「当前衣物无法组合，请添加更多品类」 |
| 天气 API 不可用 | 使用 Redis 缓存 / 默认 20°C 晴 |

### 13.3 测试集要求

产品需在 **Day 4 前** 准备：

- 30 张标注测试图（每品类 5 张）
- 标注字段：category、primary_color
- 覆盖：纯色背景 / 复杂背景 / 多件重叠 / 折叠状态

---

## 14. 风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| AI 识别准确率不达标 | 中 | 高 | Day 2–5 集中调 Prompt；确认页必须支持手动修正；准备保底 Demo 路径 |
| DashScope API 不稳定 | 低 | 高 | 超时降级 + 手动选择；备选 GLM-4V 接口预留 |
| 2.5 周工期不够 | 中 | 高 | 严格砍功能；Day 4 / Day 10 里程碑卡点；每日站会 |
| 前端 Expo 相机兼容性 | 中 | 中 | Day 3 先在 2 台设备验证；备选相册选图 |
| 推荐结果不合理 | 中 | 中 | 预置衣橱确保有可配组合；Tips 用模板保底 |
| 团队成员技能不匹配 | 低 | 高 | Go 后端优先；前端可换 H5 方案 |

---

## 15. 版本路线图（Demo 之后）

| 版本 | 时间 | 核心功能 |
|------|------|----------|
| **Demo** | 2.5 周 | AI 识别 + 衣橱 + 天气推荐（本文档范围） |
| **V1.0 MVP** | +8 周 | 3 套推荐、自定义替换、手机/微信登录、抠图、AI Tips |
| **V1.5** | +4 周 | 穿搭日历、个人风格管理、分享 |
| **V2.0** | +4 月 | 风格拆解 + 衣柜匹配、虚拟试穿 V1 |
| **V2.5** | +3 月 | 虚拟试穿优化、社区、个性化模型 |

---

## 附录

### A. 环境变量

```env
# 数据库
DATABASE_URL=postgres://veslune:veslune@localhost:5432/veslune?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# DashScope (Qwen-VL)
DASHSCOPE_API_KEY=sk-xxx

# 和风天气
QWEATHER_API_KEY=xxx

# 对象存储
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=veslune
```

### B. Docker Compose 服务

```yaml
services:
  postgres:   # PostgreSQL 16
  redis:      # Redis 7
  minio:      # MinIO 对象存储
  api:        # Veslune-Backend
```

### C. 参考文档

- [Veslune PRD（完整版）](../Veslune.html) — 产品需求文档原文
- [阿里云 DashScope 文档](https://help.aliyun.com/zh/dashscope/)
- [和风天气 API](https://dev.qweather.com/docs/api/)
- [Expo 文档](https://docs.expo.dev/)

---

*文档维护：Veslune Team · 最后更新：2026-06-21*
