import type { AxiosError, AxiosRequestConfig } from 'axios';
import { instance } from './http';
import type { Envelope } from './types/request';
import { ApiError, HttpError, NetworkError } from '@/errors';

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  let res;
  try {
    res = await instance.request<Envelope<T>>(config);
  } catch (error) {
    // axios 默认对非 2xx 直接 reject（fetch 不会）→ 在这里分流
    const err = error as AxiosError<Envelope<unknown>>;

    if (err.response) {
      // 服务器有响应但状态非 2xx（例：500 {code:50000,message:"internal server error"}）
      throw new HttpError(err.response.status, err.response.data?.message, err.response.data?.code);
    }
    // 没有 response = 请求没到达/没回来 → 网络层问题
    throw new NetworkError(err.message);
  }

  // 到这里 HTTP 一定是 2xx，再看业务 code
  const body = res.data;
  if (body.code !== 0) throw new ApiError(body.code, body.message); // 业务失败
  return body.data as T; // 成功：解包出 data
}
