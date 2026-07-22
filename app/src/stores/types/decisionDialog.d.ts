/**
 * 定义全局多选决策弹窗的动作、配置和渲染状态。
 * 原因：调用方需要保留字符串联合类型，Host 只需要消费统一的字符串状态。
 */
export type DecisionDialogTone = 'quiet' | 'primary' | 'danger';

export interface DecisionDialogAction<Value extends string = string> {
  value: Value;
  label: string;
  tone?: DecisionDialogTone;
  disabled?: boolean;
}

export interface DecisionDialogOptions<Value extends string = string> {
  title: string;
  message?: string;
  actions: ReadonlyArray<DecisionDialogAction<Value>>;
  dismissValue: Value;
  closeOnBackdrop?: boolean;
}

export interface DecisionDialogState {
  title: string;
  // 内部标准化状态始终保留 message 键，值允许 undefined。
  // 原因：兼容 exactOptionalPropertyTypes，同时让 Host 读取固定结构。
  message: string | undefined;
  actions: DecisionDialogAction[];
  dismissValue: string;
  closeOnBackdrop: boolean;
}
