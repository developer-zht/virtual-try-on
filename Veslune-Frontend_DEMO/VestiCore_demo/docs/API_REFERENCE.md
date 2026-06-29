# Veslune AI Engine API 接口规范

本文档定义 **HTTP REST** 与 **gRPC** 的请求/响应格式。两种协议能力对齐：同步接口直接返回结果；耗时接口（单品分割、虚拟试穿）统一为 **创建任务 + 轮询状态**。

- HTTP Base URL（Docker）：`http://<host>:8000`
- HTTP Base URL（本地默认）：`http://<host>:8080`
- gRPC 地址：`grpc://<host>:50051`（当前为 **plaintext / insecure**）
- Proto package：`veslune.ai.v1`
- gRPC service：`veslune.ai.v1.AIService`

---

## 通用约定

### 图片输入

| 方式 | HTTP | gRPC |
|------|------|------|
| URL | `image_url`（form）或 JSON 字段 | `ImageInput.url` |
| 二进制 | `image`（multipart 文件） | `ImageInput.data` |
| 格式 | 自动推断 | `ImageInput.format`（如 `jpeg`、`png`） |

HTTP 图片类接口：`image` 与 `image_url` **二选一**。

### 异步任务流程

```
Client                          Server
  |  POST segment / tryon          |
  | --------------------------->   |
  |  { task_id, task_type }        |
  | <---------------------------   |
  |  GET /v1/tasks/{id}            |
  |  (或 GetTaskStatus)            |
  | --------------------------->   |
  |  status: pending/processing    |
  | <---------------------------   |
  |  ... 轮询直至 done/failed ...   |
```

| `task_type` | 创建接口 | 完成时 `result` 内容 |
|-------------|----------|----------------------|
| `garment_segment` | `POST /v1/garments/segment` / `SegmentGarment` | 单品列表 + 可选渲染图 URL |
| `tryon` | `POST /v1/tryon` / `GenerateTryOn` | 试穿结果图 URL |

**重要**：Docker Compose（`TASK_STORE=redis`）下，HTTP 与 gRPC 可查询同一 `task_id`。本地 `memory` 模式仍仅单进程有效。

### 错误

| HTTP | 含义 |
|------|------|
| `400` | 参数错误（如缺少图片、试穿未提供衣物 URL） |
| `404` | 任务不存在 |
| `502` | 下游模型或抠图失败 |
| `503` | 未配置 `DASHSCOPE_API_KEY` |

gRPC：业务失败通常在 `ResponseMeta.success = false` 或 `GetTaskStatus.status = FAILED`；参数错误使用 `INVALID_ARGUMENT`。

---

## 1. 健康检查

### HTTP

```http
GET /health
```

**响应 200**

```json
{
  "status": "ok",
  "dashscope_configured": true,
  "gemini_configured": false,
  "grpc_port": 50051,
  "http_port": 8000,
  "task_store": "redis",
  "redis_connected": true
}
```

`status=degraded` 表示 Redis 不可用（仅 `TASK_STORE=redis` 时）。

### gRPC

```protobuf
rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
```

**响应**

```json
{
  "status": "ok",
  "dashscope_configured": true,
  "grpc_port": 50051,
  "http_port": 8080
}
```

---

## 2. 单品识别 RecognizeGarment

识别单张图片中的主要衣物属性，**不返回图片**。

### HTTP

```http
POST /v1/garments/recognize
Content-Type: multipart/form-data
```

| 字段 | 类型 | 必填 |
|------|------|------|
| `image` | file | 与 `image_url` 二选一 |
| `image_url` | string | 与 `image` 二选一 |

**响应 200**

```json
{
  "success": true,
  "garment": {
    "category": "TOPS",
    "primary_color": "White",
    "secondary_colors": [],
    "material": "Cotton",
    "style_tags": ["Minimalist"],
    "confidence": 0.92,
    "reason": "...",
    "season_suitability": "Spring/Summer",
    "is_manually_edited": false
  },
  "error_message": null,
  "processing_time_ms": 1200
}
```

### gRPC

```protobuf
rpc RecognizeGarment(RecognizeGarmentRequest) returns (RecognizeGarmentResponse);

message RecognizeGarmentRequest {
  RequestMeta meta = 1;
  ImageInput image = 2;
}
```

