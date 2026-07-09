// ① 业务错误：HTTP 2xx，但业务 code !== 0
export class ApiError extends Error {
  public code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

// ② HTTP 错误：服务器有响应但状态非 2xx
export class HttpError extends Error {
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
export class NetworkError extends Error {
  constructor(message = '网络异常，请检查连接') {
    super(message);
    this.name = 'NetworkError';
  }
}

// ④ 任务轮询超时：等太久还没到终态
export class TaskTimeoutError extends Error {
  public taskId: string;
  public waitedMs: number;

  constructor(taskId: string, waitedMs: number) {
    super(`任务 ${taskId} 轮询超时（已等待 ${waitedMs}ms）`);
    this.taskId = taskId;
    this.waitedMs = waitedMs;
    this.name = 'TaskTimeoutError';
  }
}
