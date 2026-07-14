import {
  AppError,
  ApiError,
  HttpError,
  NetworkError,
  ValidationError,
  TaskTimeoutError,
  TaskFailedError,
} from '@/errors';

/** 把任意错误翻译成一句给用户看的人话。只认识「已知错误类」。 */
export function messageFromError(error: unknown): string {
  // ↓ 具体的在前
  if (error instanceof ValidationError) return error.message; // 校验文案本就是给用户的
  if (error instanceof TaskTimeoutError) return '处理超时，请稍后到衣柜/结果页查看';
  if (error instanceof TaskFailedError) return 'AI 处理失败了，换一张图或稍后再试';
  if (error instanceof ApiError) return `操作失败（${error.code}）：${error.message}`;
  if (error instanceof HttpError) {
    if (error.status >= 500) return '服务器繁忙，请稍后重试';
    return error.message || '请求失败';
  }
  if (error instanceof NetworkError) return '网络异常，请检查连接';
  // ↓ 基类兜底：任何「已知的」AppError 至少用它自带 message，好过“未知错误”
  if (error instanceof AppError) return error.message;
  // ↓ 只有真·非 AppError（= 代码 bug）才落到这
  return '未知错误，请稍后重试';
}
