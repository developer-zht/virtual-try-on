# Veslune AI Engine HTTP API 参考文档

> 面向 Web 前端开发的 REST/JSON API 完整参考，启动后访问 `http://localhost:8080/docs` 可查看 Swagger 交互式文档。

## 1. 快速开始

```bash
cd ai-engine
python server_http.py
# 默认监听 0.0.0.0:8080
# Swagger 文档: http://localhost:8080/docs
# ReDoc 文档:  http://localhost:8080/redoc
```

**环境变量**：通过 `.env` 文件或环境变量配置 `DASHSCOPE_API_KEY` 和 `HTTP_PORT`。

---

## 2. 接口一览

| 方法 | 路径 | 标签 | 说明 |
|------|------|------|------|
| GET | `/health` | system | 服务健康检查 |
| GET | `/stability` | system | 稳定性测试 |
| POST | `/v1/garments/recognize` | garments | 单品识别 |
| POST | `/v1/garments/segment` | garments | 单品分割（异步） |
| POST | `/v1/garments/remove-background` | garments | 衣物抠图 |
| POST | `/v1/styles/decompose` | styles | 风格拆解 |
| POST | `/v1/outfits/recommend` | outfits | 穿搭推荐 |
| POST | `/v1/styles/match` | styles | 风格匹配 |
| POST | `/v1/tips/generate` | tips | 穿搭 Tips |
| POST | `/v1/tryon` | tryon | 虚拟试穿（异步） |
| GET | `/v1/tasks/{task_id}` | tasks | 查询异步任务状态 |

---

## 3. 接口详情

### 3.1 GET /health — 服务健康检查

**请求**：无需参数

**响应** `200`：

```json
{
  "status": "ok",
  "dashscope_configured": true,
  "gemini_configured": false,
  "grpc_port": 50051,
  "http_port": 8080,
  "task_store": "memory",
  "redis_connected": null
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | `ok` 正常，`degraded` 降级 |
| dashscope_configured | bool | DashScope API Key 是否已配置 |
| task_store | string | `memory` 或 `redis` |

---

### 3.2 GET /stability — 稳定性测试

**请求**：无需参数

**响应** `200`：

```json
{
  "success": true,
  "total": 8,
  "passed": 8,
  "failed": 0,
  "results": [
    { "name": "Config", "passed": true, "message": "DASHSCOPE_API_KEY set" },
    { "name": "Prompts", "passed": true, "message": "All prompt templates loaded" },
    { "name": "Response Parser", "passed": true, "message": "JSON parsing works" },
    { "name": "Tips Generator", "passed": true, "message": "Generated 3 tips" },
    { "name": "Task Manager", "passed": true, "message": "Task lifecycle works" },
    { "name": "Recommender Rules", "passed": true, "message": "Hot weather filter works" },
    { "name": "Style Matcher", "passed": true, "message": "Wardrobe formatting works" },
    { "name": "Service Container", "passed": true, "message": "Container initialized" }
  ],
  "processing_time_ms": 15
}
```

---

### 3.3 POST /v1/garments/recognize — 单品识别

上传单张服装图片，识别品类、颜色、材质、风格标签等属性。

**请求** `multipart/form-data`：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | file | 否 | 上传图片（与 image_url 二选一） |
| image_url | string | 否 | 图片 URL（与 image 二选一） |

**cURL 示例**：

```bash
# 上传本地图片
curl -X POST http://localhost:8080/v1/garments/recognize \
  -F "image=@shirt.jpg"

# 通过 URL
curl -X POST http://localhost:8080/v1/garments/recognize \
  -F "image_url=https://example.com/shirt.jpg"
