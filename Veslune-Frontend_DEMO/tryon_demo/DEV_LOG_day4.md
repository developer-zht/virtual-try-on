# 开发日志 — 2026-07-03

> 全服装试穿 + 用户模特图生成 + 穿搭推荐前端对齐 + 173 项单元测试
> 版本：v2.2 · 实现语言：Python · 核心模型：qwen-image-2.0-pro / qwen-max

---

## 目录

- [1. 概述](#1-概述)
- [2. 开发进度](#2-开发进度)
- [3. 全服装试穿（Full Try-On）](#3-全服装试穿full-try-on)
- [4. 用户模特图生成（User Model）](#4-用户模特图生成user-model)
- [5. 穿搭推荐前端对齐](#5-穿搭推荐前端对齐)
- [6. Proto 协议变更](#6-proto-协议变更)
- [7. REST API 变更](#7-rest-api-变更)
- [8. 单元测试](#8-单元测试)
- [9. 测试结果](#9-测试结果)

---

## 1. 概述

### 1.1 今日目标

在 Day3 多 Provider 架构基础上，新增两大图像生成能力并对齐前端穿搭推荐契约：

| 目标 | 说明 |
|------|------|
| 全服装试穿 | 基于 qwen-image-2.0-pro 拼接图模式，支持上装+下装+鞋子+饰品的完整换衣 |
| 用户模特图生成 | 根据用户身材档案生成专属试穿模特图，支持 avatar（上传照片）和 virtual（纯文本）双模式 |
| 穿搭推荐对齐 | 推荐接口补齐 profile / weather_feel / strategy 等前端契约字段，贯穿 proto → schema → 服务 → 提示词 |
| 单元测试 | 新增 full_tryon / user_model 测试，全量 173 个通过 |

### 1.2 涉及技术栈

| 技术 | 用途 |
|------|------|
| qwen-image-2.0-pro | 多模态图像生成（全服装试穿 + 用户模特图） |
| DashScope multimodal-generation API | 图像生成端点 `multimodal-generation/generation` |
| Pillow (PIL) | 衣物图片拼接网格图（garment_compose） |
| Pydantic | REST 请求/响应 schema 扩展 |
| Protobuf | gRPC 协议消息扩展 |

### 1.3 与 Day3 的关系

Day3 完成了多 Provider 抽象层；Day4 在此基础上新增了两个基于 qwen-image-2.0-pro 的图像生成服务，并将穿搭推荐接口与前端 VestiCore 原型契约全面对齐。

---

## 2. 开发进度

| 模块 | 功能 | 状态 |
|------|------|------|
| 全服装试穿 | `models/full_tryon_model.py` — 3 种生成模式 | 完成 |
| 全服装试穿 | `services/full_tryon_generator.py` — 异步/同步封装 | 完成 |
| 全服装试穿 | `prompts/full_tryon_prompt.py` — 3 套提示词构建器 | 完成 |
| 全服装试穿 | `utils/garment_compose.py` — 衣物网格拼接工具 | 完成 |
| 全服装试穿 | REST 端点 `POST /v1/tryon/full` | 完成 |
| 用户模特图 | `services/user_model_generator.py` — avatar + virtual 双模式 | 完成 |
| 用户模特图 | `prompts/user_model_prompt.py` — 提示词 + 字段校验 | 完成 |
| 用户模特图 | `docs/USER_MODEL_DESIGN.md` — 设计文档 | 完成 |
| 穿搭推荐 | `services/outfit_recommender.py` — +203 行重构 | 完成 |
| 穿搭推荐 | `prompts/outfit_recommendation.py` — +88 行增强 | 完成 |
| Proto 协议 | `common.proto` — UserProfile + WardrobeItem 扩展 + Occasion 枚举 | 完成 |
| Proto 协议 | `outfit.proto` — RecommendOutfitRequest 新增 6 字段 | 完成 |
| gRPC 层 | `converters.py` + `servicer.py` — 对接新字段 | 完成 |
| REST 层 | `schemas.py` — GarmentItemInput 扩展 + UserProfileInput + FullTryOn schema | 完成 |
| 单元测试 | `tests/test_full_tryon.py` — 25 个用例 | 全部通过 |
| 单元测试 | `tests/test_user_model_prompt.py` + `test_user_model_generator.py` | 全部通过 |

---

## 3. 全服装试穿（Full Try-On）

### 3.1 核心问题

原有 `POST /v1/tryon` 基于 DashScope OutfitAnyone（aitryon）API，仅支持上装+下装两件换衣，无法覆盖鞋子、饰品等完整穿搭。Day4 使用 qwen-image-2.0-pro 的多模态生成能力，通过指令式图像生成实现全服装换衣。

### 3.2 三种生成模式

[full_tryon_model.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/models/full_tryon_model.py)

| 模式 | 方法 | 输入 | 适用场景 |
|------|------|------|----------|
| 纯文本 | `generate()` | 模特图 + outfit_items 描述 | 快速预览，不依赖衣物图片 |
| 参考图 | `generate_with_garment_images()` | 模特图 + 最多 2 张衣物图 | API 限制 3 张图（1 人 + 2 衣物） |
| 拼接图 | `generate_composited()` | 模特图 + 所有衣物的网格拼接图 | **推荐**，可展示全部衣物图案细节 |

**拼接图模式** 是核心创新：将所有衣物图片拼成一张带编号标签的网格图，在 API 3 图限制内让模型看到所有衣物的图案和细节。

### 3.3 衣物网格拼接工具

[garment_compose.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/utils/garment_compose.py)

```python
def compose_garment_grid(
    garment_images: list[bytes],
    garment_items: list[dict],
    cell_size: int = 512,
) -> bytes:
    """将多张衣物图拼成带编号标签的网格图"""
```

- 自动计算行列数（`ceil(sqrt(n))`）
- 每个格子含衣物图 + 编号标签（如 `[1] TOP`、`[2] BOTTOM`）
- 输出 JPEG bytes，可直接 base64 编码传入 API

### 3.4 提示词构建

[full_tryon_prompt.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/prompts/full_tryon_prompt.py)

三个构建器函数：

| 函数 | 用途 |
|------|------|
| `build_full_tryon_prompt()` | 纯文本模式，按品类分组描述衣物 |
| `build_full_tryon_with_ref_images_prompt()` | 参考图模式，引用 content 中的衣物图 |
| `build_composited_tryon_prompt()` | 拼接图模式，按编号引用网格单元 |

提示词核心约束：
- 模特必须同时穿着所有列出的单品
- 鞋子必须清晰可见在脚上
- 饰品必须可见佩戴（腰带、珠宝等）
- 全身照从头到脚，白色工作室背景

### 3.5 服务层封装

[full_tryon_generator.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/full_tryon_generator.py)

```python
class FullTryOnGenerator:
    def generate_sync(...) -> dict          # 同步生成
    def generate_async(...) -> str          # 异步（文本模式）→ task_id
    def generate_composited_async(...) -> str  # 异步（拼接图模式）→ task_id
```

异步模式通过 `threading.Thread` 后台执行，`TaskManager` 管理生命周期，返回 `task_id` 供轮询。

### 3.6 REST 端点

```python
@router.post("/v1/tryon/full", response_model=FullTryOnCreateResponse, tags=["tryon"])
def create_full_tryon(body: FullTryOnCreateRequest, container: ContainerDep):
    ...
```

请求体含 `person_image_url`、`garment_image_urls[]`、`outfit_items[]`、`preserve_face`，返回 `task_id` + `task_type="full_tryon"`。

---

## 4. 用户模特图生成（User Model）

### 4.1 功能说明

根据用户身材档案（性别、体型、身高、肤色、发型等）生成专属试穿模特图，用于后续虚拟试穿。

### 4.2 双模式设计

[user_model_generator.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/user_model_generator.py)

| 模式 | 触发条件 | 输入 | 说明 |
|------|----------|------|------|
| avatar | 提供了 `avatar_image_url` | 参考照片 + 指令提示词 | 保留用户面部特征 |
| virtual | 未提供照片 | 纯文本提示词 | 根据档案数据生成虚拟模特 |

### 4.3 提示词与校验

[user_model_prompt.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/prompts/user_model_prompt.py)

**性别差异化描述表**：

| 属性 | 男性选项 | 女性选项 |
|------|----------|----------|
| body_type | slim / standard / athletic / muscular / burly | slim / standard / athletic / curvy / petite |
| hair_style | short / medium / buzz / bald | long / medium / short / ponytail / bun |
| skin_tone | fair / light / medium / tan / dark（共用） |
| hair_color | black / brown / chestnut / dark_brown（共用） |
| age_range | 18_25 / 26_35 / 36_45 / 46_plus（共用） |

`validate_user_body()` 函数对所有字段进行白名单校验，性别不合法时提前返回。

### 4.4 配置项

[settings.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/config/settings.py) 新增：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `user_model_name` | `qwen-image-2.0-pro` | 模特图生成模型 |
| `user_model_timeout` | `120` | 超时秒数 |
| `user_model_max_retries` | `4` | 最大重试次数 |

---

## 5. 穿搭推荐前端对齐

### 5.1 改动规模

[outfit_recommender.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/outfit_recommender.py)（+203/−40 行）和 [outfit_recommendation.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/prompts/outfit_recommendation.py)（+88/−28 行）是本次改动最大的文件。

### 5.2 新增推荐维度

与前端 VestiCore 原型契约对齐，新增 6 个推荐维度：

| 字段 | 枚举值 | 说明 |
|------|--------|------|
| `weather_feel` | cool / comfortable / warm | 体感温度 |
| `strategy` | commute_appropriate / fashion_forward / comfort_first / slimming | 推荐策略 |
| `visual_style` | daily_casual / editorial / office | 视觉风格 |
| `color_tone` | earth_tone / monochrome / vivid | 色调 |
| `priority` | outerwear / tops / bottoms | 重点品类 |
| `profile` | UserProfile 消息 | 用户身材档案 |

### 5.3 服务层关键改动

**`recommend()` 方法**：新增 `profile`、`weather_feel`、`strategy`、`visual_style`、`color_tone`、`priority` 参数，全部透传至 LLM 提示词。

**`_apply_rules()` 规则引擎**：
- 新增 `weather_feel="warm"` 时过滤厚重外套（Down / Wool / Fur / Cashmere）
- 兼容 `garment_id` / `id`、`primary_color` / `primary_color_en`、`category` / `category_en` 双字段名

**`_format_profile()` 新方法**：将 UserProfile dict 格式化为提示词文本，含 body（身高、体重、肩宽、体型、尺码）和 preferences（风格、颜色偏好、裤长）。

**`_format_wardrobe()` 重写**：输出全部可用属性（name、season、silhouette、pattern），兼容双字段名。

**`_enrich_outfits()` 新方法**：回查 wardrobe 按 garment_id 补全 `display_image_url` + `category_en`，补 `status="generated"`、`occasion_en`、`feel_en`、`tags_en`，生成 UUID 作为 `id`。模型输出格式从 `items[]` 迁移到 `garment_ids[]`。

### 5.4 提示词增强

[outfit_recommendation.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/prompts/outfit_recommendation.py) System Prompt 新增：
- 用户档案适配规则（体型着装建议：slim 加层次、athletic 突出肩线、curvy 选 A 字、petite 选高腰）
- weather_feel / strategy / visual_style / color_tone / priority 维度指导
- 场合扩展：新增 home / business / travel
- 饰品规则：衣橱含 ACCESSORIES 时每套穿搭必须包含至少一件饰品
- 输出格式从 `items[]`（含 note）改为 `garment_ids[]` + `tags[]`

---

## 6. Proto 协议变更

### 6.1 common.proto

[common.proto](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/proto/veslune/ai/v1/common.proto)

**Occasion 枚举新增**：

| 枚举值 | 编号 | 说明 |
|--------|------|------|
| `OCCASION_HOME` | 6 | 居家 |
| `OCCASION_BUSINESS` | 7 | 商务 |
| `OCCASION_TRAVEL` | 8 | 旅行 |

**WardrobeItem 消息扩展**（6 个新字段）：

| 字段 | 类型 | 编号 | 说明 |
|------|------|------|------|
| `name` | string | 6 | 单品名称 |
| `display_image_url` | string | 7 | 展示图 URL |
| `cutout_url` | string | 8 | 抠图 URL |
| `season_suitability` | string | 9 | 季节适宜性 |
| `silhouette` | string | 10 | 廓形 |
| `pattern` | string | 11 | 图案 |

**新增消息**：

```protobuf
message BodyMeasurements {
  float height_cm = 1;
  float weight_kg = 2;
  float shoulder_width_cm = 3;
  string body_type = 4;  // standard / slim / athletic / curvy / petite
  string tops_size = 5;
  string bottoms_waist_size = 6;
  string shoes_size = 7;
}

message StylePreferences {
  repeated string style_tags = 1;
  repeated string color_preferences = 2;
  string pants_length = 3;  // full_length / cropped / shorts
}

message UserProfile {
  BodyMeasurements body = 1;
  StylePreferences preferences = 2;
}
```

### 6.2 outfit.proto

[outfit.proto](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/proto/veslune/ai/v1/outfit.proto)

`RecommendOutfitRequest` 新增 6 个字段：

| 字段 | 类型 | 编号 | 说明 |
|------|------|------|------|
| `profile` | UserProfile | 10 | 用户身材档案 |
| `weather_feel` | string | 11 | 体感温度 |
| `strategy` | string | 12 | 推荐策略 |
| `visual_style` | string | 13 | 视觉风格 |
| `color_tone` | string | 14 | 色调 |
| `priority` | string | 15 | 重点品类 |

### 6.3 gRPC 层适配

**converters.py**：`OCCASION_TO_STR` 映射新增 home / business / travel；`wardrobe_item_to_dict()` 扩展 6 个新字段。

**servicer.py**：`RecommendOutfit()` 方法新增 UserProfile proto → dict 转换逻辑（body_type → body_type_en、sizes 字段映射），6 个新字段透传至 `OutfitRecommender.recommend()`。

---

## 7. REST API 变更

### 7.1 新增端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/tryon/full` | 全服装试穿（异步，含鞋子饰品） |

### 7.2 Schema 变更

[schemas.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/rest/schemas.py)

**GarmentItemInput 扩展**（新增 12 个字段）：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `id` | `""` | 兼容字段 |
| `category_en` | `""` | 英文品类 |
| `primary_color_en` | `""` | 英文颜色 |
| `material_en` | `""` | 英文材质 |
| `style_tags_en` | `[]` | 英文风格标签 |
| `season_suitability_en` | `""` | 英文季节适宜性 |
| `name` | `""` | 单品名称 |
| `display_image_url` | `""` | 展示图 URL |
| `cutout_url` | `""` | 抠图 URL |
| `silhouette` | `""` | 廓形 |
| `pattern` | `""` | 图案 |

所有原有字段改为带默认值（`garment_id`、`category`、`primary_color` 不再必填）。

**新增 Schema**：

| Schema | 用途 |
|--------|------|
| `BodyMeasurementsInput` | 身材数据 |
| `StylePreferencesInput` | 风格偏好 |
| `UserProfileInput` | 用户档案（body + preferences） |
| `OutfitItem` | 全服装试穿单品 |
| `FullTryOnCreateRequest` | 全服装试穿请求 |
| `FullTryOnCreateResponse` | 全服装试穿响应 |

**OutfitRecommendRequest 扩展**：新增 `profile`、`weather_feel`、`strategy`、`visual_style`、`color_tone`、`priority` 6 个字段，全部带默认值，向后兼容。

### 7.3 容器层

[container.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/rest/container.py) 注入 `FullTryOnModel` + `FullTryOnGenerator`，复用 `image_edit_model` 配置（qwen-image-2.0-pro）。

---

## 8. 单元测试

### 8.1 新增测试文件

| 文件 | 用例数 | 覆盖内容 |
|------|--------|----------|
| `tests/test_full_tryon.py` | 25 | 提示词构建器、模型 API 调用（mock）、生成器服务、拼接工具、拼接图模式 |
| `tests/test_user_model_prompt.py` | — | 虚拟/头像提示词、字段校验、体型/发型描述表 |
| `tests/test_user_model_generator.py` | — | 异步/同步生成、API 调用（mock）、校验失败、图片提取 |

### 8.2 关键测试场景

| 场景 | 测试方法 | 说明 |
|------|----------|------|
| 提示词含全部品类 | `test_basic_prompt_contains_all_items` | 验证 top/bottoms/shoes/accessory 均出现 |
| 面部保留指令 | `test_prompt_preserve_face` | preserve_face=True 时含 "facial features" |
| API 成功调用 | `test_generate_success` | mock 返回 image_url，验证 success + elapsed_time |
| API 无图返回 | `test_generate_no_image_in_response` | 验证 "No images" 错误 |
| 参考图模式图片数 | `test_generate_with_garment_images` | 验证 content 含 3 张图（1 人 + 2 衣物） |
| 拼接图模式成功 | `test_generate_composited_success` | mock compose + API，验证 garment_count |
| 拼接图无图加载 | `test_generate_composited_no_images_loaded` | 验证 "No garment images" 错误 |
| 网格拼接输出 | `test_compose_grid_basic` | 4 张图拼接，验证输出 JPEG bytes |
| 异步任务创建 | `test_generate_async_creates_task` | 验证 task_manager.create_task 调用 |

### 8.3 测试约束

- **无真实 API 调用**：所有 qwen-image-2.0-pro 调用通过 `unittest.mock.patch` mock
- **图片处理隔离**：拼接工具测试使用 PIL 生成纯色方块，不依赖外部图片
- **快速执行**：全量 173 个用例 17 秒完成

---

## 9. 测试结果

```
============================== test session starts ==============================
platform win32 -- Python 3.12.0

collected 174 items

tests/  共 173 个测试通过 + 1 个跳过

............................s............................................. [ 41%]
........................................................................ [ 82%]
..............................                                           [100%]

============================== 173 passed, 1 skipped in 17.21s ==================
```

**173 个测试用例通过，0 失败，1 跳过。**

---

## 附录

### A. 本次修改文件清单

| 文件 | 变更类型 | 行数变化 | 说明 |
|------|----------|----------|------|
| `ai-engine/models/full_tryon_model.py` | **新增** | +340 | 全服装试穿模型（3 种模式） |
| `ai-engine/services/full_tryon_generator.py` | **新增** | +224 | 异步/同步服务封装 |
| `ai-engine/prompts/full_tryon_prompt.py` | **新增** | +204 | 3 套提示词构建器 |
| `ai-engine/utils/garment_compose.py` | **新增** | +160 | 衣物网格拼接工具 |
| `ai-engine/services/user_model_generator.py` | **新增** | +248 | 用户模特图生成服务 |
| `ai-engine/prompts/user_model_prompt.py` | **新增** | +255 | 提示词 + 字段校验 |
| `ai-engine/services/outfit_recommender.py` | **修改** | +203/−40 | 推荐维度扩展 + 输出富化 |
| `ai-engine/prompts/outfit_recommendation.py` | **修改** | +88/−28 | 提示词增强 |
| `ai-engine/rest/routes.py` | **修改** | +39 | 新增 /v1/tryon/full 端点 |
| `ai-engine/rest/schemas.py` | **修改** | +70 | Schema 扩展 |
| `ai-engine/rest/container.py` | **修改** | +13 | 注入 FullTryOn 服务 |
| `ai-engine/config/settings.py` | **修改** | +5 | user_model 配置项 |
| `ai-engine/aigrpc/converters.py` | **修改** | +9 | 枚举 + 字段映射 |
| `ai-engine/aigrpc/servicer.py` | **修改** | +30 | UserProfile 转换 + 字段透传 |
| `proto/veslune/ai/v1/common.proto` | **修改** | +32 | UserProfile + WardrobeItem 扩展 + Occasion |
| `proto/veslune/ai/v1/outfit.proto` | **修改** | +7 | RecommendOutfitRequest 新字段 |
| `ai-engine/tests/test_full_tryon.py` | **新增** | +382 | 25 个用例 |
| `ai-engine/tests/test_user_model_prompt.py` | **新增** | — | 提示词测试 |
| `ai-engine/tests/test_user_model_generator.py` | **新增** | — | 生成器测试 |
| `docs/USER_MODEL_DESIGN.md` | **新增** | — | 用户模特图设计文档 |

### B. 试穿效果对比报告

| 报告 | 路径 | 说明 |
|------|------|------|
| 试穿测试报告 | `tryon-test-report/` | 文本模式 vs 拼接图模式对比 |
| 试穿对比 | `tryon-comparison/` | qwen-image-2.0-pro 各模式效果 |
| 拼接图报告 | `tryon-composited/` | 拼接图模式详细效果分析 |

### C. 参考文档

- [DEV_LOG_day3.md](DEV_LOG_day3.md) — 多 Provider 抽象层 + 包管理改造
- [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) — 前端对接文档（HTTP API 变更）
- [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) — 后端接口对接文档（Proto 变更）
- [USER_MODEL_DESIGN.md](USER_MODEL_DESIGN.md) — 用户模特图设计文档
- [HTTP_API_REFERENCE.md](HTTP_API_REFERENCE.md) — HTTP API 完整参考

---

*文档维护：Veslune Team · 最后更新：2026-07-03*
