# Veslune iOS API 接口文档

> **版本**：v1.8.0 · 2026-07-12  
> **Base URL**：`https://veslune.aabbaq.com/api/v1`  
> **范围**：iOS 前端对接 Backend REST API  

变更摘要（v1.8.0）：新增用户 AI 模型偏好 `GET/PUT /users/me/ai-model-preferences`；模型解析优先级为 **请求 `model_name` > 用户偏好 > 平台默认**；衣橱导入对 Core `SegmentGarment` 同时注入 vision（识别）与 image（白底渲染）inference。

变更摘要（v1.7.1）：用户模特结果与试穿结果下载后写入私有 OSS，DB 只存 OSS 永久 URL；`GET /auth/me` 的 `avatar_url` 读时 presign；新增 `POST /tryon/outfits/:id`（用穿搭 ID + 用户模特图一键试穿）；`POST /tryon/full` 请求体不变。

变更摘要（v1.7.0）：枚举改为 DB 表 `enum_options` + 进程内缓存（默认 5 分钟刷新）；新增统一接口 `GET /metadata/enums`（多语言 `label_zh` / `label_en`）；**删除** `GET /metadata/profile-options` 与 `GET /metadata/user-model-options`；Profile / User Model / 衣橱等校验改为读缓存，缓存为空时不做硬编码兜底。

变更摘要（v1.6.2）：`PUT /wardrobe/:id` 和 `PUT /users/me/profile` 改为三态语义（省略=不更新，null=清空，值=更新）；`GET /wardrobe` 的 `total` 改为筛选后总数；`POST /wardrobe/:id/remove-background` 已实现。

变更摘要（v1.6.1）：读接口返回的衣物 / 试穿 / 模特图片 URL 统一为私有 OSS 的 **presigned GET**（约 1h）；DB 仍存永久 canonical URL。详见 §0.5。

---

## 0. 通用约定

### 0.1 鉴权

除注册、登录、健康检查、公共 metadata 外，请求头都需要：

```http
Authorization: Bearer {access_token}
```

生产环境通过 Nginx 暴露 HTTPS 入口，Backend 容器只在 Docker 内网监听 `:8080`。

### 0.2 统一响应包络

成功：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

失败：

```json
{
  "code": 40001,
  "message": "invalid input"
}
```

### 0.3 常用错误码

| code | HTTP | 含义 |
|------|------|------|
| `40001` | 400 | 请求参数错误 |
| `40002` | 400 | 上传对象不存在或已过期 |
| `40003` | 400 | 指定模型不可用或未启用 |
| `40101` | 401 | 未登录 / Token 无效 |
| `40301` | 403 | 无权限 |
| `40401` | 404 | 资源不存在 |
| `40901` | 409 | 邮箱已注册 |
| `40902` | 409 | 导入任务已开始 |
| `50000` | 500 | 服务内部错误 |
| `50001` | 502 | AI 推理失败 |
| `50002` | 503 | AI 服务不可用 |
| `50100` | 501 | 接口未实现 |

### 0.4 分页

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | int | 1 | 页码，从 1 开始 |
| `limit` | int | 20 | 每页条数，最大 50 |

分页响应：

```json
{
  "page": 1,
  "limit": 20,
  "total": 12,
  "has_more": false
}
```

### 0.5 图片 URL 约定（私有 OSS）

生产 Bucket 为**私有读**。DB 持久化的是 OSS **永久 canonical URL**（`PublicURL(key)`），不是 DashScope 临时链，也不是带签名的 URL。

面向 iOS / Web 的读接口在返回前会把自家 OSS 对象 URL 转成 **presigned GET**（约 1 小时有效）。客户端应直接用响应里的 HTTPS URL 加载图片；非 OSS 外链原样返回。

> **注意**：DB 中不存储任何临时 URL（如 DashScope 渲染图）。大模型生成的白底图、用户模特图、试穿结果图会被下载并上传到 OSS，DB 只存 OSS 永久 URL。

| 字段 | 用途 |
|------|------|
| `display_image_url` | **UI 展示首选**（有 cutout 用 cutout，否则原图） |
| `image_url` / `cutout_url` | 原图 / 抠图（同样可能已 presign） |
| `avatar_url` | 用户模特图（`{userId}/profile/avatar.jpg`） |
| `tryon_results.image_url` | 试穿结果（`{userId}/tryon/results/{id}.jpg`） |

已统一 presign 的接口：

- `GET /auth/me`（`avatar_url`）
- `GET /wardrobe`、`GET /wardrobe/:id`、`PUT /wardrobe/:id`
- `GET /tasks/:id`（含 `garments`、`tryon_result.image_url`、`user_model_result.model_image_url`）
- `GET /tryon/results/:id`
- `POST /outfits/recommend`、`GET /outfits/:id`
- `POST /user/outfits`、`GET /user/outfits`、`GET /user/today-outfit`

**客户端注意**：presigned URL 约 1h 过期。本地缓存请以资源 `id` 为 key，不要把整段签名 URL 当永久缓存键；加载 403 时重新请求对应 API 刷新 URL。

### 0.7 三态语义（partial update）

`PUT /wardrobe/:id` 和 `PUT /users/me/profile` 支持部分更新，采用三态语义：

