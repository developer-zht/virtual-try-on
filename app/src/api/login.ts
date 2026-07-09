import { request } from './request';
import type { LoginRaw } from './types/login';

/**
 * 账户登录
 *
 * 返回登录结果，并在失败时抛出
 * ApiError、HttpError 或 NetworkError。
 *
 * @param email  账户邮箱
 * @param password 账户密码
 * @returns 登录接口返回的数据
 *
 * @example
 * 组件里：按错误类型分支
 * try {
 *    const data = await login(email, password);
 * } catch (e) {
 *    if (e instanceof ApiError) notify(`登录失败(${e.code})：${e.message}`);
 *    else if (e instanceof HttpError) notify('服务器繁忙，请稍后重试');
 *    else if (e instanceof NetworkError) notify('网络异常，请检查连接');
 *    else notify('未知错误');
 * }
 */
export const login = (email: string, password: string) =>
  request<LoginRaw>({ url: '/auth/login', method: 'POST', data: { email, password } });
