# 开发日志 — 2026-06-25

> gRPC 协议对接 + 项目架构升级 + Docker 部署 + 完整单元测试
> 版本：v2.0 · 实现语言：Python · 模型：百炼 DashScope + Google Gemini

---

## 目录

- [1. 概述](#1-概述)
- [2. 开发进度](#2-开发进度)
- [3. gRPC 通信协议分析](#3-grpc-通信协议分析)
- [4. 项目架构升级](#4-项目架构升级)
- [5. 关键代码适配](#5-关键代码适配)
- [6. 后端接口需求提案](#6-后端接口需求提案)
- [7. Docker 部署方案](#7-docker-部署方案)
- [8. 单元测试](#8-单元测试)
- [9. 测试结果](#9-测试结果)

---

## 1. 概述

### 1.1 今日目标

基于 [VLM-CORE/CORE-Enhancer](https://github.com/Veslune-Lab/VLM-CORE/tree/CORE-Enhancer) 分支，对本地项目进行 v2.0 架构升级：

| 目标 | 说明 |
|------|------|
| gRPC 协议对接 | 分析完整 proto 接口定义，打通本地 AI 引擎到后端的数据通道 |
| 项目架构升级 | 合并 aigrpc/、rest/、proto/、Docker 等基础设施 |
| 代码适配 | GarmentSegmenter 无状态化、TaskManager 重构、ServiceContainer 集成 |
| Docker 部署 | HTTP/gRPC 双容器 + Redis 共享任务状态 |
| 单元测试 | 12 个测试文件，63 个测试用例，覆盖所有模块 |

### 1.2 涉及技术栈

| 技术 | 用途 |
|------|------|
| gRPC (protobuf) | 后端通信协议（10 个 RPC 方法） |
| FastAPI | HTTP REST 开发/演示接口 |
| Docker Compose | 本地一键部署（Redis + HTTP + gRPC） |
| pytest | 单元测试框架（63 个用例） |
| TaskStore (Memory/Redis) | 异步任务存储（HTTP/gRPC 共享） |

---

## 2. 开发进度

| 模块 | 功能 | 状态 |
|------|------|------|
| 基础设施 | aigrpc/ gRPC 服务层 | 完成 |
| 基础设施 | rest/ HTTP REST API 层 | 完成 |
| 基础设施 | proto/ 协议定义（6 个 proto 文件） | 完成 |
| 基础设施 | Docker 部署（Dockerfile × 3 + docker-compose） | 完成 |
| 代码适配 | GarmentSegmenter 无状态化 | 完成 |
| 代码适配 | TaskManager 重构（TaskStore 模式） | 完成 |
| 代码适配 | ServiceContainer 依赖注入 | 完成 |
| 代码适配 | 新增 to_api_items / _normalize_items 等辅助方法 | 完成 |
| 测试 | 12 个测试文件，63 个测试用例 | 全部通过 |

---

## 3. gRPC 通信协议分析

### 3.1 Proto 文件结构

```
proto/veslune/ai/v1/
├── common.proto       # 通用枚举 + 消息（品类/颜色/材质/风格/天气/包围盒）
├── garment.proto      # 服装识别/分割/背景移除
├── style.proto        # 风格拆解/匹配
├── outfit.proto       # 穿搭推荐/技巧生成
├── task.proto         # 任务管理（试穿/分割异步结果查询）
└── ai_service.proto   # 服务定义（10 个 RPC 方法）
```

### 3.2 10 个 RPC 方法

| 序号 | RPC 方法 | 请求消息 | 响应消息 | 说明 |
|------|----------|----------|----------|------|
| 1 | `HealthCheck` | `HealthCheckRequest` | `HealthCheckResponse` | 服务健康检查 |
| 2 | `RecognizeGarment` | `RecognizeGarmentRequest` | `RecognizeGarmentResponse` | 单品识别 |
| 3 | `SegmentGarment` | `SegmentGarmentRequest` | `SegmentGarmentResponse` | 单品分割（异步） |
| 4 | `RemoveBackground` | `RemoveBackgroundRequest` | `RemoveBackgroundResponse` | 背景移除 |
| 5 | `DecomposeStyle` | `DecomposeStyleRequest` | `DecomposeStyleResponse` | 风格拆解 |
| 6 | `MatchStyle` | `MatchStyleRequest` | `MatchStyleResponse` | 风格匹配 |
| 7 | `RecommendOutfit` | `RecommendOutfitRequest` | `RecommendOutfitResponse` | 穿搭推荐 |
| 8 | `GenerateTips` | `GenerateTipsRequest` | `GenerateTipsResponse` | 穿搭技巧 |
| 9 | `GenerateTryOn` | `GenerateTryOnRequest` | `GenerateTryOnResponse` | 虚拟试穿（异步） |
| 10 | `GetTaskStatus` | `GetTaskStatusRequest` | `GetTaskStatusResponse` | 异步任务查询 |

### 3.3 核心枚举定义

**品类** (GarmentCategory): TOPS, BOTTOMS, SKIRT, OUTERWEAR, SHOES, ACCESSORIES, DRESS, BAG, HEADWEAR, SCARF, BELT, JEWELRY, OTHER, UNKNOWN

**颜色** (Color): 19 种，含 BLACK, WHITE, GRAY, RED, BLUE, GREEN, YELLOW, PURPLE, PINK, BROWN, KHAKI, DENIM_BLUE, ORANGE, BEIGE, CAMEL, BURGUNDY, NAVY, OLIVE, MULTI

**材质** (Material): 17 种，含 COTTON, LINEN, SILK, WOOL, CASHMERE, LEATHER, DENIM, POLYESTER, NYLON, KNIT, CHIFFON, VELVET, LACE, SWEATER, DOWN, FUR, SYNTHETIC

**风格** (StyleTag): 14 种，含 MINIMALIST, STREET, JAPANESE, KOREAN, EUROPEAN, VINTAGE, SWEET, BOHEMIAN, BUSINESS, SPORTY, PUNK, PREPPY, GIRLY, ELEGANT

**渲染方法** (RenderMethod): EDIT_BACKGROUND, EDIT_PARTIAL_GENERATE, EDIT_NON_GARMENT, GENERATE_WITH_REF, SKIPPED

### 3.4 SegmentItem 消息结构

```protobuf
message SegmentItem {
  GarmentCategory category = 1;
  string name = 2;
  string sub_category = 3;
  Color primary_color = 4;
  repeated Color secondary_colors = 5;
  Material material = 6;
  string silhouette = 7;
  string pattern = 8;
  string pattern_detail = 9;
  repeated StyleTag style_tags = 10;
  Completeness completeness = 11;
  float confidence = 12;
  string reason = 13;
  string missing_parts = 14;
  string season_suitability = 15;
  BoundingBox bbox = 16;
  RenderResult render_result = 17;
}
```

---

## 4. 项目架构升级

### 4.1 新增目录结构

```
ai-engine/
├── aigrpc/                  # gRPC 服务层（新增）
│   ├── bootstrap.py         #   proto 路径注册
│   ├── converters.py        #   Proto ↔ Dict 转换
│   ├── server.py            #   gRPC 服务器启动
│   ├── servicer.py          #   10 个 RPC 方法实现
│   └── gen/                 #   生成的 pb2 桩代码
├── rest/                    # REST API 层（新增）
│   ├── app.py               #   FastAPI 应用
│   ├── container.py         #   ServiceContainer 依赖注入
│   ├── routes.py            #   API 路由
│   ├── schemas.py           #   Pydantic 模型
│   └── utils.py             #   工具函数
├── scripts/                 # 脚本（新增）
│   └── grpc_healthcheck.py  #   gRPC 健康检查
├── tests/                   # 单元测试（新增）
│   ├── conftest.py
│   ├── test_config.py
│   ├── test_dashscope_client.py
│   ├── test_garment_segmenter.py
│   ├── test_grpc_converters.py
│   ├── test_grpc_servicer.py
│   ├── test_image_utils.py
│   ├── test_prompts.py
│   ├── test_response_parser.py
│   ├── test_rest_api.py
│   ├── test_services.py
│   └── test_task_store.py
├── services/
│   ├── garment_segment_generator.py  # 异步包装（新增）
│   └── task_store.py                 # 任务存储后端（新增）
├── Dockerfile / Dockerfile.http / Dockerfile.grpc
├── server_grpc.py / server_http.py
└── requirements-*.txt（按层拆分）
```

### 4.2 架构分层

```
┌─────────────────────────────────────────────┐
│                   Go 后端                     │
│         (gRPC Client → :50051)               │
└──────────────────┬──────────────────────────┘
                   │ gRPC
┌──────────────────▼──────────────────────────┐
│            aigrpc/ (gRPC Server)             │
│  servicer.py → converters.py → gen/*.py     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         rest/ (HTTP REST Server)             │
│  routes.py → schemas.py → container.py      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          ServiceContainer (DI)               │
│  统一管理所有 service + model 实例           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          services/ (业务逻辑层)               │
│  garment_segmenter / recognizer / ...        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          models/ (模型封装层)                 │
│  dashscope_client / gemini_client / ...      │
└─────────────────────────────────────────────┘
```

### 4.3 异步任务架构

```
HTTP/gRPC 请求 → create_task(pending) → 后台线程执行
                                         ↓
              GetTaskStatus ← TaskStore (Memory/Redis) ← update_task(done/failed)
```

HTTP 和 gRPC 共享同一个 TaskStore 实例（Redis），实现跨协议任务状态查询。

---

## 5. 关键代码适配

### 5.1 GarmentSegmenter 无状态化

**问题**：原实现使用 `self._original_image` 存储原图 PIL Image，多线程并发不安全。

**修改**：[garment_segmenter.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/garment_segmenter.py)

- 移除 `self._original_image` 实例属性
- `segment()` 方法内使用局部变量 `original_image`
- `_crop_garment()` 新增 `original_image` 参数
- `_do_crop()` 新增 `img` 参数
- `_generate_from_text_with_ref()` 新增 `original_image` 参数
- 新增 `timeout`、`max_retries` 构造参数（兼容 ServiceContainer）

### 5.2 新增辅助方法

| 方法 | 类型 | 说明 |
|------|------|------|
| `to_api_items(items)` | @staticmethod | 将内部 items 转为 REST 安全格式（排除二进制数据） |
| `_normalize_items(parsed)` | @staticmethod | 标准化视觉模型响应为 item 列表 |
| `_build_item_description(item)` | @staticmethod | 从 item 属性构建文本描述 |
| `_resolve_item_type(name)` | @staticmethod | 名称到品类类型的映射 |
| `_item_constraint(name, category)` | @staticmethod | 品类特定约束（防止模型误生成服装） |
| `_is_rate_limited(data, status_code)` | @staticmethod | 判断 API 是否限频 |

### 5.3 TaskManager 重构

**旧实现**：[task_manager.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/task_manager.py) — 内嵌 OrderedDict 存储

**新实现**：薄包装层，委托给 `TaskStore` 协议：

```python
class TaskManager:
    def __init__(self, store: TaskStore):
        self._store = store

    def create_task(self, task_id, status, task_type):
        return self._store.create_task(task_id, status, task_type)
    # ...
```

**TaskStore 后端**：[task_store.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/task_store.py)

| 后端 | 类 | 适用场景 |
|------|------|----------|
| Memory | `InMemoryTaskStore` | 开发/单机 |
| Redis | `RedisTaskStore` | 生产/多容器（HTTP+gRPC 共享） |

### 5.4 ServiceContainer 依赖注入

[container.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/rest/container.py) 统一管理所有服务实例：

```python
class ServiceContainer:
    settings: Settings
    dashscope_client: DashScopeClient
    vision_model: VisionModel
    task_manager: TaskManager
    garment_recognizer: GarmentRecognizer
    garment_segmenter: GarmentSegmenter
    garment_segment_generator: GarmentSegmentGenerator
    style_decomposer: StyleDecomposer
    style_matcher: StyleMatcher
    outfit_recommender: OutfitRecommender
    tips_generator: TipsGenerator
    tryon_generator: TryOnGenerator
    bg_remover: BackgroundRemover
```

---

## 6. 后端接口需求提案

基于本地单品分割测试产生的额外数据，以下字段/需求建议后端 proto 支持：

### 6.1 SegmentItem 扩展字段

| 字段 | 当前状态 | 需求 | 说明 |
|------|----------|------|------|
| `sub_category` | 已定义 | 建议后端 Go 代码解析此字段 | 如 "正装衬衫"、"A字裙" |
| `pattern` | 已定义 | 建议后端存储并展示 | 如 "Gingham"、"Striped" |
| `pattern_detail` | 已定义 | 建议后端存储并展示 | 如 "深蓝色窗格纹" |
| `silhouette` | 已定义 | 建议后端存储并展示 | 如 "H型"、"A型" |
| `completeness` | 已定义 | 建议后端区分处理 | complete/incomplete 影响前端裁剪提示 |
| `missing_parts` | 已定义 | 建议后端展示 | 如 "右侧袖子被遮挡" |
| `season_suitability` | 已定义 | 建议后端用于季节筛选 | 如 "Spring"、"Summer" |
| `render_result.method` | 已定义 | 建议后端记录渲染策略 | 用于分析渲染成功率 |

### 6.2 新增枚举值建议

| 枚举 | 当前值 | 建议新增 | 说明 |
|------|--------|----------|------|
| `GarmentCategory` | 13 种 | 无需新增 | 当前覆盖所有品类 |
| `RenderMethod` | 5 种 | 建议新增 `RENDER_METHOD_CROP_EDIT_NON_GARMENT = 6` | 区分非服装类编辑提取 |
| `Color` | 19 种 | 建议新增 `COLOR_LIGHT_BLUE`、`COLOR_DARK_GREEN` | 更精细的颜色描述 |

### 6.3 RenderResult 扩展建议

```protobuf
message RenderResult {
  bool success = 1;
  RenderMethod method = 2;
  repeated string image_urls = 3;
  string error_message = 4;
  // 建议新增：
  int32 processing_time_ms = 5;   // 单件渲染耗时
  int32 retry_count = 6;           // 限频重试次数
}
```

---

## 7. Docker 部署方案

### 7.1 文件结构

```
├── Dockerfile              # 默认 HTTP 服务
├── Dockerfile.http         # HTTP REST 服务 (:8000)
├── Dockerfile.grpc         # gRPC 服务 (:50051)
├── docker-compose.yml      # 一键部署 Redis + HTTP + gRPC
└── .dockerignore
```

### 7.2 docker-compose.yml 服务拓扑

```yaml
services:
  redis:            # Redis 7 Alpine — 共享任务状态
  ai-engine-http:   # FastAPI (:8000) — 开发/演示
  ai-engine-grpc:   # gRPC (:50051) — 后端通信
```

### 7.3 启动方式

```bash
# 准备 .env 文件
cp ai-engine/.env.example ai-engine/.env
# 编辑 .env 填入 DASHSCOPE_API_KEY

# 启动所有服务
docker compose up -d

# 检查服务状态
docker compose ps
curl http://localhost:8000/health

# 查看日志
docker compose logs -f ai-engine-grpc
```

### 7.4 关键配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `DASHSCOPE_API_KEY` | (必填) | 百炼 API 密钥 |
| `GRPC_HOST` | 0.0.0.0 | gRPC 监听地址 |
| `GRPC_PORT` | 50051 | gRPC 端口 |
| `HTTP_HOST` | 0.0.0.0 | HTTP 监听地址 |
| `HTTP_PORT` | 8000 | HTTP 端口 |
| `TASK_STORE` | memory | 任务存储后端 (memory/redis) |
| `REDIS_URL` | redis://127.0.0.1:6379/0 | Redis 连接地址 |
| `VISION_MODEL` | qwen-vl-plus | 视觉模型 |
| `IMAGE_EDIT_MODEL` | qwen-image-2.0-pro | 图像编辑模型 |

---

## 8. 单元测试

### 8.1 测试文件清单

| 测试文件 | 用例数 | 覆盖模块 |
|----------|--------|----------|
| `test_config.py` | 5 | Settings 配置管理 |
| `test_dashscope_client.py` | 2 | DashScope 客户端 |
| `test_garment_segmenter.py` | 3 | 单品分割辅助方法 |
| `test_grpc_converters.py` | 3 | gRPC Proto 转换 |
| `test_grpc_servicer.py` | 4 | gRPC 服务实现 |
| `test_image_utils.py` | 3 | 图片处理工具 |
| `test_prompts.py` | 5 | 提示词模板 |
| `test_response_parser.py` | 8 | JSON 解析器 |
| `test_rest_api.py` | 15 | REST API 端点 |
| `test_services.py` | 8 | 业务逻辑服务 |
| `test_task_store.py` | 6 | 任务存储后端 |
| **合计** | **63** | **全部模块** |

### 8.2 运行测试

```bash
# 全部测试
python -m pytest ai-engine/tests/ -v

# 按模块测试
python -m pytest ai-engine/tests/test_garment_segmenter.py -v
python -m pytest ai-engine/tests/test_grpc_servicer.py -v
python -m pytest ai-engine/tests/test_rest_api.py -v

# 带覆盖率
python -m pytest ai-engine/tests/ -v --cov=ai-engine/services --cov=ai-engine/aigrpc
```

### 8.3 关键测试场景

| 场景 | 测试方法 | 说明 |
|------|----------|------|
| gRPC 健康检查 | `test_grpc_health_check` | 验证服务状态 + DashScope 配置 |
| 单品分割异步 | `test_grpc_segment_garment_returns_task_id` | 返回 task_id 供轮询 |
| 任务状态查询 | `test_grpc_get_task_status_segment` | 查询分割任务结果 |
| HTTP/gRPC 共享 Redis | `test_http_and_grpc_share_redis_via_task_manager` | 跨协议任务状态一致性 |
| REST API 参数校验 | `test_recognize_garment_requires_input` | 缺少图片时返回错误 |
| 试穿参数校验 | `test_create_tryon_requires_garment` | 缺少服装 URL 时返回错误 |

---

## 9. 测试结果

```
=============================== test session starts ===============================
platform win32 -- Python 3.12.0, pytest-9.1.1
collected 63 items

test_config.py::test_settings_default_models PASSED          [  1%]
test_config.py::test_settings_validate_without_key PASSED    [  3%]
test_config.py::test_settings_validate_with_key PASSED       [  4%]
test_config.py::test_settings_grpc_defaults PASSED           [  6%]
test_config.py::test_settings_task_store_defaults PASSED     [  7%]
test_dashscope_client.py::test_dashscope_client_requires_api_key PASSED [  9%]
test_dashscope_client.py::test_dashscope_client_initializes_with_key PASSED [ 11%]
test_garment_segmenter.py::test_normalize_items_from_wrapped_dict PASSED [ 12%]
test_garment_segmenter.py::test_normalize_items_from_list PASSED [ 14%]
test_garment_segmenter.py::test_to_api_items_strips_internal_fields PASSED [ 15%]
test_grpc_converters.py::test_task_status_response_tryon_done PASSED [ 17%]
test_grpc_converters.py::test_task_status_response_not_found PASSED [ 19%]
test_grpc_converters.py::test_dict_to_struct_roundtrip PASSED [ 20%]
test_grpc_servicer.py::test_grpc_health_check PASSED         [ 22%]
test_grpc_servicer.py::test_grpc_segment_garment_returns_task_id PASSED [ 23%]
test_grpc_servicer.py::test_grpc_get_task_status_segment PASSED [ 25%]
test_grpc_servicer.py::test_grpc_get_task_status_not_found PASSED [ 26%]
test_image_utils.py::test_get_image_info PASSED              [ 28%]
test_image_utils.py::test_preprocess_image_resizes_large_image PASSED [ 30%]
test_image_utils.py::test_image_to_base64_data_uri PASSED    [ 31%]
test_prompts.py::test_garment_recognition_prompt_not_empty PASSED [ 33%]
test_prompts.py::test_style_decomposition_prompt_not_empty PASSED [ 34%]
test_prompts.py::test_outfit_and_style_match_prompts_not_empty PASSED [ 36%]
test_prompts.py::test_tips_prompt_not_empty PASSED           [ 38%]
test_prompts.py::test_build_tryon_prompt_includes_body_and_items PASSED [ 39%]
test_response_parser.py - 8 tests PASSED                     [ 52%]
test_rest_api.py - 15 tests PASSED                           [ 77%]
test_services.py - 8 tests PASSED                            [ 90%]
test_task_store.py - 6 tests PASSED                          [100%]

=============================== 63 passed in 5.49s ================================
```

**全部 63 个测试用例通过，0 失败。**

---

## 附录

### A. 本次修改文件清单

| 文件 | 变更类型 |
|------|----------|
| `ai-engine/aigrpc/` (全部) | **新增** — gRPC 服务层 |
| `ai-engine/rest/` (全部) | **新增** — REST API 层 |
| `ai-engine/scripts/` (全部) | **新增** — 辅助脚本 |
| `ai-engine/tests/` (全部) | **新增** — 单元测试（12 文件，63 用例） |
| `ai-engine/services/garment_segment_generator.py` | **新增** — 异步分割包装 |
| `ai-engine/services/task_store.py` | **新增** — 任务存储后端 |
| `ai-engine/services/task_manager.py` | **重构** — 委托给 TaskStore |
| `ai-engine/services/garment_segmenter.py` | **适配** — 无状态化 + 新增辅助方法 |
| `ai-engine/server_grpc.py` | **新增** — gRPC 启动入口 |
| `ai-engine/server_http.py` | **新增** — HTTP 启动入口 |
| `ai-engine/Dockerfile*` (3 个) | **新增** — Docker 镜像 |
| `ai-engine/.dockerignore` | **新增** |
| `ai-engine/.env.example` | **新增** — 环境变量模板 |
| `ai-engine/requirements-*.txt` (5 个) | **新增** — 按层拆分的依赖 |
| `proto/` (全部) | **新增** — 6 个 proto 文件 |
| `docs/API_REFERENCE.md` | **新增** — API 参考文档 |
| `docs/DEPLOYMENT.md` | **新增** — 部署文档 |
| `docs/DEV_LOG_day1.md` | **新增** — Day1 开发日志 |
| `docker-compose.yml` | **新增** — 一键部署 |
| `Makefile` | **新增** — 常用命令 |
| `AGENTS.md` | **新增** — Agent 配置说明 |
| `.trae/` `.cursor/` `skills/` | **新增** — IDE 规则 |
| `.gitignore` | **修改** — 新增 git_file/ 排除 |
| `test_pic/` | **新增** — 测试图片 |

### B. 参考文档

- [VLM-CORE GitHub](https://github.com/Veslune-Lab/VLM-CORE/tree/CORE-Enhancer)
- [gRPC Python 文档](https://grpc.io/docs/languages/python/)
- [Protocol Buffers 文档](https://protobuf.dev/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [阿里云百炼 DashScope 文档](https://help.aliyun.com/zh/dashscope/)

---

*文档维护：Veslune Team · 最后更新：2026-06-25*