| 请求中的字段值 | 含义 |
|---------------|------|
| **省略字段**（不传） | 不更新该字段，保持原值 |
| **`null`** | 清空该字段（设为 NULL） |
| **具体值** | 更新为该值 |

示例：只修改 `height_cm`，不传其他字段：

```json
{ "height_cm": 180 }
```

清空 `hip_cm`：

```json
{ "hip_cm": null }
```

### 0.6 核心对象

#### User

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "nickname": "testuser",
  "avatar_url": null,
  "city_code": "101010100"
}
```

#### Garment

```json
{
  "id": "g-uuid",
  "image_url": "https://cdn.example.com/u/wardrobe/import/task.jpg",
  "cutout_url": "https://cdn.example.com/u/wardrobe/garments/g_cutout.png",
  "display_image_url": "https://cdn.example.com/u/wardrobe/garments/g_cutout.png",
  "category": "上衣",
  "category_en": "TOPS",
  "primary_color": "白",
  "primary_color_en": "White",
  "material": "Cotton",
  "style_tags": ["minimalist"],
  "confidence": 0.92,
  "reason": "AI reason",
  "needs_confirmation": false,
  "processing_status": "ready",
  "is_manually_edited": false,
  "created_at": "2026-07-04T08:00:00Z"
}
```

#### Outfit

```json
{
  "id": "o-uuid",
  "status": "generated",
  "name": "minimal_commute_0704",
  "source_en": "tag5_result",
  "tags_en": ["commute", "daily_casual"],
  "occasion": "通勤",
  "occasion_en": "commute",
  "garments": [
    {
      "id": "g-uuid",
      "category": "上衣",
      "category_en": "TOPS",
      "primary_color": "白",
      "primary_color_en": "White",
      "image_url": "https://...",
      "display_image_url": "https://..."
    }
  ],
  "reason": "推荐理由",
  "feel_en": "comfortable",
  "tips": ["搭配建议"],
  "created_at": "2026-07-04T08:00:00Z",
  "weather": {
    "temp": 22,
    "condition": "晴",
    "humidity": 45
  }
}
```

---

## 1. 认证

### POST /auth/register

注册。

**鉴权**：否

**Request**

```json
{
  "email": "test@example.com",
  "password": "12345678",
  "nickname": "testuser"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 邮箱 |
| `password` | string | 是 | 至少 8 位 |
| `nickname` | string | 否 | 昵称 |

**Response 201**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "access_token": "eyJhbGciOi...",
    "expires_in": 604800,
    "profile_completed": false,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "test@example.com",
      "nickname": "testuser",
      "avatar_url": null,
      "city_code": "101010100"
    }
  }
}
```

---

### POST /auth/login

登录。

**鉴权**：否

**Request**

```json
{
  "email": "test@example.com",
  "password": "12345678"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 邮箱 |
| `password` | string | 是 | 密码 |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "access_token": "eyJhbGciOi...",
    "expires_in": 604800,
    "profile_completed": false,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "test@example.com",
      "nickname": "testuser",
      "avatar_url": null,
      "city_code": "101010100"
    }
  }
}
```

---

### GET /auth/me

获取当前登录用户摘要。

**鉴权**：是

**Request**：无

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "nickname": "testuser",
    "avatar_url": null,
    "city_code": "101010100",
    "garment_count": 3,
    "profile_completed": true,
    "created_at": "2026-07-04T08:00:00Z"
  }
}
```

---

### PUT /auth/me

更新当前用户基础资料。

**鉴权**：是

**Request**

```json
{
  "nickname": "new_name",
  "city_code": "101020100"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nickname` | string | 否 | 昵称 |
| `city_code` | string | 否 | 和风天气城市 ID |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "nickname": "new_name",
    "avatar_url": null,
    "city_code": "101020100",
    "garment_count": 3,
    "profile_completed": true,
    "created_at": "2026-07-04T08:00:00Z"
  }
}
```

---

## 2. 用户 Profile

### GET /users/me/profile

获取身体数据与偏好。

**鉴权**：是

**Request**：无

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "body": {
      "height_cm": 175,
      "weight_kg": 68.5,
      "shoulder_width_cm": 44,
      "waist_cm": 78,
      "hip_cm": null,
      "thigh_cm": null,
      "calf_cm": null,
      "leg_length_cm": 82,
      "body_type": "标准",
      "body_type_en": "standard",
      "sizes": {
        "tops_cn": "L",
        "bottoms_waist_cn": "32",
        "bottoms_length_cn": "170",
        "shoes_cn": "42",
        "shoes_foot_length_mm": 265
      }
    },
    "preferences": {
      "style_tags": ["简约"],
      "style_tags_en": ["minimalist"],
      "color_preferences": ["黑", "白"],
      "color_preferences_en": ["Black", "White"]
    },
    "completed": true,
    "updated_at": "2026-07-04T08:00:00Z"
  }
}
```

---

### PUT /users/me/profile

部分更新 Profile。采用三态语义（§0.7）：省略字段=不更新，`null`=清空，值=更新。只传需要修改的字段。

**鉴权**：是

**Request**

