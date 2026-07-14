// 1:1 参考 —— 对照你 try-on-2d 的 src/utils/validators.ts
// 纯函数：合法返回 null，不合法返回 FieldError。code 给开发者/测试/i18n，message 给用户。
export interface FieldError {
  code: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): FieldError | null {
  if (!email) return { code: 'EMAIL_REQUIRED', message: '请输入邮箱' };
  if (!EMAIL_RE.test(email)) return { code: 'EMAIL_INVALID', message: '邮箱格式不正确' };
  return null;
}

export function validatePassword(pwd: string): FieldError | null {
  if (!pwd) return { code: 'PASSWORD_REQUIRED', message: '请输入密码' };
  if (pwd.length < 8) return { code: 'PASSWORD_TOO_SHORT', message: '密码至少 8 位' };
  if (!/[a-zA-Z]/.test(pwd)) return { code: 'PASSWORD_NO_LETTER', message: '密码需包含英文字母' };
  if (!/[0-9]/.test(pwd)) return { code: 'PASSWORD_NO_DIGIT', message: '密码需包含数字' };
  return null;
}

// null = 未填，允许（部分更新，不是必填）
export function validateHeight(cm: number | null): FieldError | null {
  // 从 cm === null 改成 cm == null，将 undefined 也包含进来，因为 undefined == null 为 true，这样既检查了 undefined，也检查了 null
  if (cm === null) return null;
  // 补 Number.isFinite(双保险)
  if (!Number.isFinite(cm)) return { code: 'HEIGHT_INVALID', message: '身高需为数字' };
  if (cm < 50 || cm > 250)
    return { code: 'HEIGHT_OUT_OF_RANGE', message: '身高需在 50–250 cm 之间' };
  return null;
}

export function validateWeight(kg: number | null): FieldError | null {
  // 从 kg === null 改成 cm == null，将 undefined 也包含进来，因为 undefined == null 为 true，这样既检查了 undefined，也检查了 null
  if (kg == null) return null;
  // 补 Number.isFinite(双保险)
  if (!Number.isFinite(kg)) return { code: 'WEIGHT_INVALID', message: '体重需为数字' };
  if (kg < 20 || kg > 300)
    return { code: 'WEIGHT_OUT_OF_RANGE', message: '体重需在 20–300 kg 之间' };
  return null;
}