`RecognizedGarment` 使用 proto 枚举（`GarmentCategory`、`Color`、`Material`、`StyleTag`）。完整枚举见 `proto/veslune/ai/v1/common.proto`。

---

## 3. 单品分割 SegmentGarment（异步）

从全身/穿搭图识别所有单品；可选逐件生成白底商品图。

- `render_items=false`：仅属性，约 80s
- `render_items=true`：含渲染图，约 10+ 分钟

### HTTP — 创建任务

```http
POST /v1/garments/segment
Content-Type: multipart/form-data
```

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `image` / `image_url` | file / string | — | 二选一 |
| `render_items` | bool | `true` | 是否生成白底图 |

**响应 200**

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "task_type": "garment_segment"
}
```

### gRPC — 创建任务

```protobuf
rpc SegmentGarment(SegmentGarmentRequest) returns (SegmentGarmentResponse);

message SegmentGarmentRequest {
  RequestMeta meta = 1;
  ImageInput image = 2;
  bool render_items = 3;
}

message SegmentGarmentResponse {
  ResponseMeta meta = 1;
  string task_id = 2;
  TaskType task_type = 3;  // TASK_TYPE_GARMENT_SEGMENT
}
```

### 轮询结果（分割）

见 [§10 查询任务状态](#10-查询任务状态-gettaskstatus)。

**`status=done` 时 HTTP `result` 示例**

```json
{
  "success": true,
  "items": [
    {
      "category": "TOPS",
      "name": "White T-shirt",
      "sub_category": "T-shirt",
      "primary_color": "White",
      "secondary_colors": [],
      "material": "Cotton",
      "silhouette": "Regular",
      "pattern": "Solid",
      "pattern_detail": "",
      "style_tags": ["Minimalist"],
      "completeness": "complete",
      "confidence": 0.88,
      "reason": "",
      "missing_parts": "",
      "season_suitability": "All-season",
      "bbox": {
        "x": 0.1,
        "y": 0.2,
        "width": 0.3,
        "height": 0.4,
        "description": ""
      },
      "render_result": {
        "success": true,
        "method": "edit_background",
        "image_urls": ["https://dashscope-result.../xxx.png"],
        "error_message": null
      }
    }
  ],
  "item_count": 1,
  "processing_time_ms": 95000
}
```

gRPC 完成时 `GetTaskStatusResponse.segment` 为 `SegmentGarmentTaskResult`（结构同上，枚举字段为 proto enum）。

`render_result.method` 取值：

| 值 | 说明 |
|----|------|
| `edit_background` | 编辑换背景 |
| `edit_partial_generate` | 局部生成 |
| `edit_non_garment` | 非服装类处理 |
| `generate_with_ref` | 参考图生成 |
| `skipped` | 跳过渲染 |

---

## 4. 衣物抠图 RemoveBackground

移除背景，输出 PNG（透明底）。需服务端安装 `rembg`。

### HTTP

```http
POST /v1/garments/remove-background?response_format=json
Content-Type: multipart/form-data
```

| Query | 值 | 说明 |
|-------|-----|------|
| `response_format` | `json`（默认） | 返回 base64 |
| `response_format` | `binary` | 直接返回 `image/png` |

**JSON 响应**

```json
{
  "success": true,
  "result_image_base64": "iVBORw0KGgo...",
  "content_type": "image/png",
  "error_message": null,
  "processing_time_ms": 800
}
```

### gRPC

```protobuf
rpc RemoveBackground(RemoveBackgroundRequest) returns (RemoveBackgroundResponse);

message RemoveBackgroundResponse {
  ResponseMeta meta = 1;
  bytes result_image = 2;
  string content_type = 3;
}
```

---

## 5. 风格拆解 DecomposeStyle

上传穿搭照，返回结构化 JSON 分析（配色、廓形、层次等）。

### HTTP

```http
POST /v1/styles/decompose
Content-Type: multipart/form-data
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `image` / `image_url` | — | 二选一 |
| `focus_areas` | string | JSON 数组或逗号分隔，如 `["color","silhouette"]` |

**响应**

```json
{
  "success": true,
  "decomposition": { "...": "..." },
  "error_message": null,
  "processing_time_ms": 3000
}
```

### gRPC