```json
{
  "height_cm": 175,
  "weight_kg": 68.5,
  "shoulder_width_cm": 44,
  "waist_cm": 78,
  "hip_cm": null,
  "thigh_cm": null,
  "calf_cm": null,
  "leg_length_cm": 82,
  "body_type_en": "standard",
  "size_tops_cn": "L",
  "size_bottoms_waist_cn": "32",
  "size_bottoms_length_cn": "170",
  "size_shoes_cn": "42",
  "size_shoes_foot_length_mm": 265,
  "style_tags_en": ["minimalist"],
  "color_preferences_en": ["Black", "White"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `height_cm` | int \| null | 否 | 身高 cm；不允许传 `null` 清空 |
| `weight_kg` | number \| null | 否 | 体重 kg；不允许传 `null` 清空 |
| `shoulder_width_cm` | number \| null | 否 | 肩宽 |
| `waist_cm` | number \| null | 否 | 腰围 |
| `hip_cm` | number \| null | 否 | 臀围，预留 |
| `thigh_cm` | number \| null | 否 | 大腿围 |
| `calf_cm` | number \| null | 否 | 小腿围，预留 |
| `leg_length_cm` | number \| null | 否 | 腿长 |
| `body_type_en` | string \| null | 否 | 体型，见 `GET /metadata/enums?type=body_shape` |
| `size_tops_cn` | string \| null | 否 | 上装尺码，见 `type=size_tops_cn` |
| `size_bottoms_waist_cn` | string \| null | 否 | 下装腰围尺码，见 `type=size_bottoms_waist_cn` |
| `size_bottoms_length_cn` | string \| null | 否 | 下装长度尺码，见 `type=size_bottoms_length_cn` |
| `size_shoes_cn` | string \| null | 否 | 鞋码，见 `type=size_shoes_cn` |
| `size_shoes_foot_length_mm` | int \| null | 否 | 脚长毫米 |
| `style_tags_en` | string[] \| null | 否 | 风格标签，最多 3 个；见 `type=style_tag` |
| `color_preferences_en` | string[] \| null | 否 | 颜色偏好，最多 5 个；见 `type=color` |

> **注意**：`height_cm` 和 `weight_kg` 不允许传 `null`（会返回 `40001`）。其余字段传 `null` 可清空。

**Response 200**

同 `GET /users/me/profile`。

---

### POST /users/me/model

根据体型参数生成用户虚拟模特（异步）。完成后轮询 `GET /tasks/:id`，`user_model_result` 中带结果图；同时将生成图持久化到 OSS 并更新用户 `avatar_url`（永久 canonical URL）。

**鉴权**：是  
**Content-Type**：`application/json`

**Request**

```json
{
  "gender": "female",
  "body_type": "standard",
  "height_cm": 165,
  "skin_tone": "medium",
  "age_range": "26_35",
  "hair_style": "long",
  "hair_color": "black",
  "avatar_image_url": "",
  "model_name": ""
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `gender` | string | 是 | 见 `GET /metadata/enums?type=gender` |
| `body_type` | string | 是 | 见 `GET /metadata/enums?type=body_shape`（与 Profile `body_type_en` 共用） |
| `height_cm` | float | 否 | 身高 cm |
| `skin_tone` | string | 否 | 见 `GET /metadata/enums?type=skin_tone` |
| `age_range` | string | 否 | 见 `GET /metadata/enums?type=age_range` |
| `hair_style` | string | 否 | 见 `GET /metadata/enums?type=hair_style` |
| `hair_color` | string | 否 | 见 `GET /metadata/enums?type=hair_color` |
| `avatar_image_url` | string | 否 | 头像模式时传入已有头像 URL |
| `model_name` | string | 否 | 指定 image 模型，留空使用默认模型 |

**Response 202**

见 §4 异步任务创建响应（`task_type=user_model`）。

---

### GET /metadata/enums

获取全局枚举字典（运营可在 `enum_options` 表增删改）。Backend 启动时加载到内存，默认每 **5 分钟**从 DB 刷新；读接口只返回缓存，不做硬编码兜底。缓存中没有的 type / value，写接口校验会失败（`40001`）。

**鉴权**：否  
**限流**：Nginx `/api/v1/metadata/` 按 IP 限流。

**Query**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 否 | 指定单个 type；省略则返回全部 type |

**type 一览（snake_case）**

| type | 用途 |
|------|------|
| `body_shape` | Profile `body_type_en` 与 User Model `body_type`（统一） |
| `gender` | User Model `gender` |
| `skin_tone` | User Model `skin_tone` |
| `age_range` | User Model `age_range` |
| `hair_style` | User Model `hair_style` |
| `hair_color` | User Model `hair_color` |
| `style_tag` | Profile `style_tags_en` |
| `color` | Profile `color_preferences_en`、衣物 `primary_color_en` |
| `garment_category` | 衣物 `category_en` |
| `material` | 材质元数据（衣物 `material` 仍允许自由文本，最长 50） |
| `occasion` | 穿搭场合 |
| `weather_feel` | 推荐体感 |
| `size_tops_cn` / `size_bottoms_waist_cn` / `size_bottoms_length_cn` / `size_shoes_cn` | 中国码尺码 |

**Response 200（全部）**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "types": {
      "hair_color": [
        { "value": "black", "label_zh": "黑色", "label_en": "Black" }
      ],
      "body_shape": [
        { "value": "standard", "label_zh": "标准", "label_en": "Standard" }
      ]
    },
    "loaded_at": "2026-07-12T04:00:00Z"
  }
}
```

**Response 200（`?type=hair_color`）**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "type": "hair_color",
    "items": [
      { "value": "black", "label_zh": "黑色", "label_en": "Black" }
    ],
    "loaded_at": "2026-07-12T04:00:00Z"
  }
}
```

