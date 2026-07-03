# 后端接口对接文档 — 2026-07-03 变更

> 面向：Go 后端开发
> 对齐：gRPC proto 契约 `proto/veslune/ai/v1/`
> 原则：后端代码不修改，仅同步 proto 变更并补齐字段传递
> 通信协议：gRPC (Protobuf)

---

## 目录

- [1. 变更概览](#1-变更概览)
- [2. Proto 文件变更](#2-proto-文件变更)
- [3. gRPC 接口变更详情](#3-grpc-接口变更详情)
- [4. Go 后端适配指南](#4-go-后端适配指南)
- [5. 数据流变更](#5-数据流变更)
- [6. 后端对接检查清单](#6-后端对接检查清单)

---

## 1. 变更概览

| 类型 | 文件/接口 | 说明 |
|------|-----------|------|
| **Proto 变更** | `common.proto` | 新增 3 个消息 + WardrobeItem 扩展 6 字段 + Occasion 枚举新增 3 值 |
| **Proto 变更** | `outfit.proto` | RecommendOutfitRequest 新增 6 个字段 |
| **gRPC 变更** | `RecommendOutfit` | 支持 UserProfile + 5 个推荐维度字段 |
| **gRPC 层** | `converters.py` | WardrobeItem 转换扩展 + Occasion 映射新增 |
| **gRPC 层** | `servicer.py` | UserProfile proto→dict 转换 + 字段透传 |

> **向后兼容**：所有 proto 新增字段使用新编号（不占用已有编号），旧客户端不传新字段时 AI Engine 使用默认值，不影响现有行为。

---

## 2. Proto 文件变更

### 2.1 common.proto — 新增消息

[common.proto](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/proto/veslune/ai/v1/common.proto)

#### BodyMeasurements（新增）

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
```

#### StylePreferences（新增）

```protobuf
message StylePreferences {
  repeated string style_tags = 1;
  repeated string color_preferences = 2;
  string pants_length = 3;  // full_length / cropped / shorts
}
```

#### UserProfile（新增）

```protobuf
message UserProfile {
  BodyMeasurements body = 1;
  StylePreferences preferences = 2;
}
```

### 2.2 common.proto — WardrobeItem 扩展

```protobuf
message WardrobeItem {
  string garment_id = 1;
  GarmentCategory category = 2;
  Color primary_color = 3;
  Material material = 4;
  repeated StyleTag style_tags = 5;
  // ── 新增字段（编号 6-11）──
  string name = 6;
  string display_image_url = 7;
  string cutout_url = 8;
  string season_suitability = 9;
  string silhouette = 10;
  string pattern = 11;
}
```

| 新增字段 | 类型 | 编号 | 说明 |
|----------|------|------|------|
| `name` | string | 6 | 单品名称 |
| `display_image_url` | string | 7 | 展示图 URL（白底商品图） |
| `cutout_url` | string | 8 | 抠图 URL（透明 PNG） |
| `season_suitability` | string | 9 | 季节适宜性（如 "all_season"） |
| `silhouette` | string | 10 | 廓形（如 "slim_fit"） |
| `pattern` | string | 11 | 图案（如 "solid"） |

### 2.3 common.proto — Occasion 枚举扩展

```protobuf
enum Occasion {
  OCCASION_UNSPECIFIED = 0;
  OCCASION_COMMUTE = 1;
  OCCASION_CASUAL = 2;
  OCCASION_DATE = 3;
  OCCASION_SPORT = 4;
  OCCASION_FORMAL = 5;
  OCCASION_HOME = 6;      // 新增：居家
  OCCASION_BUSINESS = 7;  // 新增：商务
  OCCASION_TRAVEL = 8;    // 新增：旅行
}
```

### 2.4 outfit.proto — RecommendOutfitRequest 扩展

[outfit.proto](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/proto/veslune/ai/v1/outfit.proto)

```protobuf
message RecommendOutfitRequest {
  // ... 现有字段 1-9 ...
  // ── 新增字段（编号 10-15）──
  UserProfile profile = 10;
  string weather_feel = 11;     // cool / comfortable / warm
  string strategy = 12;         // commute_appropriate / fashion_forward / comfort_first / slimming
  string visual_style = 13;     // daily_casual / editorial / office
  string color_tone = 14;       // earth_tone / monochrome / vivid
  string priority = 15;         // outerwear / tops / bottoms
}
```

| 新增字段 | 类型 | 编号 | 说明 |
|----------|------|------|------|
| `profile` | UserProfile | 10 | 用户身材档案 |
| `weather_feel` | string | 11 | 体感温度 |
| `strategy` | string | 12 | 推荐策略 |
| `visual_style` | string | 13 | 视觉风格 |
| `color_tone` | string | 14 | 色调 |
| `priority` | string | 15 | 重点品类 |

---

## 3. gRPC 接口变更详情

### 3.1 RecommendOutfit — 请求变更

Go 后端在构建 `RecommendOutfitRequest` 时，需新增以下字段传递：

```go
req := &aipb.RecommendOutfitRequest{
    // ... 现有字段 ...
    Profile: &aipb.UserProfile{
        Body: &aipb.BodyMeasurements{
            HeightCm:          170,
            WeightKg:          65,
            ShoulderWidthCm:   44,
            BodyType:          "standard",
            TopsSize:          "M",
            BottomsWaistSize:  "32",
            ShoesSize:         "42",
        },
        Preferences: &aipb.StylePreferences{
            StyleTags:         []string{"minimalist"},
            ColorPreferences:  []string{"Black", "White"},
            PantsLength:       "full_length",
        },
    },
    WeatherFeel:  "comfortable",
    Strategy:     "commute_appropriate",
    VisualStyle:  "daily_casual",
    ColorTone:    "earth_tone",
    Priority:     "tops",
}
```

### 3.2 RecommendOutfit — 响应变更

AI Engine 返回的 outfit 结构发生变化，Go 后端需调整解析逻辑：

**旧格式**（Day3 及之前）：

```json
{
  "outfits": [
    {
      "outfit_id": "uuid",
      "items": [
        { "garment_id": "g1", "category": "TOPS", "note": "White shirt" }
      ],
      "reason": "...",
      "tips": ["..."],
      "score": 0.92
    }
  ]
}
```

**新格式**（Day4）：

```json
{
  "outfits": [
    {
      "id": "uuid",
      "status": "generated",
      "occasion_en": "commute",
      "feel_en": "comfortable",
      "garment_ids": ["g1", "g2", "g3"],
      "garments": [
        { "id": "g1", "category_en": "TOPS", "display_image_url": "..." }
      ],
      "tags_en": ["commute", "daily_casual"],
      "tips": ["..."],
      "reason": "...",
      "score": 0.92
    }
  ]
}
```

| 变更项 | 旧字段 | 新字段 | 说明 |
|--------|--------|--------|------|
| 穿搭 ID | `outfit_id` | `id` | 字段名变更 |
| 衣物列表 | `items[].garment_id` + `note` | `garment_ids[]` + `garments[]` | 结构扁平化，garments 含 display_image_url |
| 状态 | 无 | `status` | 固定 `"generated"` |
| 场合 | 无 | `occasion_en` | 回传请求的 occasion |
| 体感 | 无 | `feel_en` | 回传请求的 weather_feel |
| 标签 | 无 | `tags_en` | 推荐标签数组 |

### 3.3 WardrobeItem 传递

Go 后端构建 WardrobeItem 时需填充新字段（可选，不填不影响功能）：

```go
item := &aipb.WardrobeItem{
    GarmentId:       "g1",
    Category:        aipb.GarmentCategory_GARMENT_CATEGORY_TOPS,
    PrimaryColor:    aipb.Color_COLOR_WHITE,
    Material:        aipb.Material_MATERIAL_COTTON,
    StyleTags:       []aipb.StyleTag{aipb.StyleTag_STYLE_TAG_MINIMALIST},
    // ── 新增字段 ──
    Name:              "白色衬衫",
    DisplayImageUrl:   "https://cdn.example.com/shirt_display.jpg",
    CutoutUrl:         "https://cdn.example.com/shirt_cutout.png",
    SeasonSuitability: "all_season",
    Silhouette:        "slim_fit",
    Pattern:           "solid",
}
```

> `display_image_url` 是穿搭推荐响应中 `garments[].display_image_url` 的数据来源。如果后端不传，推荐响应中该字段为空字符串。

---

## 4. Go 后端适配指南

### 4.1 重新生成 Proto 代码

```bash
# 在 Go 后端项目中重新编译 proto
protoc --go_out=. --go-grpc_out=. \
  proto/veslune/ai/v1/common.proto \
  proto/veslune/ai/v1/outfit.proto \
  proto/veslune/ai/v1/ai_service.proto
```

### 4.2 字段映射表（前端 → Go 后端 → gRPC）

| 前端字段（/users/me/profile） | Go 后端字段 | gRPC Proto 字段 |
|---|---|---|
| `body.height_cm` | `profile.Body.HeightCm` | `BodyMeasurements.height_cm` |
| `body.weight_kg` | `profile.Body.WeightKg` | `BodyMeasurements.weight_kg` |
| `body.shoulder_width_cm` | `profile.Body.ShoulderWidthCm` | `BodyMeasurements.shoulder_width_cm` |
| `body.body_type_en` | `profile.Body.BodyType` | `BodyMeasurements.body_type` |
| `body.sizes.tops_cn` | `profile.Body.TopsSize` | `BodyMeasurements.tops_size` |
| `body.sizes.bottoms_waist_cn` | `profile.Body.BottomsWaistSize` | `BodyMeasurements.bottoms_waist_size` |
| `body.sizes.shoes_cn` | `profile.Body.ShoesSize` | `BodyMeasurements.shoes_size` |
| `preferences.style_tags_en` | `profile.Preferences.StyleTags` | `StylePreferences.style_tags` |
| `preferences.color_preferences_en` | `profile.Preferences.ColorPreferences` | `StylePreferences.color_preferences` |
| `preferences.pants_length_en` | `profile.Preferences.PantsLength` | `StylePreferences.pants_length` |

### 4.3 推荐维度字段映射

| 前端字段（/outfits/recommend） | gRPC Proto 字段 | 枚举值 |
|---|---|---|
| `weather_feel` | `RecommendOutfitRequest.weather_feel` | cool / comfortable / warm |
| `strategy` | `RecommendOutfitRequest.strategy` | commute_appropriate / fashion_forward / comfort_first / slimming |
| `visual_style` | `RecommendOutfitRequest.visual_style` | daily_casual / editorial / office |
| `filters.color_tone` | `RecommendOutfitRequest.color_tone` | earth_tone / monochrome / vivid |
| `filters.priority` | `RecommendOutfitRequest.priority` | outerwear / tops / bottoms |

### 4.4 Occasion 枚举映射

| 前端 occasion | gRPC Occasion 枚举 |
|---|---|
| `commute` | `OCCASION_COMMUTE` |
| `casual` | `OCCASION_CASUAL` |
| `date` | `OCCASION_DATE` |
| `sport` | `OCCASION_SPORT` |
| `formal` | `OCCASION_FORMAL` |
| `home` | `OCCASION_HOME`（新增） |
| `business` | `OCCASION_BUSINESS`（新增） |
| `travel` | `OCCASION_TRAVEL`（新增） |

---

## 5. 数据流变更

### 5.1 穿搭推荐数据流（更新后）

```
前端 POST /outfits/recommend
  ├─ occasion + weather_feel + strategy + visual_style + color_tone + priority
  └─ profile（body + preferences）

Go 后端
  ├─ 从 DB 读取用户 profile → 构建 UserProfile proto
  ├─ 从 DB 读取 wardrobe → 构建 WardrobeItem[]（含 display_image_url 等新字段）
  ├─ 组装 RecommendOutfitRequest（含 6 个新字段）
  └─ gRPC: RecommendOutfit(req)

AI Engine
  ├─ servicer.py: proto → dict 转换（UserProfile → profile dict）
  ├─ OutfitRecommender.recommend(profile, weather_feel, strategy, ...)
  ├─ 规则引擎: weather_feel="warm" 过滤厚重外套
  ├─ LLM 生成: profile + 维度字段注入提示词
  ├─ _enrich_outfits(): 回查 wardrobe 补全 display_image_url + category_en
  └─ 返回 outfits[]（含 id, status, garment_ids, garments, tags_en）

Go 后端
  ├─ 解析响应: outfit.id → outfits.id（UUID）
  ├─ outfit.garments[] → 含 display_image_url 可直接返回前端
  └─ INSERT outfits (status=generated) × N
```

### 5.2 UserProfile 转换细节

AI Engine `servicer.py` 中的 proto → dict 转换逻辑：

```
proto BodyMeasurements          →  dict body
  height_cm                     →  height_cm
  weight_kg                     →  weight_kg
  shoulder_width_cm             →  shoulder_width_cm
  body_type                     →  body_type_en
  tops_size                     →  sizes.tops_cn
  bottoms_waist_size            →  sizes.bottoms_waist_cn
  shoes_size                    →  sizes.shoes_cn

proto StylePreferences          →  dict preferences
  style_tags                    →  style_tags_en
  color_preferences             →  color_preferences_en
  pants_length                  →  pants_length_en
```

> Go 后端无需关心此转换，只需正确填充 proto 字段即可。

---

## 6. 后端对接检查清单

| # | 检查项 | 优先级 | 状态 |
|---|--------|--------|------|
| 1 | 重新编译 proto 生成 Go 代码（common.proto + outfit.proto） | P0 | 待对接 |
| 2 | `RecommendOutfitRequest` 新增 `profile` 字段传递 | P0 | 待对接 |
| 3 | `RecommendOutfitRequest` 新增 5 个维度字段传递 | P0 | 待对接 |
| 4 | `WardrobeItem` 填充 `display_image_url`（影响推荐响应图片 URL） | P0 | 待对接 |
| 5 | `WardrobeItem` 填充 `name` / `season_suitability` / `silhouette` / `pattern` | P1 | 待对接 |
| 6 | Occasion 枚举新增 `home` / `business` / `travel` 映射 | P1 | 待对接 |
| 7 | 推荐响应解析：`outfit_id` → `id`，`items[]` → `garment_ids[]` + `garments[]` | P0 | 待对接 |
| 8 | 推荐响应解析：新增 `status` / `occasion_en` / `feel_en` / `tags_en` | P1 | 待对接 |
| 9 | `garments[].display_image_url` 透传至前端 | P0 | 待对接 |

---

## 附录

### A. Proto 变更完整 Diff

```diff
--- common.proto
+ OCCASION_HOME = 6;
+ OCCASION_BUSINESS = 7;
+ OCCASION_TRAVEL = 8;

  message WardrobeItem {
    ...
+   string name = 6;
+   string display_image_url = 7;
+   string cutout_url = 8;
+   string season_suitability = 9;
+   string silhouette = 10;
+   string pattern = 11;
  }

+ message BodyMeasurements { ... }
+ message StylePreferences { ... }
+ message UserProfile { ... }

--- outfit.proto
  message RecommendOutfitRequest {
    ...
+   UserProfile profile = 10;
+   string weather_feel = 11;
+   string strategy = 12;
+   string visual_style = 13;
+   string color_tone = 14;
+   string priority = 15;
  }
```

### B. 参考文档

- [API_PROTO_REQUIREMENTS.md](API_PROTO_REQUIREMENTS.md) — 原有 proto 对齐需求清单
- [DEV_LOG_day4.md](DEV_LOG_day4.md) — 开发日志 Day4
- [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) — 前端对接文档
- [HTTP_API_REFERENCE.md](HTTP_API_REFERENCE.md) — HTTP API 完整参考
- VestiCore 前端接口声明（Interface Declaration · 改）— 前端契约

---

*文档维护：Veslune Team · 最后更新：2026-07-03*