```protobuf
rpc DecomposeStyle(DecomposeStyleRequest) returns (DecomposeStyleResponse);

message DecomposeStyleResponse {
  ResponseMeta meta = 1;
  google.protobuf.Struct decomposition = 2;
}
```

---

## 6. 穿搭推荐 RecommendOutfit

### HTTP

```http
POST /v1/outfits/recommend
Content-Type: application/json
```

**请求体**

```json
{
  "user_id": "user-123",
  "weather": {
    "temperature": 22,
    "condition": "Sunny",
    "humidity": 50,
    "wind_speed": 0,
    "uv_index": 5,
    "season": "spring"
  },
  "occasion": "casual",
  "wardrobe": [
    {
      "garment_id": "g1",
      "category": "TOPS",
      "primary_color": "White",
      "material": "Cotton",
      "style_tags": ["Minimalist"]
    }
  ],
  "user_preferences": ["comfort"],
  "max_outfits": 3,
  "avoid_garment_ids": [],
  "avoid_colors": [],
  "avoid_categories": []
}
```

**响应**

```json
{
  "success": true,
  "outfits": [{ "...": "..." }],
  "error_message": null,
  "processing_time_ms": 5000
}
```

### gRPC

```protobuf
rpc RecommendOutfit(RecommendOutfitRequest) returns (RecommendOutfitResponse);
```

- `occasion` 使用 `Occasion` 枚举（`OCCASION_CASUAL` 等）
- `wardrobe` 为 `WardrobeItem` 列表（枚举型 category/color/material/style_tags）
- `outfits` 为 `repeated google.protobuf.Struct`

---

## 7. 风格匹配 MatchStyle

### HTTP

```http
POST /v1/styles/match
Content-Type: application/json
```

**请求体**

```json
{
  "user_id": "user-123",
  "target_style": {
    "name": "Japanese minimal",
    "colors": ["Beige", "Black"]
  },
  "wardrobe": [
    {
      "garment_id": "g1",
      "category": "TOPS",
      "primary_color": "Beige",
      "material": "Linen",
      "style_tags": ["Minimalist"]
    }
  ],
  "min_match_score": 0.5
}
```

**响应**

```json
{
  "success": true,
  "results": [
    {
      "garment_id": "g1",
      "score": 0.85,
      "reason": "..."
    }
  ],
  "error_message": null,
  "processing_time_ms": 2000
}
```

### gRPC

```protobuf
rpc MatchStyle(MatchStyleRequest) returns (MatchStyleResponse);

message MatchStyleResponse {
  ResponseMeta meta = 1;
  repeated MatchedItem results = 2;
}
```

---

## 8. 穿搭 Tips GenerateTips

### HTTP

```http
POST /v1/tips/generate
Content-Type: application/json
```

**请求体**

```json
{
  "outfit": { "items": [] },
  "weather": {
    "temperature": 20,
    "condition": "Sunny",
    "humidity": 50,
    "wind_speed": 0,
    "uv_index": 0,
    "season": "spring"
  },
  "occasion": "casual",
  "max_tips": 3,
  "use_ai": false
}
```

**响应**

```json
{
  "success": true,
  "tips": ["Tip 1", "Tip 2"],
  "error_message": null,
  "processing_time_ms": 100
}
```

### gRPC

```protobuf
rpc GenerateTips(GenerateTipsRequest) returns (GenerateTipsResponse);
```

- `outfit` 为 `google.protobuf.Struct`
- `occasion` 为 `Occasion` 枚举

---

## 9. 虚拟试穿 GenerateTryOn（异步）

基于 OutfitAnyone API：`person_image_url` 与至少一件 `top_garment_url` / `bottom_garment_url` 必须为 **公网 URL**。

### HTTP — 创建任务

```http
POST /v1/tryon
Content-Type: application/json
```

**请求体**

```json
{
  "person_image_url": "https://example.com/person.jpg",
  "top_garment_url": "https://example.com/top.png",
  "bottom_garment_url": null,
  "resolution": -1,
  "restore_face": true
}
```

| 字段 | 说明 |
|------|------|
| `resolution` | `-1` 原图；`1024` → 576×1024；`1280` → 720×1280 |
| `restore_face` | 是否保留原人脸 |

**响应**

```json
{
  "task_id": "660e8400-e29b-41d4-a716-446655440001",
  "task_type": "tryon"
}
```