未知 `type` → `40001`。

> **已删除（v1.7.0）**：`GET /metadata/profile-options`、`GET /metadata/user-model-options`。请改用本接口。

#### VLM Core 当前绑定的枚举（proto）

Backend 运营枚举可扩展；下列为 **VLM-Core gRPC proto 当前已定义**的值。运营新增但 VLM 未识别的值，在推荐 / 识别 / 模特生成等链路中可能被忽略或映射为 UNSPECIFIED——扩展前需同步 VLM。

| 领域 | VLM proto 枚举 | 当前支持的 value（Backend `value` 约定） |
|------|----------------|------------------------------------------|
| 衣物品类 | `GarmentCategory` | `TOPS`, `BOTTOMS`, `SKIRT`, `OUTERWEAR`, `SHOES`, `ACCESSORIES`, `DRESS`, `BAG`（Backend 衣橱常用 `BAGS`）, `HEADWEAR`, `SCARF`, `BELT`, `JEWELRY`, `OTHER` |
| 颜色 | `Color` | `Black`, `White`, `Gray`, `Red`, `Blue`, `Green`, `Yellow`, `Purple`, `Pink`, `Brown`, `Khaki`, `DenimBlue`, `Orange`, `Beige`, `Camel`, `Burgundy`, `Navy`, `Olive`, `Multi` |
| 材质 | `Material` | `Cotton`, `Linen`, `Silk`, `Wool`, `Cashmere`, `Leather`, `Denim`, `Polyester`, `Nylon`, `Knit`, `Chiffon`, `Velvet`, `Lace`, `Sweater`, `Down`, `Fur`, `Synthetic` |
| 风格 | `StyleTag` | `minimalist`, `street`, `japanese`, `korean`, `european`, `vintage`, `sweet`, `bohemian`, `business`, `sporty`, `punk`, `preppy`, `girly`, `elegant` |
| 场合 | `Occasion` | `commute`, `casual`, `date`, `sport`, `formal`, `home`, `business`, `travel` |
| 用户模特 | `UserBody` 字段注释 | `gender`: male/female；`body_type`: slim/standard/athletic/curvy/petite/…；`skin_tone`: fair/light/medium/tan/dark；`age_range`: 18_25/26_35/36_45/46_plus；`hair_color`: black/brown/chestnut/dark_brown |

---

## 3. 衣橱（wardrobe）

衣橱图片上传采用 **预签名 URL 直传 OSS** 两阶段流程：

1. `POST /wardrobe/upload-url` — 申请 presigned PUT URL（需 JWT）
2. iOS 直传 OSS — **不带 JWT**，仅使用 presigned URL + `Content-Type`
3. `POST /wardrobe/upload` — 确认上传并启动 AI 导入（需 JWT）
4. `GET /tasks/:id` — 轮询任务进度与结果

### POST /wardrobe/upload-url

申请 OSS 预签名上传地址。

**鉴权**：是（`Authorization: Bearer {access_token}`）  
**Content-Type**：`application/json`

**Request**

```json
{
  "content_type": "image/jpeg",
  "file_size": 2048576
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content_type` | string | 是 | `image/jpeg` / `image/png` / `image/webp` |
| `file_size` | int | 是 | 文件字节数，最大 10MB |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "upload_id": "uuid",
    "object_key": "{user_id}/wardrobe/import/{upload_id}.jpg",
    "upload_url": "https://veslune-prod.oss-cn-hangzhou.aliyuncs.com/...?Signature=...",
    "public_url": "https://veslune-prod.oss-cn-hangzhou.aliyuncs.com/{object_key}",
    "expires_in": 900,
    "headers": {
      "Content-Type": "image/jpeg"
    }
  }
}
```

**iOS 上传 OSS**

```http
PUT {upload_url}
Content-Type: image/jpeg

