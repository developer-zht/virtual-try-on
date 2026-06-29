# Veslune AI Engine 部署指南

本文档说明如何部署 **HTTP REST** 与 **gRPC** 两个独立服务。二者共享同一套业务逻辑（`services/`），但监听不同端口，适合分别扩缩容。

## 部署后能否被外部调用？

**可以。** 服务启动并对外暴露端口后，客户端即可调用对应接口：

| 协议 | 默认端口 | 适用场景 |
|------|----------|----------|
| HTTP REST | `8000`（Docker）/ `8080`（本地默认） | 前端、联调、第三方 HTTP 集成 |
| gRPC | `50051` | Go 后端、内部微服务（推荐生产路径） |

前提条件：

1. **网络可达**：防火墙 / 安全组 / K8s Service 放行对应端口。
2. **环境变量**：至少配置 `DASHSCOPE_API_KEY`（阿里百炼）。
3. **图片 URL**：试穿、部分识别接口要求图片为 **公网可访问 URL**（DashScope 需拉取图片）。
4. **TLS**：当前 gRPC 使用 **明文（insecure）** 端口；生产环境建议在负载均衡或 sidecar 层加 TLS/mTLS。
5. **异步任务**：Docker Compose 默认通过 **Redis** 共享任务状态，HTTP 与 gRPC 可交叉查询同一 `task_id`。本地 `TASK_STORE=memory` 时仅单进程有效。

---

## 环境准备

### 1. 复制并编辑配置

```bash
cp ai-engine/.env.example ai-engine/.env
# 编辑 ai-engine/.env，填入 DASHSCOPE_API_KEY
```

关键变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DASHSCOPE_API_KEY` | 百炼 API Key（必填） | — |
| `DASHSCOPE_BASE_URL` | OpenAI 兼容端点 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `HTTP_HOST` / `HTTP_PORT` | REST 监听地址 | `0.0.0.0` / `8080`（本地）或 `8000`（Docker） |
| `GRPC_HOST` / `GRPC_PORT` | gRPC 监听地址 | `0.0.0.0` / `50051` |
| `HTTP_CORS_ORIGINS` | 允许的前端 Origin | localhost 开发地址 |
| `TASK_STORE` | `memory` / `redis` | `memory`；Docker 覆盖为 `redis` |
| `REDIS_URL` | Redis 连接串 | `redis://127.0.0.1:6379/0` |
| `TASK_TTL` | 任务过期（秒） | `3600` |
| `LOG_LEVEL` | 日志级别 | `INFO` |

### 2. Proto 代码（仅本地开发 / 修改 proto 后）

仓库已包含生成好的 Python stub（`ai-engine/aigrpc/gen/`）。若修改了 `proto/`，执行：

```bash
make proto
```

---

## Docker 部署（推荐）

HTTP 与 gRPC **分容器** 管理，镜像与依赖互不干扰。

### 文件说明

| 文件 | 用途 |
|------|------|
| `ai-engine/Dockerfile.http` | REST 服务镜像 |
| `ai-engine/Dockerfile.grpc` | gRPC 服务镜像 |
| `ai-engine/requirements.http.txt` | HTTP 依赖（FastAPI、uvicorn） |
| `ai-engine/requirements.grpc.txt` | gRPC 依赖（grpcio、protobuf） |
| `docker-compose.yml` | 启动 Redis + HTTP + gRPC |

### 启动

```bash
# 在项目根目录
docker compose up -d --build
```

服务：

| 容器名 | 端口 | 说明 |
|--------|------|------|
| `veslune-redis` | 6379（容器内） | 异步任务共享存储 |
| `veslune-ai-engine-http` | `8000:8000` | REST |
| `veslune-ai-engine-grpc` | `50051:50051` | gRPC |

验证：

```bash
curl http://localhost:8000/health

# gRPC（需 grpcurl 或 Python 客户端）
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 veslune.ai.v1.AIService/HealthCheck
```

### 单独构建 / 运行

```bash
# 仅 HTTP
docker build -f ai-engine/Dockerfile.http -t veslune-ai-http ./ai-engine
docker run --rm -p 8000:8000 --env-file ai-engine/.env veslune-ai-http

# 仅 gRPC
docker build -f ai-engine/Dockerfile.grpc -t veslune-ai-grpc ./ai-engine
docker run --rm -p 50051:50051 --env-file ai-engine/.env veslune-ai-grpc
```

### 生产建议

- 使用反向代理（Nginx / Traefik）为 HTTP 提供 HTTPS。
- gRPC 可通过 Envoy、Nginx gRPC 或云 LB 终止 TLS。
- Redis 单节点 + AOF；高可用可后续升级 Sentinel / Cluster。
- 抠图接口依赖本地 `rembg`；当前 Docker 镜像 **未** 默认安装，如需该能力请在镜像中额外安装。

---

## 非 Docker 部署

### 依赖安装

```bash
cd ai-engine

# HTTP 服务
pip install -r requirements.http.txt

# gRPC 服务（另开终端或另一台机器）
pip install -r requirements.grpc.txt

# 开发 / 测试（可选）
pip install -r requirements-dev.txt
```

### 启动 HTTP REST

```bash
cd ai-engine
export DASHSCOPE_API_KEY=sk-xxx
export HTTP_HOST=0.0.0.0
export HTTP_PORT=8080
python server_http.py
```

- Swagger UI：`http://localhost:8080/docs`
- ReDoc：`http://localhost:8080/redoc`

### 启动 gRPC

```bash
cd ai-engine
export DASHSCOPE_API_KEY=sk-xxx
export GRPC_HOST=0.0.0.0
export GRPC_PORT=50051
python server_grpc.py
```

gRPC 启用 **Server Reflection**（若安装了 `grpcio-reflection`），可用 `grpcurl` 探测：

```bash
grpcurl -plaintext localhost:50051 list veslune.ai.v1.AIService
```

### systemd 示例（Linux）

`/etc/systemd/system/veslune-ai-http.service`：

```ini
[Unit]
Description=Veslune AI HTTP
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/VLM-CORE/ai-engine
EnvironmentFile=/opt/VLM-CORE/ai-engine/.env
ExecStart=/usr/bin/python3 server_http.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

gRPC 服务同理，将 `ExecStart` 改为 `python3 server_grpc.py`，并单独配置 unit 文件。

---

## 故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| `/health` 返回 `dashscope_configured: false` | 未设置 `DASHSCOPE_API_KEY` | 检查 `.env` 或容器环境变量 |
| gRPC 连接被拒绝 | 端口未映射 / 防火墙 | 确认 `50051` 暴露且进程监听 `0.0.0.0` |
| 异步任务 404 | Redis 未启用或任务过期 | 确认 `TASK_STORE=redis`、检查 `TASK_TTL` |
| `/health` 为 degraded | Redis 不可用 | 检查 `veslune-redis` 容器 |
| 试穿失败 | 图片 URL 非公网 | 使用 OSS/CDN 公网 URL |
| 抠图 502 | 未安装 rembg | `pip install rembg` 或禁用该接口 |

---

## 相关文档

- [API 接口规范](./API_REFERENCE.md) — HTTP 与 gRPC 请求/响应格式
- Proto 定义：`proto/veslune/ai/v1/`
- OpenAPI（HTTP）：启动服务后访问 `/docs`
