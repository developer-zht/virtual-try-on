// 后端统一信封；data 可选（失败时没有）
export interface Envelope<T> {
  code: number;
  message: string;
  data?: T;
}
