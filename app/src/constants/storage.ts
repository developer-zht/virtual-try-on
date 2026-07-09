const PROJECT_NAME = 'veslune'; // 单一数据源：以后改名只改这一处

export const STORAGE_KEYS = {
  accessToken: `${PROJECT_NAME}.access_token`,
  refreshToken: `${PROJECT_NAME}.refresh_token`,
  csrfToken: `${PROJECT_NAME}.csrf_token`,
} as const;