### gRPC — 创建任务

```protobuf
rpc GenerateTryOn(GenerateTryOnRequest) returns (GenerateTryOnResponse);

message GenerateTryOnRequest {
  RequestMeta meta = 1;
  string person_image_url = 2;
  optional string top_garment_url = 3;
  optional string bottom_garment_url = 4;
  int32 resolution = 5;
  bool restore_face = 6;
}
```

---

## 10. 查询任务状态 GetTaskStatus

### HTTP

```http
GET /v1/tasks/{task_id}
```

**响应 200**

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "task_type": "garment_segment",
  "status": "done",
  "result": {
    "success": true,
    "items": [],
    "item_count": 0,
    "processing_time_ms": 95000
  },
  "error_message": null,
  "processing_time_ms": 95000,
  "created_at": 1719000000.123
}
```

| `status` | 说明 |
|----------|------|
| `pending` | 已创建，未开始 |
| `processing` | 执行中 |
| `done` | 成功，`result` 有 payload |
| `failed` | 失败，见 `error_message` |
| `not_found` | 不存在或已过期（gRPC）；HTTP 返回 **404** |

**试穿完成 `result` 示例**

```json
{
  "success": true,
  "dashscope_task_id": "task-xxx",
  "result_image_url": "https://dashscope-result.../tryon.png",
  "processing_time_ms": 45000
}
```

### gRPC

```protobuf
rpc GetTaskStatus(GetTaskStatusRequest) returns (GetTaskStatusResponse);

message GetTaskStatusResponse {
  string task_id = 1;
  TaskType task_type = 2;
  TaskStatus status = 3;
  double created_at = 4;
  string error_message = 5;
  int32 processing_time_ms = 6;
  oneof result {
    TryOnTaskResult tryon = 10;
    SegmentGarmentTaskResult segment = 11;
  }
}
```

| `TaskStatus` | 数值 | HTTP 等价 |
|--------------|------|-----------|
| `TASK_STATUS_PENDING` | 1 | `pending` |
| `TASK_STATUS_PROCESSING` | 2 | `processing` |
| `TASK_STATUS_DONE` | 3 | `done` |
| `TASK_STATUS_FAILED` | 4 | `failed` |
| `TASK_STATUS_NOT_FOUND` | 5 | 404 |

---

## gRPC 客户端示例（Python）

```python
import grpc
from aigrpc.bootstrap import setup_gen_path

setup_gen_path()

from veslune.ai.v1 import ai_service_pb2_grpc, common_pb2, garment_pb2

channel = grpc.insecure_channel("localhost:50051")
stub = ai_service_pb2_grpc.AIServiceStub(channel)

# 健康检查
health = stub.HealthCheck(common_pb2.HealthCheckRequest())

# 单品识别（URL）
req = garment_pb2.RecognizeGarmentRequest(
    meta=common_pb2.RequestMeta(request_id="req-1", user_id="u1"),
    image=common_pb2.ImageInput(url="https://example.com/shirt.jpg"),
)
resp = stub.RecognizeGarment(req)
```

Go 客户端可使用 `proto/veslune/ai/v1/` 生成代码，`go_package` 为 `github.com/Veslune-Lab/VLM-CORE/gen/go/veslune/ai/v1`。

---

## gRPC 方法一览

| RPC | 同步/异步 | HTTP 等价 |
|-----|-----------|-----------|
| `HealthCheck` | 同步 | `GET /health` |
| `RecognizeGarment` | 同步 | `POST /v1/garments/recognize` |
| `SegmentGarment` | 异步 | `POST /v1/garments/segment` |
| `RemoveBackground` | 同步 | `POST /v1/garments/remove-background` |
| `DecomposeStyle` | 同步 | `POST /v1/styles/decompose` |
| `MatchStyle` | 同步 | `POST /v1/styles/match` |
| `RecommendOutfit` | 同步 | `POST /v1/outfits/recommend` |
| `GenerateTips` | 同步 | `POST /v1/tips/generate` |
| `GenerateTryOn` | 异步 | `POST /v1/tryon` |
| `GetTaskStatus` | 同步 | `GET /v1/tasks/{task_id}` |

完整 message 定义：`proto/veslune/ai/v1/*.proto`

---

## 相关文档

- [部署指南](./DEPLOYMENT.md)
