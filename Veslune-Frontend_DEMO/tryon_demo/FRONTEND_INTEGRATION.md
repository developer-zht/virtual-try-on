# 前端对接文档 — 2026-07-03 变更

> 面向：前端开发
> 对齐：VestiCore 前端接口声明（Interface Declaration · 改）· 2026-07-02 评审结论
> 约定：**请求字段一律英文枚举**；响应同时返回中文展示字段
> AI Engine Base URL：`http://localhost:8080`（Swagger：`/docs`）

---

## 目录

- [1. 变更概览](#1-变更概览)
- [2. 新增接口：全服装试穿](#2-新增接口全服装试穿)
- [3. 变更接口：穿搭推荐](#3-变更接口穿搭推荐)
- [4. 数据结构变更](#4-数据结构变更)
- [5. 异步任务轮询](#5-异步任务轮询)
- [6. 前端对接检查清单](#6-前端对接检查清单)

---

## 1. 变更概览

| 类型 | 接口 | 说明 |
|------|------|------|
| **新增** | `POST /v1/tryon/full` | 全服装试穿（上装+下装+鞋子+饰品，异步） |
| **变更** | `POST /v1/outfits/recommend` | 新增 profile / weather_feel / strategy 等字段 |
| **变更** | `GET /v1/tasks/{task_id}` | 支持 `task_type="full_tryon"` |
| **不变** | `POST /v1/tryon` | 原有 aitryon 接口保持不变 |

> **向后兼容**：穿搭推荐的新增字段全部带默认值，旧请求无需修改即可正常工作。

---

## 2. 新增接口：全服装试穿

### 2.1 POST /v1/tryon/full

使用 qwen-image-2.0-pro 拼接图模式，支持上装+下装+鞋子+饰品的完整换衣。所有衣物图片会拼接成网格图传给模型，确保图案细节不丢失。

**请求** `application/json`：

```json
{
  "person_image_url": "https://example.com/model.jpg",
  "garment_image_urls": [
    "https://example.com/shirt.png",
    "https://example.com/pants.png",
    "https://example.com/shoes.png",
    "https://example.com/belt.png"
  ],
  "outfit_items": [
    { "category": "TOPS", "name": "白色衬衫", "primary_color": "White", "material": "Cotton" },
    { "category": "BOTTOMS", "name": "黑色牛仔裤", "primary_color": "Black", "material": "Denim" },
    { "category": "SHOES", "name": "棕色皮鞋", "primary_color": "Brown", "material": "Leather" },
    { "category": "ACCESSORIES", "name": "黑色皮带", "primary_color": "Black", "material": "Leather" }
  ],
  "preserve_face": true
}
```

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `person_image_url` | string | 是 | — | 模特照片 URL |
| `garment_image_urls` | string[] | 是 | — | 所有衣物图片 URL（与 outfit_items 等长） |
| `outfit_items` | OutfitItem[] | 是 | — | 衣物信息列表（与 garment_image_urls 等长） |
| `preserve_face` | bool | 否 | true | 是否保留模特面部特征 |

**OutfitItem 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | string | 是 | 品类：TOPS / BOTTOMS / OUTERWEAR / SHOES / ACCESSORIES / HEADWEAR / JEWELRY / BAG / DRESS / SKIRT |
| `name` | string | 否 | 单品名称 |
| `primary_color` | string | 否 | 主色 |
| `material` | string | 否 | 材质 |

**校验规则**：
- `garment_image_urls` 不能为空（否则 400）
- `garment_image_urls` 与 `outfit_items` 长度必须一致（否则 400）

**响应** `200`：

```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "task_type": "full_tryon"
}
```

**cURL 示例**：

```bash
curl -X POST http://localhost:8080/v1/tryon/full \
  -H "Content-Type: application/json" \
  -d '{
    "person_image_url": "https://example.com/model.jpg",
    "garment_image_urls": ["https://example.com/shirt.png"],
    "outfit_items": [{"category": "TOPS", "name": "shirt", "primary_color": "White"}]
  }'
```

### 2.2 与原有 /v1/tryon 的区别

| 维度 | POST /v1/tryon | POST /v1/tryon/full |
|------|----------------|---------------------|
| 底层 API | DashScope OutfitAnyone (aitryon) | qwen-image-2.0-pro 多模态生成 |
| 支持品类 | 仅上装 + 下装 | 上装 + 下装 + 鞋子 + 饰品 + 全部 |
| 输入 | top_garment_url + bottom_garment_url | garment_image_urls[] + outfit_items[] |
| 图片传递 | 衣物原图 URL | 衣物拼接网格图（base64） |
| task_type | `"tryon"` | `"full_tryon"` |
| 耗时 | ~45s | ~30-60s |

---

## 3. 变更接口：穿搭推荐

### 3.1 POST /v1/outfits/recommend — 新增字段

**新增请求字段**（全部可选，向后兼容）：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `profile` | UserProfileInput | 空对象 | 用户身材档案 |
| `weather_feel` | string | `"comfortable"` | 体感温度 |
| `strategy` | string | `"commute_appropriate"` | 推荐策略 |
| `visual_style` | string | `"daily_casual"` | 视觉风格 |
| `color_tone` | string | `"earth_tone"` | 色调 |
| `priority` | string | `"tops"` | 重点品类 |

**枚举值表**：

| 字段 | 可选值 |
|------|--------|
| `weather_feel` | `cool` / `comfortable` / `warm` |
| `strategy` | `commute_appropriate` / `fashion_forward` / `comfort_first` / `slimming` |
| `visual_style` | `daily_casual` / `editorial` / `office` |
| `color_tone` | `earth_tone` / `monochrome` / `vivid` |
| `priority` | `outerwear` / `tops` / `bottoms` |
| `occasion` | `commute` / `casual` / `date` / `sport` / `formal` / `home` / `business` / `travel` |

> `occasion` 新增 `home` / `business` / `travel` 三个值。

### 3.2 完整请求示例

```json
{
  "user_id": "demo-user",
  "weather": {
    "temperature": 22,
    "condition": "Sunny",
    "humidity": 50,
    "wind_speed": 0,
    "uv_index": 3,
    "season": "spring"
  },
  "occasion": "commute",
  "profile": {
    "body": {
      "height_cm": 170,
      "weight_kg": 65,
      "shoulder_width_cm": 44,
      "body_type_en": "standard",
      "sizes": {
        "tops_cn": "M",
        "bottoms_waist_cn": "32",
        "shoes_cn": "42"
      }
    },
    "preferences": {
      "style_tags_en": ["minimalist"],
      "color_preferences_en": ["Black", "White"],
      "pants_length_en": "full_length"
    }
  },
  "weather_feel": "comfortable",
  "strategy": "commute_appropriate",
  "visual_style": "daily_casual",
  "color_tone": "earth_tone",
  "priority": "tops",
  "wardrobe": [
    {
      "garment_id": "g1",
      "category": "TOPS",
      "category_en": "TOPS",
      "primary_color": "白色",
      "primary_color_en": "White",
      "material": "棉",
      "material_en": "Cotton",
      "style_tags": ["minimalist"],
      "style_tags_en": ["minimalist"],
      "name": "白色衬衫",
      "display_image_url": "https://example.com/shirt.jpg",
      "season_suitability": "all_season",
      "silhouette": "slim_fit",
      "pattern": "solid"
    }
  ],
  "user_preferences": ["Minimalist"],
  "max_outfits": 3,
  "avoid_garment_ids": [],
  "avoid_colors": [],
  "avoid_categories": []
}
```

### 3.3 响应格式变更

**输出结构变化**：每套穿搭从 `items[]`（含 note 字段）改为 `garment_ids[]` + `garments[]` + `tags[]`，并新增 `status`、`occasion_en`、`feel_en` 字段。

```json
{
  "success": true,
  "outfits": [
    {
      "id": "uuid-1",
      "status": "generated",
      "occasion_en": "commute",
      "feel_en": "comfortable",
      "garment_ids": ["g1", "g2", "g3"],
      "garments": [
        {
          "id": "g1",
          "category_en": "TOPS",
          "display_image_url": "https://example.com/shirt.jpg"
        },
        {
          "id": "g2",
          "category_en": "BOTTOMS",
          "display_image_url": "https://example.com/pants.jpg"
        },
        {
          "id": "g3",
          "category_en": "SHOES",
          "display_image_url": "https://example.com/shoes.jpg"
        }
      ],
      "tags_en": ["commute", "daily_casual"],
      "tips": ["Tuck shirt into waistband for sharper look"],
      "reason": "22C comfortable day, commute occasion...",
      "score": 0.92
    }
  ],
  "processing_time_ms": 3456
}
```

**关键字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | UUID，前端可直接作为 outfit_id 使用 |
| `status` | string | 固定 `"generated"`（与前端契约一致） |
| `garment_ids` | string[] | 衣物 ID 列表（替代原 `items[].garment_id`） |
| `garments` | object[] | 回查 wardrobe 补全的 `display_image_url` + `category_en` |
| `tags_en` | string[] | 推荐标签（如 `["commute", "daily_casual"]`） |

---

## 4. 数据结构变更

### 4.1 GarmentItemInput 扩展

wardrobe 中的单品支持以下新增字段（全部可选，向后兼容）：

| 新增字段 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| `id` | string | `""` | 兼容 garment_id 的别名 |
| `category_en` | string | `""` | 英文品类 |
| `primary_color_en` | string | `""` | 英文颜色 |
| `material_en` | string | `""` | 英文材质 |
| `style_tags_en` | string[] | `[]` | 英文风格标签 |
| `season_suitability_en` | string | `""` | 英文季节适宜性 |
| `name` | string | `""` | 单品名称 |
| `display_image_url` | string | `""` | 展示图 URL |
| `cutout_url` | string | `""` | 抠图 URL |
| `silhouette` | string | `""` | 廓形 |
| `pattern` | string | `""` | 图案 |

> **双字段名兼容**：AI Engine 同时支持中文字段（`category`/`primary_color`/`material`/`style_tags`）和英文字段（`category_en`/`primary_color_en`/`material_en`/`style_tags_en`），优先使用英文字段。

### 4.2 UserProfileInput

```json
{
  "body": {
    "height_cm": 170,
    "weight_kg": 65,
    "shoulder_width_cm": 44,
    "body_type_en": "standard",
    "body_type": "标准",
    "sizes": {
      "tops_cn": "M",
      "bottoms_waist_cn": "32",
      "shoes_cn": "42"
    }
  },
  "preferences": {
    "style_tags_en": ["minimalist"],
    "style_tags": ["简约"],
    "color_preferences_en": ["Black", "White"],
    "color_preferences": ["黑色", "白色"],
    "pants_length_en": "full_length",
    "pants_length": "长裤"
  }
}
```

> 与前端 `GET /users/me/profile` 响应结构一致，前端可直接透传。

---

## 5. 异步任务轮询

### 5.1 GET /v1/tasks/{task_id}

全服装试穿返回 `task_id` 后，轮询此接口获取结果。

**响应**（full_tryon 完成时）：

```json
{
  "task_id": "a1b2c3d4-...",
  "task_type": "full_tryon",
  "status": "done",
  "result": {
    "success": true,
    "result_image_url": "https://dashscope-result.example.com/output.jpg",
    "processing_time_ms": 35000,
    "task_type": "full_tryon",
    "mode": "composited",
    "garment_count": 4
  },
  "created_at": 1783058400.0
}
```

**status 枚举**：

| 值 | 说明 |
|------|------|
| `pending` | 等待处理 |
| `processing` | 处理中 |
| `done` | 已完成 |
| `failed` | 失败 |
| `not_found` | 任务不存在（超过 24 小时） |

### 5.2 前端轮询代码

```javascript
async function pollFullTryon(taskId, interval = 3000, maxRetries = 100) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`/v1/tasks/${taskId}`);
    const data = await res.json();
    if (data.status === 'done') {
      return data.result.result_image_url;
    }
    if (data.status === 'failed') {
      throw new Error(data.result?.error_message || 'Try-on failed');
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Try-on timed out');
}
```

---

## 6. 前端对接检查清单

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Tag5 穿搭结果页：新增 `POST /v1/tryon/full` 调用入口 | 待对接 |
| 2 | Tag5 衣物选择：支持多件衣物（含鞋子饰品）传入 `garment_image_urls[]` | 待对接 |
| 3 | Tag4 搭配设置：请求体新增 `profile` + 5 个维度字段 | 待对接 |
| 4 | Tag4 响应解析：`garments[]` 含 `display_image_url`，可直接渲染 | 待对接 |
| 5 | Tag4 响应解析：`status="generated"` / `occasion_en` / `feel_en` / `tags_en` | 待对接 |
| 6 | Wardrobe 数据：新增 `category_en` / `display_image_url` 等字段透传 | 待对接 |
| 7 | occasion 枚举：新增 `home` / `business` / `travel` | 待对接 |
| 8 | 轮询逻辑：`task_type="full_tryon"` 的结果取 `result_image_url` | 待对接 |

---

## 附录

### A. 接口总览（含本次变更）

| 方法 | 路径 | 标签 | 变更状态 |
|------|------|------|----------|
| GET | `/health` | system | 不变 |
| POST | `/v1/garments/recognize` | garments | 不变 |
| POST | `/v1/garments/segment` | garments | 不变 |
| POST | `/v1/garments/remove-background` | garments | 不变 |
| POST | `/v1/styles/decompose` | styles | 不变 |
| POST | `/v1/styles/match` | styles | 不变 |
| POST | `/v1/outfits/recommend` | outfits | **变更**（新增字段） |
| POST | `/v1/tips/generate` | tips | 不变 |
| POST | `/v1/tryon` | tryon | 不变 |
| POST | `/v1/tryon/full` | tryon | **新增** |
| GET | `/v1/tasks/{task_id}` | tasks | **变更**（支持 full_tryon） |

### B. 参考文档

- [HTTP_API_REFERENCE.md](HTTP_API_REFERENCE.md) — HTTP API 完整参考
- [DEV_LOG_day4.md](DEV_LOG_day4.md) — 开发日志 Day4
- [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) — 后端接口对接文档
- VestiCore 前端接口声明（Interface Declaration · 改）— 前端原型契约

---

*文档维护：Veslune Team · 最后更新：2026-07-03*