```

**响应** `200`：

```json
{
  "success": true,
  "garment": {
    "category": "TOPS",
    "primary_color": "White",
    "secondary_colors": [],
    "material": "Cotton",
    "style_tags": ["Minimalist", "Korean"],
    "confidence": 0.92,
    "reason": "White button-up shirt with collar, cotton fabric",
    "season_suitability": "All-season",
    "is_manually_edited": false
  },
  "processing_time_ms": 1234
}
```

---

### 3.4 POST /v1/garments/segment — 单品分割（异步）

从全身/穿搭图中识别所有单品，可选逐件生成白底商品图。

**请求** `multipart/form-data`：

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| image | file | 否 | — | 上传穿搭图 |
| image_url | string | 否 | — | 图片 URL |
| render_items | bool | 否 | true | 是否逐件生成白底渲染图 |

**响应** `200`：

```json
{
  "task_id": "abc123-def456",
  "task_type": "garment_segment"
}
```

> 返回 task_id 后，轮询 `GET /v1/tasks/{task_id}` 获取结果。
> - `render_items=false`：约 80s
> - `render_items=true`：约 10+ 分钟

---

### 3.5 POST /v1/garments/remove-background — 衣物抠图

移除图片背景，输出透明 PNG。

**请求** `multipart/form-data`：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | file | 否 | 上传图片 |
| image_url | string | 否 | 图片 URL |
| response_format | query | 否 | `json`（默认，返回 base64）或 `binary`（返回 image/png） |

**cURL 示例**：

```bash
curl -X POST "http://localhost:8080/v1/garments/remove-background?response_format=binary" \
  -F "image=@shirt.jpg" -o shirt_nobg.png
```

**响应** `200`（json 模式）：

```json
{
  "success": true,
  "result_image_base64": "iVBORw0KGgo...",
  "content_type": "image/png",
  "processing_time_ms": 520
}
```

---

### 3.6 POST /v1/styles/decompose — 风格拆解

上传穿搭照片，拆解配色、廓形、层次、关键单品等。

**请求** `multipart/form-data`：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | file | 否 | 上传穿搭图 |
| image_url | string | 否 | 图片 URL |
| focus_areas | string | 否 | JSON 数组，如 `["color","silhouette"]`，只分析指定维度 |

**响应** `200`：

```json
{
  "success": true,
  "decomposition": {
    "color_scheme": {
      "dominant_color": "Khaki",
      "accent_colors": ["White", "Blue"],
      "palette_description": "Warm earth tones with crisp accents",
      "color_harmony": "Analogous"
    },
    "silhouette": "H-type",
    "layering": {
      "description": "Three-layer ensemble",
      "layers": ["Inner: T-shirt", "Middle: Striped shirt", "Outer: Trench coat"],
      "layering_type": "Outer-long-inner-short"
    },
    "key_items": [],
    "overall_style": ["Korean", "Minimalist"],
    "style_summary": "Korean minimalist urban style",
    "confidence": 0.90
  },
  "processing_time_ms": 3456
}
```

---

### 3.7 POST /v1/outfits/recommend — 穿搭推荐

根据天气 + 场合 + 用户衣橱生成穿搭方案。

**请求** `application/json`：

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
  "occasion": "casual",
  "wardrobe": [
    {
      "garment_id": "1",
      "category": "TOPS",
      "primary_color": "White",
      "material": "Cotton",
      "style_tags": ["Minimalist"]
    },
    {
      "garment_id": "2",
      "category": "BOTTOMS",
      "primary_color": "Black",
      "material": "Denim",
      "style_tags": ["Street"]
    }
  ],
  "user_preferences": ["Minimalist"],
  "max_outfits": 2,
  "avoid_garment_ids": [],
  "avoid_colors": [],
  "avoid_categories": []
}
```

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| user_id | string | 否 | demo-user | 用户标识 |
| weather | object | 是 | — | 天气信息 |
| weather.temperature | float | 否 | 20 | 温度（°C） |
| weather.condition | string | 否 | Sunny | 天气状况 |
| occasion | string | 否 | casual | 场合 |
| wardrobe | array | 是 | — | 衣橱单品列表（至少 5 件） |
| max_outfits | int | 否 | 3 | 最大推荐数（1-3） |
| avoid_garment_ids | array | 否 | [] | 排除的单品 ID |
| avoid_colors | array | 否 | [] | 排除的颜色 |
| avoid_categories | array | 否 | [] | 排除的品类 |

**响应** `200`：

```json
{
  "success": true,
  "outfits": [
    {
      "id": "uuid-1",
      "name": "Spring Casual",
      "items": ["1", "2"],
      "score": 0.85,
      "description": "Clean white tee with black jeans"
    }
  ],
  "processing_time_ms": 2345
}
```

---

### 3.8 POST /v1/styles/match — 风格匹配

将目标风格与用户衣橱单品进行匹配。

**请求** `application/json`：