<binary>
```

- 不要附加 `Authorization: Bearer`
- `Content-Type` 必须与申请时一致
- `upload_id` 即后续 `task_id`

---

### POST /wardrobe/upload

确认 OSS 上传完成并启动异步 AI 导入。

**鉴权**：是  
**Content-Type**：`application/json`

**Request**

```json
{
  "upload_id": "uuid",
  "model_name": "qwen-vl-plus"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `upload_id` | string | 是 | `POST /wardrobe/upload-url` 返回的上传 ID |
| `model_name` | string | 否 | 视觉模型名称；见 §5.5。仅覆盖 Stage 1 识别；Stage 2 白底渲染使用 image 偏好 / 平台默认 |

**Response 202**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "task_id": "uuid",
    "status": "pending",
    "stage": "segmenting",
    "poll_after_ms": 2000
  }
}
```

**错误**

| code | 场景 |
|------|------|
| `40002` | OSS 对象不存在（未 PUT 或 URL 已过期） |
| `40902` | 同一 `upload_id` 已启动过导入 |

---

### GET /wardrobe

衣橱列表。

**鉴权**：是

**Query**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category_en` | string | 否 | `TOPS` / `BOTTOMS` / `SHOES` / `OUTERWEAR` / `ACCESSORIES` / `BAGS` |
| `page` | int | 否 | 默认 1 |
| `limit` | int | 否 | 默认 20 |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": "g-uuid",
        "image_url": "https://...",
        "cutout_url": "https://...",
        "display_image_url": "https://...",
        "category": "上衣",
        "category_en": "TOPS",
        "primary_color": "白",
        "primary_color_en": "White",
        "material": "Cotton",
        "style_tags": ["minimalist"],
        "confidence": 0.92,
        "reason": "AI reason",
        "needs_confirmation": false,
        "processing_status": "ready",
        "is_manually_edited": false,
        "created_at": "2026-07-04T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "has_more": false
    }
  }
}
```

> **注意**：`pagination.total` 是**筛选后**的总数。传 `category_en=TOPS` 时，`total` 是 TOPS 分类的衣物数，不是用户全部衣物数。不传 `category_en` 时为全部衣物数。

---

### GET /wardrobe/stats

衣橱分类统计。

**鉴权**：是

**Request**：无

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "total": 3,
    "by_category": [
      { "category": "上衣", "category_en": "TOPS", "count": 2 },
      { "category": "裤装", "category_en": "BOTTOMS", "count": 1 }
    ]
  }
}
```

---

### GET /wardrobe/:id

衣物详情。

**鉴权**：是

**Path**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | uuid | 是 | 衣物 ID |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "g-uuid",
    "image_url": "https://...",
    "cutout_url": "https://...",
    "display_image_url": "https://...",
    "category": "上衣",
    "category_en": "TOPS",
    "primary_color": "白",
    "primary_color_en": "White",
    "material": "Cotton",
    "style_tags": ["minimalist"],
    "confidence": 0.92,
    "reason": "AI reason",
    "needs_confirmation": false,
    "processing_status": "ready",
    "is_manually_edited": false,
    "created_at": "2026-07-04T08:00:00Z"
  }
}
```

---

### PUT /wardrobe/:id

手动修正衣物识别结果。采用三态语义（§0.7）：省略字段=不更新，`null`=清空，值=更新。

**鉴权**：是

**Path**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | uuid | 是 | 衣物 ID |

**Request**

```json
{
  "category_en": "TOPS",
  "primary_color_en": "White",
  "material": "Cotton"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category_en` | string \| null | 否 | 英文品类；传 `null` 清空，省略不更新 |
| `primary_color_en` | string \| null | 否 | 英文颜色；传 `null` 清空，省略不更新 |
| `material` | string \| null | 否 | 材质，最长 50 字符；传 `null` 清空，省略不更新 |

> **注意**：至少传一个字段，否则返回 `40001`。空字符串 `""` 不等于 `null`——空字符串会被当作有效值写入。

**Response 200**

返回更新后的 `Garment`（已 presign），其中 `is_manually_edited=true`。

---

### DELETE /wardrobe/:id

删除衣物。

**鉴权**：是

**Path**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | uuid | 是 | 衣物 ID |

**Response 200**

```json
{
  "code": 0,
  "message": "ok"
}
```

---

### POST /wardrobe/:id/remove-background

单独触发衣物抠图。

**鉴权**：是

服务会读取当前衣物的展示图（优先 `segment_image_url`，否则 `image_url`），presign 后调用 VLM Core 的 RemoveBackground（rembg），将透明 PNG 上传到 OSS，并更新 `cutout_url`。

**Response 200**

返回更新后的完整 `Garment` 对象（已 presign），`cutout_url` 和 `display_image_url` 更新为新生成的抠图 URL。

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "g-uuid",
    "image_url": "https://...",
    "cutout_url": "https://.../cutout.png",
    "display_image_url": "https://.../cutout.png",
    "category": "上衣",
    "category_en": "TOPS",
    "primary_color": "白",
    "primary_color_en": "White",
    "material": "Cotton",
    "style_tags": ["minimalist"],
    "confidence": 0.92,
    "reason": "AI reason",
    "needs_confirmation": false,
    "processing_status": "ready",
    "is_manually_edited": false,
    "created_at": "2026-07-04T08:00:00Z"
  }
}
```

**错误**

| code | 场景 |
|------|------|
| `40401` | 衣物不存在 |
| `50001` | VLM 抠图失败 |

---

## 4. 异步任务

### GET /tasks/:id

查询异步任务进度。`status=done` 时按 `task_type` 返回对应业务结果。

**鉴权**：是

**Path**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | uuid | 是 | 任务 ID |

**Response 200（processing）**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "task-uuid",
    "task_type": "garment_import",
    "status": "processing",
    "stage": "segmenting",
    "progress": 42,
    "poll_after_ms": 3000,
    "created_at": "2026-07-04T08:00:00Z"
  }
}
```

**Response 200（done · garment_import）**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "task-uuid",
    "task_type": "garment_import",
    "status": "done",
    "stage": "done",
    "progress": 100,
    "poll_after_ms": 0,
    "garments": [
      {
        "id": "g-uuid",
        "image_url": "https://...",
        "cutout_url": "https://...",
        "display_image_url": "https://...",
        "category": "上衣",
        "category_en": "TOPS",
        "primary_color": "白",
        "primary_color_en": "White",
        "style_tags": [],
        "needs_confirmation": false,
        "processing_status": "ready",
        "is_manually_edited": false,
        "created_at": "2026-07-04T08:05:00Z"
      }
    ],
    "created_at": "2026-07-04T08:00:00Z",
    "completed_at": "2026-07-04T08:05:00Z"
  }
}
```

