export interface FieldError {
  code: string; // 给开发者：稳定、可搜索、可当测试断言 / 未来 i18n 的 key（不随文案变）
  message: string; // 给用户：友好、可直接显示（将来可换成翻译）
}
