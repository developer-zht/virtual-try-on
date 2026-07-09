import 'axios';

// 给请求配置扩展自定义标记 _retry（TS 模块增强，否则 original._retry 报类型错）
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}