```json
{
  "user_id": "demo-user",
  "target_style": {
    "color_scheme": { "dominant_color": "Black" },
    "overall_style": ["Minimalist", "Street"]
  },
  "wardrobe": [
    {
      "garment_id": "1",
      "category": "TOPS",
      "primary_color": "Black",
      "material": "Cotton",
      "style_tags": ["Minimalist"]
    }
  ],
  "min_match_score": 0.5
}
```

**响应** `200`：

```json
{
  "success": true,
  "results": [
    {
      "garment_id": "1",
      "match_score": 0.92,
      "reason": "Color and style match the target aesthetic"
    }
  ],
  "processing_time_ms": 890
}
```

---

### 3.9 POST /v1/tips/generate — 穿搭 Tips

生成穿搭搭配建议，支持模板模式（零成本）和 AI 模式。

**请求** `application/json`：

```json
{
  "outfit": {
    "items": [
      { "category": "TOPS", "note": "White shirt" },
      { "category": "BOTTOMS", "note": "Black jeans" }
    ]
  },
  "weather": {
    "temperature": 22,
    "condition": "Sunny"
  },
  "occasion": "commute",
  "max_tips": 3,
  "use_ai": false
}
```

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| use_ai | bool | 否 | false | false=模板模式（零成本），true=AI 模式 |
| max_tips | int | 否 | 3 | 建议条数（1-10） |
| occasion | string | 否 | casual | 场合：commute/casual/date/sport/formal |

**响应** `200`：

```json
{
  "success": true,
  "tips": [
    "White shirt + black jeans = timeless base",
    "Add a watch for polish",
    "Sneakers keep it casual-friendly"
  ],
  "processing_time_ms": 5
}
```

---

### 3.10 POST /v1/tryon — 虚拟试穿（异步）

基于穿搭单品生成模特穿着效果图，立即返回 task_id。

**请求** `application/json`：

```json
{
  "person_image_url": "https://example.com/person.jpg",
  "top_garment_url": "https://example.com/top.png",
  "bottom_garment_url": "https://example.com/bottom.png",
  "resolution": -1,
  "restore_face": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| person_image_url | string | 是 | 模特照片 URL |
| top_garment_url | string | 否 | 上装图片 URL |
| bottom_garment_url | string | 否 | 下装图片 URL |
| restore_face | bool | 否 | 是否修复面部（默认 true） |

> 至少需要 top_garment_url 或 bottom_garment_url 之一。

**响应** `200`：

```json
{
  "task_id": "tryon-abc123",
  "task_type": "tryon"
}
```

---

### 3.11 GET /v1/tasks/{task_id} — 查询异步任务状态

轮询获取异步任务（虚拟试穿 / 单品分割）的结果。

**响应** `200`：

```json
{
  "task_id": "tryon-abc123",
  "task_type": "tryon",
  "status": "done",
  "result": {
    "success": true,
    "image_url": "https://example.com/result.jpg",
    "processing_time_ms": 45200
  },
  "created_at": 1719300000.0
}
```

**status 枚举**：

| 值 | 说明 |
|------|------|
| pending | 等待处理 |
| processing | 处理中 |
| done | 已完成 |
| failed | 失败 |
| not_found | 任务不存在（超过 24 小时） |

**后端轮询建议**：

```javascript
// Web 前端轮询示例
async function pollTask(taskId, interval = 3000, maxRetries = 200) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`/v1/tasks/${taskId}`);
    const data = await res.json();
    if (data.status === 'done') return data.result;
    if (data.status === 'failed') throw new Error(data.error_message);
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Task timed out');
}
```

---

## 4. 错误响应

所有接口异常时返回 HTTP 错误码 + JSON 错误体：

```json
{
  "detail": "Task not found: abc123"
}
```

| HTTP 状态码 | 说明 |
|------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 502 | AI 服务调用失败 |
| 503 | 服务未就绪（如 API Key 未配置） |

---

## 5. 配置说明

| 环境变量 | 默认值 | 说明 |
|------|------|------|
| `DASHSCOPE_API_KEY` | — | **必填**，阿里百炼 API Key |
| `HTTP_HOST` | 0.0.0.0 | HTTP 监听地址 |
| `HTTP_PORT` | 8080 | HTTP 监听端口 |
| `HTTP_CORS_ORIGINS` | localhost:3000,5173 | CORS 允许的源 |
| `LOG_LEVEL` | INFO | 日志级别 |

---

*文档维护：Veslune Team · 最后更新：2026-06-26*