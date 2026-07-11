import { ApiError, HttpError, NetworkError, ValidationError } from '@/errors';

/** 把任意错误翻译成一句给用户看的人话。只认识「已知错误类」。 */
export function messageFromError(error: unknown): string {
  if (error instanceof ValidationError) return error.message; // 校验类文案本就是给用户的
  if (error instanceof ApiError) return `操作失败（${error.code}）：${error.message}`;
  if (error instanceof HttpError) {
    if (error.status >= 500) return '服务器繁忙，请稍后重试';
    return error.message || '请求失败';
  }
  if (error instanceof NetworkError) return '网络异常，请检查连接';
  return '未知错误，请稍后重试';
}