**Response 200（done · full_tryon）**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "task-uuid",
    "task_type": "full_tryon",
    "status": "done",
    "stage": "done",
    "progress": 100,
    "poll_after_ms": 0,
    "tryon_result": {
      "id": "tryon-result-uuid",
      "image_url": "https://veslune-prod.oss-cn-hangzhou.aliyuncs.com/.../tryon.png",
      "mode": "composited",
      "garment_count": 3
    },
    "created_at": "2026-07-04T08:00:00Z",
    "completed_at": "2026-07-04T08:05:00Z"
  }
}
```

| `tryon_result.mode` | 说明 |
|---------------------|------|
| `composited` | 图像合成试穿 |
| `text_only` | 非合成路径结果 |

**Response 200（done · user_model）**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "task-uuid",
    "task_type": "user_model",
    "status": "done",
    "stage": "done",
    "progress": 100,
    "poll_after_ms": 0,
    "user_model_result": {
      "model_image_url": "https://.../model.png",
      "generation_mode": "virtual"
    },
    "created_at": "2026-07-04T08:00:00Z",
    "completed_at": "2026-07-04T08:05:00Z"
  }
}
```

| `user_model_result.generation_mode` | 说明 |
|-------------------------------------|------|
| `virtual` | 纯虚拟模特 |
| `avatar` | 基于上传头像生成 |

完成后用户 `avatar_url` 也会更新为 OSS 持久化后的 `model_image_url`（非 DashScope 临时链）。

**Response 200（failed）**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "task-uuid",
    "task_type": "garment_import",
    "status": "failed",
    "stage": "failed",
    "progress": 0,
    "poll_after_ms": 0,
    "error_code": "process_failed",
    "error_message": "reason",
    "created_at": "2026-07-04T08:00:00Z",
    "completed_at": "2026-07-04T08:05:00Z"
  }
}
```

**异步任务创建响应（通用 202）**

`POST /wardrobe/upload`、`POST /tryon/full`、`POST /tryon/outfits/:id`、`POST /users/me/model` 均返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "task_id": "task-uuid",
    "task_type": "full_tryon",
    "status": "pending",
    "stage": "queued",
    "poll_after_ms": 2000
  }
}
```

---

## 5. 天气

### GET /weather

获取天气。

**鉴权**：是

