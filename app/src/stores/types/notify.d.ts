export type NotifyType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: NotifyType;
  message: string;
  timeout: number;
}

export interface ConfirmOptions {
  title?: string;
  message?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}
