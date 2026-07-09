/**
 * 所有「我们主动抛的、已知的」错误的基类。
 * 用途：一眼区分「已知业务错误」 vs 「没预料到的 JS bug」——给 Sentry 过滤用。
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

// ① 业务错误：HTTP 2xx，但业务 code !== 0
export class ApiError extends AppError {
  public code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

// ② HTTP 错误：服务器有响应但状态非 2xx
export class HttpError extends AppError {
  public status: number;
  public code: number | undefined;
  constructor(status: number, message: string, code?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'HttpError';
  }
}

// ③ 网络错误：压根没拿到响应
export class NetworkError extends AppError {
  constructor(message = '网络异常，请检查连接') {
    super(message);
    this.name = 'NetworkError';
  }
}

// ④ 客户端输入校验错误（还没发请求就挡下）
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ⑤ 任务轮询超时
export class TaskTimeoutError extends AppError {
  public taskId: string;
  public waitedMs: number;
  constructor(taskId: string, waitedMs: number) {
    super(`任务 ${taskId} 轮询超时（已等待 ${waitedMs}ms）`);
    this.taskId = taskId;
    this.waitedMs = waitedMs;
    this.name = 'TaskTimeoutError';
  }
}