**Query**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `city_code` | string | 否 | 和风城市 ID；不传使用用户 city_code |
| `lat` | number | 否 | 纬度，预留 |
| `lng` | number | 否 | 经度，预留 |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "city": "北京",
    "city_code": "101010100",
    "temp": 22,
    "feels_like": 21,
    "condition": "晴",
    "condition_en": "Sunny",
    "humidity": 45,
    "season": "春",
    "season_en": "Spring",
    "updated_at": "2026-07-04T08:00:00Z"
  }
}
```

---

## 5.5 AI 模型

部分 AI 接口支持可选参数 `model_name`，用于指定本次推理使用的模型。

**解析优先级**（`ResolveForUser`）：

1. 请求体中的 `model_name`（非空）
2. 用户偏好 `GET/PUT /users/me/ai-model-preferences` 对应 capability
3. 平台表 `ai_models.is_default`（该 capability 的默认模型）

iOS **不会**收到 API Key；密钥由 Backend 从数据库解密后，经内网 gRPC 传给 Core。

### GET /users/me/ai-model-preferences

返回当前用户四类能力的偏好、平台默认值，以及可选模型列表（供设置页渲染）。

**鉴权**：是

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "preferences": {
      "vision": "qwen-vl-plus",
      "text": null,
      "image": null,
      "tryon": null
    },
    "defaults": {
      "vision": "qwen-vl-max",
      "text": "qwen-plus",
      "image": "qwen-image-2.0-pro",
      "tryon": "aitryon"
    },
    "options": {
      "vision": [
        { "name": "qwen-vl-plus", "display_name": "Qwen VL Plus", "is_default": false },
        { "name": "qwen-vl-max", "display_name": "Qwen VL Max", "is_default": true }
      ],
      "text": [],
      "image": [],
      "tryon": []
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `preferences.<cap>` | 用户偏好的 `model_name`；`null` 表示使用平台默认 |
| `defaults.<cap>` | 平台默认 `model_name` |
| `options.<cap>` | 该能力下可用模型（同 `GET /ai/models`） |

### PUT /users/me/ai-model-preferences

整包更新四类偏好。字段传 `null` 或空字符串表示清除该能力偏好（回退平台默认）。省略字段按空处理（清除）。

**鉴权**：是

**Request**

```json
{
  "vision_model_name": "qwen-vl-plus",
  "text_model_name": null,
  "image_model_name": "qwen-image-2.0-pro",
  "tryon_model_name": null
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `vision_model_name` | string\|null | 否 | 视觉；衣橱导入识别 / Segment Stage 1 |
| `text_model_name` | string\|null | 否 | 文本；穿搭推荐 |
| `image_model_name` | string\|null | 否 | 图像；用户模特、全身试穿、Segment Stage 2 白底渲染 |
| `tryon_model_name` | string\|null | 否 | 试穿；经典 `POST /tryon`（OutfitAnyone，当前占位未实现） |

**Response 200**：同 `GET`。

**错误**

| code | 场景 |
|------|------|
| `40003` | 指定模型不存在、已禁用或不属于对应 capability |

### GET /ai/models

列出某能力下可用模型（供客户端展示选择器）。

**鉴权**：是

**Query**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `capability` | string | 是 | `vision` / `text` / `image` / `tryon` |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "default": "qwen-plus",
    "models": [
      {
        "name": "qwen-plus",
        "display_name": "Qwen Plus",
        "is_default": false
      },
      {
        "name": "qwen-max",
        "display_name": "Qwen Max",
        "is_default": true
      }
    ]
  }
}
```

| 字段 | 说明 |
|------|------|
| `default` | 该 capability 的默认 `model_name` |
| `models[].name` | 请求体中使用的 `model_name` |
| `models[].display_name` | 展示名称 |
| `models[].is_default` | 是否为默认模型 |

**各接口 capability 对应**

| 接口 | capability | 说明 |
|------|------------|------|
| `POST /outfits/recommend` | `text` | 穿搭推荐文本推理 |
| `POST /tryon/full` | `image` | 全身试穿图像生成 |
| `POST /tryon/outfits/:id` | `image` | 穿搭 ID 一键试穿 |
| `POST /users/me/model` | `image` | 用户虚拟模特 |
| `POST /wardrobe/upload` | `vision` + `image` | `model_name` 覆盖 vision；Stage 2 白底渲染用用户 image 偏好 / 平台默认 |
| `POST /tryon` | `tryon` | 经典试穿（当前 501 占位） |

**错误**

| code | 场景 |
|------|------|
| `40001` | `capability` 缺失或非法 |
| `40003` | 请求中 `model_name` 不存在、已禁用或不属于该 capability |

---

## 6. 穿搭推荐

### POST /outfits/recommend

生成穿搭推荐。后端会读取当前用户 profile、wardrobe 和 weather，返回 `status=generated` 的穿搭方案。

**鉴权**：是

**Request**

```json
{
  "occasion": "commute",
  "weather_feel": "comfortable",
  "strategy": "commute_appropriate",
  "visual_style": "daily_casual",
  "filters": {
    "color_tone": "earth_tone",
    "priority": "outerwear"
  },
  "max_outfits": 3,
  "model_name": "qwen-max"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `occasion` | string | 是 | `commute` / `casual` / `date` 等 |
| `weather_feel` | string | 否 | `cool` / `comfortable` / `warm` |
| `strategy` | string | 否 | 推荐策略 |
| `visual_style` | string | 否 | 画风 |
| `filters.color_tone` | string | 否 | 色调 |
| `filters.priority` | string | 否 | 优先单品 |
| `max_outfits` | int | 否 | 默认 1，最大 5 |
| `model_name` | string | 否 | 文本模型名称；见 §5.5 |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "outfits": [
      {
        "id": "o-uuid",
        "status": "generated",
        "tags_en": ["commute", "daily_casual"],
        "occasion": "通勤",
        "occasion_en": "commute",
        "garments": [
          {
            "id": "g-uuid",
            "category": "上衣",
            "category_en": "TOPS",
            "primary_color": "白",
            "primary_color_en": "White",
            "image_url": "https://...",
            "display_image_url": "https://..."
          }
        ],
        "reason": "推荐理由",
        "feel_en": "comfortable",
        "tips": ["搭配建议"],
        "created_at": "2026-07-04T08:00:00Z",
        "weather": {
          "temp": 22,
          "condition": "晴",
          "humidity": 45
        }
      }
    ],
    "weather": {
      "temp": 22,
      "condition": "晴",
      "humidity": 45
    }
  }
}
```

---

## 7. 穿搭详情

### GET /outfits/:id

获取穿搭详情。可查询 `generated` 或 `saved`。

**鉴权**：是

**Path**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | uuid | 是 | Outfit ID |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "o-uuid",
    "status": "generated",
    "occasion": "通勤",
    "occasion_en": "commute",
    "garments": [],
    "tips": [],
    "created_at": "2026-07-04T08:00:00Z"
  }
}
```

---

## 8. 穿搭收藏与今日穿搭

### POST /user/outfits

保存穿搭。前端传完整结构，后端写入 `status=saved`。

**鉴权**：是

**Request**

```json
{
  "name": "minimal_commute_0704",
  "source_en": "tag5_result",
  "occasion_en": "commute",
  "feel_en": "comfortable",
  "garment_ids": ["g-uuid-1", "g-uuid-2"],
  "tags_en": ["minimalist", "commute"],
  "tip": "搭配建议",
  "reason": "推荐理由"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 收藏名称 |
| `source_en` | string | 否 | `tag5_result` / `tag7_workshop` |
| `occasion_en` | string | 是 | 场合枚举 |
| `feel_en` | string | 否 | 体感枚举 |
| `garment_ids` | string[] | 是 | 至少 1 个衣物 ID |
| `tags_en` | string[] | 否 | 标签 |
| `tip` | string | 否 | 搭配建议 |
| `reason` | string | 否 | 推荐理由 |

**Response 201**

返回 `Outfit`，`status=saved`。

---

### GET /user/outfits

收藏穿搭列表。

**鉴权**：是

**Request**：无

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": "o-uuid",
        "status": "saved",
        "name": "minimal_commute_0704",
        "source_en": "tag5_result",
        "tags_en": ["minimalist", "commute"],
        "occasion": "通勤",
        "occasion_en": "commute",
        "garments": [],
        "reason": "推荐理由",
        "feel_en": "comfortable",
        "tips": ["搭配建议"],
        "created_at": "2026-07-04T08:00:00Z"
      }
    ]
  }
}
```

---

### DELETE /user/outfits/:id

删除收藏穿搭。只允许删除 `status=saved` 的记录。

**鉴权**：是

**Path**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | uuid | 是 | Outfit ID |

**Response 200**

```json
{
  "code": 0,
  "message": "ok"
}
```

---

### GET /user/today-outfit

获取今日穿搭。

**鉴权**：是

**Request**：无

**Response 200**

返回 `Outfit`。

---

### PUT /user/today-outfit

设置今日穿搭。

**鉴权**：是

**Request**

```json
{
  "outfit_id": "o-uuid"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `outfit_id` | uuid | 是 | 目标 outfit ID，当前要求 `status=generated` |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "updated": true
  }
}
```

---

## 9. 虚拟试穿

### POST /tryon/full

全身多件套虚拟试穿（异步）。完成后轮询 `GET /tasks/:id`，`tryon_result` 中带结果图。

**鉴权**：是  
**Content-Type**：`application/json`

**Request**

```json
{
  "person_image_url": "https://.../person.jpg",
  "garment_image_urls": [
    "https://.../top.jpg",
    "https://.../bottom.jpg"
  ],
  "outfit_items": [
    {
      "category": "TOPS",
      "name": "white shirt",
      "primary_color": "White"
    }
  ],
  "preserve_face": true,
  "model_name": "qwen-image-2.0-pro"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `person_image_url` | string | 是 | 人物图 URL |
| `garment_image_urls` | string[] | 是 | 单品图 URL 列表 |
| `outfit_items` | object[] | 否 | 单品元数据，与图片顺序对应 |
| `preserve_face` | bool | 否 | 是否保留面部，默认 `true` |
| `model_name` | string | 否 | 图像生成模型名称；见 §5.5 |

**Response 202**

见 §4 异步任务创建响应（`task_type=full_tryon`）。

完成后结果图会下载并上传到 OSS，`tryon_results.image_url` / `GET /tasks/:id` 的 `tryon_result.image_url` 为 OSS 永久 URL（读接口返回 presigned）。

---

### POST /tryon/outfits/:id

用已有穿搭（推荐生成或收藏）一键全身试穿（异步）。服务端读取：

1. 用户 `avatar_url` 作为人物图（需先完成 `POST /users/me/model`）
2. 穿搭内单品的展示图与元数据（`category` / `name` / `primary_color`）

**鉴权**：是  
**Content-Type**：`application/json`（body 可省略）

**Path**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | uuid | 是 | Outfit ID（`generated` 或 `saved`） |

**Request**

```json
{
  "preserve_face": true,
  "model_name": "qwen-image-2.0-pro"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `preserve_face` | bool | 否 | 是否保留面部，**默认 `true`** |
| `model_name` | string | 否 | 图像生成模型名称；见 §5.5 |

**Response 202**

见 §4 异步任务创建响应（`task_type=full_tryon`）。

**错误**

| 场景 | code |
|------|------|
| 未生成模特（`avatar_url` 为空）或穿搭无单品 | `40001` |
| 穿搭不存在或不属于当前用户 | `40401` |

> 与 `POST /tryon/full` 的区别：本接口由服务端组装人物图与单品；`/tryon/full` 仍由客户端显式传 URL 列表，请求体不变。

---

### POST /tryon

创建试穿任务。

**状态**：未实现，固定返回 501。

**Response 501**

```json
{
  "code": 50100,
  "message": "not implemented"
}
```

---

### GET /tryon/results/:id

获取试穿结果图。

**鉴权**：是

**Path**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | uuid | 是 | TryOnResult ID |

**Response 200**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "tryon-result-uuid",
    "image_url": "https://cdn.example.com/tryon/result.png"
  }
}
```

---

## 10. 健康检查

### GET /health

服务健康检查。**无 `/api/v1` 前缀**。

**鉴权**：否

**Response 200**

```json
{
  "status": "ok",
  "checks": {
    "postgres": "ok",
    "redis": "ok",
    "vlm": "ok"
  }
}
```

---

## 11. 废弃接口

| 废弃 | 替代 |
|------|------|
| `/garments/*` | `/wardrobe/*` |
| `POST /recommend/outfits` | `POST /outfits/recommend` |
| `POST /outfits/:id/save` | `POST /user/outfits` |
| `is_saved` 字段 | `status`: `generated` / `saved` |
